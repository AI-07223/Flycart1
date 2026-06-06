## ADDED Requirements

### Requirement: The arena is a spherical surface
The play surface SHALL be the surface of a sphere of fixed radius rather than a bounded flat plane. Players and projectiles SHALL move along great circles, and there SHALL be no walls or edges — flight wraps continuously around the world.

#### Scenario: Flying "off the edge" wraps around
- **WHEN** a player flies continuously in one direction
- **THEN** they travel around the planet and return to where they started, never hitting a wall or boundary

#### Scenario: Straight-ahead follows a great circle
- **WHEN** a player holds no turn input
- **THEN** their path follows a great circle on the sphere (a straight line in the surface's geometry), not a chord through it

### Requirement: Authoritative simulation operates in spherical space
The server SHALL remain authoritative and SHALL compute movement, projectile travel, and collisions in spherical terms (great-circle advance and angular separation), with distance measured as angular separation between surface points.

#### Scenario: Hit detection by angular separation
- **WHEN** a bullet's position comes within the configured angular hit radius of a target
- **THEN** the server registers a hit, independent of any flat-plane distance

#### Scenario: Spawning on the sphere
- **WHEN** a player spawns or respawns
- **THEN** they are placed at a valid point on the sphere surface (well-distributed, not clustered) with a valid heading

### Requirement: The world is rendered as a planet
The client SHALL render the arena as a globe (surface, water/continents, atmosphere) with planes sitting on and oriented to the surface, a chase camera that follows above the surface so the horizon curves, and decor that orbits the planet.

#### Scenario: Planes hug the surface
- **WHEN** a plane is rendered at its spherical position
- **THEN** it sits just above the surface, its up aligned to the surface normal and its nose along its tangent heading, banking as it turns

#### Scenario: Curved horizon
- **WHEN** the local player flies across the world
- **THEN** the camera follows along the surface and the planet curves away at the horizon (the world is visibly round)

### Requirement: HUD and minimap account for wrap-around
The minimap and any off-screen target cues SHALL represent a wrapping spherical world (e.g., a rotating mini-globe or projection) rather than a bounded rectangle.

#### Scenario: Minimap on a sphere
- **WHEN** the minimap is shown
- **THEN** it represents positions on the globe (rotating globe or projection), and direction cues point along the great-circle bearing to their target
