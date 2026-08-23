## Context

The globe build (`globe-arena`) is live and feels close, but a fly-test surfaced one bug (inverted steering) and several feel issues. The sim is server-authoritative on a sphere: `stepPlane` turns via `S.turn(p, f, input.turn * TURN_RATE * dt)`, mirrored in client prediction `render3d._stepPredict`; speeds are linear (`CRUISE_SPEED`/`BOOST_SPEED`) converted to angular by `/radius`; the renderer places everything at `dir × (radius + alt)` with a surface-following chase camera (`FOV_BASE`, `CAM_UP`, `CAM_BACK`) and a player-centric radar minimap. Bots fill to `MIN_PLAYERS` via `maintainBots`. The game is landscape-only (a rotate guard covers portrait). No schema/wire change is involved — this is tuning + client options.

## Goals / Non-Goals

**Goals:**
- Correct steering handedness (bug).
- Bring enemy on-screen motion into the human trackable band and restore a real reaction budget.
- Make the world read flatter / show more **without changing the play size or feel**.
- Reduce the minimap's attention cost.
- Let players turn bots off, and change controls mid-match.
- Choose every number from human-factors data, then lock with one fly-test.

**Non-Goals:**
- No schema/wire/protocol change; no matchmaking rewrite; no new game modes.
- No change to the gameplay *size* of the world (angular radius, encounter density stay as-is).
- Not a netcode rewrite — high-ping is a re-test/observation here, not a redesign.

## Decisions

### 1. Fix inverted steering at the sign, in lockstep
Negate the turn where it enters the spherical step: `S.turn(p, f, -input.turn * TURN_RATE * dt)` in **both** `ArenaRoom.stepPlane` (authoritative) and `render3d._stepPredict` (prediction) — they must match or the local plane fights the server. Then confirm **bank leans into the turn**; if it now rolls the wrong way, flip the one sign on `bankTarget`. *Why at the sign, not at input:* `input.turn` is also sent to the server and reused for bank, so flipping it once at the rotation keeps a single source of truth. Verify in **landscape** for keyboard, touch arrows, and gyro (gyro maps a different device axis per orientation, so it gets its own check).

### 2. Enemy speed from the smooth-pursuit + reaction-time bands
Humans track motion smoothly up to ~30°/s (aim ~20°/s); beyond that the eye saccades and targets "jump." At the common radius (700), today's boost = 36°/s and **head-on closing ≈72°/s** — 2–3× the aim band. Cut `CRUISE_SPEED` 260→185 (≈15°/s, closing ≈30) and `BOOST_SPEED` 440→320 (≈26°/s, closing ≈52, but boost is a brief deliberate burst). Reaction budget — spotting an enemy ~0.5 rad out — rises from ~1.1s to ~1.7s, clearing the ~0.5s choice-RT + aim. Optional `TURN_RATE` 3.2→2.6 (180° flip ~1.0s→~1.25s) for sweeping arcs over instant flips.

### 3. Flatter, same size — decouple a visual render radius from the gameplay radius
Horizon curvature is governed by radius: the horizon's angular dip ≈ `√(2h/R)` for camera height `h`. So rendering the planet on a **bigger sphere flattens the horizon and lets you see further** — without touching gameplay. Introduce `VISUAL_RADIUS = gameplayRadius × K` (K ≈ 1.6) and key **all render placement** (entities at `dir × (VISUAL_RADIUS + alt)`, the chase camera, fog) off it, while **all gameplay (angular speeds, positions, hit tests) stays on the gameplay radius** — identical world, speeds, encounters.
- *Interaction to watch:* a bigger visual sphere scrolls the ground ~`√K` faster (≈1.27× for K=1.6); the speed cut (≈0.71×) more than offsets it, netting a slightly calmer ground. Enemy *relative* tracking is set by the (reduced) angular speed and is essentially independent of `K`. So the two levers compose.
- Plus `FOV_BASE` 64→72 (more peripheral awareness; under the ~75–80 distortion/sim-sickness ceiling — important on phones) and camera a touch higher/back (`CAM_UP` 78→~96, `CAM_BACK` 150→~165) for a flatter ¾ view.
- *Why not just raise FOV?* Wider FOV alone shows *more* curvature (rounder) and shrinks targets (Fitts); the visual-radius flatten is what actually removes the marble look.

