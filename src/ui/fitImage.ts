import type Phaser from "phaser";

/** Aspect-preserving containment for portraits and unusually thin world art. */
export function fitImageInside(image: Phaser.GameObjects.Image, maxWidth: number, maxHeight: number): void {
  const source = image.texture.getSourceImage() as { width?: number; height?: number };
  const width = Math.max(1, source.width ?? image.width);
  const height = Math.max(1, source.height ?? image.height);
  const scale = Math.min(maxWidth / width, maxHeight / height);
  image.setDisplaySize(width * scale, height * scale);
}
