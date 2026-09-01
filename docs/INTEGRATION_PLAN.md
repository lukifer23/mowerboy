# MowerBoy end-to-end integration plan

Approved: 2026-08-28  
Status: in execution — combined hub and complete Vacuum launch set are live; release-polish gates remain  
Source product rules: [`DESIGN.md`](DESIGN.md) and [`ACTIVITY_FLOW.md`](ACTIVITY_FLOW.md)

This plan adds a complete Vacuum activity without removing or weakening mowing. It also closes the bounded outdoor fidelity program. A child never sees unfinished content.

## Execution snapshot — 2026-09-01

- Shared `DriveableMachine`, `TouchDrive`, `ActivityHud`, audio host, Save v5 continuity, and composed activity lifecycle are integrated without merging mow/vacuum simulation.
- The picture-first combined hub, four galleries, 14 mowers, 20 yards, 8 vacuums, 12 rooms, five floors, and nine debris types are child-facing with no locks.
- All 96 vacuum/room startup pairings passed in the controlled browser; Pause, Finish, 88% celebration, and Safe Home passed; a real unfolded Galaxy Fold held-touch pass cleaned 3% of a room.
- The current hardening run passes TypeScript/build, 95 Vitest tests, 47 Playwright checks, canonical 59-asset validation, a sub-17 MiB `ReleaseManifestV2`, deterministic service-worker upgrade/failure coverage, gateway smoke, and network-disabled Mow/Vacuum replay. Activity-scoped loading, two-client cold start, exact selected generated-yard/room continuity, all controls, responsive accessibility ownership, production gateway health/QR smoke, real unfolded Fold history, measured frame pacing, and animated soak automation are covered. Controlled listening, physical folded/orientation and iPad assistive-technology coverage, trusted HTTPS PWA acceptance, macOS host validation, human Windows shortcut/firewall acceptance, 30-minute device soak, and parent acceptance remain open.

## What already exists

- A working Phaser 3/Vite browser game with responsive dual-camera mowing, four control schemes, fullscreen, Safe Home, synthesized audio, PWA files, and LAN hosting.
- Fourteen outdoor machines, twenty authored yards, seeded New Yard, Free Mow, and eight powerups.
- Pure, tested grass, collision, save, viewport, control, layout, wander, vacuum-content, and debris math.
- Save v5 fields for both activities, including discriminated authored/generated selected-yard continuity and selected-room continuity.
- Eight vacuum definitions and twelve room definitions, including five floor types and nine debris types.
- A complete no-fail product contract in `ACCESSIBILITY.md`, current status in `ROADMAP.md`, visual rules in `DESIGN.md`, and approved navigation in `ACTIVITY_FLOW.md`.

## NOT in scope

- More than fourteen outdoor machines, twenty authored yards, eight vacuums, or twelve rooms in this release.
- Chores other than mowing and vacuuming.
- Locks, currency, economy, scores, fail states, damage, fuel, full bins, timers, achievements, accounts, cloud, ads, analytics, multiplayer, 3D, branded replicas, or app-store packaging.
- Replacing Phaser 3 or rewriting working mowing behavior wholesale.
- Treating automated checks as a substitute for Fold, visual, listening, performance, or parent acceptance.

## Engineering review decisions

1. **[P0] (10/10)** Preserve mowing through a strangler migration. A big-bang shared-scene rewrite would violate the regression constraint.
2. **[P0] (10/10)** Keep the current `PlayScene` mowing simulation and `VacuumPlayScene` separate. Shared code owns lifecycle/contracts only, never grass/debris branches.
3. **[P0] (10/10)** Add browser E2E as a separate Playwright layer; keep Vitest pure-function only.
4. **[P1] (9/10)** Use the canonical activity catalog and composed lifecycle to own diagnostics and cleanup without merging the simulations.
5. **[P1] (9/10)** Stage and validate generated build/pack manifests before cache promotion; keep trusted-local HTTPS explicitly configured and separately accepted for PWA installability.
6. **[P1] (9/10)** Make every extraction independently reversible and require mowing parity before the next extraction.
7. **[P1] (8/10)** Use data-driven machine/room production templates so content completeness is validated rather than manually inferred.
8. **[P2] (8/10)** Preserve the existing Web Audio singleton but split activity buses/profiles and enforce cleanup/peak tests.

## Architecture

