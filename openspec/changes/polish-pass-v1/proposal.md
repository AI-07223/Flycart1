## Why

SmashCart is live and multiplayer-functional, but it reads as an MVP: planes are literal boxes, all audio is synthesized blips, and there's little game "juice." The whole pitch is *"open a link, instantly dogfight,"* so the **first 3 seconds** (does it look like a real game?) and the **first 60 seconds** (does flying + smashing feel good?) decide whether players stay and paste the link in a group chat. This change makes the core experience genuinely polished and shareable in a cohesive **arcade-cute** style — before investing in retention features or launch-ops.

## What Changes

- Replace the boxy procedural planes with **rounded, friendly low-poly toy planes** (5 bright skins) — still fully code-generated, no external model files.
- Add **soft shadows**, **subtle bloom / post-processing**, and a cohesive **sky + color grade**.
- Rebuild explosions as **poofy arcade bursts** (expanding shockwave ring + star sparkles + smoke puffs), replacing the box shards.
- Turn the flat grid arena into a **toy island** (grass, shimmering water ring, decorative blimp + hot-air balloons, layered clouds).
- Replace the fully-synthesized audio with **real Kenney CC0 sound effects + an upbeat arcade music loop**, with mute + volume control.
- Add **game feel**: speed-sensing chase camera (FOV widens on boost, dip/shake when hit), **hit-stop** micro-freeze on kills, squash/stretch **"+1 SMASH!"** popups, and **combo / kill-streak callouts** ("DOUBLE SMASH!").
- **Smarter bots**: lead their shots, evade when low on HP, occasional rolls, mild difficulty variety.
- Add a **graphics-quality setting** (Low/Med/High) with automatic FPS-based downscaling so the new effects stay smooth on mid-range phones.

**Non-goals (explicitly deferred to a later change):** mobile-perf hardening beyond the quality toggle, reconnect-on-drop, error/“server full” screens, auto-deploy/CI, Sentry, analytics, abuse guards (name filter / rate limiting), custom domain, and any new game modes or progression. No **BREAKING** changes — the Colyseus wire protocol and `ArenaState` are unchanged.

## Capabilities

### New Capabilities
- `arcade-visuals`: the arcade-cute look — rounded procedural planes + 5 skins, toy-island arena, soft shadows, bloom/post-FX, poofy explosions, sky + color grade.
- `game-audio`: real sampled SFX + an arcade music loop (Kenney CC0), bundled and self-hosted, with mute and volume control.
- `game-feel`: camera dynamics (boost FOV kick, hit dip), hit-stop on kills, squash/stretch popups, and combo / kill-streak callouts.
- `graphics-quality`: user-selectable quality tiers (Low/Med/High) plus automatic FPS-based quality scaling.
- `bot-ai`: smarter bot behavior — target leading, evasion when low HP, occasional rolls, and difficulty variety.

### Modified Capabilities
<!-- None — there are no existing specs, and the server wire protocol / ArenaState are unchanged. -->

## Impact

- **Client (most of the work):**
  - `public/js/render3d.js` — plane meshes, toy-island arena, soft shadows, post-FX (bloom), poofy explosions, camera dynamics, quality scaling.
  - `public/js/audio.js` — replace the Web Audio synth with a sampled-asset SFX/music player (mute + volume).
  - `public/js/main.js` — combo/streak callouts, hit-stop, settings + volume UI wiring.
  - `public/index.html` + `public/css/style.css` — settings/volume controls, callout + popup styling.
  - New assets: `public/assets/audio/*` (Kenney CC0) and any vendored Three.js post-processing addons under `public/vendor/`.
- **Server (minimal):** `src/rooms/ArenaRoom.ts` — bot AI only. `ArenaState` schema and the wire protocol are unchanged.
- **Dependencies:** add (vendored, offline) Three.js post-processing addons and bundled audio files; Docker image grows modestly. No new runtime services.
- **Unaffected:** Colyseus server protocol, deployment pipeline (still Coolify from `main`), the `/colyseus` monitor auth, domain.
