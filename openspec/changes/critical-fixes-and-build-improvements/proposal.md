## Why

SmashCart has four bugs/gaps that cause data loss, broken UX, and fragile maintenance. The leaderboard resets every container restart (no persistent volume), the steering mode silently drops the "stick" option on reload, bullet runtime state is hacked onto schema objects with `as any`, and client constants must be manually synced with server constants — a process that has already drifted. Fixing these eliminates the most common sources of player-facing bugs and developer toil.

## What Changes

- **Leaderboard persistence**: Add a named Docker volume to `docker-compose.yml` so the leaderboard JSON survives container restarts.
- **Steering mode fix**: Correct the `steerMode` persistence logic in `public/js/main.js` to accept `"stick"` as a valid value from localStorage.
- **Bullet state extraction**: Move `__life` and `__key` off `Bullet` schema objects into a dedicated `Map<string, {life: number}>` in `ArenaRoom.ts`.
- **Auto-generated client constants**: Add a build script that generates `public/js/constants.js` from `src/shared/constants.ts`, eliminating manual sync.
- **Healthcheck**: Add a `healthcheck` block to `docker-compose.yml` using the existing `/healthz` endpoint.
- **Conditional monitor**: Only mount the `/colyseus` route when `MONITOR_PASS` is configured.

## Capabilities

### New Capabilities
- `persistent-storage`: Docker volume configuration for durable server-side data (leaderboard)
- `constants-generator`: Build script that auto-generates client constants from the server source of truth

### Modified Capabilities
(No existing specs to modify)

## Impact

- `docker-compose.yml` — volume mount + healthcheck block
- `public/js/main.js` — steerMode persistence fix (~3 lines)
- `src/rooms/ArenaRoom.ts` — bullet state refactor (~15 lines changed)
- `src/index.ts` — conditional monitor mount (~3 lines)
- New file: `scripts/gen-constants.mjs` — client constants generator
- `package.json` — new `gen-constants` script, wired into `build`
