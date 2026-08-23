## Context

SmashCart is a deployed 3D web game: a **vanilla-JS + Three.js** client (ESM, vendored, loaded via an import map) talking to an **authoritative Colyseus 0.16** server that runs a 2D-plane simulation and broadcasts each plane's position + heading. Today the renderer (`public/js/render3d.js`) builds the scene from box/cone primitives and `public/js/audio.js` synthesizes every sound with the Web Audio API. Hard constraints carried from the existing project: **everything self-hosted/offline** (no CDNs; assets shipped in the Docker image, which copies `public/` as-is), **instant-pickup controls**, and **mobile (touch + gyro)** support. This change adds an arcade-cute coat of paint and game-feel without disturbing the proven netcode.

## Goals / Non-Goals

**Goals:**
- A cohesive **arcade-cute** look and feel — the biggest perceived-quality jump for the least risk.
- Keep all geometry **procedural** (no model files) and all audio **bundled CC0** — offline, licensing-clean, tiny dependency surface.
- Hold ~60 fps on desktop and stay smooth on mid-range phones via **quality scaling**.
- **Zero wire-protocol change**; the only server edit is bot AI.

**Non-Goals:**
- Runs-everywhere hardening beyond the quality toggle (reconnect, error screens), launch ops (CI/CD, Sentry, analytics, abuse guards, domain), new modes/progression. (Deferred to a future change.)
- Imported 3D models or a texture/asset-baking pipeline.

## Decisions

1. **Procedural rounded meshes over imported models.** Build planes from Three primitives (capsule/lathe fuselage, rounded wings/tail, canopy, spinning prop) with flat shading and per-skin color. *Why:* offline, no licensing/asset pipeline, tiny payload, trivial recolor for the 5 skins; plays directly to the arcade-cute pick. *Alt rejected:* GLTF models (asset pipeline, licensing, weight).

2. **Post-processing via vendored Three addons.** Vendor `EffectComposer` + `RenderPass` + `UnrealBloomPass` (+ required shader/pass deps) from `three/examples/jsm/**` into `public/vendor/` and wire them through the import map. *Why:* real bloom is the cheapest "AAA tell" and makes boost flames / bullets / explosions pop. *Alt:* hand-rolled bloom shader (more code) or no bloom (less wow). *Risk handled below.*

3. **Tiered shadows.** Real low-res directional shadow map on Med/High; cheap **blob shadows** (a dark fading disc under each plane) on Low. *Why:* shadows ground the toy planes; blobs are the perf floor.

4. **Quality tiers + adaptive scaling.** A `quality` setting (**Low/Med/High**) gates pixel-ratio cap, bloom on/off, shadow type/res, particle counts, and cloud/decor density. An FPS watchdog (rolling average) steps quality **down** on sustained < ~45 fps and never auto-ups (avoids oscillation). Initial tier picked by a device heuristic (`navigator.deviceMemory`, mobile UA, initial pixelRatio); user choice persists in `localStorage`. *Why:* protects the new prettiness on weak devices — Look literally depends on this.

5. **Sampled audio over synth, Web Audio with HTMLAudio fallback.** Load Kenney **CC0** SFX into `AudioBuffer`s and play through a gain graph (master → sfx/music buses) for low-latency gunfire; loop the music track. Ship **OGG with MP3 fallback** (Safari). Keep the existing unlock-on-first-gesture flow; mute + volume persist. *Why:* low latency + real texture; fallback keeps broad compatibility. *Alt:* keep synth (rejected: it's the MVP tell).

6. **Game-feel is client-only, driven by existing signals.** Hit-stop, boost FOV kick, hit dip/shake, squash/stretch popups, and combo/streak callouts all derive from state deltas (hp drop, `boosting` flag) and the existing `kill` broadcast — **no protocol change**. Hit-stop briefly scales *render/camera* time only (~60–90 ms), never input send or remote interpolation, to avoid desync.

7. **Smarter bots, still server-authoritative.** Extend `thinkBot` in `src/rooms/ArenaRoom.ts`: **lead** shots (predict target from its velocity), **evade** when low HP (turn away + boost), and a per-bot **difficulty** spread (reaction delay + aim error). "Rolls" are a **purely cosmetic** client flourish inferred from hard turns — no new synced field. *Why:* a lively 60 seconds while keeping fairness and `ArenaState` unchanged.

8. **Vendor/asset pipeline mirrors existing three.js.** Audio under `public/assets/audio/`, Three addons under `public/vendor/`; extend the `vendor` npm script; commit assets so the Dockerfile ships them. *Why:* consistency, offline guarantee.

## Risks / Trade-offs

- **Bloom + shadows tank mobile GPUs** → quality tiers + adaptive downscale; bloom off and blob shadows on Low; conservative default on detected weak devices.
- **Vendored Three addon import paths break the module graph** → add explicit import-map entries per addon path; verify the post-FX chain loads via headless `eval`/`readPixels` before shipping.
- **Audio weight / first-play latency** → keep SFX small and compressed (CC0), lazy-load music, brief loading state; target total audio < ~1.5 MB.
- **Hit-stop feels like input lag / causes desync** → cap ~60–90 ms, apply only to local camera/particles, never to netcode.
- **Procedural planes still look "programmer-art"** → invest in silhouette (rounded wings/tail, canopy, prop) + flat shading + rim/ambient; iterate visually via preview screenshots/pixel reads.
- **Leading bots become too deadly** → per-bot aim error + difficulty spread, tuned via constants.

## Migration Plan

Purely additive client/asset change plus a bot-AI tweak; the wire protocol and `ArenaState` are unchanged, so new and old clients interoperate during rollout. Deploy via the existing **Coolify-from-`main`** pipeline. **Rollback** = revert the change commit and redeploy; no data migration.

## Open Questions

- Exact Kenney packs (Impact / Interface / Music) — choose at implementation; all CC0.
- Keep a tiny synth fallback if an audio asset fails to load? (nice-to-have)
- One music loop vs separate menu/game loops (default: one upbeat loop, quieter in menu).
