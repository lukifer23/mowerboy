import type { LevelDef } from "../data/levels";
import { parseMap } from "../data/levels";
import { HEIGHT_CUT, HEIGHT_MED, HEIGHT_TALL, HEIGHT_WILD } from "./grassMath";
import type { PowerupId } from "../data/powerups";
import { POWERUPS } from "../data/powerups";
import { containsObstaclePoint, type CollisionShape } from "./worldGeometry";

export type PropKind =
  | "tree" | "pine" | "flower" | "rock" | "pond" | "fence" | "hedge"
  | "house" | "shed" | "barn" | "bridge" | "equipment" | "bed" | "hay" | "bench" | "goal";

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  r: number;
  width?: number;
  height?: number;
  rotation?: number;
  seed?: number;
  shape?: CollisionShape;
  collisionW?: number;
  collisionH?: number;
}

export interface PickupSpot {
  x: number;
  y: number;
  id: PowerupId;
}

export interface Layout {
  cols: number;
  rows: number;
  cellSize: number;
  height: Uint8Array;
  heading: Uint8Array;
  props: Prop[];
  pickups: PickupSpot[];
  startX: number;
  startY: number;
  worldW: number;
  worldH: number;
}

// A source-map tile remains about 144 world units, but the finer grass grid
// makes curved deck passes and cut edges read smoothly at tablet zoom.
export const CELL = 7;
export const MAP_SCALE = 21;

