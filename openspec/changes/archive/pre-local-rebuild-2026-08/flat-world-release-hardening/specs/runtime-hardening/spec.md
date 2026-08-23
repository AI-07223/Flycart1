## ADDED Requirements

### Requirement: Room payload handling must be non-fatal
The game room SHALL treat join, rename, and flight input payloads as untrusted data and MUST ignore or normalize malformed values without throwing an exception or terminating the room process.

#### Scenario: Null input payload is ignored safely
- **WHEN** a connected client sends `null` for the `"input"` message
- **THEN** the room keeps the player's last valid input state and the simulation continues running

#### Scenario: Invalid join name falls back safely
- **WHEN** a client joins with a non-string `name` value
- **THEN** the room assigns the default pilot name instead of throwing during join

### Requirement: Partial valid input fields must still be accepted
The game room SHALL preserve the last known good input values for malformed fields while still applying any valid fields present in the same message.

#### Scenario: Mixed-validity input updates only safe fields
- **WHEN** a client sends an `"input"` payload where `turn` is finite but `seq` and `climb` are malformed
- **THEN** the room applies the valid `turn` update and leaves `seq` and `climb` at safe values
