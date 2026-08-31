import Phaser from "phaser";
import type { VacuumDef } from "../data/vacuums";
import type { DriveableMachine } from "./DriveableMachine";
import { drawVacuumFrame } from "./drawVacuum";
import { stepDrivePose, type DrivePose } from "./driveMath";

export class Vacuum implements DriveableMachine {
  x: number;
  y: number;
  heading = 0;
  speed = 0;
  throttle = 0;
  steering = 0;
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly rigLayer: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly key: string;
  private readonly canvas?: HTMLCanvasElement;
  private readonly texture?: Phaser.Textures.CanvasTexture;
  private readonly usesProductionArt: boolean;
  private readonly wheelParts: { wheel: Phaser.GameObjects.Ellipse; steers: boolean; side: number }[] = [];
  private readonly sideBrushes: Phaser.GameObjects.Arc[] = [];
  private readonly brush: Phaser.GameObjects.Rectangle;
  private readonly steeringHead: Phaser.GameObjects.Container;
  private readonly spriteW: number;
  private readonly spriteH: number;
  private wheelSpin = 0;
  private lastPaint = 0;

  constructor(scene: Phaser.Scene, readonly def: VacuumDef, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.key = `vacuum-${def.id}-${Math.random().toString(36).slice(2, 7)}`;
    const productionKey = `vacuum-world-${def.id}`;
    this.usesProductionArt = scene.textures.exists(productionKey);
    if (!this.usesProductionArt) {
      this.canvas = document.createElement("canvas");
      this.canvas.width = 256;
      this.canvas.height = 256;
      drawVacuumFrame(this.canvas.getContext("2d", { willReadFrequently: true })!, def, 0, 0, 0);
      this.texture = scene.textures.addCanvas(this.key, this.canvas)!;
    }
    const size = def.radius * 5.25 * def.rig.bodyScale;
    this.shadow = scene.add.ellipse(x + 5, y + 10, size * 0.78, size * 0.42, 0x000000, 0.24).setDepth(4);
    this.sprite = scene.add.image(x, y, this.usesProductionArt ? productionKey : this.key).setDepth(5);
    const source = this.sprite.texture.getSourceImage() as { width: number; height: number };
    const fit = size / Math.max(source.width, source.height);
    this.spriteW = source.width * fit;
    this.spriteH = source.height * fit;
    this.sprite.setDisplaySize(this.spriteW, this.spriteH);
    this.rigLayer = scene.add.container(x, y).setDepth(5.2);
    this.rigLayer.setAlpha(this.usesProductionArt ? 0.5 : 1);
    const track = size * def.rig.wheelTrack;
    const addAxle = (axle: number, steers: boolean, scale: number) => {
      for (const side of [-1, 1]) {
        const wheel = scene.add.ellipse(size * axle, track * side, size * .11 * scale, size * .045 * scale, 0x111514, .34)
          .setStrokeStyle(1, 0xd3dcdf, .68);
        this.rigLayer.add(wheel);
        this.wheelParts.push({ wheel, steers, side });
      }
    };
    addAxle(def.rig.rearAxle, false, def.rig.trailer ? 1.18 : 1);
    addAxle(def.rig.frontAxle, true, def.kind === "robot" ? .68 : .82);
    this.steeringHead = scene.add.container(def.rig.intakeOffset, 0);
    this.brush = scene.add.rectangle(0, 0, Math.max(8, def.rig.intakeDepth * .22), def.rig.intakeWidth * .78, Number(def.accent.replace("#", "0x")), def.rig.brushRoll ? .42 : .12)
      .setStrokeStyle(1, 0xf4f1de, .42);
    this.steeringHead.add(this.brush);
    this.rigLayer.add(this.steeringHead);
    if (def.rig.hose) {
      const hose = scene.add.graphics();
      hose.lineStyle(Math.max(3, size * .022), 0x263238, .62).beginPath();
      hose.moveTo(-size * .24, -size * .09).lineTo(-size * .42, -size * .25).lineTo(size * .13, -size * .3).lineTo(def.rig.intakeOffset * .72, -def.rig.intakeWidth * .18).strokePath();
      this.rigLayer.add(hose);
    }
    if (def.rig.trailer) {
      const trailer = scene.add.ellipse(-size * .34, 0, size * .34, size * .46, Number(def.body.replace("#", "0x")), .28)
        .setStrokeStyle(2, 0xf4f1de, .45);
      this.rigLayer.addAt(trailer, 0);
    }
    if (def.kind === "robot" || def.kind === "sweeper") {
      const count = def.kind === "sweeper" ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const side = count === 1 ? 1 : i ? 1 : -1;
        const sideBrush = scene.add.circle(def.rig.intakeOffset * .92, side * def.rig.intakeWidth * .43, Math.max(6, def.radius * .18), Number(def.accent.replace("#", "0x")), .5)
          .setStrokeStyle(2, 0xf4f1de, .42);
        this.rigLayer.add(sideBrush);
        this.sideBrushes.push(sideBrush);
      }
    }
  }

  get topSpeed(): number { return this.def.topSpeed; }
  get turnRate(): number { return this.def.turnRate; }
  get pivotTurn(): boolean { return this.def.kind === "robot" || this.def.kind === "sweeper"; }
  get assetMode(): "production" | "fallback" { return this.usesProductionArt ? "production" : "fallback"; }
  get intakeWidth(): number { return this.def.rig.intakeWidth; }
  get intakeDepth(): number { return this.def.rig.intakeDepth; }
  get intakeOffset(): number { return this.def.rig.intakeOffset; }

  step(dt: number): DrivePose {
    return stepDrivePose(this, { throttle: this.throttle }, {
      topSpeed: this.topSpeed,
      accel: this.def.accel,
      brake: this.def.brake,
    }, dt);
  }

  commitPose(pose: DrivePose, dt: number): void {
    this.x = pose.x;
    this.y = pose.y;
    this.heading = pose.heading;
    this.speed = pose.speed;
    const ratio = Math.min(1, this.speed / Math.max(1, this.topSpeed));
    const vibration = Math.sin(this.scene.time.now * 0.02) * (0.18 + ratio * 0.34);
    const vx = Math.cos(this.heading + Math.PI / 2) * vibration;
    const vy = Math.sin(this.heading + Math.PI / 2) * vibration;
    this.sprite.setPosition(this.x + vx, this.y + vy).setRotation(this.heading);
    this.shadow.setPosition(this.x + 5, this.y + 10).setRotation(this.heading);
    this.rigLayer.setPosition(this.x + vx, this.y + vy).setRotation(this.heading);
    this.wheelSpin += this.speed * dt;
    this.wheelParts.forEach(({ wheel, steers, side }) => {
      wheel.setRotation(side * this.wheelSpin * .055 + (steers ? this.steering * .38 : 0));
    });
    this.steeringHead.setRotation(this.steering * (this.def.kind === "robot" ? .18 : .42));
    const brushPhase = this.scene.time.now * (.012 + ratio * .02);
    this.brush.setAlpha(this.def.rig.brushRoll ? .22 + Math.abs(Math.sin(brushPhase)) * .38 : .1);
    this.brush.setScale(1, this.def.rig.brushRoll ? .9 + Math.abs(Math.cos(brushPhase)) * .18 : 1);
    this.sideBrushes.forEach((sideBrush, index) => sideBrush.setRotation(brushPhase * (index ? -1 : 1)));
    if (!this.usesProductionArt && this.scene.time.now - this.lastPaint > 45) {
      drawVacuumFrame(this.canvas!.getContext("2d", { willReadFrequently: true })!, this.def, this.scene.time.now / 1000, this.throttle, this.steering);
      this.texture?.update();
      this.lastPaint = this.scene.time.now;
    }
  }

  update(dt: number): void {
    this.commitPose(this.step(dt), dt);
  }

  clampTo(width: number, height: number, pad = 36): void {
    this.x = Phaser.Math.Clamp(this.x, pad, width - pad);
    this.y = Phaser.Math.Clamp(this.y, pad, height - pad);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.rigLayer.destroy(true);
    this.texture?.destroy();
  }
}
