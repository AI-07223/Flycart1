## ADDED Requirements

### Requirement: Server logs are structured JSON
All server log output SHALL be formatted as JSON objects with consistent fields (timestamp, level, message, context).

#### Scenario: Server start log
- **WHEN** the server starts listening
- **THEN** a JSON log entry is written to stdout with `level: "info"`, `msg`, and `port` fields

#### Scenario: Room lifecycle log
- **WHEN** a room is created or disposed
- **THEN** a JSON log entry is written with the room ID and player count

#### Scenario: Error log includes context
- **WHEN** an error is logged
- **THEN** the JSON entry includes `level: "error"` and any relevant context (room ID, player ID, error message)
