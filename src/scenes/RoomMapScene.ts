import Phaser from "phaser";
import { COPY } from "../data/copy";
import { ROOMS, type FloorType } from "../data/rooms";
import { audio } from "../systems/AudioEngine";
import { patchSave, save } from "../systems/Save";
import { bindSceneResize, getViewport } from "../systems/Viewport";
import { bigButton, labelText } from "../ui/BigButton";

const FLOOR_COLOR: Record<FloorType, number> = {
  carpet: 0x8ba57e, rug: 0x315f73, hardwood: 0xb97942, tile: 0xd8ddd8, concrete: 0x858a88,
};

export class RoomMapScene extends Phaser.Scene {
  private layer?: Phaser.GameObjects.Container;
  private scroll = 0;
  private minScroll = 0;
  private dragDistance = 0;

  constructor() { super("room-map"); }

  create(): void {
    this.cameras.main.setBackgroundColor("#193844");
    this.redraw();
    bindSceneResize(this, () => this.redraw());
    this.input.on("pointerdown", () => { this.dragDistance = 0; });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !this.layer || p.y < 96) return;
      const dy = p.y - p.prevPosition.y;
      this.dragDistance += Math.abs(dy);
      this.scroll = Phaser.Math.Clamp(this.scroll + dy, this.minScroll, 0);
      this.layer.y = this.scroll;
    });
    this.input.on("wheel", (_p: Phaser.Input.Pointer, _g: unknown, _dx: number, dy: number) => {
      if (!this.layer) return;
      this.scroll = Phaser.Math.Clamp(this.scroll - dy * .7, this.minScroll, 0);
      this.layer.y = this.scroll;
    });
  }

  private redraw(): void {
    this.children.removeAll(true);
    const v = getViewport(this), w = v.width, h = v.height;
    this.scroll = 0;
    labelText(this, w / 2, v.safe.top + 46, COPY.rooms, v.compact ? 34 : 42);
    bigButton(this, v.safe.left + 54, v.safe.top + 48, "icon-home", COPY.home, () => this.scene.start("title"), 80);
    bigButton(this, w - v.safe.right - 58, v.safe.top + 48, "icon-garage", COPY.vacuums, () => this.scene.start("vacuum-garage"), 80);
    const done = ROOMS.filter((room) => save().cleanedRooms.includes(room.id)).length;
    if (!v.compact) {
      this.add.text(w - v.safe.right - 145, v.safe.top + 48, `${done}/${ROOMS.length} ✓`, {
        fontFamily: "system-ui", fontSize: "22px", color: "#fff59d", fontStyle: "bold", stroke: "#102b35", strokeThickness: 5,
      }).setOrigin(1, .5);
    }
    const roomPrompt = v.compact ? `Pick any room • ${done}/${ROOMS.length} ✓` : "Pick any room • no rush";
    this.add.text(w / 2, v.safe.top + 88, roomPrompt, {
      fontFamily: "system-ui", fontSize: `${v.compact ? 16 : 18}px`, color: "#b2ebf2", fontStyle: "bold",
    }).setOrigin(.5);
    this.layer = this.add.container(0, 0);
    const cols = v.mode === "phone-portrait" ? 2 : v.mode === "phone-landscape" ? 4 : v.mode === "tablet" ? 3 : 5;
    const margin = v.compact ? 14 : 24, gap = v.compact ? 12 : 18;
    const cardW = Math.min(210, (w - margin * 2 - gap * (cols - 1)) / cols);
    const cardH = Math.max(142, Math.min(190, cardW * .9));
    const top = v.safe.top + 132;
    ROOMS.forEach((room, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = margin + cardW / 2 + col * (cardW + gap), y = top + cardH / 2 + row * (cardH + gap);
      const finished = save().cleanedRooms.includes(room.id);
      const base = room.floors.find((floor) => floor !== "rug") ?? room.floors[0];
      const card = this.add.rectangle(x, y, cardW, cardH, FLOOR_COLOR[base], .98)
        .setStrokeStyle(finished ? 6 : 4, finished ? 0xffd54f : 0xf4f1de).setInteractive();
      const preview = this.add.graphics();
      this.drawPreview(preview, x - cardW * .38, y - cardH * .34, cardW * .76, cardH * .5, room.floors);
      const name = this.add.text(x, y + cardH * .26, room.name, {
        fontFamily: "system-ui", fontSize: `${v.compact ? 16 : 18}px`, fontStyle: "bold", color: "#f4f1de", align: "center",
        wordWrap: { width: cardW - 12 }, stroke: "#102b35", strokeThickness: 4,
      }).setOrigin(.5);
      const badge = this.add.image(x + cardW * .32, y - cardH * .34, finished ? "icon-check" : "icon-play").setDisplaySize(44, 44);
      card.on("pointerup", () => {
        if (this.dragDistance > 12) return;
        audio.unlock();
        patchSave({ selectedRoom: room.id, lastActivity: "vacuum" });
        this.scene.start("vacuum-play", { roomId: room.id });
      });
      this.layer!.add([card, preview, name, badge]);
    });
    const rows = Math.ceil(ROOMS.length / cols), bottom = top + rows * (cardH + gap);
    this.minScroll = Math.min(0, h - v.safe.bottom - bottom);
  }

  private drawPreview(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, floors: FloorType[]): void {
    const base = floors.find((floor) => floor !== "rug") ?? floors[0];
    g.fillStyle(FLOOR_COLOR[base], 1).fillRoundedRect(x, y, w, h, 9);
    g.lineStyle(3, base === "hardwood" ? 0x7c4a29 : 0xaab2ad, .65);
    for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x, y + h * i / 5); g.lineTo(x + w, y + h * i / 5); g.strokePath(); }
    if (floors.includes("rug")) {
      g.fillStyle(FLOOR_COLOR.rug, .95).fillRoundedRect(x + w * .25, y + h * .22, w * .5, h * .56, 7);
      g.lineStyle(3, 0xd7a64a, 1).strokeRoundedRect(x + w * .28, y + h * .26, w * .44, h * .48, 5);
    }
    g.fillStyle(0x6d4c41, .9).fillRoundedRect(x + w * .42, y + h * .36, w * .22, h * .28, 6);
  }
}
