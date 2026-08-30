import Phaser from "phaser";
import { MOWERS } from "../data/mowers";
import { COPY } from "../data/copy";
import { patchSave, save } from "../systems/Save";
import { audio } from "../systems/AudioEngine";
import { bindSceneResize, getViewport } from "../systems/Viewport";
import { bigButton, labelText } from "../ui/BigButton";
import { queueMowerGalleryAssets } from "../systems/AssetCatalog";

export class GarageScene extends Phaser.Scene {
  private index = 0;
  private dragX = 0;
  private layer?: Phaser.GameObjects.Container;
  private cardStep = 0;
  private centerX = 0;
  private dots: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super("garage");
  }

  preload(): void { queueMowerGalleryAssets(this); }

  create(): void {
    this.cameras.main.setBackgroundColor("#1b3d22");
    this.index = Math.max(0, MOWERS.findIndex((m) => m.id === save().selectedMower));
    this.redraw();
    bindSceneResize(this, () => this.redraw());
    this.input.on("pointerdown", () => { this.dragX = 0; });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !this.layer || p.y < 100) return;
      const dx = p.x - p.prevPosition.x;
      this.dragX += dx;
      this.layer.x += dx;
    });
    this.input.on("pointerup", () => {
      if (Math.abs(this.dragX) > 50) this.index += this.dragX < 0 ? 1 : -1;
      this.index = Phaser.Math.Clamp(this.index, 0, MOWERS.length - 1);
      this.snap();
    });
  }

  private redraw(): void {
    this.children.removeAll(true);
    this.dots = [];
    const v = getViewport(this);
    const w = v.width;
    const h = v.height;
    labelText(this, w / 2, v.safe.top + 46, COPY.garage, v.compact ? 36 : 42);
    bigButton(this, v.safe.left + 54, v.safe.top + 48, "icon-home", COPY.home, () => this.scene.start("title"), 80);

    const cardW = Math.min(v.compact ? w * 0.76 : 410, w - 150);
    const cardH = Math.min(v.compact ? h * 0.62 : 500, h - v.safe.top - v.safe.bottom - 190);
    this.cardStep = cardW + Math.min(56, w * 0.08);
    this.centerX = w / 2;
    this.layer = this.add.container(0, 0);
    const y = v.safe.top + 116 + cardH / 2;

    MOWERS.forEach((m, i) => {
      const x = this.centerX + i * this.cardStep;
      const selected = save().selectedMower === m.id;
      const bg = this.add.rectangle(x, y, cardW, cardH, 0x2e7d32, 0.98).setStrokeStyle(selected ? 7 : 4, selected ? 0xfff176 : 0xf4f1de).setInteractive();
      const key = this.textures.exists(m.portrait) ? m.portrait : this.textures.exists(`mower-world-${m.id}`) ? `mower-world-${m.id}` : `mower-card-${m.id}`;
      const artSize = Math.min(cardW * 0.76, cardH * 0.58);
      const art = this.add.image(x, y - cardH * 0.1, key).setDisplaySize(artSize, artSize);
      const name = this.add.text(x, y + cardH * 0.28, m.name, {
        fontFamily: "system-ui", fontSize: `${v.compact ? 25 : 31}px`, color: "#f4f1de", fontStyle: "bold", stroke: "#102418", strokeThickness: 5,
      }).setOrigin(0.5);
      const detail = `${m.label}  •  ${m.deckWidth}\" deck`;
      const kind = this.add.text(x, y + cardH * 0.38, detail, { fontFamily: "system-ui", fontSize: `${v.compact ? 16 : 19}px`, color: "#c8e6c9", align: "center" }).setOrigin(0.5);
      const ready = this.add.text(x, y + cardH * 0.46, selected ? "Ready" : "Tap to mow", { fontFamily: "system-ui", fontSize: `${v.compact ? 15 : 17}px`, color: selected ? "#fff59d" : "#f4f1de", fontStyle: "bold" }).setOrigin(0.5);
      bg.on("pointerup", () => {
        if (Math.abs(this.dragX) > 12 || i !== this.index) return;
        patchSave({ selectedMower: m.id });
        audio.setProfile(m.engine);
        audio.blip("tap");
        this.scene.start("play", { levelId: "home" });
      });
      this.layer!.add([bg, art, name, kind, ready]);
    });

    const arrowY = Math.min(h - v.safe.bottom - 58, y);
    this.arrow(v.safe.left + 48, arrowY, "‹", () => { this.index = Math.max(0, this.index - 1); this.snap(); });
    this.arrow(w - v.safe.right - 48, arrowY, "›", () => { this.index = Math.min(MOWERS.length - 1, this.index + 1); this.snap(); });
    const dotsY = h - v.safe.bottom - 22;
    for (let i = 0; i < MOWERS.length; i++) {
      this.dots.push(this.add.circle(w / 2 + (i - (MOWERS.length - 1) / 2) * 18, dotsY, i === this.index ? 6 : 4, i === this.index ? 0xfff176 : 0x81c784));
    }
    this.snap(false);
  }

  private arrow(x: number, y: number, glyph: string, click: () => void): void {
    const c = this.add.circle(x, y, 40, 0x3d8b40, 0.96).setStrokeStyle(4, 0x1b5e20).setInteractive();
    this.add.text(x, y - 3, glyph, { fontFamily: "system-ui", fontSize: "54px", color: "#f4f1de", fontStyle: "bold" }).setOrigin(0.5);
    c.on("pointerup", click);
  }

  private snap(animated = true): void {
    if (!this.layer) return;
    const x = -this.index * this.cardStep;
    this.dots.forEach((dot, i) => dot.setRadius(i === this.index ? 6 : 4).setFillStyle(i === this.index ? 0xfff176 : 0x81c784));
    if (!animated) {
      this.layer.x = x;
      return;
    }
    this.tweens.killTweensOf(this.layer);
    this.tweens.add({ targets: this.layer, x, duration: 260, ease: "Cubic.Out" });
  }
}
