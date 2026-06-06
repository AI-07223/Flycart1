## Context

In-game UI today: `#touch-controls` (steer arrows bottom-left, boost+fire bottom-right, recenter) with `.tbtn` styled via a minimal `:active` scale; `#hud` (score/time/leaderboard/mute) across the top; `#healthbar`; and the `#minimap` we just repositioned to **bottom-left** — which overlaps the left steering thumb. Touch buttons are wired in `main.js` `setupTouchButtons()` via `hold(el, on)` (pointerdown/up/cancel/leave → sets `Input.touch.{left,right,boost,fire}`), so a real pressed-state already exists to hook feedback onto. `updateHud(state, myId)` runs every frame with the local player, the natural place to drive state-reactive visuals. `engagement-tuning` added a steering-mode setting (Arrows/Tilt). The game is landscape-only and quality-tier aware (`window.Quality`). No server/schema involvement.

## Goals / Non-Goals

**Goals:**
- Controls placed where thumbs actually reach; the dogfight center stays unobstructed; HUD info stays glanceable at the edges.
- Buttons that *read* 3D and give immediate, satisfying press feedback — without adding input latency.
- Buttons that reflect game state (fire cadence, boost, powerup).
- A shared design-token layer the menu will reuse.

**Non-Goals:**
- No WebGL/raycast action buttons (latency + occlusion).
- No server, netcode, or schema change.
- No change to *what* the controls do (turn/boost/fire) — only placement, feel, and an added thumbstick input mode.
- Not the menu itself (that's `immersive-menu`, which consumes the tokens defined here).

## Decisions

### 1. Action buttons stay DOM pointer-events; "3D" is styling only
A shot must register in <16ms, so the fire/boost/steer controls remain DOM elements handled by the existing `hold()` pointer wiring. The 3D look comes from CSS depth (bevel, layered inner/outer shadow, glass gradient, rim light) — not geometry. *Why:* raycasting WebGL buttons adds a frame+ of latency and fights the game canvas for the pointer; unacceptable for a twitch control. *Later upgrade path:* CSS3D-transformed DOM can add real tilt while keeping DOM latency — so the same buttons can join the menu's CSS3D layer without a rewrite.

### 2. Thumb-zone layout (Fitts + two-thumb reach)
```
 ┌───────────────────────────────────────────────────────────┐
 │ SCORE ⏱TIME   ❤health      [◐ minimap]      [LB] 🔊 ⚙      │ TOP/edges: info only
 │                                                            │
 │                 ·   central dogfight kept clear   ·         │
 │                                                            │
 │   ╭─────╮                                       ⚡ BOOST    │
 │   │  ⊙  │ steer                          🔥  F I R E       │ BOTTOM CORNERS: thumb zones
 │   ╰─────╯                                  (largest)        │
 └───────────────────────────────────────────────────────────┘
```
FIRE is largest (primary; Fitts: big + corner = fastest), bottom-right. BOOST is smaller, just inboard/above fire (same thumb, no travel off fire). Steering bottom-left. Controls hug corners with safe-area insets and are semi-transparent (and may fade toward idle) so they never occlude the center. Minimum target ~44–64px.

### 3. Minimap out of the thumb zone
Move `#minimap` from bottom-left to the **top-left/top-center band** (out of both bottom thumb arcs), keeping the threat-brighten behavior. Exact corner tuned so it doesn't overlap score/leaderboard; the requirement is simply "not in a thumb zone."

### 4. Tactile feedback from the real pressed-state, not `:active`
CSS `:active` is unreliable on touch (sticks, misfires on multitouch). Hook feedback into the existing `hold()` pointer handlers: on press → add a `.pressed` class (depress: scale + inset shadow), trigger a glow/flash and a ripple from the contact point, and fire a haptic `navigator.vibrate(~8)` (feature-detected; silently skipped where unsupported, e.g. iOS Safari). On release → remove `.pressed` (spring back). *Why:* deterministic, multitouch-safe, and the ~100ms feedback window is what makes a control feel "tight."

### 5. State-reactive buttons, driven in the frame loop
`updateHud` already has the local player each frame. Drive button visuals from state:
- **Fire:** when a shot actually goes out (the existing fire-SFX cadence gate, which already accounts for rapid-fire cooldown), pulse a recoil on the fire button and dim it during the cooldown window — rapid-fire visibly machine-guns.
- **Boost:** while `me.boosting`, the boost button glows/pulses (in sync with the afterburner).
- **Powerup:** tint the relevant button glow with the active-powerup color (`G.POWERUPS[me.power].color`).
*Why:* the controls become part of the feedback loop, not just inputs.

### 6. Virtual thumbstick as a third steering mode
Add `stick` to the steering-mode setting (Arrows / Tilt / Stick). A draggable pad in the bottom-left: pointer drag along X maps to analog turn ∈ [−1, 1] (dead-zone in the middle, full deflection near the edge); recenters on release. `input.js` exposes a `touch.stick` analog value; `get()` uses it when `steerMode === "stick"` (it already supports analog turn for gyro, so this slots in). *Why:* a stick gives smooth analog steering the digital arrows can't, and we already have the setting + analog plumbing.

### 7. Design tokens as the shared foundation
Define CSS custom properties in `:root` — `--ui-accent`, depth shadows (`--ui-bevel`, `--ui-shadow`), `--ui-glow`, press-motion timing, font — plus a tiny JS haptic helper. HUD + controls consume them now; `immersive-menu` consumes them later. *Why:* one visual language, defined once.

## Risks / Trade-offs

- **`:active` misfire on touch** → use the JS pressed-state from `hold()`; never rely on `:active` for the feedback truth.
- **Haptics unsupported (iOS Safari)** → feature-detect `navigator.vibrate`; no-op gracefully (visual feedback still lands).
- **Occlusion of the dogfight** → corner-hug + transparency + idle-fade; nothing in the center; HUD info never in the bottom band.
- **Minimap reposition overlapping HUD info** → place in the open top band; tune to avoid score/leaderboard; fly-check.
- **Multitouch** (steer + fire at once) → independent per-button pointer capture (the existing `hold()` is per-element; verify simultaneous press).
- **Perf on Low tier** → glow/ripple are cheap CSS; gate the fancier effects behind the quality tier if needed.
- **Desktop** → no thumb buttons; HUD unchanged; key-press blips optional/out-of-scope.

## Migration Plan

Pure client UI; no schema/wire change. Implement → headless Preview (layout in landscape, no console errors, buttons fire, minimap moved, Quick Play unaffected) → **fly-test** the feel (thumb reach, press feedback, haptics on a real phone, thumbstick) → commit/push/redeploy (patient — no mid-build cancel) → verify live. Rollback = git-revert. The design tokens are additive; `immersive-menu` will build on them next.

## Open Questions

- Minimap final spot: top-left vs top-center — pick by what doesn't crowd score/leaderboard (fly-test).
- Default steering mode on touch: keep Arrows, or default to Stick once it feels good? (Default Arrows; Stick opt-in, then revisit.)
- Idle-fade controls (fade when no input for N seconds) — nice-to-have; include if cheap.
