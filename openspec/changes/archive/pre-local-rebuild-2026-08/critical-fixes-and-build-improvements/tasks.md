## 1. Docker Infrastructure

- [x] 1.1 Add named volume `smashdata` to `docker-compose.yml` mounted at `/app/data`
- [x] 1.2 Add `DATA_DIR=/app/data` to the environment block in `docker-compose.yml`
- [x] 1.3 Add healthcheck block using `wget -qO /dev/null http://localhost:2567/healthz`

## 2. Bug Fixes

- [x] 2.1 Fix `steerMode` persistence in `public/js/main.js` — accept `"stick"` as a valid value from localStorage
- [x] 2.2 Extract bullet runtime state in `src/rooms/ArenaRoom.ts` — replace `(b as any).__life` with a `private bulletLife = new Map<string, number>()`
- [x] 2.3 Conditionally mount `/colyseus` monitor route in `src/index.ts` only when `MONITOR_PASS` is set

## 3. Constants Generator

- [x] 3.1 Create `scripts/gen-constants.mjs` that reads `src/shared/constants.ts` and generates `public/js/constants.js`
- [x] 3.2 Add auto-generated header comment to the output file warning against manual edits
- [x] 3.3 Add `gen-constants` script to `package.json` and wire it as a pre-step to `build`

## 4. Verification

- [x] 4.1 Run `npm run build` and verify `public/js/constants.js` is generated correctly
- [x] 4.2 Verify `docker compose up --build` starts successfully with healthcheck showing healthy
- [x] 4.3 Test that steering mode "stick" persists across page reload
