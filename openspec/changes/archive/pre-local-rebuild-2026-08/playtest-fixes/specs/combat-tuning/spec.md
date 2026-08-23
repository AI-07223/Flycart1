## ADDED Requirements

### Requirement: Selectable bot difficulty

The game SHALL offer three bot difficulty tiers — Easy, Medium, and High — with Medium as the default. The selected tier SHALL be choosable from the menu and persisted client-side (e.g. `localStorage`) like the control-scheme preference. For private rooms, the host SHALL be able to set the room's bot difficulty through the existing host-settings path; public Quick Play SHALL use a default tier.

#### Scenario: Default difficulty is Medium

- **WHEN** a player has never chosen a difficulty
- **THEN** bots play at the Medium tier

#### Scenario: Difficulty selection persists

- **WHEN** the player selects Easy and reloads the app
- **THEN** Easy remains selected

#### Scenario: Host sets private-room difficulty

- **WHEN** the host of a private room changes bot difficulty via host settings
- **THEN** the room's bots adopt that tier and non-host clients do not override it

### Requirement: Bot aiming is beatable at every tier

Bots SHALL NOT aim with perfect precision. Each bot's aiming SHALL incorporate an aim error (random angular jitter applied to its desired heading), a fire cone (it only fires when aligned within a tier-dependent angle), a lead-time factor (scaling how far ahead of a moving target it leads), and a reaction delay (how quickly it re-targets and responds). These parameters SHALL be scaled by difficulty tier such that Easy is clearly weak and even High is winnable by a skilled human (never pinpoint). Both the authoritative server room and the P2P host-sim SHALL apply the same tuning.

#### Scenario: Easy bots miss often

- **WHEN** bots run at the Easy tier
- **THEN** their aim jitter and reaction delay are large enough that a human can routinely out-duel them

#### Scenario: High bots are tough but beatable

- **WHEN** bots run at the High tier
- **THEN** their aim jitter is small but non-zero, so a skilled human can still win and bots do not land pinpoint shots

#### Scenario: Tuning applies in P2P matches

- **WHEN** a match is hosted via P2P (host-sim) rather than the Colyseus server
- **THEN** bot difficulty tuning is applied identically

### Requirement: Forgiving powerup pickup radius

The sim-authoritative powerup collection radius SHALL be large enough that powerups are easy to grab during normal flight. Increasing the collection radius SHALL NOT change the visual size of the powerup orb.

#### Scenario: Near-miss collects the powerup

- **WHEN** a plane flies close to a powerup within the (enlarged) collection radius
- **THEN** the powerup is collected

#### Scenario: Orb visual unchanged

- **WHEN** the collection radius is increased
- **THEN** the rendered orb size is unchanged from before the change
