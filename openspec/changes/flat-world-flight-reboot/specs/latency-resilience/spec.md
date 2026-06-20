## ADDED Requirements

### Requirement: Local flight remains responsive under network delay
The client SHALL predict local flat-world 3D movement so the player's plane responds immediately to steering, climb, dive, boost, and fire inputs. Reconciliation with authoritative server state SHALL be bounded and SHALL avoid large visible snaps during ordinary latency.

#### Scenario: Local input responds before the next snapshot
- **WHEN** the player changes steering or altitude input
- **THEN** the local plane responds immediately on the client instead of waiting for the next server patch

#### Scenario: Reconciliation avoids hard snaps
- **WHEN** the next authoritative snapshot differs from the local prediction by a normal latency-sized amount
- **THEN** the client corrects toward server truth without a large single-frame teleport

### Requirement: Remote entities degrade gracefully under jitter
Remote players, projectiles, and pickups SHALL use interpolation and bounded extrapolation suitable for slower 3D combat. Packet delay or jitter SHALL not cause immediate freeze-then-snap behavior or invalid altitude jumps.

#### Scenario: Remote player stays stable during packet jitter
- **WHEN** one or more snapshots arrive late but the connection is still live
- **THEN** remote movement remains smooth within a bounded tolerance rather than freezing abruptly and snapping across the screen

#### Scenario: Remote altitude remains coherent
- **WHEN** a remote player climbs or dives while packets are delayed
- **THEN** their rendered altitude changes smoothly and does not oscillate between impossible vertical positions

### Requirement: Projectile handling is latency-aware
Projectile presentation SHALL account for the slower flat-world 3D pace and SHALL remain believable under moderate latency. The client SHALL NOT invent trajectories that materially disagree with authoritative projectile state.

#### Scenario: Projectile render does not warp
- **WHEN** projectile snapshots are delayed briefly
- **THEN** the client advances or holds them within a bounded window that preserves believable motion instead of producing extreme jumps

#### Scenario: Projectile cleanup avoids ghosts
- **WHEN** the server despawns a projectile due to hit or expiry
- **THEN** the client removes it without showing a lingering ghost projectile traveling through empty space

### Requirement: Connection loss is explicit and recoverable
The client SHALL detect loss of the match connection and SHALL move into a clear recovery state rather than continuing to render stale combat as if it were live. The player SHALL have a direct path to reconnect or return to the menu.

#### Scenario: Disconnect surfaces a recovery state
- **WHEN** the active room closes or the transport errors
- **THEN** the client shows a connection-lost state and stops treating stale simulation data as live gameplay

#### Scenario: Recovery path returns the player to usable state
- **WHEN** the player chooses reconnect or return to menu after a disconnect
- **THEN** the client either resumes the session cleanly or restores a usable menu without requiring a full page reload

### Requirement: Server cadence and validation support latency resilience
The server SHALL validate inputs, bound its timestep behavior, and publish snapshots at a cadence compatible with the slower 3D flight model. Invalid or bursty client inputs SHALL NOT destabilize shared simulation.

#### Scenario: Invalid input does not corrupt the match
- **WHEN** a client sends non-finite or out-of-range movement input
- **THEN** the server rejects or clamps the values and keeps the shared simulation stable

#### Scenario: Simulation remains stable across frame hitches
- **WHEN** the server experiences a long frame or scheduling hitch
- **THEN** movement and projectile processing stay bounded so one delayed tick does not create extreme jump distance or obvious missed collisions
