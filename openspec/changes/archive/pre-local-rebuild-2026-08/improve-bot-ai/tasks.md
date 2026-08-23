## 1. Bot Brain Refactor

- [x] 1.1 Expand `BotBrain` type with `tier` field ("rookie" | "veteran" | "ace"), `weavePhase`, and `powerupTarget`
- [x] 1.2 Implement tier assignment in `addBot()` with weighted distribution (50/35/15)
- [x] 1.3 Create `tierParams()` helper that returns react/aimErr/lead/evade/seekPower/useCover per tier

## 2. Obstacle Awareness

- [x] 2.1 Add obstacle proximity check in `thinkBot()` — detect solid obstacles within `angRadius * 1.5`
- [x] 2.2 Implement avoidance steering — blend perpendicular-to-obstacle direction into desired heading
- [x] 2.3 Implement cover-seeking when fleeing — steer toward nearest solid obstacle instead of antipode

## 3. Powerup Seeking

- [x] 3.1 Add powerup scan in `thinkBot()` — check `state.pickups` within 400 world-units
- [x] 3.2 Implement priority scoring for powerups (shield > afterburner > spread > rapid > homing > repair)
- [x] 3.3 Divert toward highest-priority powerup when not in close combat (< 500 world-units to enemy)

## 4. Evasion & Target Selection

- [x] 4.1 Add evasion weaving — detect bullets heading toward bot within 0.5 rad cone, oscillate heading
- [x] 4.2 Improve `pickTarget()` — score by distance (1/dist), threat (2x if aiming at bot), low HP (1.5x)

## 5. Verification

- [x] 5.1 Play-test with bots — verify rookies are easy, aces are challenging
- [x] 5.2 Verify bots avoid obstacles (don't fly through solid ones)
- [x] 5.3 Verify bots pursue powerups
- [x] 5.4 Verify bot AI runs at 30Hz with 7 bots (no frame drops)
