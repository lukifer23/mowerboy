export type DebrisType = "dust" | "crumb" | "cereal" | "hair" | "petFur" | "leaf" | "confetti" | "dirt" | "sawdust";

export interface DebrisParticle {
  id: number;
  type: DebrisType;
  x: number;
  y: number;
  angle: number;
  amount: number;
  total: number;
  removed: boolean;
}

export interface VacuumPose {
  x: number;
  y: number;
  heading: number;
  intakeWidth: number;
  intakeDepth: number;
  intakeOffset: number;
  power: number;
}

export interface DebrisScatter {
  type: DebrisType;
  count: number;
}

const RESISTANCE: Record<DebrisType, number> = {
  dust: 0.45,
  crumb: 0.72,
  cereal: 1.15,
  hair: 1.42,
  petFur: 1.28,
  leaf: 1.34,
  confetti: 0.78,
  dirt: 0.92,
  sawdust: 0.62,
};

const SIZE: Record<DebrisType, number> = {
  dust: 0.45,
  crumb: 0.8,
  cereal: 1.2,
  hair: 1.35,
  petFur: 1.2,
  leaf: 1.5,
  confetti: 0.7,
  dirt: 0.9,
  sawdust: 0.55,
};

export function scatterDebris(
  seed: number,
  recipe: DebrisScatter[],
  bounds: { left: number; top: number; right: number; bottom: number }
): DebrisParticle[] {
  const rng = mulberry32(seed);
  const particles: DebrisParticle[] = [];
  let id = 0;
  for (const item of recipe) {
    const spanX = Math.max(0, bounds.right - bounds.left);
    const spanY = Math.max(0, bounds.bottom - bounds.top);
    const clusterCount = item.type === "dust" || item.type === "sawdust" ? 3 : item.type === "hair" || item.type === "petFur" ? 2 : 4;
    const clusters = Array.from({ length: clusterCount }, () => ({
      x: bounds.left + rng() * spanX,
      y: bounds.top + rng() * spanY,
    }));
    for (let i = 0; i < item.count; i++) {
      const amount = SIZE[item.type] * (0.82 + rng() * 0.36);
      const cluster = clusters[i % clusters.length];
      const loose = i % 7 === 0;
      const angle = rng() * Math.PI * 2;
      const radius = Math.sqrt(rng()) * Math.min(spanX, spanY) * (item.type === "dust" || item.type === "sawdust" ? 0.15 : 0.1);
      const x = loose ? bounds.left + rng() * spanX : cluster.x + Math.cos(angle) * radius;
      const y = loose ? bounds.top + rng() * spanY : cluster.y + Math.sin(angle) * radius;
      particles.push({
        id: id++,
        type: item.type,
        x: Math.max(bounds.left, Math.min(bounds.right, x)),
        y: Math.max(bounds.top, Math.min(bounds.bottom, y)),
        angle: rng() * Math.PI * 2,
        amount,
        total: amount,
        removed: false,
      });
    }
  }
  return particles;
}

export function stepSuction(
  source: DebrisParticle[],
  pose: VacuumPose,
  dt: number
): { particles: DebrisParticle[]; cleaned: number; impacts: DebrisType[] } {
  const particles = source.map((particle) => ({ ...particle }));
  const impacts: DebrisType[] = [];
  let cleaned = 0;
  const cos = Math.cos(pose.heading);
  const sin = Math.sin(pose.heading);
  const intakeX = pose.x + cos * pose.intakeOffset;
  const intakeY = pose.y + sin * pose.intakeOffset;
  const halfW = pose.intakeWidth / 2;
  const halfD = pose.intakeDepth / 2;
  const pullRadius = Math.max(pose.intakeWidth * 0.92, pose.intakeDepth * 2.3);

  for (const particle of particles) {
    if (particle.removed) continue;
    const dx = particle.x - intakeX;
    const dy = particle.y - intakeY;
    const forward = dx * cos + dy * sin;
    const side = -dx * sin + dy * cos;
    const distance = Math.hypot(forward, side);
    const resistance = RESISTANCE[particle.type];
    const inIntake = Math.abs(side) <= halfW && Math.abs(forward) <= halfD;

    if (inIntake) {
      const before = particle.amount;
      particle.amount = Math.max(0, particle.amount - (pose.power * dt * 3.4) / resistance);
      cleaned += before - particle.amount;
      particle.angle += dt * (4 + pose.power * 8) / resistance;
      if (particle.amount <= 0.001) {
        particle.amount = 0;
        particle.removed = true;
        impacts.push(particle.type);
      }
      continue;
    }

    if (distance < pullRadius && forward > -pose.intakeDepth) {
      const falloff = 1 - distance / pullRadius;
      const pull = (pose.power * falloff * falloff * dt * 150) / resistance;
      if (distance > 0.001) {
        particle.x -= (dx / distance) * pull;
        particle.y -= (dy / distance) * pull;
      }
      particle.angle += dt * falloff * (particle.type === "leaf" || particle.type === "cereal" ? 9 : 3);
    }
  }
  return { particles, cleaned, impacts };
}

export function debrisCompletion(particles: DebrisParticle[]): number {
  let total = 0;
  let remaining = 0;
  for (const particle of particles) {
    total += particle.total;
    remaining += particle.amount;
  }
  return total <= 0 ? 1 : Math.max(0, Math.min(1, 1 - remaining / total));
}

export function helperClean(
  source: DebrisParticle[],
  start: number,
  maxParticles: number
): { particles: DebrisParticle[]; next: number; cleaned: number; exhausted: boolean } {
  const particles = source.map((particle) => ({ ...particle }));
  if (particles.length === 0 || maxParticles <= 0) return { particles, next: 0, cleaned: 0, exhausted: particles.length === 0 };
  let next = ((start % particles.length) + particles.length) % particles.length;
  let scanned = 0;
  let cleaned = 0;
  while (scanned < particles.length && cleaned < maxParticles) {
    const particle = particles[next];
    next = (next + 1) % particles.length;
    scanned++;
    if (particle.removed) continue;
    particle.amount = 0;
    particle.removed = true;
    cleaned++;
  }
  return { particles, next, cleaned, exhausted: scanned === particles.length && cleaned < maxParticles };
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
