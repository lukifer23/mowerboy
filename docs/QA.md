# Browser, Fold, and touch verification

Updated: 2026-09-01

This is the evidence ledger for the web/touch release pass. A green automated check is not treated as physical-device, listening, Windows-host, or parent acceptance.

## Current automated gates

| Gate | Result |
|---|---|
| TypeScript | `npx tsc --noEmit` passes |
| Deterministic verification | Full isolated `npm run verify` passed on the current 2026-09-01 change set: production build, 95 unit checks, gateway smoke, 2 worker tests, 47 browser checks, and exact-offline Mow/Vacuum replay. A successful remote run of the committed change set must still be recorded. |
| Repository CI configuration | `.github/workflows/ci.yml` is configured to run build, unit, gateway, and worker-upgrade gates on Ubuntu, Windows, and macOS; compare the three generated release inventories; and run Chrome plus offline production flows on Ubuntu. A successful remote run of this change set must be recorded separately. Soak, visual review, and physical/human acceptance remain separate gates. |
| Unit/content | 95 Vitest tests pass in 13 files, including swept movement, incremental growth, material-aware audio, and monotonic Finish timing |
| Browser touch/content | 47 checks pass in installed Chrome; 68 intentional project skips keep heavyweight matrices single-run; includes two simultaneous cold clients, exact resize control counts, room/pad controls, Safe Home announcements, tutorial relayout, and normal/Calm Motion |
| Production build | Vite 8.2.2 build passes; 59 canonical production assets validate at 15.46 MiB; release `c9d1bb05dc2740bc` contains 67 files at 16.79 MiB |
| Service-worker upgrade | Real worker code passes deterministic V1→V2 promotion, optional-pack quota isolation, interrupted/corrupt staging, rollback, third-release pruning, integrity inventory, and active-only fetch tests |
| Production offline | Exact active `ReleaseManifestV2` URLs, lengths, hashes, and integrity headers validate; with networking disabled, Tractor Field/Field Giant and Community Hall/Floor Rider reopen with production art |
| Windows shortcut | Desktop `.lnk` targets hidden `wscript.exe` → `scripts/windows-launch.vbs` with the project working directory and custom icon. A fresh 2026-09-01 current-source launch reached release `c9d1bb05dc2740bc` on preferred port 5173; dashboard, `/host/qr.svg`, and game returned 200, both detected LAN URLs used port 5173, and exactly one gateway launch tree owned exactly one listener. The Volta shim and real Node runtime appear as parent/child processes, not separate servers. |
| Dependency audit | 0 known vulnerabilities after Vite 8.2.2 / Vitest 4.1.11 upgrade |
| Soak | Current run: 301.0 seconds, 33 Mow/Vacuum cycles, 66 measured activity starts after warm-up, 0 errors, +0.9 MiB post-GC heap, max p95 8.34 ms, worst 11.14 ms, stable resources |
| Gameplay-scale visual inventory | `npm run test:visual` is configured to capture 54 scenes at 832×749. Generated captures are not retained in this checkout, so rerun it before citing fresh visual acceptance. |

Playwright viewports:

- 390×844 phone portrait
- 844×390 phone landscape
- 832×608 Galaxy Z Fold 7 inner screen with Chrome UI
- 832×749 Galaxy Z Fold 7 inner screen in browser fullscreen
- 1024×768 tablet

Every viewport proves that the canvas exactly matches the visual viewport with no document scroll. Both activities receive a held touch, move the real machine, increase or preserve real transformation progress, set throttle to zero on release, and decelerate. Safe Home ignores one accidental tap and exits on the second. A live portrait/landscape-style resize preserves the active Vacuum scene and progress; idle suction is disabled so resize or waiting cannot clean invisibly. The Fold-fullscreen contracts additionally dismiss both three-step first-run tutorials through the visible Play button, start every gallery and Settings, validate all 14 mower and 8 vacuum production textures, all 20 fresh-start yards and 12 rooms, exercise Pause/Resume, Quiet, and Finish in both activities, drive Magnet/Tap/Cruise/Pad in both activities, swipe both machine galleries without accidental selection, preserve Settings scroll while toggling both tutorial families and Safe Home, continue the exact selected authored/generated yard and selected room, exclude objective-HUD taps from steering, exercise the DOM accessibility bridge, and reject CanvasTexture/AudioContext warning regressions.

