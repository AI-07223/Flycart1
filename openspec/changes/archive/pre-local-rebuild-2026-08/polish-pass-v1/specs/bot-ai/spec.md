## ADDED Requirements

### Requirement: Predictive aiming (target leading)
Bots SHALL aim at a predicted future position of their target derived from the target's velocity, subject to a per-bot aim error, rather than firing only at the target's current position. This logic MUST remain server-authoritative.

#### Scenario: Leading a crossing target
- **WHEN** a bot is engaging an enemy that is moving across its line of fire
- **THEN** the bot leads its shots toward the predicted intercept position

### Requirement: Evasion when low on health
When a bot's health is low, it SHALL attempt to evade — turning away from nearby threats and/or boosting — rather than continuing to press the attack.

#### Scenario: Low-HP disengage
- **WHEN** a bot is at low health near an enemy
- **THEN** it turns away and boosts to disengage

### Requirement: Difficulty variety
Bots SHALL exhibit a spread of difficulty across reaction time and aim accuracy, so encounters are not uniform.

#### Scenario: Mixed bot lobby
- **WHEN** a match is filled with bots
- **THEN** the bots vary in reaction time and accuracy rather than behaving identically
