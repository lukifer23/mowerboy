import Phaser from "phaser";
import { COPY } from "../data/copy";
import { patchSave, persist, save, type ControlScheme } from "../systems/Save";
import { audio } from "../systems/AudioEngine";
import { bigButton, labelText } from "../ui/BigButton";
import { bindSceneResize, getViewport } from "../systems/Viewport";
import { isFullscreen, toggleFullscreen } from "../systems/Fullscreen";
import { clearSceneAccessibleControls, registerAccessibleControl, setAccessibleLabel } from "../systems/Accessibility";

export class SettingsScene extends Phaser.Scene {
  private layer?: Phaser.GameObjects.Container;
  private scroll = 0;
  private minScroll = 0;

  constructor() {
    super("settings");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1b3d22");
    this.redraw();
    bindSceneResize(this, () => this.redraw(false));
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!p.isDown || !this.layer || p.y < 96) return;
      this.scroll = Phaser.Math.Clamp(this.scroll + p.y - p.prevPosition.y, this.minScroll, 0);
      this.layer.y = this.scroll;
    });
    this.input.on("wheel", (_p: Phaser.Input.Pointer, _g: unknown, _dx: number, dy: number) => {
      if (!this.layer) return;
      this.scroll = Phaser.Math.Clamp(this.scroll - dy * 0.7, this.minScroll, 0);
      this.layer.y = this.scroll;
    });
  }

  private redraw(resetScroll = true): void {
    const previousScroll = this.scroll;
    clearSceneAccessibleControls(this);
    this.children.removeAll(true);
    const v = getViewport(this);
    const w = v.width;
    const s = save();
    this.scroll = resetScroll ? 0 : previousScroll;
    this.add.rectangle(w / 2, v.safe.top + 52, w, v.safe.top + 104, 0x16351c, .98).setDepth(40);
    labelText(this, w / 2, v.safe.top + 38, COPY.settings, v.compact ? 32 : 40).setDepth(50);
    bigButton(this, v.safe.left + 52, v.safe.top + 42, "icon-home", COPY.home, () => this.scene.start("title"), 76).setDepth(50);
    this.layer = this.add.container(0, 0);

    const contentW = Math.min(760, w - 28);
    const left = (w - contentW) / 2;
    const gap = 14;
    const colW = (contentW - gap) / 2;
    let y = v.safe.top + 132;
    this.sectionLabel(w / 2, y, COPY.drive);
    y += 48;
    const schemes: { id: ControlScheme; label: string; icon: string }[] = [
      { id: "magnet", label: COPY.magnet, icon: "◎" },
      { id: "tap", label: COPY.tap, icon: "●" },
      { id: "cruise", label: COPY.cruise, icon: "▶" },
      { id: "pad", label: COPY.pad, icon: "✣" },
    ];
    schemes.forEach((sc, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = left + colW / 2 + col * (colW + gap);
      const by = y + row * 88;
      const on = s.control === sc.id;
      const r = this.add.rectangle(x, by, colW, 76, on ? 0xf9a825 : 0x2e7d32).setStrokeStyle(4, 0xf4f1de).setInteractive();
      const icon = this.add.text(x - colW * 0.34, by, sc.icon, { fontFamily: "system-ui", fontSize: "28px", color: on ? "#102418" : "#f4f1de" }).setOrigin(0.5);
      const label = this.add.text(x + 12, by, sc.label, { fontFamily: "system-ui", fontSize: `${v.compact ? 17 : 20}px`, color: on ? "#102418" : "#f4f1de", fontStyle: "bold" }).setOrigin(0.5);
      r.on("pointerup", () => {
        patchSave({ control: sc.id });
        this.redraw(false);
      });
      registerAccessibleControl(this, r, `${sc.label}, ${on ? COPY.on : COPY.off}`, () => {
        patchSave({ control: sc.id }); this.redraw(false);
      });
      this.layer!.add([r, icon, label]);
    });
    y += 188;

    this.sectionLabel(w / 2, y, COPY.sound);
    y += 46;
    this.slider(left, y, contentW, COPY.master, s.volumes.master, (value) => {
      s.volumes.master = value; persist(); audio.applyVolumes();
    });
    y += 70;
    this.slider(left, y, contentW, COPY.engine, s.volumes.engine, (value) => {
      s.volumes.engine = value; persist(); audio.applyVolumes();
    });
    y += 70;
    this.slider(left, y, contentW, COPY.world, s.volumes.world, (value) => {
      s.volumes.world = value; persist(); audio.applyVolumes();
    });
    y += 92;

    this.sectionLabel(w / 2, y, COPY.comfort);
    y += 50;
    const toggles = [
      { label: COPY.motion, on: s.reducedMotion, click: () => patchSave({ reducedMotion: !save().reducedMotion }) },
      { label: COPY.contrast, on: s.highContrast, click: () => patchSave({ highContrast: !save().highContrast }) },
      {
        label: COPY.tips,
        on: !s.seenTutorial || !s.seenVacuumTutorial,
        click: () => {
          const showingTips = !save().seenTutorial || !save().seenVacuumTutorial;
          patchSave({ seenTutorial: showingTips, seenVacuumTutorial: showingTips });
        },
      },
      { label: COPY.safeHome, on: s.safeHome, click: () => patchSave({ safeHome: !save().safeHome }) },
      { label: COPY.fullScreen, on: isFullscreen(), click: () => { void toggleFullscreen().then(() => this.redraw(false)); } },
    ];
    toggles.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = left + colW / 2 + col * (colW + gap);
      const ty = y + row * 82;
      const r = this.add.rectangle(x, ty, colW, 70, item.on ? 0x81c784 : 0x546e7a).setStrokeStyle(3, 0xf4f1de).setInteractive();
      const check = this.add.text(x - colW * 0.34, ty, item.on ? "✓" : "—", { fontFamily: "system-ui", fontSize: "28px", color: "#102418", fontStyle: "bold" }).setOrigin(0.5);
      const label = this.add.text(x + 5, ty - 9, item.label, { fontFamily: "system-ui", fontSize: `${v.compact ? 15 : 18}px`, color: "#102418", fontStyle: "bold", align: "center", wordWrap: { width: colW * 0.66 } }).setOrigin(0.5);
      const state = this.add.text(x + 5, ty + 17, item.on ? COPY.on : COPY.off, { fontFamily: "system-ui", fontSize: "14px", color: "#102418", fontStyle: "bold" }).setOrigin(.5);
      r.on("pointerup", () => { item.click(); this.redraw(false); });
      registerAccessibleControl(this, r, `${item.label}, ${item.on ? COPY.on : COPY.off}`, () => { item.click(); this.redraw(false); });
      this.layer!.add([r, check, label, state]);
    });
    y += Math.ceil(toggles.length / 2) * 82 + 20 + v.safe.bottom;
    this.minScroll = Math.min(0, v.height - y);
    this.scroll = Phaser.Math.Clamp(this.scroll, this.minScroll, 0);
    this.layer.y = this.scroll;
    if (this.minScroll < 0 && this.scroll > this.minScroll + 8) {
      const hint = this.add.text(w / 2, v.height - v.safe.bottom - 18, `⌄  ${COPY.moreBelow}`, {
        fontFamily: "system-ui", fontSize: "15px", color: "#fff59d", fontStyle: "bold",
        backgroundColor: "#16351c", padding: { x: 12, y: 5 },
      }).setOrigin(.5, 1).setDepth(60);
      hint.setAlpha(.94);
    }
  }

  private sectionLabel(x: number, y: number, text: string): void {
    const label = this.add.text(x, y, text, { fontFamily: "system-ui", fontSize: "20px", color: "#c8e6c9", fontStyle: "bold" }).setOrigin(0.5);
    this.layer?.add(label);
  }

  private slider(left: number, y: number, width: number, labelTextValue: string, value: number, onChange: (v: number) => void): void {
    const labelW = Math.min(150, width * 0.32);
    const trackW = Math.max(160, width - labelW - 18);
    const trackX = left + labelW + trackW / 2;
    const label = this.add.text(left, y, labelTextValue, { fontFamily: "system-ui", fontSize: "18px", color: "#f4f1de", fontStyle: "bold" }).setOrigin(0, 0.5);
    const bar = this.add.rectangle(trackX, y, trackW, 40, 0x102418).setStrokeStyle(3, 0xf4f1de).setInteractive();
    const fill = this.add.rectangle(trackX - trackW / 2, y, trackW * value, 30, 0x81c784).setOrigin(0, 0.5);
    const knob = this.add.circle(trackX - trackW / 2 + trackW * value, y, 21, 0xf4f1de).setStrokeStyle(4, 0x2e7d32);
    const update = (p: Phaser.Input.Pointer) => {
      const next = Phaser.Math.Clamp((p.x - (trackX - trackW / 2)) / trackW, 0, 1);
      fill.width = trackW * next;
      knob.x = trackX - trackW / 2 + trackW * next;
      onChange(next);
    };
    bar.on("pointerdown", update);
    bar.on("pointermove", (p: Phaser.Input.Pointer) => { if (p.isDown) update(p); });
    registerAccessibleControl(this, bar, `${labelTextValue}, ${Math.round(value * 100)} percent`, () => {
      const next = value >= .95 ? 0 : Math.min(1, value + .1);
      fill.width = trackW * next;
      knob.x = trackX - trackW / 2 + trackW * next;
      onChange(next);
      setAccessibleLabel(bar, `${labelTextValue}, ${Math.round(next * 100)} percent`);
    });
    this.layer!.add([label, bar, fill, knob]);
  }
}