```text
main.ts / game.ts
       |
       v
BootScene -> TitleScene -> SettingsScene
                |       |
          +-----+       +------+
          v                    v
    Mow galleries        Vacuum galleries
          |                    |
          v                    v
    PlayScene            VacuumPlayScene
          |                    |
          +----------+---------+
                     v
             shared activity shell
             +---------------------+
             | viewport/safe areas |
             | UI camera + HUD     |
             | control intent      |
             | collision resolver  |
             | Safe Home/pause     |
             | save/settings       |
             | audio host          |
             | asset lifecycle     |
             +---------------------+

Mow-only                          Vacuum-only
GrassField/Layout/props           DebrisField/RoomLayout/indoorProps
Mower/MowerRig/drawMower          Vacuum/VacuumRig/drawVacuum
cut/grow/stripe VFX               suction/groom/shine VFX
mower profiles/powerups           vacuum profiles/floor response
```

### Activity contract

```ts
interface ActivitySession {
  readonly id: "mow" | "vacuum";
  pause(): void;
  resume(): void;
  finish(): void;
  progress(): number;
  destroy(): void;
}

interface DriveableMachine {
  x: number;
  y: number;
  heading: number;
  speed: number;
  throttle: number;
  steering: number;
  readonly topSpeed: number;
  readonly turnRate: number;
  readonly pivotTurn: boolean;
}
```

`TouchDrive` consumes `DriveableMachine`, not `Mower`. Mower and Vacuum compute a candidate with `step`, resolve it through swept collision/world bounds, then `commitPose` before surface transformation. `ActivityHud` receives callbacks/state and owns no activity logic. `ActivityLifecycle` owns the UI camera, diagnostics, and registered cleanup; each scene cleanup destroys its own drive, machine, field, layout, and overlays. Phaser owns scene camera teardown, while `AudioEngine` intentionally remains a shared singleton.

## Execution order and gates

### Milestone 0 — baseline and evidence harness

Deliverables:

- [x] Add Playwright with stable URLs/query flags, real Chrome touch input, deterministic content, console failure capture, responsive sizes, and read-only real-scene diagnostics.
- [x] Add content-integrity checks for asset existence, byte budgets, transparent bounds, stable IDs, authored layout invariants, and activity cache manifests.
- [~] Capture Fold evidence through ADB/CDP: CSS viewport, DPR, device posture, screenshots, real movement/progress, frame metrics, heap, and console errors are recorded manually; `scripts/fold-check.mjs` is reusable, while a current physical folded pass remains.
- [x] Capture current mowing and vacuum touch baselines before further behavior edits.

Gate: TypeScript, 95 tests, build, 47-check Playwright flow, service-worker upgrade coverage, production-offline replay, and real unfolded Fold Mow/Vacuum/Home/fullscreen history succeed. Physical folded evidence remains a release-confidence item, not a reason to falsify this gate.

### Milestone 1 — shared shell parity

One bounded slice at a time:

1. Extract viewport/safe-area layout helpers.
2. Extract `ActivityHud` and UI-camera pin/ignore lifecycle.
3. Generalize `TouchDrive` to `DriveableMachine` without changing control math.
4. Extract activity-neutral collision resolution.
5. Add `AssetCatalog` activity loading plus the `ReleaseManifestV2` pack lifecycle.
6. Split shared audio host from mow-specific profiles/layers.
7. Rename the focused outdoor scene to `MowPlayScene` only after route parity.

Gate after every step: the full mowing parity suite and Fold smoke pass. Do not stack the next extraction on a failed gate.

### Milestone 2 — finite outdoor fidelity completion

- Extend `MowerDef` and rigs for attachment/light anchors and four specified tractor machines.
- Make wheel/track spin, steering, caster response, deck/attachment motion, engine vibration, exhaust, discharge, lights, and tire response readable for all fourteen machines.
- Upgrade `Layout` from ASCII-only cell props to layered authored geometry supporting curved paths, waterways, bridges, hedges, irregular fences, terrain regions, and shaped masks while retaining ASCII import compatibility.
- Rebalance one world-scale specification for machines, people-scale props, trees, houses, fences, paths, ponds, and structures.
- Add continuous cut-edge smoothing, terrain-reactive grass bend, bounded clippings/dust/dampness/leaves/tire marks, and broad reflective stripes.
- Re-author sixteen current yards and add Big Acreage, Tractor Field, Lakeside Park, and Forest Clearing.
- Complete mower-family audio listening/peak gates.

Gate: all fourteen machines and twenty yards pass the outdoor evidence ledger. Remaining non-ledger polish becomes later work and cannot silently block Vacuum.

### Milestone 3 — initial production vacuum slice

This slice was implemented behind development/test routing before the complete activity was exposed:

