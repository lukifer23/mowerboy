import { describe, expect, it } from "vitest";
import { resolveDrivePose, stepDrivePose, type DrivePose } from "./driveMath";
import type { ShapeObstacle } from "./worldGeometry";

const start: DrivePose = { x: 20, y: 100, heading: 0, speed: 0 };

describe("drive pose stepping", () => {
  it("preserves acceleration and braking feel without mutating the current pose", () => {
    const moving = stepDrivePose(start, { throttle: 1 }, { topSpeed: 200, accel: 0.5, brake: 0.8 }, 0.5);
    expect(moving).toEqual({ x: 45, y: 100, heading: 0, speed: 50 });
    expect(start).toEqual({ x: 20, y: 100, heading: 0, speed: 0 });
    expect(stepDrivePose(moving, { throttle: 0 }, { topSpeed: 200, accel: 0.5, brake: 0.8 }, 0.25).speed).toBe(10);
  });

  it.each([
    ["circle", { x: 110, y: 100, r: 18, shape: "circle" }],
    ["ellipse", { x: 110, y: 100, r: 1, collisionW: 24, collisionH: 100, shape: "ellipse" }],
    ["thin rectangle", { x: 110, y: 100, r: 1, collisionW: 8, collisionH: 150, shape: "rect" }],
    ["rotated rectangle", { x: 110, y: 100, r: 1, collisionW: 8, collisionH: 180, rotation: Math.PI / 12, shape: "rect" }],
  ] satisfies [string, ShapeObstacle][]) ("does not tunnel through a %s", (_name, obstacle) => {
    const candidate: DrivePose = { x: 220, y: 100, heading: 0, speed: 400 };
    const resolved = resolveDrivePose(start, candidate, { width: 300, height: 200, radius: 12, pad: 12, obstacles: [obstacle] });
    expect(resolved.x).toBeLessThan(110);
  });

  it("clamps to world bounds", () => {
    const candidate: DrivePose = { x: -200, y: 500, heading: Math.PI, speed: 400 };
    const resolved = resolveDrivePose(start, candidate, { width: 300, height: 200, radius: 12, pad: 24, obstacles: [] });
    expect(resolved.x).toBe(24);
    expect(resolved.y).toBe(176);
  });
});
