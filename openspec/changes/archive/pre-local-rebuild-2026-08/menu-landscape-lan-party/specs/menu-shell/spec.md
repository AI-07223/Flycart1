## ADDED Requirements

### Requirement: Menu separates play entry points
The start screen SHALL present Quick Play, private room play, and LAN party play as distinct entry points with their own labels and supporting text.

#### Scenario: Player opens the game menu
- **WHEN** the browser loads the start screen
- **THEN** the interface shows separate sections for public matchmaking, private room play, and LAN party play

### Requirement: Menu shows readiness and controls context
The start screen SHALL display the current room/share status, the selected plane, the player name input, and clear control help without requiring the player to enter a match first.

#### Scenario: Player prepares before joining
- **WHEN** the player is on the start screen
- **THEN** the interface shows their call sign input, plane selection, and desktop/mobile control guidance

### Requirement: Menu supports mobile landscape guidance
The start screen SHALL remain usable on small screens and SHALL tell touch users when landscape orientation is preferred for play.

#### Scenario: Touch player opens the menu in portrait
- **WHEN** the player uses a touch device in portrait orientation
- **THEN** the menu remains readable and shows guidance that landscape is the recommended play orientation
