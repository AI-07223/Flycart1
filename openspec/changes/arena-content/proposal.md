## Why

The arena is a featureless open rectangle — a toy island, decorative blimp/balloons/clouds, and a neon boundary, but nothing to actually fight *over* or *around*. There is no cover, no chokepoints, no landmarks to orient by, and no reason for players to converge, so dogfights are flat and samey: everyone circles in open space until someone wins the turn-rate war. This change gives the map *tactical content* — cover to break line of sight, a contested centre worth fighting for, and regions you can recognise — to make the space genuinely fun to dogfight in.

Crucially, the environment must never punish a player for touching it. Obstacles are there to be used (cover, slingshot turns, fly-through rings), not to deal chip damage or instant death. So this is a **content + collision** change, not a hazard system: the map gets richer, the flight model and the "your HP only changes from bullets" contract stay exactly as they are.

It is designed once, **topology-agnostic**, so the same map data and rules carry over to the planned `globe-arena` (tiny planet) with the collision math swapping from flat distance to angular distance — no second authoring pass.

## What Changes

- **Data-driven map definition.** A single map description (obstacles, zones, spawn-weighting) lives in shared constants and is mirrored client-side. Obstacles are a list of `{ position, radius, height, kind }` (spires, arches, fly-through rings).
- **Obstacles are cover + solid navigation — never damage.** They block bullets (line-of-sight cover) and planes deflect/slide off them (reusing the existing wall-deflect approach). Touching one costs **zero** HP. The environment cannot damage a player under any circumstance.
- **Central hotspot.** A central landmark (volcano/tower) with powerup spawns **weighted toward the middle**, pulling players into conflict over a contested centre.
- **Landmarks for orientation.** Distinct per-region features (lighthouse / shipwreck / forest); some double as cover so you can read where you are at a glance.
- **Zoning.** A hot contested centre, a cover-rich mid-ring, and calmer open edges — expressed purely through where obstacles and pickups are placed (no special-cased rules).
- **Dynamic flavour is visual only.** Volcano eruptions and drifting elements are **purely cosmetic and non-damaging**. No hazard zones, no damaging terrain. (Stated as a hard requirement, not a default.)
- **Pluggable distance/collision.** A single distance/collision function the sim calls (squared-Euclidean for the flat arena today; angular dot-product on the sphere later) so identical map data works on both surfaces.
- **Composes with `globe-arena`.** This change lifts `globe-arena`'s "no obstacles / terrain gameplay" non-goal: on the sphere the same obstacles/zones/spawn-weighting apply, with the pluggable distance swapped to angular. The two changes stack instead of conflicting.

## Capabilities

### New Capabilities
- `arena-map`: a data-driven, topology-agnostic map content layer — cover obstacles that block bullets and physically deflect planes but deal no damage, a central hotspot that weights powerup spawns toward the contested middle, orientation landmarks, zoning via placement, and purely-visual dynamic flavour — backed by a pluggable distance/collision function so the same map works on the flat arena now and the spherical world later.

### Modified Capabilities
<!-- None. No capability specs have been archived to openspec/specs/ yet, so there are no existing spec deltas to write. The powerup spawn-weighting behaviour is authored as part of the new arena-map capability (it is a property of the map, not a change to the powerup set or HUD). The globe-arena non-goal lift is recorded in this change's design.md and reflected in globe-arena's own artifacts. -->

## Impact

- **Shared:**
  - `src/shared/constants.ts` — map definition (obstacle list, zone radii, hotspot position, pickup spawn-weighting params) + tuning; a pluggable distance/collision helper (euclidean now). Mirrored in `public/js/constants.js`.
- **Server (authoritative):**
  - `src/rooms/ArenaRoom.ts` — bullet-block against obstacles in `stepBullets`; plane deflect/slide against obstacles in `stepPlane` with **no HP change**; pickup spawn positions weighted toward the hotspot; all collision routed through the pluggable distance helper. **No `ArenaState` schema change** — obstacles are static shared geometry known to both sides; only pickups (already synced) move.
- **Client:**
  - `public/js/render3d.js` — render obstacles / landmarks / central hotspot and non-damaging eruption VFX; dispose them on teardown like other GPU resources; the existing `_drawMinimap` gains obstacle + landmark markers for orientation.
- **Stays on the flat simulation.** No flight-model change; designed to port to `globe-arena` by swapping the distance function to angular.
- **Also touched:** `openspec/changes/globe-arena/` — lift its "no obstacles / terrain gameplay" non-goal so the two changes compose.
- **Unaffected:** matchmaking, rooms, monitor auth, audio, `public/js/main.js`, the powerup *set* + HUD chip, connection/reconnect, deployment pipeline, `ArenaState` schema.
