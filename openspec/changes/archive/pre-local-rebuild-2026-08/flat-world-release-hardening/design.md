## Context

The flat-world reboot moved the game to slow 3D flight, but several critical safeguards did not survive the rewrite. `ArenaRoom` trusts join and input payload shapes, local prediction duplicates only part of the server flight model, and `render3d.js` allocates per-object geometries and materials without disposing them on removal. Release automation also has integrity gaps: CI tolerates test failure, Docker can overwrite built browser assets with source checkout files, and the README no longer describes the actual controls or renderer.

## Goals / Non-Goals

**Goals:**
- Prevent malformed client payloads from crashing the room process or corrupting active input state.
- Make local prediction and authoritative simulation resolve landmark collisions the same way.
- Dispose owned render resources when dynamic objects leave the scene.
- Ensure the shipped build is the build that passed tests and that docs describe the current flat-world game.

**Non-Goals:**
- Replacing Colyseus message transport or introducing a runtime schema-validation dependency.
- Refactoring the renderer into TypeScript modules or fully deduplicating mesh construction.
- Redesigning deployment strategy beyond fixing the current CI and Docker correctness gaps.

## Decisions

### Validate and normalize payloads at the room boundary

`onMessage("input")`, `onMessage("setName")`, and `onJoin()` will treat inbound values as unknown data, not trusted shapes. Invalid payloads will be ignored or normalized to safe defaults without disconnecting the client.

This keeps the protocol backward-compatible and removes the crash path with minimal surface area. A library validator was rejected because the payloads are small, fixed, and already handled in one room; a manual sanitizer is simpler and avoids introducing a new runtime dependency.

### Share landmark collision resolution between server and client prediction

The landmark push-out rule will move into a shared pure helper in `src/shared/` and both `ArenaRoom` and `src/client/net.ts` will call it during plane stepping.

This removes the exact divergence that currently causes snaps near towers and mesas. Duplicating the logic in both places was rejected because it already regressed once and would keep the two paths drifting.

### Dispose only owned dynamic render resources

`render3d.js` will gain a helper that traverses a removed object and disposes its geometry and material instances. That helper will only be called for owned dynamic objects such as planes, bullets, pickups, shields, particles, and the menu demo.

This fixes the leak without risking disposal of static scene assets that stay alive for the full session. A larger shared-geometry pool was rejected for this pass because it adds more moving parts than the current regression requires.

### Make release automation enforce the tested build

CI will fail on test failure, Docker will copy built `public/` assets from the build stage into the runtime image, and the README will be updated to match the flat-world controls and current commands.

This closes the gap between "works locally" and "what gets deployed." Keeping the current permissive flow was rejected because it can silently ship broken builds.

## Risks / Trade-offs

- Shared flight helpers can change both server and client behavior at once -> mitigate with deterministic tests that compare obstacle outcomes.
- Ignoring malformed packets instead of disconnecting clients may hide bad senders -> mitigate by keeping the existing rate limits and preserving stable last-known input state.
- Disposing the wrong render object can break remaining meshes -> mitigate by limiting disposal calls to transient per-entity objects and leaving world geometry untouched.
- Stricter CI may block deployments more often -> mitigate by keeping tests deterministic and scoped to behavior already required for the live game.

## Migration Plan

No data migration is required. Land the code changes, rebuild generated browser assets, run the build and test suite, then deploy normally. Rollback remains the previous commit or container image if any regression is found after release.

## Open Questions

None for this pass. The defects and corrective path are already concrete enough to implement directly.
