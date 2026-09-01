import { describe, expect, it } from "vitest";
import { monotonicElapsedSeconds } from "./helperTiming";

describe("Finish helper timing", () => {
  it("accounts for full wall time across a slow rendered frame", () => {
    expect(monotonicElapsedSeconds(1_000, 9_000)).toBe(8);
  });

  it("never moves backward if a clock sample is invalid or earlier", () => {
    expect(monotonicElapsedSeconds(2_000, 1_000)).toBe(0);
    expect(monotonicElapsedSeconds(Number.NaN, 1_000)).toBe(0);
  });
});
