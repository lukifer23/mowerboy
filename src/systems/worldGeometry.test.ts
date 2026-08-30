import { describe, expect, it } from "vitest";
import { containsObstaclePoint, resolveCircleObstacle, type ShapeObstacle } from "./worldGeometry";

describe("world obstacle geometry", () => {
  it("contains points in circles and ellipses", () => {
    expect(containsObstaclePoint({ x: 50, y: 50, r: 20, shape: "circle" }, 62, 50)).toBe(true);
    expect(containsObstaclePoint({ x: 50, y: 50, r: 1, shape: "ellipse", collisionW: 80, collisionH: 30 }, 87, 50)).toBe(true);
    expect(containsObstaclePoint({ x: 50, y: 50, r: 1, shape: "ellipse", collisionW: 80, collisionH: 30 }, 50, 68)).toBe(false);
  });

  it("honors rotated rectangular fence segments", () => {
    const fence: ShapeObstacle = { x: 100, y: 100, r: 1, shape: "rect", collisionW: 120, collisionH: 16, rotation: Math.PI / 2 };
    expect(containsObstaclePoint(fence, 100, 145)).toBe(true);
    expect(containsObstaclePoint(fence, 125, 100)).toBe(false);
    const hit = resolveCircleObstacle(108, 100, 16, fence);
    expect(hit.collided).toBe(true);
    expect(Math.hypot(hit.x - 100, hit.y - 100)).toBeGreaterThan(20);
  });

  it("pushes a machine outside each obstacle shape", () => {
    const obstacles: ShapeObstacle[] = [
      { x: 0, y: 0, r: 30, shape: "circle" },
      { x: 0, y: 0, r: 1, shape: "ellipse", collisionW: 100, collisionH: 50 },
      { x: 0, y: 0, r: 1, shape: "rect", collisionW: 100, collisionH: 40 },
    ];
    for (const obstacle of obstacles) {
      const hit = resolveCircleObstacle(0, 0, 18, obstacle);
      expect(hit.collided).toBe(true);
      expect(containsObstaclePoint(obstacle, hit.x, hit.y)).toBe(false);
    }
  });
});
