## ADDED Requirements

### Requirement: App-style menu screen navigation

The main menu SHALL be organized into distinct screens (Home, Play, Join, LAN/Local, Leaderboard) with only one screen visible at a time, rather than a single page listing all options. Non-root screens SHALL provide a back control, and returning to the menu SHALL always land on Home.

#### Scenario: Navigate Play then back

- **WHEN** the player taps PLAY on Home and then the back control
- **THEN** the Play screen is shown after the first tap and Home is shown after back

#### Scenario: Returning to menu resets to Home

- **WHEN** the player leaves a match back to the main menu
- **THEN** the Home screen is the active menu screen (not whatever screen they last viewed)

#### Scenario: One screen at a time

- **WHEN** any menu screen is active
- **THEN** the other menu screens are not visible

### Requirement: Prominent QR-scan join

Joining by QR SHALL be reachable as a clear action on a dedicated Join screen (alongside code entry and paste-link), not buried inside a secondary modal.

#### Scenario: Scan is visible on the Join screen

- **WHEN** the player opens Play → Join
- **THEN** a prominent SCAN QR (camera) action is visible alongside the code field

#### Scenario: Scanning a room QR joins it

- **WHEN** the player scans a valid room QR
- **THEN** the camera stops and the client joins that room

### Requirement: In-game menu access on touch

The in-game HUD SHALL include a touch-accessible menu button that opens the pause screen, so touch players can reach Resume, Settings, Invite, and Main Menu mid-game without a keyboard.

#### Scenario: Touch player opens the in-game menu

- **WHEN** a touch player taps the HUD menu button during play
- **THEN** the pause screen opens with Resume, Settings, Invite, and Main Menu

#### Scenario: Keyboard pause still works

- **WHEN** a desktop player presses P during play
- **THEN** the pause screen opens as before

### Requirement: Context-correct invite

The lobby invite bar SHALL be shown only in the pre-game lobby and SHALL NOT remain on screen during gameplay. Mid-game invites SHALL be available from the pause screen for private/P2P rooms only.

#### Scenario: Invite bar gone during play

- **WHEN** a private lobby starts the match
- **THEN** the invite bar is hidden during gameplay

#### Scenario: Pause invite only in private rooms

- **WHEN** the player opens pause in a public match
- **THEN** the Invite action is hidden; in a private/P2P room it is shown
