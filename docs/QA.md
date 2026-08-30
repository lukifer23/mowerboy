# Browser, Fold, and touch verification

Updated: 2026-08-30

This is the evidence ledger for the web/touch release pass. A green automated check is not treated as physical-device, listening, Windows-host, or parent acceptance.

## Current automated gates

| Gate | Result |
|---|---|
| TypeScript | `npx tsc --noEmit` passes |
| Deterministic verification | Three consecutive clean `npm run verify` runs on 2026-08-30 |
| Unit/content | 85 Vitest tests pass in 10 files |
| Browser touch/content | 42 checks pass in installed Chrome; 48 intentional project skips keep heavyweight matrices single-run; includes two simultaneous cold clients |
| Production build | Vite 8.2.2 build passes; 59 canonical production assets validate at 17.24 MiB; the complete 70-file release is 18.97 MiB |
| Production offline | Fingerprinted JS/CSS plus all 59 assets cache from the generated release manifest; with networking disabled, Tractor Field/Field Giant and Community Hall/Floor Rider reopen with production art |
| Windows shortcut | Installed `.lnk` metadata and custom icon validate; its exact hidden-launch target reached Ready, dashboard, QR, and game HTTP 200 while preserving a conflicting BidLens listener on 5173 and selecting LAN port 5174 |
| Dependency audit | 0 known vulnerabilities after Vite 8.2.2 / Vitest 4.1.11 upgrade |
| Soak | 308.1 seconds of active page time, 35 Mow/Vacuum cycles, 70 activity starts, 0 console errors |

Playwright viewports:

- 390×844 phone portrait
- 844×390 phone landscape
- 832×608 Galaxy Z Fold 7 inner screen with Chrome UI
- 832×749 Galaxy Z Fold 7 inner screen in browser fullscreen
- 1024×768 tablet

Every viewport proves that the canvas exactly matches the visual viewport with no document scroll. Both activities receive a held touch, move the real machine, increase or preserve real transformation progress, set throttle to zero on release, and decelerate. Safe Home ignores one accidental tap and exits on the second. A live portrait/landscape-style resize preserves the active Vacuum scene and progress; idle suction is disabled so resize or waiting cannot clean invisibly. The Fold-fullscreen contracts additionally dismiss both three-step first-run tutorials through the visible Play button, start every gallery and Settings, validate all 14 mower and 8 vacuum production textures, all 20 fresh-start yards and 12 rooms, exercise Pause/Resume, Quiet, and Finish, drive Magnet/Tap/Cruise/Pad in both activities, swipe both machine galleries without accidental selection, preserve Settings scroll while toggling both tutorial families and Safe Home, continue the exact selected authored/generated yard and selected room, exclude objective-HUD taps from steering, exercise the DOM accessibility bridge, and reject CanvasTexture/AudioContext warning regressions.

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
| Current physical Fold regression | Existing Chrome tab at 832×609: Field Giant moved 382 world units and cut grass; Hall Keeper moved 293 world units and cleaned debris; both released at throttle/speed 0 with zero console/log errors |

Screenshots live under `.gstack/qa-reports/screenshots/`. The five-minute machine-readable soak result is `.gstack/soak/latest.json`.

The physical Fold evidence above predates the final rounded-path, grouped-fence, clustered-debris, wheel-overlay, audio, and offline-cache pass. The Fold is currently off, so that evidence remains useful history but does not certify those newest changes on-device; the automated Fold-sized browser matrix does cover the new code.

## Soak result

The Fold-fullscreen-sized soak stays in one browser page and alternates:

```text
Mow -> held moving touch -> release -> Safe Home twice
Vacuum -> held moving touch -> release -> Safe Home twice
```

The final animated run lasted 308.1 seconds of active page time. Heap sampled between cycles ranged from 10.7 to 38.2 MiB and finished at 26.1 MiB, with repeated garbage-collection drops rather than cumulative growth. Every one of the 70 activity starts produced real machine movement. Console/page errors: 0. The harness uses the game page's monotonic clock and bounded polling, so macOS sleep or wall-clock corrections cannot counterfeit duration or scene timeouts.

## Evidence intentionally rejected

`adb shell cmd device_state state 0` was tried while the phone was physically open. Samsung rendered an artificial split system state across displays, so that screenshot is not accepted as a physical folded/cover-screen pass. The override was reset to the physical `OPENED` state. Simulated 960×325 cover CSS layout tests remain useful automation, but they do not replace physically folding the device.

## Still required before a final release claim

- Physical Fold closed/cover-screen play and both physical orientations
- Controlled listening across every mower/vacuum family and interaction material
- Thirty-minute alternating-activity soak on the physical Fold
- Trusted-local HTTPS setup if Android installable-PWA behavior is required; plain LAN HTTP fullscreen is already verified
- Human double-click/firewall acceptance of the Windows desktop shortcut; the production gateway, health endpoint, dashboard, LAN URL, and QR endpoint pass automated Windows smoke testing
- macOS launcher/host validation
- VoiceOver on iPad and TalkBack on the physical Fold
- Parent and child acceptance

The production-offline behavior itself is verified on localhost; trusted-local HTTPS is still required to expose Android installation from a LAN address. No placeholder, mock, stub, disabled card, lock, or fail state was introduced by this pass. The `?test=1` diagnostic bridge is read-only and reports the actual Phaser simulation.
