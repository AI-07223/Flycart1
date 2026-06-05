## ADDED Requirements

### Requirement: Rounded low-poly toy planes with skins
The renderer SHALL draw each aircraft as a rounded, low-poly "toy" plane (fuselage, rounded wings, tail fin, canopy, and a spinning propeller), tinted with one of five distinct bright skin colors chosen by the entity's skin index. Geometry MUST be code-generated (no imported model files).

#### Scenario: Plane appears on spawn
- **WHEN** a player or bot spawns
- **THEN** a rounded toy plane in its skin color is rendered at its position and heading

#### Scenario: Propeller animates
- **WHEN** a plane is alive
- **THEN** its propeller visibly spins

### Requirement: Soft shadows ground the planes
Each plane SHALL cast a soft shadow onto the arena floor — a real (low-resolution) shadow map on Med/High quality, and a blob shadow on Low quality.

#### Scenario: Shadow beneath a plane
- **WHEN** a plane flies over the ground
- **THEN** a soft shadow appears on the ground beneath it

### Requirement: Bloom post-processing
The renderer SHALL apply a subtle bloom so bright elements (boost flames, bullets, explosions, sun) glow, whenever the active quality tier permits.

#### Scenario: Boost flame glows
- **WHEN** a plane boosts on a quality tier with bloom enabled
- **THEN** its boost flame visibly blooms

#### Scenario: Bloom disabled on low quality
- **WHEN** the quality tier is Low
- **THEN** bloom is disabled and the scene still renders correctly

### Requirement: Poofy arcade explosions
When a plane is destroyed, the renderer SHALL play a poofy arcade burst — an expanding shockwave ring plus star sparkles and smoke puffs — instead of angular shards, and the effect MUST fade out.

#### Scenario: Destruction burst
- **WHEN** a plane is destroyed
- **THEN** a shockwave ring, sparkles, and smoke play at its location and fade out

### Requirement: Toy-island arena and graded sky
The arena SHALL be presented in an arcade-cute style: a toy island (grass field, a shimmering water ring/border, decorative blimp and hot-air balloons, layered clouds) beneath a cohesive, color-graded sky, with the playable bounds remaining visually readable.

#### Scenario: Arena renders on match start
- **WHEN** the game starts
- **THEN** the island, water, decorative props, clouds, and graded sky are visible and the play area bounds are readable
