## Why

The game's motion reads as "not smooth" — but the root cause is **networking, not physics**. The Colyseus server broadcasts state at its default ~20 Hz (no `setPatchRate`), and the client (a) eases planes toward the latest value with an exponential-smoothing filter (laggy/floaty, not true interpolation) and (b) snaps bullets straight from state every frame, so **bullets teleport ~20×/sec** instead of gliding. The local player also has **no client-side prediction**, so steering feels soft. This change makes all motion buttery and the local plane crisp — without changing the wire protocol or weakening server authority.

## What Changes

- **Client-side bullet extrapolation** — advance each bullet along its heading every frame (bullets are deterministic straight lines), reconciling when a fresh server patch arrives.
- **Snapshot interpolation** for remote planes — buffer incoming states and render ~100 ms "in the past," lerping position and short-angle-lerping heading between the two surrounding snapshots (replaces the exponential-smoothing filter).
- **Client-side prediction + reconciliation** for the local plane — mirror the server's `stepPlane` physics locally from live input for instant response, then ease toward the authoritative state on each update (snap only on big discontinuities like respawn).
- **Fresher pipe** — server `setPatchRate` to ~33 ms (match the 30 Hz simulation).
- No **BREAKING** changes: `ArenaState`/wire protocol unchanged; the server remains authoritative for movement, collisions, and scoring.

## Capabilities

### New Capabilities
- `netcode-smoothing`: client-side interpolation (remote entities), extrapolation (bullets), and prediction + reconciliation (local plane) for smooth, crisp motion while the server stays authoritative.

### Modified Capabilities
<!-- None — no existing specs; server authority and protocol are unchanged. -->

## Impact

- **Client (most work):**
  - `public/js/net.js` — capture per-patch snapshots (timestamp + synced fields) into a short ring buffer via `room.onStateChange`.
  - `public/js/render3d.js` — interpolate remote planes from the snapshot buffer at a render delay; extrapolate bullets each frame; integrate the locally-predicted pose for the player's own plane.
  - `public/js/main.js` — feed live input into the local prediction step.
  - Prediction reuses the already-mirrored gameplay constants in `public/js/constants.js` (turn rate, accel, speeds, arena bounds, wall deflect).
- **Server (tiny):** `src/index.ts` or `src/rooms/ArenaRoom.ts` — `setPatchRate(~33ms)`. Simulation stays at 30 Hz.
- **Unaffected:** `ArenaState` schema, Colyseus rooms/matchmaking, deployment pipeline, audio/visuals.
