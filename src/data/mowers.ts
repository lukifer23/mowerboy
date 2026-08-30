export type MowerKind = "push" | "riding" | "zeroturn" | "tractor" | "commercial" | "standon" | "frontmount";

export interface EngineProfile {
  idleHz: number;
  maxHz: number;
  rumble: number;
  volume: number;
  cylinders: number;
}

export interface MowerRig {
  /** Multiplier applied to the collision-derived illustrated sprite size. */
  spriteScale: number;
  /** Axle positions and track widths, normalized to the square world sprite. */
  rearAxle: number;
  frontAxle: number;
  rearTrack: number;
  frontTrack: number;
  /** Wheel length (along travel) and width, normalized to the sprite. */
  rearWheel: [number, number];
  frontWheel: [number, number];
  /** Side that throws clippings when viewed facing right. */
  dischargeSide: -1 | 1;
  /** Exhaust outlet, normalized to the sprite; omitted for electric-looking push units. */
  exhaust?: [number, number];
}

export interface MowerDef {
  id: string;
  name: string;
  label: string;
  kind: MowerKind;
  body: string;
  accent: string;
  seat: string;
  deck: string;
  topSpeed: number;
  accel: number;
  brake: number;
  turnRate: number;
  deckWidth: number;
  deckLength: number;
  deckOffset: number;
  radius: number;
  engine: EngineProfile;
  portrait: string;
  steeringModel?: "standard" | "zero-turn" | "articulated";
  cameraZoom?: number;
  rig: MowerRig;
}

