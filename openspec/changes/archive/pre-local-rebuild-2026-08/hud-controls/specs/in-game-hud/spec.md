## ADDED Requirements

### Requirement: HUD information is glanceable and out of the way

In-game information (score, time, health, leaderboard, mute/settings) SHALL be placed along the top and edges of the screen — never in the central play area or the bottom thumb zones — so it is glanceable without obstructing the dogfight or the controls.

#### Scenario: Info hugs the edges

- **WHEN** the player is in a match
- **THEN** score/time/health/leaderboard/icons are along the top/edges, the screen center is clear of UI, and the bottom corners are reserved for controls

### Requirement: Minimap is clear of the thumb zones

The minimap SHALL be positioned outside the bottom thumb zones (where steering and fire/boost live), while keeping its threat-aware emphasis.

#### Scenario: Minimap does not sit under a thumb

- **WHEN** the touch controls are active
- **THEN** the minimap is not in the bottom-left/bottom-right control areas (it sits in the top band), so a thumb never covers it and it never blocks a control

#### Scenario: Minimap still alerts on threat

- **WHEN** an enemy is within engagement range
- **THEN** the minimap still emphasises that (brightens), in its new position
