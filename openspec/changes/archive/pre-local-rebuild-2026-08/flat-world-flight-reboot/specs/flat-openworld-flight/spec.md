## ADDED Requirements

### Requirement: The arena is a large flat open world
The game SHALL replace the spherical play surface with a large flat battlefield that supports long travel lanes, open sightlines, and `.io` style circulation. The active map SHALL use authoritative flat-world coordinates and SHALL NOT rely on globe wrap, curved-horizon movement, or planet-radius scaling.

#### Scenario: Movement stays on a flat battlefield
- **WHEN** a player travels across the map
- **THEN** their position is resolved against flat-world coordinates rather than a spherical surface, and they do not wrap around a globe

#### Scenario: The world preserves open-field flow
- **WHEN** a match starts
- **THEN** the arena provides a broad playable field with enough space for long pursuit lines, evasive turns, and distributed spawns rather than a tight enclosed bowl

### Requirement: Authoritative simulation operates in flat 3D space
The server SHALL remain authoritative and SHALL simulate player movement, projectiles, pickups, bots, and collisions using flat horizontal position plus altitude. All gameplay-critical state SHALL use a consistent 3D coordinate model shared by server prediction and client rendering.

#### Scenario: Position includes altitude
- **WHEN** the server publishes player state
- **THEN** each player has authoritative horizontal position, altitude, and facing data sufficient to reconstruct 3D flight on the client

#### Scenario: Collision resolves in 3D
- **WHEN** a projectile or pickup interacts with a player
- **THEN** the server evaluates the interaction using 3D separation instead of a 2D plane distance or spherical angular distance

### Requirement: Flight supports climb and dive
Players SHALL be able to actively climb and dive during combat. Local controls, bot behavior, chase camera framing, projectile trajectories, and obstacle interactions SHALL all respect vertical movement rather than faking it with surface normals or purely visual lift.

#### Scenario: Local player changes altitude
- **WHEN** the player applies climb or dive input
- **THEN** their authoritative altitude changes in the expected direction and the client camera follows the new vertical state

#### Scenario: Vertical positioning matters in combat
- **WHEN** two players cross the same horizontal area at different altitudes
- **THEN** combat, visibility, and hit detection reflect the altitude difference instead of treating them as overlapping on a 2D surface

### Requirement: Flight pacing is intentionally slow and readable
The flight model SHALL be retuned to a much slower pace than the current globe build. Cruise speed, boost speed, turn rate, climb rate, and projectile travel SHALL support readable tracking and low-stress aiming under ordinary network delay rather than high-speed snap engagements.

#### Scenario: Straight flight reads as deliberate movement
- **WHEN** a player flies without boosting
- **THEN** the world crosses the camera slowly enough that nearby opponents remain visually trackable without constant oversteer

#### Scenario: Boost remains a tactical change, not a warp
- **WHEN** a player boosts
- **THEN** they gain a meaningful speed advantage without jumping so quickly that opponents or projectiles become unreadable

### Requirement: The world is rendered as a flat battlefield
The client SHALL render the map as a wide flat battlefield with ground reference, distant landmarks, and altitude cues instead of a planet. The chase camera, horizon, lighting, and arena composition SHALL reinforce open-world flat flight rather than curved-surface traversal.

#### Scenario: Camera shows flat-world depth
- **WHEN** the local player flies near the ground or at higher altitude
- **THEN** the camera framing and visible terrain make the battlefield read as a flat space with vertical separation

#### Scenario: Globe presentation is removed
- **WHEN** the game renders the arena
- **THEN** it does not show a spherical planet, curved horizon, or surface-normal banking assumptions from the globe build

### Requirement: HUD and minimap expose flat-world direction and altitude
The HUD and minimap SHALL represent flat-world positioning and altitude state. Players SHALL be able to understand forward direction, nearby threats, and relative altitude without globe-specific wraparound cues.

#### Scenario: Minimap follows flat-world orientation
- **WHEN** the minimap is displayed
- **THEN** it represents the flat battlefield and nearby entities in flat-world space instead of a globe or equirectangular wrap projection

#### Scenario: Altitude is visible to the player
- **WHEN** the local player climbs or dives
- **THEN** the HUD or camera provides clear feedback that their altitude changed and whether opponents are above or below them
