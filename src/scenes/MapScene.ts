import Phaser from "phaser";
import { LEVELS, parseMap } from "../data/levels";
import { COPY } from "../data/copy";
import { save } from "../systems/Save";
import { audio } from "../systems/AudioEngine";
import { PALETTES } from "../systems/palette";
import { bindSceneResize, getViewport } from "../systems/Viewport";
import { bigButton, labelText } from "../ui/BigButton";

export class MapScene extends Phaser.Scene {
  private layer?: Phaser.GameObjects.Container;
  private scroll = 0;
  private minScroll = 0;
  private dragDistance = 0;

  constructor() {
    super("map");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1b3d22");
    this.redraw();
    bindSceneResize(this, () => this.redraw());
    this.input.on("pointerdown", () => {
      this.dragDistance = 0;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !this.layer || p.y < 96) return;
      const dy = p.y - p.prevPosition.y;
      this.dragDistance += Math.abs(dy);
      this.scroll = Phaser.Math.Clamp(this.scroll + dy, this.minScroll, 0);
      this.layer.y = this.scroll;
    });
    this.input.on("wheel", (_p: Phaser.Input.Pointer, _g: unknown, _dx: number, dy: number) => {
      if (!this.layer) return;
      this.scroll = Phaser.Math.Clamp(this.scroll - dy * 0.7, this.minScroll, 0);
      this.layer.y = this.scroll;
    });
  }

  private redraw(): void {
    this.children.removeAll(true);
    const v = getViewport(this);
    const w = v.width;
    const h = v.height;
    this.scroll = 0;
    labelText(this, w / 2, v.safe.top + 46, COPY.map, v.compact ? 36 : 42);
    bigButton(this, v.safe.left + 54, v.safe.top + 48, "icon-home", COPY.home, () => this.scene.start("title"), 80);
    const finished = LEVELS.filter((level) => save().completedYards.includes(level.id)).length;
    this.add.text(w - v.safe.right - 18, v.safe.top + 48, `${finished}/${LEVELS.length} ✓`, {
      fontFamily: "system-ui", fontSize: `${v.compact ? 18 : 22}px`, color: "#fff59d", fontStyle: "bold",
      stroke: "#102418", strokeThickness: 5,
    }).setOrigin(1, 0.5);
    this.add.text(w / 2, v.safe.top + 88, "Pick any yard • no rush", {
      fontFamily: "system-ui", fontSize: `${v.compact ? 16 : 18}px`, color: "#c8e6c9", fontStyle: "bold",
    }).setOrigin(0.5);
    this.layer = this.add.container(0, 0);

    const cols = v.mode === "phone-portrait" ? 2 : v.mode === "phone-landscape" ? 4 : v.mode === "tablet" ? 3 : 5;
    const margin = v.compact ? 14 : 24;
    const gap = v.compact ? 12 : 18;
    const cardW = Math.min(210, (w - margin * 2 - gap * (cols - 1)) / cols);
    const cardH = Math.max(142, Math.min(190, cardW * 0.9));
    const top = v.safe.top + 132;
    const items = [...LEVELS.map((level) => ({ level, wander: false })), { level: null, wander: true }];
    const nextId = LEVELS.find((level) => !save().completedYards.includes(level.id))?.id;

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = margin + cardW / 2 + col * (cardW + gap);
      const y = top + cardH / 2 + row * (cardH + gap);
      const id = item.wander ? "wander" : item.level!.id;
      const done = save().completedYards.includes(id);
      const next = id === nextId;
      const terrain = item.wander ? "lush" : item.level!.terrain;
      const pal = PALETTES[terrain];
      const color = Phaser.Display.Color.GetColor(pal.tall[0], pal.tall[1], pal.tall[2]);
      const card = this.add.rectangle(x, y, cardW, cardH, color, 0.98).setStrokeStyle(done || next ? 6 : 4, done || next ? 0xffd54f : 0xf4f1de).setInteractive();
      const preview = this.add.graphics().setPosition(x - cardW * 0.38, y - cardH * 0.34);
      this.drawMiniMap(preview, item.level?.map, cardW * 0.76, cardH * 0.5, pal);
      const name = item.wander ? COPY.wander : item.level!.name;
      const text = this.add.text(x, y + cardH * 0.26, name, {
        fontFamily: 'system-ui, "Trebuchet MS", sans-serif',
        fontSize: `${v.compact ? 16 : 18}px`,
        fontStyle: "bold",
        color: "#f4f1de",
        align: "center",
        wordWrap: { width: cardW - 12 },
        stroke: "#102418",
        strokeThickness: 4,
      }).setOrigin(0.5);
      const badge = this.add.image(x + cardW * 0.32, y - cardH * 0.34, done ? "icon-check" : "icon-play").setDisplaySize(44, 44);
      if (next && !done) {
        const baseScaleX = badge.scaleX;
        const baseScaleY = badge.scaleY;
        this.tweens.add({
          targets: badge,
          scaleX: baseScaleX * 1.14,
          scaleY: baseScaleY * 1.14,
          duration: 620,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
        });
      }
      card.on("pointerup", () => {
        if (this.dragDistance > 12) return;
        audio.unlock();
        if (item.wander) this.scene.start("play", { wander: Date.now() & 0xffff });
        else this.scene.start("play", { levelId: item.level!.id });
      });
      this.layer!.add([card, preview, text, badge]);
    });

    const rows = Math.ceil(items.length / cols);
    const freeY = top + rows * (cardH + gap) + 34;
    const free = this.add.rectangle(w / 2, freeY, Math.min(360, w - margin * 2), 78, 0x1976d2, 0.98).setStrokeStyle(4, 0xf4f1de).setInteractive();
    const freeText = this.add.text(w / 2, freeY, COPY.freeMow, {
      fontFamily: 'system-ui, "Trebuchet MS", sans-serif', fontSize: "26px", fontStyle: "bold", color: "#f4f1de", stroke: "#102418", strokeThickness: 5,
    }).setOrigin(0.5);
    free.on("pointerup", () => {
      if (this.dragDistance > 12) return;
      audio.unlock();
      this.scene.start("play", { levelId: save().visitedYards[0] ?? "home", freeMow: true });
    });
    this.layer.add([free, freeText]);
    const contentBottom = freeY + 65;
    this.minScroll = Math.min(0, h - v.safe.bottom - contentBottom);
  }

  private drawMiniMap(
    g: Phaser.GameObjects.Graphics,
    map: string | undefined,
    width: number,
    height: number,
    pal: (typeof PALETTES)[keyof typeof PALETTES]
  ): void {
    g.fillStyle(Phaser.Display.Color.GetColor(pal.cutA[0], pal.cutA[1], pal.cutA[2]), 1);
    g.fillRoundedRect(0, 0, width, height, 10);
    if (!map) {
      for (let i = 0; i < 8; i++) {
        g.fillStyle(i % 2 ? 0x81c784 : 0x43a047, 0.7);
        g.fillCircle((i * 37) % width, (i * 53) % height, 8 + (i % 3) * 3);
      }
      return;
    }
    const rows = parseMap(map);
    const cols = Math.max(...rows.map((r) => r.length));
    const sx = width / cols;
    const sy = height / rows.length;
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === "." || ch === "w" || ch === "," || ch === "S") return;
      const color = ch === "#" ? 0x795548 : ch === "O" ? 0x42a5f5 : ch === "H" ? 0xd7ccc8 : ch === "D" || ch === "=" ? 0x9e9e9e : ch === "Y" ? 0xffc107 : ch === "L" ? 0x6d4c41 : 0x1b5e20;
      g.fillStyle(color, 0.92);
      g.fillRect(c * sx, r * sy, Math.max(1, sx + 0.4), Math.max(1, sy + 0.4));
    }));
  }
}
