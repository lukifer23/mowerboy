export const HEIGHT_CUT = 0;
export const HEIGHT_SHORT = 1;
export const HEIGHT_MED = 2;
export const HEIGHT_TALL = 3;
export const HEIGHT_WILD = 4;

export function stripeBin(heading: number): number {
  const tau = Math.PI * 2;
  let a = heading % tau;
  if (a < 0) a += tau;
  return Math.round((a / tau) * 8) % 8;
}

export function cutWithDeck(
  height: Uint8Array,
  headingArr: Uint8Array,
  cols: number,
  rows: number,
  cellSize: number,
  mx: number,
  my: number,
  heading: number,
  deckW: number,
  deckL: number,
  deckOffset: number,
  mulch: boolean
): number {
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  const cx = mx + cos * deckOffset;
  const cy = my + sin * deckOffset;
  const hw = deckW * 0.5;
  const hl = deckL * 0.5;
  const reach = Math.hypot(hw, hl) + cellSize;
  const minC = Math.max(0, Math.floor((cx - reach) / cellSize));
  const maxC = Math.min(cols - 1, Math.floor((cx + reach) / cellSize));
  const minR = Math.max(0, Math.floor((cy - reach) / cellSize));
  const maxR = Math.min(rows - 1, Math.floor((cy + reach) / cellSize));
  const bin = stripeBin(heading);
  let cut = 0;
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      const i = r * cols + c;
      const h = height[i];
      if (h === 255 || h === HEIGHT_CUT) continue;
      if (!mulch && h === HEIGHT_CUT) continue;
      const px = (c + 0.5) * cellSize;
      const py = (r + 0.5) * cellSize;
      const dx = px - cx;
      const dy = py - cy;
      const lx = dx * cos + dy * sin;
      const ly = -dx * sin + dy * cos;
      if (Math.abs(lx) <= hl && Math.abs(ly) <= hw) {
        height[i] = HEIGHT_CUT;
        headingArr[i] = bin;
        cut++;
      }
    }
  }
  return cut;
}

export function mowableCount(height: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < height.length; i++) if (height[i] !== 255) n++;
  return n;
}

export function cutCount(height: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < height.length; i++) if (height[i] === HEIGHT_CUT) n++;
  return n;
}

export function completion(height: Uint8Array): number {
  const m = mowableCount(height);
  if (m === 0) return 1;
  return cutCount(height) / m;
}

export function growRandom(
  height: Uint8Array,
  count: number,
  rng: () => number,
  maxHeight = HEIGHT_TALL
): { grown: number; indices: number[]; becameUncut: number } {
  if (count <= 0) return { grown: 0, indices: [], becameUncut: 0 };
  let grown = 0;
  let becameUncut = 0;
  const changed = new Set<number>();
  const len = height.length;
  for (let k = 0; k < count * 4 && grown < count; k++) {
    const i = (rng() * len) | 0;
    const h = height[i];
    if (h === 255) continue;
    if (h < maxHeight) {
      height[i] = (h + 1) as number;
      grown++;
      changed.add(i);
      if (h === HEIGHT_CUT) becameUncut++;
    }
  }
  return { grown, indices: [...changed], becameUncut };
}

export function remainingCells(height: Uint8Array, cols: number): { c: number; r: number }[] {
  const out: { c: number; r: number }[] = [];
  for (let i = 0; i < height.length; i++) {
    if (height[i] !== 255 && height[i] !== HEIGHT_CUT) {
      out.push({ c: i % cols, r: (i / cols) | 0 });
    }
  }
  return out;
}

export function cutRemainingSlice(
  height: Uint8Array,
  start: number,
  maxCuts: number
): { indices: number[]; next: number; exhausted: boolean } {
  const indices: number[] = [];
  if (height.length === 0 || maxCuts <= 0) return { indices, next: 0, exhausted: height.length === 0 };
  let next = ((start % height.length) + height.length) % height.length;
  let scanned = 0;
  while (scanned < height.length && indices.length < maxCuts) {
    const i = next;
    next = (next + 1) % height.length;
    scanned++;
    if (height[i] === 255 || height[i] === HEIGHT_CUT) continue;
    height[i] = HEIGHT_CUT;
    indices.push(i);
  }
  return { indices, next, exhausted: scanned === height.length && indices.length < maxCuts };
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
