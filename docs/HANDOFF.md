# Current handoff

Updated: 2026-09-01
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

Exact suite counts, release ID/size, soak metrics, host evidence, and remaining gaps are canonical in [`QA.md`](QA.md). Keep volatile evidence there so the handoff, roadmap, and QA ledger cannot drift independently.

The local automated release baseline and its committed remote CI run are green; exact evidence remains canonical in [`QA.md`](QA.md). Physical Fold/iPad, assistive-technology, controlled-listening, human Windows shortcut/firewall, macOS host, parent, and child acceptance remain separate external gates. Do not write “perfect” or “release-ready” until those gates pass.

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

