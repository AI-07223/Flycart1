## Context

The client is static files served by Express (`src/index.ts`) in front of the Colyseus game server; the menu lives in `public/index.html` (`#start-screen`) and is wired in `public/js/main.js` (`init` → `startGame` → `Net.connect(name, code)` → room `onJoin`). `onJoin` currently randomizes `skin`. Touch detection already exists (`window.Input.isTouchDevice()`), and an intermission scoreboard already renders (`#intermission` / `updateHud`). There is no persistence layer of any kind today. The single Colyseus process is the only writer, which simplifies storage.

## Goals / Non-Goals

**Goals:**
- A menu that onboards correctly on **both** touch and desktop, lets players pick a plane, and shows a real round-over moment — all with no new infrastructure (Phase 1).
- A durable global top-N leaderboard with server-authoritative scores and a read-only endpoint (Phase 2), behind exactly one infra step (a persistent volume).
- Keep the arcade-cute art; do not regress the just-fixed `Renderer.init` startup.

**Non-Goals:**
- Player accounts / auth / identity (the leaderboard is keyed by callsign — see Decisions).
- Per-skin gameplay differences (skins are cosmetic).
- Friends list, chat, matchmaking changes, or new game modes.
- Leaderboard seasons/resets, pagination, or anti-abuse beyond "server is the only writer".

## Decisions

### 1. Two-phase delivery; Phase 1 needs zero infrastructure
Phase 1 (device-aware hints, plane picker, results screen) is pure client + a tiny `onJoin` tweak — shippable immediately. Phase 2 (leaderboard) is gated only by mounting a persistent volume. *Why:* gets the visible polish live fast and isolates the one infra dependency.

### 2. Plane choice: client-persisted, server-validated
The menu stores the chosen skin index in `localStorage` (`smashcart.skin`) and passes it through `Net.connect(name, code, skin)` → `joinOrCreate("arena", { name, code, skin })`. `onJoin` does `p.skin = Number.isInteger(skin) && skin >= 0 && skin < SKIN_COUNT ? skin : random`. *Why:* no accounts needed, choice persists per-device, and the server still validates so a bad client can't set an out-of-range skin. *Alternative — sync a "preferred skin" in state:* unnecessary; skin is set once at join.

### 3. Leaderboard semantics: best single-round score, top-N, keyed by callsign
Round score resets each round, so the leaderboard tracks each player's **best single-round score** all-time. At the intermission transition the server, for each **human** player, upserts `max(existing, roundScore)` keyed by trimmed callsign. Display = top 10 by best. *Why:* simple, meaningful ("highest you ever scored in a round"), and needs no accounts. *Trade-off — callsign collisions:* two players using the same name share a row (the higher score wins). Acceptable for an arcade game; accounts are a noted future option. Bots are never recorded.

### 4. Storage: a JSON file on a persistent volume (SQLite documented as the alternative)
A small module `src/leaderboard.ts` keeps the top-N in memory and persists to `${DATA_DIR}/leaderboard.json` with atomic writes (write temp + `rename`), debounced. *Why JSON over SQLite:* the Docker image is `node:22-alpine`; `better-sqlite3` is a native module needing a build toolchain in the image — avoidable complexity for a top-10 list with tiny write volume and a single writer process. JSON + atomic rename is durable and dependency-free. *If it ever grows* (per-player history, high write rate), switch to SQLite on the same volume — the module API (`record(name, score)`, `top(n)`) stays the same.

### 5. Graceful fallback when no volume is mounted
If `DATA_DIR` is unset or unwritable (local dev, or before the volume is added), the store runs **in-memory only** — the leaderboard still works within a server lifetime, it just doesn't persist across restarts. *Why:* Phase-1/local runs and a not-yet-configured prod never crash; persistence "lights up" once the volume + `DATA_DIR` exist.

### 6. Read-only public endpoint; writes are internal only
`GET /leaderboard?n=10` returns `[{ name, score }]`. There is **no** write endpoint — the only writer is the room at round end, from authoritative state. *Why:* a public POST would be a trivial cheat/spam vector; removing it makes the leaderboard tamper-proof from the client. The GET is cached briefly in memory to shrug off refresh spam.

### 7. Menu structure: progressive sections, not a router
Keep the single `#start-screen` overlay; add sections within it (How-to-Play, plane picker, leaderboard panel) shown/hidden with CSS classes — no SPA router. The results screen reuses `#intermission`. *Why:* matches the existing lightweight DOM approach; lowest risk, no new framework.

## Risks / Trade-offs

- **Volume not mounted in prod → scores lost on redeploy** → Mitigation: the Phase-2 infra task explicitly mounts a Coolify volume and sets `DATA_DIR`; until then the in-memory fallback keeps the feature functional (just non-durable), and the menu shows the live top-N regardless.
- **Callsign collisions / impersonation on the board** → Mitigation: accepted for now (arcade, no accounts); documented; accounts are a clean future upgrade keyed the same way.
- **Regressing startup** → Mitigation: the menu wiring runs after a clean `Renderer.init`; verify in Preview that Quick Play still opens and the new sections don't throw during `init` (the bug we just fixed was exactly an `init`-time throw).
- **JSON write contention** → Mitigation: single process + debounced atomic rename; no concurrent writers exist.
- **Endpoint abuse (refresh spam)** → Mitigation: in-memory cache for the GET; it's a tiny static payload anyway.

## Migration Plan

1. **Phase 1** (client + `onJoin` skin): ship + deploy independently; no infra. Verify menu on desktop + emulated touch.
2. **Phase 2a** (code): add `src/leaderboard.ts`, the `GET /leaderboard` route, round-end recording, and the menu panel — all behind the in-memory fallback so it's safe to deploy before the volume exists.
3. **Phase 2b** (infra): mount a persistent Coolify volume (e.g. `/data`) on the smashcart app and set `DATA_DIR=/data`; redeploy; confirm scores persist across a redeploy.

**Rollback:** Phase 1 and Phase 2a are git-revert + redeploy. The volume can be left mounted harmlessly even if the code is reverted.

## Open Questions

- Top-N size — start at 10; trivial to change.
- Show the leaderboard on the menu always, or behind a "Leaderboard" button? Default: a compact top-5 on the menu + a button to expand to top-10. Decide during the menu task by what fits the layout.
- Minimum score to make the board (filter out 0s)? Default: only record scores > 0.