- Implement `RoomLayout`, floor regions, shaped indoor props, debris-safe scatter bounds, starts, and reachability.
- Implement `DebrisField` rendering/update with dirty-region batching and a 320-sprite ceiling.
- Implement `Vacuum` plus Bright Upright rig: wheel distance, handle lean, steering, brush roll, intake transform, collision footprint, shadow, and VFX anchors.
- Implement Living Room production floors, rug, walls, sofa, chairs, table, lighting, debris, grooming lines, hard-floor shine, helper, tutorial, completion, and Home.
- Add vacuum motor/airflow/brush/load/impact/floor audio using the shared host.

Gate result: automation, responsive browser coverage, historical unfolded-Fold play, helper, Safe Home, cleanup, and performance passed. Controlled listening remains an external Milestone 6 acceptance gate.

### Milestone 4 — full vacuum content

- Complete the eight behaviorally distinct rigs defined in the product design.
- Complete all twelve room recipes and production environments.
- Complete carpet/rug grooming, hardwood/tile/concrete shine, and nine debris render/animation/audio families.
- Add vacuum and room galleries, short copy, production portraits/previews, selection persistence, three-step tutorial, completion/Again/Home flows, and all 96 compatibility smoke cases.

Gate result: every visible card starts real content and all room/floor/debris automation passes. Final gameplay-scale visual and controlled-listening acceptance remains external.

### Milestone 5 — combined hub, packs, and PWA

- Implement the approved Activity Hub and last-activity resume.
- Add child-safe activity loading/recovery so Vacuum remains functional through a validated pack or procedural runtime recovery.
- Add core/mow/vacuum build manifests, staging/validation/promotion/rollback caches, storage quota handling, and stale-cache cleanup.
- Add trusted-local HTTPS setup/runbook for installable PWA; preserve plain HTTP LAN browser play and fullscreen.
- Verify cross-activity save, audio fades, listeners, cameras, textures, input ownership, and Home.

Gate result: fresh/migrated and exact-offline browser flows pass. Cache interruption, corrupt hashes, quota isolation, rollback, pruning, and active-only fetches pass in the deterministic real-worker harness; physical quota acceptance remains external.

### Milestone 6 — release confidence

- Run all automated gates and content reports.
- Capture simulated viewports plus actual Fold CSS viewports folded/unfolded, both orientations, browser/PWA.
- Run every machine/floor/debris listening matrix.
- [x] Run a five-minute alternating-activity performance/cleanup case at the measured Fold fullscreen viewport.
- [ ] Run a 30-minute alternating-activity soak on the physical Fold.
- Validate the macOS launcher and human Windows desktop-shortcut/firewall flow; automated Windows gateway, readiness, dashboard, LAN URL, and QR smoke already pass.
- Record parent/child acceptance; only then make a final-release claim.

## Failure modes

| Failure | Child-facing result | Recovery/test |
|---|---|---|
| blocked/corrupt save | complete defaults; play continues | migration/unit/E2E |
| touch ends outside canvas or orientation changes | machine gently stops; no stuck throttle | pointer cancel/blur/device E2E |
| activity assets fail | a verified prior service-worker release remains active, or machine/prop art uses the procedural recovery renderer inside the normal scene/HUD | worker failure tests; a dedicated browser load-failure recovery case remains required |
| stale service worker | previous valid pack remains active | manifest rollback test |
| insufficient cache quota | core/current valid pack remains usable | deterministic worker quota-isolation test |
| audio context suspends | first pointer resumes; visual feedback remains | iOS/Android device pass |
| scene shutdown misses cleanup | soak counters fail before release | CDP soak |
| large machine cannot reach debris/grass | helper still covers all; authored footprints and pickup safety must pass | layout/footprint tests + manual reachability review |
| prop art and collision disagree | gameplay-scale visual review rejects the scene | visual inventory + collision tests |
| frame time exceeds budget | bounded effect counts reduce; core transformation remains | performance gate |

## Test coverage map

