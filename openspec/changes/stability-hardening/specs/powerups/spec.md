## ADDED Requirements

### Requirement: Active-powerup remaining time is authoritative
The remaining time shown for the local player's active powerup SHALL reflect the server's authoritative expiry, including when the same powerup type is re-collected (which refreshes the duration), so the HUD timer cannot empty while the effect is still active.

#### Scenario: Re-collect the same powerup
- **WHEN** a player re-collects the powerup type they already hold
- **THEN** the HUD remaining-time refreshes to match the server's renewed duration rather than continuing to drain from the previous pickup

#### Scenario: HUD matches server expiry
- **WHEN** a timed powerup is active
- **THEN** the displayed remaining time tracks the server's expiry rather than a free-running client estimate

### Requirement: Fire feedback matches the real cadence
Client fire feedback (sound) SHALL match the player's actual server-side fire rate, including the faster cadence while rapid fire is active.

#### Scenario: Rapid fire active
- **WHEN** the player holds rapid fire and is shooting
- **THEN** the fire sound plays at the faster rapid cadence, not the base cadence

### Requirement: Instant effects do not waste a pickup
An instant effect (repair) SHALL NOT be consumed when it would have no effect (the player is already at full health).

#### Scenario: Repair at full health
- **WHEN** a player at full health overlaps a repair pickup
- **THEN** the pickup is not consumed and no misleading "collected" cue is shown
