## ADDED Requirements

### Requirement: Data-driven map definition

The system SHALL define arena content (obstacles, central hotspot, zones, and pickup spawn-weighting parameters) as static data in `src/shared/constants.ts`, mirrored in `public/js/constants.js`. Each obstacle SHALL be described by `{ position, radius, height, kind }`. The map definition MUST be known to both the authoritative server and the client without being added to `ArenaState` (no per-frame sync of static geometry).

#### Scenario: Server and client agree on map content

- **WHEN** the server resolves a collision against an obstacle and the client renders that obstacle
- **THEN** both use the same position and radius from the shared constants, so cover the server enforces is drawn where the player sees it

#### Scenario: No schema change for static content

- **WHEN** the change is implemented
- **THEN** `ArenaState` gains no field for obstacles, hotspot, or landmarks, and only the existing synced `pickups` are affected by map content

### Requirement: The environment SHALL never damage a player

No contact with any environmental element — obstacles (of any kind), the central hotspot, landmarks, eruption/drift visual effects, or zone boundaries — SHALL change a player's HP, kill a player, or affect score. A player's HP MUST change only as a result of an enemy bullet hit (the existing `damage()` path). There MUST be no code path from environment contact to HP change.

#### Scenario: Flying into a solid obstacle costs no health

- **WHEN** a plane collides with a solid obstacle
- **THEN** the plane deflects/slides and its HP is unchanged (no chip damage, no death)

#### Scenario: Sitting at the hotspot costs no health

- **WHEN** a plane flies through the central hotspot during a volcano eruption or other visual effect
- **THEN** its HP is unchanged and it cannot be killed by the environment

#### Scenario: Only bullets change HP

- **WHEN** a player's HP decreases
- **THEN** the cause is an enemy bullet hit, never any environmental element

### Requirement: Obstacles provide bullet cover

Bullet-blocking obstacles SHALL stop bullets that pass through them, giving line-of-sight cover. The block MUST be resolved against the bullet's swept path so a fast bullet cannot tunnel through cover, and when both an obstacle and an enemy plane lie along the same bullet path the bullet MUST resolve to whichever is struck first.

#### Scenario: Bullet stopped by cover

- **WHEN** a bullet's travel segment for the tick crosses a bullet-blocking obstacle
- **THEN** the bullet is removed at the obstacle and deals no damage beyond it

#### Scenario: Plane hidden behind cover is protected

- **WHEN** an enemy plane is directly behind a bullet-blocking obstacle relative to the shooter
- **THEN** the bullet is blocked by the obstacle and the hidden plane takes no damage

#### Scenario: Exposed plane in front of cover is still hit

- **WHEN** an enemy plane is between the shooter and an obstacle along the bullet path
- **THEN** the bullet hits the plane first (earliest hit wins) and applies damage normally

### Requirement: Solid obstacles deflect planes without damage

Solid obstacles SHALL be impassable to planes: a plane reaching a solid obstacle MUST be pushed back to the obstacle surface and have its heading deflected away (reusing the existing wall-deflect behaviour), preserving momentum. The plane MUST NOT lose HP, stop dead, or get stuck inside the obstacle.

#### Scenario: Plane banks away from a spire

- **WHEN** a plane flies into a solid obstacle
- **THEN** it is moved to the obstacle surface, its heading is nudged tangentially away, it keeps flying, and its HP is unchanged

#### Scenario: Prediction matches the server at cover

- **WHEN** the local player flies along a solid obstacle
- **THEN** client prediction mirrors the server deflection so the plane does not rubber-band

### Requirement: Fly-through obstacles are passable

Obstacles of a fly-through kind (e.g. `ring`) SHALL NOT block planes or bullets; they are cosmetic skill gates only and MUST have no effect on HP or score.

#### Scenario: Flying through a ring

- **WHEN** a plane passes through a fly-through obstacle
- **THEN** it continues unobstructed, takes no damage, and gains no gameplay effect

### Requirement: Central hotspot biases powerup spawns

Powerup pickups SHALL spawn with positions weighted toward the central hotspot so the centre is contested, while still allowing occasional spawns toward the edges. A pickup MUST NOT spawn inside a solid obstacle.

#### Scenario: Pickups cluster toward the centre

- **WHEN** many pickups spawn over a round
- **THEN** they are denser near the hotspot than at the edges, while some still appear toward the edges

#### Scenario: No pickup inside cover

- **WHEN** the spawn sampler selects a position overlapping a solid obstacle
- **THEN** it re-rolls so the pickup is reachable and not embedded in cover

### Requirement: Orientation landmarks and zoning

The arena SHALL present distinct landmarks and zones (hot contested centre, cover-rich mid-ring, calmer open edges) so players can orient themselves. The client minimap (`_drawMinimap`) SHALL show obstacle and landmark markers.

#### Scenario: Minimap shows cover and landmarks

- **WHEN** the minimap renders during play
- **THEN** obstacles and landmarks appear on it so the player can read their position relative to cover and the centre

#### Scenario: Regions are visually distinct

- **WHEN** a player looks at the arena
- **THEN** the centre, mid-ring, and edges are visually distinguishable via landmarks/obstacle density

### Requirement: Dynamic flavour is purely visual

Dynamic environmental effects (volcano eruption, drifting elements) SHALL be rendered on the client only and MUST NOT emit or read game state, change HP/score, or alter the simulation in any way.

#### Scenario: Eruption is cosmetic

- **WHEN** the volcano erupts
- **THEN** it produces visual effects only; no player is damaged and the authoritative state is unaffected

### Requirement: Topology-agnostic collision via a pluggable metric

All new distance and overlap tests introduced by this change (obstacle bullet-block, plane deflect, pickup spawn-weighting) SHALL go through a single pluggable distance/collision metric (Euclidean for the flat arena). The metric MUST be swappable to an angular/great-circle implementation so the identical map data and collision logic operate on the spherical world (`globe-arena`) without reauthoring.

#### Scenario: Same map data works on flat and sphere

- **WHEN** the metric is swapped from Euclidean to angular
- **THEN** the same obstacle/hotspot/zone data and the same collision code produce equivalent cover and deflection on the sphere with no change to the map definition

### Requirement: Planes never spawn stuck inside obstacles

(Re)spawn point selection SHALL avoid placing a plane inside a solid obstacle, re-rolling within a bounded number of attempts and never hanging.

#### Scenario: Respawn clear of cover

- **WHEN** a plane respawns
- **THEN** its spawn point is not inside a solid obstacle, so it does not begin a life embedded in cover
