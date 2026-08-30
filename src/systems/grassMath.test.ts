import { describe, expect, it } from "vitest";
import {
  cutRemainingSlice,
  HEIGHT_CUT,
  HEIGHT_TALL,
  completion,
  cutWithDeck,
  growRandom,
  mulberry32,
  remainingCells,
  stripeBin,
} from "./grassMath";

describe("grassMath", () => {
  it("bins heading into 8 stripe directions", () => {
    expect(stripeBin(0)).toBe(0);
    expect(stripeBin(Math.PI)).toBe(4);
  });

  it("cuts a deck-shaped patch and reports completion", () => {
    const cols = 20;
    const rows = 20;
    const cell = 10;
    const height = new Uint8Array(cols * rows).fill(HEIGHT_TALL);
    const heading = new Uint8Array(cols * rows);
    const cut = cutWithDeck(height, heading, cols, rows, cell, 100, 100, 0, 40, 40, 0, false);
    expect(cut).toBeGreaterThan(8);
    expect(completion(height)).toBeGreaterThan(0);
    expect(completion(height)).toBeLessThan(1);
    const left = remainingCells(height, cols);
    expect(left.length).toBe(cols * rows - cut);
  });

  it("skips void cells (255)", () => {
    const cols = 8;
    const rows = 8;
    const height = new Uint8Array(cols * rows).fill(255);
    const heading = new Uint8Array(cols * rows);
    const cut = cutWithDeck(height, heading, cols, rows, 10, 40, 40, 0, 80, 80, 0, false);
    expect(cut).toBe(0);
    expect(completion(height)).toBe(1);
  });

  it("grows cut grass back with a seeded rng", () => {
    const height = new Uint8Array(50).fill(HEIGHT_CUT);
    const rng = mulberry32(42);
    const grown = growRandom(height, 10, rng);
    expect(grown).toBeGreaterThan(0);
    expect(height.some((h) => h > HEIGHT_CUT)).toBe(true);
    const rng2 = mulberry32(42);
    const height2 = new Uint8Array(50).fill(HEIGHT_CUT);
    growRandom(height2, 10, rng2);
    expect(Array.from(height2)).toEqual(Array.from(height));
  });

  it("cuts helper slices incrementally without touching void cells", () => {
    const height = new Uint8Array([HEIGHT_TALL, 255, HEIGHT_TALL, HEIGHT_CUT, HEIGHT_TALL]);
    const first = cutRemainingSlice(height, 0, 2);
    expect(first.indices).toEqual([0, 2]);
    expect(height[1]).toBe(255);
    const second = cutRemainingSlice(height, first.next, 2);
    expect(second.indices).toEqual([4]);
    expect(second.exhausted).toBe(true);
    expect(completion(height)).toBe(1);
  });
});
