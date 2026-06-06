## Why

The game plays well now, but the in-game UI is functional-not-felt: the touch buttons use a minimal CSS `:active` scale (which misfires on touch), the layout wasn't designed around where thumbs actually reach, and — concretely — the threat-aware minimap we just shipped sits **bottom-left, right under the left steering thumb**. A dogfighter lives or dies on control feel, so this change redesigns the in-game HUD + controls around human-factors: Fitts's law for size/placement, the two-thumb landscape reach arcs, ~100ms confirmation feedback for perceived responsiveness, and ~44–64px minimum touch targets. It also establishes the **shared design tokens** the planned `immersive-menu` will reuse, so the whole game speaks one visual language.

Crucially, the in-game layer has a constraint the menu doesn't: **input latency**. Action buttons must stay instant DOM pointer-events — a shot can never wait on a 3D raycast. So "3D controls" here means depth *styling*, not 3D *geometry*.

## What Changes

- **Shared design tokens (foundation).** A small set of CSS custom properties + helpers — palette, depth/bevel + shadow, glow, press-motion timing, a haptic helper, font — so HUD, controls, and the future menu share one look.
- **Thumb-zone control placement (landscape, two hands).** FIRE = primary → biggest, bottom-right corner; BOOST just inboard/above it (reachable without leaving the fire thumb); steering bottom-left; the screen **center stays clear** of controls; HUD info hugs the **top + edges**, never the bottom thumb zones or center.
- **Minimap collision fix.** Move the minimap out of the bottom-left steering zone (to top-left / top-center), still threat-aware.
- **Depth-styled ("3D") controls without latency.** DOM buttons with bevel, inner/outer shadow, glass gradient and rim light so they *read* 3D while keeping instant DOM handling. (No WebGL-raycast action buttons; CSS3D-transformed DOM is an acceptable later upgrade because it stays low-latency.)
- **Tactile press feedback**, driven from the real JS pressed-state (not CSS `:active`): depress + glow + ripple from the contact point + **haptic** (`navigator.vibrate`) where supported; spring back on release.
- **State-reactive buttons.** FIRE recoils on each shot and dims during cooldown (rapid-fire reads visually); BOOST glows/pulses while held in sync with the afterburner; the active-powerup color tints the relevant button.
- **Virtual thumbstick steering option** (drag = analog turn) added to the existing steering-mode setting (Arrows / Tilt / Stick).

## Capabilities

### New Capabilities
- `ui-design-tokens`: a shared visual-language foundation (palette, depth, glow, press-motion, haptics, font) used across the in-game UI and the future menu.
- `in-game-hud`: the heads-up information layout — score/time/health/leaderboard/controls-icons placed for glanceability (top + edges), and the minimap repositioned out of the thumb zones.
- `touch-controls`: the on-screen control layer — thumb-zone placement, depth-styled buttons, latency-safe tactile + state-reactive press feedback, and a virtual thumbstick steering option.

### Modified Capabilities
<!-- None as spec deltas (no specs archived to openspec/specs/). This refines the touch-controls/HUD introduced across earlier changes, but there is no archived spec to delta; the steering-mode option from engagement-tuning is extended (Arrows/Tilt → +Stick) within touch-controls. -->

## Impact

- **Client only (no server/schema change):**
  - `public/index.html` — control + HUD markup (thumbstick element, button structure, ripple/glow nodes).
  - `public/css/style.css` — design tokens; restyle `.tbtn` / `#hud` / `#healthbar` / `#minimap`; depth + press states; thumb-zone positions; safe-area insets.
  - `public/js/main.js` — state-reactive button updates from game state (fire recoil/cooldown, boost glow, powerup tint), haptics, thumbstick wiring.
  - `public/js/input.js` — virtual-thumbstick analog turn, integrated with `steerMode` (Arrows/Tilt/Stick).
  - `public/js/render3d.js` — minimap reposition (out of the thumb zone).
- **Constraints:** input latency paramount (DOM pointer-events; no raycast for actions); landscape-only; safe-area insets; don't occlude the central dogfight (corner-hugging, semi-transparent, idle-fade); quality-tier aware; desktop keeps keyboard (same HUD minus thumb buttons).
- **Composes with:** `engagement-tuning` (steering-mode setting + threat-aware minimap) and shares the design tokens with the planned `immersive-menu`.
