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

- [ ] 2.1 `src/leaderboard.ts` (new): in-memory top-N keyed by trimmed callsign with `record(name, score)` (keep `max`) and `top(n)`; persist to `${DATA_DIR}/leaderboard.json` via atomic write (temp + `rename`), debounced; if `DATA_DIR` is unset/unwritable, run in-memory only (load best-effort on boot)
- [ ] 2.2 `src/rooms/ArenaRoom.ts`: at the round-end (playing→intermission) transition, `record(p.name, p.score)` for each **human** player with `score > 0` (never bots)
- [ ] 2.3 `src/index.ts`: `GET /leaderboard?n=10` returns `[{name, score}]` (clamp n; brief in-memory cache); **no** write route
- [ ] 2.4 `main.js` + `index.html` (+ css): leaderboard panel on the menu (compact top-5 + expand to top-10); fetch on menu load; graceful empty/placeholder state on error
- [ ] 2.5 `tsc --noEmit` clean; Preview verify: a round-end records best human scores (verify against the compiled room like `scripts/verify-*.cjs`); `GET /leaderboard` returns ordered top-N; menu renders it; endpoint unreachable → menu still works (Quick Play unaffected)
- [ ] 2.6 Commit → push `main` → Coolify redeploy → verify live (leaderboard endpoint 200; menu shows entries; in-memory fallback fine until the volume is added)

## 3. Phase 2b — infrastructure (the one infra step)

- [ ] 3.1 Mount a persistent volume on the smashcart Coolify app (e.g. host path → container `/data`) and set `DATA_DIR=/data`; redeploy
- [ ] 3.2 Verify persistence: record a score, trigger a redeploy, confirm the score survives (leaderboard endpoint still returns it); confirm the JSON file lives on the volume
