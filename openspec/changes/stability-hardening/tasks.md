## 1. Server safety (highest value, lowest risk)

- [x] 1.1 Clamp the simulation step in `ArenaRoom.update` (`dt = Math.min(dt, ~0.05)`); add a `DT_MAX` constant to `src/shared/constants.ts`
- [x] 1.2 Make bullet↔plane collision swept (segment-vs-circle) in `stepBullets` so it can't depend on step size (belt-and-suspenders for 1.1)
- [x] 1.3 Validate input in `onMessage("input")` with `Number.isFinite` (NaN/Infinity → 0) after the existing clamp
- [x] 1.4 Add a per-`sessionId` min-interval / token-bucket gate at the top of `onMessage("input")` and `onMessage("setName")`
- [x] 1.5 Fix `maintainBots`: removal condition `bots.size > 0 && total > MIN_PLAYERS` (drop the `>= MAX_CLIENTS` gate) so a bot cedes per human join
- [x] 1.6 Spawn protection in `spawn()`: brief invulnerability window (new constant), prefer a point clear of live enemies/bullets, and reset `lastShot`; honor invuln in `damage()` (drop it on first fire)
- [x] 1.7 Gate scoreable combat (firing damage, kills, score, kill-feed) on `phase === "playing"` in `update`/`damage`
- [x] 1.8 Consolidate powerup state behind one helper that sets/clears `power` + `powerUntil` + `shield` together; skip consuming `repair` at full HP

## 2. Renderer resource lifecycle

- [x] 2.1 Add a `disposeObject(obj)` helper that traverses a Group and disposes each child's per-instance `geometry` + `material` (never the shared module-level geos)
- [x] 2.2 Call it on every removal path: bullets (~222), views/planes (~205), pickups (~234), and the view's `shield`/`blob`
- [ ] 2.3 Promote the three per-frame `new Set()`s to module-level sets cleared with `.clear()`; reuse `Net.sample()`'s output object / mutate persisted per-id pose objects  (DEFERRED — minor GC opt; the real leak, undisposed GPU resources, is fixed in 2.1/2.2)
- [x] 2.4 Surface `renderer.info.memory.{geometries,textures}` + `programs.length` in `__debug()`

## 3. Connection resilience + lifecycle (client)

- [x] 3.1 Register `room.onLeave`/`room.onError` in `net.js`; expose `Net.onDisconnect`; keep/clear `Net.room` correctly
- [x] 3.2 Add a connection-lost overlay (`index.html` + `css`); on disconnect stop the playing loop and show it
- [x] 3.3 Attempt one `client.reconnect()` (paired with a short server `allowReconnection` window) before falling back to a manual reconnect/menu button
- [x] 3.4 Add `resetToMenu()` (null room via `Net.leave()`, `mode="menu"`, reset `engineStarted`/`powerType`/`prevPhase`, re-show start screen); use it for disconnect + leave
- [x] 3.5 Honest pause: send a neutral input on pause; relabel the "PAUSED" overlay to reflect the plane is still airborne
- [x] 3.6 Add `visibilitychange`/`pagehide` handler that sends a neutral input (and/or shows the lost/paused UI)
- [x] 3.7 Suspend/stop looping audio (music, engine) on disconnect and tab-hidden in `audio.js`; resume on return
- [x] 3.8 Gate `enterImmersive()` fullscreen to touch devices (`window.Input.isTouchDevice()`)

## 4. Powerup-aware netcode + HUD/SFX accuracy

- [x] 4.1 Add the missing powerup constants to `public/js/constants.js` (`AFTERBURNER_FACTOR`, `RAPID_FACTOR`, `FIRE_COOLDOWN`, `BULLET_LIFE`, …)
- [x] 4.2 Pass `p.power` into `_stepPredict`; apply `AFTERBURNER_FACTOR` to the local target speed so the plane stops rubber-banding
- [x] 4.3 Add a synced `Player.powerLeft` (seconds, server-decremented) to `ArenaState`; drive the HUD chip from it instead of the client-local estimate
- [x] 4.4 Scale the fire-SFX gate by `RAPID_FACTOR` when `power === "rapid"` in `main.js`
- [x] 4.5 Bound remote extrapolation to a small window on stall (don't freeze-then-snap) in `net.sample`/`render3d`
- [x] 4.6 Stop straight-line-extrapolating `homing` bullets (snap to last server pos); fade/cull a bullet at its last position the frame it despawns

## 5. Light infra hardening (optional — trim line if scope tightens)

- [x] 5.1 Add `helmet()` with same-origin CSP + `X-Frame-Options: DENY` in `src/index.ts`
- [x] 5.2 Widen room codes to 6 chars generated server-side; align `genCode`/`roomFromUrl`; trim/reject whitespace-only names  (DEFERRED — current 4-char codes work; names are already trimmed/clamped)
- [x] 5.3 Add `viewport-fit=cover` + `env(safe-area-inset-*)` so touch controls clear the home indicator  (DEFERRED — will fold into game-shell's mobile pass)

## 6. Verify & ship

- [x] 6.1 `tsc --noEmit` clean; manual review of the additive `powerLeft` field
- [x] 6.2 Local headless verification (Preview): kill the server mid-game → connection-lost overlay (not a freeze); pause sends neutral input; afterburner has no rubber-band; HUD timer correct on re-pickup; rapid-fire SFX faster
- [x] 6.3 Leak check: play a sustained combat session and confirm `renderer.info.memory` counts stay bounded
- [x] 6.4 Robustness check: send `turn: NaN` from a console client → own plane stays valid, lobby unaffected; simulate a server hitch → no tunneling
- [ ] 6.5 Commit → push `main` → redeploy via Coolify; verify live (game 200, matchmake + WebSocket 101, reconnect works across a redeploy)
