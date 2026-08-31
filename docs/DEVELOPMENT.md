# Development

Companion to [`AGENTS.md`](../AGENTS.md). This file is the architecture and “how to add content” guide.

## Stack

| Piece | Choice |
|---|---|
| Engine | Phaser 3.x (`package-lock.json` currently resolves 3.90.0) |
| Language | TypeScript, `strict`, `noEmit` via `tsc` |
| Bundler | Vite 8.2, `base: "./"`, host `0.0.0.0`, port **5173** `strictPort` |
| LAN | `scripts/gateway.mjs` — production server, stale-build detection, health/readiness, IPv4 URLs, terminal/browser QR, optional HTTPS, clean shutdown |
| Audio | Web Audio API, runtime graph (no mp3/ogg required) |
| Save | `localStorage["mowerboy-save-v1"]` |
| PWA | `public/manifest.webmanifest`, `public/sw.js` registered from `src/main.ts` |
| Tests | Vitest 4 pure-function tests + Playwright 1.62 real Chrome canvas/touch tests |

Game config: `src/game.ts` — `Phaser.Scale.RESIZE`, 3 pointers, antialias, parent `#app`.

## Scene flow

```
boot → title
         ├─ play { levelId, freeMow?, wander? }
         ├─ garage / map
         ├─ vacuum-play { roomId }
         ├─ vacuum-garage / room-map
         └─ settings
```

`BootScene` always generates procedural HUD icons and complete recovery machine cards, then loads only:

- `assets/title.jpg`
- `assets/icon.png`
- the currently selected mower and vacuum world images

`AssetCatalog.ts` owns activity-scoped loading. `PlayScene` queues mowing terrain/prop art plus the selected mower, `VacuumPlayScene` queues the selected vacuum, and each garage queues its own gallery. This keeps Vacuum art out of mowing startup and avoids the former all-assets-at-boot transfer.

Every activity and gallery shows a visible loading overlay. Failed raster loads are recorded and select the complete procedural machine renderer rather than leaving a blank canvas; the recovery state is exposed only through parent/test diagnostics.

## PlayScene (the important one)

Owns the session: layout → grass texture → props → mower → magnet drive → pickups → HUD.

### Two cameras

| Camera | Role |
|---|---|
| `cameras.main` | World. Bounds = yard. Follows mower. Zoom = cover the yard (`fitZoom`). |
| `uiCam` | HUD / tutorial / pause / celebration. Zoom 1, scroll 0. |

`setScrollFactor(0)` **does not** cancel zoom. Always:

- World sprite → `this.uiCam.ignore(obj)`
- Overlay → `this.pinUI(obj)` → `cameras.main.ignore`

`bindCameras()` at the end of `create` covers the initial set. Anything spawned later (sparkles, pause layer) must be pinned too.

### Simulation

Each frame (unless paused / tutorial / celebration):

1. `TouchDrive.update`
2. Shape-aware gentle collision vs props (slide, never hard-stop)
3. Clamp to world
4. `Mower.update` (move + repaint wheels)
5. `GrassField.cutMower` with deck size (wide powerup) and mulch flag
6. Optional helper sweep / flock nibble
7. Audio throttle + cut intensity
8. Clipping particles (skipped if `reducedMotion`)
9. Pickups, joyful sparkles, powerup expiry
10. Free-mow grow
11. Pie = `grass.percent`; celebrate once at ≥ 0.88 if not free-mow

Celebration does **not** eject the player; overlays **Again** and **Yards**. Home always works.

## Grass model

Pure math: `src/systems/grassMath.ts` (unit tested).

| Height | Meaning |
|---|---|
| 0 | Cut (stores stripe bin 0–7 in `heading[]`) |
| 1–4 | Short → wild |
| 255 | Void (driveway, under trees, pond, fence) — not mowable |

`GrassField` paints a canvas texture. Dirty cells only, then `tex.update()`. High-contrast palette swaps in from save at construct time (restart the yard after toggling Settings). Rounded path shoulders receive deterministic aggregate and edge shading; water receives sparse reflected highlights.

Every project canvas handed to Phaser's `CanvasTexture` is created with `willReadFrequently: true`. Phaser reads those pixels during texture setup/update; omitting the hint produces a large Chrome warning flood and a slower software-canvas path on phone-class hardware.

Logical grass cell size: `CELL = 7`; authored-map scale: `MAP_SCALE = 21` in `Layout.ts`. A source tile remains about 147 world units while the finer field makes deck curves and cut edges smoother. Forty-cell texture chunks keep texture count below the prior eight-unit grid. Solid prop footprints are masked out so hidden grass never counts toward completion or helper work.

## Machines

`src/data/mowers.ts` — fourteen `MowerDef`s. Every machine is immediately available.

