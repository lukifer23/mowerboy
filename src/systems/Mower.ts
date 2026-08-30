import Phaser from "phaser";
import type { MowerDef } from "../data/mowers";
import { drawMowerFrame } from "./drawMower";
import type { DriveableMachine } from "./DriveableMachine";

export class Mower implements DriveableMachine {
  def: MowerDef;
  x: number;
  y: number;
  heading = 0;
  speed = 0;
  throttle = 0;
  steering = 0;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  wheelLayer: Phaser.GameObjects.Container;
  deckMul = 1;
  speedMul = 1;
  headlights = false;
  private texKey: string;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tex: Phaser.Textures.CanvasTexture;
  private usesIllustratedSprite: boolean;
  private lastPaint = -1;
  private baseSize: number;
  private spriteW: number;
  private spriteH: number;
  private wheelSpin = 0;
  private wheelParts: { group: Phaser.GameObjects.Container; treads: Phaser.GameObjects.Rectangle[]; front: boolean; length: number }[] = [];

  constructor(scene: Phaser.Scene, def: MowerDef, x: number, y: number) {
    this.def = def;
    this.x = x;
    this.y = y;
    this.canvas = document.createElement("canvas");
    this.canvas.width = 256;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;
    this.texKey = `mower-${def.id}-${Math.random().toString(36).slice(2, 6)}`;
    this.paint(0, 0);
    this.tex = scene.textures.addCanvas(this.texKey, this.canvas)!;
    const worldKey = `mower-world-${def.id}`;
    this.usesIllustratedSprite = scene.textures.exists(worldKey);
    this.shadow = scene.add.ellipse(x, y + 10, def.radius * 2.2, def.radius * 1.1, 0x000000, 0.28).setDepth(4);
    this.sprite = scene.add.image(x, y, this.usesIllustratedSprite ? worldKey : this.texKey).setDepth(5);
    this.baseSize = def.radius * 4.5 * def.rig.spriteScale;
    const source = this.sprite.texture.getSourceImage() as { width: number; height: number };
    const fit = this.baseSize / Math.max(source.width, source.height);
    this.spriteW = source.width * fit;
    this.spriteH = source.height * fit;
    this.sprite.setDisplaySize(this.spriteW, this.spriteH);
    this.wheelLayer = scene.add.container(x, y).setDepth(5.2);
    // Production art already contains tires, but the live rig must remain
    // readable at tablet zoom. A stronger translucent overlay makes steering
    // and tread travel visible without covering the illustrated machine.
    this.wheelLayer.setAlpha(this.usesIllustratedSprite ? 0.52 : 1);
    this.buildWheelAnimation(scene);
  }

  get deckW(): number {
    return this.def.deckWidth * this.deckMul;
  }

  get deckL(): number {
    return this.def.deckLength;
  }

  get topSpeed(): number {
    return this.def.topSpeed * this.speedMul;
  }

  get turnRate(): number {
    return this.def.turnRate;
  }

  get pivotTurn(): boolean {
    return this.def.steeringModel === "zero-turn" || this.def.kind === "zeroturn" || this.def.kind === "standon";
  }

  get assetMode(): "production" | "fallback" {
    return this.usesIllustratedSprite ? "production" : "fallback";
  }

  rigPoint(point: [number, number]): { x: number; y: number } {
    const forward = point[0] * this.baseSize;
    const side = point[1] * this.baseSize;
    return {
      x: this.x + Math.cos(this.heading) * forward + Math.cos(this.heading + Math.PI / 2) * side,
      y: this.y + Math.sin(this.heading) * forward + Math.sin(this.heading + Math.PI / 2) * side,
    };
  }

