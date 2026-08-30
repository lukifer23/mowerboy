/**
 * Activity-neutral movement contract consumed by TouchDrive.
 *
 * Touch intent -> heading/throttle -> activity machine update
 *
 * Mowers and vacuums keep their own rendering, collision footprint, working
 * tool, effects, and audio. This interface shares only the simple driving verb.
 */
export interface DriveableMachine {
  x: number;
  y: number;
  heading: number;
  speed: number;
  throttle: number;
  steering: number;
  readonly topSpeed: number;
  readonly turnRate: number;
  readonly pivotTurn: boolean;
}
