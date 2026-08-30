import type Phaser from "phaser";
import { MOWERS } from "../data/mowers";
import { VACUUMS } from "../data/vacuums";
import catalog from "../data/asset-manifest.json";

export interface LoadOverlay {
  readonly failed: string[];
  destroy(): void;
}

/**
 * Paints a real child-safe loading state before Phaser starts decoding art.
 * It intentionally uses no textures, so it is also visible when an asset is
 * corrupt or the LAN connection is interrupted mid-request.
 */
export function showLoadOverlay(scene: Phaser.Scene, label = "Getting ready"): LoadOverlay {
  const width = scene.scale.width;
  const height = scene.scale.height;
  const layer = scene.add.container(0, 0).setDepth(10_000);
  const bg = scene.add.rectangle(width / 2, height / 2, width, height, 0x143018, 1);
  const machine = scene.add.circle(width / 2, height / 2 - 32, 34, 0x66bb6a, 1)
    .setStrokeStyle(5, 0xf4f1de);
  const blade = scene.add.rectangle(width / 2, height / 2 - 32, 42, 7, 0xf4f1de);
  const title = scene.add.text(width / 2, height / 2 + 34, label, {
    fontFamily: 'system-ui, "Trebuchet MS", sans-serif',
    fontSize: "26px",
    fontStyle: "bold",
    color: "#f4f1de",
    stroke: "#102418",
    strokeThickness: 5,
  }).setOrigin(0.5);
  const progress = scene.add.text(width / 2, height / 2 + 76, "0%", {
    fontFamily: "system-ui",
    fontSize: "18px",
    color: "#c8e6c9",
  }).setOrigin(0.5);
  layer.add([bg, machine, blade, title, progress]);
  const failed: string[] = [];
  const onProgress = (value: number) => progress.setText(`${Math.round(value * 100)}%`);
  const onError = (file: Phaser.Loader.File) => failed.push(file.key);
  scene.load.on("progress", onProgress);
  scene.load.on("loaderror", onError);
  scene.tweens.add({ targets: blade, angle: 360, duration: 850, repeat: -1, ease: "Linear" });
  return {
    failed,
    destroy: () => {
      scene.load.off("progress", onProgress);
      scene.load.off("loaderror", onError);
      scene.tweens.killTweensOf(blade);
      layer.destroy(true);
    },
  };
}

const catalogUrls = [...catalog.core, ...catalog.mow, ...catalog.vacuum];
const idsIn = (folder: string, extension: string) => new Set(catalogUrls.filter((url) => url.includes(`/assets/${folder}/`) && url.endsWith(extension)).map((url) => url.split("/").at(-1)!.replace(extension, "")));
export const ILLUSTRATED_MOWERS = idsIn("mowers", ".png");
const MOWER_PORTRAITS = new Set(MOWERS.filter((mower) => catalogUrls.includes(`./assets/portraits/${mower.id}.jpg`)).map((mower) => mower.id));
const VACUUM_PORTRAITS = new Set(VACUUMS.filter((vacuum) => catalogUrls.includes(`./assets/portraits/${vacuum.id}.jpg`)).map((vacuum) => vacuum.id));

const WORLD_ASSETS = [
  ["grass-detail", "assets/grass-lush-v2.png"], ["grass-cut-detail", "assets/grass-cut-v2.png"],
  ["fence-cedar", "assets/fence-cedar-v2.png"], ["prop-art-tree", "assets/tree-canopy-v2.png"],
  ["prop-art-pond", "assets/pond-v2.png"], ["prop-art-flower", "assets/flowerbed-v2.png"],
  ["prop-art-house", "assets/house-v2.png"], ["prop-art-rock", "assets/rock-v2.png"],
  ["prop-art-tree-autumn", "assets/tree-autumn-v2.png"], ["prop-art-tree-dry", "assets/tree-dry-v2.png"],
  ["prop-art-hay", "assets/hay-bales-v2.png"], ["prop-art-bench", "assets/park-bench-v2.png"],
  ["prop-art-barn", "assets/environment/barn-red-v3.png"],
] as const;

function image(scene: Phaser.Scene, key: string, url: string): void {
  if (!scene.textures.exists(key)) scene.load.image(key, url);
}

export function queueMowingWorldAssets(scene: Phaser.Scene): void {
  for (const [key, url] of WORLD_ASSETS) image(scene, key, url);
}

export function queueMowerAsset(scene: Phaser.Scene, id: string, portrait = false): void {
  if (!ILLUSTRATED_MOWERS.has(id)) return;
  image(scene, `mower-world-${id}`, `assets/mowers/${id}.png`);
  if (portrait && MOWER_PORTRAITS.has(id)) image(scene, `portrait-${id}`, `assets/portraits/${id}.jpg`);
}

export function queueMowerGalleryAssets(scene: Phaser.Scene): void {
  for (const mower of MOWERS) queueMowerAsset(scene, mower.id, true);
}

export function queueVacuumAsset(scene: Phaser.Scene, id: string, portrait = false): void {
  if (VACUUMS.some((vacuum) => vacuum.id === id)) image(scene, `vacuum-world-${id}`, `assets/vacuums/${id}.png`);
  if (portrait && VACUUM_PORTRAITS.has(id)) image(scene, `vacuum-portrait-${id}`, `assets/portraits/${id}.jpg`);
}

export function queueVacuumGalleryAssets(scene: Phaser.Scene): void {
  for (const vacuum of VACUUMS) queueVacuumAsset(scene, vacuum.id, true);
}
