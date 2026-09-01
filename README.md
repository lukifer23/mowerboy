# MowerBoy

A gentle, touch-first mowing and vacuuming game. One finger. No fail. Endless stripes and clean floors.

Designed for simple, accessible one-finger play on an iPad, phone, or tablet, hosted from a Mac or Windows computer on the same Wi-Fi.

**If you are an agent or developer picking this up:** start at [`AGENTS.md`](AGENTS.md), then [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md). Product rules that must not be broken live in [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md).

---

## Easiest Windows setup

1. Double-click **Install MowerBoy Shortcut.cmd** once.
2. After that, double-click **MowerBoy** on the Desktop.
3. A friendly host page opens by itself. Wait for **Ready to play**, then scan the large QR code with the iPad camera.

The computer needs Node.js `^20.19.0` or `>=22.12.0` installed once by whoever sets up the game. After that, the shortcut installs locked game dependencies when needed, builds only when the game changed, starts the production gateway, and shows every usable same-Wi-Fi address. No terminal or folder navigation is required for everyday play; a friendly message appears if the one-time Node setup is missing. It prefers port 5173, automatically uses the next open port if another local program already owns 5173, and reopens an existing dashboard only when its source fingerprint matches the current checkout.

## Terminal setup

On the **Mac or Windows** computer:

1. Install [Node.js](https://nodejs.org) `^20.19.0` or `>=22.12.0` if you don’t have it.
2. Open a terminal in this folder and run:

```bash
npm ci
npm start
```

3. The browser host page opens with a large QR code and LAN URLs. On the **iPad / phone / tablet** (same Wi-Fi):
   - Open Safari or Chrome
   - Open the exact LAN address shown on the host page (usually port 5173), or scan the QR
   - Tap the screen once if the engine is quiet (iPads stay silent until a tap)
   - Optional: use **Add to Home Screen** if the browser offers it
   - Or tap **Full screen** on the title screen to hide browser tabs while playing

That’s it. No account. No store. No internet after the first load.

Plain `http://192.168.…` LAN play is the simplest setup and the in-game **Full screen** button is verified on Chrome for Galaxy Z Fold. Android Chrome normally requires trusted HTTPS before it offers full PWA installation, so the parent runbook does not promise an install button on plain LAN HTTP.

### This computer only

Use **Play on this computer** on the host page. The address is usually `http://localhost:5173`, but the host page shows the exact fallback port when 5173 is occupied.

### Windows firewall

If the tablet cannot open the page, allow **Node.js** through the Windows firewall (Private networks) when Windows asks. If you use a port-specific inbound rule, use the actual port shown on the host page.

## How to play

- **Hold one finger** on the grass. The mower drives toward it.
- Lift the finger. It coasts to a stop.
- Home is the house button. With Safe Home on, tap it twice so one stray touch cannot leave the yard.
- The sparkle wand (**Finish**) mows leftover patches if corners are fiddly.
- **Yards → Free mow** grows the grass back so the loop never ends.

Parent keys on a computer: **WASD** or arrows.

## What’s in the game

- **14 outdoor machines:** push mower, riders, zero-turns, four tractor experiences, wide commercial, stand-on, and articulated front-mount machines
- **20 hand-built yards** plus a seeded “New yard” and Free mow
- **8 vacuums:** upright, cyclone, stick, canister, shop, robot, commercial, and ride-on sweeper
- **12 rooms** across carpet, rugs, hardwood, tile, and concrete with nine real debris types
- Powerups on the lawn: turbo, wide deck, rain, magnet, rainbow, birds, mulch, lights
- Every machine, yard, and room is available immediately
- Settings: four control schemes, three volume sliders, calm motion, strong colors, Safe Home, Full screen, and tips

## Settings (the gear)

- Finger drive / Tap to go / Always go / Big arrows
- Volume: all sound, engine, world
- Calm motion, strong colors
- **Safe Home** prevents a single accidental touch from leaving play
- **Full screen** hides browser chrome where the browser supports it
- Show tips again

## If something is quiet or stuck

- Tap the screen once — iPad audio starts after a gesture
- Turn the mute speaker icon off (label **Quiet** / **Sound**)
- Refresh the page
- Make sure the tablet is on the **same Wi-Fi** as the computer (not guest / cellular)

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Production gateway, browser host dashboard, LAN URLs, QR, health check, and stale-build detection |
| `npm test` | Unit tests |
| `npm run test:e2e` | 47 passing Chrome checks: tutorials, touch/resize, controls, accessibility mirrors, concurrent cold starts, galleries, continuity, production art, and every yard/room startup |
| `npm run test:gateway` | Isolated production-host health, release, and static-route smoke test |
| `npm run test:sw-upgrade` | Exercises the real worker code through promotion, interrupted/corrupt staging, quota isolation, rollback, pruning, and active-only fetches |
| `npm run test:offline` | Serves the existing production build, disables networking, and proves both activities reopen with their real cached machine art; run `npm run build` first when invoking it alone |
| `npm run test:soak` | Five-minute alternating Mow/Vacuum cleanup and heap check |
| `npm run test:visual` | Captures 54 gameplay-scale machine/place scenes from an already-running production gateway |
| `npm run test:fold -- --url=… --drag=x1,y1,x2,y2` | Attach to an existing Fold Chrome tab for a physical-device touch/screenshot check; never opens a browser |
| `npm run build` | Production build |
| `npm run serve` | Build, then LAN preview |
| `npm run verify` | Catalog/release manifests, service-worker upgrade tests, typecheck, production build, 95 unit tests, 47 browser checks, gateway smoke, and production-offline replay |

`.github/workflows/ci.yml` is configured to run build/unit/gateway/worker checks on Ubuntu, Windows, and macOS, a cross-OS release-ID/inventory comparison, plus the Chrome production and exact offline-release gates on Ubuntu for pushes and pull requests to `main`. Soak, gameplay-scale visual review, and physical/manual acceptance remain separate gates.

## Docs

| File | Who it’s for |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Next coding agent — read this first |
| [`docs/PLAY.md`](docs/PLAY.md) | Short words a parent can read aloud |
| [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md) | No-fail contract and control schemes |
| [`docs/ACTIVITY_FLOW.md`](docs/ACTIVITY_FLOW.md) | Combined Mow/Vacuum navigation and continuity rules |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Visual, motion, responsive, and production-art rules |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Architecture, files, how to add a mower or yard |
| [`docs/INTEGRATION_PLAN.md`](docs/INTEGRATION_PLAN.md) | End-to-end architecture, gates, and remaining external acceptance |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Delivery phases, current status, goals, and acceptance gates |
| [`docs/QA.md`](docs/QA.md) | Current browser/Fold evidence and the honest remaining acceptance gaps |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Exact current state and cross-machine resume steps |
| [`docs/ASSET_PROVENANCE.md`](docs/ASSET_PROVENANCE.md) | Original-art generation contract, inventory, and validation |
| [`CREDITS.md`](CREDITS.md) | Art, libraries, licenses |
