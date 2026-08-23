## ADDED Requirements

### Requirement: Pickups spawn on the map
The server SHALL spawn collectible pickups at in-bounds positions, maintaining up to a configured maximum and respawning new ones over time. Pickups SHALL be part of synchronized state so all clients see them.

#### Scenario: Pickups are present
- **WHEN** a match is in progress
- **THEN** up to the configured maximum of pickups are visible at valid positions

#### Scenario: Pickups replenish
- **WHEN** a pickup is collected or time passes below the maximum
- **THEN** the server spawns replacement pickups over time

### Requirement: Collecting a pickup grants its effect
A player SHALL collect a pickup by flying into it; on collection the server SHALL remove that pickup, apply the corresponding effect to that player, and emit an event so clients can play a sound and popup.

#### Scenario: Fly through to collect
- **WHEN** a plane overlaps a pickup
- **THEN** the pickup disappears, its effect is applied to that plane, and a pickup cue (sound + popup) is shown

### Requirement: Effects are timed and server-authoritative
Powerup effects SHALL be applied and enforced by the server, last for a configured duration, and then revert; instant effects (repair) apply immediately without occupying the timed slot. A player SHALL have at most one timed powerup active at a time; collecting another replaces it.

#### Scenario: Effect expires
- **WHEN** a timed powerup's duration elapses
- **THEN** the server reverts the effect and clears the player's active-powerup state

#### Scenario: New powerup replaces current
- **WHEN** a player with an active timed powerup collects a different one
- **THEN** the previous effect ends and the new one becomes active

#### Scenario: Server enforces effects
- **WHEN** an effect changes firing, speed, or damage handling
- **THEN** those changes are computed on the server (clients cannot self-grant effects)

### Requirement: Defined powerup set
The game SHALL provide these powerups: **Spread shot** (fires three bullets in a spread), **Rapid fire** (reduced fire cooldown), **Shield** (absorbs a limited number of hits before HP is affected), **Afterburner** (increased speed), **Repair** (instantly restores health), and **Homing missiles** (fired shots steer toward the nearest enemy).

#### Scenario: Each powerup behaves as described
- **WHEN** a player holds a given powerup from the set
- **THEN** firing, movement, durability, health, or projectile behavior changes according to that powerup's definition

### Requirement: Active powerup is shown to the player
The client SHALL show the local player's active powerup and its remaining time, and SHALL visually distinguish affected planes (e.g., a shield bubble) and special projectiles (homing).

#### Scenario: HUD reflects active powerup
- **WHEN** the local player has a timed powerup active
- **THEN** the HUD shows its icon and remaining time, clearing when it expires

#### Scenario: Shield is visible
- **WHEN** a plane has an active shield
- **THEN** a shield visual is shown around that plane until the shield is depleted
