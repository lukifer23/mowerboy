# Asset provenance and production contract

Updated: 2026-08-30

MowerBoy uses original, unbranded machine and environment art created specifically for this private game. No manufacturer logo, copied game asset, stock pack, or trademarked machine identity is part of the production inventory.

## Generation mode and art direction

The raster illustrations were created with OpenAI's built-in image generation workflow, then trimmed, resized, padded, and compressed locally without changing the depicted machine or environment.

The shared prompt contract was:

> Polished hand-painted, dimensional, family-friendly 2D game art. Strict top-down three-quarter orthographic view. Recognizable real mechanics and believable proportions. Clean silhouette at phone gameplay scale. Original design with no text, logos, trademarks, watermark, room, floor, or cropped parts. Machine faces right. Transparent background for world cutouts.

Asset-specific subjects covered all fourteen mower families, all eight vacuum families, and the red barn. Each subject prompt named its real mechanical distinctions, such as push handle and deck, zero-turn casters, tractor implement, articulated front deck, upright brush head, canister hose/trailer, robot side brush, or ride-on sweeper brushes. Color alone was never accepted as the distinction between two machines.

## Runtime inventory

- `public/assets/mowers/`: fourteen transparent top-down mower/tractor cutouts
- `public/assets/vacuums/`: eight transparent top-down vacuum/sweeper cutouts
- `public/assets/portraits/`: fourteen isolated mower portraits and eight isolated vacuum portraits, normalized for the machine-book galleries
- `public/assets/environment/barn-red-v3.png`: transparent barn cutout
- root `*-v2.png` files: grass and outdoor environment illustrations
- `title.jpg` and `icon.png`: home art and browser/PWA icon

The three retained JPEG source/reference files (`icon-src.jpg`, `icons/home.jpg`, and `icons/pause.jpg`) are not loaded by the game. Runtime HUD icons are original procedural drawings from `src/systems/icons.ts`, which stay sharper and more legible at an 80-pixel touch target.

## Validation

`src/data/asset-manifest.json` is the canonical runtime inventory. The build generates the public copy and release manifest from it, so runtime loading, validation, offline packs, and browser tests cannot silently drift. `npm run check:assets` is part of every production build. It requires all 59 runtime production files, rejects missing/tiny/corrupt images, validates genuine WebP portrait signatures, requires machine/environment cutouts to be non-interlaced 8-bit RGBA PNGs, verifies genuine visible and transparent pixels, and rejects artwork touching the image boundary. Every production file must appear exactly once in the core, mowing, or vacuum pack. Original portrait JPEGs and unused HUD references live under `source-art/`, outside the shipped and cached release.

Browser contracts then prove that every one of the 14 mower and 8 vacuum IDs resolves to its exact production world texture. The contact-sheet review artifacts are:

- `.gstack/qa-reports/screenshots/2026-08-28-machine-contact-sheet.png`
- `.gstack/qa-reports/screenshots/2026-08-28-environment-contact-sheet.png`

Canvas vector renderers remain complete recovery paths when an image cannot load. They are functional original renderers, not blank placeholders, and production tests require the raster texture whenever the validated asset exists. `npm run test:offline` additionally builds the production app, verifies the active 67-file release inventory by byte length and SHA-256 across the three packs, disables networking, and opens real mowing and vacuum scenes with their exact production machine art.
