import Phaser from "phaser";
import type { RoomDef } from "../data/rooms";
import { debrisCompletion, helperCleanInPlace, scatterDebris, stepSuctionInPlace, type DebrisParticle, type DebrisType, type VacuumPose } from "./debrisMath";
import type { RoomProp } from "./RoomLayout";
import { safeDebrisPoint } from "./RoomLayout";

const COLOR: Record<DebrisType, number> = {
  dust: 0xb9a58f, crumb: 0xc8863d, cereal: 0xf2c94c, hair: 0x47382f, petFur: 0xd8c5ae,
  leaf: 0x8f5d2e, confetti: 0xf45b69, dirt: 0x67503b, sawdust: 0xd6aa62,
};

export class DebrisField {
  particles: DebrisParticle[];
  readonly views = new Map<number, Phaser.GameObjects.Image>();
  private helperIndex = 0;
  private remaining = 0;
  private completionValue = 0;
  constructor(scene: Phaser.Scene, room: RoomDef, obstacles: RoomProp[]) {
    ensureDebrisTextures(scene);
    const perType = Math.max(28, Math.round(190 / room.debris.length));
    const candidates = scatterDebris(room.seed, room.debris.map((type) => ({ type, count: perType * 2 })), {
      left: 85, top: 85, right: room.width - 85, bottom: room.height - 85,
    });
    const chosen: DebrisParticle[] = [];
    const counts = new Map<DebrisType, number>();
    for (const p of candidates) {
      if ((counts.get(p.type) ?? 0) >= perType || !safeDebrisPoint(obstacles, p.x, p.y)) continue;
      p.id = chosen.length;
      chosen.push(p);
      counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
    }
    this.particles = chosen;
    this.remaining = chosen.length;
    for (const p of this.particles) {
      const image = scene.add.image(p.x, p.y, `debris-${p.type}`).setRotation(p.angle).setDepth(2);
      image.setScale(0.76 + p.total * 0.22);
      this.views.set(p.id, image);
    }
  }

  get percent(): number { return this.completionValue; }
  get remainingCount(): number { return this.remaining; }

  clean(pose: VacuumPose, dt: number): { cleaned: number; impacts: DebrisType[] } {
    const result = stepSuctionInPlace(this.particles, pose, dt);
    this.remaining = Math.max(0, this.remaining - result.impacts.length);
    if (result.cleaned > 0) this.completionValue = debrisCompletion(this.particles);
    this.syncViews(result.dirty);
    return { cleaned: result.cleaned, impacts: result.impacts };
  }

  helperStep(maxParticles: number): number {
    const result = helperCleanInPlace(this.particles, this.helperIndex, maxParticles);
    this.helperIndex = result.next;
    this.remaining = Math.max(0, this.remaining - result.cleaned);
    if (result.cleaned > 0) this.completionValue = debrisCompletion(this.particles);
    this.syncViews(result.dirty);
    return result.cleaned;
  }

  destroy(): void {
    for (const view of this.views.values()) view.destroy();
    this.views.clear();
  }

  private syncViews(ids: number[]): void {
    for (const id of ids) {
      const p = this.particles[id];
      if (!p) continue;
      const view = this.views.get(p.id);
      if (!view) continue;
      if (p.removed) { view.setVisible(false); continue; }
      view.setPosition(p.x, p.y).setRotation(p.angle).setScale((0.76 + p.total * 0.22) * Math.max(0.28, p.amount / p.total));
    }
  }
}

function ensureDebrisTextures(scene: Phaser.Scene): void {
  const types = Object.keys(COLOR) as DebrisType[];
  for (const type of types) {
    const key = `debris-${type}`;
    if (scene.textures.exists(key)) continue;
    const c = document.createElement("canvas"); c.width = 36; c.height = 36;
    const g = c.getContext("2d", { willReadFrequently: true })!; g.translate(18,18); g.fillStyle = `#${COLOR[type].toString(16).padStart(6,"0")}`; g.strokeStyle="rgba(45,35,26,.55)"; g.lineWidth=2;
    if (type === "hair") { g.beginPath(); g.arc(0,0,12,.3,Math.PI*1.8); g.arc(2,1,7,Math.PI*1.8,.25,true); g.stroke(); }
    else if (type === "petFur" || type === "dust" || type === "sawdust") { for(let i=0;i<(type==="dust"?8:5);i++){ const a=i*2.4; g.beginPath();g.arc(Math.cos(a)*8,Math.sin(a)*7,2+(i%3),0,Math.PI*2);g.fill(); } }
    else if (type === "leaf") { g.beginPath();g.ellipse(0,0,14,7,-.4,0,Math.PI*2);g.fill();g.stroke();g.beginPath();g.moveTo(-12,7);g.lineTo(12,-7);g.stroke(); }
    else if (type === "confetti") { g.rotate(.5);g.fillRect(-10,-6,20,12);g.fillStyle="#4fc3f7";g.fillRect(-7,-4,7,8); }
    else if (type === "cereal") { g.beginPath();g.arc(0,0,10,0,Math.PI*2);g.fill();g.fillStyle="#6b5324";g.beginPath();g.arc(0,0,4,0,Math.PI*2);g.fill(); }
    else if (type === "crumb") { g.beginPath();g.moveTo(-10,8);g.lineTo(-7,-7);g.lineTo(8,-9);g.lineTo(11,6);g.closePath();g.fill();g.stroke(); }
    else { g.beginPath();g.arc(-5,1,7,0,Math.PI*2);g.arc(5,0,8,0,Math.PI*2);g.fill(); }
    scene.textures.addCanvas(key,c);
  }
}
