## 0. Dependency: vendor CSS3DRenderer

- [x] 0.1 Added `CSS3DRenderer` to `scripts/vendor-three-addons.mjs`; vendored → `public/vendor/jsm/renderers/CSS3DRenderer.js` (import map `three/addons/` → `/vendor/jsm/` already covers it)
- [x] 0.2 Smoke-tested: `import('/vendor/jsm/renderers/CSS3DRenderer.js')` resolves with `CSS3DRenderer` + `CSS3DObject` exports

## 1. Phase 1 — cinematic foundation (shippable; flow unchanged)

- [x] 1.1 **(increment 1 — living menu)** Menu render path: `render3d.drawMenu(dt)` renders the orbiting home-base scene with a flying demo plane (idle-orbit camera); `main.js` loop draws it while `mode==="menu"`; demo cleared on game start. Verified: demo on surface (1066), no errors. (`setMenuTarget(section)` per-section framings → next increment)
- [ ] 1.2 `main.js`: menu state machine sub-states under `mode==="menu"` (main / hangar / tower / control / comms / howto) → each sets a camera target + which panel shows; cross-fade panels
- [ ] 1.3 Camera choreography: smooth lerp/slerp between section framings; the slow home-base orbit at rest
- [ ] 1.4 CSS3D layer: a `CSS3DRenderer` synced to the same camera each frame (resize/DPR-aware); host the existing panels (title/settings/leaderboard/friends/results/pause/conn-lost) as CSS3DObjects; **keep text inputs/sliders as real DOM**; style from the `hud-controls` tokens
- [x] 1.5 Working flow preserved (presentation only) — the menu overlay is now translucent so the planet shows through; all buttons still call the existing logic. Verified Quick Play opens (4 players), no `Renderer.init` regression
- [ ] 1.6 Quality-tier + landscape: on low tier face panels flat (no tilt) + fewer particles; keep the rotate guard
- [ ] 1.7 Verify: headless Preview — Quick Play opens (no `Renderer.init`/flow regression), panels render + inputs typeable, no console errors; `verify-sphere.cjs` + `verify-leaderboard.cjs` green
- [ ] 1.8 Commit → push → Coolify redeploy (patient) → verify live; fly-test the feel

## 2. Phase 2 — diegetic structures + interaction

- [ ] 2.1 Build home-base structures (reuse/extend landmark builders): runway + idle plane, Hangar, Scoreboard Tower, Control Tower, Comms Pad
- [ ] 2.2 Hangar plane-select: plane on a turntable; tap a swatch → restyle live (drives the existing skin choice)
- [ ] 2.3 Raycaster: tap/click a structure → focus it + open its section (touch + desktop)
- [x] 2.4 TAKEOFF transition: `startTakeoff()` dives the menu camera in behind the (chosen-skin) demo plane on QUICK PLAY; the game chase cam continues from the shared `camPos` → seamless handoff. Demo plane now uses the player's selected skin.
- [ ] 2.5 Verify + fly-test; commit → deploy (patient) → verify live

## 3. Phase 3 — showpiece polish

- [ ] 3.1 Intro swoop: camera descends from space to home base; logo forms
- [ ] 3.2 How-to-play: a ghost plane flies a demo loop with 3D steer/boost/fire callouts
- [ ] 3.3 Results podium: top-3 planes on a podium with the player's placement + rematch
- [ ] 3.4 Menu sound design (ambient + transition cues), respecting the audio mixer/mute
- [ ] 3.5 Verify + fly-test; commit → deploy (patient) → verify live
