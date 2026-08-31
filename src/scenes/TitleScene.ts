import Phaser from "phaser";
import { COPY } from "../data/copy";
import { LEVELS } from "../data/levels";
import { MOWERS, mowerById } from "../data/mowers";
import { ROOMS } from "../data/rooms";
import { VACUUMS, vacuumById } from "../data/vacuums";
import { audio } from "../systems/AudioEngine";
import { toggleFullscreen } from "../systems/Fullscreen";
import { save } from "../systems/Save";
import { bindSceneResize, getViewport } from "../systems/Viewport";
import { bigButton, labelText } from "../ui/BigButton";
import { clearSceneAccessibleControls, registerAccessibleControl } from "../systems/Accessibility";
import { ensureMowerFallbackTexture, ensureVacuumFallbackTexture } from "../systems/AssetCatalog";
import { fitImageInside } from "../ui/fitImage";

export class TitleScene extends Phaser.Scene {
  private dockY = 0;
  private started = false;
  private vacuumBounds = new Phaser.Geom.Rectangle();

  constructor() { super("title"); }

  create(): void {
    this.cameras.main.setBackgroundColor("#16351c");
    this.input.setTopOnly(true);
    this.started = false;
    this.redraw();
    bindSceneResize(this, () => this.redraw());
    this.input.on("pointerup", this.startFromLawn, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.off("pointerup", this.startFromLawn, this));
  }

  private redraw(): void {
    clearSceneAccessibleControls(this);
    this.children.removeAll(true);
    const v = getViewport(this), w = v.width, h = v.height;
    if (this.textures.exists("title-art")) {
      const art = this.add.image(w / 2, h / 2, "title-art").setAlpha(.96);
      const source = art.texture.getSourceImage() as HTMLImageElement;
      const scale = Math.max(w / source.width, h / source.height);
      art.setDisplaySize(source.width * scale, source.height * scale);
      this.add.rectangle(w / 2, h / 2, w, h, 0x102418, v.compact ? .24 : .3);
    } else this.add.rectangle(w / 2, h / 2, w, h, 0x1b5e20);

    labelText(this, w / 2, v.safe.top + 52, COPY.title, v.compact ? 40 : 54);
    bigButton(this, v.safe.left + 50, v.safe.top + 52, "icon-fullscreen", COPY.fullScreen, () => void toggleFullscreen(), 78);
    bigButton(this, w - v.safe.right - 50, v.safe.top + 52, "icon-gear", COPY.settings, () => this.scene.start("settings"), 78);
    this.dockY = h - v.safe.bottom - (v.compact ? 68 : 72);

    const vertical = v.mode === "phone-portrait";
    const cardW = vertical ? Math.min(w - 46, 350) : Math.min(360, w * .36);
    const cardH = vertical ? Math.min(154, (this.dockY - v.safe.top - 150) * .42) : Math.min(250, h * .4);
    const mowX = vertical ? w / 2 : w * .31;
    const vacuumX = vertical ? w / 2 : w * .69;
    const mowY = vertical ? v.safe.top + 175 + cardH / 2 : Math.min(h * .45, this.dockY - cardH / 2 - 38);
    const vacuumY = vertical ? mowY + cardH + 18 : mowY;
    this.activityCard(mowX, mowY, cardW, cardH, "mow", () => this.startGame());
    this.activityCard(vacuumX, vacuumY, cardW, cardH, "vacuum", () => this.startVacuum());
    this.vacuumBounds.setTo(vacuumX - cardW / 2, vacuumY - cardH / 2, cardW, cardH);

    const dockSize = v.compact ? 76 : 82;
    const available = w - v.safe.left - v.safe.right;
    const positions = [0.125, .375, .625, .875].map((fraction) => v.safe.left + available * fraction);
    bigButton(this, positions[0], this.dockY, "icon-mower", COPY.garage, () => this.scene.start("garage"), dockSize);
    bigButton(this, positions[1], this.dockY, "icon-yard", COPY.map, () => this.scene.start("map"), dockSize);
    bigButton(this, positions[2], this.dockY, "icon-vacuum", COPY.vacuums, () => this.scene.start("vacuum-garage"), dockSize);
    bigButton(this, positions[3], this.dockY, "icon-room", COPY.rooms, () => this.scene.start("room-map"), dockSize);
    this.countBadge(positions[0] + dockSize * .36, this.dockY - dockSize * .36, MOWERS.length);
    this.countBadge(positions[1] + dockSize * .36, this.dockY - dockSize * .36, LEVELS.length);
    this.countBadge(positions[2] + dockSize * .36, this.dockY - dockSize * .36, VACUUMS.length);
    this.countBadge(positions[3] + dockSize * .36, this.dockY - dockSize * .36, ROOMS.length);
  }

