# Current handoff

Updated: 2026-08-30  
Branch: `main` only  
Remote: `https://github.com/lukifer23/mowerboy.git`

## Current state

The first perfection-pass slice is implemented:

- interrupted touch/pad input clears safely in Mow and Vacuum
- camera zoom is stable and speed-independent
- Home/Pause and Sound/Finish use safe edge clusters with a clear central play strip
- real activity diagnostics expose HUD, camera, machine bounds, production-art mode, and input ownership on `?test=1`
- browser tests use real diagnostic bounds instead of duplicated HUD coordinates
- public docs contain no personal family information

The repository was intentionally rewritten to a sanitized root before this handoff. Do not restore old local commit objects or publish old archives.

## Last verified evidence

- `npx tsc --noEmit`: pass
- `npm test -- --run`: 84/84 pass
- `npm run build`: pass
- production assets: 47 files, 15.58 MiB
- main bundle: 368.37 KiB gzip
- focused Fold browser suite: 15/16 passed initially; the only failure was corrected test setup that reset `localStorage`
- corrected Mow/Vacuum pointer and pad cancellation test: pass
- visual inspection: Mow 390×844, Vacuum 832×749, Mow 960×325; no inspected console errors

Run the full verification matrix again before making release claims. Physical Fold/iPad, Windows, listening, parent, and child acceptance remain separate external gates.

## Resume

```bash
git clone https://github.com/lukifer23/mowerboy.git
cd mowerboy
npm install
npm test
npm run build
```

Then continue in this order:

1. Complete gallery art as one wired slice: four missing mower portraits and eight vacuum portraits, presentation metadata, catalog-derived asset requirements, manifest validation, contact sheets, gallery E2E, build, commit, push.
2. Generate real-scene previews for all 20 yards and 12 rooms.
3. Strengthen deck/intake-to-surface transformation feedback in both golden loops.
4. Add shared activity-chrome lifecycle ownership without merging the two simulations.
5. Add Mac and Windows one-click launchers, parent diagnostics, hashed release manifest, and atomic current/previous offline cache promotion.
6. Run full unit, build, browser, offline, soak, performance, visual, device, and listening gates; update QA and roadmap evidence honestly.

Do not begin the four-place expansion until the current inventory and staged usage pilot pass. Do not invent expansion themes without evidence.

## Privacy rule

Describe the product and accessibility requirements impersonally. Never put details about the owner, their child, family, diagnosis, or personal story in README files, docs, source comments, issues, commits, or release notes.

