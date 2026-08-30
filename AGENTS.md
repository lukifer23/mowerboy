# Agent handoff — MowerBoy

Read this before changing anything. This is a real accessibility-focused game. The fun is the machine, the engine, and watching tall grass become stripes. Complexity belongs in **content** (more yards, more machines), not in the verb.

Full architecture: [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).  
Locked play rules: [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md).  
Parent runbook: [`README.md`](README.md).
Delivery status: [`docs/ROADMAP.md`](docs/ROADMAP.md).
Current browser/Fold evidence: [`docs/QA.md`](docs/QA.md).

## Why it exists

MowerBoy is a touch-first machine game for simple tablet play, hosted from a Mac or Windows PC on the local network. It must be beautiful, fully wired (no stubs), and impossible to “lose.”

## Locked product decisions (do not reverse)

| Decision | Choice |
|---|---|
| Default control | **Magnet drive** — finger on screen = drive toward that point; lift = gentle stop |
| Failure | **Never.** No timers, no damage, no game over, no lives, no score that goes down |
| UI language | Pictures first, short labels under buttons (`src/data/copy.ts`) |
| Look | Cute but recognizably real machines. Original names. **No trademarked brands** (no Deere logos, etc.) |
| Host | Browser game. `npm start` binds `0.0.0.0:5173` and prints a LAN URL + QR |
| Hit targets | ~80px+ |

Other control schemes still ship in Settings: `tap`, `cruise`, `pad`. Every machine and yard is open on first launch; never add progression gates.

Do **not** add: accounts, cloud, ads, analytics, competitive multiplayer, photoreal 3D, fail states.

## Stack

- Phaser **3.x** (lockfile currently 3.90.0) + TypeScript + Vite 8
- Web Audio engine synthesized in `src/systems/AudioEngine.ts` (no sample files required)
- In-world mowers use transparent top-down art in `public/assets/mowers/<id>.png` plus runtime mechanics; `drawMower.ts` is the resilient canvas fallback
- Save: `localStorage` key `mowerboy-save-v1`
- PWA: `public/manifest.webmanifest` + `public/sw.js`
- Tests: Vitest 4 for pure functions plus Playwright 1.62 for real Chrome canvas/touch flows

```bash
npm install
npm start          # LAN + QR
npm test
npm run test:e2e
npm run build
npm run verify
```

Port **5173**, `strictPort: true`. iOS: audio unlocks on first pointer; `touch-action: none`; `touchmove` is `preventDefault`’d in `src/main.ts`.

## Map of the code

```
src/
  main.ts                 boot, SW, iOS gesture lock, audio unlock
  game.ts                 Phaser.Game (Scale.RESIZE)
  scenes/
    BootScene.ts          generates icon/mower canvases, loads portraits
    TitleScene.ts         tap lawn / Play to start Home Yard
    GarageScene.ts        swipeable mower cards
    MapScene.ts           20 yards + wander + Free mow
    PlayScene.ts          the toy (world + HUD cameras)
    VacuumGarageScene.ts  swipeable vacuum cards
    RoomMapScene.ts       12 always-open rooms
    VacuumPlayScene.ts    indoor cleaning toy
    SettingsScene.ts
  systems/
    grassMath.ts          cut/grow/completion — tested
    GrassField.ts         canvas texture, dirty-cell paint, stripes
    Layout.ts             ASCII map → grass + rounded paths + shaped props/fences + pickups
    Mower.ts              pose + illustrated sprite + runtime mechanics
    drawMower.ts          vector silhouettes per kind
    TouchDrive.ts         magnet / tap / cruise / pad + WASD
    AudioEngine.ts        throttle-pitched engine + cut layer
    Save.ts               localStorage + migrate
    palette.ts            terrains + high-contrast
    props.ts              environment art + shape-aware gentle collision
    worldGeometry.ts      circle/ellipse/rotated-rectangle geometry — tested
    debrisMath.ts         deterministic suction/pull/clean/helper math — tested
    RoomLayout.ts         floor materials + authored furniture
    DebrisField.ts        nine rendered debris types + suction sync
    Vacuum.ts             vacuum pose + wheel/brush animation
    icons.ts              procedural HUD circles
  data/                   mowers, levels, powerups, vacuums, rooms, copy
  gen/wander.ts           seeded extra yards
  ui/BigButton.ts         80px+ picture buttons
scripts/gateway.mjs       production host dashboard, LAN URLs, browser QR, health, optional HTTPS
scripts/soak.mjs          Fold-sized Mow/Vacuum lifecycle and heap soak
e2e/fold-touch.spec.ts    real Chrome touch, resize, Safe Home, canvas coverage
e2e/continuity.spec.ts    controls, gallery gestures, room continuity, canvas warning regressions
public/assets/            title/icon, machine art, environment art, portraits
```

