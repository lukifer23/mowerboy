export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type ViewportMode = "phone-portrait" | "phone-landscape" | "tablet" | "wide";

export interface ViewportMetrics {
  width: number;
  height: number;
  aspect: number;
  mode: ViewportMode;
  compact: boolean;
  landscape: boolean;
  safe: SafeInsets;
  button: number;
  gap: number;
}

export interface HudLayout {
  size: number;
  y: number;
  secondaryY: number;
  progressX: number;
  progressY: number;
  homeX: number;
  pauseX: number;
  muteX: number;
  finishX: number;
  playableRect: Rect;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraComposition {
  zoom: number;
  coverZoom: number;
  targetMachineCss: number;
}

const ZERO_INSETS: SafeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export function viewportMetrics(width: number, height: number, safe: SafeInsets = ZERO_INSETS): ViewportMetrics {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const landscape = w > h;
  let mode: ViewportMode;
  if (w <= 540 && !landscape) mode = "phone-portrait";
  else if (h <= 540 && landscape) mode = "phone-landscape";
  else if (w < 1100) mode = "tablet";
  else mode = "wide";
  const compact = mode === "phone-portrait" || mode === "phone-landscape";
  return { width: w, height: h, aspect: w / h, mode, compact, landscape, safe, button: compact ? 80 : 88, gap: compact ? 8 : 16 };
}

export function playHudLayout(v: ViewportMetrics): HudLayout {
  const size = Math.min(v.button, Math.max(76, (v.width - v.safe.left - v.safe.right - 24) / 4.35));
  const radius = size / 2;
  const edge = Math.max(8, v.compact ? 8 : 12);
  const left = v.safe.left + edge + radius;
  const right = v.width - v.safe.right - edge - radius;
  // BigButton labels sit below their circles; reserve enough vertical air so
  // the second row never covers the first row's word or picture.
  const innerGap = Math.max(v.gap, 28);
  const y = v.safe.top + edge + radius;
  const secondaryY = y + size + innerGap;
  const progressY = v.safe.top + edge + 28;
  const playLeft = left + radius + innerGap;
  const playRight = right - radius - innerGap;
  const playTop = v.safe.top + edge;
  const playBottom = v.height - v.safe.bottom - edge;
  return {
    size, y, secondaryY, progressX: v.width / 2, progressY,
    homeX: left, pauseX: left, muteX: right, finishX: right,
    playableRect: {
      x: playLeft,
      y: playTop,
      width: Math.max(1, playRight - playLeft),
      height: Math.max(1, playBottom - playTop),
    },
  };
}

/** Stable camera scale based on world coverage and machine readability. */
export function composeCamera(
  v: ViewportMetrics,
  worldWidth: number,
  worldHeight: number,
  machineLongAxis: number,
  placeScale = 1
): CameraComposition {
  const coverZoom = Math.max(v.width / Math.max(1, worldWidth), v.height / Math.max(1, worldHeight)) * 1.01;
  const targetMachineCss = v.compact ? 92 : 112;
  const machineZoom = targetMachineCss / Math.max(1, machineLongAxis);
  return {
    coverZoom,
    targetMachineCss,
    zoom: Math.min(1.45, Math.max(0.38, coverZoom, machineZoom * placeScale)),
  };
}
