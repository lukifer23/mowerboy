# Current handoff

Updated: 2026-08-30  
Branch: `main` only  
Remote: `https://github.com/lukifer23/mowerboy.git`

## Current state

The engineering, hosting, continuity, accessibility, performance, and visual-feedback hardening slices are implemented:

- interrupted touch/pad input clears safely in Mow and Vacuum
- camera zoom is stable and speed-independent
- Home/Pause and Sound/Finish use safe edge clusters with a clear central play strip
- real activity diagnostics expose HUD, camera, machine bounds, production-art mode, and input ownership on `?test=1`
- browser tests use real diagnostic bounds instead of duplicated HUD coordinates
- public docs contain no personal family information
- Save v5 resumes the exact authored yard or generated-yard seed and selected room
- a production gateway serves the built game, health status, LAN URLs, and a scannable QR dashboard; Windows has a hidden launcher and desktop-shortcut installer
- all 22 machine portraits now use production art, and one canonical asset catalog drives validation, runtime selection, offline packs, and release manifests
- movement resolves collision/bounds before grass or debris transformation, including swept high-speed collision tests
- Free Mow growth repaints changed cells incrementally; machine/prop recovery textures are created only after real load failure
- Mow and Vacuum share pad/tutorial/pause/Safe Home/celebration safety behavior while retaining separate simulations
- accessibility mirrors are scene-owned and resize-safe; every room and pad direction is keyboard accessible; Safe Home announces without moving focus
- `ReleaseManifestV2` verifies byte length/SHA-256, stages activity packs independently, promotes atomically, supports rollback, and serves only the active release
- all runtime portraits are reviewed WebP assets; source/reference JPEGs remain under `source-art/` outside the shipped cache

The repository was intentionally rewritten to a sanitized root before this handoff. Do not restore old local commit objects or publish old archives.

## Last verified evidence

- full `npm run verify`: pass on the final 2026-08-30 change set
- `npx tsc --noEmit`: pass
- `npm test`: 93/93 pass in 12 files
- browser: 47 pass, 68 intentional matrix skips
- service-worker upgrades: 2 suites pass, including promotion/failure/rollback/pruning/active-only fetch scenarios
- production assets: 59 files, 15.46 MiB; generated release `b990107e3baba648`: 67 files, 16.79 MiB
- JavaScript: 1,354.6 KiB before compression
- production-offline replay: exact active URL/hash inventory plus Field Giant/Floor Rider art pass
- current animated soak: 301.0 seconds, 33 cycles / 66 measured starts, 0 errors, +0.9 MiB post-GC heap, max p95 8.34 ms, worst 11.14 ms, stable per-activity resources
- current gameplay-scale visual inventory: 54/54 expected production scenes captured and reviewed
- current Windows Desktop shortcut: reinstalled with correct hidden target chain, project working directory, description, and custom icon; cold launch reached release `b990107e3baba648` on 5173 with matching source/build fingerprints, dashboard/QR/game HTTP 200, and two LAN URLs; repeat launch reused the same process with one listener

The automated release baseline is green, but physical Fold/iPad, assistive-technology, controlled-listening, human Windows shortcut/firewall, macOS host, parent, and child acceptance remain separate external gates. Do not write “perfect” or “release-ready” until those gates pass.

## Resume

```bash
git clone https://github.com/lukifer23/mowerboy.git
cd mowerboy
npm ci
npm test
npm run build
```

Then continue in this order:

1. Complete the remaining physical responsive review: Fold closed and both real orientations.
2. Run the 30-minute physical alternating-activity soak and controlled listening matrix.
3. Validate the one-click family flow on a clean Windows host and macOS host, including firewall/port diagnostics and real QR connection.
4. Run VoiceOver on iPad and TalkBack on the physical Fold.
5. Record parent/child acceptance, then update release language only from that evidence.

Do not begin the four-place expansion until the current inventory and staged usage pilot pass. Do not invent expansion themes without evidence.

## Privacy rule

Describe the product and accessibility requirements impersonally. Never put details about the owner, their child, family, diagnosis, or personal story in README files, docs, source comments, issues, commits, or release notes.

