## Why

The flat-world reboot is functionally playable, but the current build still has release-blocking faults: malformed packets can crash the server, client prediction diverges from authoritative landmark collisions, and long matches leak GPU resources. These defects directly undermine stability, latency goals, and safe deployment.

## What Changes

- Harden room message handling so malformed join and input payloads are ignored or normalized instead of throwing.
- Align client-side prediction with the server's landmark collision rules to prevent avoidable reconciliation snaps around obstacles.
- Restore renderer resource cleanup for transient and per-player scene objects so extended sessions do not steadily consume GPU memory.
- Tighten release hygiene so CI fails on test regressions, Docker serves the built browser assets, and core documentation matches the current flat-world game.
- Add focused verification for malformed packets and prediction parity to prevent regressions in the hardened paths.

## Capabilities

### New Capabilities

- `runtime-hardening`: Defensive validation for network payloads and other inputs that currently destabilize matches.
- `prediction-parity`: Shared collision behavior between the authoritative server and client-side prediction for flat-world flight.
- `renderer-lifecycle`: Deterministic cleanup of transient and per-player render resources during long sessions.
- `release-integrity`: Release pipeline and docs guarantees that the shipped build matches the tested build.

### Modified Capabilities

- None.

## Impact

Affected areas include `src/rooms/ArenaRoom.ts`, shared flight/collision helpers in `src/shared/`, client netcode in `src/client/`, renderer lifecycle in `public/js/render3d.js`, test coverage in `tests/`, and release artifacts such as `.github/workflows/ci.yml`, `Dockerfile`, and `README.md`.
