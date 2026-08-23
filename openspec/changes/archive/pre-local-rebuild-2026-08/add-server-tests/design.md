## Context

SmashCart is a Colyseus multiplayer game with an authoritative server. The server has two main code areas: pure sphere math (`src/shared/sphere.ts`, 123 lines, 14 exported functions) and game room logic (`src/rooms/ArenaRoom.ts`, 564 lines, 13 private simulation methods). There are currently zero tests.

## Goals / Non-Goals

**Goals:**
- Catch regressions in sphere math before they reach production
- Verify core gameplay loop (join, move, shoot, damage, respawn, pickups)
- Provide a test harness that makes future changes safe
- Fast test suite (<5s) that developers actually run

**Non-Goals:**
- 100% code coverage (aim for high-value paths, not exhaustive branching)
- Testing client code (separate effort — client is vanilla JS, not testable without framework migration)
- Performance/load testing
- E2E browser testing

## Decisions

### 1. Vitest over Jest

Vitest is native ESM, has TypeScript support out of the box, and is significantly faster for small projects. Jest requires more configuration for ESM modules and TypeScript. Since the project uses TypeScript with ESM-style imports, vitest is the natural fit.

### 2. Colyseus test-utils for room integration tests

Colyseus provides `@colyseus/testing` which can spin up a `Server` in-process, create rooms, join mock clients, and send messages. This lets us test the full room lifecycle without a real WebSocket connection.

Pattern:
```ts
const server = new Server({ ... });
server.define("arena", ArenaRoom);
await server.listen(0);
const client = await Client.joinOrCreate(server, "arena", { name: "Test" });
// send messages, assert state
await client.leave();
```

### 3. Test file structure

```
tests/
  sphere.test.ts    — pure math unit tests
  arena.test.ts     — room integration tests
  helpers.ts        — shared test utilities (room setup, mock RNG, etc.)
```

### 4. What to test in sphere.ts (all 14 functions)

| Function | Test cases |
|----------|-----------|
| `vec/add/sub/scale/dot/cross` | Basic arithmetic, identity, edge cases (zero vector) |
| `len/normalize` | Unit length, zero vector handling |
| `rotateAxis` | 0°, 90°, 180°, 360° rotations, axis alignment |
| `tangentize` | Result is perpendicular to position, unit length |
| `advance` | Moves correct angular distance, forward stays tangent |
| `turn` | Heading rotates correctly, stays tangent |
| `angBetween` | Same point = 0, opposite = π, perpendicular = π/2 |
| `slerp` | t=0 returns a, t=1 returns b, t=0.5 is midpoint |
| `arcDistToPoint/arcClosestT` | Known geometric configurations |

### 5. What to test in ArenaRoom

| Scenario | What to verify |
|----------|---------------|
| Player joins | Player exists in state, correct spawn position, alive=true |
| Player sends steer input | Position changes after tick |
| Player fires | Bullet appears in state.bullets with correct owner |
| Bullet hits player | HP decreases, bullet removed |
| Player dies | alive=false, respawn timer set |
| Player respawns | alive=true, HP restored, invuln applied |
| Powerup collected | Power type set on player, duration starts |
| Bot spawns when alone | Bot appears in state after delay |
| Player disconnects | Player removed from state |

### 6. Deterministic testing

Sphere math tests use exact assertions (floating point with epsilon). Arena tests use a fixed tick rate and advance time explicitly rather than relying on real timers.

## Risks / Trade-offs

- **Colyseus test-utils compatibility**: `@colyseus/testing` may have version-specific quirks with Colyseus 0.16. If it doesn't work, fallback to testing room methods directly by making them package-private.
- **Private methods in ArenaRoom**: All simulation methods are `private`. Integration tests go through the public API (messages), which is actually the right thing — tests the real contract. But if we need to test specific internals, we'd need to relax visibility or use `(room as any).method()`.
- **Test maintenance**: As the game evolves, tests need updating. Keeping tests focused on behavior (not implementation) reduces this cost.

## Migration Plan

1. Install vitest + @colyseus/testing as devDependencies
2. Create vitest config
3. Write sphere.test.ts (no dependencies on room code)
4. Write arena.test.ts (depends on room + schema)
5. Wire `npm test` into CI (separate change)
6. No production code changes needed
