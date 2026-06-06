## 1. Fix inverted steering (bug — highest value first)

- [x] 1.1 Root cause: the bug is in the **human input mapping**, not the sim (bots aim correctly with the current sign). Fixed at the source in `public/js/input.js` — `get()` negates the analog turn (base sign -1 = right→right), so keyboard, touch arrows, gyro, client prediction, and bank all correct in one place; bots untouched. (Server `stepPlane` turn sign left as-is.)
- [x] 1.2 Client prediction auto-consistent — `_stepPredict` reads the same negated `window.Input` turn, so no separate sign needed
- [x] 1.3 Bank auto-corrects — local bank derives from `input.turn` (now negated) so it flips with the turn; remote bank derives from actual forward delta (invariant). Added an `invertSteer` hook for the user toggle
- [x] 1.4 `tsc` clean; `verify-sphere.cjs` 20/20; headless OK. **Direction/bank in landscape across keyboard/touch/gyro = fly-test (7.2)**

## 2. Enemy speed (trackable band)

- [x] 2.1 `CRUISE_SPEED` 260→185, `BOOST_SPEED` 440→320 (shared constants + `public/js/constants.js` mirror)
- [ ] 2.2 (Optional) `TURN_RATE` 3.2→2.6 — left at 3.2; decide during the fly-test

## 3. Flatter view, same play size

- [x] 3.1 `render3d`: split radii — `curR` (gameplay, used by `_stepPredict` + bullet extrapolation, matches server) and `visR = curR × VIS_K (1.5)` keying ALL render placement (`worldOf`, camera, planet/atmosphere scale, fog, exhaust)
- [x] 3.2 `FOV_BASE` 64→72, `FOV_BOOST` 75→80; `CAM_UP` 78→96, `CAM_BACK` 150→165, `CAM_LOOKAHEAD` 120→130
- [x] 3.3 Headless verified: planes render at `|pos| = visR + ALT` (873 = 572×1.5+16) while gameplay radius stays 572 — flatter, same play

## 4. Minimap (low attention cost)

- [x] 4.1 Canvas 150→120, CSS width→104px, circular, `env(safe-area-inset)` corner, ~0.5 idle opacity → ~0.95 when an enemy is within engagement range (≤0.6 rad), smooth transition. Laid out for landscape

## 5. Bots on/off option

- [x] 5.1 Menu toggle "🤖 Play with bots" (default on), persisted in `localStorage`; bots-off Quick Play routes to the `NOBOTS` matchmaking bucket via `startGame`
- [x] 5.2 `ArenaRoom`: `botsEnabled` derived from the room code; `maintainBots` skips filling and drops existing bots in the no-bots bucket; first-round sizing triggers immediately for no-bots rooms. Verified vs compiled room (on→4, off→0, flip→0)

## 6. In-game control settings (change mid-match)

- [x] 6.1 `index.html` + css: Controls rows in `#settings-panel` — Steering (Arrows/Tilt seg), Invert toggle, Sensitivity slider; touch-only rows hidden on desktop; landscape layout
- [x] 6.2 `main.js` + `input.js`: live `applySteerMode` (enable/disable gyro + show/hide steer pad mid-match), invert (`Input.invertSteer`), sensitivity (`setGyroSensitivity`); all persisted + applied on load; menu gyro checkbox kept in sync

## 7. Verify & ship

- [x] 7.1 `tsc --noEmit` clean; headless Preview — Quick Play opens (no `Renderer.init` regression), settings wired, new UI present, no console errors; `verify-sphere.cjs` 20/20 + `verify-leaderboard.cjs` 7/7 still green
- [ ] 7.2 **Fly-test (lock the numbers, USER):** steering + bank correct in landscape (keyboard/touch/gyro); speeds trackable; flatter look at same feel; minimap unobtrusive/readable-on-threat; bots-off clean; mid-match control switch. Nudge K / speeds / FOV / minimap to taste
- [x] 7.3 Commit (d308010) → push → Coolify redeploy (patient, ~17 min, no cancel) → verified live: game 200, render3d has VIS_K, constants 185/320, input has invertSteer, bots toggle served, leaderboard still 200
- [ ] 7.4 Observe high-ping feel on the globe; note whether a netcode follow-up is warranted
