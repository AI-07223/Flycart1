## Context

The renderer (`render3d.js`) already draws the globe, places entities on it, runs a chase camera, and — key — has an **idle-orbit camera** (the `_updateCamera` branch when there's no local player) that already slowly circles the planet. `main.js` owns a simple game state (`mode`: menu/playing/paused) and the working flow: `startGame` → `Net.connect` (with skin/bots/steering) → HUD. Menu screens today are DOM overlays (`#start-screen`, `#settings-panel`, `#intermission`, `#pause-screen`, `#conn-lost`, plus the plane picker / leaderboard / controls). `hud-controls` just added shared design tokens. CSS3DRenderer is NOT yet vendored (only postprocessing + shaders addons are). No server/schema involvement — this is a presentation layer.

## Goals / Non-Goals

**Goals:**
- A menu that *is* a place on the game planet (Home Base), with cinematic camera motion and a seamless takeoff into a match.
- Immersive 3D panels that keep text/inputs crisp and usable (CSS3D, not WebGL text for inputs).
- Reuse the working connect/skin/bots/leaderboard/steering logic untouched — presentation only.
- Ship value early via phases; never regress the current flow.

**Non-Goals:**
- No server/netcode/schema change; no new gameplay.
- No WebGL/geometry text inputs (callsign etc. stay DOM).
- Not a redesign of *what* the menu does — only how it looks/feels.
- Multiple planets / free-flight (the home base is on the existing globe).

## Decisions

### 1. One scene, two camera modes, a takeoff handoff
Keep a single Three scene. Add a `cameraMode`: **menu** (orbit/dolly to a target framing per screen) vs **game** (the existing chase cam). The idle-orbit branch already in `_updateCamera` is the seed of menu mode. **QUICK PLAY** triggers a short *takeoff* tween (camera dives from the orbit framing toward the runway as the plane lifts) that hands off to the chase camera once connected — no DOM screen wipe. *Why:* the menu and game are literally the same world; the transition sells the immersion and there's no jarring cut.

### 2. CSS3DRenderer for panels; DOM for inputs
Vendor `CSS3DRenderer` (via `scripts/vendor-three-addons.mjs` + import map). The existing panels (title, settings, leaderboard, friends, results, pause, conn-lost) become `CSS3DObject`s positioned in the scene so they tilt/move with the camera but stay crisp; a second renderer layer is synced to the same camera each frame. **Text inputs (callsign, room code), sliders and segmented controls remain real DOM** inside those CSS3D panels (fully usable). *Why:* the only way to get "immersive + legible + typeable"; WebGL text can't host inputs and pure-DOM-overlay isn't spatial. *Alt — billboarded WebGL text:* fine for labels, useless for inputs; use sparingly for signposts.

### 3. Raycast hotspots for spatial navigation
A `Raycaster` maps taps/clicks on home-base **structures** (Hangar, Scoreboard Tower, Control Tower, Comms Pad, runway) to screen transitions. Latency is a non-issue for menu navigation (unlike the in-game controls), so raycast is acceptable here. *Why:* makes the world interactive, not just scenery; touch + desktop via pointer events.

### 4. Menu state machine drives camera + panels
Extend `main.js` with menu sub-states (`main / hangar / tower / control / comms / howto / results`) under `mode === "menu"`. Each sub-state = a camera target framing + the focused structure + which CSS3D panel is visible. Transitions lerp the camera and cross-fade panels. *Why:* one place that choreographs the experience; keeps render3d about rendering and main about flow.

### 5. Home Base layout (diegetic)
A fixed surface region (reuse the `dirFromHotspot`/landmark vocabulary) hosts: a **runway** with the idle plane, a **Hangar** (plane turntable), a **Scoreboard Tower** (leaderboard), a **Control Tower** (settings), a **Comms Pad** (friends). The camera orbits this cluster. Structures reuse/extend the existing landmark builders for art consistency. *Why:* coherent with the globe + arena-content, minimal new art.

### 6. Presentation over the working logic — no flow regression
The 3D menu is a skin: QUICK PLAY's button (now a hotspot/CSS3D button) still calls the same `startGame`; plane select still writes the same `localStorage` skin + sends it on join; leaderboard still fetches `/leaderboard`; settings/steering still use the existing setters. *Why:* we just fixed this flow (the `randomDir` crash, steering, etc.) — the menu must not reintroduce an init-time failure. Build the stage so that if a 3D piece fails, the underlying buttons still work (progressive enhancement where feasible).

### 7. Quality-tier aware + perf budget
Respect `window.Quality`: Low tier = simpler structures, skip CSS3D tilt (panels face camera flat), fewer particles, keep the orbit. The menu shares the GPU with the game, so cap particle/draw budgets and reuse game assets/materials. *Why:* it must stay smooth on the same mobiles the game targets.

## Risks / Trade-offs

- **Dual-renderer sync (WebGL + CSS3D)** — camera, resize, and z-order/pointer-events must stay in lockstep; CSS3D layer sits over the canvas with `pointer-events` only on interactive panels. Mitigation: sync both renderers from one camera each frame; isolate in the menu module; test resize + DPR.
- **Flow regression** — the highest risk given recent history. Mitigation: presentation-only; the buttons call existing logic; verify Quick Play + Renderer.init headless every phase; keep the change revertible.
- **Mobile perf** — menu scene + game share the GPU. Mitigation: quality tiers, capped particles, reuse assets; profile on Low.
- **Scope** — biggest UI effort yet. Mitigation: phase it; Phase 1 (orbit + state machine + CSS3D-reskin) is the bulk of the felt upgrade and is shippable alone.
- **New dependency (CSS3DRenderer)** — one vendor step; low risk (it's a small, stable addon).

## Migration Plan

Phase 1 (cinematic foundation) is independently shippable: vendor CSS3DRenderer, add the menu camera mode + state machine + camera choreography, and re-skin the existing panels as CSS3D glass — flow unchanged. Then Phase 2 (diegetic structures + raycast + takeoff) and Phase 3 (intro swoop, how-to-play demo, results podium, sound). Each phase: headless verify (Quick Play opens, no Renderer.init regression, no console errors) → fly-test the feel → commit/push/redeploy (patient, no mid-build cancel) → verify live. Rollback = git-revert.

## Open Questions

- Final home-base layout + camera framings — tune by eye in Phase 1.
- Which panels are full CSS3D vs simple billboards (e.g., signposts) — decide per panel by text density.
- How far into Phase 2/3 to go before calling it done (the user may want Phase 1 live first, then iterate).
- Desktop interaction: hotspots only, or keep the DOM buttons as a parallel path? (Default: both work — hotspots + the same buttons.)
