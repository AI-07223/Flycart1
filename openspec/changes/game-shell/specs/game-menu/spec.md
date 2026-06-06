## ADDED Requirements

### Requirement: Device-aware control onboarding

The menu SHALL present controls appropriate to the player's device: on touch devices it MUST show touch (tap/tilt) instructions, and on non-touch devices it MUST show keyboard instructions. The menu MUST NOT leave a player with no controls shown on any device.

#### Scenario: Touch device shows touch controls

- **WHEN** the menu is shown on a touch device
- **THEN** tap/tilt control instructions are displayed and keyboard-only hints are not

#### Scenario: Desktop shows keyboard controls

- **WHEN** the menu is shown on a non-touch device
- **THEN** keyboard control instructions are displayed

#### Scenario: Controls are never blank

- **WHEN** the menu is shown on any device
- **THEN** some control guidance is visible (never an empty controls area)

### Requirement: Plane selection persisted and applied on join

The menu SHALL let the player choose one of the available plane skins before joining and SHALL remember the choice on that device across visits. The chosen skin SHALL be applied to the player's plane when they join. The server SHALL validate the requested skin and fall back to a random valid skin when the request is missing or out of range.

#### Scenario: Choosing a plane

- **WHEN** the player selects a plane skin in the menu and starts a game
- **THEN** their in-game plane uses the selected skin

#### Scenario: Choice persists across visits

- **WHEN** the player returns to the menu later on the same device
- **THEN** their previously selected plane is pre-selected

#### Scenario: Invalid skin is rejected server-side

- **WHEN** a join requests a skin index that is missing or outside the valid range
- **THEN** the server assigns a valid (random) skin instead, and never errors

### Requirement: Round-over results screen

At the end of a round the game SHALL present a results moment showing the final standings, highlighting the winner and the local player's placement, and indicating when the next round starts.

#### Scenario: Results shown at round end

- **WHEN** a round ends (the match enters intermission)
- **THEN** a results screen shows the final standings with the winner highlighted and a countdown to the next round

#### Scenario: Local player placement

- **WHEN** the results screen is shown
- **THEN** the local player's row/placement is clearly indicated among the standings

### Requirement: Menu does not regress startup

The menu SHALL wire up only after the renderer has initialized successfully, and a failure or absence of any optional menu feature MUST NOT prevent the game from starting via Quick Play.

#### Scenario: Quick Play opens the game

- **WHEN** the player clicks Quick Play from the menu
- **THEN** the game connects and starts (the menu hides and the HUD appears), on both touch and desktop