```text
PURE CODE PATHS (Vitest)
========================
Save/migrate       -> null/corrupt/v1/v2/v3/invalid IDs/blocked storage
Drive intent       -> magnet/tap/cruise/pad/keyboard/release/cancel/resize
Viewport/HUD       -> safe insets/all modes/orientation/target separation
World geometry     -> every shape/contact/slide/no-trap boundaries
Grass              -> cut/grow/stripe/void/helper/completion/edge smoothing
Debris             -> scatter/intake/pull/resistance/tumble/helper/completion
Layouts            -> 20 yards + 12 rooms/start/connectivity/masks/reachability
Content            -> 14 mowers/8 vacuums/20 yards/12 rooms/production contracts
Asset manifests    -> existence/hash/size/bounds/pack completeness/rollback
Audio offline      -> profile gain + material acoustic mappings; controlled listening remains physical

USER FLOWS (Playwright) [E2E]
===============================
boot -> title/hub -> Mow -> machine -> yard -> drive -> Finish -> Home
boot -> hub -> Vacuum -> machine -> room -> tutorial -> clean -> Finish -> Home
settings -> each control/audio/comfort/fullscreen -> reload -> preserved
resume -> last valid pair / invalid pair fallback
pointer drag -> HUD crossing -> release outside -> orientation -> safe stop
production release -> exact active inventory / offline entry into both activities / production art

SERVICE-WORKER HARNESS [REAL WORKER CODE]
=========================================
pack staging -> success / interruption / corrupt hash / quota isolation / rollback / third-release pruning
PWA -> manifest/SW/active-only fetches; install-ready remains trusted-HTTPS physical acceptance

PHYSICAL ACCEPTANCE
===================
Galaxy Z Fold 7 -> folded/unfolded x portrait/landscape x browser/PWA
                 -> touch feel + camera/scale + visual + listening + soak
macOS/Windows   -> parent host + LAN/HTTPS + QR + restart
```

## Design review

| Pass | Initial | After specification | Resolution |
|---|---:|---:|---|
| Information architecture | 7 | 10 | Approved two-choice hub and separate galleries/play scenes |
| Interaction states | 5 | 9 | State table below; runtime failure remains parent-readable and child-safe |
| Journey/emotional arc | 7 | 10 | Transformation and machine response are the reward at every horizon |
| Generic/AI-slop risk | 6 | 9 | Production rejection rules, no reward/store grammar, machine-book visual thesis |
| Design-system alignment | 4 | 9 | Added `DESIGN.md`; final asset QA remains implementation work |
| Responsive/accessibility | 8 | 10 | Exact CSS/device evidence, 80px targets, consistent HUD, one-finger flow |
| Unresolved decisions | 6 | 10 | Inventory, HTTPS, packs, recovery, behavior matrices, and gates locked |

### Interaction state table

| Feature | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Hub | title art and selected production portraits while assets validate | never empty in a valid build | verified prior release or selected-machine fallback; gateway setup errors remain on `/host` | both activity pictures active | never exposes only a partial activity |
| Galleries | selected production portrait/art | build fails if inventory empty | procedural fallback cards remain selectable; no automatic Home redirect | all cards selectable | swipe position and current selection retained |
| Play | production machine plus Home/Quiet | clean/cut field is a valid replay state | safe stop; Home remains | transformation, warm celebration, Again/Home | progress visible; Finish always available |
| Save | in-memory defaults immediately | fresh save opens complete game | storage failure is silent to child, logged for parent | continuity persists | valid fields preserved while invalid IDs fall back |
| Fullscreen/PWA | honest parent status | browser play still works without HTTPS setup | no false install claim; setup instructions | standalone launch/manifest/SW pass | HTTP supports browser/fullscreen only |

### User journey and emotional arc

| Horizon | Child does | Intended feeling | Design support |
|---|---|---|---|
| first 5 seconds | sees favorite machine choices | recognition and safety | large production pictures, no lock clutter, last favorite visible |
| first minute | drags and hears machine respond | direct control and cause/effect | one-finger following, readable mechanics, responsive audio |
| five minutes | transforms a large place | calm satisfaction and agency | persistent stripes/clean tracks, varied materials, no pressure |
| completion | sees warm celebration or uses Finish | success without judgment | 88% threshold, unlimited helper, no grade |
| repeated play | changes machine/place freely | curiosity and familiarity | every option open, distinctive behavior, stable safety grammar |
| long term | returns to beloved machines | ownership without economy | local continuity and last-activity resume, no retention tricks |

## Implementation discipline

- Tests ship with each slice, never later.
- No visible route is added before its production content and recovery states work.
- No unrelated cleanup or broad rewrite is bundled into a parity slice.
- Existing screenshots and real Fold evidence are compared after every world/HUD change.
- `ROADMAP.md` changes status only when the required evidence exists.
- Any regression becomes a critical test before the fix is accepted.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|---|---|---|---:|---|---|
| Product definition | `/office-hours` | Premises, alternatives, inventory, acceptance | 3 adversarial rounds | Approved | 28 issues resolved; final spec complete |
| Eng Review | `/plan-eng-review` | Architecture, tests, failure modes, performance | 1 | Clean | 8 decisions locked; 0 unresolved |
| Design Review | `/plan-design-review` | IA, states, journey, visual language, responsive access | 1 | Clean | score 6/10 → 9/10; 7 decisions locked |

**Verdict:** execution-ready. Visual implementation still requires iterative screenshots and actual Fold acceptance; the plan score is not product acceptance.
