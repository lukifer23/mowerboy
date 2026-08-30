# MowerBoy delivery roadmap

Updated: 2026-08-28

This is the single status tracker for the mowing fidelity program and Vacuum Mode. Product rules remain in [`ACCESSIBILITY.md`](ACCESSIBILITY.md), architecture remains in [`DEVELOPMENT.md`](DEVELOPMENT.md), the approved end-to-end execution sequence is in [`INTEGRATION_PLAN.md`](INTEGRATION_PLAN.md), visual rules are in [`DESIGN.md`](DESIGN.md), the combined navigation is in [`ACTIVITY_FLOW.md`](ACTIVITY_FLOW.md), and parent instructions remain in [`../README.md`](../README.md).

## Product goal

Build a gentle machine-play game that makes mowing and vacuuming satisfying by themselves. A child can choose any machine or place immediately, drive with one finger, watch the environment transform, hear the machine respond, and never lose or become trapped.

## Non-negotiable acceptance rules

- No locks, unlocks, currency, timers, damage, lives, game over, decreasing scores, ads, accounts, analytics, or competitive play.
- No visible placeholder, disabled, mock, “coming soon,” or non-functional content.
- Every visible machine and place is selectable and playable from a fresh save and a migrated save.
- Default control remains finger drive: hold or drag toward a point, lift for a gentle stop.
- Home, Quiet, Pause, and Finish remain large, visible, and isolated from world touches.
- Mower and vacuum audio respond to the actual machine state and material interaction.
- A child can always complete an activity using the helper, without precision driving.
- All changes pass TypeScript, unit tests, production build, real play, and phone/tablet layout checks before their phase is marked complete.

## Status legend

- `[ ]` planned
- `[~]` in progress
- `[x]` implemented and verified

## Phase 1: open play and world correctness

Status: **in progress**

- [x] Remove all mower gating and the Unlock all setting.
- [x] Migrate old saves without losing selected machine, completed yards, control, sound, comfort, or Safe Home settings.
- [x] Remove the unused persistent sparkle counter while keeping sparkles as joyful audiovisual feedback.
- [x] Make Rain a clearly visible effect for its full active duration without lowering completion.
- [x] Replace circle-only collision with shape-aware circles, ellipses, rectangles, and rotated fence segments.
- [x] Exclude grass hidden beneath solid obstacles from completion and helper calculations.
- [x] Add tests proving all machines are open and authored-yard obstacle footprints cannot hide required grass or pickups.
- [~] Replay machine selection, Home, Finish, completion, all four control schemes, and representative yards on the Galaxy Fold. Automated Chrome now drives all four touch schemes in both activities; ZipTurn selection/persistence, magnet drive/cutting, an eight-second real Helper completion, and celebration Safe Home confirmation pass physically. The other physical controls/yards remain in acceptance.

## Phase 2: mowing fidelity and outdoor content

Status: **in progress**

- [x] Add per-machine rig data for wheels, steering, decks, caster wheels, chutes, attachments, lights, and exhaust. Axles, tracks, wheel sizes, discharge side, aspect-correct scale, attachments, headlights, and exhaust are defined for all fourteen.
- [~] Make wheel steering/spin, deck motion, engine vibration, exhaust, tire response, and discharge readable at gameplay zoom. First Fold pass is stable; every machine family still needs visual acceptance.
- [~] Rebalance mower, tractor, tree, building, fence, pond, path, and prop proportions as one system. All machines now preserve source aspect ratio, and the expanded prop system has authored collision/display bounds; every older yard still needs a final visual acceptance pass.
- [~] Replace blocky cut edges and fine hatching with soft continuous cuts and broad reflective stripes. Fine hatching is removed, direction reflection is broad, and the field is now seven-unit cells in larger chunks; diagonal edges are improved but still visibly stepped at Fold zoom.
- [~] Add terrain-reactive grass motion, clippings, dust, dampness, leaves, and tire marks. Live grass bend, side discharge, terrain dust/straw/leaves/petals, rain, and paired tire marks are wired; wet-grass surface tuning remains.
- [~] Build distinct push, rider, zero-turn, commercial, and diesel tractor audio profiles with cutting-load response. Profiled cylinders/pitch plus load droop, blade harmonics, granular stalk impact, and terrain rasp are wired; controlled listening remains.
- [x] Add the four specified tractor experiences: Garden Scout, Utility Mate, Field Giant, and Pivot Ranger, bringing the outdoor gallery to fourteen machines.
- [x] Upgrade the world format for curved paths, waterways, bridges, hedges, irregular fences, and shaped obstacle masks. Connected path nodes rasterize into rounded shoulders; perimeter/internal fence cells group into long shaped runs; traversable bridges, grouped waterways, hedges, and masked props remain compatible with ASCII maps.
- [x] Re-author all 16 original yards to the upgraded fidelity standard. The last eleven weak spaces gained winding paths, water, pines, hedges, benches, sheds, hay, internal fencing, and netted soccer goals; every fresh authored yard now starts below 3% completion.
- [x] Add the four locked flagship large spaces: Big Acreage, Tractor Field, Lakeside Park, and Forest Clearing, bringing the authored-yard gallery to twenty.
- [~] Expand outdoor art with tree species/sizes, bushes, fence styles, sheds, barns, sports equipment, bridges, and parked machinery. Conifers, hedges, sheds, a production-art barn, board bridges, hay, benches, and parked equipment ship; more fence/sports variants remain.

## Phase 3: two-activity foundation

Status: **in progress**

