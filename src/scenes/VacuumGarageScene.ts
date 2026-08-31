import Phaser from "phaser";
import { COPY } from "../data/copy";
import { VACUUMS } from "../data/vacuums";
import { audio } from "../systems/AudioEngine";
import { patchSave, save } from "../systems/Save";
import { bindSceneResize, getViewport } from "../systems/Viewport";
import { bigButton, labelText } from "../ui/BigButton";
import { ensureVacuumFallbackTexture, queueVacuumGalleryAssets } from "../systems/AssetCatalog";
import { clearSceneAccessibleControls, registerAccessibleControl } from "../systems/Accessibility";
import { fitImageInside } from "../ui/fitImage";

export class VacuumGarageScene extends Phaser.Scene {
  private index = 0;
  private dragX = 0;
  private cardStep = 0;
  private centerX = 0;
  private layer?: Phaser.GameObjects.Container;
  private dots: Phaser.GameObjects.Arc[] = [];

  constructor() { super("vacuum-garage"); }
  preload(): void { queueVacuumGalleryAssets(this); }

  create(): void {
    this.cameras.main.setBackgroundColor("#193844");
    this.index = Math.max(0, VACUUMS.findIndex((vacuum) => vacuum.id === save().selectedVacuum));
    this.redraw();
    bindSceneResize(this, () => this.redraw());
    this.input.on("pointerdown", () => { this.dragX = 0; });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || !this.layer || pointer.y < 100) return;
      const dx = pointer.x - pointer.prevPosition.x;
      this.dragX += dx;
      this.layer.x += dx;
    });
    this.input.on("pointerup", () => {
      if (Math.abs(this.dragX) > 50) this.index += this.dragX < 0 ? 1 : -1;
      this.index = Phaser.Math.Clamp(this.index, 0, VACUUMS.length - 1);
      this.snap();
    });
  }

  private redraw(): void {
    clearSceneAccessibleControls(this);
    this.children.removeAll(true);
    this.dots = [];
    const v = getViewport(this), w = v.width, h = v.height;
    labelText(this, w / 2, v.safe.top + 46, COPY.vacuums, v.compact ? 34 : 42);
    bigButton(this, v.safe.left + 54, v.safe.top + 48, "icon-home", COPY.home, () => this.scene.start("title"), 80);
    bigButton(this, w - v.safe.right - 58, v.safe.top + 48, "icon-room", COPY.rooms, () => this.scene.start("room-map"), 80);
    const cardW = Math.min(v.compact ? w * .76 : 410, w - 150);
    const cardH = Math.min(v.compact ? h * .62 : 500, h - v.safe.top - v.safe.bottom - 190);
    this.cardStep = cardW + Math.min(56, w * .08);
    this.centerX = w / 2;
    this.layer = this.add.container(0, 0);
    const y = v.safe.top + 116 + cardH / 2;
    VACUUMS.forEach((machine, i) => {
      const x = this.centerX + i * this.cardStep, selected = save().selectedVacuum === machine.id;
      const bg = this.add.rectangle(x, y, cardW, cardH, 0x23566a, .98).setStrokeStyle(selected ? 7 : 4, selected ? 0xfff176 : 0xe8f4f8).setInteractive();
      const key = this.textures.exists(`vacuum-portrait-${machine.id}`) ? `vacuum-portrait-${machine.id}` : this.textures.exists(`vacuum-world-${machine.id}`) ? `vacuum-world-${machine.id}` : ensureVacuumFallbackTexture(this, machine.id);
      const artSize = Math.min(cardW * .74, cardH * .56);
      const art = this.add.image(x, y - cardH * .1, key);
      fitImageInside(art, artSize, artSize);
      const name = this.add.text(x, y + cardH * .28, machine.name, { fontFamily: "system-ui", fontSize: `${v.compact ? 25 : 31}px`, color: "#f4f1de", fontStyle: "bold", stroke: "#102b35", strokeThickness: 5 }).setOrigin(.5);
      const detail = this.add.text(x, y + cardH * .38, machine.label, { fontFamily: "system-ui", fontSize: `${v.compact ? 16 : 19}px`, color: "#b2ebf2" }).setOrigin(.5);
      const ready = this.add.text(x, y + cardH * .46, selected ? COPY.ready : COPY.tapClean, { fontFamily: "system-ui", fontSize: `${v.compact ? 15 : 17}px`, color: selected ? "#fff59d" : "#f4f1de", fontStyle: "bold" }).setOrigin(.5);
      bg.on("pointerup", () => {
        if (Math.abs(this.dragX) > 12 || i !== this.index) return;
        patchSave({ selectedVacuum: machine.id, lastActivity: "vacuum" });
        audio.setVacuumProfile(machine.motor); audio.blip("tap");
        this.scene.start("vacuum-play", { roomId: save().selectedRoom || "living" });
      });
      registerAccessibleControl(this, bg, `${machine.name}, ${selected ? COPY.ready : COPY.tapClean}`, () => {
        if (i !== this.index) { this.index = i; this.snap(); return; }
        patchSave({ selectedVacuum: machine.id, lastActivity: "vacuum" }); audio.setVacuumProfile(machine.motor); audio.blip("tap"); this.scene.start("vacuum-play", { roomId: save().selectedRoom || "living" });
      });
      this.layer!.add([bg, art, name, detail, ready]);
    });
    const arrowY = Math.min(h - v.safe.bottom - 58, y);
    this.arrow(v.safe.left + 48, arrowY, "‹", () => { this.index = Math.max(0, this.index - 1); this.snap(); });
    this.arrow(w - v.safe.right - 48, arrowY, "›", () => { this.index = Math.min(VACUUMS.length - 1, this.index + 1); this.snap(); });
    const dotsY = h - v.safe.bottom - 22;
    for (let i = 0; i < VACUUMS.length; i++) this.dots.push(this.add.circle(w / 2 + (i - (VACUUMS.length - 1) / 2) * 18, dotsY, i === this.index ? 6 : 4, i === this.index ? 0xfff176 : 0x80deea));
    this.snap(false);
  }

  private arrow(x: number, y: number, glyph: string, click: () => void): void {
    const circle = this.add.circle(x, y, 40, 0x28738d, .96).setStrokeStyle(4, 0x102b35).setInteractive();
    this.add.text(x, y - 3, glyph, { fontFamily: "system-ui", fontSize: "54px", color: "#f4f1de", fontStyle: "bold" }).setOrigin(.5);
    circle.on("pointerup", click);
    registerAccessibleControl(this, circle, glyph === "‹" ? COPY.previousVacuum : COPY.nextVacuum, click);
  }

  private snap(animated = true): void {
    if (!this.layer) return;
    const x = -this.index * this.cardStep;
    this.dots.forEach((dot, i) => dot.setRadius(i === this.index ? 6 : 4).setFillStyle(i === this.index ? 0xfff176 : 0x80deea));
    if (!animated) { this.layer.x = x; return; }
    this.tweens.killTweensOf(this.layer);
    this.tweens.add({ targets: this.layer, x, duration: save().reducedMotion ? 0 : 260, ease: "Cubic.Out" });
  }
}
