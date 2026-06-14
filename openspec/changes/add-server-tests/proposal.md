## Why

SmashCart has zero tests. The server runs authoritative physics — arc collision, homing bullets, bot AI, obstacle deflection — and any regression silently breaks gameplay for all players. There's no safety net for refactoring, no CI gate, and no way to verify behavior without manually playing the game. Adding tests for the core math and room logic catches regressions early and unlocks confident iteration.

## What Changes

- **Add vitest** as the test runner (fast, native TS/ESM, zero-config)
- **Unit tests for `src/shared/sphere.ts`** — all 14 pure math functions (vec, add, sub, scale, dot, cross, len, normalize, rotateAxis, tangentize, advance, turn, angBetween, slerp, arcDistToPoint, arcClosestT)
- **Integration tests for `ArenaRoom`** — spawn a room via Colyseus test client, join players, send inputs, assert state changes (movement, shooting, damage, respawning, pickups, bot behavior)
- **Test script in package.json** — `npm test` runs vitest

## Capabilities

### New Capabilities
- `test-infrastructure`: vitest runner + Colyseus test utilities for server-side testing
- `sphere-math-tests`: comprehensive unit tests for sphere geometry functions
- `arena-integration-tests`: integration tests covering core gameplay loop

### Modified Capabilities
(No existing specs modified)

## Impact

- `package.json` — add vitest + @colyseus/testing as devDependencies, add `test` script
- `vitest.config.ts` — new config file
- `tests/sphere.test.ts` — new: ~15 unit test cases for sphere math
- `tests/arena.test.ts` — new: ~10 integration test cases for room logic
- No changes to production code
