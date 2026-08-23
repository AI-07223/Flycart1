## Context

SmashCart is a Colyseus multiplayer game deployed via Docker on Coolify. The server stores leaderboard data in a JSON file at `DATA_DIR/leaderboard.json` (falls back to in-memory when unset). The client constants in `public/js/constants.js` are a manual mirror of `src/shared/constants.ts`. Bullet entities carry runtime-only state (`__life`, `__key`) via `as any` casts on Colyseus schema objects.

## Goals / Non-Goals

**Goals:**
- Leaderboard survives container restarts
- All three steering modes (arrows, stick, tilt) persist correctly
- Bullet runtime state is cleanly separated from synced schema
- Client constants are auto-generated from the single source of truth
- Docker healthcheck enables auto-restart on failure
- Monitor route is only active when configured

**Non-Goals:**
- Migrating client JS to TypeScript (separate effort)
- Adding tests or CI (separate effort)
- Splitting render3d.js into modules (separate effort)

## Decisions

### 1. Docker named volume for leaderboard

Use a named Docker volume (`smashcart-data`) mounted to `/app/data` and set `DATA_DIR=/app/data` in the environment. This is simpler than bind mounts and works identically on Coolify.

Alternatives considered:
- Bind mount to a host path — fragile across deploys, different path per host
- External database (Redis/SQLite) — overkill for a 100-entry JSON file

### 2. Auto-generate client constants via build script

Create `scripts/gen-constants.mjs` that reads `src/shared/constants.ts`, extracts the exported values using regex/string parsing (not a full TS compiler), and writes `public/js/constants.js`. Wire it into `npm run build` as a pre-step.

Alternatives considered:
- Shared JSON config imported by both — requires refactoring all imports, bigger change
- Full TS compilation of client code — scope creep, separate effort
- Runtime fetch of constants from server — adds a network round-trip on page load

The regex approach is pragmatic: constants.ts uses simple `export const` declarations with literal values. The generator only needs to handle numbers, strings, arrays, and simple objects — no functions or complex expressions.

### 3. Bullet state as a separate Map

Replace `(b as any).__life` with a `private bulletLife = new Map<string, number>()` in ArenaRoom. The `__key` is already the Map key in `state.bullets`, so it's redundant — just use the Map key directly.

### 4. Conditional monitor mount

Wrap the `/colyseus` route in an `if (MONITOR_PASS)` check. When unconfigured, the route isn't registered at all (currently returns 404 via middleware — cleaner to not register).

### 5. Healthcheck in docker-compose

Add a `healthcheck` block using `curl` against `/healthz`. The alpine image doesn't have curl by default, so use `wget -qO /dev/null` instead (available in alpine).

## Risks / Trade-offs

- **Constants generator fragility**: The regex parser will break if constants.ts uses complex expressions (function calls, ternaries, etc.). Mitigation: the file already uses only literals; add a comment warning about this constraint.
- **Volume mount on Coolify**: Coolify manages docker-compose — the volume declaration needs to be in the repo's compose file, and Coolify should pass it through. If Coolify overrides compose, the volume may not apply. Mitigation: test after deploy.
- **Bullet life Map memory**: Adding a Map per bullet is negligible (8 bytes × ~50 bullets max). No real risk.

## Migration Plan

1. Apply all changes in a single commit
2. Deploy to Coolify (rebuild + restart)
3. Verify: leaderboard persists across a container restart, steering "stick" works, healthcheck shows healthy
4. Rollback: `git revert` + redeploy (all changes are backward-compatible)
