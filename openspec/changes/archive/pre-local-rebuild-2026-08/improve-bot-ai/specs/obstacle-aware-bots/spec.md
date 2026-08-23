## MODIFIED Requirements

### Requirement: Bots detect and avoid obstacles
Bot AI SHALL check proximity to solid obstacles and steer to avoid head-on collisions.

#### Scenario: Obstacle avoidance steering
- **WHEN** a bot is heading toward a solid obstacle within detection range
- **THEN** the bot steers perpendicular to the obstacle center to avoid it
- **AND** the avoidance is smooth (no oscillation between obstacles)

#### Scenario: Obstacle cover when fleeing
- **WHEN** a bot is fleeing (HP < 35) and a solid obstacle is nearby
- **THEN** the bot steers toward the obstacle to use it as bullet cover
- **AND** the bot stops firing while behind cover

#### Scenario: Bots without cover behavior
- **WHEN** a rookie-tier bot is fleeing
- **THEN** it flees toward the antipode (current behavior), not toward obstacles
