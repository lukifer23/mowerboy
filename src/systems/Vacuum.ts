import Phaser from "phaser";
import type { VacuumDef } from "../data/vacuums";
import type { DriveableMachine } from "./DriveableMachine";
import { drawVacuumFrame } from "./drawVacuum";

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
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: Phaser.Textures.CanvasTexture;
  private readonly usesProductionArt: boolean;
  private readonly wheelParts: Phaser.GameObjects.Ellipse[] = [];
  private readonly brush: Phaser.GameObjects.Rectangle;
  private readonly spriteW: number;
  private readonly spriteH: number;
  private wheelSpin = 0;
  private lastPaint = 0;

  constructor(scene: Phaser.Scene, readonly def: VacuumDef, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.canvas = document.createElement("canvas");
    this.canvas.width = 256;
    this.canvas.height = 256;
    drawVacuumFrame(this.canvas.getContext("2d", { willReadFrequently: true })!, def, 0, 0, 0);
    this.key = `vacuum-${def.id}-${Math.random().toString(36).slice(2, 7)}`;
    this.texture = scene.textures.addCanvas(this.key, this.canvas)!;
    const productionKey = `vacuum-world-${def.id}`;
    this.usesProductionArt = scene.textures.exists(productionKey);
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
    for (const side of [-1, 1]) {
      const wheel = scene.add.ellipse(size * def.rig.rearAxle, track * side, size * 0.11, size * 0.045, 0x111514, 0.24)
        .setStrokeStyle(1, 0xd3dcdf, 0.62);
      this.rigLayer.add(wheel);
      this.wheelParts.push(wheel);
    }
    this.brush = scene.add.rectangle(size * 0.27, 0, size * 0.08, size * 0.42, Number(def.accent.replace("#", "0x")), 0.28);
    this.rigLayer.add(this.brush);
  }

  get topSpeed(): number { return this.def.topSpeed; }
  get turnRate(): number { return this.def.turnRate; }
  get pivotTurn(): boolean { return this.def.kind === "robot" || this.def.kind === "sweeper"; }
  get assetMode(): "production" | "fallback" { return this.usesProductionArt ? "production" : "fallback"; }
  get intakeWidth(): number { return this.def.rig.intakeWidth; }
  get intakeDepth(): number { return this.def.rig.intakeDepth; }
  get intakeOffset(): number { return this.def.rig.intakeOffset; }

  update(dt: number): void {
    const desired = this.throttle * this.topSpeed;
    const rate = (desired > this.speed ? this.def.accel : this.def.brake) * this.topSpeed;
    this.speed = desired > this.speed ? Math.min(desired, this.speed + rate * dt) : Math.max(desired, this.speed - rate * dt);
    this.x += Math.cos(this.heading) * this.speed * dt;
    this.y += Math.sin(this.heading) * this.speed * dt;
    const ratio = Math.min(1, this.speed / Math.max(1, this.topSpeed));
    const vibration = Math.sin(this.scene.time.now * 0.02) * (0.18 + ratio * 0.34);
    const vx = Math.cos(this.heading + Math.PI / 2) * vibration;
    const vy = Math.sin(this.heading + Math.PI / 2) * vibration;
    this.sprite.setPosition(this.x + vx, this.y + vy).setRotation(this.heading);
    this.shadow.setPosition(this.x + 5, this.y + 10).setRotation(this.heading);
    this.rigLayer.setPosition(this.x + vx, this.y + vy).setRotation(this.heading);
    this.wheelSpin += this.speed * dt;
    this.wheelParts.forEach((wheel, i) => {
      wheel.setRotation((i ? -1 : 1) * this.wheelSpin * 0.055 + (this.def.kind === "sweeper" ? this.steering * 0.25 : 0));
    });
    this.brush.setAlpha(this.def.rig.brushRoll ? 0.18 + Math.abs(Math.sin(this.scene.time.now * (0.012 + ratio * 0.02))) * 0.3 : 0.06);
    if (!this.usesProductionArt && this.scene.time.now - this.lastPaint > 45) {
      drawVacuumFrame(this.canvas.getContext("2d", { willReadFrequently: true })!, this.def, this.scene.time.now / 1000, this.throttle, this.steering);
      this.texture.update();
      this.lastPaint = this.scene.time.now;
    }
  }

  clampTo(width: number, height: number, pad = 36): void {
    this.x = Phaser.Math.Clamp(this.x, pad, width - pad);
    this.y = Phaser.Math.Clamp(this.y, pad, height - pad);
  }

  destroy(): void {
    this.sprite.destroy();
    this.shadow.destroy();
    this.rigLayer.destroy(true);
    this.texture.destroy();
  }
}
