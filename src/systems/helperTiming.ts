/** Return real monotonic elapsed seconds without trusting a renderer's smoothed delta. */
export function monotonicElapsedSeconds(previousMs: number, currentMs: number): number {
  if (!Number.isFinite(previousMs) || !Number.isFinite(currentMs)) return 0;
  return Math.max(0, currentMs - previousMs) / 1000;
}
