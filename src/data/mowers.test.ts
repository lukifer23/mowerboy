import { describe, expect, it } from "vitest";
import { MOWERS, mowerById } from "./mowers";
import { LEVELS } from "./levels";
import { POWERUPS } from "./powerups";
import { wanderLevel } from "../gen/wander";

describe("content", () => {
  it("has fourteen distinct mowers and no machine gating", () => {
    expect(MOWERS).toHaveLength(14);
    const ids = new Set(MOWERS.map((m) => m.id));
    expect(ids.size).toBe(14);
    expect(MOWERS.every((m) => !("unlockAfter" in m))).toBe(true);
    expect(mowerById("nope").id).toBe("backyard");
  });

  it("gives every mower a complete mechanical rig", () => {
    for (const mower of MOWERS) {
      expect(mower.rig.spriteScale).toBeGreaterThan(0.8);
      expect(mower.rig.rearAxle).toBeLessThan(mower.rig.frontAxle);
      expect(mower.rig.rearTrack).toBeGreaterThan(0.15);
      expect(mower.rig.frontTrack).toBeGreaterThan(0.15);
      expect(mower.rig.rearWheel[0]).toBeGreaterThan(mower.rig.rearWheel[1]);
      expect(mower.rig.frontWheel[0]).toBeGreaterThan(mower.rig.frontWheel[1]);
      expect([-1, 1]).toContain(mower.rig.dischargeSide);
    }
  });

  it("has twenty authored yards plus a stable wander seed", () => {
    expect(LEVELS).toHaveLength(20);
    const a = wanderLevel(7);
    const b = wanderLevel(7);
    expect(a.map).toBe(b.map);
    expect(a.terrain).toBe(b.terrain);
    expect(wanderLevel(8).map).not.toBe(a.map);
  });

  it("has eight powerups", () => {
    expect(POWERUPS).toHaveLength(8);
  });
});
