## Why

A deep five-dimension audit (netcode, rendering, server logic, security, client UX) surfaced a cluster of **existing bugs and latent risks** that hurt real players — none of which are features, all of which harden what already ships. The worst are high-frequency:

- **Every redeploy disconnects every player into a silent frozen screen** — the client registers no `onLeave`/`onError`, never returns to a menu, and offers no reconnect. Same for any mobile network blip.
- **GPU memory leaks** — bullets/planes/pickups/shields are `scene.remove()`'d but never `.dispose()`'d, so VRAM grows unbounded (~2,400 orphaned GPU objects/min in combat) → stutter then crash, worst on mobile.
- **"Pause" doesn't pause** — the server keeps flying (and killing) your plane behind the overlay.
- **Server has no `dt` clamp** — a single GC hitch lets fast bullets tunnel through planes, so legitimate hits silently don't count.
- **`turn: NaN` from one crafted client corrupts a whole lobby's shared state.**
- **Bots never yield to humans** — the removal branch only fires when the room is already full at 8, so the arena over-fills.
- The freshly-added **powerups break the older prediction** (afterburner rubber-bands your own plane the whole time) and mislead the HUD/SFX.

This change fixes them as a focused hardening pass. The deferred globe world is a **separate change** (`globe-arena`); deeper rollback/lag-compensation netcode remains future work.

## What Changes

- **Connection resilience** — detect disconnect (`room.onLeave`/`onError`), show a "connection lost" overlay, attempt a short reconnect, and define a single `resetToMenu()` state transition. Make pause/background/visibility send a **neutral parked input** so you stop self-harming; relabel "PAUSED" honestly. Stop looping audio on disconnect/hidden.
- **Render resource lifecycle** — dispose geometries + materials on every entity-removal path (bullets, planes/views, pickups, shields, blobs); reuse per-frame `Set`s and the interpolation output buffer to cut GC churn; surface `renderer.info` memory counters in `__debug()`.
- **Simulation robustness (server)** — clamp `dt` (and/or sub-step), reject non-finite inputs (NaN guard) and lightly rate-limit messages, fix the bot population logic so bots cede to humans, add brief **spawn invulnerability** + clear-area spawn, and gate combat/scoring/kill-feed to `phase === "playing"` so the intermission isn't live. Consolidate powerup state (`power`/`powerUntil`/`shield`) behind one helper.
- **Powerup-aware netcode** — feed `p.power` into client prediction (afterburner/rapid) to stop rubber-banding; bound remote extrapolation on packet stall instead of freeze-then-snap; stop straight-line-extrapolating homing bullets; cull ghost bullets.
- **Powerup HUD/SFX accuracy** — surface the authoritative remaining time (synced) so the chip can't lie on re-pickup; scale fire-SFX cadence by `RAPID_FACTOR`; don't consume `repair` at full HP.

## Capabilities

### New Capabilities
- `connection-resilience`: the client detects loss of the server connection, surfaces a recovery UI, attempts reconnection, and transitions cleanly between menu/playing/lost states; pausing or backgrounding parks the player's input server-side rather than silently leaving the last input active.
- `render-resource-lifecycle`: every GPU resource the renderer creates per entity is released when that entity is removed, so memory does not grow unbounded over a session; per-frame allocations are bounded.
- `simulation-robustness`: the authoritative server bounds its timestep, validates all client input as finite and rate-limited, maintains a sane bot/human population, protects freshly-spawned players, and only runs scoreable combat during the playing phase.

### Modified Capabilities
- `netcode-smoothing`: client prediction accounts for active powerup speed effects; remote interpolation degrades gracefully (bounded extrapolation) under packet loss; homing bullets and just-despawned bullets render without artifacts.
- `powerups`: the active-powerup remaining time is server-authoritative and reflected accurately in the HUD; fire SFX matches the real (rapid-adjusted) cadence; instant effects don't waste a pickup.

## Impact

- **Client:**
  - `public/js/net.js` — register `room.onLeave`/`onError`; expose connection-state callbacks; keep/clear `room` correctly.
  - `public/js/main.js` — connection-lost overlay + reconnect; `resetToMenu()` (resets `mode`, `engineStarted`, `powerType`, re-shows start screen); honest pause + neutral input; `visibilitychange`/`pagehide` handler; gate `enterImmersive` fullscreen to touch devices; rapid-aware fire SFX; drive the powerup chip from synced remaining-time.
  - `public/js/render3d.js` — dispose on removal (bullets ~222, views ~205, pickups ~234, shields/blobs); reuse `Set`s/output buffer; powerup-aware `_stepPredict`; bounded remote extrapolation; homing/ghost-bullet rendering; `__debug()` memory counters.
  - `public/js/input.js` — emit a neutral input on blur/visibility loss via the loop.
  - `public/js/audio.js` — suspend/stop loops on disconnect + tab-hidden.
  - `public/js/constants.js` — add the missing powerup constants (`AFTERBURNER_FACTOR`, `RAPID_FACTOR`, `FIRE_COOLDOWN`, …) used by prediction + SFX.
  - `public/index.html` / `public/css/style.css` — connection-lost overlay element; `viewport-fit=cover` + safe-area insets for touch controls.
- **Server:**
  - `src/rooms/ArenaRoom.ts` — `dt` clamp/sub-step; finite-input validation + per-client throttle in `onMessage`; fixed `maintainBots`; spawn invulnerability + clear-area `spawn`; intermission gating in `update`/`damage`; powerup-state helper; reset `lastShot` on spawn.
  - `src/schema/ArenaState.ts` — add a synced `Player.powerLeft` (or expiry) field so the HUD timer is authoritative (additive).
  - `src/shared/constants.ts` — spawn-invuln duration, dt cap, rate-limit thresholds.
  - `src/index.ts` — optional `helmet` + `X-Frame-Options`; widen room codes (see design).
- **Unaffected:** matchmaking topology, the monitor auth, deployment pipeline, the visual/audio art direction.
