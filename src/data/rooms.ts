import type { DebrisType } from "../systems/debrisMath";

export type FloorMaterial = "carpet" | "rug" | "hardwood" | "tile" | "concrete";
/** @deprecated Prefer FloorMaterial for shared room, debris, and audio contracts. */
export type FloorType = FloorMaterial;
export type RoomTheme = "home" | "school" | "workshop" | "community";

export interface RoomDef {
  id: string;
  name: string;
  floors: FloorMaterial[];
  theme: RoomTheme;
  width: number;
  height: number;
  debris: DebrisType[];
  seed: number;
}

export const ROOMS: RoomDef[] = [
  { id: "living", name: "Living Room", floors: ["hardwood", "rug"], theme: "home", width: 1720, height: 1180, debris: ["dust", "crumb", "hair", "petFur"], seed: 101 },
  { id: "kitchen", name: "Kitchen", floors: ["tile"], theme: "home", width: 1640, height: 1100, debris: ["crumb", "cereal", "dust", "dirt"], seed: 211 },
  { id: "playroom", name: "Playroom", floors: ["carpet", "rug"], theme: "home", width: 1780, height: 1220, debris: ["cereal", "confetti", "crumb", "dust"], seed: 307 },
  { id: "bedroom", name: "Bedroom", floors: ["carpet"], theme: "home", width: 1540, height: 1080, debris: ["dust", "hair", "petFur"], seed: 401 },
  { id: "hallway", name: "Hallway", floors: ["hardwood", "rug"], theme: "home", width: 2040, height: 1040, debris: ["dust", "dirt", "hair"], seed: 503 },
  { id: "dining", name: "Dining Room", floors: ["hardwood", "rug"], theme: "home", width: 1660, height: 1140, debris: ["crumb", "cereal", "dust"], seed: 601 },
  { id: "sunroom", name: "Sunroom", floors: ["tile", "rug"], theme: "home", width: 1800, height: 1160, debris: ["leaf", "dirt", "dust", "petFur"], seed: 701 },
  { id: "mudroom", name: "Mudroom", floors: ["tile"], theme: "home", width: 1500, height: 1040, debris: ["dirt", "leaf", "petFur"], seed: 809 },
  { id: "workshop", name: "Workshop", floors: ["concrete"], theme: "workshop", width: 1980, height: 1320, debris: ["sawdust", "dirt", "leaf"], seed: 907 },
  { id: "classroom", name: "Classroom", floors: ["tile", "rug"], theme: "school", width: 1900, height: 1280, debris: ["crumb", "confetti", "dust", "dirt"], seed: 1009 },
  { id: "library", name: "Library", floors: ["carpet"], theme: "school", width: 1840, height: 1260, debris: ["dust", "hair", "crumb"], seed: 1103 },
  { id: "community", name: "Community Hall", floors: ["tile", "rug"], theme: "community", width: 2200, height: 1440, debris: ["confetti", "crumb", "dirt", "leaf", "dust"], seed: 1201 },
];

export function roomById(id: string): RoomDef {
  return ROOMS.find((room) => room.id === id) ?? ROOMS[0];
}