  private activityCard(x: number, y: number, width: number, height: number, activity: "mow" | "vacuum", onClick: () => void): void {
    const mowing = activity === "mow";
    const bg = this.add.rectangle(x, y, width, height, mowing ? 0x2e7d32 : 0x216078, .96)
      .setStrokeStyle(6, mowing ? 0xc8e6c9 : 0xb2ebf2).setInteractive({ useHandCursor: true });
    const machine = mowing ? mowerById(save().selectedMower) : vacuumById(save().selectedVacuum);
    const key = mowing
      ? (this.textures.exists(`portrait-${machine.id}`) ? `portrait-${machine.id}` : this.textures.exists(`mower-world-${machine.id}`) ? `mower-world-${machine.id}` : ensureMowerFallbackTexture(this, machine.id))
      : (this.textures.exists(`vacuum-portrait-${machine.id}`) ? `vacuum-portrait-${machine.id}` : this.textures.exists(`vacuum-world-${machine.id}`) ? `vacuum-world-${machine.id}` : ensureVacuumFallbackTexture(this, machine.id));
    const artX = x - width * .22;
    const art = this.add.image(artX, y - height * .03, key);
    fitImageInside(art, width * .42, height * .7);
    const label = this.add.text(x + width * .18, y - 18, mowing ? COPY.mow : COPY.vacuum, {
      fontFamily: "system-ui", fontSize: `${Math.max(28, Math.min(42, height * .2))}px`, fontStyle: "bold", color: "#f4f1de", stroke: "#102418", strokeThickness: 6,
    }).setOrigin(.5);
    const detail = this.add.text(x + width * .18, y + height * .2, machine.name, {
      fontFamily: "system-ui", fontSize: `${Math.max(15, Math.min(20, height * .1))}px`, fontStyle: "bold", color: mowing ? "#c8e6c9" : "#b2ebf2",
    }).setOrigin(.5);
    bg.on("pointerdown", () => { bg.setScale(.98); art.setScale(.96); });
    bg.on("pointerout", () => { bg.setScale(1); art.setScale(1); });
    bg.on("pointerup", () => { bg.setScale(1); art.setScale(1); onClick(); });
    registerAccessibleControl(this, bg, mowing ? COPY.mow : COPY.vacuum, onClick);
    label.setDepth(2); detail.setDepth(2); art.setDepth(2);
  }

  private countBadge(x: number, y: number, count: number): void {
    this.add.circle(x, y, 17, 0xffc107, 1).setStrokeStyle(3, 0x102418).setDepth(12);
    this.add.text(x, y, String(count), { fontFamily: "system-ui", fontSize: "14px", fontStyle: "bold", color: "#102418" }).setOrigin(.5).setDepth(13);
  }

  private startFromLawn(p: Phaser.Input.Pointer): void {
    const v = getViewport(this);
    if (p.y < v.safe.top + 120 || this.vacuumBounds.contains(p.x, p.y)) return;
    if (p.y < this.dockY - 90) this.startGame();
  }

  private startGame(): void {
    if (this.started) return;
    this.started = true;
    audio.unlock();
    const yard = save().selectedYard;
    this.scene.start("play", yard.kind === "wander" ? { wander: yard.seed } : { levelId: yard.id });
  }

  private startVacuum(): void {
    if (this.started) return;
    this.started = true;
    audio.unlock();
    this.scene.start("vacuum-play", { roomId: save().selectedRoom });
  }
}
