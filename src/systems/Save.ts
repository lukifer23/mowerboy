import { LEVELS } from "../data/levels";
import { MOWERS } from "../data/mowers";
import { ROOMS } from "../data/rooms";
import { VACUUMS } from "../data/vacuums";

export type ControlScheme = "magnet" | "tap" | "cruise" | "pad";
export type Activity = "mow" | "vacuum";

export interface SaveData {
  version: number;
  selectedMower: string;
  selectedVacuum: string;
  selectedRoom: string;
  completedYards: string[];
  visitedYards: string[];
  cleanedRooms: string[];
  visitedRooms: string[];
  lastActivity: Activity;
  control: ControlScheme;
  volumes: { master: number; engine: number; world: number };
  muted: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  seenTutorial: boolean;
  seenVacuumTutorial: boolean;
  safeHome: boolean;
}

const KEY = "mowerboy-save-v1";
const MOWER_IDS = new Set(MOWERS.map((item) => item.id));
const VACUUM_IDS = new Set(VACUUMS.map((item) => item.id));
const ROOM_IDS = new Set(ROOMS.map((item) => item.id));
const YARD_IDS = new Set([...LEVELS.map((item) => item.id), "wander"]);

type StoredSave = Partial<SaveData> & {
  unlockedMowers?: string[];
  unlockAll?: boolean;
  sparkles?: number;
};

export const DEFAULT_SAVE: SaveData = {
  version: 4,
  selectedMower: "backyard",
  selectedVacuum: "brightupright",
  selectedRoom: "living",
  completedYards: [],
  visitedYards: [],
  cleanedRooms: [],
  visitedRooms: [],
  lastActivity: "mow",
  control: "magnet",
  volumes: { master: 0.85, engine: 1, world: 0.55 },
  muted: false,
  reducedMotion: false,
  highContrast: false,
  seenTutorial: false,
  seenVacuumTutorial: false,
  safeHome: true,
};

export function migrateForTest(raw: StoredSave | null): SaveData {
  return migrate(raw);
}

function migrate(raw: StoredSave | null): SaveData {
  const d: SaveData = {
    version: 4,
    selectedMower: MOWER_IDS.has(raw?.selectedMower ?? "") ? raw!.selectedMower! : DEFAULT_SAVE.selectedMower,
    selectedVacuum: VACUUM_IDS.has(raw?.selectedVacuum ?? "") ? raw!.selectedVacuum! : DEFAULT_SAVE.selectedVacuum,
    selectedRoom: ROOM_IDS.has(raw?.selectedRoom ?? "") ? raw!.selectedRoom! : DEFAULT_SAVE.selectedRoom,
    completedYards: validIds(raw?.completedYards, YARD_IDS),
    visitedYards: validIds(raw?.visitedYards, YARD_IDS),
    cleanedRooms: validIds(raw?.cleanedRooms, ROOM_IDS),
    visitedRooms: validIds(raw?.visitedRooms, ROOM_IDS),
    lastActivity: raw?.lastActivity === "vacuum" ? "vacuum" : "mow",
    control: raw?.control ?? DEFAULT_SAVE.control,
    volumes: { ...DEFAULT_SAVE.volumes, ...(raw?.volumes ?? {}) },
    muted: typeof raw?.muted === "boolean" ? raw.muted : DEFAULT_SAVE.muted,
    reducedMotion: typeof raw?.reducedMotion === "boolean" ? raw.reducedMotion : DEFAULT_SAVE.reducedMotion,
    highContrast: typeof raw?.highContrast === "boolean" ? raw.highContrast : DEFAULT_SAVE.highContrast,
    seenTutorial: typeof raw?.seenTutorial === "boolean" ? raw.seenTutorial : DEFAULT_SAVE.seenTutorial,
    seenVacuumTutorial: typeof raw?.seenVacuumTutorial === "boolean" ? raw.seenVacuumTutorial : DEFAULT_SAVE.seenVacuumTutorial,
    safeHome: typeof raw?.safeHome === "boolean" ? raw.safeHome : DEFAULT_SAVE.safeHome,
  };
  if (!["magnet", "tap", "cruise", "pad"].includes(d.control)) d.control = "magnet";
  d.volumes.master = clamp01(d.volumes.master);
  d.volumes.engine = clamp01(d.volumes.engine);
  d.volumes.world = clamp01(d.volumes.world);
  return d;
}

function clamp01(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0.8;
  return Math.max(0, Math.min(1, n));
}

function validIds(value: unknown, allowed: ReadonlySet<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && allowed.has(item)))];
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return migrate(null);
    const migrated = migrate(JSON.parse(raw) as StoredSave);
    writeSave(migrated);
    return migrated;
  } catch {
    return migrate(null);
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* private mode / quota — game still plays */
  }
}

let cache: SaveData | null = null;

export function save(): SaveData {
  if (!cache) cache = loadSave();
  return cache;
}

export function persist(): void {
  if (cache) writeSave(cache);
}

export function patchSave(partial: Partial<SaveData>): SaveData {
  cache = { ...save(), ...partial };
  persist();
  return cache;
}

export function completeYard(id: string): void {
  const s = save();
  if (!s.completedYards.includes(id)) s.completedYards.push(id);
  s.visitedYards = [id, ...s.visitedYards.filter((yardId) => yardId !== id)];
  persist();
}

export function visitYard(id: string): void {
  const s = save();
  // Most-recent first makes Free Mow continue the place the child just chose.
  s.visitedYards = [id, ...s.visitedYards.filter((yardId) => yardId !== id)];
  persist();
}

export function completeRoom(id: string): void {
  const s = save();
  if (!s.cleanedRooms.includes(id)) s.cleanedRooms.push(id);
  if (!s.visitedRooms.includes(id)) s.visitedRooms.push(id);
  persist();
}

export function visitRoom(id: string): void {
  const s = save();
  // Most-recent first doubles as a safe migration path for the earlier
  // vacuum gallery, which used visitedRooms[0] as its paired place.
  s.visitedRooms = [id, ...s.visitedRooms.filter((roomId) => roomId !== id)];
  s.selectedRoom = id;
  persist();
}
