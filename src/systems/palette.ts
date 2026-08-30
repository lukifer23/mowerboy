import type { TerrainId } from "../data/levels";

export interface TerrainPalette {
  wild: [number, number, number];
  tall: [number, number, number];
  med: [number, number, number];
  short: [number, number, number];
  cutA: [number, number, number];
  cutB: [number, number, number];
  dirt: [number, number, number];
  edge: [number, number, number];
}

export const PALETTES: Record<TerrainId, TerrainPalette> = {
  lush: {
    wild: [28, 92, 36],
    tall: [46, 130, 48],
    med: [62, 152, 58],
    short: [92, 176, 70],
    cutA: [82, 164, 68],
    cutB: [68, 150, 58],
    dirt: [92, 70, 42],
    edge: [58, 46, 28],
  },
  dry: {
    wild: [86, 110, 40],
    tall: [110, 132, 48],
    med: [132, 148, 58],
    short: [150, 164, 72],
    cutA: [152, 164, 78],
    cutB: [138, 150, 68],
    dirt: [120, 92, 54],
    edge: [78, 58, 32],
  },
  wet: {
    wild: [18, 72, 48],
    tall: [28, 102, 62],
    med: [36, 122, 74],
    short: [48, 142, 86],
    cutA: [58, 146, 92],
    cutB: [46, 130, 80],
    dirt: [64, 58, 42],
    edge: [36, 40, 28],
  },
  autumn: {
    wild: [92, 78, 28],
    tall: [130, 110, 36],
    med: [156, 124, 42],
    short: [176, 140, 52],
    cutA: [170, 142, 64],
    cutB: [150, 122, 50],
    dirt: [96, 64, 36],
    edge: [62, 40, 22],
  },
  farm: {
    wild: [48, 96, 32],
    tall: [70, 122, 42],
    med: [92, 140, 52],
    short: [114, 156, 64],
    cutA: [132, 162, 76],
    cutB: [116, 146, 64],
    dirt: [140, 108, 64],
    edge: [90, 68, 38],
  },
  turf: {
    wild: [22, 98, 46],
    tall: [34, 128, 58],
    med: [46, 148, 68],
    short: [64, 168, 80],
    cutA: [78, 168, 82],
    cutB: [50, 138, 68],
    dirt: [72, 92, 48],
    edge: [40, 56, 32],
  },
  night: {
    wild: [16, 48, 28],
    tall: [24, 68, 38],
    med: [32, 86, 48],
    short: [44, 102, 58],
    cutA: [58, 118, 68],
    cutB: [40, 96, 54],
    dirt: [32, 30, 24],
    edge: [18, 20, 16],
  },
};

export const HIGH_CONTRAST: TerrainPalette = {
  wild: [8, 64, 16],
  tall: [16, 110, 24],
  med: [36, 150, 40],
  short: [80, 200, 60],
  cutA: [210, 240, 120],
  cutB: [160, 200, 70],
  dirt: [70, 50, 30],
  edge: [20, 16, 10],
};

export function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    (a[0] + (b[0] - a[0]) * t) | 0,
    (a[1] + (b[1] - a[1]) * t) | 0,
    (a[2] + (b[2] - a[2]) * t) | 0,
  ];
}
