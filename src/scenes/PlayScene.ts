import Phaser from "phaser";
import { mowerById } from "../data/mowers";
import { levelById, type TerrainId } from "../data/levels";
import { POWERUPS, type PowerupId } from "../data/powerups";
import { COPY } from "../data/copy";
import { wanderLevel } from "../gen/wander";
import { GrassField } from "../systems/GrassField";
import { buildLayout, type Prop } from "../systems/Layout";
import { Mower } from "../systems/Mower";
import { TouchDrive } from "../systems/TouchDrive";
import { audio } from "../systems/AudioEngine";
import { spawnProps } from "../systems/props";
import { completeYard, persist, save, visitYard } from "../systems/Save";
import { mulberry32 } from "../systems/grassMath";
import { bigButton, labelText } from "../ui/BigButton";
import { bindSceneResize, composeCamera, getViewport, playHudLayout } from "../systems/Viewport";
import { ActivityHud } from "../ui/ActivityHud";
import { queueMowerAsset, queueMowingWorldAssets, showLoadOverlay, type LoadOverlay } from "../systems/AssetCatalog";
import { rectOf, worldBoundsToScreen, type ActivityDiagnostics } from "../systems/Diagnostics";
import { ActivityLifecycle } from "../systems/ActivityLifecycle";
import { resolveDrivePose, type DrivePose } from "../systems/driveMath";
import { ActivityPad } from "../ui/ActivityPad";
import { ActivityOverlays } from "../ui/ActivityOverlays";

interface ActivePower {
  id: PowerupId;
  until: number;
}

export class PlayScene extends Phaser.Scene {
  private grass!: GrassField;
  private mower!: Mower;
  private drive!: TouchDrive;
  private props: ReturnType<typeof spawnProps> = [];
  private pickups: Phaser.GameObjects.Container[] = [];
  private hud!: ActivityHud;
  private celebrated = false;
  private helperOn = false;
  private helperRate = 0;
  private helperAcc = 0;
  private paused = false;
  private celeLayer?: Phaser.GameObjects.Container;
  private powers: ActivePower[] = [];
  private sparkleBits: Phaser.GameObjects.Arc[] = [];
  private rng = mulberry32(1);
  private freeMow = false;
  private growAcc = 0;
  private birdAcc = 0;
  private levelId = "home";
  private wanderSeed?: number;
  private clippings!: Phaser.GameObjects.Particles.ParticleEmitter;
  private night?: Phaser.GameObjects.Rectangle;
  private pad?: ActivityPad;
  private overlays!: ActivityOverlays;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private terrain: TerrainId = "lush";
  private cameraFocus!: Phaser.GameObjects.Zone;
  private targetMarker!: Phaser.GameObjects.Graphics;
  private mowerEffects!: Phaser.GameObjects.Graphics;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private tireTracks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private trackAcc = 0;
  private ambient: Phaser.GameObjects.GameObject[] = [];
  private powerHud!: Phaser.GameObjects.Container;
  private baseNight = false;
  private powerSignature = "";
  private rainAcc = 0;
  private cleanedUp = false;
  private loading?: LoadOverlay;
  private lifecycle!: ActivityLifecycle;
  private collisionProps: Prop[] = [];

  private get tutLayer(): Phaser.GameObjects.Container | undefined {
    return this.overlays?.tutorialLayer;
  }

  diagnostics(): ActivityDiagnostics {
    const viewport = getViewport(this);
    const hud = this.hud.bounds();
    return {
      viewport: { width: viewport.width, height: viewport.height },
      playableRect: hud.playableRect,
      hud,
      camera: { zoom: this.cameras.main.zoom, worldView: rectOf(this.cameras.main.worldView) },
      machine: {
        screenBounds: worldBoundsToScreen(this.mower.sprite.getBounds(), this.cameras.main),
        assetMode: this.mower.assetMode,
      },
      input: this.drive.diagnostics(),
      lifecycle: this.lifecycle.diagnostics(),
    };
  }

  constructor() {
    super("play");
  }

  preload(): void {
    this.loading = showLoadOverlay(this, "Opening the yard");
    const data = this.scene.settings.data as { mowerId?: string } | undefined;
    queueMowingWorldAssets(this);
    queueMowerAsset(this, data?.mowerId ?? save().selectedMower);
  }

