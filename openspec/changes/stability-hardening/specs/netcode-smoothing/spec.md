## ADDED Requirements

### Requirement: Prediction accounts for active powerup speed
Client-side prediction of the local plane SHALL apply the same speed modifiers the server applies for active powerups (e.g., afterburner), so the predicted pose does not persistently trail the authoritative pose while a powerup is active.

#### Scenario: Afterburner active locally
- **WHEN** the local player holds a speed-affecting powerup
- **THEN** the predicted plane moves at the same target speed the server uses, with no sustained rubber-band correction back into place

### Requirement: Graceful remote behavior under packet loss
When fresh snapshots stop arriving, remote-plane interpolation SHALL degrade gracefully (bounded short extrapolation along last heading) rather than freezing and then snapping when packets resume.

#### Scenario: Brief packet stall
- **WHEN** snapshots pause briefly and then resume
- **THEN** remote planes continue moving plausibly for a bounded window and ease back to authoritative positions without a visible teleport

### Requirement: Special and despawned bullets render without artifacts
Bullets that change heading server-side (homing) SHALL NOT be extrapolated as straight lines, and a bullet that has despawned server-side SHALL NOT be advanced past its last authoritative position before removal.

#### Scenario: Homing missile in flight
- **WHEN** a homing bullet curves server-side
- **THEN** the client does not render it veering off along a stale straight heading between patches

#### Scenario: Bullet despawns
- **WHEN** a bullet is removed from synchronized state
- **THEN** the client removes/fades it at its last position rather than gliding a ghost past the impact point
