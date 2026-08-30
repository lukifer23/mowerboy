import { describe, expect, it } from "vitest";
import { composeCamera, playHudLayout, viewportMetrics } from "./viewportMath";

describe("responsive viewport", () => {
  const cases = [
    [375, 667],
    [390, 844],
    [667, 375],
    [832, 608], // Galaxy Z Fold 7 inner screen with Chrome UI
    [832, 749], // Galaxy Z Fold 7 inner screen in browser fullscreen
    [960, 325], // Galaxy Z Fold 7 cover-display CSS viewport with Chrome UI
    [1024, 768],
    [1366, 768],
  ] as const;

  it.each(cases)("keeps the HUD separated at %sx%s", (w, h) => {
    const v = viewportMetrics(w, h, { top: 12, right: 8, bottom: 10, left: 8 });
    const hud = playHudLayout(v);
    expect(hud.homeX).toBe(hud.pauseX);
    expect(hud.muteX).toBe(hud.finishX);
    expect(hud.secondaryY - hud.y).toBeGreaterThanOrEqual(hud.size);
    expect(hud.muteX - hud.homeX).toBeGreaterThanOrEqual(hud.size * 2);
    expect(hud.homeX - hud.size / 2).toBeGreaterThanOrEqual(v.safe.left);
    expect(hud.finishX + hud.size / 2).toBeLessThanOrEqual(w - v.safe.right);
    expect(hud.size).toBeGreaterThanOrEqual(76);
    expect(hud.playableRect.width).toBeGreaterThan(100);
    expect(hud.playableRect.height).toBeGreaterThan(250);
  });

  it("classifies portrait, landscape, tablet, and wide layouts", () => {
    expect(viewportMetrics(390, 844).mode).toBe("phone-portrait");
    expect(viewportMetrics(844, 390).mode).toBe("phone-landscape");
    expect(viewportMetrics(1024, 768).mode).toBe("tablet");
    expect(viewportMetrics(1512, 772).mode).toBe("wide");
  });

  it("keeps the objective centered above a clear playable strip", () => {
    const landscape = playHudLayout(viewportMetrics(844, 390));
    const portrait = playHudLayout(viewportMetrics(390, 844));
    expect(landscape.progressX).toBe(422);
    expect(portrait.progressX).toBe(195);
    expect(landscape.progressY).toBeLessThan(landscape.y);
    expect(portrait.progressY).toBeLessThan(portrait.y);
    expect(landscape.playableRect.x).toBeGreaterThan(landscape.homeX);
    expect(landscape.playableRect.x + landscape.playableRect.width).toBeLessThan(landscape.muteX);
  });

  it("uses a stable readable camera composition without speed-driven zoom", () => {
    const viewport = viewportMetrics(832, 608);
    const smallMachine = composeCamera(viewport, 1764, 1470, 62);
    const largeMachine = composeCamera(viewport, 1764, 1470, 110);
    expect(smallMachine.zoom).toBeGreaterThan(largeMachine.zoom);
    expect(smallMachine.zoom).toBeGreaterThanOrEqual(smallMachine.coverZoom);
    expect(largeMachine.zoom).toBeGreaterThanOrEqual(largeMachine.coverZoom);
    expect(smallMachine.zoom).toBe(1.45);
    expect(62 * smallMachine.zoom).toBeGreaterThan(88);
  });
});
