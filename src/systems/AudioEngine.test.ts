import { describe, expect, it } from "vitest";
import { vacuumFloorAcoustics } from "./AudioEngine";

describe("vacuum floor audio", () => {
  it("gives every floor material an explicit acoustic character", () => {
    const floors = ["carpet", "rug", "hardwood", "tile", "concrete"] as const;
    const values = floors.map(vacuumFloorAcoustics);
    expect(new Set(values.map((value) => value.cutHz)).size).toBe(5);
    expect(vacuumFloorAcoustics("tile").raspHz).toBeGreaterThan(vacuumFloorAcoustics("carpet").raspHz);
    expect(vacuumFloorAcoustics("carpet").cutGain).toBeGreaterThan(vacuumFloorAcoustics("tile").cutGain);
  });
});
