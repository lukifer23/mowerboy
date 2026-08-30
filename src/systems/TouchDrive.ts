import Phaser from "phaser";
import { save } from "./Save";
import type { DriveableMachine } from "./DriveableMachine";
import { assistedThrottle, normalizeAngle } from "./driveMath";
import type { InputDiagnostics } from "./Diagnostics";

export class TouchDrive {
  private scene: Phaser.Scene;
  private mower: DriveableMachine;
  private waypoint: { x: number; y: number } | null = null;
  private padDir = { x: 0, y: 0 };
  padState = { up: false, down: false, left: false, right: false };
  private pointerDown = false;
  private pointerId = -1;
  private pointerWorld = { x: 0, y: 0 };
  private keys: Record<string, Phaser.Input.Keyboard.Key> | null = null;
  private isWorldPoint: (x: number, y: number) => boolean;
  private blur = () => this.abortInput();
  private visibility = () => {
    if (document.visibilityState !== "visible") this.abortInput();
  };

  constructor(scene: Phaser.Scene, mower: DriveableMachine, isWorldPoint: (x: number, y: number) => boolean = () => true) {
    this.scene = scene;
    this.mower = mower;
    this.isWorldPoint = isWorldPoint;
    scene.input.on("pointerdown", this.onDown, this);
    scene.input.on("pointermove", this.onMove, this);
    scene.input.on("pointerup", this.onUp, this);
    scene.input.on("pointercancel", this.onCancel, this);
    scene.input.on(Phaser.Input.Events.GAME_OUT, this.blur);
    window.addEventListener("blur", this.blur);
    document.addEventListener("visibilitychange", this.visibility);
    const kb = scene.input.keyboard;
    if (kb) {
      this.keys = {
        w: kb.addKey("W"),
        a: kb.addKey("A"),
        s: kb.addKey("S"),
        d: kb.addKey("D"),
        up: kb.addKey("UP"),
        dn: kb.addKey("DOWN"),
        lf: kb.addKey("LEFT"),
        rt: kb.addKey("RIGHT"),
      };
    }
  }

  get target(): { x: number; y: number } | null {
    if (save().control === "tap") return this.waypoint;
    return this.pointerDown ? this.pointerWorld : null;
  }

  diagnostics(): InputDiagnostics {
    const scheme = save().control;
    const padActive = Object.values(this.padState).some(Boolean);
    return {
      scheme,
      owner: this.pointerDown ? "pointer" : this.waypoint ? "waypoint" : padActive ? "pad" : "none",
      pointerId: this.pointerId < 0 ? null : this.pointerId,
      target: this.target ? { ...this.target } : null,
      pad: { ...this.padState },
    };
  }

  setPad(dir: "up" | "down" | "left" | "right", on: boolean): void {
    this.padState[dir] = on;
  }

  /** Stop every input source after an OS/browser interruption or overlay handoff. */
  abortInput(): void {
    this.pointerDown = false;
    this.pointerId = -1;
    this.waypoint = null;
    this.padDir.x = 0;
    this.padDir.y = 0;
    this.padState.up = false;
    this.padState.down = false;
    this.padState.left = false;
    this.padState.right = false;
    this.mower.throttle = 0;
    this.mower.steering = 0;
  }

  destroy(): void {
    this.scene.input.off("pointerdown", this.onDown, this);
    this.scene.input.off("pointermove", this.onMove, this);
    this.scene.input.off("pointerup", this.onUp, this);
    this.scene.input.off("pointercancel", this.onCancel, this);
    this.scene.input.off(Phaser.Input.Events.GAME_OUT, this.blur);
    window.removeEventListener("blur", this.blur);
    document.removeEventListener("visibilitychange", this.visibility);
    this.abortInput();
  }

