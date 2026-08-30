import { describe, expect, it } from "vitest";
import { DEFAULT_SAVE, migrateForTest } from "./Save";

describe("save defaults", () => {
  it("starts with every machine open and magnet drive", () => {
    expect(DEFAULT_SAVE.version).toBe(5);
    expect("unlockedMowers" in DEFAULT_SAVE).toBe(false);
    expect("unlockAll" in DEFAULT_SAVE).toBe(false);
    expect(DEFAULT_SAVE.control).toBe("magnet");
    expect(DEFAULT_SAVE.completedYards).toEqual([]);
    expect(DEFAULT_SAVE.safeHome).toBe(true);
    expect(DEFAULT_SAVE.selectedVacuum).toBe("brightupright");
    expect(DEFAULT_SAVE.selectedRoom).toBe("living");
    expect(DEFAULT_SAVE.lastActivity).toBe("mow");
    expect(DEFAULT_SAVE.selectedYard).toEqual({ kind: "authored", id: "home" });
  });
});

describe("save migrate", () => {
  it("preserves settings, discards legacy gating, and clamps volumes", () => {
    const d = migrateForTest({
      version: 1,
      selectedMower: "storm",
      unlockedMowers: ["sprout", "backyard"],
      unlockAll: false,
      sparkles: 54,
      control: "tap",
      volumes: { master: 4, engine: -1, world: 0.5 },
    });
    expect(d.volumes.master).toBe(1);
    expect(d.volumes.engine).toBe(0);
    expect(d.selectedMower).toBe("storm");
    expect(d.control).toBe("tap");
    expect(d.version).toBe(5);
    expect("unlockedMowers" in d).toBe(false);
    expect("unlockAll" in d).toBe(false);
    expect("sparkles" in d).toBe(false);
    expect(d.selectedVacuum).toBe("brightupright");
    expect(d.cleanedRooms).toEqual([]);
  });

  it("preserves vacuum continuity when migrating version three saves", () => {
    const d = migrateForTest({
      version: 3,
      selectedVacuum: "workhorse",
      selectedRoom: "kitchen",
      cleanedRooms: ["kitchen"],
      visitedRooms: ["living", "kitchen"],
      lastActivity: "vacuum",
      seenVacuumTutorial: true,
    });
    expect(d.selectedVacuum).toBe("workhorse");
    expect(d.selectedRoom).toBe("kitchen");
    expect(d.cleanedRooms).toEqual(["kitchen"]);
    expect(d.visitedRooms).toEqual(["living", "kitchen"]);
    expect(d.lastActivity).toBe("vacuum");
    expect(d.seenVacuumTutorial).toBe(true);
  });

  it("migrates an authored yard and validates a generated-yard seed", () => {
    const authored = migrateForTest({ version: 4, visitedYards: ["farm", "home"] });
    expect(authored.selectedYard).toEqual({ kind: "authored", id: "farm" });
    const generated = migrateForTest({ version: 5, selectedYard: { kind: "wander", seed: 70000 } });
    expect(generated.selectedYard).toEqual({ kind: "wander", seed: 70000 });
    const repaired = migrateForTest({ version: 5, selectedYard: { kind: "authored", id: "missing" } });
    expect(repaired.selectedYard).toEqual({ kind: "authored", id: "home" });
  });

  it("repairs invalid IDs, removes duplicates, and returns independent defaults", () => {
    const repaired = migrateForTest({
      selectedMower: "missing-mower",
      selectedVacuum: "missing-vacuum",
      selectedRoom: "missing-room",
      completedYards: ["home", "home", "missing-yard"],
      visitedYards: ["wander", "missing-yard"],
      cleanedRooms: ["library", "library", "missing-room"],
      visitedRooms: ["living", "missing-room"],
    });
    expect(repaired.selectedMower).toBe("backyard");
    expect(repaired.selectedVacuum).toBe("brightupright");
    expect(repaired.selectedRoom).toBe("living");
    expect(repaired.completedYards).toEqual(["home"]);
    expect(repaired.visitedYards).toEqual(["wander"]);
    expect(repaired.cleanedRooms).toEqual(["library"]);
    expect(repaired.visitedRooms).toEqual(["living"]);

    const first = migrateForTest(null);
    first.volumes.master = 0;
    first.completedYards.push("home");
    const second = migrateForTest(null);
    expect(second.volumes.master).toBe(DEFAULT_SAVE.volumes.master);
    expect(second.completedYards).toEqual([]);
  });
});