  create(): void {
    this.loading?.destroy();
    this.cleanedUp = false;
    this.lifecycle = new ActivityLifecycle(this, "mow", {
      pause: () => { if (!this.paused) this.togglePause(); },
      resume: () => { if (this.paused) this.togglePause(); },
      finish: () => this.startFinish(),
      progress: () => this.grass?.percent ?? 0,
    });
    this.lifecycle.addCleanup(() => this.cleanup());
    this.input.addPointer(2);
    this.input.setTopOnly(true);
    this.uiCam = this.lifecycle.uiCamera;

    const data = this.scene.settings.data as { levelId?: string; mowerId?: string; freeMow?: boolean; wander?: number } | undefined;
    this.freeMow = Boolean(data?.freeMow);
    this.levelId = data?.wander !== undefined ? "wander" : data?.levelId ?? "home";
    const savedYard = save().selectedYard;
    this.wanderSeed = this.levelId.startsWith("wander")
      ? (data?.wander ?? (savedYard.kind === "wander" ? savedYard.seed : Date.now() & 0xffff)) >>> 0
      : undefined;
    const level = this.wanderSeed !== undefined ? wanderLevel(this.wanderSeed) : levelById(this.levelId);
    this.terrain = level.terrain;
    visitYard(level.id.startsWith("wander") ? "wander" : level.id, this.wanderSeed);

    const layout = buildLayout(level, this.wanderSeed ?? this.levelId.length * 13);
    this.grass = new GrassField(this, layout, level.terrain);
    this.props = spawnProps(this, layout.props, level.terrain);
    this.collisionProps = layout.props.filter((prop) => prop.kind !== "bridge");

    const def = mowerById(data?.mowerId ?? save().selectedMower);
    this.mower = new Mower(this, def, layout.startX, layout.startY);
    audio.setProfile(def.engine);
    this.drive = new TouchDrive(this, this.mower, (x, y) => this.isWorldInput(x, y));
    this.overlays = new ActivityOverlays(this, (object) => this.pinUI(object), 0x102418);

    this.cameraFocus = this.add.zone(this.mower.x, this.mower.y, 2, 2);
    this.targetMarker = this.add.graphics().setDepth(2);
    this.mowerEffects = this.add.graphics().setDepth(4.5);

    this.cameras.main.setBounds(0, 0, layout.worldW, layout.worldH);
    this.cameras.main.startFollow(this.cameraFocus, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(40, 40);
    this.fitZoom(layout.worldW, layout.worldH);

    this.makeClippings();
    this.makeDust();
    this.makeTireTracks();
    this.spawnPickups(layout.pickups);
    this.buildAmbience();
    this.buildHud();
    if (save().control === "pad") this.pad = new ActivityPad(this, this.drive, 0x2e7d32);

    this.baseNight = def.id === "nightowl" || Boolean(level.evening) || level.terrain === "night";
    if (this.baseNight) {
      this.night = this.add.rectangle(0, 0, layout.worldW, layout.worldH, 0x020810, 0.28).setOrigin(0).setDepth(1);
    }

    if (!save().seenTutorial) this.showTutorial();
    this.bindCameras();

    bindSceneResize(this, () => this.relayout());
  }

  private pinUI(obj: Phaser.GameObjects.GameObject): void {
    this.lifecycle.pinUI(obj);
  }

  private bindCameras(): void {
    const world: Phaser.GameObjects.GameObject[] = [
      this.grass.sprite,
      this.mower.sprite,
      this.mower.shadow,
      this.mower.wheelLayer,
      this.clippings,
      this.dust,
      this.tireTracks,
      this.cameraFocus,
      this.targetMarker,
      this.mowerEffects,
      ...this.props,
      ...this.pickups,
      ...this.ambient,
    ];
    if (this.night) world.push(this.night);
    this.uiCam.ignore(world);
    if (this.hud) this.pinUI(this.hud.container);
    if (this.pad) this.pinUI(this.pad.container);
    if (this.powerHud) this.pinUI(this.powerHud);
  }

  update(_t: number, delta: number): void {
    this.lifecycle.frame(delta);
    if (this.paused || this.tutLayer || this.celeLayer) {
      audio.setThrottle(0, false, 0);
      return;
    }
    const elapsed = Math.min(0.25, Math.max(0, delta / 1000));
    const dt = Math.min(0.05, elapsed);
    this.drive.update(dt);

    const mulch = this.hasPower("mulcher");
    this.mower.deckMul = this.hasPower("wide") ? 1.55 : 1;
    this.mower.speedMul = this.hasPower("turbo") ? 1.45 : 1;
    const current: DrivePose = { x: this.mower.x, y: this.mower.y, heading: this.mower.heading, speed: this.mower.speed };
    const resolved = resolveDrivePose(current, this.mower.step(dt), {
      width: this.grass.worldW,
      height: this.grass.worldH,
      radius: this.mower.def.radius,
      pad: 24,
      obstacles: this.collisionProps,
    });
    this.mower.commitPose(resolved, dt);

    const speedRatio = Math.min(1, this.mower.speed / Math.max(1, this.mower.topSpeed));
    const lead = save().reducedMotion ? 18 : 42 + speedRatio * 54;
    const focusX = this.mower.x + Math.cos(this.mower.heading) * lead;
    const focusY = this.mower.y + Math.sin(this.mower.heading) * lead;
    this.cameraFocus.setPosition(
      Phaser.Math.Linear(this.cameraFocus.x, focusX, 0.075),
      Phaser.Math.Linear(this.cameraFocus.y, focusY, 0.075)
    );
    this.drawTargetMarker();
    this.drawMowerEffects();

    const { cut } = this.grass.cutMower(
      this.mower.x,
      this.mower.y,
      this.mower.heading,
      this.mower.deckW,
      this.mower.deckL,
      this.mower.def.deckOffset,
      mulch
    );

    if (this.helperOn) {
      // Finish is a child-facing eight-second promise, not a frame-rate test.
      // Keep movement/collision on the conservative capped step above, while
      // advancing the helper from bounded wall time on slower devices.
      this.helperAcc += this.helperRate * elapsed;
      const n = Math.floor(this.helperAcc);
      if (n > 0) {
        this.helperAcc -= n;
        if (this.grass.helperSweep(n) === 0) this.helperOn = false;
      }
    }

    if (this.hasPower("flock") && Math.random() < 0.4) {
      this.grass.cutMower(
        this.mower.x + Math.cos(this.mower.heading + 0.9) * 40,
        this.mower.y + Math.sin(this.mower.heading + 0.9) * 40,
        this.mower.heading,
        36,
        36,
        0,
        false
      );
      if (!save().reducedMotion && Math.random() < 0.05) this.spawnBird();
    }

    audio.setDriveState({
      throttle: this.mower.throttle,
      speed: speedRatio,
      cutting: cut > 0 || this.helperOn,
      cutIntensity: cut,
      steeringLoad: Math.abs(this.mower.steering),
      terrain: this.terrain,
    });
    if (cut > 0 && !save().reducedMotion) {
      const deckX = this.mower.x + Math.cos(this.mower.heading) * this.mower.def.deckOffset;
      const deckY = this.mower.y + Math.sin(this.mower.heading) * this.mower.def.deckOffset;
      this.clippings.explode(Math.min(16, 3 + cut), deckX, deckY);
    }
    this.trackAcc += dt;
    if (speedRatio > 0.12 && this.trackAcc > 0.085) {
      this.trackAcc = 0;
      const back = this.mower.def.radius * 0.72;
      const side = this.mower.def.radius * 0.52;
      for (const sign of [-1, 1]) {
        const tx = this.mower.x - Math.cos(this.mower.heading) * back + Math.cos(this.mower.heading + Math.PI / 2) * side * sign;
        const ty = this.mower.y - Math.sin(this.mower.heading) * back + Math.sin(this.mower.heading + Math.PI / 2) * side * sign;
        this.tireTracks.explode(1, tx, ty);
      }
    }
    if ((this.terrain === "dry" || this.terrain === "farm" || this.terrain === "autumn") && speedRatio > 0.35 && !save().reducedMotion && Math.random() < 0.22) {
      this.dust.explode(2, this.mower.x - Math.cos(this.mower.heading) * 22, this.mower.y - Math.sin(this.mower.heading) * 22);
    }
    if (cut > 3 && Math.random() < 0.08) this.dropSparkle(this.mower.x, this.mower.y);

    this.collectPickups();
    this.collectSparkles();
    this.tickPowers();
    if (this.hasPower("rain")) {
      this.rainAcc += dt;
      if (this.rainAcc >= 1.15) {
        this.rainAcc = 0;
        this.showRainBurst(12);
      }
    } else this.rainAcc = 0;
    this.wiggleProps();
    this.updateAmbience();

    if (this.freeMow) {
      this.growAcc += dt;
      if (this.growAcc > 0.8) {
        this.growAcc = 0;
        this.grass.grow(6 + ((this.rng() * 8) | 0), this.rng);
      }
    }

    this.birdAcc += dt;
    if (this.birdAcc > 4 + this.rng() * 6) {
      this.birdAcc = 0;
      audio.chirpBird();
    }

    this.drawPie(this.grass.percent);
    if (!this.celebrated && !this.freeMow && this.grass.percent >= 0.88) this.celebrate();
  }

  private fitZoom(w: number, h: number): void {
    const cam = this.cameras.main;
    const v = getViewport(this);
    const machineLongAxis = Math.max(this.mower.sprite.displayWidth, this.mower.sprite.displayHeight);
    cam.setZoom(composeCamera(v, w, h, machineLongAxis).zoom);
    this.cameras.main.setBackgroundColor("#1a3d1f");
  }

  private makeClippings(): void {
    if (!this.textures.exists("clip")) {
      const c = document.createElement("canvas");
      c.width = 10;
      c.height = 5;
      const g = c.getContext("2d", { willReadFrequently: true })!;
      g.strokeStyle = "#8bc34a";
      g.lineWidth = 2;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(1, 4);
      g.quadraticCurveTo(5, 0, 9, 2);
      g.stroke();
      this.textures.addCanvas("clip", c);
    }
    const tint = this.terrain === "wet"
      ? [0x315f2b, 0x4f7f39, 0x749f50]
      : this.terrain === "dry" || this.terrain === "farm"
        ? [0x8a7138, 0xb39552, 0x647632]
        : this.terrain === "autumn"
          ? [0x7b552d, 0xb36a2e, 0x718438]
          : [0x7cb342, 0xaed581, 0x33691e, 0xc5e1a5];
    this.clippings = this.add.particles(0, 0, "clip", {
      speed: this.terrain === "wet" ? { min: 45, max: 125 } : { min: 75, max: 190 },
      angle: () => Phaser.Math.RadToDeg(this.mower?.heading ?? 0) + (this.mower?.def.rig.dischargeSide ?? 1) * (74 + Math.random() * 32),
      lifespan: { min: 620, max: 980 },
      alpha: { start: 0.95, end: 0 },
      scale: { start: 1.35, end: 0.35 },
      rotate: { min: 0, max: 360 },
      emitting: false,
      tint,
    });
    this.clippings.setDepth(6);
    if (save().reducedMotion) this.clippings.stop();
  }

  private makeDust(): void {
    if (!this.textures.exists("dust-speck")) {
      const c = document.createElement("canvas");
      c.width = 12;
      c.height = 12;
      const g = c.getContext("2d", { willReadFrequently: true })!;
      const grad = g.createRadialGradient(6, 6, 1, 6, 6, 6);
      grad.addColorStop(0, "rgba(215,176,112,0.8)");
      grad.addColorStop(1, "rgba(160,112,65,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 12, 12);
      this.textures.addCanvas("dust-speck", c);
    }
    this.dust = this.add.particles(0, 0, "dust-speck", {
      speed: { min: 12, max: 46 },
      lifespan: { min: 500, max: 950 },
      alpha: { start: 0.55, end: 0 },
      scale: { start: 0.8, end: 2.8 },
      emitting: false,
    }).setDepth(3.5);
  }

  private makeTireTracks(): void {
    if (!this.textures.exists("tire-mark")) {
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 5;
      const g = c.getContext("2d", { willReadFrequently: true })!;
      g.fillStyle = "rgba(25,51,24,0.5)";
      g.fillRect(1, 1, 5, 3);
      g.fillRect(10, 1, 5, 3);
      this.textures.addCanvas("tire-mark", c);
    }
    this.tireTracks = this.add.particles(0, 0, "tire-mark", {
      speed: 0,
      lifespan: this.terrain === "wet" ? 5200 : 3800,
      alpha: { start: 0.32, end: 0 },
      scale: { start: 0.85, end: 1 },
      rotate: () => Phaser.Math.RadToDeg(this.mower?.heading ?? 0),
      emitting: false,
    }).setDepth(1.5);
  }

  private buildAmbience(): void {
    if (save().reducedMotion) return;
    const areaCount = Phaser.Math.Clamp(Math.round((this.grass.worldW * this.grass.worldH) / 220000), 16, 46);
    const count = this.terrain === "night" ? Math.max(28, areaCount) : this.terrain === "autumn" ? Math.max(22, areaCount) : areaCount;
    for (let i = 0; i < count; i++) {
      const x = this.rng() * this.grass.worldW;
      const y = this.rng() * this.grass.worldH;
      if (!this.grass.isMowableAt(x, y)) continue;
      if (this.terrain === "night") {
        const glow = this.add.circle(x, y, 3 + this.rng() * 2, 0xfff59d, 0.7).setDepth(4);
        this.tweens.add({ targets: glow, alpha: 0.15, scale: 1.8, duration: 900 + this.rng() * 900, yoyo: true, repeat: -1, delay: this.rng() * 800 });
        this.ambient.push(glow);
      } else if (this.terrain === "autumn") {
        const leaf = this.add.ellipse(x, y, 10, 5, [0xff8f00, 0xd84315, 0xffb300][i % 3], 0.8).setDepth(3.5);
        this.tweens.add({ targets: leaf, angle: 360, x: x + 35 + this.rng() * 50, y: y + 18, duration: 3800 + this.rng() * 2200, yoyo: true, repeat: -1 });
        this.ambient.push(leaf);
      } else if (this.terrain === "lush" || this.terrain === "wet") {
        const petals = this.add.container(x, y).setDepth(1.2);
        const color = i % 4 === 0 ? 0xfff59d : i % 3 === 0 ? 0xe1f5fe : 0xf4f1de;
        for (let p = 0; p < 4; p++) {
          const a = p * Math.PI / 2;
          petals.add(this.add.ellipse(Math.cos(a) * 3, Math.sin(a) * 3, 4, 2.4, color, 0.72));
        }
        petals.add(this.add.circle(0, 0, 1.6, 0xffca28, 0.9));
        this.tweens.add({ targets: petals, angle: i % 2 ? 7 : -7, duration: 1700 + this.rng() * 900, yoyo: true, repeat: -1, ease: "Sine.InOut" });
        this.ambient.push(petals);
      } else if (this.terrain === "farm" || this.terrain === "dry") {
        const straw = this.add.ellipse(x, y, 13, 4, i % 2 ? 0xd4a94f : 0xb58a3d, 0.5).setDepth(1.2).setRotation(this.rng() * Math.PI);
        this.tweens.add({ targets: straw, angle: straw.angle + 10, duration: 2200 + this.rng() * 900, yoyo: true, repeat: -1, ease: "Sine.InOut" });
        this.ambient.push(straw);
      }
    }
  }

  private updateAmbience(): void {
    if (this.terrain !== "lush" && this.terrain !== "wet") return;
    for (const item of this.ambient) {
      const obj = item as unknown as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Visible;
      obj.setVisible(this.grass.isTallAt(obj.x, obj.y));
    }
  }

  private spawnPickups(spots: { x: number; y: number; id: PowerupId }[]): void {
    for (const s of spots) {
      const def = POWERUPS.find((p) => p.id === s.id)!;
      const glow = this.add.circle(0, 0, 31, Number(def.color.replace("#", "0x")), 0.24);
      const circle = this.add.circle(0, 0, 25, Number(def.color.replace("#", "0x")), 0.96).setStrokeStyle(4, 0xf4f1de);
      const icon = this.add.image(0, 0, `icon-${s.id}`).setDisplaySize(50, 50);
      const c = this.add.container(s.x, s.y, [glow, circle, icon]).setDepth(4);
      c.setData("id", s.id);
      c.setSize(58, 58);
      if (!save().reducedMotion) {
        this.tweens.add({ targets: c, y: s.y - 10, duration: 760, yoyo: true, repeat: -1, ease: "sine.inOut" });
        this.tweens.add({ targets: glow, scale: 1.35, alpha: 0.08, duration: 900, yoyo: true, repeat: -1 });
      }
      this.pickups.push(c);
    }
  }

  private collectPickups(): void {
    for (const p of this.pickups) {
      if (!p.active) continue;
      if (Phaser.Math.Distance.Between(p.x, p.y, this.mower.x, this.mower.y) < 48) {
        this.activate(p.getData("id") as PowerupId);
        p.destroy();
      }
    }
    this.pickups = this.pickups.filter((p) => p.active);
  }

  private activate(id: PowerupId): void {
    audio.blip("pickup");
    if (id === "rain") {
      if (this.freeMow) this.grass.grow(160, this.rng, 4);
      const def = POWERUPS.find((p) => p.id === id)!;
      this.powers = this.powers.filter((p) => p.id !== id);
      this.powers.push({ id, until: this.time.now + def.duration * 1000 });
      this.showRainBurst(28);
      this.refreshPowerHud();
      return;
    }
    const def = POWERUPS.find((p) => p.id === id)!;
    this.powers = this.powers.filter((p) => p.id !== id);
    this.powers.push({ id, until: this.time.now + def.duration * 1000 });
    if (id === "headlights" && !this.night) {
      this.night = this.add
        .rectangle(0, 0, this.grass.worldW, this.grass.worldH, 0x020810, 0.28)
        .setOrigin(0)
        .setDepth(1);
      this.uiCam.ignore(this.night);
    }
    this.refreshPowerHud();
  }

  private hasPower(id: PowerupId): boolean {
    return this.powers.some((p) => p.id === id);
  }

  private tickPowers(): void {
    this.powers = this.powers.filter((p) => p.until > this.time.now);
    if (this.hasPower("rainbow")) {
      this.mower.sprite.setTint(Phaser.Display.Color.HSLToColor((this.time.now / 800) % 1, 0.7, 0.6).color);
    } else {
      this.mower.sprite.clearTint();
    }
    if (!this.hasPower("headlights") && !this.baseNight && this.night) {
      this.night.destroy();
      this.night = undefined;
    }
    this.refreshPowerHud();
  }

  private dropSparkle(x: number, y: number): void {
    const a = this.add.circle(x, y, 6, 0xfff176).setDepth(7);
    this.uiCam.ignore(a);
    this.sparkleBits.push(a);
  }

  private collectSparkles(): void {
    const mag = this.hasPower("magnet") ? 160 : 36;
    for (const s of this.sparkleBits) {
      if (!s.active) continue;
      const d = Phaser.Math.Distance.Between(s.x, s.y, this.mower.x, this.mower.y);
      if (d < mag) {
        s.x += (this.mower.x - s.x) * 0.15;
        s.y += (this.mower.y - s.y) * 0.15;
      }
      if (d < 24) {
        audio.blip("sparkle");
        s.destroy();
      }
    }
    this.sparkleBits = this.sparkleBits.filter((s) => s.active);
  }

  private wiggleProps(): void {
    for (const img of this.props) {
      const p = img.getData("prop");
      const baseRotation = img.getData("baseRotation") as number;
      const d = Phaser.Math.Distance.Between(img.x, img.y, this.mower.x, this.mower.y);
      const canSway = p.kind === "flower" || p.kind === "bed" || p.kind === "tree" || p.kind === "pine" || p.kind === "hedge";
      const sway = canSway && d < p.r + this.mower.def.radius + 24 ? Math.sin(this.time.now / 80) * 0.045 : 0;
      img.setRotation(baseRotation + sway);
    }
  }

  private buildHud(): void {
    this.hud = new ActivityHud(this, {
      home: () => this.goHome(),
      pause: () => this.paused ? this.lifecycle.resume() : this.lifecycle.pause(),
      finish: () => this.lifecycle.finish(),
    }, COPY.stripes);
    this.powerHud = this.add.container(0, 0).setDepth(21).setScrollFactor(0);
    this.layoutHud();
  }

  private layoutHud(): void {
    const v = getViewport(this);
    this.hud.layout();
    this.powerHud.setPosition(v.width / 2, v.height - v.safe.bottom - 50);
  }

  private startFinish(): void {
    this.helperOn = true;
    this.helperAcc = 0;
    this.helperRate = Math.max(480, this.grass.remainingCount / 8);
  }

  private drawPie(p: number): void {
    this.hud.setProgress(p, this.freeMow ? COPY.freeMow : p < 0.01 ? "Make stripes" : `${Math.round(p * 100)}% mown`);
  }

  private refreshPowerHud(): void {
    if (!this.powerHud) return;
    const signature = this.powers.map((p) => p.id).sort().join("|");
    if (signature === this.powerSignature) return;
    this.powerSignature = signature;
    this.powerHud.removeAll(true);
    const ids = this.powers.map((p) => p.id);
    ids.forEach((id, i) => {
      const x = (i - (ids.length - 1) / 2) * 58;
      const bg = this.add.circle(x, 0, 25, 0x102418, 0.82).setStrokeStyle(3, 0xf4f1de);
      const icon = this.add.image(x, 0, `icon-${id}`).setDisplaySize(46, 46);
      this.powerHud.add([bg, icon]);
    });
  }

  private drawTargetMarker(): void {
    const target = this.drive.target;
    const g = this.targetMarker;
    g.clear();
    if (!target) return;
    const pulse = save().reducedMotion ? 14 : 12 + Math.sin(this.time.now / 110) * 3;
    g.lineStyle(3, 0xfff59d, 0.9);
    g.strokeCircle(target.x, target.y, pulse);
    g.lineStyle(2, 0xf4f1de, 0.65);
    g.beginPath();
    g.moveTo(target.x - 6, target.y);
    g.lineTo(target.x + 6, target.y);
    g.moveTo(target.x, target.y - 6);
    g.lineTo(target.x, target.y + 6);
    g.strokePath();
  }

  private drawMowerEffects(): void {
    const g = this.mowerEffects;
    g.clear();
    const x = this.mower.x;
    const y = this.mower.y;
    if (this.mower.speed > 10 && !save().reducedMotion) {
      const forwardX = Math.cos(this.mower.heading), forwardY = Math.sin(this.mower.heading);
      const sideX = Math.cos(this.mower.heading + Math.PI / 2), sideY = Math.sin(this.mower.heading + Math.PI / 2);
      g.lineStyle(1.6, 0x234d21, .42);
      for (let blade = 0; blade < 11; blade++) {
        const side = ((blade / 10) - .5) * (this.mower.deckW + 34);
        const ahead = 26 + (blade % 3) * 10;
        const bx = x + forwardX * ahead + sideX * side;
        const by = y + forwardY * ahead + sideY * side;
        if (!this.grass.isTallAt(bx, by)) continue;
        const bend = 7 + Math.sin(this.time.now / 75 + blade) * 2;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + forwardX * bend + sideX * (blade % 2 ? 2 : -2), by + forwardY * bend + sideY * (blade % 2 ? 2 : -2)); g.strokePath();
      }
    }
    const exhaust = this.mower.def.rig.exhaust;
    if (exhaust && this.mower.throttle > 0.08 && !save().reducedMotion) {
      const outlet = this.mower.rigPoint(exhaust);
      const backX = -Math.cos(this.mower.heading);
      const backY = -Math.sin(this.mower.heading);
      const crossX = Math.cos(this.mower.heading + Math.PI / 2);
      const crossY = Math.sin(this.mower.heading + Math.PI / 2);
      for (let puff = 0; puff < 3; puff++) {
        const age = (this.time.now / 260 + puff / 3) % 1;
        const drift = age * (16 + this.mower.throttle * 18);
        const wobble = Math.sin(this.time.now / 90 + puff * 2.1) * 3 * age;
        g.fillStyle(this.terrain === "wet" ? 0xd7e3e6 : 0xb0b7b2, (1 - age) * (0.16 + this.mower.throttle * 0.13));
        g.fillCircle(outlet.x + backX * drift + crossX * wobble, outlet.y + backY * drift + crossY * wobble, 2.5 + age * 6);
      }
    }
    if (this.mower.speed > 8) {
      const deckX = x + Math.cos(this.mower.heading) * this.mower.def.deckOffset;
      const deckY = y + Math.sin(this.mower.heading) * this.mower.def.deckOffset;
      const spin = this.time.now / 95;
      g.lineStyle(3, 0xdcedc8, 0.24 + this.mower.throttle * 0.2);
      for (let blade = 0; blade < 3; blade++) {
        const a = spin + blade * (Math.PI * 2 / 3);
        g.beginPath();
        g.moveTo(deckX + Math.cos(a) * 8, deckY + Math.sin(a) * 8);
        g.lineTo(deckX + Math.cos(a) * this.mower.deckW * 0.34, deckY + Math.sin(a) * this.mower.deckW * 0.34);
        g.strokePath();
      }
    }
    if (this.hasPower("wide")) {
      g.lineStyle(5, 0x81c784, 0.62);
      g.strokeEllipse(x, y, this.mower.deckW * 1.05, this.mower.deckL * 1.35);
    }
    if (this.hasPower("turbo")) {
      g.lineStyle(4, 0xff7043, 0.72);
      for (const side of [-1, 1]) {
        const sx = x - Math.cos(this.mower.heading) * 38 + Math.cos(this.mower.heading + Math.PI / 2) * side * 15;
        const sy = y - Math.sin(this.mower.heading) * 38 + Math.sin(this.mower.heading + Math.PI / 2) * side * 15;
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(sx - Math.cos(this.mower.heading) * (24 + Math.sin(this.time.now / 70) * 8), sy - Math.sin(this.mower.heading) * (24 + Math.sin(this.time.now / 70) * 8));
        g.strokePath();
      }
    }
    if (this.baseNight || this.hasPower("headlights")) {
      const cos = Math.cos(this.mower.heading);
      const sin = Math.sin(this.mower.heading);
      const sideX = Math.cos(this.mower.heading + Math.PI / 2);
      const sideY = Math.sin(this.mower.heading + Math.PI / 2);
      const frontX = x + cos * 34;
      const frontY = y + sin * 34;
      g.fillStyle(0xfff9c4, 0.13);
      g.beginPath();
      g.moveTo(frontX + sideX * 18, frontY + sideY * 18);
      g.lineTo(frontX + cos * 210 + sideX * 72, frontY + sin * 210 + sideY * 72);
      g.lineTo(frontX + cos * 210 - sideX * 72, frontY + sin * 210 - sideY * 72);
      g.lineTo(frontX - sideX * 18, frontY - sideY * 18);
      g.closePath();
      g.fillPath();
    }
  }

  private isWorldInput(x: number, y: number): boolean {
    const v = getViewport(this);
    if (this.hud?.containsScreenPoint(x, y)) return false;
    if (save().control === "pad" && x < 255 && y > v.height - 285) return false;
    return true;
  }

  private relayout(): void {
    this.drive.abortInput();
    this.lifecycle.resize();
    this.layoutHud();
    this.pad?.layout();
    this.fitZoom(this.grass.worldW, this.grass.worldH);
    this.overlays.layout();
    this.layoutActiveOverlay();
  }

  private togglePause(): void {
    if (this.celeLayer || this.tutLayer) return;
    this.paused = !this.paused;
    this.drive.abortInput();
    if (!this.paused) {
      this.overlays.dismissPause();
      return;
    }
    this.overlays.showPause(() => this.togglePause());
  }

  private showTutorial(): void {
    this.overlays.showTutorial(
      [COPY.tutorial1, COPY.tutorial2, COPY.tutorial3],
      0xfff176,
      () => {
        save().seenTutorial = true;
        persist();
      }
    );
  }

  private celebrate(): void {
    this.drive.abortInput();
    this.celebrated = true;
    audio.blip("honk");
    audio.blip("done");
    completeYard(this.levelId.startsWith("wander") ? "wander" : this.levelId);
    const w = this.scale.width;
    const h = this.scale.height;
    this.celeLayer = this.add.container(0, 0).setDepth(35).setScrollFactor(0);
    const bg = this.add.rectangle(w / 2, h / 2, w, h, 0x102418, 0.55).setInteractive();
    const check = this.add.image(w / 2, h / 2 - 70, "icon-check").setDisplaySize(120, 120);
    const msg = labelText(this, w / 2, h / 2 + 8, COPY.youDidIt, 40);
    const reward = labelText(this, w / 2, h / 2 + 56, `${Math.round(this.grass.percent * 100)}% mown`, 22);
    const hudLayout = playHudLayout(getViewport(this));
    const home = bigButton(this, hudLayout.homeX, hudLayout.y, "icon-home", COPY.home, () => this.goHome(), 80).setScale(hudLayout.size / 80);
    const again = bigButton(this, w / 2 - 90, h / 2 + 120, "icon-play", COPY.again, () => {
      this.scene.restart({ levelId: this.levelId, freeMow: this.freeMow, wander: this.wanderSeed });
    }, 96);
    const map = bigButton(this, w / 2 + 90, h / 2 + 120, "icon-map", COPY.map, () => this.goMap(), 96);
    this.celeLayer.add([bg, check, msg, reward, home, again, map]);
    this.celeLayer.setData("layout", { bg, check, msg, reward, home, again, map });
    this.pinUI(this.celeLayer);
    if (!save().reducedMotion) {
      for (let i = 0; i < 18; i++) {
        const bit = this.add.circle(w / 2, h / 2 - 70, 5, [0xfff176, 0x81c784, 0xff8a65, 0x4fc3f7][i % 4]);
        this.celeLayer.add(bit);
        this.tweens.add({
          targets: bit,
          x: w / 2 + (Math.random() * 280 - 140),
          y: h / 2 + (Math.random() * 160 - 40),
          alpha: 0,
          duration: 900 + Math.random() * 400,
        });
      }
    }
  }

  private goHome(): void {
    this.overlays.requestHome(() => {
      audio.stop();
      this.cleanup();
      this.scene.start("title");
    });
  }

  private layoutActiveOverlay(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    if (this.celeLayer) {
      const refs = this.celeLayer.getData("layout") as { bg: Phaser.GameObjects.Rectangle; check: Phaser.GameObjects.Image; msg: Phaser.GameObjects.Text; reward: Phaser.GameObjects.Text; home: Phaser.GameObjects.Container; again: Phaser.GameObjects.Container; map: Phaser.GameObjects.Container };
      const hudLayout = playHudLayout(getViewport(this));
      refs.bg.setPosition(w / 2, h / 2).setDisplaySize(w, h);
      refs.check.setPosition(w / 2, h / 2 - 76);
      refs.msg.setPosition(w / 2, h / 2 + 12);
      refs.reward.setPosition(w / 2, h / 2 + 56);
      refs.home.setPosition(hudLayout.homeX, hudLayout.y).setScale(hudLayout.size / 80);
      refs.again.setPosition(w / 2 - 92, h / 2 + 120);
      refs.map.setPosition(w / 2 + 92, h / 2 + 120);
    }
  }

  private showRainBurst(count = 26): void {
    if (save().reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Clamp(this.mower.x + (this.rng() - 0.5) * 520, 20, this.grass.worldW - 20);
      const y = Phaser.Math.Clamp(this.mower.y - 220 + this.rng() * 180, 20, this.grass.worldH - 100);
      const drop = this.add.ellipse(x, y, 4, 18, 0x90caf9, 0.75).setRotation(-0.18).setDepth(6);
      this.uiCam.ignore(drop);
      this.tweens.add({
        targets: drop,
        x: x - 24,
        y: y + 260,
        alpha: 0,
        duration: 650 + this.rng() * 300,
        delay: this.rng() * 500,
        onComplete: () => drop.destroy(),
      });
    }
  }

  private spawnBird(): void {
    const bird = this.add.graphics().setDepth(7);
    bird.lineStyle(3, 0xf4f1de, 0.9);
    bird.beginPath();
    bird.arc(-6, 0, 7, Math.PI * 1.1, Math.PI * 1.9);
    bird.arc(6, 0, 7, Math.PI * 1.1, Math.PI * 1.9);
    bird.strokePath();
    bird.setPosition(this.mower.x + (this.rng() - 0.5) * 100, this.mower.y + (this.rng() - 0.5) * 100);
    this.uiCam.ignore(bird);
    this.tweens.add({
      targets: bird,
      x: bird.x + 160 + this.rng() * 100,
      y: bird.y - 120 - this.rng() * 80,
      alpha: 0,
      scale: 1.5,
      duration: 1300,
      onComplete: () => bird.destroy(),
    });
  }

  private goMap(): void {
    audio.stop();
    this.cleanup();
    this.scene.start("map");
  }

  private cleanup(): void {
    if (this.cleanedUp) return;
    this.cleanedUp = true;
    this.overlays?.destroy();
    this.pad?.destroy();
    this.drive.destroy();
    this.mower.destroy();
    this.grass.destroy();
  }
}
