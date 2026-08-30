/// <reference types="vite/client" />

interface Window {
  __MOWERBOY_TEST__?: {
    snapshot: () => {
      activeScenes: string[];
      width: number;
      height: number;
      machine: { x: number; y: number; heading: number; throttle: number; speed: number } | null;
      progress: number | null;
      locationId: string | null;
      cameraZoom: number | null;
      diagnostics: {
        viewport: { width: number; height: number };
        playableRect: { x: number; y: number; width: number; height: number };
        hud: {
          size: number; y: number; secondaryY: number; progressX: number; progressY: number;
          homeX: number; pauseX: number; muteX: number; finishX: number;
          playableRect: { x: number; y: number; width: number; height: number };
        };
        camera: { zoom: number; worldView: { x: number; y: number; width: number; height: number } };
        machine: {
          screenBounds: { x: number; y: number; width: number; height: number };
          assetMode: "production" | "fallback";
        };
        input: {
          scheme: "magnet" | "tap" | "cruise" | "pad";
          owner: "none" | "pointer" | "waypoint" | "pad";
          pointerId: number | null;
          target: { x: number; y: number } | null;
          pad: { up: boolean; down: boolean; left: boolean; right: boolean };
        };
        lifecycle: {
          cameras: number;
          textures: number;
          tweens: number;
          inputListeners: number;
          frameMs: { samples: number; p50: number; p95: number; worst: number };
        };
      } | null;
      boot: { phase: "loading" | "ready"; milliseconds: number | null; recovery: "none" | "fallback" };
      selectedPlace: { kind: "authored"; id: string } | { kind: "wander"; seed: number };
      audio: { state: string; persistentSources: number };
      resources: { dynamicTextures: number; activeCameras: number };
      render: { machineTexture: string | null; propKinds: string[] };
      ui: { galleryIndex: number | null; scrollOffset: number | null };
      flags: { paused: boolean; tutorial: boolean; helperOn: boolean; celebrated: boolean };
    };
  };
}