export function buildLayout(level: LevelDef, seed = 1): Layout {
  const source = parseMap(level.map);
  const sourceH = source.length;
  const sourceW = Math.max(...source.map((r) => r.length));
  const cols = sourceW * MAP_SCALE;
  const rows = sourceH * MAP_SCALE;
  const height = new Uint8Array(cols * rows);
  const heading = new Uint8Array(cols * rows);
  const props: Prop[] = [];
  const pickups: PickupSpot[] = [];
  let startX = (cols * CELL) / 2;
  let startY = (rows * CELL) / 2;
  let powerIndex = 0;

  const charAt = (c: number, r: number) => source[r]?.padEnd(sourceW, "#")[c] ?? "#";
  const at = (c: number, r: number) => r * cols + c;
  const fillBlock = (sourceC: number, sourceR: number, value: number, material = 0) => {
    for (let dy = 0; dy < MAP_SCALE; dy++) {
      for (let dx = 0; dx < MAP_SCALE; dx++) {
        const i = at(sourceC * MAP_SCALE + dx, sourceR * MAP_SCALE + dy);
        height[i] = value;
        heading[i] = material;
      }
    }
  };

  for (let r = 0; r < sourceH; r++) {
    for (let c = 0; c < sourceW; c++) {
      const ch = charAt(c, r);
      const x = (c * MAP_SCALE + MAP_SCALE / 2) * CELL;
      const y = (r * MAP_SCALE + MAP_SCALE / 2) * CELL;
      switch (ch) {
        case "#":
          fillBlock(c, r, 255);
          break;
        case "D":
        case "=":
          // Painted as a connected, rounded path after the source pass. Starting
          // with grass keeps diagonal turns from retaining square tile corners.
          fillBlock(c, r, HEIGHT_TALL);
          break;
        case "H":
          fillBlock(c, r, 255, 253);
          break;
        case "F":
        case "B":
        case "O":
          fillBlock(c, r, HEIGHT_TALL);
          break;
        case "T":
          fillBlock(c, r, HEIGHT_TALL);
          props.push({ kind: "tree", x, y, r: 30, width: 220, height: 220, shape: "circle", seed: seed + c * 7 + r * 13 });
          break;
        case "I":
          fillBlock(c, r, HEIGHT_TALL);
          props.push({ kind: "pine", x, y, r: 28, width: 178, height: 210, shape: "circle", seed: seed + c * 11 + r * 17 });
          break;
        case "G":
          fillBlock(c, r, 255, 252);
          props.push({ kind: "hedge", x, y, r: 22, width: CELL * MAP_SCALE * .96, height: 74, collisionW: CELL * MAP_SCALE * .86, collisionH: 48, shape: "rect", seed: seed + c * 29 + r * 7 });
          break;
        case "K":
          fillBlock(c, r, 255, 252);
          props.push({ kind: "shed", x, y, r: 38, width: 162, height: 150, collisionW: 128, collisionH: 112, shape: "rect", seed: seed + c * 31 + r * 13 });
          break;
        case "A":
          fillBlock(c, r, 255, 252);
          props.push({ kind: "barn", x, y, r: 48, width: 220, height: 204, collisionW: 176, collisionH: 150, shape: "rect", seed: seed + c * 37 + r * 19 });
          break;
        case "C":
          fillBlock(c, r, 255, 251);
          props.push({ kind: "bridge", x, y, r: 30, width: CELL * MAP_SCALE * 1.05, height: 86, collisionW: CELL * MAP_SCALE * .9, collisionH: 62, shape: "rect", seed: seed + c * 41 + r * 23 });
          break;
        case "E":
          fillBlock(c, r, HEIGHT_TALL);
          props.push({ kind: "equipment", x, y, r: 28, width: 118, height: 92, collisionW: 96, collisionH: 68, shape: "rect", seed: seed + c * 43 + r * 29 });
          break;
        case "R":
          fillBlock(c, r, HEIGHT_TALL);
          props.push({ kind: "rock", x, y, r: 20, width: 54, height: 46, shape: "circle", seed: seed + c + r });
          break;
        case "Y":
          fillBlock(c, r, HEIGHT_TALL);
          props.push({ kind: "hay", x, y, r: 30, width: 108, height: 92, collisionW: 86, collisionH: 66, shape: "ellipse", seed: seed + c * 23 + r });
          break;
        case "L":
          fillBlock(c, r, HEIGHT_TALL);
          props.push({ kind: "bench", x, y, r: 26, width: 118, height: 58, collisionW: 100, collisionH: 36, shape: "rect", seed: seed + c + r * 29 });
          break;
        case "Q":
          fillBlock(c, r, HEIGHT_TALL);
          props.push({ kind: "goal", x, y, r: 26, width: 132, height: 82, collisionW: 112, collisionH: 28, shape: "rect", seed: seed + c * 47 + r * 31 });
          break;
        case "w":
          fillBlock(c, r, HEIGHT_WILD);
          break;
        case ",":
          fillBlock(c, r, HEIGHT_MED);
          break;
        case "_":
          fillBlock(c, r, HEIGHT_CUT);
          break;
        case "S":
          fillBlock(c, r, HEIGHT_TALL);
          startX = x;
          startY = y;
          break;
        case "P":
          fillBlock(c, r, HEIGHT_TALL);
          pickups.push({ x, y, id: POWERUPS[powerIndex++ % POWERUPS.length].id });
          break;
        default:
          fillBlock(c, r, HEIGHT_TALL);
      }
    }
  }

  paintRoundedPaths(source, sourceW, sourceH, height, heading, cols, rows);
  addBoundaryFences(sourceW, sourceH, seed, props);
  addInternalFences(source, sourceW, sourceH, seed, props);
  addGroupedFeatures(source, sourceW, sourceH, seed, props);
  maskPropFootprints(height, heading, cols, rows, props);

  if (pickups.length === 0) {
    const candidates: { x: number; y: number }[] = [];
    for (let r = 4; r < rows - 4; r += 2) {
      for (let c = 4; c < cols - 4; c += 2) {
        if (height[at(c, r)] !== 255 && height[at(c, r)] !== HEIGHT_CUT) {
          candidates.push({ x: (c + 0.5) * CELL, y: (r + 0.5) * CELL });
        }
      }
    }
    const n = Math.min(6, Math.max(3, (candidates.length / 120) | 0));
    for (let k = 0; k < n && candidates.length; k++) {
      const idx = Math.abs((seed * 17 + k * 97) % candidates.length);
      const p = candidates.splice(idx, 1)[0];
      pickups.push({ x: p.x, y: p.y, id: POWERUPS[(seed + k) % POWERUPS.length].id });
    }
  }

  return {
    cols,
    rows,
    cellSize: CELL,
    height,
    heading,
    props,
    pickups,
    startX,
    startY,
    worldW: cols * CELL,
    worldH: rows * CELL,
  };
}

