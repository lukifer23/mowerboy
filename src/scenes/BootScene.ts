import Phaser from "phaser";
import { MOWERS } from "../data/mowers";
import { POWERUPS } from "../data/powerups";
import { makeIconTexture, GLYPHS } from "../systems/icons";
import { makeMowerCanvas } from "../systems/drawMower";
import { ensurePropTextures } from "../systems/props";
import { audio } from "../systems/AudioEngine";
import { save } from "../systems/Save";
import { VACUUMS } from "../data/vacuums";
import { makeVacuumCanvas } from "../systems/drawVacuum";
import { queueMowerAsset, queueVacuumAsset } from "../systems/AssetCatalog";

function addCanvas(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    this.load.image("title-art", "assets/title.jpg");
    this.load.image("app-icon", "assets/icon.png");
    queueMowerAsset(this, save().selectedMower);
    queueVacuumAsset(this, save().selectedVacuum);
    this.load.on("loaderror", () => {
      /* missing optional art is fine — procedural fallbacks exist */
    });
  }

  create(): void {
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

    for (const m of MOWERS) {
      addCanvas(this, `mower-card-${m.id}`, makeMowerCanvas(m, 0.2, 0.5));
    }
    for (const vacuum of VACUUMS) addCanvas(this, `vacuum-card-${vacuum.id}`, makeVacuumCanvas(vacuum));

    ensurePropTextures(this);
    audio.setProfile(MOWERS[1].engine);
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
