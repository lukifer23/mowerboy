export type CollisionShape = "circle" | "ellipse" | "rect";

export interface ShapeObstacle {
  x: number;
  y: number;
  r: number;
  width?: number;
  height?: number;
  collisionW?: number;
  collisionH?: number;
  rotation?: number;
  shape?: CollisionShape;
}

export function containsObstaclePoint(obstacle: ShapeObstacle, x: number, y: number): boolean {
  const shape = obstacle.shape ?? "circle";
  const local = toLocal(obstacle, x, y);
  if (shape === "circle") return Math.hypot(local.x, local.y) <= obstacle.r;
  const halfW = Math.max(1, (obstacle.collisionW ?? obstacle.width ?? obstacle.r * 2) / 2);
  const halfH = Math.max(1, (obstacle.collisionH ?? obstacle.height ?? obstacle.r * 2) / 2);
  if (shape === "rect") return Math.abs(local.x) <= halfW && Math.abs(local.y) <= halfH;
  return (local.x * local.x) / (halfW * halfW) + (local.y * local.y) / (halfH * halfH) <= 1;
}

export function resolveCircleObstacle(
  x: number,
  y: number,
  radius: number,
  obstacle: ShapeObstacle
): { x: number; y: number; collided: boolean } {
  const shape = obstacle.shape ?? "circle";
  const local = toLocal(obstacle, x, y);
  let resolvedX = local.x;
  let resolvedY = local.y;
  let collided = false;

  if (shape === "circle") {
    const min = radius + obstacle.r;
    const distance = Math.hypot(local.x, local.y);
    if (distance < min) {
      const nx = distance > 0.0001 ? local.x / distance : 1;
      const ny = distance > 0.0001 ? local.y / distance : 0;
      resolvedX = nx * min;
      resolvedY = ny * min;
      collided = true;
    }
  } else if (shape === "rect") {
    const halfW = Math.max(1, (obstacle.collisionW ?? obstacle.width ?? obstacle.r * 2) / 2) + radius;
    const halfH = Math.max(1, (obstacle.collisionH ?? obstacle.height ?? obstacle.r * 2) / 2) + radius;
    if (Math.abs(local.x) < halfW && Math.abs(local.y) < halfH) {
      const pushX = halfW - Math.abs(local.x);
      const pushY = halfH - Math.abs(local.y);
      if (pushX < pushY) resolvedX = (local.x < 0 ? -1 : 1) * halfW;
      else resolvedY = (local.y < 0 ? -1 : 1) * halfH;
      collided = true;
    }
  } else {
    const halfW = Math.max(1, (obstacle.collisionW ?? obstacle.width ?? obstacle.r * 2) / 2) + radius;
    const halfH = Math.max(1, (obstacle.collisionH ?? obstacle.height ?? obstacle.r * 2) / 2) + radius;
    const normalized = Math.hypot(local.x / halfW, local.y / halfH);
    if (normalized < 1) {
      if (normalized > 0.0001) {
        resolvedX = local.x / normalized;
        resolvedY = local.y / normalized;
      } else {
        resolvedX = halfW;
        resolvedY = 0;
      }
      collided = true;
    }
  }

  if (!collided) return { x, y, collided: false };
  const world = toWorld(obstacle, resolvedX, resolvedY);
  return { x: world.x, y: world.y, collided: true };
}

function toLocal(obstacle: ShapeObstacle, x: number, y: number): { x: number; y: number } {
  const angle = -(obstacle.rotation ?? 0);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - obstacle.x;
  const dy = y - obstacle.y;
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

function toWorld(obstacle: ShapeObstacle, x: number, y: number): { x: number; y: number } {
  const angle = obstacle.rotation ?? 0;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: obstacle.x + x * cos - y * sin, y: obstacle.y + x * sin + y * cos };
}
