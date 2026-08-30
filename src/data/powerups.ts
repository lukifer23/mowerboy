export type PowerupId =
  | "turbo"
  | "wide"
  | "rain"
  | "magnet"
  | "rainbow"
  | "flock"
  | "mulcher"
  | "headlights";

export interface PowerupDef {
  id: PowerupId;
  name: string;
  duration: number;
  color: string;
}

export const POWERUPS: PowerupDef[] = [
  { id: "turbo", name: "Turbo", duration: 8, color: "#ff7043" },
  { id: "wide", name: "Wide", duration: 10, color: "#66bb6a" },
  { id: "rain", name: "Rain", duration: 8, color: "#42a5f5" },
  { id: "magnet", name: "Magnet", duration: 12, color: "#ab47bc" },
  { id: "rainbow", name: "Rainbow", duration: 14, color: "#ec407a" },
  { id: "flock", name: "Birds", duration: 10, color: "#26c6da" },
  { id: "mulcher", name: "Mulch", duration: 12, color: "#8d6e63" },
  { id: "headlights", name: "Lights", duration: 20, color: "#ffee58" },
];

export function powerupById(id: PowerupId): PowerupDef {
  return POWERUPS.find((p) => p.id === id)!;
}
