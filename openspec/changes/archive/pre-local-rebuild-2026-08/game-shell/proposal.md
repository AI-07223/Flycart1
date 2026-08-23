## Why

The game now has a working globe, but the front door is bare: the start screen is a title + name + two buttons + keyboard-only control hints, and on touch devices it shows **no controls at all** (the keyboard hints are hidden with nothing in their place). Players can't pick a plane, and there's no persistent reason to come back. This change builds a complete, polished shell around the game — clear onboarding on every device, a plane picker, a real round-over moment, and a global leaderboard — so SmashCart feels like a finished game, not a prototype.

It ships in two phases so the no-infrastructure polish lands fast and the only piece that needs a datastore (the leaderboard) follows once a persistent volume is wired.

## What Changes

**Phase 1 — menu polish (no infrastructure):**
- **Device-aware "How to Play".** Show tap/tilt instructions on touch devices and keyboard keys on desktop (today mobile sees nothing once the keyboard hints are hidden). Driven by `window.Input.isTouchDevice()`.
- **Plane picker.** Let players choose one of the 5 existing skins before joining, with a small preview; persist the choice in `localStorage`; send it to the server on join. `onJoin` currently randomizes `skin` — it will accept and validate an `options.skin`, falling back to random when absent/invalid.
- **Results / round-over screen.** The intermission scoreboard exists; make it a proper moment — winner highlight, "you placed Nth", and a clear "next round in Ns".

**Phase 2 — global leaderboard (needs a datastore):**
- **Persistent global top-10** by best single-round score, all-time. The server records a human player's best round score at round end into a small persistent store; the menu fetches and displays the top 10. Scores are **server-authoritative** (written server-side from authoritative state), so there is no client cheat vector.
- **Storage + endpoint.** A tiny JSON-file store on a persistent Coolify volume (no native dependency; SQLite is the documented alternative if it grows) and a read-only `GET /leaderboard` endpoint. **This is the only piece that needs infrastructure** — a persistent volume mounted on the Coolify app.

## Capabilities

### New Capabilities
- `game-menu`: the complete menu/shell — device-aware control onboarding, plane selection persisted per-device and applied on join, and a polished round-over results screen. Works on touch and desktop.
- `leaderboard`: a persistent global top-N leaderboard — server-authoritative best-score recording into a durable store, a read-only HTTP endpoint, and menu display.

### Modified Capabilities
<!-- None. No capability specs are archived to openspec/specs/ yet. The "join with a chosen skin" server behaviour is authored within the new game-menu capability (it's the menu choosing the plane). -->

## Impact

- **Client:**
  - `public/index.html` (+ css): menu sections — device-aware How-to-Play, plane picker, leaderboard panel, polished results overlay (reuses `#intermission`).
  - `public/js/main.js`: device-aware hint rendering; plane-picker wiring + `localStorage`; pass chosen skin into `Net.connect`; results-screen polish; fetch + render the leaderboard on the menu.
  - `public/js/net.js`: `connect(name, code, skin)` sends the chosen skin on join.
- **Server:**
  - `src/rooms/ArenaRoom.ts`: `onJoin` accepts + validates `options.skin`; record best human scores at round end (intermission transition).
  - `src/index.ts`: `GET /leaderboard` (read-only, returns top N).
  - `src/leaderboard.ts` (new): durable top-N store backed by a JSON file at `DATA_DIR` (atomic writes; in-process so writes serialize).
- **Infrastructure (Phase 2 only):** a persistent volume mounted on the Coolify app (e.g. `/data`) via `DATA_DIR`, so the leaderboard survives redeploys.
- **Constraints:** keep the arcade-cute art; works on touch + desktop; must not regress the just-fixed `Renderer.init` startup (the shell wires up after a clean init).
- **Unaffected:** the spherical sim, netcode, powerups, matchmaking, monitor auth.