function paintRoundedPaths(
  source: string[],
  sourceW: number,
  sourceH: number,
  height: Uint8Array,
  heading: Uint8Array,
  cols: number,
  rows: number
): void {
  const unit = CELL * MAP_SCALE;
  const radius = unit * 0.53;
  const pathCells: { c: number; r: number; x: number; y: number }[] = [];
  const isPath = (c: number, r: number) => {
    const ch = source[r]?.padEnd(sourceW, "#")[c];
    return ch === "D" || ch === "=";
  };
  for (let r = 0; r < sourceH; r++) {
    for (let c = 0; c < sourceW; c++) {
      if (isPath(c, r)) pathCells.push({ c, r, x: (c + 0.5) * unit, y: (r + 0.5) * unit });
    }
  }
  const segments: { ax: number; ay: number; bx: number; by: number }[] = [];
  for (const cell of pathCells) {
    for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [-1, 1]] as const) {
      if (!isPath(cell.c + dc, cell.r + dr)) continue;
      segments.push({ ax: cell.x, ay: cell.y, bx: cell.x + dc * unit, by: cell.y + dr * unit });
    }
  }
  const distanceToSegment = (x: number, y: number, segment: { ax: number; ay: number; bx: number; by: number }) => {
    const dx = segment.bx - segment.ax;
    const dy = segment.by - segment.ay;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((x - segment.ax) * dx + (y - segment.ay) * dy) / lengthSq)) : 0;
    return Math.hypot(x - (segment.ax + dx * t), y - (segment.ay + dy * t));
  };
  const paintBounds = (minX: number, minY: number, maxX: number, maxY: number, inside: (x: number, y: number) => boolean) => {
    const minC = Math.max(0, Math.floor(minX / CELL));
    const maxC = Math.min(cols - 1, Math.ceil(maxX / CELL));
    const minR = Math.max(0, Math.floor(minY / CELL));
    const maxR = Math.min(rows - 1, Math.ceil(maxY / CELL));
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const x = (c + 0.5) * CELL;
        const y = (r + 0.5) * CELL;
        if (!inside(x, y)) continue;
        const i = r * cols + c;
        height[i] = 255;
        heading[i] = 254;
      }
    }
  };
  for (const cell of pathCells) {
    paintBounds(cell.x - radius, cell.y - radius, cell.x + radius, cell.y + radius,
      (x, y) => Math.hypot(x - cell.x, y - cell.y) <= radius);
  }
  const linkRadius = radius * 0.78;
  for (const segment of segments) {
    paintBounds(
      Math.min(segment.ax, segment.bx) - linkRadius,
      Math.min(segment.ay, segment.by) - linkRadius,
      Math.max(segment.ax, segment.bx) + linkRadius,
      Math.max(segment.ay, segment.by) + linkRadius,
      (x, y) => distanceToSegment(x, y, segment) <= linkRadius
    );
  }
}

function addBoundaryFences(sourceW: number, sourceH: number, seed: number, props: Prop[]): void {
  const unit = CELL * MAP_SCALE;
  const maxTiles = 3;
  const addRuns = (length: number, horizontal: boolean, edge: number, seedOffset: number) => {
    for (let start = 0; start < length; start += maxTiles) {
      const tiles = Math.min(maxTiles, length - start);
      const along = (start + tiles / 2) * unit;
      props.push({
        kind: "fence",
        x: horizontal ? along : edge,
        y: horizontal ? edge : along,
        r: CELL,
        width: tiles * unit + 5,
        height: 38,
        collisionW: tiles * unit + 5,
        collisionH: 18,
        shape: "rect",
        rotation: horizontal ? 0 : Math.PI / 2,
        seed: seed + seedOffset + start,
      });
    }
  };
  addRuns(sourceW, true, unit / 2, 0);
  addRuns(sourceW, true, (sourceH - 0.5) * unit, 1000);
  addRuns(Math.max(0, sourceH - 2), false, unit / 2, 2000);
  addRuns(Math.max(0, sourceH - 2), false, (sourceW - 0.5) * unit, 3000);
}

function addInternalFences(source: string[], sourceW: number, sourceH: number, seed: number, props: Prop[]): void {
  const unit = CELL * MAP_SCALE;
  const visited = new Set<string>();
  const at = (c: number, r: number) => source[r]?.padEnd(sourceW, "#")[c] ?? "#";
  for (let r = 1; r < sourceH - 1; r++) {
    for (let c = 1; c < sourceW - 1; c++) {
      if (at(c, r) !== "#" || visited.has(`${c},${r}`)) continue;
      const vertical = at(c, r - 1) === "#" || at(c, r + 1) === "#";
      const horizontal = !vertical && (at(c - 1, r) === "#" || at(c + 1, r) === "#");
      const cells: { c: number; r: number }[] = [];
      let nc = c, nr = r;
      while (nc > 0 && nr > 0 && nc < sourceW - 1 && nr < sourceH - 1 && at(nc, nr) === "#" && !visited.has(`${nc},${nr}`)) {
        visited.add(`${nc},${nr}`);
        cells.push({ c: nc, r: nr });
        if (vertical) nr++;
        else if (horizontal) nc++;
        else break;
      }
      for (let start = 0; start < cells.length; start += 3) {
        const part = cells.slice(start, start + 3);
        const first = part[0], last = part.at(-1)!;
        props.push({
          kind: "fence",
          x: ((first.c + last.c) / 2 + 0.5) * unit,
          y: ((first.r + last.r) / 2 + 0.5) * unit,
          r: CELL,
          width: part.length * unit + 5,
          height: 38,
          collisionW: part.length * unit + 5,
          collisionH: 18,
          shape: "rect",
          rotation: vertical ? Math.PI / 2 : 0,
          seed: seed + 4000 + first.c * 31 + first.r * 43,
        });
      }
    }
  }
}