## Real Galaxy Z Fold 7 evidence

Device: Samsung SM-F966U, Android Chrome, USB/ADB plus LAN URL `http://192.168.1.127:5173`.

| Check | Evidence |
|---|---|
| Inner browser layout | 832×608 CSS px at DPR 2.625; hub, activity cards, counts, labels, and all four dock buttons visible |
| Inner fullscreen | 832×749 CSS px; browser tabs/address bar removed; all hub and in-play safety controls visible |
| Mow held touch | machine moved from `(1944, 936)` to `(2224.49, 1127.43)`; progress `0.00064 → 0.00491`; released at throttle/speed 0 |
| Vacuum held touch | machine moved from `(275.2, 967.6)` to `(497.34, 924.28)`; progress `0 → 0.00833`; released at throttle/speed 0 |
| Frame pacing | active Vacuum scene: 469 frames / 4.0065 s, 116.8 FPS, p50 8.3 ms, p95 8.4 ms, worst 16.7 ms, 0 frames over 33.4 ms |
| Cold production startup | fresh scoped-loader `:5174` origin: TTFB 5.4 ms, DOM interactive 9.6 ms, load 275.3 ms, FCP 276 ms, 17 requests, 1.88 MiB transfer, 8.2 MiB used JS heap, 0 errors |
| Latest recorded physical Fold regression (pre-hardening) | Existing Chrome tab at 832×609: Field Giant moved 382 world units and cut grass; Hall Keeper moved 293 world units and cleaned debris; both released at throttle/speed 0 with zero console/log errors |

Historical physical screenshots were written under `.gstack/qa-reports/screenshots/`, but they are not present in this checkout. The retained five-minute machine-readable soak result is `.gstack/soak/latest.json`.

The physical Fold evidence above predates the final rounded-path, grouped-fence, clustered-debris, wheel-overlay, audio, and offline-cache pass. No newer physical Fold run is recorded after those hardening changes, so that evidence remains useful history but does not certify the newest code on-device; the automated Fold-sized browser matrix does cover it.

## Soak result

The Fold-fullscreen-sized soak stays in one browser page and alternates:

```text
Mow -> held moving touch -> release -> Safe Home twice
Vacuum -> held moving touch -> release -> Safe Home twice
```

The current animated run lasted 301.0 seconds after a real two-activity warm-up. It completed 33 measured cycles / 66 activity starts; every activity moved, transformed its surface, and gently stopped after release. Post-GC heap stayed between 8.0 and 9.0 MiB (+0.9 MiB), maximum p95 frame time was 8.34 ms, worst frame was 11.14 ms, and per-activity camera/texture/listener counts were stable. Console/page errors: 0. The harness uses the game page's monotonic clock, bounded scene waits, explicit budgets, and unconditional browser cleanup/reporting.

## Evidence intentionally rejected

`adb shell cmd device_state state 0` was tried while the phone was physically open. Samsung rendered an artificial split system state across displays, so that screenshot is not accepted as a physical folded/cover-screen pass. The override was reset to the physical `OPENED` state. Simulated 960×325 cover CSS layout tests remain useful automation, but they do not replace physically folding the device.

## Still required before a final release claim

- Physical Fold closed/cover-screen play and both physical orientations
- Controlled listening across every mower/vacuum family and interaction material
- Thirty-minute alternating-activity soak on the physical Fold
- Trusted-local HTTPS setup if Android installable-PWA behavior is required; plain LAN HTTP fullscreen is already verified
- Human firewall prompt and real tablet/QR connection using the Windows Desktop shortcut; local shortcut metadata, cold/repeat launch, health, dashboard, LAN URL, and QR response evidence is recorded above
- macOS launcher/host validation
- VoiceOver on iPad and TalkBack on the physical Fold
- Parent and child acceptance

The production-offline behavior itself is verified on localhost; trusted-local HTTPS is still required to expose Android installation from a LAN address. No placeholder, mock, stub, disabled card, lock, or fail state was introduced by this pass. The `?test=1` diagnostic bridge is read-only and reports the actual Phaser simulation.
