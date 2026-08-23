## MODIFIED Requirements

### Requirement: Bots seek nearby powerups
Bot AI SHALL divert toward powerups that are within seek radius, prioritized by tactical value.

#### Scenario: Powerup diversion
- **WHEN** a powerup is within 400 world-units and the bot doesn't have that power type
- **THEN** the bot diverts toward the powerup instead of pursuing its current target
- **AND** the bot resumes targeting after collecting the powerup

#### Scenario: Priority ordering
- **WHEN** multiple powerups are within range
- **THEN** the bot pursues the highest-priority one (shield when low HP > afterburner > spread > rapid > homing > repair)

#### Scenario: No diversion during close combat
- **WHEN** an enemy is within 500 world-units (engagement range)
- **THEN** the bot does not divert for powerups — combat takes priority
