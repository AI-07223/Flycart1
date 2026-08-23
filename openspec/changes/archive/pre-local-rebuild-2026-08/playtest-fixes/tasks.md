## 1. Constants & difficulty tiers (src/shared/constants.ts)

- [x] 1.1 Bump `PICKUP_RADIUS` 24 → 44
- [x] 1.2 Add bot difficulty tier table: `BOT_DIFFICULTY` map of `easy|medium|high` → `{ aimErr, fireCone, leadFactor, reactMin, reactMax }` using the design's numbers
- [x] 1.3 Add `DEFAULT_BOT_DIFFICULTY = "medium"`

## 2. Bot AI difficulty (src/sim/GameSim.ts)

- [x] 2.1 Add `botDifficulty` to room state/init (default Medium) + to `snapshot()`/`fromSnapshot()` (P2P serialization) and `getState()`
- [x] 2.2 Extend `setHostSettings()` to accept `botDifficulty` (private rooms only, host-gated like mode/roundLength); apply to existing bots
- [x] 2.3 Extend `BotBrain` with `aimErr, fireCone, leadFactor, reactMin, reactMax`; populate from the room tier in `addBot()` and refresh on tier change
- [x] 2.4 In `thinkBot()`: scale lead by `leadFactor`; add steady per-window yaw jitter in `[-aimErr,+aimErr]` to `desired` (re-roll on retarget); fire gate uses `fireCone` not `0.15`; `retargetAt = now + rand(reactMin, reactMax)`
- [x] 2.5 Confirm both paths read the same field: ArenaRoom (Colyseus) and P2P host-sim produce identical bot behaviour for a given tier

## 3. Joystick handedness (src/client/input.ts)

- [x] 3.1 Flip joystick `turn` so drag-right = positive turn (match d-pad); keep `invertSteer` flipping the final value
- [x] 3.2 Re-check tilt scheme uses the same handedness convention as d-pad/joystick
- [x] 3.3 Leave pitch as-is; confirm `invertPitch` still works as the escape hatch

## 4. Multitouch d-pad (src/client/main.ts)

- [x] 4.1 Rework on-screen button handlers (left/right/climb/dive/boost/fire) to per-pointer tracking (touch.identifier or Pointer Events + setPointerCapture)
- [x] 4.2 Each button sets its `Input.touch.*` flag on its own pointer-down and clears only when that pointer ends/cancels — no shared single-touch state
- [x] 4.3 Verify steer + fire + boost can be held simultaneously (joystick scheme untouched / still identifier-tracked)

## 5. Force landscape (src/client/main.ts)

- [x] 5.1 On touch devices, show `#rotate-overlay` blocking interaction whenever orientation is portrait (menu AND in-game)
- [x] 5.2 Drive it from `matchMedia("(orientation: portrait)")` + `resize`/`orientationchange`; hide on landscape
- [x] 5.3 Keep best-effort `screen.orientation.lock('landscape')` where supported; overlay is the fallback
- [x] 5.4 Non-touch (keyboard) devices never see the overlay

## 6. Difficulty menu UI (src/client/main.ts + HTML/CSS)

- [x] 6.1 Add Easy/Medium/High selector to the menu; default Medium
- [x] 6.2 Persist choice in `localStorage` key `smashcart.difficulty` (mirror control-scheme handling)
- [x] 6.3 Send chosen difficulty when creating/hosting a private room; host can change it via host settings
- [x] 6.4 Public Quick Play uses the default tier

## 7. Build, verify, deploy

- [x] 7.1 `npm run build` (esbuild) — regenerate `public/js/*` (input.js, main.js, constants.js); confirm bundles reflect edits
- [x] 7.2 Local sanity: server boots, a bot match runs, no TS/runtime errors; confirm bots are noticeably weaker at Easy
- [x] 7.3 Do NOT regress P2P / TDM / host-settings / lobby flow or input-sequencing (Player.seq/turn/climb)
- [x] 7.4 Commit, push, Coolify redeploy — be patient (5× npm-ci retry loop; don't cancel mid-build)
- [x] 7.5 Post-deploy: fly-test on a phone (or via user screenshot) to confirm steering direction, multitouch, landscape lock, and difficulty feel
