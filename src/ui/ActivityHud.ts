import Phaser from "phaser";
import { COPY } from "../data/copy";
import { audio } from "../systems/AudioEngine";
import { persist, save } from "../systems/Save";
import { getViewport, playHudLayout } from "../systems/Viewport";
import { bigButton } from "./BigButton";
import { announce, setAccessibleLabel } from "../systems/Accessibility";

export interface ActivityHudActions {
  home: () => void;
  pause: () => void;
  finish: () => void;
}

/**
 * Activity-neutral, UI-camera-owned safety controls.
 *
 * screen pointer -> HUD exclusion -> activity drive input
 *                         |
 *                         +-> Home / Pause / Quiet / Finish
 *
 * Activity scenes own the meaning of progress and Finish. This class owns the
 * stable positions, touch exclusion, mute state, and progress presentation.
 */
export class ActivityHud {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly progress: Phaser.GameObjects.Graphics;
  private readonly progressText: Phaser.GameObjects.Text;
  private readonly buttons: {
    home: Phaser.GameObjects.Container;
    pause: Phaser.GameObjects.Container;
    mute: Phaser.GameObjects.Container;
    finish: Phaser.GameObjects.Container;
  };
  private announcedBucket = -1;

  constructor(scene: Phaser.Scene, actions: ActivityHudActions, initialLabel: string) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(20).setScrollFactor(0);
    const home = bigButton(scene, 0, 0, "icon-home", COPY.home, actions.home, 80);
    const pause = bigButton(scene, 0, 0, "icon-pause", COPY.pause, actions.pause, 80);
    const mute = bigButton(scene, 0, 0, save().muted ? "icon-mute" : "icon-speaker", save().muted ? COPY.unmute : COPY.mute, () => {
      save().muted = !save().muted;
      persist();
      audio.applyVolumes();
      (mute.getAt(0) as Phaser.GameObjects.Image).setTexture(save().muted ? "icon-mute" : "icon-speaker");
      (mute.getAt(1) as Phaser.GameObjects.Text).setText(save().muted ? COPY.unmute : COPY.mute);
      setAccessibleLabel(mute, save().muted ? COPY.unmute : COPY.mute);
    }, 80);
    const finish = bigButton(scene, 0, 0, "icon-wand", COPY.helper, actions.finish, 80);
    this.progress = scene.add.graphics();
    this.progressText = scene.add.text(0, 0, initialLabel, {
      fontFamily: 'system-ui, "Trebuchet MS", sans-serif',
      fontSize: "14px",
      fontStyle: "bold",
      color: "#f4f1de",
      stroke: "#102418",
      strokeThickness: 4,
    }).setOrigin(0.5, 0);
    this.buttons = { home, pause, mute, finish };
    this.container.add([home, pause, mute, finish, this.progress, this.progressText]);
    this.layout();
    this.setProgress(0, initialLabel);
  }

  layout(): void {
    const layout = playHudLayout(getViewport(this.scene));
    this.buttons.home.setPosition(layout.homeX, layout.y);
    this.buttons.pause.setPosition(layout.pauseX, layout.secondaryY);
    this.buttons.mute.setPosition(layout.muteX, layout.y);
    this.buttons.finish.setPosition(layout.finishX, layout.secondaryY);
    const scale = layout.size / 80;
    for (const button of Object.values(this.buttons)) button.setScale(scale);
    this.progress.setPosition(layout.progressX, layout.progressY);
    this.progressText.setPosition(layout.progressX, layout.progressY + 32);
  }

  containsScreenPoint(x: number, y: number): boolean {
    const layout = playHudLayout(getViewport(this.scene));
    const radius = layout.size * 0.62;
    const buttonCenters = [
      [layout.homeX, layout.y], [layout.pauseX, layout.secondaryY],
      [layout.muteX, layout.y], [layout.finishX, layout.secondaryY],
    ];
    const onButton = buttonCenters.some(([buttonX, buttonY]) => Phaser.Math.Distance.Between(x, y, buttonX, buttonY) <= radius);
    // The objective is not a button, but a child tapping or tracing it should
    // never send a hidden steering command into the world behind the HUD.
    const onObjective = Math.abs(x - layout.progressX) <= 88
      && y >= layout.progressY - 34
      && y <= layout.progressY + 62;
    return onButton || onObjective;
  }

  bounds(): ReturnType<typeof playHudLayout> {
    return playHudLayout(getViewport(this.scene));
  }

  setProgress(value: number, label: string): void {
    const p = Phaser.Math.Clamp(value, 0, 1);
    this.progress.clear();
    this.progress.fillStyle(0x102418, 0.8);
    this.progress.fillCircle(0, 0, 28);
    this.progress.lineStyle(6, 0xf4f1de, 1);
    this.progress.strokeCircle(0, 0, 21);
    this.progress.lineStyle(7, 0x81c784, 1);
    this.progress.beginPath();
    this.progress.arc(0, 0, 21, -Math.PI / 2, -Math.PI / 2 + Math.max(0.02, p) * Math.PI * 2, false);
    this.progress.strokePath();
    this.progressText.setText(label);
    const bucket = Math.floor(p * 10);
    if (bucket !== this.announcedBucket && bucket > 0) {
      this.announcedBucket = bucket;
      announce(label);
    }
  }
}
