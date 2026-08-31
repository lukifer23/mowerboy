import { resolveCircleObstacle, type ShapeObstacle } from "./worldGeometry";

export interface DrivePose {
  x: number;
  y: number;
  heading: number;
  speed: number;
}

export interface DriveCommand { throttle: number }
export interface MachinePhysics { topSpeed: number; accel: number; brake: number }
export interface DriveWorld {
  width: number;
  height: number;
  radius: number;
  pad: number;
  obstacles: readonly ShapeObstacle[];
}

/** Advance velocity and return an unresolved candidate without mutating current. */
export function stepDrivePose(current: DrivePose, command: DriveCommand, physics: MachinePhysics, dt: number): DrivePose {
  const elapsed = Math.max(0, dt);
  const throttle = Math.max(0, Math.min(1, command.throttle));
  const topSpeed = Math.max(0, physics.topSpeed);
  const desired = throttle * topSpeed;
  const rate = (desired > current.speed ? physics.accel : physics.brake) * topSpeed;
  const speed = desired > current.speed
    ? Math.min(desired, current.speed + rate * elapsed)
    : Math.max(desired, current.speed - rate * elapsed);
  return {
    x: current.x + Math.cos(current.heading) * speed * elapsed,
    y: current.y + Math.sin(current.heading) * speed * elapsed,
    heading: current.heading,
    speed,
  };
}

/** Sweep short segments so a fast frame cannot skip a thin obstacle. */
export function resolveDrivePose(current: DrivePose, candidate: DrivePose, world: DriveWorld): DrivePose {
  const dx = candidate.x - current.x;
  const dy = candidate.y - current.y;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(2, world.radius * 0.4)));
  const min = Math.max(0, world.pad);
  const maxX = Math.max(min, world.width - world.pad);
  const maxY = Math.max(min, world.height - world.pad);
  let x = current.x;
  let y = current.y;
  for (let step = 0; step < steps; step++) {
    x += dx / steps;
    y += dy / steps;
    for (const obstacle of world.obstacles) {
      const resolved = resolveCircleObstacle(x, y, world.radius, obstacle);
      x = resolved.x;
      y = resolved.y;
    }
    x = Math.max(min, Math.min(maxX, x));
    y = Math.max(min, Math.min(maxY, y));
  }
  return { ...candidate, x, y };
}

export function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function assistedThrottle(distance: number, angleError: number): number {
  if (distance < 30) return 0;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const distanceEase = clamp((distance - 24) / 110, 0.22, 1);
  const turnT = clamp(Math.abs(angleError) / Math.PI, 0, 1);
  const turnEase = 1 + (0.3 - 1) * turnT;
  return clamp(distanceEase * turnEase, 0.2, 1);
}
