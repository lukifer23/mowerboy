import { describe, expect, it } from "vitest";
import { assistedThrottle, normalizeAngle } from "./driveMath";

describe("assisted touch steering", () => {
  it("uses the shortest signed turn", () => {
    expect(normalizeAngle(Math.PI * 1.5)).toBeCloseTo(-Math.PI / 2);
    expect(normalizeAngle(-Math.PI * 1.5)).toBeCloseTo(Math.PI / 2);
  });

  it("stops at the finger and slows for sharp turns", () => {
    expect(assistedThrottle(20, 0)).toBe(0);
    expect(assistedThrottle(160, Math.PI)).toBeLessThan(assistedThrottle(160, 0));
    expect(assistedThrottle(160, 0)).toBeCloseTo(1);
  });
});