In-world art uses transparent top-down production illustrations plus runtime mechanical overlays; `drawMower.ts` remains the complete generated fallback. Rotation stays consistent for both paths. Machine families include `push`, `riding`, `zeroturn`, `tractor`, and `commercial`.

Handling that actually changes feel: `topSpeed`, `accel`, `brake`, `turnRate`, `deckWidth`, `deckLength`, `deckOffset`. Engine feel: `idleHz`, `maxHz`, `rumble`, `cylinders`.

There are no machine locks or unlock counters. `completeYard()` records history for parent continuity only and never gates content.

## Yards

`src/data/levels.ts` — twenty authored ASCII maps. Terrains: `lush` `dry` `wet` `autumn` `farm` `turf` `night` (palette in `palette.ts`). Every yard is immediately available.

`src/gen/wander.ts` — `mulberry32(seed)` so the same seed is the same yard. Map scene starts play with `{ wander: Date.now() & 0xffff }`.

Free mow: `{ levelId, freeMow: true }` plus slow `grass.grow`. Rain runs a visible full-duration shower; it regrows grass only during Free mow so normal completion never moves backward.

### Map alphabet

| Char | Result |
|---|---|
| `.` | Tall grass |
| `w` | Wild |
| `,` | Medium |
| `_` | Already cut |
| `#` | Void + fence prop on border |
| `T` | Tree (void under) |
| `I` | Conifer |
| `G` | Hedge |
| `K` | Shed |
| `A` | Barn |
| `C` | Traversable bridge over void/water |
| `E` | Parked equipment |
| `F` | Flowers |
| `R` | Rock (grass remains) |
| `O` | Pond |
| `H` | House |
| `D` / `=` | Connected rounded driveway/path surface |
| `Q` | Netted soccer goal with shaped collision |
| `S` | Start + tall grass |
| `P` | Powerup spawn (else Layout auto-places a few) |

## Powerups

Defined in `src/data/powerups.ts`. Applied in `PlayScene.activate` / `hasPower`:

| Id | Effect |
|---|---|
| turbo | `speedMul = 1.45` |
| wide | `deckMul = 1.55` |
| rain | full-duration shower; regrow only in Free mow |
| magnet | sparkles pull from farther |
| rainbow | hue-tint the mower sprite |
| flock | extra tiny cuts beside the deck |
| mulcher | `cutWithDeck(..., mulch=true)` |
| headlights | dusk overlay (`night` rectangle, depth 1) |

Pickups are colored orbs. Not required for progress.

## Input

`TouchDrive` reads `save().control`. Pointer world coords from Phaser. Keyboard keys are created **once** in the constructor (do not `addKey` every frame).

Title: either large activity card starts Mow or Vacuum. Open lawn above the dock still starts Home Yard. Dock is Mowers / Yards / Vacuums / Rooms.

`src/main.ts` also listens for pointer/touch/keydown to `audio.unlock()`, and `preventDefault`s `touchmove` so iOS does not rubber-band.

## Audio

`src/systems/AudioEngine.ts` singleton `audio`.

- `unlock()` creates `AudioContext`, builds graph, and starts looped noise + oscillators only from a real pointer/touch/key gesture. Activity scenes never force an autoplay resume during direct/deep-link startup.
- `setDriveState(...)` drives throttle pitch, cylinder texture, cutting-load droop, blade harmonics, stalk impacts, steering load, and terrain tone
- `blip("pickup" | "honk" | "done" | "tap" | "sparkle")`
- `chirpBird()` occasional
- `applyVolumes()` from save (respects `muted`)

A near-silent keep-alive oscillator stays connected so Safari does not tear down the context mid-yard.

## Save schema

```ts
{
  version: 5,
  selectedMower: "backyard",
  selectedYard: { kind: "authored", id: "home" },
  selectedVacuum: "brightupright",
  selectedRoom: "living",
  completedYards: string[],
  visitedYards: string[],
  cleanedRooms: string[],
  visitedRooms: string[],
  lastActivity: "mow" | "vacuum",
  control: "magnet" | "tap" | "cruise" | "pad",
  volumes: { master, engine, world },  // 0..1
  muted, reducedMotion, highContrast, seenTutorial, seenVacuumTutorial, safeHome
}
```

`migrate()` fills holes, clamps volumes, rejects unknown machine/place IDs, de-duplicates history, and preserves useful older preferences while discarding legacy lock and sparkle-counter fields. `selectedYard` is discriminated so an authored ID or deterministic New Yard seed resumes exactly. Fresh/blocked-storage defaults are deep-independent, so progress or volume mutation cannot alter future defaults. Tests cover mowing and vacuum continuity via `migrateForTest`.

## Vacuum Mode

Vacuum Mode is child-visible from the two-choice home hub and has a separate complete scene family:

