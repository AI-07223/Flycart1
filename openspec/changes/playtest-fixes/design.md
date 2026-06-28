## Context

Current flat-world build (HEAD `b2c93a7`). Client is TypeScript in `src/client/*.ts`, bundled by esbuild to `public/js/*.js`. Game sim is `src/sim/GameSim.ts`, a pure module shared by the Colyseus `ArenaRoom` (authoritative server) and the P2P `host-sim` (a guest/host runs the same sim locally). Any sim change must work in both paths.

Relevant current behaviour:

- **Bots** (`GameSim.thinkBot()`): `BotBrain = { targetId, retargetAt, wanderYaw }`. Lead-aim is exact — `leadTime = dist / BULLET_SPEED * 0.8`, `desired = normalize(leadPos - myPos)`. Fire gate: `aim < 0.15 rad && |altDelta| < 70 && dist < 560`. No per-bot skill → uniformly deadly (~18/10).
- **Steering** (`src/client/input.ts`): d-pad `steer = right - left` (right = +1); joystick `turn = invertSteer ? -dx : dx` (dx>0 = drag right). Reported reversed in play. Flat sim turns via `S.turn(f, WORLD_UP, ang)`.
- **Orientation** (`src/client/main.ts`): portrait shows only a soft note; `#rotate-overlay` exists but does not hard-block.
- **Pickups** (`GameSim.collectPickups()`): collected when `distance <= PICKUP_RADIUS + PLANE_RADIUS` = `24 + 16 = 40`. `PICKUP_RADIUS = 24` in `src/shared/constants.ts:68`.

## Goals / Non-Goals

**Goals:**
- Three selectable bot difficulty tiers; even High beatable by a skilled human.
- Touch d-pad supports concurrent steer + fire + boost.
- One consistent steering handedness across all schemes; `invertSteer` still flips.
- App forces landscape on touch from first load (menu + game).
- Powerups easier to grab.
- Server room and P2P host-sim behave identically.

**Non-Goals:**
- No netcode/jitter-buffer/rollback work (deferred).
- No change to bullet/plane geometry or visual orb size.
- No per-bot difficulty mixing within a room (one tier per room).
- Verifying steering *direction* headless (impossible — no WebGL screenshot; relies on fly-test / user screenshot).

## Decisions

### Difficulty as room state, computed into per-bot brain params

Add `botDifficulty: "easy" | "medium" | "high"` to room state (default `"medium"`). Source of truth: the room. Plumb it through the existing host-settings path — `setHostSettings()` already carries `roundLength/roomName/botsInRoom/mode`; add `botDifficulty` (private rooms only, host-gated like the others). Public Quick Play uses the default tier. The client persists the player's menu choice in `localStorage` (key `smashcart.difficulty`) and sends it when creating/hosting a private room, mirroring how control-scheme is handled.

`BotBrain` gains tuning fields derived from the tier when a bot is created (and refreshed if the room tier changes): `aimErr`, `fireCone`, `leadFactor`, `reactMin`, `reactMax`. `thinkBot()`:
- adds a random yaw jitter in `[-aimErr, +aimErr]` to `desired` (re-rolled on each retarget so it is steady within a tracking window, not per-tick noise),
- fires when `aim < fireCone` (instead of the hard-coded `0.15`),
- scales the lead term by `leadFactor` (`leadTime *= leadFactor`),
- sets `retargetAt = now + rand(reactMin, reactMax)`.

Tier table:

| Tier   | aimErr (rad) | fireCone (rad) | leadFactor | react (s)  |
|--------|--------------|----------------|------------|------------|
| Easy   | 0.30         | 0.12           | 0.4        | 0.8 – 1.4  |
| Medium | 0.16         | 0.13           | 0.7        | 0.6 – 1.0  |
| High   | 0.07         | 0.15           | 0.9        | 0.4 – 0.8  |

Even High keeps `aimErr = 0.07` (~4°) and `leadFactor < 1`, so shots are not pinpoint. Numbers are first-pass and tunable after a fly-test.

*Alternative considered:* a 1–10 numeric slider. Rejected — three named tiers are simpler to expose in-menu and to reason about; the tiers map onto the user's "Easy 2–3 / Medium 4–6 / High 8–10" intent.

### Steering: fix at the joystick source, keep one handedness

Align every scheme to "right input = positive turn". D-pad already is (`right - left`). Flip the joystick branch so drag-right = positive (matching d-pad), and re-check tilt uses the same convention. `invertSteer` continues to negate the final turn for all schemes. Pitch (`climb`) convention left as-is unless the fly-test shows it inverted; `invertPitch` remains the escape hatch.

*Caveat:* the actual on-screen turn direction can't be confirmed headless. We make all schemes consistent with each other and with `invertSteer`, then confirm absolute direction via a fly-test or a user screenshot.

### Multitouch d-pad via per-pointer tracking

Rework the on-screen button handlers in `main.ts` so each button maps a held `touch.identifier` (or Pointer Events with `setPointerCapture`) to its `Input.touch.*` flag, set on start and cleared only when *that* pointer ends/cancels. No shared single-touch state across buttons. The joystick already does identifier tracking and is untouched.

### Forced landscape: overlay gates, lock is best-effort

On touch devices, show `#rotate-overlay` whenever orientation is portrait (menu and in-game), blocking interaction; hide it on landscape. Drive it from a `matchMedia("(orientation: portrait)")` listener plus `resize`/`orientationchange`. Keep the best-effort `screen.orientation.lock('landscape')` where the API exists; the overlay is the fallback for platforms that lack it (iOS Safari). Non-touch (keyboard) devices never see the overlay.

### Pickup radius 24 → 44

Bump `PICKUP_RADIUS` to 44 → effective grab radius `44 + 16 = 60` (was 40). Sim-authoritative, applies to both paths automatically. Visual orb size is independent and unchanged. Note the same constant guards pickup *spawn* placement (`insideLandmark(pos, PICKUP_RADIUS)`); a slightly larger spawn-avoid margin is harmless.

## Risks / Trade-offs

- **Steering direction still a guess headless** → align all schemes + `invertSteer`, confirm with fly-test / user screenshot before declaring fixed.
- **P2P vs server divergence** → all sim logic stays in `GameSim`; both paths read `botDifficulty` from the same room-state field. Add no behaviour outside the shared sim.
- **Host-settings / netcode regression** → extend `setHostSettings` additively; do not touch input-sequencing fields (`Player.seq/turn/climb`).
- **Difficulty numbers wrong on first pass** → tiers are plain constants; re-tune after fly-test. Default Medium keeps the common case sane.
- **esbuild bundle drift** → must rebuild `public/js` after `src/client` edits; verify `input.js`/`main.js`/`constants.js` reflect changes before deploy.

## Migration Plan

1. Edit `src/shared/constants.ts` (PICKUP_RADIUS + difficulty tier table), `src/sim/GameSim.ts` (brain params, thinkBot, host-settings field, room init), `src/client/input.ts` (joystick sign), `src/client/main.ts` (multitouch, landscape gate, difficulty menu + persistence + send).
2. `npm run build` (esbuild) → regenerate `public/js/*`.
3. Local sanity: server boots, a bot match runs, no TS errors.
4. Commit, push, Coolify redeploy (patient — 5× npm-ci retry loop; don't cancel mid-build).
5. Rollback = revert the commit and redeploy; all changes are additive/constant-level with no schema migration.

## Open Questions

- Exact difficulty numbers — confirm feel after a real fly-test.
- Whether public Quick Play should later bucket by difficulty (out of scope now; default tier used).
