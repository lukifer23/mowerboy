export type VacuumKind = "upright" | "cyclone" | "stick" | "canister" | "shop" | "robot" | "commercial" | "sweeper";

export interface VacuumMotorProfile {
  idleHz: number;
  maxHz: number;
  whine: number;
  airflow: number;
  volume: number;
}

export interface VacuumRig {
  bodyScale: number;
  intakeWidth: number;
  intakeDepth: number;
  intakeOffset: number;
  rearAxle: number;
  frontAxle: number;
  wheelTrack: number;
  hose?: boolean;
  trailer?: boolean;
  brushRoll: boolean;
}

export interface VacuumDef {
  id: string;
  name: string;
  label: string;
  kind: VacuumKind;
  body: string;
  accent: string;
  topSpeed: number;
  accel: number;
  brake: number;
  turnRate: number;
  radius: number;
  motor: VacuumMotorProfile;
  rig: VacuumRig;
}

export const VACUUMS: VacuumDef[] = [
  { id: "brightupright", name: "Bright Upright", label: "Classic upright", kind: "upright", body: "#d32f2f", accent: "#fdd835", topSpeed: 126, accel: 2.7, brake: 3.4, turnRate: 4.8, radius: 25, motor: { idleHz: 72, maxHz: 132, whine: 0.62, airflow: 0.72, volume: 0.78 }, rig: { bodyScale: 1, intakeWidth: 72, intakeDepth: 34, intakeOffset: 34, rearAxle: -0.2, frontAxle: 0.28, wheelTrack: 0.25, brushRoll: true } },
  { id: "cyclone", name: "Cyclone Clear", label: "Cyclone upright", kind: "cyclone", body: "#6a1b9a", accent: "#80deea", topSpeed: 132, accel: 2.8, brake: 3.5, turnRate: 5, radius: 26, motor: { idleHz: 84, maxHz: 158, whine: 0.82, airflow: 0.84, volume: 0.8 }, rig: { bodyScale: 1.02, intakeWidth: 76, intakeDepth: 36, intakeOffset: 35, rearAxle: -0.2, frontAxle: 0.29, wheelTrack: 0.26, hose: true, brushRoll: true } },
  { id: "quickstick", name: "Quick Stick", label: "Cordless stick", kind: "stick", body: "#00838f", accent: "#ffb300", topSpeed: 154, accel: 3.2, brake: 3.8, turnRate: 5.8, radius: 21, motor: { idleHz: 104, maxHz: 196, whine: 0.9, airflow: 0.62, volume: 0.7 }, rig: { bodyScale: 0.9, intakeWidth: 62, intakeDepth: 28, intakeOffset: 31, rearAxle: -0.16, frontAxle: 0.31, wheelTrack: 0.21, brushRoll: true } },
  { id: "trailercan", name: "Trailercan", label: "Canister", kind: "canister", body: "#1976d2", accent: "#ef5350", topSpeed: 112, accel: 2.1, brake: 2.8, turnRate: 4.2, radius: 28, motor: { idleHz: 68, maxHz: 142, whine: 0.7, airflow: 0.88, volume: 0.82 }, rig: { bodyScale: 1.05, intakeWidth: 58, intakeDepth: 30, intakeOffset: 38, rearAxle: -0.28, frontAxle: 0.3, wheelTrack: 0.25, hose: true, trailer: true, brushRoll: false } },
  { id: "workhorse", name: "Workhorse", label: "Wet and dry", kind: "shop", body: "#f9a825", accent: "#263238", topSpeed: 98, accel: 1.9, brake: 2.5, turnRate: 3.8, radius: 31, motor: { idleHz: 54, maxHz: 118, whine: 0.5, airflow: 1, volume: 0.94 }, rig: { bodyScale: 1.12, intakeWidth: 64, intakeDepth: 34, intakeOffset: 41, rearAxle: -0.29, frontAxle: 0.28, wheelTrack: 0.27, hose: true, trailer: true, brushRoll: false } },
  { id: "roundabout", name: "Roundabout", label: "Robot", kind: "robot", body: "#455a64", accent: "#66bb6a", topSpeed: 86, accel: 2.2, brake: 3, turnRate: 6.4, radius: 34, motor: { idleHz: 96, maxHz: 152, whine: 0.56, airflow: 0.5, volume: 0.58 }, rig: { bodyScale: 0.94, intakeWidth: 54, intakeDepth: 24, intakeOffset: 18, rearAxle: -0.16, frontAxle: 0.18, wheelTrack: 0.28, brushRoll: true } },
  { id: "hallkeeper", name: "Hall Keeper", label: "Commercial upright", kind: "commercial", body: "#1565c0", accent: "#f5f5f5", topSpeed: 118, accel: 2.3, brake: 3, turnRate: 4.3, radius: 29, motor: { idleHz: 62, maxHz: 126, whine: 0.55, airflow: 0.94, volume: 0.9 }, rig: { bodyScale: 1.12, intakeWidth: 88, intakeDepth: 40, intakeOffset: 40, rearAxle: -0.22, frontAxle: 0.3, wheelTrack: 0.3, brushRoll: true } },
  { id: "floorrider", name: "Floor Rider", label: "Ride-on sweeper", kind: "sweeper", body: "#2e7d32", accent: "#ffca28", topSpeed: 168, accel: 1.8, brake: 2.4, turnRate: 3.1, radius: 43, motor: { idleHz: 42, maxHz: 94, whine: 0.38, airflow: 1.08, volume: 0.96 }, rig: { bodyScale: 1.18, intakeWidth: 112, intakeDepth: 52, intakeOffset: 38, rearAxle: -0.29, frontAxle: 0.3, wheelTrack: 0.3, brushRoll: true } },
];

export function vacuumById(id: string): VacuumDef {
  return VACUUMS.find((vacuum) => vacuum.id === id) ?? VACUUMS[0];
}