- `src/data/vacuums.ts` defines eight original, always-open machines with handling, motor, intake, brush, hose, trailer, axle, and body rig specifications.
- `src/data/rooms.ts` defines twelve always-open places across carpet, rugs, hardwood, tile, and concrete with authored material/debris mixes.
- `src/systems/debrisMath.ts` provides deterministic mess clustering, rectangular intake cleaning, curved pull inputs, material resistance, large-debris tumble state, weighted completion, and no-penalty helper cleanup.
- `VacuumPlayScene` combines `RoomLayout`, `DebrisField`, `Vacuum`, `TouchDrive`, `ActivityHud`, dual cameras, shape-aware furniture collision, grooming/shine trails, suction VFX, dedicated motor/airflow/load audio, tutorial, Safe Home, Pause, Finish, and celebration.
- `VacuumGarageScene` and `RoomMapScene` expose all eight machines and twelve rooms with no locks. The 96 machine/room startup matrix and a real Fold touch-cleaning pass are recorded in `ROADMAP.md`.

## World geometry

`src/systems/worldGeometry.ts` provides pure, tested circle, ellipse, axis-aligned rectangle, and rotated-rectangle containment/collision. `Layout.ts` assigns the appropriate shape to each prop and masks solid footprints from the grass field before automatic pickup placement. `props.ts` resolves the mower against those shapes gently so contact slides rather than trapping the player.

## UI

`BigButton` — circular icon texture + label with one container-sized touch target and pressed feedback. Labels from `copy.ts` only.

Icons are drawn in `icons.ts` (green glossy circle, cream glyph). Boot registers `icon-home`, `icon-pause`, `icon-play`, `icon-mute`, `icon-speaker`, `icon-wand`, `icon-gear`, `icon-check`, `icon-garage`, `icon-map`, plus per-powerup keys.

## Assets on disk

```
public/assets/
  title.jpg              title background (no in-image wordmark — Phaser draws "MowerBoy")
  icon.png               PWA / apple-touch 512
  portraits/<id>.webp    optimized runtime gallery portrait; source art stays outside public
  mowers/<id>.png        all 14 transparent top-down in-world machines
  vacuums/<id>.png       all 8 transparent top-down cleaning machines
  environment/           validated transparent world structures
  *-v2.png               production grass and environmental art
```

HUD icons, grass state, animation, and audio are generated in code. Production mower and environment illustrations live in `public/assets`.

## Add a mower

1. `MowerDef` in `src/data/mowers.ts`
2. Silhouette in `drawMower.ts` if `kind` is new or the machine needs a unique bit (bagger, lights, brush hog)
3. `public/assets/portraits/<id>.webp` — same 3/4 isolated style as the existing portraits; keep the high-quality source under `source-art/portraits/`; production galleries require a portrait while runtime art retains its procedural recovery path
4. If the count is no longer 14, update `src/data/mowers.test.ts`

## Add a yard

1. `LevelDef` in `src/data/levels.ts` (`id`, `name`, `terrain`, `map`)
2. Include `#` border and an `S`
3. If the count is no longer 20, update the test

## Tests

```bash
npm test
```

| File | Asserts |
|---|---|
| `src/systems/grassMath.test.ts` | stripe bins, deck cut, void skip, seeded grow |
| `src/systems/Save.test.ts` | defaults, volume clamp, legacy to version-5 mowing/vacuum migration and authored/generated yard continuity |
| `src/systems/debrisMath.test.ts` | deterministic debris, intake cleaning, material completion, helper |
| `src/systems/worldGeometry.test.ts` | circle, ellipse, rectangle, and rotated-rectangle collision |
| `src/systems/Layout.test.ts` | all authored layouts, solid footprint masks, pickup safety, prop shapes |
| `src/data/mowers.test.ts` | 14 always-open mowers, 20 yards, wander determinism, 8 powerups |
| `src/data/vacuums.test.ts` | 8 always-open vacuums, complete rigs, 12 rooms, all floor types |
| `src/systems/TouchDrive.test.ts` | shortest-turn and assisted touch throttle behavior |
| `src/systems/Viewport.test.ts` | phone, Fold browser/fullscreen/cover CSS sizes, tablet, safe insets, HUD separation |

`npx tsc --noEmit` is part of `npm run build`.

### Browser and Fold-sized regression

```bash
npm run test:e2e
npm run test:soak
```

