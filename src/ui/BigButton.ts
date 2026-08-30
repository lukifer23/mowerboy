import Phaser from "phaser";
import { registerAccessibleControl } from "../systems/Accessibility";

export function bigButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  texture: string,
  label: string,
  onClick: () => void,
  size = 88
): Phaser.GameObjects.Container {
  const img = scene.add.image(0, 0, texture).setDisplaySize(size, size);
  img.setInteractive({ useHandCursor: true, pixelPerfect: false });
  const text = scene.add
    .text(0, size * 0.58, label, {
      fontFamily: 'system-ui, "Trebuchet MS", sans-serif',
      fontSize: `${Math.max(14, size * 0.18)}px`,
      color: "#f4f1de",
      stroke: "#16351c",
      strokeThickness: 4,
      align: "center",
    })
    .setOrigin(0.5, 0);
  const c = scene.add.container(x, y, [img, text]);
  c.setSize(size, size);
  const fire = (p?: Phaser.Input.Pointer) => {
    p?.event?.preventDefault?.();
    img.setDisplaySize(size, size);
    onClick();
  };
  img.on("pointerup", fire);
  img.on("pointerdown", () => img.setDisplaySize(size * 0.92, size * 0.92));
  img.on("pointerout", () => img.setDisplaySize(size, size));
  c.setDepth(10);
  registerAccessibleControl(scene, c, label, fire);
  return c;
}

export function labelText(scene: Phaser.Scene, x: number, y: number, msg: string, size = 28): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, msg, {
      fontFamily: 'system-ui, "Trebuchet MS", sans-serif',
      fontSize: `${size}px`,
      color: "#f4f1de",
      stroke: "#102418",
      strokeThickness: 5,
      align: "center",
    })
    .setOrigin(0.5)
    .setDepth(10);
}
