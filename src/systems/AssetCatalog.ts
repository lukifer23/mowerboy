import type Phaser from "phaser";
import { MOWERS } from "../data/mowers";
import { VACUUMS } from "../data/vacuums";

export const ILLUSTRATED_MOWERS = new Set([
  "sprout", "backyard", "zipturn", "yardking", "wideboy", "farmhand", "storm", "nightowl", "sidekick", "meadowranger",
  "gardenscout", "utilitymate", "fieldgiant", "pivotranger",
]);

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
  if (portrait && !["gardenscout", "utilitymate", "fieldgiant", "pivotranger"].includes(id)) image(scene, `portrait-${id}`, `assets/portraits/${id}.jpg`);
}

export function queueMowerGalleryAssets(scene: Phaser.Scene): void {
  for (const mower of MOWERS) queueMowerAsset(scene, mower.id, true);
}

export function queueVacuumAsset(scene: Phaser.Scene, id: string): void {
  if (VACUUMS.some((vacuum) => vacuum.id === id)) image(scene, `vacuum-world-${id}`, `assets/vacuums/${id}.png`);
}

export function queueVacuumGalleryAssets(scene: Phaser.Scene): void {
  for (const vacuum of VACUUMS) queueVacuumAsset(scene, vacuum.id);
}