### 4. Minimap: lower attention cost
Each glance costs ~200–500ms of attention. Shrink ~150→~110px, ~50% idle opacity, corner with `env(safe-area-inset)`, and brighten only when a threat is within engagement range (peripheral motion/contrast is what the eye catches). Keeps the radar glanceable, not dominant.

### 5. Bots toggle via a separate matchmaking bucket
`joinOrCreate` groups by `code` (`filterBy(['code'])`), so a bots-on and a bots-off player can't share a room cleanly. The menu toggle therefore selects the **matchmaking bucket**: bots-on → `PUBLIC` (current), bots-off → a distinct code (e.g. `PUBLIC-NB`). The room derives bot-fill from its code/create-options: in the no-bots bucket, `maintainBots` skips filling and drops any existing bots. *Trade-off (documented):* the no-bots bucket has a smaller human pool, so it's often solo/calm — which is the point (practice/chill). *Alternative — per-room "first joiner decides":* rejected; it makes a player's experience depend on who they happened to match with.

### 6. In-game control settings, live and persisted
Add a Controls section to the existing in-game `#settings-panel` (already reachable via ⚙ mid-match): steering mode **Tilt ↔ Arrows** (switch live via `Input.enableGyro()/disableGyro()` + show/hide the steer pad/recenter), an **invert-steering** toggle (a sign applied to `input.turn` — user preference *and* a safety net for the handedness bug), and a **sensitivity** slider (`Input.setGyroSensitivity` / a turn-rate scalar). Persist all in `localStorage` like the plane skin. Enabling gyro mid-game happens inside the toggle's click (a user gesture — satisfies iOS permission).

### 7. Landscape-only is a hard constraint
Keep the rotate-to-landscape guard. The new Controls section, the resized minimap, and any HUD changes are laid out for **horizontal** screens (wide, short). Don't regress the fixed `Renderer.init` startup or Quick Play.

### 8. Numbers are starting points; a fly-test locks them
Every value above is derived from population-level human-factors data, but the final feel depends on the player's screen size and ping. The apply phase ends with a deliberate fly-test to nudge speed / K / FOV / minimap to taste.

## Risks / Trade-offs

- **Double-inversion (bank vs turn)** → fly-test turn *and* roll together; bank has its own sign if needed.
- **Visual-radius detaching entities/camera** → all render placement (entities, camera, fog) must derive from `VISUAL_RADIUS` consistently, or planes float off the surface. Single constant, used everywhere render-side.
- **Ground-scroll speed-up from bigger K** → offset by the speed cut; if it still feels fast, lower K or speeds (fly-test).
- **No-bots bucket empty** → expected and acceptable (calm/practice mode); communicated by the toggle's intent.
- **Mid-game control switch glitches** → reuse the existing `Input` gyro/touch plumbing; test switching during active flight.
- **Tuning regressions** → values live in constants/render tuning; trivially revertable via git.

## Migration Plan

Pure tuning + client options; no schema/wire change, so no breaking concerns. Implement, `tsc` + headless verify, then **fly-test** (steering/bank in landscape across input modes; speed/flat/minimap to taste; bots-off bucket; mid-game control switch). Commit → push → Coolify redeploy (be patient — don't cancel mid-build; ~13–15 min). Rollback = git-revert + redeploy. While live, observe high-ping feel on the globe and note whether a netcode follow-up is warranted.

## Open Questions

- Exact final values: `K` (~1.6), cruise/boost (185/320), `TURN_RATE` (3.2 vs 2.6), FOV (72), minimap size — fly-test.
- No-bots bucket: pure solo, or match other no-bots humans? (Default: shared no-bots bucket so humans can still meet; just no bot-fill.)
- Should "invert steering" default on for anyone, or stay off once the handedness bug is fixed? (Default off; it's a preference, not the fix.)
