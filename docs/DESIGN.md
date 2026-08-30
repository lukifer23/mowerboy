# MowerBoy design system

Approved direction: 2026-08-28

MowerBoy should feel like a beloved illustrated machine book that moves, sounds, and responds—not a dashboard, mobile storefront, or reward loop. The machine and transformed surface are always the visual anchors.

## Principles

1. Picture first. A child recognizes the machine/place before reading its name.
2. One job per screen. Home chooses an activity; galleries choose a machine/place; play transforms the world.
3. The world gets the space. HUD controls stay at safe edges and never form a toolbar across the play surface.
4. Real enough to recognize. Cute proportions and warm color are welcome; wheels, steering, decks, intakes, hoses, attachments, and scale must remain mechanically believable.
5. Motion explains mechanics. Wheel spin, steering angle, brush/deck rotation, material movement, engine/load response, and transformation are functional feedback.
6. No casino language. No locks, coins, stars, streaks, rarity, prices, pulsing offers, or reward chests.

## Color

Core interface colors:

| Token | Value | Use |
|---|---:|---|
| `ink-deep` | `#102418` | text stroke, high-contrast outlines |
| `forest-deep` | `#16351c` | dark UI/background anchoring |
| `forest` | `#2e7d32` | primary controls and selected surfaces |
| `leaf` | `#66bb6a` | secondary confirmation and progress |
| `cream` | `#f4f1de` | labels and light glyphs |
| `sun` | `#ffd54f` | selection and joyful confirmation |
| `water` | `#42a5f5` | water/rain, never the default action color |

Terrain and floor palettes live in their activity systems. Cut/uncut and clean/dirty states must remain legible without relying on hue alone: luminance, texture, silhouette, movement, and reflective direction all contribute.

## Type

- Primary UI: the device `system-ui` face with `Trebuchet MS` fallback, bold and outlined where it sits over the world.
- Numbers and short supporting labels use the same local system stack so no web-font request can delay or blank the interface on LAN.
- Labels use sentence case, one to three words where possible, and the vocabulary in `src/data/copy.ts`.
- Text stays still. It does not bounce, shimmer, marquee, or sit over busy imagery without a quiet backing shape.

## Controls

- Effective touch area: at least 80 by 80 CSS pixels.
- Circular safety controls use the established cream glyph, forest body, dark outline, and short label beneath.
- Activity and gallery cards are allowed because the card itself is the interaction. Decorative information cards are not.
- Press feedback scales to 92-96% over about 90 ms, returns over about 140 ms, and includes a restrained tap sound. Calm Motion keeps press feedback but removes decorative pulses.
- Selected gallery cards use a sun outline and plain “Ready” language. Completion checks are history, not rank.

## Motion

- World camera follow uses damped movement and clamped authored zoom; it never pumps with speed or helper effects.
- Landscape/Fold play targets roughly `0.41-0.42` world zoom and portrait roughly `0.52`, still clamped to the authored world. This is intentionally context-first: large tractors must not fill the view.
- Machine body vibration is sub-pixel/low-amplitude at gameplay scale.
- Wheels/tracks rotate from actual distance. Steering geometry reflects the machine family.
- Grass/debris responds where the deck/intake physically passes.
- Outdoor paths read as connected rounded ribbons with shoulders, water carries sparse highlights, and fences form long runs instead of repeated tile stamps. Indoor debris forms recognizable clustered messes with a few loose pieces rather than uniform confetti.
- Celebrations are warm and bounded: no flashes, full-screen shakes, or indefinite particle systems.
- Calm Motion reduces loose particles, weather density, decorative motion, and celebration density while retaining mechanical feedback.

## Responsive hierarchy

The durable screen and navigation reference is [`ACTIVITY_FLOW.md`](ACTIVITY_FLOW.md).

- Phone portrait: one dominant column or two wide cards only when both remain at least 140 CSS pixels wide; HUD uses corners/safe edges.
- Phone landscape: preserve world height by shortening labels and moving the objective between top controls.
- Tablet/Fold: larger world context, not a proportionally larger machine. Galleries show more neighboring cards without reducing target size.
- Desktop: world remains centered and bounded; HUD does not stretch to extreme corners beyond comfortable visual association.

## Production-art rejection rules

Reject an asset or screen if:

- wheels, deck, intake, hose, or attachment placement contradicts motion/collision;
- two machines differ only by color or scale;
- a prop’s apparent footprint differs materially from collision/masking;
- a texture uses obvious tiling, random visual noise, generic AI artifacts, malformed machinery, or embedded pseudo-text;
- UI art resembles a generic app icon set instead of MowerBoy’s illustrated machine language;
- decorative effects obscure cut/uncut grass, debris, edges, objectives, or touch controls.

## Required review views

Every new machine is reviewed as a transparent sprite, gallery portrait, gameplay idle, full steering, full speed, active transformation, collision slide, helper/celebration context, and at the smallest supported gameplay zoom. Every place is reviewed empty of UI, under normal HUD, at camera bounds, during transformation, and at every required viewport family.
