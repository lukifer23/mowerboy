import type { LevelDef, TerrainId } from "../data/levels";
import { mulberry32 } from "../systems/grassMath";

const TERRAINS: TerrainId[] = ["lush", "dry", "wet", "autumn", "farm", "turf"];

export function wanderLevel(seed: number): LevelDef {
  const rng = mulberry32(seed);
  const w = 28 + ((rng() * 12) | 0);
  const h = 16 + ((rng() * 8) | 0);
  const rows: string[] = [];
  const terrain = TERRAINS[(rng() * TERRAINS.length) | 0];
  const startC = (w / 2) | 0;
  const startR = (h / 2) | 0;

  for (let r = 0; r < h; r++) {
    let line = "";
    for (let c = 0; c < w; c++) {
      if (r === 0 || c === 0 || r === h - 1 || c === w - 1) {
        line += "#";
        continue;
      }
      if (c === startC && r === startR) {
        line += "S";
        continue;
      }
      const n = rng();
      if (n < 0.03) line += "T";
      else if (n < 0.05) line += "F";
      else if (n < 0.058) line += "R";
      else if (n < 0.07 && terrain !== "turf") line += "w";
      else line += ".";
    }
    rows.push(line);
  }

  const clusters = 2 + ((rng() * 3) | 0);
  for (let i = 0; i < clusters; i++) {
    const cw = 3 + ((rng() * 4) | 0);
    const ch = 2 + ((rng() * 3) | 0);
    const x = 2 + ((rng() * (w - cw - 4)) | 0);
    const y = 2 + ((rng() * (h - ch - 4)) | 0);
    const ch_ = rng() < 0.5 ? "F" : "T";
    for (let r = y; r < y + ch && r < h - 1; r++) {
      const chars = rows[r].split("");
      for (let c = x; c < x + cw && c < w - 1; c++) {
        if (chars[c] !== "S" && chars[c] !== "#") chars[c] = ch_;
      }
      rows[r] = chars.join("");
    }
  }

  return {
    id: `wander-${seed}`,
    name: "New yard",
    terrain,
    map: rows.join("\n"),
  };
}
