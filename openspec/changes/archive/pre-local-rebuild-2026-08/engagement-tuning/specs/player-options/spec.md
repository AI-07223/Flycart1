## ADDED Requirements

### Requirement: Bots can be turned off

The player SHALL be able to choose to play without bots from the menu (default: bots on). When bots are off, the player's match MUST NOT be filled with bots and any existing bots MUST be removed; the choice MUST NOT mix bot-filled and bot-free players in the same match.

#### Scenario: Playing without bots

- **WHEN** the player turns bots off and starts a game
- **THEN** their match contains no bots (only human players), even if that means flying solo

#### Scenario: Default keeps bots

- **WHEN** the player starts a game without changing the option
- **THEN** the match fills with bots up to the usual floor (current behaviour)

### Requirement: Controls can be changed mid-match and persist

The player SHALL be able to change control settings during a match (without leaving it) via the in-game settings: switch steering mode (tilt ↔ on-screen arrows), toggle invert-steering, and adjust sensitivity. Changes MUST take effect immediately and persist on the device across sessions.

#### Scenario: Switch steering mode mid-match

- **WHEN** the player switches steering mode in the in-game settings during play
- **THEN** the new steering mode takes effect immediately without rejoining, and the on-screen controls update to match

#### Scenario: Invert steering

- **WHEN** the player enables invert-steering
- **THEN** the steering direction reverses immediately and the preference is remembered next time

#### Scenario: Settings persist

- **WHEN** the player sets a steering mode / invert / sensitivity and returns later on the same device
- **THEN** their previous control settings are restored
