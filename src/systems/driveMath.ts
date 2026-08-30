export function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function assistedThrottle(distance: number, angleError: number): number {
  if (distance < 30) return 0;
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const distanceEase = clamp((distance - 24) / 110, 0.22, 1);
  const turnT = clamp(Math.abs(angleError) / Math.PI, 0, 1);
  const turnEase = 1 + (0.3 - 1) * turnT;
  return clamp(distanceEase * turnEase, 0.2, 1);
}
