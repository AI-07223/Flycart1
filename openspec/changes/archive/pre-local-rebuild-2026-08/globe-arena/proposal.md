## Why

The globe world has been the intended destination since launch — referenced as deferred "separate change" work in both `powerups` ("ports to the globe later", "the future globe world") and `smooth-netcode` ("the globe — separate change"). It was never spec'd, only promised. This change writes that spec and turns the **flat, walled arena into a small spherical planet** players fly *around*: no walls, wrap-around dogfights over the horizon, and a far stronger toy-world identity that matches the arcade-cute art direction.

Today the simulation is authoritative in flat 2D (`x`, `y`, `angle`) and merely *presented* in 3D on a flat island. "Globe instead of flat" changes the **play surface topology**, not just the backdrop: movement becomes great-circle flight on a sphere, the bounding walls disappear, and distance/collision become angular. That is a flight-model change, which is why it earns its own change and should land **after** `stability-hardening`.

## What Changes

- **Spherical play surface.** Replace the bounded flat plane (`ARENA_WIDTH`/`HEIGHT`, `WALL_MARGIN`, wall clamp/deflect) with a sphere of fixed radius. Planes fly along great circles; flying "off an edge" no longer exists — you wrap around the world.
- **Authoritative spherical state.** Player position becomes a point on the unit sphere with a tangent heading; bullets travel along geodesics; collisions use angular/chord distance. Server stays authoritative.
- **Renderer becomes a planet.** The flat island/water/boundary becomes a textured globe (grass continents, water, atmosphere); planes sit on and bank to the surface; the chase camera follows above the surface and the horizon curves; decor (clouds/balloons/blimp) orbits the planet.
- **Netcode ported to the sphere.** Prediction mirrors the spherical step; remote interpolation slerps positions and interpolates tangent headings; bullet extrapolation follows geodesics.
- **HUD/minimap.** The rectangular minimap becomes a small rotating globe or an equirectangular projection; "off-screen enemy" cues account for wrap-around.
- **Dynamic planet size by player count.** `GLOBE_RADIUS` scales with the number of bodies in the arena (humans + bots) to hold play density constant — **radius ∝ √(players)**, clamped to a floor/ceiling, recomputed **between rounds** (during the intermission) and held steady per round. Bigger lobby → bigger world; the variation is gentle (~1.4× across 4→8) so it never lurches. Free because positions are direction unit-vectors and speeds are angular — `R` only rescales the render/placement.
- **Stage B is the committed deliverable** (see design): true spherical simulation. Stage A (visual curvature over the still-flat sim) is an optional internal look-test only — it does not remove the boundary, so it is not the release.

## Capabilities

### New Capabilities
- `globe-world`: the arena is the surface of a sphere — players and projectiles move along great circles, there are no walls, and the world wraps around; the authoritative simulation, prediction, interpolation, rendering, and HUD all operate in this spherical space.

### Modified Capabilities
- `netcode-smoothing`: prediction, interpolation, and bullet extrapolation operate on the sphere (slerp / geodesic) instead of the flat plane.
- `powerups`: powerup effects (spawn positions, homing steer, spread, afterburner) are computed in spherical space; behavior is otherwise unchanged.

## Impact

- **Server:**
  - `src/schema/ArenaState.ts` — position representation changes (e.g., a unit-vector `Player.px/py/pz` + tangent `heading`, or `lat`/`lon`); `Pickup`/`Bullet` positions likewise. **Breaking** state shape — server + client deploy together.
  - `src/rooms/ArenaRoom.ts` — `stepPlane` (great-circle advance + bank), `stepBullets` (geodesic advance + angular hit test), `collectPickups` (angular overlap), `spawn` (uniform random point on sphere), homing steer in the tangent plane; remove all wall clamp/deflect.
  - `src/shared/constants.ts` — `GLOBE_RADIUS`, angular speeds/turn rates, angular hit radii (replacing world-unit arena bounds).
- **Client:**
  - `public/js/render3d.js` — globe geometry/material + atmosphere replacing island/water/boundary; place/orient planes on the surface; surface-following chase camera with curved horizon; pickups/bullets on the sphere; minimap → globe/projection; powerup visuals unchanged in spirit.
  - `public/js/net.js` — snapshot interpolation via slerp on the sphere.
  - `public/js/constants.js` — mirror `GLOBE_RADIUS` + angular constants; prediction step ported to spherical math.
  - `public/js/main.js` — minimap/HUD wrap-around cues.
- **Depends on:** `stability-hardening` should land first (don't port buggy netcode/leaky renderer onto a harder coordinate system).
- **Composes with `arena-content`:** that change's data-driven obstacle/cover/hotspot map and its pluggable distance metric carry onto the sphere by swapping the metric from Euclidean to angular — the earlier "no obstacles/terrain" non-goal is lifted and the two changes stack (no map reauthoring; environment never damages players).
- **Unaffected:** matchmaking, rooms, monitor auth, audio, the powerup *set* and HUD chip, deployment pipeline.