  update(dt: number): void {
    const desired = this.throttle * this.topSpeed;
    const rate = (desired > this.speed ? this.def.accel : this.def.brake) * this.topSpeed;
    if (this.speed < desired) this.speed = Math.min(desired, this.speed + rate * dt);
    else this.speed = Math.max(desired, this.speed - rate * dt);
    this.x += Math.cos(this.heading) * this.speed * dt;
    this.y += Math.sin(this.heading) * this.speed * dt;
    const t = this.sceneTime();
    const working = Math.min(1, this.speed / Math.max(1, this.topSpeed));
    const engineVibe = Math.sin(t * (18 + working * 14)) * (0.32 + working * 0.62);
    const sideX = Math.cos(this.heading + Math.PI / 2) * engineVibe;
    const sideY = Math.sin(this.heading + Math.PI / 2) * engineVibe;
    const visualHeading = this.heading + Math.sin(t * 21) * (0.0015 + working * 0.0018);
    this.sprite.setPosition(this.x + sideX, this.y + sideY).setRotation(visualHeading);
    this.sprite.setDisplaySize(this.spriteW, this.spriteH);
    this.wheelLayer.setPosition(this.x + sideX, this.y + sideY).setRotation(visualHeading);
    this.wheelSpin += this.speed * dt;
    for (let i = 0; i < this.wheelParts.length; i++) {
      const wheel = this.wheelParts[i];
      wheel.group.setRotation(wheel.front ? this.steering * 0.48 : 0);
      const phase = ((this.wheelSpin / Math.max(8, wheel.length * 0.9) + i * 0.27) % 1 + 1) % 1;
      wheel.treads[0].x = -wheel.length * 0.3 + phase * wheel.length * 0.6;
      wheel.treads[1].x = -wheel.length * 0.3 + ((phase + 0.5) % 1) * wheel.length * 0.6;
    }
    this.shadow.setPosition(this.x + 4, this.y + 12);
    this.shadow.setRotation(this.heading);
    if (!this.usesIllustratedSprite && t - this.lastPaint > 0.05) {
      this.paint(t, this.throttle);
      this.tex.update();
      this.lastPaint = t;
    }
  }

  clampTo(w: number, h: number, pad = 24): void {
    this.x = Math.max(pad, Math.min(w - pad, this.x));
    this.y = Math.max(pad, Math.min(h - pad, this.y));
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.wheelLayer.destroy(true);
    this.tex.destroy();
  }

  private buildWheelAnimation(scene: Phaser.Scene): void {
    const b = this.baseSize;
    const rig = this.def.rig;
    const addWheel = (x: number, y: number, front: boolean, size: [number, number]) => {
      // Rig values describe the illustrated wheel envelope. The live overlay
      // only traces the middle of that tire, otherwise it becomes a black box
      // over the production painting at distant camera zooms.
      const length = b * size[0] * 0.68;
      const width = b * size[1] * 0.76;
      const tire = scene.add.ellipse(0, 0, length, width, 0x050706, 0.16).setStrokeStyle(1.1, 0xd2d9d5, 0.52);
      const treadA = scene.add.rectangle(0, 0, Math.max(1.6, length * 0.075), width * 0.62, 0xe2e7e4, 0.78);
      const treadB = scene.add.rectangle(0, 0, Math.max(1.4, length * 0.065), width * 0.56, 0x7c8781, 0.72);
      const hub = scene.add.ellipse(0, 0, length * 0.2, width * 0.48, 0xc3cbc7, 0.28).setStrokeStyle(0.7, 0x202522, 0.48);
      const group = scene.add.container(x, y, [tire, treadA, treadB, hub]);
      this.wheelLayer.add(group);
      this.wheelParts.push({ group, treads: [treadA, treadB], front, length });
    };
    for (const side of [-1, 1]) {
      addWheel(b * rig.rearAxle, b * rig.rearTrack * side, false, rig.rearWheel);
      addWheel(b * rig.frontAxle, b * rig.frontTrack * side, true, rig.frontWheel);
    }
  }

  private paint(time: number, throttle: number): void {
    this.ctx.clearRect(0, 0, 256, 256);
    drawMowerFrame(this.ctx, this.def, time, throttle, this.steering);
  }

  private sceneTime(): number {
    return performance.now() / 1000;
  }
}