Scenes: `boot` → `title` → `play` | `garage` | `map` | `vacuum-play` | `vacuum-garage` | `room-map` | `settings`.

PlayScene data: `{ levelId?, freeMow?, wander? }`.

## Grass

Each cell: `Uint8Array` height (`0` cut … `4` wild, `255` void) + stripe heading. Deck is a rotated rectangle in `cutWithDeck`. Completion = cut / mowable. Yard celebrates at **88%**; Home still works. Helper wand (`helperSweep`) cuts remaining cells. Free mow slowly regrows; Rain is a full-duration visible shower and only regrows grass in Free mow.

Authored maps are rectangular and enclosed. `CELL = 7` with `MAP_SCALE = 21`, so each source character expands to a fine 147×147-world-unit grass block. Connected `D`/`=` nodes are rasterized into rounded paths instead of square tiles; perimeter and internal `#` runs become grouped fence segments. Map letters (see `Layout.ts` / `levels.ts`):

`.` tall · `w` wild · `,` medium · `_` cut · `#` fence · `T` tree · `I` pine · `F` flowers · `B` flower bed · `R` rock · `O` pond · `H` house · `D`/`=` rounded path · `G` hedge · `K` shed · `A` barn · `C` bridge · `E` equipment · `Y` hay · `L` bench · `Q` soccer goal · `S` start · `P` powerup

## Controls (`TouchDrive`)

- `magnet` (default): pointer down → steer toward world point, throttle up; up → brake
- `tap`: tap sets a waypoint; auto-drive until close
- `cruise`: always throttle 1; pointer only steers
- `pad`: on-screen arrows; also WASD / arrows for the parent

PlayScene ignores HUD clicks via `setTopOnly(true)` plus interactive buttons.

## Audio

One `AudioEngine` singleton. `unlock()` on first pointer (iOS). Engine = filtered noise + oscillators, rate/gain from throttle. Cut layer while cells are actually cutting. `setProfile(mower.engine)` per machine. Volumes from save: master / engine / world + mute. Keep a silent oscillator alive so iOS does not suspend loops.

## Dual camera — easy to break

`PlayScene` uses **two cameras**:

- `cameras.main` — world, zoomed, follows the mower
- `uiCam` — HUD at zoom 1, scroll 0

Phaser `setScrollFactor(0)` does **not** ignore zoom. HUD was invisible until the UI camera existed.

When you add a **world** object: `this.uiCam.ignore(obj)`.  
When you add a **HUD / overlay** object: `this.pinUI(obj)` (ignores it on main).

`bindCameras()` runs at the end of `create`. Anything spawned later (sparkles, pause layer, celebration) must be pinned the same way.

Zoom is **cover** the yard (`fitZoom`) so the lawn fills the screen; camera follows. Do not drop zoom so the yard sits in a corner with empty background.

## Save

`src/systems/Save.ts`, key `mowerboy-save-v1`. The version-5 schema stores preferences plus mowing and vacuum continuity, including a discriminated authored/generated selected yard and the selected room. Every machine, yard, and room is always open. Migration preserves useful older choices while discarding legacy lock and currency-like fields. Never throw if `localStorage` is blocked.

