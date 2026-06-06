## ADDED Requirements

### Requirement: Server-authoritative best-score recording

The server SHALL record players' scores into the leaderboard from authoritative game state only — never from a client request. It SHALL record each human player's **best single-round score** (keyed by trimmed callsign, taking the maximum across rounds) at the end of a round, and SHALL NOT record bots or zero scores.

#### Scenario: Best score recorded at round end

- **WHEN** a round ends and a human player's round score exceeds their stored best
- **THEN** the leaderboard stores the new best for that callsign

#### Scenario: Bots and zero scores excluded

- **WHEN** a round ends
- **THEN** bot players and any player with a zero score are not recorded

#### Scenario: No client write path

- **WHEN** the system is examined for ways to set a score
- **THEN** the only writer is the server at round end; there is no client-facing endpoint that writes scores

### Requirement: Durable storage with graceful fallback

The leaderboard SHALL persist across server restarts when a data directory is configured, using atomic writes so a crash mid-write cannot corrupt the store. When no writable data directory is configured, the leaderboard SHALL operate in-memory for the server's lifetime rather than failing.

#### Scenario: Scores survive a restart

- **WHEN** a persistent data directory is configured and the server restarts
- **THEN** previously recorded best scores are still present

#### Scenario: Missing data directory does not crash

- **WHEN** no writable data directory is configured
- **THEN** the leaderboard still records and serves scores in-memory and the server runs normally

### Requirement: Read-only leaderboard endpoint

The system SHALL expose a read-only HTTP endpoint that returns the top-N entries (name + best score, descending). The endpoint MUST NOT accept writes.

#### Scenario: Fetching the top entries

- **WHEN** a client requests the leaderboard endpoint
- **THEN** it receives the top-N entries ordered by best score, highest first

#### Scenario: Endpoint is read-only

- **WHEN** a write is attempted against the leaderboard endpoint
- **THEN** no score is created or modified

### Requirement: Leaderboard shown in the menu

The menu SHALL display the global leaderboard (top entries) fetched from the endpoint, and SHALL degrade gracefully (show nothing/empty state) if the leaderboard is unavailable.

#### Scenario: Menu shows the leaderboard

- **WHEN** the menu loads and the endpoint returns entries
- **THEN** the top entries are displayed in the menu

#### Scenario: Unavailable leaderboard does not break the menu

- **WHEN** the leaderboard endpoint is unreachable or returns an error
- **THEN** the menu still functions (Quick Play works) and simply shows an empty/placeholder leaderboard
