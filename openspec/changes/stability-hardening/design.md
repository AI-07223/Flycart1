## Context

SmashCart is an authoritative Colyseus 0.16 server (30 Hz sim, ~30 Hz patch) with a Three.js client doing prediction (local plane), snapshot interpolation (remotes), and bullet extrapolation. Two changes shipped/landed close together — `smooth-netcode` (prediction/interp) and `powerups` — and their seam produced several of the bugs here (prediction predates powerups). The audit found the architecture fundamentally sound (server authority holds, XSS escaped, monitor fail-closed, no constant drift), so this is **hardening, not redesign**: small, targeted, low-risk fixes with no wire-protocol break beyond one additive schema field.

## Goals / Non-Goals

**Goals:**
- Eliminate the crash/freeze-class bugs: disconnect freeze, unbounded GPU leaks, server `dt` blow-ups, NaN-state corruption.
- Make the client honest about state (pause, background, connection-lost, powerup timer).
- Close the prediction↔powerups seam so the local plane never rubber-bands.
- Keep it shippable in one pass, deployable via the existing Coolify-from-`main` pipeline.

**Non-Goals:**
- The globe arena — separate change (`globe-arena`).
- True rollback netcode (input sequence numbers + server echo) and server-side lag compensation — deferred future work, already noted in `smooth-netcode`'s open questions.
- Accounts, anti-cheat beyond input validation, or matchmaking changes.
- Art-direction / balance changes (durations, weights) beyond what a fix requires.

## Decisions

1. **Disconnect → recovery state machine (client).** Register `room.onLeave(code)` and `room.onError` in `net.js`; expose `Net.onDisconnect`. On fire: stop the playing loop, show a **connection-lost overlay**, and try `client.reconnect()` once (paired with a short server `allowReconnection` window) before falling back to a "reconnect" button that runs a single `resetToMenu()`. `resetToMenu()` nulls the room (`Net.leave()`), sets `mode="menu"`, resets `engineStarted`/`powerType`/`prevPhase`, and re-shows the start screen. *Why:* one transition fixes the freeze, the never-returns-to-menu latent bug, and the lingering audio at once.

2. **Honest pause + parked input.** Pause/background/visibility-loss send a single neutral input `{turn:0, boost:false, fire:false}` through the existing channel (the server holds last input, so we must actively neutralize). Pause overlay copy changes from "PAUSED" to reflect that you're still airborne, or pause becomes a true leave. Add `visibilitychange`/`pagehide` handlers. *Why:* the server keeps simulating; the only honest options are "park" or "leave", not a silent local freeze. *Note:* parking stops self-harm (flying/firing) but you can still be hit — acceptable and truthful.

3. **Dispose on removal (renderer).** Adopt the particle path's correct pattern (`material.dispose()`) everywhere, plus geometry disposal: a small `disposeObject(obj)` that traverses a Group and disposes each child's `geometry` + `material`, called in the bullet (~222), view (~205), pickup (~234), shield, and blob removal branches. Shared module-level geometries (`SPARK_GEO`/`PUFF_GEO`/`RING_GEO`/`BLOB_GEO`) are **never** disposed. Surface `renderer.info.memory.{geometries,textures}` + `programs.length` in `__debug()` so the leak can't silently regress (`scene.children.length` is misleading — leaked objects are detached but GPU-resident). *Why:* `scene.remove()` frees nothing GPU-side; this is the #1 stability bug.

4. **Bounded per-frame allocation.** Promote the three per-frame `new Set()`s to module-level sets cleared with `.clear()`; have `Net.sample()` write into a reused output object / mutate persisted per-id pose objects instead of fresh literals. *Why:* removes steady GC garbage that causes micro-stutter; cheap.

5. **Server timestep + input safety.** Clamp `update` to `dt = Math.min(dt, ~0.05)` (and optionally sub-step long frames); make bullet collision swept (segment-vs-circle) so it can't depend on step size. Validate input with `Number.isFinite` (drop NaN/Infinity to 0) **after** clamping. Add a per-`sessionId` min-interval / token-bucket gate at the top of `onMessage("input")` and `onMessage("setName")`. *Why:* removes tunneling (hits that should count), NaN lobby-corruption, and the shared-event-loop flood vector with a few lines.

