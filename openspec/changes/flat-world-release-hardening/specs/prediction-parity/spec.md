## ADDED Requirements

### Requirement: Landmark collisions must match between prediction and authority
Client-side local prediction SHALL apply the same landmark collision resolution rules as the authoritative server for flat-world plane movement.

#### Scenario: Low-altitude tower contact resolves identically
- **WHEN** the predicted plane enters a landmark radius below that landmark's collision floor
- **THEN** the predicted position and forward vector are corrected with the same push-out and climb bias as the server step

#### Scenario: High-altitude flyover stays unblocked
- **WHEN** the predicted plane crosses above a landmark's collision floor
- **THEN** the client keeps the movement path unobstructed just as the server does

### Requirement: Prediction shall minimize avoidable obstacle snaps
The client SHALL avoid large reconciliation snaps caused solely by missing local landmark collision logic when authoritative and predicted inputs otherwise match.

#### Scenario: Matching obstacle logic prevents obstacle-only divergence
- **WHEN** the client and server simulate the same low-altitude obstacle approach from the same starting state
- **THEN** the predicted result stays within the normal reconciliation tolerance instead of diverging by a landmark-sized correction
