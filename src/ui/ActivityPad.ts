import Phaser from "phaser";
import { registerAccessibleControl } from "../systems/Accessibility";
import type { TouchDrive } from "../systems/TouchDrive";
import { getViewport } from "../systems/Viewport";

export type PadDirection = "up" | "down" | "left" | "right";

const PAD_CONTROLS: ReadonlyArray<{
  direction: PadDirection;
  glyph: string;
  label: string;
  dx: number;
  dy: number;
}> = [
  { direction: "up", glyph: "▲", label: "Drive up", dx: 0, dy: -68 },
  { direction: "down", glyph: "▼", label: "Drive down", dx: 0, dy: 68 },
  { direction: "left", glyph: "◀", label: "Drive left", dx: -74, dy: 0 },
  { direction: "right", glyph: "▶", label: "Drive right", dx: 74, dy: 0 },
];

/** Shared four-way child and assistive-technology drive control. */
export class ActivityPad {
  readonly container: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly drive: TouchDrive,
    color: number
  ) {
    this.container = scene.add.container(0, 0).setDepth(19).setScrollFactor(0);
    for (const control of PAD_CONTROLS) {
      const circle = scene.add.circle(control.dx, control.dy, 44, color, 0.9)
        .setStrokeStyle(3, 0xf4f1de)
        .setInteractive();
      const text = scene.add.text(control.dx, control.dy, control.glyph, {
        fontFamily: "system-ui",
        fontSize: "34px",
        color: "#fff",
      }).setOrigin(0.5);

      const press = () => this.drive.setPad(control.direction, true);
      const release = () => this.drive.setPad(control.direction, false);
      circle.on("pointerdown", press);
      circle.on("pointerup", release);
      circle.on("pointerout", release);
      circle.on("pointercancel", () => this.drive.abortInput());
      registerAccessibleControl(scene, circle, control.label, () => {
        press();
        scene.time.delayedCall(360, release);
      });
      this.container.add([circle, text]);
    }
    this.layout();
  }

  layout(): void {
    const viewport = getViewport(this.scene);
    this.container.setPosition(
      viewport.safe.left + (viewport.mode === "phone-portrait" ? 118 : 132),
      viewport.height - viewport.safe.bottom - (viewport.mode === "phone-landscape" ? 102 : 126)
    );
  }

  destroy(): void {
    this.drive.abortInput();
    this.container.destroy(true);
  }
}