6. **Bot population invariant.** Replace the `maintainBots` removal gate `players.size >= MAX_CLIENTS` with `bots.size > 0 && total > MIN_PLAYERS`, so a bot leaves as each human joins (target ≈ `MIN_PLAYERS`, fill toward more only if desired). *Why:* the current logic over-fills and never honors "make room for humans".

7. **Spawn protection.** `spawn()` sets a brief invulnerability window (a few hundred ms where `damage()` is a no-op) and prefers a point clear of live enemies/bullets; also reset `lastShot`. *Why:* removes instant respawn-kills / spawn-camping at re-entry.

8. **Intermission is not live.** Gate firing/`damage`/scoring/kill-feed on `phase === "playing"` (or freeze planes during intermission). *Why:* kills currently count then get wiped — confusing and unfair.

9. **Powerup-aware prediction + authoritative timer.** Add the missing powerup constants to `public/js/constants.js`; pass `p.power` into `_stepPredict` so the local target speed applies `AFTERBURNER_FACTOR`. Add a synced `Player.powerLeft` (seconds, server-decremented) and drive the HUD chip from it (kills the re-pickup lie). Scale the fire-SFX gate by `RAPID_FACTOR` when `power==="rapid"`. *Why:* one root cause (client blind to powerups) behind the rubber-band, the lying HUD, and the muted rapid-fire.

10. **Remote rendering robustness.** Bound remote extrapolation to a small window (≤~80 ms) on stall instead of freeze; stop straight-line-extrapolating `homing` bullets (snap them to last server pos each frame); fade/cull a bullet at its last position instead of advancing it the frame it despawns. *Why:* removes the snap-on-resume, the homing zig-zag, and the through-target ghost.

11. **Powerup state consolidation.** A single helper sets/clears `power` + `powerUntil` + `shield` together so no path leaves a stray shield charge or mismatched `power`; skip consuming `repair` at full HP. *Why:* the three maps are currently kept in lockstep by convention only.

12. **Light infra hardening (optional within this pass).** `helmet()` with same-origin CSP + `X-Frame-Options: DENY`; widen room codes to 6 chars (align `genCode`/`roomFromUrl`) generated server-side. *Why:* cheap defense-in-depth; low urgency for an indie game, so these are the trim-line if scope tightens.

## Risks / Trade-offs

- **Reconnect correctness** — `allowReconnection` needs a matching client token flow; if it's flaky, fall back to clean `resetToMenu()` (still a strict improvement over the freeze). Keep the window short (a few seconds).
- **Swept collision** vs. simple `dt` clamp — the clamp alone removes the catastrophic case; swept collision is the belt-and-suspenders. Ship the clamp first; swept can follow if tunneling still shows.
- **Spawn invulnerability** can feel odd if too long → keep it sub-second and drop it on first fire.
- **Additive schema field** (`powerLeft`) — client+server deploy together from `main` (single client), so no mixed-version skew, consistent with the powerups change.
- **Disposal bugs** — disposing a still-referenced shared geometry would break rendering; mitigated by only disposing per-instance resources and never the module-level shared geos.

## Migration Plan

Pure client fixes + server logic + one additive schema field, shipped together via Coolify-from-`main`. No data migration. Rollback = revert the change commit and redeploy. Land in dependency order: server safety (`dt`/NaN/bots/spawn/intermission) and renderer disposal first (highest value, lowest risk), then the connection/lifecycle state machine, then the prediction/HUD/SFX polish.

## Open Questions

- Pause semantics: park-in-place (simplest, truthful) vs. true leave-and-rejoin? Default to park + honest copy.
- Reconnect: how long an `allowReconnection` window before showing the manual button? Start ~3–5 s.
- Do we want the infra hardening (helmet/CSP, 6-char codes) in this pass or split to a tiny `infra-hardening` change? Default: include if cheap, else defer.
- Full rollback netcode / lag compensation — confirm it stays deferred (it does, per `smooth-netcode`).
