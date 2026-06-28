## ADDED Requirements

### Requirement: Network-scoped room directory

The signaling broker SHALL maintain a directory of open local rooms, each with a room name, host call sign, and current player count, keyed to the host's public IP. On a `list` request the broker SHALL return only rooms that are open, have a live host, are not full, and share the requester's public IP. Public IP SHALL be derived from the upgrade request (X-Forwarded-For first hop when behind the proxy, falling back to the socket remote address).

#### Scenario: Guest lists rooms on their network

- **WHEN** a guest on the same hotspot as a host sends a `list` request
- **THEN** the broker returns that host's room with its name, host call sign, and player count

#### Scenario: Rooms on other networks are hidden

- **WHEN** a guest sends a `list` request and a room exists whose host has a different public IP
- **THEN** that room is NOT included in the response

#### Scenario: Full or hostless rooms are excluded

- **WHEN** a room is full (at capacity) or has no live host
- **THEN** it is omitted from the `list` response

### Requirement: Create a named continuous-FFA local room

A host SHALL be able to create a local room by giving it a name (with a sensible random default) and immediately enter a continuous free-for-all match with no lobby ready-up gate. The room name SHALL be registered with the broker and shown prominently to the host after creation.

#### Scenario: Host creates and sees the room name

- **WHEN** the host enters a name and taps Create Room
- **THEN** a continuous FFA match starts and the room name is displayed prominently to the host

#### Scenario: No ready-up gate

- **WHEN** the host creates the room
- **THEN** the match is live immediately without waiting for other players to ready up

### Requirement: Scan and join by tapping

Guests SHALL be able to scan for rooms on their network and join one by tapping it, without typing a code. The room name SHALL be shown on join so the guest can verify the room. An empty result SHALL show a clear hint, and a re-scan SHALL be available.

#### Scenario: Tap to join

- **WHEN** a guest taps a room in the scanned list
- **THEN** the client joins that room via the existing peer-to-peer path and the room name is shown

#### Scenario: Empty list hint

- **WHEN** a scan returns no rooms
- **THEN** the guest sees a hint to ensure they are on the host's hotspot, and can re-scan

### Requirement: Free join and leave during continuous play

Players SHALL be able to join and leave a local room at any time while the match continues. A guest joining mid-match SHALL spawn into the running game; a player leaving SHALL not end the match for others (host departure triggers the existing host migration).

#### Scenario: Late join spawns into the running match

- **WHEN** a guest joins a room whose match is already in progress
- **THEN** the guest spawns into the running FFA without interrupting other players

#### Scenario: Leaving keeps the match alive

- **WHEN** a non-host player leaves
- **THEN** the match continues for everyone else

### Requirement: Connection reliability

The WebRTC peer connections SHALL be configured with at least one public STUN server so peers can connect across typical NATs; same-LAN peers SHALL still connect via local candidates.

#### Scenario: STUN configured

- **WHEN** a peer connection is created
- **THEN** its ICE configuration includes a public STUN server
