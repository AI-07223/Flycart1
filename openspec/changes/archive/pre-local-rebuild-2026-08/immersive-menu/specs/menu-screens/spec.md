## ADDED Requirements

### Requirement: All menu screens are present on the stage

The immersive menu SHALL provide all of the game's menu screens, each presented within the 3D stage: main (play options), plane select, leaderboard, settings, play-with-friends, how-to-play, results/round-over, pause, and connection-lost.

#### Scenario: Every screen is reachable

- **WHEN** the player navigates the menu
- **THEN** they can reach main, plane select, leaderboard, settings, play-with-friends, and how-to-play; and during/after a match they see pause, results, and (on drop) connection-lost — all within the 3D presentation

### Requirement: Screens reflect the real underlying state

Each screen SHALL be driven by the existing game logic, not a separate copy: plane select changes the actual chosen skin (persisted, applied on join); the leaderboard shows the real fetched standings; settings/controls change the actual settings; play-with-friends produces a real joinable room code.

#### Scenario: Plane select drives the real choice

- **WHEN** the player picks a plane in the immersive hangar
- **THEN** that skin is saved and applied to their plane on join (same behavior as before, new presentation)

#### Scenario: Leaderboard shows real standings

- **WHEN** the leaderboard screen is shown
- **THEN** it displays the actual top pilots fetched from the leaderboard endpoint (and degrades gracefully if unavailable)

### Requirement: Round-over results moment

At the end of a round the menu SHALL present a results moment within the stage (e.g., a podium) showing the standings, the winner, and the local player's placement, then return to the main menu / next round.

#### Scenario: Results after a round

- **WHEN** a round ends
- **THEN** a results presentation shows the final standings with the winner and the player's placement, before returning to play/menu
