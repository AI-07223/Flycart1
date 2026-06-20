## 1. Shared Model Reset

- [x] 1.1 Replace globe-specific shared math with flat 3D vector helpers suitable for movement, aim, and collision
- [x] 1.2 Replace spherical tuning constants with flat-world map size, altitude limits, slow flight rates, and slower projectile values
- [x] 1.3 Redefine `ArenaState` player, bullet, and pickup positions around flat-world `x/y/z` plus facing data
- [x] 1.4 Remove or quarantine globe-only constants and helpers so new code no longer depends on radius, wrap, or angular distance

## 2. Authoritative Server Simulation

- [x] 2.1 Rewrite `ArenaRoom` movement to use flat horizontal travel plus climb/dive altitude changes with capped pitch and altitude
- [x] 2.2 Replace globe spawn logic with large-map spawn zones, soft edge handling, and safe respawn placement
- [x] 2.3 Rewrite projectile travel, hit detection, and pickup collection against the new 3D coordinate model
- [x] 2.4 Retune bot steering and target selection for flat-world pursuit, altitude changes, and center-biased encounters
- [x] 2.5 Add or preserve latency-safe server guards: bounded timestep, input validation, and sequence-friendly input processing

## 3. Client Netcode And Prediction

- [x] 3.1 Extend client input payloads to support climb/dive while preserving existing fire and boost semantics
- [x] 3.2 Implement sequence-based local prediction and bounded reconciliation for flat-world 3D flight
- [x] 3.3 Rewrite remote interpolation and bounded extrapolation for 3D player movement and altitude changes
- [x] 3.4 Update projectile smoothing and authoritative cleanup so delayed packets do not create warped or ghost projectiles
- [x] 3.5 Verify disconnect and reconnect flows still land in a usable recovery state under the new model

## 4. Renderer, Controls, And HUD

- [x] 4.1 Replace globe rendering with a flat terrain mat, distant landmarks, and flat-world camera framing
- [x] 4.2 Update local and remote plane rendering to reflect true altitude and derive bank visually from turn input
- [x] 4.3 Rework desktop and mobile controls to expose climb/dive without turning the game into a flight simulator
- [x] 4.4 Replace globe-specific minimap and direction cues with a flat-world tactical map that exposes altitude relationships
- [x] 4.5 Retune visual pacing, chase camera, and combat readability around the new crawl-speed flight model

## 5. Verification And Cleanup

- [x] 5.1 Rewrite or replace globe-dependent tests with flat-world movement, altitude, latency, and projectile cases
- [x] 5.2 Run build and test validation for server and client TypeScript paths after the state-model rewrite
- [ ] 5.3 Run manual playtests for desktop and mobile controls, slow-speed combat feel, and reconnect behavior
- [x] 5.4 Remove obsolete spherical assets, helpers, and dead codepaths once the flat-world build is stable
- [x] 5.5 Update repository docs and OpenSpec task references to describe the new flat-world 3D model
