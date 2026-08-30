import Phaser from "phaser";
import type { ControlScheme } from "./Save";
import type { HudLayout, Rect } from "./Viewport";

export interface InputDiagnostics {
  scheme: ControlScheme;
  owner: "none" | "pointer" | "waypoint" | "pad";
  pointerId: number | null;
  target: { x: number; y: number } | null;
  pad: { up: boolean; down: boolean; left: boolean; right: boolean };
}

export interface ActivityDiagnostics {
  viewport: { width: number; height: number };
  playableRect: Rect;
  hud: HudLayout;
  camera: {
    zoom: number;
    worldView: Rect;
  };
  machine: {
    screenBounds: Rect;
    assetMode: "production" | "fallback";
  };
  input: InputDiagnostics;
  lifecycle: {
    cameras: number;
    textures: number;
    tweens: number;
    inputListeners: number;
    frameMs: { samples: number; p50: number; p95: number; worst: number };
  };
}

export function worldBoundsToScreen(
  bounds: Phaser.Geom.Rectangle,
  camera: Phaser.Cameras.Scene2D.Camera
): Rect {
  return {
    x: camera.x + (bounds.x - camera.worldView.x) * camera.zoom,
    y: camera.y + (bounds.y - camera.worldView.y) * camera.zoom,
    width: bounds.width * camera.zoom,
    height: bounds.height * camera.zoom,
  };
}

export function rectOf(rect: Phaser.Geom.Rectangle): Rect {
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}
