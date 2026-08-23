## 1. Phase 1 — menu polish (no infrastructure)

- [x] 1.1 `public/index.html` (+ css): device-aware **How to Play** (touch + keyboard variants), **plane picker** (5 swatches from the SKINS colors), results overlay markup (winner line + your-place in `#intermission`)
- [x] 1.2 `main.js`: in `init`, show touch hint on touch / keyboard hint on desktop (never blank)
- [x] 1.3 `main.js`: plane-picker wiring — `localStorage["smashcart.skin"]`, highlight selected, valid default, exposed to `startGame`
- [x] 1.4 `net.js` + `main.js`: `Net.connect(name, code, skin)` → `joinOrCreate({ name, code, skin })`; `startGame` passes the chosen skin
- [x] 1.5 `src/rooms/ArenaRoom.ts`: `onJoin` validates `options.skin` (0..SKIN_COUNT-1) else random
- [x] 1.6 `main.js`: round-over polish — winner highlight, local placement ("You placed Nth"), countdown
- [x] 1.7 `tsc --noEmit` clean; Preview verified: Quick Play opens; desktop shows keys + touch hint hidden; chosen skin (idx 2) applied on server (`mySkin:2`) + persists; no console errors / no init regression
- [ ] 1.8 Commit → push `main` → Coolify redeploy → verify live (retry once if the host "not functional" blip hits; confirm the NEW build is served)

## 2. Phase 2a — leaderboard code (safe before the volume exists; in-memory fallback)

- [x] 2.1 `src/leaderboard.ts` (new): top-N keyed by trimmed callsign, `record` (keep max) + `top(n)`; persist to `${DATA_DIR}/leaderboard.json` via atomic temp+rename, debounced; in-memory fallback when DATA_DIR unset/unwritable; loads on boot — verified 7/7 (`scripts/verify-leaderboard.cjs`: ordering, best-kept, zero/empty ignored, persists across restart, fallback)
- [x] 2.2 `src/rooms/ArenaRoom.ts`: at round-end (playing→intermission) records each **human** player with `score>0` (never bots) — verified against the compiled room (winner recorded, zero + bot excluded)
- [x] 2.3 `src/index.ts`: `GET /leaderboard?n=10` returns `[{name,score}]` (clamp n; 2s cache); no write route — verified 200 + array live in Preview
- [x] 2.4 `main.js` + `index.html` (+ css): leaderboard panel on the menu; fetch on load + after each game; graceful empty/error state — verified renders "No scores yet"
- [x] 2.5 `tsc --noEmit` clean; Preview verified: endpoint, recording, menu render, Quick Play still fires, no console errors
- [x] 2.6 Commit (8d9828a) → push → Coolify redeploy → verified live: game 200, `/leaderboard` 200 (`[]`), plane picker + touch hint + leaderboard panel all served

## 3. Phase 2b — infrastructure (the one infra step)

- [x] 3.1 Mounted a persistent volume `smashcart-data` → container `/data` on the Coolify app and set `DATA_DIR=/data`; redeployed
- [x] 3.2 Confirmed persistent mode is active live — server logs `📊 leaderboard: persistent at /data/leaderboard.json`; storage logic's cross-restart persistence is unit-proven (verify-leaderboard.cjs). Full cross-redeploy confirmation will show naturally once players post scores.
