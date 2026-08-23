## MODIFIED Requirements

### Requirement: Preflight surface shows the selected plane and clear launch paths
The menu SHALL act as a preflight surface delivered through a game-style screen flow that shows the selected plane, the player call sign, current room/share status, and distinct entry points for public play, private/invite play, and local Wi-Fi play.

#### Scenario: Player opens the game
- **WHEN** the browser loads the start screen
- **THEN** the player sees the selected plane, call sign input, status context, and clearly separated launch actions inside a game-style home screen

#### Scenario: Player navigates between launch paths
- **WHEN** the player moves between home, launch, join, local Wi-Fi, leaderboard, and customization entry points
- **THEN** each path is presented as an explicit menu screen with clear back navigation and player-facing labels instead of technical utility wording

### Requirement: Local Wi-Fi play uses create and scan as the primary actions
The client SHALL present the existing local Wi-Fi room flow through primary `Create Room` and `Scan Rooms` actions on a dedicated local-play screen, while manual hotspot server entry and Offline QR remain available as secondary fallback utilities.

#### Scenario: Host creates a local Wi-Fi room
- **WHEN** the player enters or accepts a room name and chooses `Create Room`
- **THEN** the local room flow starts and the room name is shown prominently for sharing from the dedicated local-play screen

#### Scenario: Guest scans for local Wi-Fi rooms
- **WHEN** the player chooses `Scan Rooms`
- **THEN** the interface shows discovered rooms or a clear hotspot/fallback message if no rooms are found without requiring the player to navigate through manual server setup first

### Requirement: Non-playing screens suppress combat chrome and remain readable on mobile
Menus, customization, settings, leaderboard, and pre-match surfaces SHALL hide or subordinate combat-only widgets and SHALL remain readable on desktop and mobile layouts while preserving game-style button hierarchy and screen navigation.

#### Scenario: Player opens a non-playing screen
- **WHEN** the player is in menu, customization, settings, leaderboard, or pre-match UI
- **THEN** combat-only chrome such as the minimap or equivalent HUD widgets does not compete with the screen's primary content

#### Scenario: Touch player opens the preflight UI
- **WHEN** a touch player views the preflight or customization surface on a narrow screen
- **THEN** the layout remains readable, preserves primary actions near the top of the flow, and keeps screen-to-screen navigation accessible without overlap
