import "./style.css";
import type Phaser from "phaser";
import { createGame } from "./game";
import { audio } from "./systems/AudioEngine";
import type { ActivityDiagnostics } from "./systems/Diagnostics";
import { save } from "./systems/Save";

const parent = document.getElementById("app");
if (!parent) throw new Error("#app missing");

const game = createGame(parent);

// Read-only diagnostics for browser/device regression tests. This is only
// exposed on the explicit test routes used by Playwright and Fold CDP checks.
if (new URLSearchParams(window.location.search).get("test") === "1") {
  const snapshot = () => {
    const active = game.scene.getScenes(true);
    const scene = active.at(-1) as (Phaser.Scene & Record<string, unknown>) | undefined;
    const diagnostics = typeof scene?.diagnostics === "function"
      ? (scene.diagnostics as () => ActivityDiagnostics)()
      : null;
    const machine = (scene?.mower ?? scene?.vacuum) as
      | { x: number; y: number; heading: number; throttle: number; speed: number }
      | undefined;
    const field = (scene?.grass ?? scene?.debris) as { percent: number } | undefined;
    const locationId = typeof scene?.levelId === "string"
      ? scene.levelId
      : typeof scene?.roomId === "string"
        ? scene.roomId
        : null;
    const roomProps = scene?.room ? (scene.room as { props?: unknown[] }).props : undefined;
    const props = (scene?.props ?? roomProps ?? []) as Array<{ getData?: (key: string) => { kind?: string } }>;
    return {
      activeScenes: active.map((item) => item.scene.key),
      width: game.scale.width,
      height: game.scale.height,
      machine: machine
        ? { x: machine.x, y: machine.y, heading: machine.heading, throttle: machine.throttle, speed: machine.speed }
        : null,
      progress: field?.percent ?? null,
      locationId,
      cameraZoom: scene?.cameras?.main.zoom ?? null,
      diagnostics,
      boot: {
        phase: active.some((item) => item.scene.key === "boot") ? "loading" : "ready",
        milliseconds: performance.getEntriesByName("mowerboy-boot").at(-1)?.duration ?? null,
        recovery: diagnostics?.machine.assetMode === "fallback" ? "fallback" : "none",
      },
      selectedPlace: save().selectedYard,
      audio: audio.diagnostics(),
      resources: {
        dynamicTextures: game.textures.getTextureKeys().filter((key) => key.startsWith("grass-") || key.startsWith("room-floor-")).length,
        activeCameras: active.reduce((count, item) => count + item.cameras.cameras.length, 0),
      },
      render: {
        machineTexture: (machine && ((scene?.mower ?? scene?.vacuum) as { sprite?: { texture?: { key?: string } } }).sprite?.texture?.key) ?? null,
        propKinds: props.map((item) => item.getData?.("prop")?.kind).filter(Boolean),
      },
      ui: {
        galleryIndex: typeof scene?.index === "number" ? scene.index : null,
        scrollOffset: typeof scene?.scroll === "number" ? scene.scroll : null,
      },
      flags: {
        paused: Boolean(scene?.paused),
        tutorial: Boolean(scene?.tutLayer),
        helperOn: Boolean(scene?.helperOn),
        celebrated: Boolean(scene?.celebrated),
      },
    };
  };
  Object.defineProperty(window, "__MOWERBOY_TEST__", {
    value: Object.freeze({ snapshot }),
    configurable: true,
  });
}

let resizeFrame = 0;
const resizeGame = () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    const rect = parent.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (game.scale.width !== width || game.scale.height !== height) game.scale.resize(width, height);
  });
};
new ResizeObserver(resizeGame).observe(parent);
window.visualViewport?.addEventListener("resize", resizeGame);
window.addEventListener("orientationchange", resizeGame);
document.addEventListener("fullscreenchange", resizeGame);
document.addEventListener("webkitfullscreenchange", resizeGame);

const unlock = () => audio.unlock();
window.addEventListener("pointerdown", unlock, { once: false });
window.addEventListener("touchstart", unlock, { once: false, passive: true });
window.addEventListener("keydown", unlock, { once: false });

document.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* private mode / file protocol */
    });
  });
}
