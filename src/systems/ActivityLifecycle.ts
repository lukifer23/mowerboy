import Phaser from "phaser";

export interface ActivitySession {
  readonly id: "mow" | "vacuum";
  pause(): void;
  resume(): void;
  finish(): void;
  progress(): number;
  destroy(): void;
}

export interface LifecycleDiagnostics {
  cameras: number;
  textures: number;
  tweens: number;
  inputListeners: number;
  frameMs: { samples: number; p50: number; p95: number; worst: number };
}

/** Shared ownership for the pieces every activity must release or report. */
export class ActivityLifecycle implements ActivitySession {
  readonly uiCamera: Phaser.Cameras.Scene2D.Camera;
  private readonly frameTimes: number[] = [];
  private readonly cleanups: Array<() => void> = [];
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly id: "mow" | "vacuum",
    private readonly adapter?: Pick<ActivitySession, "pause" | "resume" | "finish" | "progress">
  ) {
    this.uiCamera = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height, false, `${id}-ui`)
      .setScroll(0, 0)
      .setZoom(1);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  frame(deltaMs: number): void {
    this.frameTimes.push(Math.min(250, Math.max(0, deltaMs)));
    if (this.frameTimes.length > 240) this.frameTimes.shift();
  }

  addCleanup(cleanup: () => void): void {
    this.cleanups.push(cleanup);
  }

  pause(): void { this.adapter?.pause(); }
  resume(): void { this.adapter?.resume(); }
  finish(): void { this.adapter?.finish(); }
  progress(): number { return this.adapter?.progress() ?? 0; }

  pinUI(object: Phaser.GameObjects.GameObject): void {
    this.scene.cameras.main.ignore(object);
  }

  ignoreWorld(objects: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]): void {
    this.uiCamera.ignore(objects);
  }

  resize(): void {
    this.uiCamera.setSize(this.scene.scale.width, this.scene.scale.height);
    this.scene.cameras.main.setSize(this.scene.scale.width, this.scene.scale.height);
  }

  diagnostics(): LifecycleDiagnostics {
    const ordered = [...this.frameTimes].sort((a, b) => a - b);
    const percentile = (p: number) => ordered.length ? ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * p))] : 0;
    return {
      cameras: this.scene.cameras.cameras.length,
      textures: this.scene.textures.getTextureKeys().length,
      tweens: this.scene.tweens.getTweens().length,
      inputListeners: ["pointerdown", "pointermove", "pointerup", "pointercancel"]
        .reduce((sum, event) => sum + this.scene.input.listenerCount(event), 0),
      frameMs: {
        samples: ordered.length,
        p50: percentile(0.5),
        p95: percentile(0.95),
        worst: ordered.at(-1) ?? 0,
      },
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const cleanup of this.cleanups.splice(0).reverse()) cleanup();
  }
}
