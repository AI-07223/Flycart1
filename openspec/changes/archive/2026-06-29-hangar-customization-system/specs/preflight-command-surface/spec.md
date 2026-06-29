## ADDED Requirements

### Requirement: Preflight surface shows the selected plane and clear launch paths
The menu SHALL act as a preflight surface that shows the selected plane, the player call sign, current room/share status, and distinct entry points for public play, private/invite play, and local Wi-Fi play.

#### Scenario: Player opens the game
- **WHEN** the browser loads the start screen
- **THEN** the player sees their selected plane, call sign input, status context, and clearly separated launch actions

#### Scenario: Player navigates between launch paths
- **WHEN** the player moves between public, private, and local play entry points
- **THEN** each path is labeled in player-facing language and does not rely on technical server terminology to be understood

### Requirement: Local Wi-Fi play uses create and scan as the primary actions
The client SHALL present the existing local Wi-Fi room flow through primary `Create Room` and `Scan Rooms` actions, while manual hotspot server entry and Offline QR remain available as secondary fallback utilities.

#### Scenario: Host creates a local Wi-Fi room
- **WHEN** the player enters or accepts a room name and chooses `Create Room`
- **THEN** the local room flow starts and the room name is shown prominently for sharing

#### Scenario: Guest scans for local Wi-Fi rooms
- **WHEN** the player chooses `Scan Rooms`
- **THEN** the interface shows discovered rooms or a clear hotspot/fallback message if no rooms are found

### Requirement: Non-playing screens suppress combat chrome and remain readable on mobile
Menus, customization, settings, leaderboard, and pre-match surfaces SHALL hide or subordinate combat-only widgets and SHALL remain readable on desktop and mobile-landscape layouts.

#### Scenario: Player opens a non-playing screen
- **WHEN** the player is in menu, customization, settings, leaderboard, or pre-match UI
- **THEN** combat-only chrome such as the minimap or equivalent HUD widgets does not compete with the screen's primary content

#### Scenario: Touch player opens the preflight UI
- **WHEN** a touch player views the preflight or customization surface on a narrow screen
- **THEN** the layout remains readable, preserves orientation guidance, and keeps primary actions accessible without overlap
