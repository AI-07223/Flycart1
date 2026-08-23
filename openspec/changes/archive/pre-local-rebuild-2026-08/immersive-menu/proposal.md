## Why

SmashCart's menu is flat DOM panels floating over the globe — functional, but it doesn't feel like the game. This change makes the menu a **place**: a calm "Home Base" region of the same planet, with the camera doing a slow cinematic orbit behind the player's idle plane, and **QUICK PLAY becoming a takeoff** that hands straight into a match — no hard screen cut. The menu and the game become one continuous world. It reuses what's already built (the globe, landmark builders, the chase camera, and the shared design tokens from `hud-controls`), so it's an upgrade of the presentation layer, not a rewrite of the working flow.

The discipline that keeps it usable: **3D for spatial navigation, real DOM for text/inputs.** Crisp HTML panels are transformed *into* the 3D scene via `CSS3DRenderer` (immersive but text stays legible and inputs stay typeable), while callsign/room-code/sliders remain real DOM.

## What Changes

- **Home-base 3D scene** on the existing globe — a calm region with the player's plane on a runway and structures for each section; the camera orbits cinematically.
- **Menu state machine + camera choreography** — each screen is a camera target + a focused structure + which panel is shown; smooth lerps between them; **QUICK PLAY = a takeoff dive** that hands off to the existing chase camera and a real match.
- **CSS3D panel layer** (new dependency: vendor `CSS3DRenderer`) — the existing ~9 overlay panels become glass panels anchored in 3D; **text inputs stay real DOM**.
- **Raycast hotspots** — tap/click 3D structures to navigate sections (touch + desktop).
- **All screens** rehomed onto the stage: Intro swoop, Main (runway orbit), Plane select (Hangar turntable), Leaderboard (Scoreboard Tower), Settings (Control Tower), Play-with-friends (Comms Pad), How-to-play (ghost-plane demo), Results (podium), Pause, Connection-lost.
- **Reuses the working logic** — buttons still call the same `startGame`/`Net.connect`/skin/bots/leaderboard/steering code; this is presentation only.

## Capabilities

### New Capabilities
- `menu-stage`: the 3D menu infrastructure — the home-base scene, the menu⇄game camera-mode system with a smooth takeoff handoff, the CSS3D panel layer, and raycast hotspot navigation; quality-tier aware and landscape-only.
- `menu-screens`: the menu's screens/sections presented on the stage (main, plane select, leaderboard, settings, play-with-friends, how-to-play, results, pause, connection-lost), each driven by the existing game logic.

### Modified Capabilities
<!-- None as spec deltas (no specs archived to openspec/specs/). This re-presents the menu screens introduced in game-shell/engagement-tuning on a new 3D stage; the underlying connect/skin/bots/leaderboard/steering behaviour is unchanged (presentation layer only). -->

## Impact

- **Build/deps:** `scripts/vendor-three-addons.mjs` (vendor `CSS3DRenderer`) → `public/vendor/jsm/...` + the import map in `public/index.html`.
- **Client:**
  - `public/js/render3d.js` (or a new `public/js/menu3d.js` module): home-base structures, menu⇄game camera modes + takeoff handoff, raycaster, the CSS3D layer synced to the camera.
  - `public/index.html`: the existing panels become CSS3D-hosted; text inputs stay DOM.
  - `public/css/style.css`: reuse the `hud-controls` design tokens; panel/glass styling.
  - `public/js/main.js`: a menu state machine driving camera targets + panel visibility; the connect/skin/bots/leaderboard/steering logic is unchanged (the 3D menu calls into it).
- **Constraints:** landscape-only (keep the rotate guard); quality-tier aware (Low = simpler structures, skip CSS3D tilt / fewer particles, stay smooth on mobile); shared GPU budget with the game; must NOT regress `Renderer.init`/Quick Play; keep the arcade-cute art.
- **Phased** (each shippable): Phase 1 cinematic foundation (orbit scene + state machine + camera choreography + CSS3D-reskin the panels, flow unchanged) → Phase 2 diegetic structures + raycast + takeoff transition → Phase 3 showpiece polish (intro swoop, how-to-play demo, results podium, sound).
- **Unaffected:** server, schema/wire, netcode, matchmaking, the leaderboard backend.
- **Composes with:** `hud-controls` (design tokens) and the live globe + leaderboard.