The browser suite has 47 passing checks and 68 intentional matrix skips at 390×844, 844×390, 832×608, 832×749, and 1024×768. Normal concurrency is capped at two; heavyweight inventory matrices run serially, and a dedicated contract cold-starts two independent clients together. `fold-touch.spec.ts` verifies full-canvas coverage, no scroll, held-touch movement, real grass/debris progress, release-to-stop, Safe Home, and live scene-preserving resize. `content-contracts.spec.ts` runs its full matrix once at Fold fullscreen: every gallery/Settings screen, exact production art for all 22 machines, all 20 yard and 12 room startups, Pause/Resume, Quiet, Finish, exact responsive DOM accessibility mirrors, all room/pad controls, Safe Home announcements, live tutorial relayout, normal/Calm Motion, and the two-client cold start. `continuity.spec.ts` covers both first-run tutorial buttons, all four touch schemes in both activities, gallery swipes, long-screen scrolling, Settings toggle persistence, no accidental selection after a drag, exact selected-yard and selected-room continuity, HUD touch exclusion, and Canvas/AudioContext warning regressions.

`src/data/levels.test.ts` enforces rectangular rows, closed fences, the supported map alphabet, and exactly one start for all authored yards plus 32 deterministic New Yard seeds. `visitYard` and `visitRoom` keep most-recent-first histories so Free Mow and the vacuum garage continue the place the child just chose.

`scripts/soak.mjs` warms both activities, then alternates Mow and Vacuum in one 832×749 browser page for five minutes with Calm Motion off, so wheel/deck/brush, particles, ambience, and transformation effects stay active. Every cycle asserts real movement, transformation, release-to-stop, two-tap Safe Home, bounded post-GC heap growth, p95/worst-frame budgets, and stable per-activity camera/texture/listener counts. Duration comes from the page's monotonic clock; cleanup and timestamped pass/fail output are unconditional. It writes `.gstack/soak/latest.json`.

`scripts/fold-check.mjs` attaches to an existing Fold Chrome MowerBoy tab through forwarded DevTools, optionally navigates that tab, performs a physical-device touch drag, captures actual simulation before/after state plus a screenshot, and reports browser errors. It discovers the current LAN host instead of hard-coding one IP, bounds HTTP/WebSocket/command waits, and deliberately refuses to create a browser.

On explicit `?test=1` URLs, `src/main.ts` exposes a frozen, read-only `window.__MOWERBOY_TEST__.snapshot()` diagnostic. It reads the actual Phaser scene and simulation state and is not present on normal play URLs.

Current evidence and device limitations are recorded in [`QA.md`](QA.md).

## Verify a play/HUD change

A title screenshot is not enough.

1. `npm start` → title → Play
2. Dismiss the three tutorial lines
3. Drag: mower turns, engine should be audible after a tap, grass lightens in a stripe
4. Home still in the corner after zoom
5. Narrow viewport (~390×844): four HUD buttons still on screen
6. Rotate or resize while playing: scene and progress remain, controls relayout
7. Settings persist across reload (localStorage)

## PWA and local security

`src/data/asset-manifest.json` is the canonical catalog for all 59 production assets and their core, mow, and vacuum packs; the build synchronizes its public copy. `scripts/release-manifest.mjs` emits `ReleaseManifestV2`, fingerprints every built file with SHA-256 and byte size, assigns activity packs only from that catalog, and enforces the 17 MiB release ceiling. The service worker verifies/stages packs independently, promotes only a valid core atomically, serves normal requests only from the active release, retains one verified prior release for rollback, and prunes older releases. `npm run test:sw-upgrade` executes the real worker code with deterministic network/cache failure injection; `npm run test:offline` separately uses installed Chrome, validates the exact active cache inventory, disables networking, and opens real Mow and Vacuum scenes with production art. `localhost` is a secure-context exception; a plain `http://192.168.…` LAN address is not. Fullscreen is the supported chrome-free path on plain LAN HTTP. Do not promise Android PWA installation until optional trusted certificates have been validated on the parent machine and device.

## Production family gateway

`npm start` launches `scripts/gateway.mjs`, not the Vite development server. It validates Node and the lockfile, installs locked dependencies only when required, rebuilds when the source release hash is stale, prefers `0.0.0.0:5173`, serves an app-identified `/healthz`, and opens `/host`. Health exposes the source fingerprint that produced the running build. When the default port belongs to another program or an older MowerBoy checkout, family launch scans a bounded range and opens a current dashboard on the first available port; an explicitly supplied `PORT` remains strict. A repeated default launch reuses an existing MowerBoy dashboard only when its fingerprint matches the current checkout. The host page stays readable while setup runs, then shows the computer URL, usable LAN URLs, and a scannable QR code. `PORT`, `MOWERBOY_HOST`, `MOWERBOY_CERT`, and `MOWERBOY_KEY` configure it; certificate and key must be supplied together.

On Windows, `Install MowerBoy Shortcut.cmd` creates a desktop shortcut whose hidden VBScript launcher starts the gateway without leaving a terminal open. `MowerBoy.cmd` is the visible diagnostic fallback. `MowerBoy.command` is the macOS launcher. All launch paths converge on the same gateway rather than duplicating hosting behavior.

## Out of scope unless the parent asks

Accounts, cloud save, App Store wrap, 3D, brand replicas, fail states, ads.
