import Phaser from "phaser";
import { POWERUPS } from "../data/powerups";
import { makeIconTexture, GLYPHS } from "../systems/icons";
import { audio } from "../systems/AudioEngine";
import { save } from "../systems/Save";
import { mowerById } from "../data/mowers";
import { queueMowerAsset, queueVacuumAsset, showLoadOverlay, type LoadOverlay } from "../systems/AssetCatalog";

function addCanvas(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

export class BootScene extends Phaser.Scene {
  private loading?: LoadOverlay;

  constructor() {
    super("boot");
  }

  preload(): void {
    performance.mark("mowerboy-boot-start");
    this.loading = showLoadOverlay(this, "Starting MowerBoy");
    this.load.image("title-art", "assets/title.jpg");
    this.load.image("app-icon", "assets/icon.png");
    queueMowerAsset(this, save().selectedMower, true);
    queueVacuumAsset(this, save().selectedVacuum, true);
    this.load.on("loaderror", () => {
      /* missing optional art is fine — procedural fallbacks exist */
    });
  }

  create(): void {
    this.loading?.destroy();
    performance.mark("mowerboy-boot-ready");
    performance.measure("mowerboy-boot", "mowerboy-boot-start", "mowerboy-boot-ready");
    const iconKeys: [string, string][] = [
      ["icon-home", "home"],
      ["icon-pause", "pause"],
      ["icon-play", "play"],
      ["icon-mute", "mute"],
      ["icon-speaker", "speaker"],
      ["icon-wand", "wand"],
      ["icon-gear", "gear"],
      ["icon-check", "check"],
      ["icon-garage", "garage"],
      ["icon-map", "map"],
      ["icon-mower", "mower"],
      ["icon-vacuum", "vacuum"],
      ["icon-yard", "yard"],
      ["icon-room", "room"],
      ["icon-rain", "rain"],
      ["icon-turbo", "turbo"],
      ["icon-fullscreen", "fullscreen"],
    ];
    for (const [key, glyph] of iconKeys) addCanvas(this, key, makeIconTexture(glyph, 160));

    for (const p of POWERUPS) {
      const key = `icon-${p.id}`;
      if (!this.textures.exists(key)) {
        const glyph = p.id in GLYPHS ? p.id : "play";
        addCanvas(this, key, makeIconTexture(glyph, 128, p.color));
      }
    }

    audio.setProfile(mowerById(save().selectedMower).engine);
    audio.applyVolumes();
    void save();
    const params = new URLSearchParams(window.location.search);
    const testScreen = params.get("test") === "1" ? params.get("screen") : null;
    if (testScreen === "mowers") this.scene.start("garage");
    else if (testScreen === "yards") this.scene.start("map");
    else if (testScreen === "vacuums") this.scene.start("vacuum-garage");
    else if (testScreen === "rooms") this.scene.start("room-map");
    else if (testScreen === "settings") this.scene.start("settings");
    else if (params.get("activity") === "mow" && params.get("test") === "1") {
      this.scene.start("play", { levelId: params.get("level") ?? "home", mowerId: params.get("mower") ?? undefined });
    } else if (params.get("activity") === "vacuum" && params.get("test") === "1") {
      const screen = params.get("screen");
      if (screen === "garage") this.scene.start("vacuum-garage");
      else if (screen === "rooms") this.scene.start("room-map");
      else this.scene.start("vacuum-play", { roomId: params.get("room") ?? "living", vacuumId: params.get("vacuum") ?? undefined });
    } else this.scene.start("title");
  }
}
