## 1. Foundations (quality + post-FX plumbing)

- [x] 1.1 Vendor Three.js post-processing addons (EffectComposer, RenderPass, UnrealBloomPass + shader/pass deps) into `public/vendor/`, add import-map entries, and extend the `vendor` npm script
- [x] 1.2 Add a graphics-quality module with Low/Med/High tiers controlling pixel-ratio cap, bloom on/off, shadow type/resolution, and particle/decor density; persist the choice in `localStorage`
- [x] 1.3 Choose a sensible default tier via a device heuristic (`navigator.deviceMemory`, mobile UA, initial pixel ratio)
- [x] 1.4 Add an FPS watchdog (rolling average) that auto-steps quality DOWN on sustained < ~45 fps and never auto-steps up
- [x] 1.5 Wire an EffectComposer render path (RenderPass + UnrealBloomPass) gated by the active tier; verify the post-FX chain loads headlessly

## 2. Look — arcade-cute visuals

- [x] 2.1 Replace the box/cone planes with rounded low-poly toy-plane meshes (fuselage, rounded wings, tail, canopy, spinning prop) in 5 bright skins
- [x] 2.2 Add soft shadows: low-res directional shadow map on Med/High with a blob-shadow fallback on Low
- [x] 2.3 Rebuild explosions as poofy bursts (expanding shockwave ring + star sparkles + smoke puffs), replacing the box shards
- [x] 2.4 Build the toy-island arena (grass field, shimmering water ring/border) with readable play bounds
- [x] 2.5 Add decorative depth: blimp + hot-air balloons + layered clouds
- [x] 2.6 Add a cohesive graded sky and tune sun/ambient lighting for the arcade palette
- [x] 2.7 Tune bloom threshold/intensity so flames, bullets and explosions glow without washing the scene out

## 3. Feel — audio

- [x] 3.1 Generate original arcade audio (engine loop, gunfire, explosion, hit, kill jingle, UI) + an upbeat music loop as self-hosted WAVs under `public/assets/audio/` via `scripts/gen-audio.mjs`; committed (Kenney-CC0 swap stays drop-in). NOTE: shipped generated-original WAVs instead of fetching Kenney packs (offline/autonomous + licensing-clean); same filenames make a later swap trivial.
- [x] 3.2 Rewrite `audio.js` to load samples into `AudioBuffer`s and play through a gain graph (master → music/sfx buses); loop music; keep gesture-unlock; degrade gracefully (synth fallback) if an asset fails to load
- [x] 3.3 Add mute + volume controls (master plus music/sfx), persisted in `localStorage`, wired into the existing mute button + a settings panel
- [x] 3.4 Map game events to the new SFX (fire, hit taken, explosion/kill, round-phase cues, UI clicks)

## 4. Feel — game juice

- [x] 4.1 Speed-sensing camera: widen FOV while boosting, ease back when boost ends
- [x] 4.2 Damage feedback: brief camera dip/shake + red vignette on hit; low-health pulse below 30 HP
- [x] 4.3 Hit-stop on local kills (≤ ~90 ms) affecting only local camera/particle timing — not input or remote interpolation
- [x] 4.4 Squash/stretch "+1 SMASH!" popups and combo / kill-streak callouts ("DOUBLE SMASH!"), tracked client-side from kill events

## 5. Smarter bots (server)

- [x] 5.1 Predictive aiming in `ArenaRoom.thinkBot`: lead shots from the target's velocity, with a per-bot aim error
- [x] 5.2 Evasion when low HP: turn away from threats and boost to disengage
- [x] 5.3 Difficulty spread: per-bot reaction delay + aim accuracy, tuned via constants
- [x] 5.4 Cosmetic bank/roll flourish on hard turns (client-only; no new synced state) — planes bank into turns in render3d.js

## 6. Verify & ship

- [x] 6.1 Local headless verification (Preview `eval`/`readPixels`): scene builds, planes/shadows/bloom render, audio API loads, quality toggle works, zero console errors (4 planes, bots firing, 22 particles, sky+grass pixels confirmed)
- [x] 6.2 Quality-tier sanity check: Low disables bloom and uses blob shadows yet still renders; Med/High enable shadow map + bloom (verified via __debug)
- [x] 6.3 `tsc --noEmit` for the server bot changes (OK); updated README (3D, quality setting, audio credits) and kept Kenney CC0 attribution
- [x] 6.4 Commit → push `main` → redeploy via Coolify; verified live (game 200, audio/assets served, matchmake 200 + WebSocket 101, app running:healthy)
