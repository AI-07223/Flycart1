## 1. Server freshness

- [ ] 1.1 Add `setPatchRate(~33ms)` (match the 30 Hz sim) in the room/bootstrap; confirm clients receive ~30 patches/sec

## 2. Snapshot capture

- [ ] 2.1 In `net.js`, subscribe to `room.onStateChange` and push `{ t: clientNow, players: {id:{x,y,angle,alive}}, bullets: {key:{x,y,angle}} }` into a bounded ring buffer (~1 s)
- [ ] 2.2 Expose a helper to read the buffer (or the two snapshots surrounding a given render time)

## 3. Remote interpolation

- [ ] 3.1 Replace the exponential-smoothing of remote planes in `render3d.js` with time-based interpolation at `now - INTERP_DELAY` (~100 ms): lerp x/z, shortest-path lerp heading
- [ ] 3.2 Detect discontinuities (respawn/join/teleport) and snap instead of interpolating across them
- [ ] 3.3 Keep bank/bob/prop visuals driven by the interpolated motion

## 4. Bullet extrapolation

- [ ] 4.1 Advance each bullet by `heading × BULLET_SPEED × dt` every frame; reconcile to the authoritative position when a patch updates it
- [ ] 4.2 Cull bullets locally past their known lifetime to avoid lingering ghosts before the server removes them

## 5. Local prediction + reconciliation

- [ ] 5.1 Mirror `stepPlane` (turn, accel-to-target-speed, wall clamp/deflect) client-side for the local plane using live `Input` each frame
- [ ] 5.2 Ease the predicted pose toward the authoritative self-state each update (proportional correction); snap on large error (respawn)
- [ ] 5.3 Drive the chase camera from the predicted local pose so control + camera feel instant

## 6. Verify & ship

- [ ] 6.1 Local headless verification (Preview): bullets advance between patches, remote planes interpolate (no stutter), local prediction responds instantly and reconciles, no console errors
- [ ] 6.2 Sanity: server still authoritative (positions/scoring unaffected); `tsc --noEmit` clean
- [ ] 6.3 Commit → push `main` → redeploy via Coolify; verify live (game 200, matchmake + WebSocket 101) and spot-check smoothness
