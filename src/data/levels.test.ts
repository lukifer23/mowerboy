import { describe, expect, it } from "vitest";
import { LEVELS, parseMap } from "./levels";
import { wanderLevel } from "../gen/wander";

describe("authored yard maps", () => {
  it("keeps every yard rectangular, enclosed, valid, and single-start", () => {
    const alphabet = new Set(".w,_#TFRBOHDSPLGKIAYEC=Q");

    for (const level of LEVELS) {
      const rows = parseMap(level.map);
      const width = rows[0].length;
      expect(new Set(rows.map((row) => row.length)), `${level.id} row widths`).toEqual(new Set([width]));
      expect([...rows[0]].every((cell) => cell === "#"), `${level.id} top fence`).toBe(true);
      expect([...rows.at(-1)!].every((cell) => cell === "#"), `${level.id} bottom fence`).toBe(true);
      expect(rows.every((row) => row[0] === "#" && row.at(-1) === "#"), `${level.id} side fences`).toBe(true);
      expect([...rows.join("")].every((cell) => alphabet.has(cell)), `${level.id} map alphabet`).toBe(true);
      expect([...rows.join("")].filter((cell) => cell === "S"), `${level.id} start`).toHaveLength(1);
    }
  });

  it("keeps seeded New Yard output rectangular, enclosed, and single-start", () => {
    for (let seed = 0; seed < 32; seed++) {
      const rows = parseMap(wanderLevel(seed).map);
      const width = rows[0].length;
      expect(rows.every((row) => row.length === width), `seed ${seed} row widths`).toBe(true);
      expect(rows.every((row) => row[0] === "#" && row.at(-1) === "#"), `seed ${seed} side fences`).toBe(true);
      expect([...rows.join("")].filter((cell) => cell === "S"), `seed ${seed} start`).toHaveLength(1);
    }
  });
});
