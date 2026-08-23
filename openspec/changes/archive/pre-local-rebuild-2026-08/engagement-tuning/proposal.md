## Why

After flying the live globe build, the moment-to-moment feel needs tuning — and one real bug. The numbers here are chosen from **human perception/cognition**, not guesswork: smooth-pursuit eye tracking tops out around **~30°/s** (and ~20°/s for precise aiming), simple reaction time is **~250ms** (choice ~500ms) so a threat needs a **~1.5s+** reaction budget, and comfortable screen FOV is **~60–75°**. Measured against those, today's globe runs enemies too fast to track, the horizon reads as a cramped marble, the minimap eats attention, and — the bug — **steering is inverted**. Players also want to opt out of bots and change controls without leaving a match.

These are science-grounded **starting points**; a final fly-test pass locks the values (screen size and ping shift the feel).

## What Changes

- **BUG — fix inverted steering.** On the sphere, turn rotates the forward vector about the surface normal; by the right-hand rule a positive turn is counter-clockwise *from the camera* = a **left** turn, but the right input sends `+1`. Negate the turn sign where it enters the spherical step, mirrored in **both** the server (`ArenaRoom.stepPlane`) and client prediction (`render3d._stepPredict`), and confirm the bank leans into the turn. Verify in **landscape** across keyboard, touch arrows, and gyro.
- **Slower enemies (trackable band).** `CRUISE_SPEED` 260→185 and `BOOST_SPEED` 440→320 so head-on closing falls into the ~30°/s smooth-pursuit band and the reaction budget rises from ~1.1s to ~1.7s. Optional `TURN_RATE` 3.2→2.6 for sweeping arcs instead of instant flips.
- **Flatter view, same play size.** Decouple a **visual render radius (≈×1.6)** from the gameplay radius: the planet is drawn on a bigger sphere (gentle horizon, see further) while all angular gameplay stays on the current radius — identical speeds/world/feel. Plus FOV 64→72 (under the ~75–80 distortion/sickness ceiling) and the chase camera a bit higher/back.
- **Less-obstructing minimap.** Smaller (~150→~110px), ~50% idle opacity, corner with safe-area inset, brightening only when a threat is within engagement range.
- **Bots on/off option.** A menu toggle (default on); off → the room skips the `MIN_PLAYERS` bot-fill and drops existing bots (a calm, human-only/solo room).
- **In-game control settings (change mid-match).** A Controls section in the existing in-game settings panel: steering mode Tilt↔Arrows (switches live), an **invert-steering** toggle (preference + safety net), and a sensitivity slider — persisted per device.

## Capabilities

### New Capabilities
- `game-feel`: perceptually-tuned flight and presentation — correct steering handedness, enemy speed within the human trackable band, a flatter same-size view (visual radius decoupled from gameplay + FOV/camera), and a minimap tuned for low attention cost.
- `player-options`: player-configurable match + control options — a bots on/off toggle, and in-game control settings (steering mode, invert, sensitivity) changeable mid-match and persisted.

### Modified Capabilities
<!-- None as spec deltas (no specs archived to openspec/specs/ yet). The steering-handedness fix and speed retune are authored within the new game-feel capability; they refine globe-arena flight behaviour but there is no archived spec to delta. -->

## Impact

- **Shared:** `src/shared/constants.ts` — `CRUISE_SPEED`, `BOOST_SPEED`, optional `TURN_RATE`.
- **Server:** `src/rooms/ArenaRoom.ts` — steering sign fix in `stepPlane`; bots flag via `onJoin` + `maintainBots`.
- **Client:** `public/js/render3d.js` — steering sign mirror in `_stepPredict`; visual-radius decouple; FOV/camera; minimap. `public/js/input.js` — invert + sensitivity + live gyro/touch switch. `public/js/main.js` + `public/index.html` + `public/css/style.css` — bots toggle, in-game control settings, persistence.
- **Constraint:** the game is **landscape-only** — keep the rotate-to-landscape guard; lay the new control settings / minimap / HUD out for horizontal. Don't regress the fixed `Renderer.init` startup / Quick Play; keep the arcade-cute art; compose with the live globe + game-shell.
- **Also:** fold in a re-test of the deferred **high-ping netcode feel** on the globe while in this neighbourhood.
- **Unaffected:** the leaderboard, matchmaking, schema/wire format, deployment pipeline.
