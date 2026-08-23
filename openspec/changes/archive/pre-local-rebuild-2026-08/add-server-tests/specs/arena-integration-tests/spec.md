## ADDED Requirements

### Requirement: Core gameplay loop is covered by integration tests
The ArenaRoom SHALL have integration tests covering join, movement, combat, death/respawn, and powerup collection.

#### Scenario: Player joins a room
- **WHEN** a client joins an ArenaRoom
- **THEN** the player exists in `state.players` with `alive: true` and a valid spawn position

#### Scenario: Player fires a bullet
- **WHEN** a player sends a `fire` message
- **THEN** a bullet appears in `state.bullets` with the correct `owner` ID

#### Scenario: Bullet collision deals damage
- **WHEN** a bullet hits a player (simulated via ticks)
- **THEN** the victim's HP decreases by `BULLET_DAMAGE`
- **AND** the bullet is removed from `state.bullets`

#### Scenario: Player death and respawn
- **WHEN** a player's HP reaches 0
- **THEN** `alive` is set to `false`
- **AND** after `RESPAWN_DELAY` seconds, `alive` returns to `true` with full HP

#### Scenario: Bot auto-spawn
- **WHEN** a single player is in the room and `MIN_PLAYERS > 1`
- **THEN** bots are automatically added to `state.players` to fill the minimum

### Requirement: Tests use deterministic timing
Integration tests SHALL advance time explicitly rather than using real timers, ensuring fast and reproducible execution.

#### Scenario: Fast test execution
- **WHEN** the full integration test suite runs
- **THEN** it completes in under 5 seconds