- [x] Add a picture-first Mow / Vacuum home hub.
- [x] Preserve one-tap return to the selected machine/place while keeping four picture-first galleries easy to browse.
- [x] Share viewport, touch drive, child-safe HUD, collision geometry, fullscreen, settings, and audio hosting without merging the two activities into one branch-heavy scene.
- [x] Add save migration for selected vacuum, cleaned rooms, and last activity.
- [x] Load activity-specific art only when needed: Boot loads the selected machines, activity scenes load their world/current machine, and galleries load their own roster. The shared single AudioContext remains intentionally common.
- [x] Keep Vacuum Mode hidden until its launch matrix passes, then expose it through the combined hub. All 96 machine/room startup pairs passed before exposure.

## Phase 4: Vacuum Mode

Status: **in progress**

- [x] Eight complete machines: all eight original definitions, production illustrations, handling, motors, distinctive rendered rigs, wheel/brush animation, intake geometry, and playable cards exist.
- [x] Twelve complete places: all twelve room definitions, dimensions, floor mixes, debris recipes, deterministic seeds, authored furniture layouts, collision, and previews exist.
- [x] Carpet, rug, hardwood, tile, and concrete rendering and cleaning response.
- [x] Dust, crumbs, cereal, hair, pet fur, leaves, confetti, tracked dirt, and sawdust are implemented as distinct debris materials with size and suction resistance.
- [x] Intake-shaped cleaning, clustered real-material messes, curved suction VFX, visible brush/intake animation, tumbling large debris, hair/fur pull, carpet grooming lines, and hard-floor shine trails. Idle suction is off so lifting a finger never changes progress.
- [x] Upright, cyclone, stick, canister/trailer, robot, shop vacuum, commercial upright, and ride-on movement/animation rigs.
- [~] Dedicated vacuum motor, airflow, debris-load, brush roll, wheel, and floor-material audio are implemented; controlled family-by-family listening/tuning remains.
- [x] Gentle room completion and visible ≤8-second helper cleanup, with no full-bin stop or penalty.

## Phase 5: release confidence

Status: **in progress**

- [~] Pure tests for save migration, collision geometry, grass/debris fields, controls, content integrity, and deterministic layouts. Eighty-three tests pass, including rounded paths, grouped perimeter/internal fences, deterministic debris clustering, invalid-ID/de-duplication/default-isolation recovery, and authored/generated yard rectangularity, enclosure, alphabet, fresh-start, and start invariants; broader randomized reachability coverage remains.
- [x] Browser flows for both first-run tutorials, galleries, Settings, Pause/Resume, Quiet, Finish, both activities, all four touch schemes, gesture scrolling/swiping, latest-yard/latest-room continuity, HUD touch exclusion, CanvasTexture/AudioContext warning regression, exact production art for all 22 machines, and every 20-yard/12-room startup. Thirty-four checks pass across five viewport families, with heavyweight matrices intentionally run once at Fold fullscreen.
- [x] Automated asset validation covers all 47 required production files and runs inside `npm run build`; PNG signatures/dimensions plus genuine RGBA transparency and safe visible bounds are enforced for machine/environment cutouts.
- [x] Production offline validation covers the fingerprinted shell and all 47 manifest assets, then disables networking and opens both activities with exact production machine art.
- [~] Screenshot review at phone portrait, phone landscape, unfolded Fold, tablet, laptop, and desktop dimensions. Desktop and unfolded Fold landscape evidence pass; remaining view families continue.
- [~] Galaxy Fold play passes folded/unfolded, browser/fullscreen, touch drag, orientation changes, and long play. Real unfolded Chrome and fullscreen passes now cover the hub, Mow, Vacuum, physical held touch, transformed surfaces, release-to-stop, Safe Home, and measured frame pacing. A software CLOSED override was rejected as invalid physical-fold evidence; an actual folded posture and both physical orientations remain.
- [ ] Controlled listening pass for every mower/vacuum family and every interaction material.
- [~] Performance pass for startup, memory, frame pacing, long-session texture cleanup, and activity switching. Fold vacuum play measured 116.8 FPS on the 120 Hz panel over four seconds, p95 8.4 ms, worst 16.7 ms, zero frames over 33 ms. The final five-minute 832×749 animated soak passed 308.1 seconds of active page time, 35 cycles / 70 activity starts, zero console errors, and 10.7–38.2 MiB bounded heap; a 30-minute physical-device soak remains.
- [ ] Parent runbook validated on both macOS and Windows LAN hosting.

## Current verified baseline

- 14 illustrated outdoor machines with complete runtime mechanical rigs and canvas recovery renderers.
- 20 authored yards, seeded New Yard, and Free mow.
- 8 vacuum machines, 12 authored rooms, 5 floor types, and 9 debris types; all 96 startup pairs passed.
- Four control schemes and responsive dual-camera HUD.
- Fullscreen and Safe Home verified on a Galaxy Z Fold 7.
- Vite 8.2.2, Vitest 4.1.11, and Playwright 1.62.1 are current; `npm audit` reports zero known dependency vulnerabilities.
- `npx tsc --noEmit`, 83 Vitest tests, 34 passing Playwright checks, 47-file/pack-manifest validation, production build, and production-offline Mow/Vacuum replay pass as of 2026-08-28.
- The combined hub, fullscreen, Safe Home, real Fold mowing/vacuuming, and five-minute alternating-activity soak have current evidence in [`QA.md`](QA.md).

## Definition of phase completion

A checked implementation item means the real code and production content exist. A phase is complete only when its automation passes and the actual child-facing flow has been driven on the Fold. Passing tests alone never substitutes for visual, touch, performance, or listening acceptance.
