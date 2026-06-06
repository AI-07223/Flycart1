## 1. Design tokens (shared foundation)

- [x] 1.1 `style.css` `:root` tokens — `--ui-accent`/`--ui-fire`/`--ui-boost`, `--ui-glass`, `--ui-rim`, `--ui-bevel`, `--ui-shadow`, `--ui-press` (shared with the future menu)
- [x] 1.2 `main.js` haptic helper `buzz(ms)` → `navigator.vibrate` when supported, else no-op (verified present)

## 2. HUD layout + minimap

- [x] 2.1 Info stays top/edges (score/time/mute top-left, killfeed/settings top-right, leaderboard top); bottom thumb bands + center kept clear; health bar at the bottom EDGE (not a thumb corner)
- [x] 2.2 Minimap moved out of the bottom-left steering zone → **top-centre** (`#minimap` top:8px, centered); threat-brighten kept. Verified computed `top:8px`

## 3. Touch-control placement + depth styling

- [x] 3.1 FIRE largest bottom-right (100px), BOOST adjacent/inboard (76px), steering bottom-left; center clear; targets ≥76–100px; safe-area insets on all
- [x] 3.2 `.tbtn` depth-styled from tokens — radial glass gradient, rim border, drop+bevel shadow (reads 3D, stays DOM)

## 4. Tactile press feedback (latency-safe)

- [x] 4.1 `setupTouchButtons` `hold()`: pointerdown adds `.pressed` + `buzz(8)`, up/cancel/leave removes — driven by real pressed-state, not `:active`. Verified: pressing fire toggles `.pressed` + sets `Input.touch.fire`
- [x] 4.2 `.tbtn.pressed` depress (scale 0.9) + inset shadow + per-button glow (`--press-glow`); springs back on release
- [x] 4.3 Multitouch-safe — per-element pointer handlers (steer + fire register independently)

## 5. State-reactive buttons

- [x] 5.1 Loop: fire button `.recoil` per actual shot (reuses the fire-cadence gate incl. rapid-fire) + `.cooling` dim during cooldown
- [x] 5.2 Boost button `.active` glow while `me.boosting`; fire `.powered` glow (accent) while an offensive powerup is active

## 6. Virtual thumbstick steering mode

- [x] 6.1 `#thumbstick` (base + knob) in `#touch-controls`, tokens-styled (bottom-left)
- [x] 6.2 `input.js`: `touch.stick` analog from drag X (centre dead-zone, recenters on release); `get()` uses it when `stickActive`
- [x] 6.3 "Stick" added to the steering-mode seg (Arrows / Stick / Tilt); `applySteerMode` shows the stick + sets `Input.stickActive`, live-switchable mid-match; persisted via the existing `steerMode`

## 7. Verify & ship

- [x] 7.1 Build clean; headless Preview — Quick Play opens (4 players, no `Renderer.init` regression), new UI present (3 steer modes, thumbstick), minimap repositioned, press toggles `.pressed`+input, no console errors
- [ ] 7.2 **Fly-test (real phone, USER):** thumb reach; press feedback + haptics; fire recoil/cooldown + boost glow read correctly; thumbstick analog feel; nothing occludes the dogfight; landscape + safe-area OK
- [ ] 7.3 Commit → push `main` → Coolify redeploy (**patient — do not cancel mid-build**) → verify the new build is served
