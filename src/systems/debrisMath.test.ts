import { describe, expect, it } from "vitest";
import { debrisCompletion, helperClean, scatterDebris, stepSuction } from "./debrisMath";

describe("debris field", () => {
  it("scatters deterministic real debris recipes", () => {
    const recipe = [{ type: "crumb" as const, count: 5 }, { type: "hair" as const, count: 3 }];
    const bounds = { left: 20, top: 30, right: 400, bottom: 300 };
    expect(scatterDebris(42, recipe, bounds)).toEqual(scatterDebris(42, recipe, bounds));
    expect(scatterDebris(42, recipe, bounds)).not.toEqual(scatterDebris(43, recipe, bounds));
  });

  it("forms bounded mess clusters instead of uniform visual confetti", () => {
    const bounds = { left: 20, top: 30, right: 1020, bottom: 730 };
    const particles = scatterDebris(77, [{ type: "crumb", count: 40 }], bounds);
    expect(particles.every((p) => p.x >= bounds.left && p.x <= bounds.right && p.y >= bounds.top && p.y <= bounds.bottom)).toBe(true);
    const nearest = particles.map((p, index) => Math.min(...particles.filter((_other, otherIndex) => otherIndex !== index).map((other) => Math.hypot(p.x - other.x, p.y - other.y))));
    expect(nearest.reduce((sum, value) => sum + value, 0) / nearest.length).toBeLessThan(60);
  });

  it("pulls nearby debris and cleans only inside the intake", () => {
    const source = scatterDebris(5, [{ type: "crumb", count: 1 }], { left: 100, top: 100, right: 100, bottom: 100 });
    const result = stepSuction(source, { x: 60, y: 100, heading: 0, intakeWidth: 70, intakeDepth: 34, intakeOffset: 40, power: 1 }, 1);
    expect(result.cleaned).toBeGreaterThan(0);
    expect(result.particles[0].removed).toBe(true);
    expect(result.impacts).toEqual(["crumb"]);
    expect(debrisCompletion(result.particles)).toBe(1);
  });

  it("lets the helper finish without penalties or capacity limits", () => {
    const source = scatterDebris(9, [{ type: "leaf", count: 5 }], { left: 0, top: 0, right: 200, bottom: 200 });
    const first = helperClean(source, 0, 3);
    expect(first.cleaned).toBe(3);
    const second = helperClean(first.particles, first.next, 3);
    expect(second.cleaned).toBe(2);
    expect(second.exhausted).toBe(true);
    expect(debrisCompletion(second.particles)).toBe(1);
  });
});
