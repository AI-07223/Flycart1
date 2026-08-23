## ADDED Requirements

### Requirement: Detect and surface connection loss
The client SHALL detect loss of the server connection (room leave or socket error) and SHALL present a recovery UI instead of continuing to render a frozen world. The game loop SHALL stop treating stale state as live once the connection is lost.

#### Scenario: Server restarts or socket drops
- **WHEN** the WebSocket to the server closes for any reason (redeploy, room disposal, network change)
- **THEN** the client shows a "connection lost" message and stops the active playing loop rather than freezing silently

#### Scenario: Recovery path exists
- **WHEN** the connection-lost state is shown
- **THEN** the player is offered a way to reconnect or return to the menu, and choosing it restores a usable start screen

### Requirement: Clean state transition back to menu
The client SHALL provide a single transition that leaves the current match, releases the room, and resets per-session UI/audio flags, so that menu/playing/lost states are well defined and re-enterable.

#### Scenario: Leaving a match
- **WHEN** the player disconnects, the match ends, or the player chooses to leave
- **THEN** the room reference is released, session flags are reset, and the start screen is shown again without a page reload

### Requirement: Pausing or backgrounding parks input
When the local player pauses, switches away from the tab, or otherwise stops actively playing, the client SHALL send a neutral input to the server so the plane stops actively steering/firing, and the UI SHALL NOT imply the simulation is frozen when it is not.

#### Scenario: Pause does not silently fly the plane
- **WHEN** the player pauses or backgrounds the app
- **THEN** the server receives a neutral input (no turn, no boost, no fire) and the UI reflects that the plane is still in the world, not that the game is stopped

### Requirement: Audio follows the connection lifecycle
Looping audio (music, engine) SHALL stop or suspend when the connection is lost or the tab is hidden, and resume appropriately on return.

#### Scenario: No audio over a dead game
- **WHEN** the connection is lost or the tab is hidden
- **THEN** looping music and engine sound stop or the audio context is suspended