  update(dt: number): void {
    const scheme = save().control;
    const m = this.mower;
    let kx = 0;
    let ky = 0;
    if (this.keys) {
      if (this.keys.w.isDown || this.keys.up.isDown) ky -= 1;
      if (this.keys.s.isDown || this.keys.dn.isDown) ky += 1;
      if (this.keys.a.isDown || this.keys.lf.isDown) kx -= 1;
      if (this.keys.d.isDown || this.keys.rt.isDown) kx += 1;
    }

    if (scheme === "pad") {
      const x = this.padDir.x + (this.padState.left ? -1 : 0) + (this.padState.right ? 1 : 0) + kx;
      const y = this.padDir.y + (this.padState.up ? -1 : 0) + (this.padState.down ? 1 : 0) + ky;
      if (Math.hypot(x, y) > 0.2) this.steer(Math.atan2(y, x), dt, 1);
      else this.stop();
      return;
    }

    if (kx || ky) {
      this.steer(Math.atan2(ky, kx), dt, 1);
      return;
    }

    if (scheme === "tap") {
      if (!this.waypoint) {
        this.stop();
        return;
      }
      const dx = this.waypoint.x - m.x;
      const dy = this.waypoint.y - m.y;
      const distance = Math.hypot(dx, dy);
      const desired = Math.atan2(dy, dx);
      const error = normalizeAngle(desired - m.heading);
      if (distance < 30) {
        this.waypoint = null;
        this.stop();
      } else this.steer(desired, dt, assistedThrottle(distance, error));
      return;
    }

    if (scheme === "cruise") {
      if (this.pointerDown) this.steerToPointer(dt, 1);
      else {
        m.throttle = 1;
        m.steering *= 0.82;
      }
      return;
    }

    if (this.pointerDown) this.steerToPointer(dt);
    else this.stop();
  }

  private steerToPointer(dt: number, forcedThrottle?: number): void {
    const dx = this.pointerWorld.x - this.mower.x;
    const dy = this.pointerWorld.y - this.mower.y;
    const distance = Math.hypot(dx, dy);
    const desired = Math.atan2(dy, dx);
    const error = normalizeAngle(desired - this.mower.heading);
    const assisted = assistedThrottle(distance, error);
    const dragThrottle = distance < 30 ? 0 : Math.max(0.38, assisted);
    this.steer(desired, dt, forcedThrottle ?? dragThrottle);
  }

  private steer(desired: number, dt: number, throttle: number): void {
    const m = this.mower;
    const error = normalizeAngle(desired - m.heading);
    const speedRatio = Math.min(1, m.speed / Math.max(1, m.topSpeed));
    const pivot = m.pivotTurn;
    const speedFactor = pivot ? 1 : Phaser.Math.Linear(1, 0.62, speedRatio);
    const dragAssist = this.pointerDown && save().control === "magnet" ? 1.18 : 1;
    const maxTurn = m.turnRate * speedFactor * dragAssist * dt;
    m.heading += Phaser.Math.Clamp(error, -maxTurn, maxTurn);
    m.heading = normalizeAngle(m.heading);
    m.steering = Phaser.Math.Clamp(error / (Math.PI * 0.55), -1, 1);
    m.throttle = Phaser.Math.Clamp(throttle, 0, 1);
  }

  private stop(): void {
    this.mower.throttle = 0;
    this.mower.steering *= 0.78;
  }

  private setWorldPoint(p: Phaser.Input.Pointer): void {
    const point = this.scene.cameras.main.getWorldPoint(p.x, p.y);
    this.pointerWorld.x = point.x;
    this.pointerWorld.y = point.y;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    // Pad touches belong exclusively to the four directional controls. Never
    // also claim them as world steering if camera/input ordering changes.
    if (save().control === "pad") return;
    if (!this.isWorldPoint(p.x, p.y) || this.pointerDown) return;
    this.pointerDown = true;
    this.pointerId = p.id;
    this.setWorldPoint(p);
    if (save().control === "tap") this.waypoint = { ...this.pointerWorld };
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!p.isDown || !this.pointerDown || p.id !== this.pointerId) return;
    this.setWorldPoint(p);
  }

  private onUp(p?: Phaser.Input.Pointer): void {
    if (p && this.pointerId !== -1 && p.id !== this.pointerId) return;
    this.releasePointer();
  }

  private onCancel(): void {
    this.abortInput();
  }

  private releasePointer(): void {
    this.pointerDown = false;
    this.pointerId = -1;
  }
}
