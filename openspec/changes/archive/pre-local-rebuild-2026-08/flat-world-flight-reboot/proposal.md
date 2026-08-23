## Why

The current globe model makes flight harder to read, harder to tune for latency, and harder to extend into true vertical movement. This change resets the core game toward a slower, flatter, more legible `.io` style arena with real altitude, so movement, combat, and networking are all built around the same simpler model.

## What Changes

- Replace the spherical arena with a large flat open-world playfield. Remove globe wrap, geodesic movement, and planet-radius scaling in favor of authoritative flat-world coordinates and broad `.io` style map space.
- Rework flight into true 3D movement. Players can climb and dive, projectiles and pickups exist in 3D space, and the camera, bots, collisions, and HUD all reflect altitude.
- Slow the game down substantially. Cruise, boost, turn, projectile speed, and engagement spacing are retuned toward a deliberate crawl so aiming stays readable and network jitter is less punishing.
- Add latency-focused movement and projectile handling. Client prediction, interpolation, reconciliation, disconnect recovery, and packet-loss behavior are redesigned for the new 3D flat-world model.
- Rebuild arena presentation around a flat battlefield. Replace the globe and curved-horizon assumptions with a wide terrain mat, distance landmarks, altitude-aware minimap/HUD cues, and flatter `.io` style visual composition.
- **BREAKING**: The authoritative state shape, movement math, map topology, bot navigation, and client prediction model all change together. Server and client must ship as one release.

## Capabilities

### New Capabilities
- `flat-openworld-flight`: authoritative flat-world flight with large-map movement, true climb/dive altitude, altitude-aware combat, and `.io` style map flow.
- `latency-resilience`: network smoothing, prediction, reconciliation, and disconnect recovery tuned for slower 3D flight and projectile combat.

### Modified Capabilities
<!-- None. No archived top-level specs exist yet, so this reboot is authored as new capabilities rather than delta specs. -->

## Impact

- **Server:** `src/schema/ArenaState.ts` and `src/rooms/ArenaRoom.ts` need a new flat-world 3D state model, movement loop, collision model, spawn rules, bot navigation, and latency-safe reconciliation hooks.
- **Shared:** `src/shared/constants.ts` and `src/shared/sphere.ts` need to be replaced or heavily refactored around flat 3D vector math, slower tuning values, altitude limits, and large-map dimensions.
- **Client:** `src/client/main.ts`, `src/client/net.ts`, `src/client/input.ts`, and `public/js/render3d.js` need a new control scheme, prediction model, camera, minimap/HUD cues, and rendering assumptions for a flat 3D world.
- **Content:** the current spherical arena layout, obstacle placement assumptions, and globe-specific presentation are removed in favor of a flat terrain mat and open-field landmarks.
- **Risk:** this is a coordinated simulation and presentation rewrite, not a local balance patch. Existing tests and spec assumptions around the globe world will need to be replaced.
