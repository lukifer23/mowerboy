# Current handoff

Updated: 2026-08-30  
Branch: `main` only  
Remote: `https://github.com/lukifer23/mowerboy.git`

## Current state

The engineering, hosting, continuity, accessibility, and first visual-feedback slices of the perfection pass are implemented:

- interrupted touch/pad input clears safely in Mow and Vacuum
- camera zoom is stable and speed-independent
- Home/Pause and Sound/Finish use safe edge clusters with a clear central play strip
- real activity diagnostics expose HUD, camera, machine bounds, production-art mode, and input ownership on `?test=1`
- browser tests use real diagnostic bounds instead of duplicated HUD coordinates
- public docs contain no personal family information
- Save v5 resumes the exact authored yard or generated-yard seed and selected room
- a production gateway serves the built game, health status, LAN URLs, and a scannable QR dashboard; Windows has a hidden launcher and desktop-shortcut installer
- all 22 machine portraits now use production art, and one canonical asset catalog drives validation, runtime selection, offline packs, and release manifests

The repository was intentionally rewritten to a sanitized root before this handoff. Do not restore old local commit objects or publish old archives.

## Last verified evidence

- `npx tsc --noEmit`: pass
- three consecutive `npm run verify` runs: pass
- `npm test -- --run`: 85/85 pass
- browser: 42 pass, 48 intentional matrix skips
- production assets: 59 files, 17.24 MiB; complete generated release: 70 files, 18.97 MiB
- stable chunks: Phaser 1,197 KiB and game 180 KiB before compression
- production-offline replay: all 59 manifest assets plus exact Field Giant/Floor Rider art pass
- installed Windows shortcut target-chain smoke: custom icon/metadata, hidden launch, automatic 5173-conflict fallback, readiness, dashboard, QR SVG, game shell, and LAN binding pass without disturbing the other listener

The automated release baseline is green, but physical Fold/iPad, assistive-technology, controlled-listening, human Windows shortcut/firewall, macOS host, parent, and child acceptance remain separate external gates. Do not write “perfect” or “release-ready” until those gates pass.

## Resume

```bash
git clone https://github.com/lukifer23/mowerboy.git
cd mowerboy
npm install
npm test
npm run build
```

Then continue in this order:

1. Generate real-scene previews for all 20 yards and 12 rooms from the production renderers.
2. Complete the responsive screenshot review and final visual tuning across the specified matrix.
3. Run the 30-minute physical alternating-activity soak and controlled listening matrix.
4. Validate the one-click family flow on a clean Windows host and macOS host, including firewall/port diagnostics and real QR connection.
5. Run VoiceOver on iPad and TalkBack plus folded/orientation checks on the physical Fold.
6. Record parent/child acceptance, then update release language only from that evidence.

Do not begin the four-place expansion until the current inventory and staged usage pilot pass. Do not invent expansion themes without evidence.

## Privacy rule

Describe the product and accessibility requirements impersonally. Never put details about the owner, their child, family, diagnosis, or personal story in README files, docs, source comments, issues, commits, or release notes.

