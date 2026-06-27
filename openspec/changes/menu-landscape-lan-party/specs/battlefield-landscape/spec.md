## ADDED Requirements

### Requirement: Battlefield reads as a complete flat-world arena
The renderer SHALL present the map as a deliberately built battlefield using layered terrain treatment, travel features, and landmark dressing across the playable area.

#### Scenario: Player enters a match
- **WHEN** the arena renderer loads
- **THEN** the player sees a visually filled battlefield instead of a mostly empty ground plane

### Requirement: Landscape dressing preserves gameplay geometry
Landscape presentation SHALL not change the authoritative collision or movement envelope already defined by shared constants and server simulation.

#### Scenario: Renderer adds visual dressing
- **WHEN** the client builds terrain and props
- **THEN** flight bounds, altitude rules, and landmark collision behavior remain unchanged

### Requirement: Menu flyby matches the upgraded world
The start-screen flyby SHALL render over the same improved battlefield so the menu feels like part of the game world.

#### Scenario: Player stays on the start screen
- **WHEN** the menu camera animates in demo mode
- **THEN** the background shows the upgraded battlefield presentation rather than a bare field
