## ADDED Requirements

### Requirement: Bounded simulation timestep
The authoritative server SHALL bound the per-tick delta time so a single long frame (GC pause, CPU stall) cannot integrate an unrealistically large step. Collision detection SHALL remain correct regardless of step size.

#### Scenario: Server hitch
- **WHEN** a server frame takes far longer than the normal tick interval
- **THEN** the simulation advances by a clamped delta and fast projectiles do not tunnel through targets (a hit that geometrically occurs is still registered)

### Requirement: All client input is validated as finite
The server SHALL treat any non-finite input value (NaN, Infinity) as neutral, so a crafted message cannot poison a player's position/heading or the shared state broadcast to the room.

#### Scenario: NaN input rejected
- **WHEN** a client sends a non-finite turn (or any non-finite numeric input)
- **THEN** the server substitutes a safe neutral value and the player's synchronized position/heading remain valid for everyone in the room

### Requirement: Message handlers are rate-limited
The server SHALL limit how frequently a single client's messages are processed, so one client cannot flood the shared event loop and degrade every room on the server.

#### Scenario: Message flood
- **WHEN** a client sends messages far faster than legitimate play requires
- **THEN** excess messages are dropped or throttled and other players are unaffected

### Requirement: Sane bot/human population
The server SHALL keep the arena populated to a floor with bots and SHALL release a bot as each human joins, rather than only releasing bots when the room is completely full.

#### Scenario: Human joins a bot-filled arena
- **WHEN** the arena is at its bot floor and a human joins
- **THEN** a bot leaves so the arena does not over-fill above the intended population

### Requirement: Freshly spawned players are protected
On spawn/respawn the server SHALL grant a brief protection window and/or place the player clear of immediate threats, so a player cannot be killed at the instant of re-entry.

#### Scenario: Respawn into danger
- **WHEN** a player respawns near live bullets or enemies
- **THEN** they are briefly invulnerable and/or placed clear, preventing an instant respawn-kill

### Requirement: Combat is confined to the playing phase
The server SHALL only apply scoreable combat (firing damage, kills, score, kill-feed) while the round is in the playing phase, not during intermission.

#### Scenario: Intermission is not live
- **WHEN** the round is in intermission
- **THEN** no new kills are scored or broadcast that would be wiped at round start
