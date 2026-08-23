## Context

Authoritative Colyseus 0.16 server simulates at 30 Hz and broadcasts at the default ~20 Hz. The Three.js client renders at 60+ Hz. Current client motion uses exponential smoothing for planes (`cx += (target-cx)*k`) and reads bullet positions straight from state each frame. Gameplay constants are mirrored client-side in `public/js/constants.js`, which makes local simulation feasible. Goal: smooth, crisp motion with no protocol change and no loss of server authority.

## Goals / Non-Goals

**Goals:**
- Buttery remote-entity motion (no stutter/floatiness).
- Bullets that glide, not teleport.
- Instant-feeling local control via prediction.
- Minimal, safe server change; rollout-compatible (no schema change).

**Non-Goals:**
- Full rollback netcode with per-input acknowledgements (possible future work).
- Lag compensation / server-side rewind for hit detection (server stays as-is).
- Any change to the flight model, visuals, audio, or the globe (separate changes).

## Decisions

1. **Bullet extrapolation (deterministic).** Each frame, advance every bullet by `heading × BULLET_SPEED × dt` client-side; when a fresh patch arrives, ease/snap to the authoritative position. Bullets travel in straight lines with known `angle` and lifetime, so extrapolation is essentially exact. *Why:* removes the most visible stutter with the least code.

2. **Snapshot interpolation for remote planes.** Capture a snapshot `{t, perEntity {x,y,angle}}` on each `room.onStateChange` into a ring buffer (~1 s). Render at `renderTime = now − INTERP_DELAY` (~100 ms ≈ 2–3 patches), finding the two surrounding snapshots and lerping position + short-angle-lerping heading. *Why:* true time-based interpolation is smooth and jitter-tolerant; the fixed delay hides packet timing variance. *Alt rejected:* keep exponential smoothing (floaty, the current problem).

3. **Local prediction + smoothing reconciliation (no input sequencing).** Simulate the local plane each frame from live input using the mirrored `stepPlane` math (turn, accel toward target speed, wall clamp/deflect). On each authoritative self-update, ease the predicted pose toward the server pose (proportional correction), snapping only when error is large (respawn/teleport). *Why:* gives instant control with bounded drift and **no protocol change**. *Alt considered:* true rollback with input sequence numbers + server echo of last-processed seq — more correct under loss, but needs server changes; deferred (see Open Questions).

4. **Fresher broadcasts.** `setPatchRate(~33ms)` to match the 30 Hz sim. Keep sim at 30 Hz (60 Hz doubles CPU; interpolation + prediction already deliver smoothness). *Why:* lower latency at negligible cost.

5. **Authority unchanged.** The server still owns positions, collisions, damage, and scoring. Prediction/interpolation are presentation-only; you cannot gain an advantage (you aim at server-driven interpolated enemy positions, and the server arbitrates hits).

## Risks / Trade-offs

- **Prediction drift without input acks** (packet loss/lag spikes) → visible correction → mitigate with smooth easing + a snap threshold for large errors; tune correction rate.
- **Interpolation delay adds ~100 ms to *other* players' apparent positions** (standard tradeoff) → your own plane is instant via prediction; hit detection is server-side so fairness is unaffected. Keep delay tunable.
- **Discontinuities** (join/leave, respawn, round reset) → detect and snap instead of interpolating across the jump.
- **Buffer bookkeeping** for entities entering/leaving → key by sessionId; drop buffers on leave.

## Migration Plan

Client-side changes plus a one-line server `setPatchRate`. Protocol/schema unchanged, so old and new clients interoperate during rollout. Deploy via the existing Coolify-from-`main` pipeline; rollback = revert the commit and redeploy.

## Open Questions

- Add input **sequence numbers** + server echo for true rollback later if drift is noticeable under real-world latency?
- Exact `INTERP_DELAY` (start ~100 ms) and prediction correction rate — tune during implementation.
- Should bullets also interpolate spawn (first-frame) to avoid a pop? (minor)
