import Phaser from "phaser";

interface AccessibleControl {
  button: HTMLButtonElement;
  destroy: () => void;
}

const controls = new WeakMap<Phaser.GameObjects.GameObject, AccessibleControl>();
const sceneControls = new WeakMap<Phaser.Scene, Set<AccessibleControl>>();
let liveRegion: HTMLDivElement | undefined;

type BoundsObject = Phaser.GameObjects.GameObject & {
  active: boolean;
  getBounds(): Phaser.Geom.Rectangle;
};

function layer(): HTMLDivElement {
  let root = document.getElementById("mowerboy-a11y") as HTMLDivElement | null;
  if (!root) {
    root = document.createElement("div");
    root.id = "mowerboy-a11y";
    root.setAttribute("aria-label", "MowerBoy controls");
    document.body.append(root);
  }
  return root;
}

/** Mirrors a canvas control into the accessibility tree without stealing touch. */
export function registerAccessibleControl(
  scene: Phaser.Scene,
  object: BoundsObject,
  label: string,
  activate: () => void
): void {
  if (controls.has(object) || typeof document === "undefined") return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mowerboy-a11y-control";
  button.setAttribute("aria-label", label);
  button.title = label;
  button.addEventListener("click", activate);
  layer().append(button);
  let destroyed = false;
  const sync = () => {
    if (!object.active) return;
    const bounds = object.getBounds();
    button.style.left = `${Math.round(bounds.x)}px`;
    button.style.top = `${Math.round(bounds.y)}px`;
    button.style.width = `${Math.max(44, Math.round(bounds.width))}px`;
    button.style.height = `${Math.max(44, Math.round(bounds.height))}px`;
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
  const record: AccessibleControl = { button, destroy: () => undefined };
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, sync);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, destroy);
    object.off(Phaser.GameObjects.Events.DESTROY, destroy);
    button.remove();
    controls.delete(object);
    sceneControls.get(scene)?.delete(record);
  };
  record.destroy = destroy;
  controls.set(object, record);
  const owned = sceneControls.get(scene) ?? new Set<AccessibleControl>();
  owned.add(record);
  sceneControls.set(scene, owned);
  object.once(Phaser.GameObjects.Events.DESTROY, destroy);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destroy);
  sync();
}

/** Removes every DOM mirror owned by a scene before a responsive full redraw. */
export function clearSceneAccessibleControls(scene: Phaser.Scene): void {
  const owned = sceneControls.get(scene);
  if (!owned) return;
  for (const control of [...owned]) control.destroy();
  sceneControls.delete(scene);
}

export function setAccessibleLabel(object: Phaser.GameObjects.GameObject, label: string): void {
  const control = controls.get(object);
  if (!control) return;
  control.button.setAttribute("aria-label", label);
  control.button.title = label;
}

export function announce(message: string): void {
  if (typeof document === "undefined") return;
  if (!liveRegion) {
    liveRegion = document.createElement("div");
    liveRegion.className = "mowerboy-live-region";
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    document.body.append(liveRegion);
  }
  liveRegion.textContent = message;
}