## Content how-to

**Mower:** add a `MowerDef` in `src/data/mowers.ts`, a top-down transparent `public/assets/mowers/<id>.png`, and a garage portrait at `public/assets/portraits/<id>.jpg`. If `kind` is new, also cover it in `drawMower.ts` so the resilient fallback remains complete.

**Yard:** add a `LevelDef` in `src/data/levels.ts` with a `terrain` from `palette.ts`. Keep a `S`tart. Tests expect **20** authored levels, **14** mowers, and **8** powerups — update `src/data/mowers.test.ts` if those counts change.

**Powerup:** `src/data/powerups.ts` + handling in `PlayScene.activate` / `hasPower`.

**Vacuum:** eight machines in `src/data/vacuums.ts`, twelve rooms in `src/data/rooms.ts`, and the material-aware cleaning model in `src/systems/debrisMath.ts`. Vacuum is child-facing and must retain its galleries, dedicated scene/audio/VFX, helper, Safe Home, and all 96 machine/room pairings.

**Copy:** short labels only, in `src/data/copy.ts`.

## Tests

```bash
npm test
```

Covers 85 checks: grass cut/grow/completion, save migration, shape-aware world geometry, rounded paths/grouped fences, obstacle footprint masking/pickup safety, fourteen always-open mowers / twenty fresh-start yards / eight powerups, clustered vacuum debris, eight vacuums / twelve rooms, and wander seed stability.

`npm run test:e2e` runs 42 passing Chrome checks across phone portrait, phone landscape, Fold inner browser, Fold inner fullscreen, and tablet sizes (plus 48 intentional project skips so heavyweight matrices run only once). It drives both first-run tutorials through their visible Play buttons, both activities with held touch, all four control schemes, two simultaneous cold clients, keyboard/screen-reader mirrors, gallery swipes, Settings toggles without scroll jumps, latest-yard/latest-room continuity, HUD touch exclusion, progress and release-to-stop, Safe Home, Pause/Resume, Quiet, Finish, every gallery/Settings screen, every machine's production art, every authored yard/room startup, fresh-yard progress, and live resize. `npm run test:offline` proves the fingerprinted production shell and all 59 manifest assets reopen offline in both activities. `npm run test:soak` alternates both activities with full decorative animation for five minutes and records heap/error evidence in `.gstack/soak/latest.json`. `npm run test:fold -- --url=... --drag=x1,y1,x2,y2` attaches only to an existing Fold Chrome MowerBoy tab, has bounded connection/command timeouts, and never opens a browser.

The explicit `?test=1` routes expose a read-only `window.__MOWERBOY_TEST__.snapshot()` bridge. It reports real active-scene, machine, progress, camera, and viewport values; it does not replace or mock simulation.

Manual device check remains required: title → Full screen → Mow/Vacuum → held drag → transformed surface → release → Home. A title screenshot is not a play pass.

## Known sharp edges

- Boot loads only the selected machine plus title assets. Galleries and activity scenes queue their own production art. All fourteen mowers and all eight vacuums have transparent world illustrations; canvas renderers remain complete recovery fallbacks.
- Title: tap open lawn above the bottom dock still starts Home Yard. The two activity cards start Mow/Vacuum; the dock is Mowers / Yards / Vacuums / Rooms.
- Tutorial blocks simulation until dismissed (`update` returns early if `tutLayer`).
- `qrcode-terminal` is **0.12.0** (not 0.12.2 — that version is `@types` only).
- Do not introduce Phaser 4 without a dedicated pass; this is 3.x API (`add.particles`, `explode`, `Scale.RESIZE`).

## Definition of done for a change

- Still no fail / trap / timer
- One-finger default still works on a phone-sized viewport
- Home still always visible (UI camera)
- Engine still pitches with throttle
- `npm run verify` passes
- If you touched play/HUD/layout, actually drive a yard; a title screenshot is not enough
