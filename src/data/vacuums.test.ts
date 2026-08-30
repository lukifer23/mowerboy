import { describe, expect, it } from "vitest";
import { ROOMS } from "./rooms";
import { VACUUMS, vacuumById } from "./vacuums";

describe("vacuum content", () => {
  it("defines eight distinct, immediately available machines", () => {
    expect(VACUUMS).toHaveLength(8);
    expect(new Set(VACUUMS.map((vacuum) => vacuum.id)).size).toBe(8);
    expect(VACUUMS.every((vacuum) => !("unlockAfter" in vacuum))).toBe(true);
    expect(vacuumById("missing").id).toBe("brightupright");
  });

  it("gives every vacuum a usable intake and complete motion rig", () => {
    for (const vacuum of VACUUMS) {
      expect(vacuum.rig.intakeWidth).toBeGreaterThan(50);
      expect(vacuum.rig.intakeDepth).toBeGreaterThan(20);
      expect(vacuum.topSpeed).toBeGreaterThan(0);
      expect(vacuum.motor.airflow).toBeGreaterThan(0);
    }
  });

  it("defines twelve distinct rooms covering every floor material", () => {
    expect(ROOMS).toHaveLength(12);
    expect(new Set(ROOMS.map((room) => room.id)).size).toBe(12);
    const floors = new Set(ROOMS.flatMap((room) => room.floors));
    expect([...floors].sort()).toEqual(["carpet", "concrete", "hardwood", "rug", "tile"]);
    expect(ROOMS.every((room) => room.debris.length >= 3)).toBe(true);
    for (const room of ROOMS) {
      const portraitCoverZoom = Math.max(390 / room.width, 844 / room.height) * 1.01;
      expect(portraitCoverZoom, `${room.id} portrait cover zoom`).toBeLessThanOrEqual(0.9);
    }
  });
});
