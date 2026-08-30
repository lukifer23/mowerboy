import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { GarageScene } from "./scenes/GarageScene";
import { MapScene } from "./scenes/MapScene";
import { PlayScene } from "./scenes/PlayScene";
import { SettingsScene } from "./scenes/SettingsScene";
import { VacuumPlayScene } from "./scenes/VacuumPlayScene";
import { VacuumGarageScene } from "./scenes/VacuumGarageScene";
import { RoomMapScene } from "./scenes/RoomMapScene";

export function createGame(parent: string | HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#143018",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
      autoRound: true,
    },
    input: {
      activePointers: 3,
      touch: { capture: true },
    },
    render: {
      antialias: true,
      roundPixels: false,
      powerPreference: "high-performance",
    },
    audio: { disableWebAudio: false },
    scene: [BootScene, TitleScene, GarageScene, MapScene, PlayScene, VacuumPlayScene, VacuumGarageScene, RoomMapScene, SettingsScene],
    banner: false,
  });
}
