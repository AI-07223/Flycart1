## ADDED Requirements

### Requirement: Smooth bullet motion
Bullets SHALL move smoothly every rendered frame by extrapolating along their heading at the known bullet speed, rather than only updating when a server patch arrives. When an authoritative update arrives, the client SHALL reconcile to the server position.

#### Scenario: Bullet glides between server updates
- **WHEN** a bullet is in flight and no new server patch has arrived this frame
- **THEN** the bullet still advances smoothly along its heading

#### Scenario: Bullet reconciles on update
- **WHEN** a fresh server patch updates a bullet's position
- **THEN** the rendered bullet converges to the authoritative position without a visible jump

### Requirement: Snapshot interpolation for remote entities
Remote planes SHALL be rendered using time-based interpolation from a buffer of recent server snapshots at a fixed render delay, lerping position and shortest-path interpolating heading between the two surrounding snapshots.

#### Scenario: Remote plane moves smoothly
- **WHEN** server patches arrive at ~20–30 Hz
- **THEN** remote planes render smoothly at the display refresh rate without stutter or rubber-banding

#### Scenario: Tolerates timing jitter
- **WHEN** patch arrival timing varies slightly
- **THEN** motion stays smooth because rendering is interpolated at a fixed delay behind the latest snapshot

#### Scenario: Snaps on discontinuity
- **WHEN** an entity respawns, joins, or teleports (a large position discontinuity)
- **THEN** the client snaps to the new position instead of interpolating across the jump

### Requirement: Local-player prediction and reconciliation
The local player's plane SHALL be simulated client-side from live input (mirroring the server's movement rules) so control feels instant, and SHALL reconcile toward the authoritative server state on each update.

#### Scenario: Input feels instant
- **WHEN** the local player steers or boosts
- **THEN** their plane responds on the next frame without waiting for a server round-trip

#### Scenario: Reconciles without snapping
- **WHEN** the authoritative server position for the local plane differs slightly from the prediction
- **THEN** the predicted plane eases toward the server position without a visible snap under normal latency

#### Scenario: Corrects large errors
- **WHEN** the prediction and server diverge significantly (e.g., after a respawn)
- **THEN** the client snaps the local plane to the authoritative position

### Requirement: Server authority preserved
Prediction, interpolation, and extrapolation SHALL be presentation-only; the server SHALL remain authoritative for positions, collisions, damage, and scoring, and the wire protocol SHALL be unchanged.

#### Scenario: Server arbitrates outcomes
- **WHEN** a client renders predicted or interpolated positions
- **THEN** hit detection and scoring still use the server's authoritative state, so a client cannot gain an advantage by mispredicting
