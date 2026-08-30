import Phaser from "phaser";
import { viewportMetrics, type SafeInsets, type ViewportMetrics } from "./viewportMath";
export { composeCamera, playHudLayout, viewportMetrics } from "./viewportMath";
export type { CameraComposition, HudLayout, Rect, SafeInsets, ViewportMetrics, ViewportMode } from "./viewportMath";

export function getViewport(scene: Phaser.Scene): ViewportMetrics {
  return viewportMetrics(scene.scale.width, scene.scale.height, readSafeInsets());
}

export function bindSceneResize(scene: Phaser.Scene, relayout: () => void): void {
  let queued = false;
  const onResize = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (scene.scene.isActive()) relayout();
    });
  };
  scene.scale.on("resize", onResize);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off("resize", onResize));
}

function readSafeInsets(): SafeInsets {
  if (typeof document === "undefined") return { top: 0, right: 0, bottom: 0, left: 0 };
  const style = getComputedStyle(document.documentElement);
  return {
    top: cssPx(style.getPropertyValue("--safe-top")),
    right: cssPx(style.getPropertyValue("--safe-right")),
    bottom: cssPx(style.getPropertyValue("--safe-bottom")),
    left: cssPx(style.getPropertyValue("--safe-left")),
  };
}

function cssPx(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
