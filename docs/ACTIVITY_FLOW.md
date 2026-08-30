# MowerBoy activity flow

Approved: 2026-08-28

This is the durable structural reference for the combined Mow and Vacuum experience. It defines information hierarchy and navigation, not final art. Final screens use production illustrations, the existing palette, short labels from `src/data/copy.ts`, safe-area-aware layout, and effective touch targets of at least 80 by 80 CSS pixels.

## Home hub

```text
┌─────────────────────────────────────────────────────────┐
│                                              Settings   │
│                                                         │
│                        MowerBoy                         │
│                                                         │
│       ┌────────────────┐    ┌────────────────┐           │
│       │                │    │                │           │
│       │  Mower picture │    │ Vacuum picture │           │
│       │                │    │                │           │
│       │      Mow       │    │     Vacuum     │           │
│       └────────────────┘    └────────────────┘           │
│                                                         │
│       Mowers       Yards       Vacuums       Rooms      │
└─────────────────────────────────────────────────────────┘
```

- Mow and Vacuum are equal, dominant picture choices.
- Each activity card shows the currently selected machine and starts its paired place.
- Vacuum is visible because its complete 8-machine × 12-room startup matrix passed; future activities must meet the same no-partial-content rule.
- Settings remains visually secondary and isolated from the activity choices.

## Machine and place galleries

```text
┌─────────────────────────────────────────────────────────┐
│ Home                                      Settings      │
│                         Vacuum                          │
│                                                         │
│       ┌───────────────┐   ┌───────────────┐             │
│       │   Machines    │   │    Places     │             │
│       └───────────────┘   └───────────────┘             │
│                                                         │
│       ┌───────────────┐   ┌───────────────┐             │
│       │ picture       │   │ picture       │             │
│       │ Bright Upright│   │ Cyclone Clear │             │
│       └───────────────┘   └───────────────┘             │
│       ┌───────────────┐   ┌───────────────┐             │
│       │ picture       │   │ picture       │             │
│       │ Quick Stick   │   │ Trailercan    │             │
│       └───────────────┘   └───────────────┘             │
└─────────────────────────────────────────────────────────┘
```

- Every visible card is immediately selectable and playable.
- Cards use production machine/place art and short names; there are no locks, badges, prices, or “coming soon” cards.
- Galleries support touch swiping without turning a drag into an accidental selection.
- Selecting a machine preserves the currently paired place; selecting a place preserves the machine.

## In-play safety grammar

```text
┌─────────────────────────────────────────────────────────┐
│ Home                         Objective          Quiet   │
│ Pause                                                   │
│                                                         │
│                                                         │
│                 activity world                          │
│                                                         │
│                                                         │
│                                                Finish   │
└─────────────────────────────────────────────────────────┘
```

- Home and Pause stay on the left; Quiet and Finish stay separated on the right.
- The objective is a simple transformation/progress cue, never a timer or warning.
- The UI camera remains at zoom 1 while the world camera follows the active machine.
- Safe Home requires confirmation when enabled. Home remains visible during tutorials, pause, helper, and celebration.
- World touches beneath the HUD never drive the machine.

## Responsive behavior

- Portrait: activity cards stack or narrow while preserving their large picture area; HUD controls move along safe-area edges without overlapping the objective.
- Landscape: activity cards sit side by side; the world gains horizontal view without enlarging the machine disproportionately.
- Fold/unfold and orientation changes trigger one queued relayout. The active scene, input ownership, progress, and audio continue without restart.
- Camera fitting uses authored world bounds and a clamped follow zoom. It does not zoom in merely to cover every background pixel; useful surrounding context remains visible.

## Navigation

```text
boot -> home hub
          |-- Mow -> PlayScene
          |-- Vacuum -> VacuumPlayScene
          |-- Mowers / Yards -> gallery -> PlayScene
          |-- Vacuums / Rooms -> gallery -> VacuumPlayScene
          `-- Settings

play Home -> Safe Home confirmation -> home hub
```

Mow and Vacuum use separate focused scenes and content pipelines beneath a shared child-safe shell. Activity-specific content never becomes a growing conditional branch inside a single play scene.
