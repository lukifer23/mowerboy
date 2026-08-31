import Phaser from "phaser";
import { COPY } from "../data/copy";
import { announce } from "../systems/Accessibility";
import { save } from "../systems/Save";
import { getViewport } from "../systems/Viewport";
import { bigButton, labelText } from "./BigButton";

interface TutorialRefs {
  bg: Phaser.GameObjects.Rectangle;
  trail: Phaser.GameObjects.Rectangle;
  finger: Phaser.GameObjects.Arc;
  tip: Phaser.GameObjects.Arc;
  msg: Phaser.GameObjects.Text;
  next: Phaser.GameObjects.Container;
}

interface PauseRefs {
  bg: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
  resume: Phaser.GameObjects.Container;
}

/** Shared child-safe pause, tutorial, and Safe Home presentation. */
export class ActivityOverlays {
  pauseLayer?: Phaser.GameObjects.Container;
  tutorialLayer?: Phaser.GameObjects.Container;
  private pauseRefs?: PauseRefs;
  private tutorialRefs?: TutorialRefs;
  private tutorialTween?: Phaser.Tweens.Tween;
  private homeConfirm?: Phaser.GameObjects.Text;
  private homeTimer?: Phaser.Time.TimerEvent;
  private lastHomeTap = -Infinity;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly pinUI: (object: Phaser.GameObjects.GameObject) => void,
    private readonly overlayColor: number
  ) {}

  showPause(onResume: () => void): void {
    this.dismissPause();
    const layer = this.scene.add.container(0, 0).setDepth(30).setScrollFactor(0);
    const bg = this.scene.add.rectangle(0, 0, 1, 1, this.overlayColor, 0.74).setInteractive();
    const title = labelText(this.scene, 0, 0, COPY.pause, 42);
    const resume = bigButton(this.scene, 0, 0, "icon-play", COPY.resume, onResume, 110);
    layer.add([bg, title, resume]);
    this.pauseLayer = layer;
    this.pauseRefs = { bg, title, resume };
    this.pinUI(layer);
    this.layout();
  }

  dismissPause(): void {
    this.pauseLayer?.destroy(true);
    this.pauseLayer = undefined;
    this.pauseRefs = undefined;
  }

  showTutorial(steps: readonly string[], accent: number, onComplete: () => void): void {
    this.dismissTutorial();
    let index = 0;
    const layer = this.scene.add.container(0, 0).setDepth(40).setScrollFactor(0);
    const bg = this.scene.add.rectangle(0, 0, 1, 1, this.overlayColor, 0.47).setInteractive();
    const msg = labelText(this.scene, 0, 0, steps[0] ?? "", 32);
    const trail = this.scene.add.rectangle(0, 0, 128, 8, accent, 0.72);
    const finger = this.scene.add.circle(0, 0, 25, 0xffd6b5).setStrokeStyle(5, 0x5d4037);
    const tip = this.scene.add.circle(0, 0, 12, 0xffd6b5).setStrokeStyle(4, 0x5d4037);
    let advance = () => {};
    const next = bigButton(this.scene, 0, 0, "icon-play", COPY.play, () => advance(), 96);
    advance = () => {
      index += 1;
      if (index >= steps.length) {
        this.dismissTutorial();
        onComplete();
        return;
      }
      msg.setText(steps[index]);
    };
    bg.on("pointerup", advance);
    layer.add([bg, trail, finger, tip, msg, next]);
    this.tutorialLayer = layer;
    this.tutorialRefs = { bg, trail, finger, tip, msg, next };
    this.pinUI(layer);
    this.layout();
  }

  dismissTutorial(): void {
    this.tutorialTween?.remove();
    this.tutorialTween = undefined;
    this.tutorialLayer?.destroy(true);
    this.tutorialLayer = undefined;
    this.tutorialRefs = undefined;
  }

  requestHome(onConfirmed: () => void): void {
    const now = this.scene.time.now;
    if (!save().safeHome || now - this.lastHomeTap <= 1700) {
      this.clearHomeConfirmation();
      onConfirmed();
      return;
    }
    this.lastHomeTap = now;
    this.clearHomeConfirmation();
    this.homeConfirm = this.scene.add.text(0, 0, COPY.homeAgain, {
      fontFamily: "system-ui",
      fontSize: "20px",
      fontStyle: "bold",
      color: "#fff59d",
      backgroundColor: "rgba(16,36,24,0.9)",
      padding: { x: 12, y: 8 },
    }).setDepth(42).setScrollFactor(0);
    this.pinUI(this.homeConfirm);
    announce(COPY.homeAgain);
    this.layout();
    this.homeTimer = this.scene.time.delayedCall(1700, () => this.clearHomeConfirmation());
  }

  layout(): void {
    const viewport = getViewport(this.scene);
    const { width, height, safe } = viewport;
    if (this.pauseRefs) {
      this.pauseRefs.bg.setPosition(width / 2, height / 2).setDisplaySize(width, height);
      this.pauseRefs.title.setPosition(width / 2, height / 2 - 80);
      this.pauseRefs.resume.setPosition(width / 2, height / 2 + 24);
    }
    if (this.tutorialRefs) {
      const y = height * 0.46;
      const startX = width / 2 - 62;
      this.tutorialRefs.bg.setPosition(width / 2, height / 2).setDisplaySize(width, height);
      this.tutorialRefs.trail.setPosition(width / 2, y);
      this.tutorialRefs.finger.setPosition(startX, y);
      this.tutorialRefs.tip.setPosition(startX, y - 25);
      this.tutorialRefs.msg.setPosition(width / 2, height - safe.bottom - 168);
      this.tutorialRefs.next.setPosition(width / 2, height - safe.bottom - 88);
      this.restartTutorialTween();
    }
    this.homeConfirm?.setPosition(safe.left + 18, safe.top + 112);
  }

  destroy(): void {
    this.dismissPause();
    this.dismissTutorial();
    this.clearHomeConfirmation();
  }

  private restartTutorialTween(): void {
    this.tutorialTween?.remove();
    this.tutorialTween = undefined;
    if (!this.tutorialRefs || save().reducedMotion) return;
    this.tutorialTween = this.scene.tweens.add({
      targets: [this.tutorialRefs.finger, this.tutorialRefs.tip],
      x: "+=124",
      duration: 1150,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  private clearHomeConfirmation(): void {
    this.homeTimer?.remove(false);
    this.homeTimer = undefined;
    this.homeConfirm?.destroy();
    this.homeConfirm = undefined;
  }
}
