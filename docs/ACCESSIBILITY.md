# Accessibility

MowerBoy is built around a no-fail contract.

## Never

- No timer
- No damage
- No game over
- No lives
- No score that goes down
- No trap that needs a precise corner to escape (Home always works)

## Motor

Default is **one-finger magnet drive**: the mower steers toward the finger and throttles while the finger is down.

Also in Settings:

- **Tap to go** — tap a spot, the mower drives itself there
- **Always go** — cruise control; finger only steers (engine never dies)
- **Big arrows** — huge on-screen pad

All tap targets are ~80px+.

The game relayouts without restarting when browser chrome appears/disappears, the device rotates, or a Fold viewport changes size. A held pointer is released on pointer cancel, game-out, window blur, or a hidden-tab transition so a machine cannot stay driving after the child leaves the page. Vacuum suction also stops when the child lifts their finger; an idle machine never cleans invisibly.

## Sensory

- Engine pitch follows throttle (the point of the toy)
- Separate sliders: all sound, engine, world
- Mute is always on screen
- **Calm motion** reduces particles and celebration bits; engine stays unless muted
- **Strong colors** boosts cut vs tall grass
- Celebration is warm, not strobing

iOS will not play audio until the first tap. The title screen and first pointer both unlock the audio graph.

## Reading

Pictures first. Short labels under buttons. Tutorial is three sentences with a giant Play button.

## Open play and progress

Every machine, yard, activity, and room is available immediately. There are no locks, unlock requirements, currency, or parent setup gates.

Completion checks only remember happy history and show a gentle celebration. They never restrict content or reduce. Save is automatic in the browser on that device.

## Accidental exit protection

- Safe Home is on by default and requires two taps within 1.7 seconds.
- Full screen removes browser tabs where the browser permits it; Android Chrome on plain LAN HTTP supports this even when PWA installation is unavailable.
- The game never traps the browser Back action or hides the parent’s ability to leave fullscreen.