function addGroupedFeatures(source: string[], sourceW: number, sourceH: number, seed: number, props: Prop[]): void {
  const visited = new Set<string>();
  const grouped = new Set(["H", "F", "B", "O"]);
  const charAt = (c: number, r: number) => source[r]?.padEnd(sourceW, "#")[c] ?? "#";

  for (let r = 0; r < sourceH; r++) {
    for (let c = 0; c < sourceW; c++) {
      const ch = charAt(c, r);
      const key = `${c},${r}`;
      if (!grouped.has(ch) || visited.has(key)) continue;
      const stack = [{ c, r }];
      const cells: { c: number; r: number }[] = [];
      visited.add(key);
      while (stack.length) {
        const cur = stack.pop()!;
        cells.push(cur);
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nc = cur.c + dc;
          const nr = cur.r + dr;
          const nextKey = `${nc},${nr}`;
          if (nc < 0 || nr < 0 || nc >= sourceW || nr >= sourceH || visited.has(nextKey)) continue;
          if (charAt(nc, nr) === ch) {
            visited.add(nextKey);
            stack.push({ c: nc, r: nr });
          }
        }
      }
      const minC = Math.min(...cells.map((v) => v.c));
      const maxC = Math.max(...cells.map((v) => v.c));
      const minR = Math.min(...cells.map((v) => v.r));
      const maxR = Math.max(...cells.map((v) => v.r));
      const unit = CELL * MAP_SCALE;
      const width = (maxC - minC + 1) * unit;
      const height = (maxR - minR + 1) * unit;
      const x = (minC + (maxC - minC + 1) / 2) * unit;
      const y = (minR + (maxR - minR + 1) / 2) * unit;
      const kind: PropKind = ch === "H" ? "house" : ch === "O" ? "pond" : ch === "B" ? "bed" : "flower";
      props.push({
        kind,
        x,
        y,
        r: Math.max(22, Math.min(width, height) * 0.38),
        width: Math.max(unit * 0.8, width * 0.92),
        height: Math.max(unit * 0.8, height * 0.92),
        collisionW: Math.max(unit * 0.68, width * (kind === "house" ? 0.84 : 0.78)),
        collisionH: Math.max(unit * 0.68, height * (kind === "house" ? 0.78 : 0.72)),
        shape: kind === "house" ? "rect" : "ellipse",
        seed: seed + minC * 19 + minR * 31,
      });
    }
  }
}

function maskPropFootprints(
  height: Uint8Array,
  heading: Uint8Array,
  cols: number,
  rows: number,
  props: Prop[]
): void {
  for (const prop of props) {
    if (prop.kind === "fence" || prop.kind === "hedge" || prop.kind === "house" || prop.kind === "shed" || prop.kind === "barn" || prop.kind === "bridge") continue;
    const reachX = Math.max(prop.r, (prop.collisionW ?? prop.width ?? prop.r * 2) / 2) + CELL;
    const reachY = Math.max(prop.r, (prop.collisionH ?? prop.height ?? prop.r * 2) / 2) + CELL;
    const minC = Math.max(0, Math.floor((prop.x - reachX) / CELL));
    const maxC = Math.min(cols - 1, Math.ceil((prop.x + reachX) / CELL));
    const minR = Math.max(0, Math.floor((prop.y - reachY) / CELL));
    const maxR = Math.min(rows - 1, Math.ceil((prop.y + reachY) / CELL));
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const x = (c + 0.5) * CELL;
        const y = (r + 0.5) * CELL;
        if (!containsObstaclePoint(prop, x, y)) continue;
        const i = r * cols + c;
        height[i] = 255;
        heading[i] = prop.kind === "pond" ? 251 : 252;
      }
    }
  }
}
