import { describe, expect, it } from "vitest";
import { LEVELS } from "../data/levels";
import { buildLayout } from "./Layout";
import { containsObstaclePoint } from "./worldGeometry";

describe("authored yard layouts", () => {
  it.each(LEVELS.map((level) => [level.name, level] as const))("builds a large playable %s", (_name, level) => {
    const layout = buildLayout(level, 7);
    expect(layout.worldW).toBeGreaterThanOrEqual(1900);
    expect(layout.worldH).toBeGreaterThanOrEqual(700);
    expect(layout.startX).toBeGreaterThan(0);
    expect(layout.startY).toBeGreaterThan(0);
    expect(layout.height.some((value) => value !== 255)).toBe(true);
    expect(layout.height.some((value) => value === 0), `${level.id} starts already mown`).toBe(false);
  });

  it("groups the Home house into one environment object", () => {
    const layout = buildLayout(LEVELS[0], 3);
    expect(layout.props.filter((prop) => prop.kind === "house")).toHaveLength(1);
  });

  it.each(LEVELS.map((level) => [level.name, level] as const))("excludes solid prop footprints from mowable grass in %s", (_name, level) => {
    const layout = buildLayout(level, 9);
    for (const prop of layout.props) {
      const c = Math.max(0, Math.min(layout.cols - 1, Math.floor(prop.x / layout.cellSize)));
      const r = Math.max(0, Math.min(layout.rows - 1, Math.floor(prop.y / layout.cellSize)));
      expect(layout.height[r * layout.cols + c]).toBe(255);
    }
    for (const pickup of layout.pickups) {
      expect(layout.props.some((prop) => containsObstaclePoint(prop, pickup.x, pickup.y))).toBe(false);
    }
  });

  it("authors collision shapes for wide and natural obstacles", () => {
    const layout = buildLayout(LEVELS[0], 11);
    const house = layout.props.find((prop) => prop.kind === "house");
    const tree = layout.props.find((prop) => prop.kind === "tree");
    const fence = layout.props.find((prop) => prop.kind === "fence");
    expect(house?.shape).toBe("rect");
    expect(tree?.shape).toBe("circle");
    expect(fence?.shape).toBe("rect");
    expect(house?.collisionW).toBeGreaterThan(house?.collisionH ?? 0);
  });

  it("ships the expanded outdoor prop vocabulary and traversable bridge surfaces", () => {
    const layouts = LEVELS.map((level) => buildLayout(level, 13));
    const kinds = new Set(layouts.flatMap((layout) => layout.props.map((prop) => prop.kind)));
    for (const kind of ["pine", "hedge", "shed", "barn", "bridge", "equipment", "goal"]) expect(kinds.has(kind as never)).toBe(true);
    const bridgeLayout = layouts.find((layout) => layout.props.some((prop) => prop.kind === "bridge"))!;
    const bridge = bridgeLayout.props.find((prop) => prop.kind === "bridge")!;
    const c = Math.floor(bridge.x / bridgeLayout.cellSize), r = Math.floor(bridge.y / bridgeLayout.cellSize);
    expect(bridgeLayout.height[r * bridgeLayout.cols + c]).toBe(255);
    expect(bridge.shape).toBe("rect");
  });

  it("paints isolated driveways with rounded shoulders instead of square source tiles", () => {
    const layout = buildLayout({
      id: "rounded-path-test",
      name: "Rounded path test",
      terrain: "lush",
      map: `
#####
#...#
#.D.#
#.S.#
#####
`,
    }, 17);
    const unit = layout.worldW / 5;
    const center = (2.5 * unit / layout.cellSize | 0) + (2.5 * unit / layout.cellSize | 0) * layout.cols;
    const cornerC = Math.floor(2.03 * unit / layout.cellSize);
    const cornerR = Math.floor(2.03 * unit / layout.cellSize);
    expect(layout.height[center]).toBe(255);
    expect(layout.height[cornerR * layout.cols + cornerC]).not.toBe(255);
  });

  it("groups perimeter fencing into long readable runs", () => {
    const layout = buildLayout(LEVELS[0], 23);
    const fenceCount = layout.props.filter((prop) => prop.kind === "fence").length;
    const perimeterSourceTiles = 2 * (30 + 15) - 4;
    expect(fenceCount).toBeLessThan(perimeterSourceTiles / 2);
    expect(layout.props.filter((prop) => prop.kind === "fence").some((prop) => (prop.width ?? 0) > 300)).toBe(true);
  });

  it("renders authored internal lot boundaries as real fence runs", () => {
    const neighborhood = buildLayout(LEVELS.find((level) => level.id === "neighborhood")!, 29);
    const internal = neighborhood.props.filter((prop) => prop.kind === "fence" && prop.x > 200 && prop.x < neighborhood.worldW - 200 && prop.y > 200 && prop.y < neighborhood.worldH - 200);
    expect(internal.length).toBeGreaterThan(0);
    expect(internal.some((prop) => prop.rotation === Math.PI / 2)).toBe(true);
  });
});
