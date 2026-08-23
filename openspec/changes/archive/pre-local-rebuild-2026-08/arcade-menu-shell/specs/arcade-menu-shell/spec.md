## ADDED Requirements

### Requirement: Dedicated arcade menu shell presents the live menu flow
The client SHALL present the live front-end through a dedicated arcade-style menu shell with distinct home, launch, join, local Wi-Fi, leaderboard, and customization screens.

#### Scenario: Player opens the game
- **WHEN** the browser loads the menu for a playable session
- **THEN** the player sees the dedicated arcade menu shell as the live front-end instead of a generic application-style panel stack

#### Scenario: Player moves between menu screens
- **WHEN** the player uses the menu's primary action buttons and back controls
- **THEN** the shell moves between the corresponding game screens with a clear return path to the previous menu state

### Requirement: Primary actions read like game mode selection
The arcade menu shell SHALL present launch, join, local Wi-Fi, leaderboard, and customization entry points as large game-style primary actions rather than utility controls.

#### Scenario: Player is deciding what to do next
- **WHEN** the player is on the home or launch screens
- **THEN** the primary actions are visually prioritized as mode-select buttons and the next navigation step is obvious without reading technical setup text

#### Scenario: Touch player uses the menu on a narrow screen
- **WHEN** the player uses the shell on a narrow mobile viewport
- **THEN** the primary actions remain large, reachable, and ordered for top-to-bottom game-style navigation
