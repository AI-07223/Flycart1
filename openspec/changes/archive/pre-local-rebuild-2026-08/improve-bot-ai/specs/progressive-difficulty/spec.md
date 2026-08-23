## MODIFIED Requirements

### Requirement: Bots have distinct difficulty tiers
Each bot SHALL be assigned a difficulty tier (rookie, veteran, or ace) that determines its skill parameters and behaviors.

#### Scenario: Rookie behavior
- **WHEN** a rookie-tier bot is in play
- **THEN** it has slow reaction time (2-3s), high aim error (0.15-0.25), low lead prediction (0.3-0.5)
- **AND** it does not evade, seek powerups, or use cover

#### Scenario: Veteran behavior
- **WHEN** a veteran-tier bot is in play
- **THEN** it has moderate reaction time (1-1.8s), moderate aim error (0.06-0.12), good lead prediction (0.6-0.8)
- **AND** it evades incoming fire and seeks powerups

#### Scenario: Ace behavior
- **WHEN** an ace-tier bot is in play
- **THEN** it has fast reaction time (0.5-0.8s), low aim error (0.02-0.05), high lead prediction (0.85-1.0)
- **AND** it evades, seeks powerups, and uses obstacles as cover

#### Scenario: Tier distribution
- **WHEN** bots are spawned to fill the room
- **THEN** approximately 50% are rookies, 35% veterans, 15% aces

### Requirement: Target selection considers threat level
Bot target selection SHALL score targets by threat level, not just distance.

#### Scenario: Threat-based targeting
- **WHEN** a bot selects a target
- **THEN** closer targets score higher
- **AND** targets aiming at the bot score higher (2x multiplier)
- **AND** low-HP targets score higher (1.5x multiplier)