export const MOWERS: MowerDef[] = [
  {
    id: "sprout",
    name: "Sprout",
    label: "Push",
    kind: "push",
    body: "#c62828",
    accent: "#ef9a9a",
    seat: "#c62828",
    deck: "#212121",
    topSpeed: 140,
    accel: 2.4,
    brake: 3.2,
    turnRate: 4.6,
    deckWidth: 46,
    deckLength: 46,
    deckOffset: 8,
    radius: 28,
    engine: { idleHz: 38, maxHz: 72, rumble: 0.55, volume: 0.7, cylinders: 1 },
    portrait: "portrait-sprout",
    rig: { spriteScale: 0.94, rearAxle: -0.25, frontAxle: 0.2, rearTrack: 0.23, frontTrack: 0.22, rearWheel: [0.12, 0.065], frontWheel: [0.1, 0.055], dischargeSide: 1 },
  },
  {
    id: "backyard",
    name: "Backyard",
    label: "Rider",
    kind: "riding",
    body: "#2e7d32",
    accent: "#81c784",
    seat: "#f9a825",
    deck: "#1b1b1b",
    topSpeed: 190,
    accel: 2.1,
    brake: 2.6,
    turnRate: 3.4,
    deckWidth: 78,
    deckLength: 54,
    deckOffset: 18,
    radius: 36,
    engine: { idleHz: 28, maxHz: 58, rumble: 0.7, volume: 0.85, cylinders: 2 },
    portrait: "portrait-backyard",
    rig: { spriteScale: 1, rearAxle: -0.31, frontAxle: 0.29, rearTrack: 0.27, frontTrack: 0.25, rearWheel: [0.17, 0.082], frontWheel: [0.12, 0.068], dischargeSide: 1, exhaust: [0.15, -0.13] },
  },
  {
    id: "zipturn",
    name: "ZipTurn",
    label: "Zero-turn",
    kind: "zeroturn",
    body: "#ef6c00",
    accent: "#ffcc80",
    seat: "#f9a825",
    deck: "#111111",
    topSpeed: 210,
    accel: 2.8,
    brake: 3.4,
    turnRate: 6.2,
    deckWidth: 92,
    deckLength: 52,
    deckOffset: 10,
    radius: 38,
    engine: { idleHz: 32, maxHz: 70, rumble: 0.6, volume: 0.82, cylinders: 2 },
    portrait: "portrait-zipturn",
    rig: { spriteScale: 1, rearAxle: -0.3, frontAxle: 0.36, rearTrack: 0.29, frontTrack: 0.29, rearWheel: [0.2, 0.095], frontWheel: [0.105, 0.052], dischargeSide: 1, exhaust: [-0.08, -0.2] },
  },
  {
    id: "yardking",
    name: "Yard King",
    label: "Tractor",
    kind: "tractor",
    body: "#1b5e20",
    accent: "#a5d6a7",
    seat: "#f9a825",
    deck: "#1a1a1a",
    topSpeed: 200,
    accel: 1.8,
    brake: 2.2,
    turnRate: 2.8,
    deckWidth: 88,
    deckLength: 58,
    deckOffset: 22,
    radius: 40,
    engine: { idleHz: 24, maxHz: 52, rumble: 0.85, volume: 0.9, cylinders: 2 },
    portrait: "portrait-yardking",
    rig: { spriteScale: 1.03, rearAxle: -0.31, frontAxle: 0.31, rearTrack: 0.28, frontTrack: 0.23, rearWheel: [0.21, 0.105], frontWheel: [0.14, 0.07], dischargeSide: 1, exhaust: [0.18, -0.14] },
  },
  {
    id: "wideboy",
    name: "WideBoy",
    label: "Wide deck",
    kind: "commercial",
    body: "#f9a825",
    accent: "#fff59d",
    seat: "#212121",
    deck: "#111111",
    topSpeed: 170,
    accel: 1.5,
    brake: 2.0,
    turnRate: 2.1,
    deckWidth: 128,
    deckLength: 62,
    deckOffset: 16,
    radius: 48,
    engine: { idleHz: 22, maxHz: 48, rumble: 0.95, volume: 0.95, cylinders: 3 },
    portrait: "portrait-wideboy",
    rig: { spriteScale: 1.04, rearAxle: -0.27, frontAxle: 0.34, rearTrack: 0.31, frontTrack: 0.28, rearWheel: [0.19, 0.1], frontWheel: [0.13, 0.065], dischargeSide: 1, exhaust: [0.08, -0.19] },
  },
  {
    id: "farmhand",
    name: "Farmhand",
    label: "Farm",
    kind: "tractor",
    body: "#1565c0",
    accent: "#90caf9",
    seat: "#f9a825",
    deck: "#37474f",
    topSpeed: 175,
    accel: 1.6,
    brake: 2.1,
    turnRate: 2.4,
    deckWidth: 96,
    deckLength: 70,
    deckOffset: -18,
    radius: 44,
    engine: { idleHz: 20, maxHz: 46, rumble: 1.0, volume: 0.95, cylinders: 3 },
    portrait: "portrait-farmhand",
    rig: { spriteScale: 1.08, rearAxle: -0.29, frontAxle: 0.31, rearTrack: 0.3, frontTrack: 0.22, rearWheel: [0.23, 0.12], frontWheel: [0.15, 0.075], dischargeSide: -1, exhaust: [0.2, -0.13] },
  },
  {
    id: "storm",
    name: "Storm",
    label: "Diesel",
    kind: "commercial",
    body: "#37474f",
    accent: "#c62828",
    seat: "#c62828",
    deck: "#0d0d0d",
    topSpeed: 185,
    accel: 1.4,
    brake: 1.8,
    turnRate: 2.0,
    deckWidth: 110,
    deckLength: 66,
    deckOffset: 20,
    radius: 50,
    engine: { idleHz: 16, maxHz: 40, rumble: 1.2, volume: 1.0, cylinders: 4 },
    portrait: "portrait-storm",
    rig: { spriteScale: 1.08, rearAxle: -0.3, frontAxle: 0.31, rearTrack: 0.29, frontTrack: 0.23, rearWheel: [0.23, 0.12], frontWheel: [0.15, 0.075], dischargeSide: 1, exhaust: [0.16, -0.15] },
  },
  {
    id: "nightowl",
    name: "Night Owl",
    label: "Lights",
    kind: "riding",
    body: "#1b3a1f",
    accent: "#fff59d",
    seat: "#f9a825",
    deck: "#111111",
    topSpeed: 195,
    accel: 2.0,
    brake: 2.5,
    turnRate: 3.2,
    deckWidth: 80,
    deckLength: 54,
    deckOffset: 18,
    radius: 36,
    engine: { idleHz: 26, maxHz: 56, rumble: 0.75, volume: 0.88, cylinders: 2 },
    portrait: "portrait-nightowl",
    rig: { spriteScale: 1, rearAxle: -0.3, frontAxle: 0.3, rearTrack: 0.27, frontTrack: 0.24, rearWheel: [0.18, 0.09], frontWheel: [0.12, 0.065], dischargeSide: 1, exhaust: [0.14, -0.14] },
  },
  {
    id: "sidekick",
    name: "Sidekick",
    label: "Stand-on",
    kind: "standon",
    body: "#6a1b9a",
    accent: "#ce93d8",
    seat: "#212121",
    deck: "#171717",
    topSpeed: 220,
    accel: 2.9,
    brake: 3.5,
    turnRate: 5.8,
    deckWidth: 102,
    deckLength: 54,
    deckOffset: 14,
    radius: 38,
    engine: { idleHz: 30, maxHz: 66, rumble: 0.68, volume: 0.84, cylinders: 2 },
    portrait: "portrait-sidekick",
    steeringModel: "zero-turn",
    cameraZoom: 1.08,
    rig: { spriteScale: 1, rearAxle: -0.27, frontAxle: 0.34, rearTrack: 0.28, frontTrack: 0.27, rearWheel: [0.18, 0.09], frontWheel: [0.1, 0.052], dischargeSide: 1, exhaust: [-0.05, -0.2] },
  },
  {
    id: "meadowranger",
    name: "Meadow Ranger",
    label: "Front mower",
    kind: "frontmount",
    body: "#00838f",
    accent: "#80deea",
    seat: "#ffb300",
    deck: "#263238",
    topSpeed: 180,
    accel: 1.7,
    brake: 2.1,
    turnRate: 3.3,
    deckWidth: 124,
    deckLength: 68,
    deckOffset: 52,
    radius: 48,
    engine: { idleHz: 19, maxHz: 44, rumble: 1.05, volume: 0.96, cylinders: 3 },
    portrait: "portrait-meadowranger",
    steeringModel: "articulated",
    cameraZoom: 0.96,
    rig: { spriteScale: 1.08, rearAxle: -0.3, frontAxle: 0.34, rearTrack: 0.29, frontTrack: 0.27, rearWheel: [0.21, 0.105], frontWheel: [0.13, 0.065], dischargeSide: -1, exhaust: [0.08, -0.17] },
  },
  {
    id: "gardenscout", name: "Garden Scout", label: "Compact tractor", kind: "tractor",
    body: "#7b1fa2", accent: "#e1bee7", seat: "#263238", deck: "#3e2846",
    topSpeed: 168, accel: 2.35, brake: 2.9, turnRate: 4.15, deckWidth: 74, deckLength: 52, deckOffset: 18, radius: 35,
    engine: { idleHz: 30, maxHz: 62, rumble: 0.62, volume: 0.8, cylinders: 2 }, portrait: "portrait-gardenscout", cameraZoom: 1.02,
    rig: { spriteScale: .96, rearAxle: -.3, frontAxle: .31, rearTrack: .27, frontTrack: .22, rearWheel: [.19,.095], frontWheel: [.12,.06], dischargeSide: 1, exhaust: [.16,-.13] },
  },
  {
    id: "utilitymate", name: "Utility Mate", label: "Utility tractor", kind: "tractor",
    body: "#ef6c00", accent: "#ffe0b2", seat: "#263238", deck: "#30363a",
    topSpeed: 182, accel: 1.72, brake: 2.15, turnRate: 2.65, deckWidth: 106, deckLength: 66, deckOffset: -22, radius: 46,
    engine: { idleHz: 19, maxHz: 45, rumble: 1.05, volume: .96, cylinders: 3 }, portrait: "portrait-utilitymate", steeringModel: "standard", cameraZoom: .95,
    rig: { spriteScale: 1.1, rearAxle: -.3, frontAxle: .32, rearTrack: .31, frontTrack: .23, rearWheel: [.24,.12], frontWheel: [.15,.075], dischargeSide: -1, exhaust: [.18,-.15] },
  },
  {
    id: "fieldgiant", name: "Field Giant", label: "Big field tractor", kind: "tractor",
    body: "#b71c1c", accent: "#ffcdd2", seat: "#212121", deck: "#4e342e",
    topSpeed: 160, accel: 1.18, brake: 1.65, turnRate: 1.75, deckWidth: 154, deckLength: 78, deckOffset: -34, radius: 57,
    engine: { idleHz: 13, maxHz: 34, rumble: 1.35, volume: 1, cylinders: 4 }, portrait: "portrait-fieldgiant", cameraZoom: .88,
    rig: { spriteScale: 1.18, rearAxle: -.31, frontAxle: .32, rearTrack: .32, frontTrack: .23, rearWheel: [.27,.135], frontWheel: [.17,.085], dischargeSide: -1, exhaust: [.2,-.16] },
  },
  {
    id: "pivotranger", name: "Pivot Ranger", label: "Articulated mower", kind: "frontmount",
    body: "#00695c", accent: "#80cbc4", seat: "#ffca28", deck: "#263238",
    topSpeed: 196, accel: 1.9, brake: 2.3, turnRate: 4.1, deckWidth: 138, deckLength: 72, deckOffset: 58, radius: 51,
    engine: { idleHz: 18, maxHz: 43, rumble: 1.08, volume: .98, cylinders: 3 }, portrait: "portrait-pivotranger", steeringModel: "articulated", cameraZoom: .92,
    rig: { spriteScale: 1.13, rearAxle: -.31, frontAxle: .35, rearTrack: .3, frontTrack: .28, rearWheel: [.22,.11], frontWheel: [.14,.07], dischargeSide: 1, exhaust: [.07,-.18] },
  },
];

export function mowerById(id: string): MowerDef {
  return MOWERS.find((m) => m.id === id) ?? MOWERS[1];
}
