## ADDED Requirements

### Requirement: Players can target a LAN-hosted server
The client SHALL allow the player to enter a LAN server origin and SHALL use that origin for match connections instead of the current page origin when LAN mode is chosen.

#### Scenario: Joining a hotspot-hosted server
- **WHEN** the player enters a valid LAN server origin and starts a LAN match
- **THEN** the client connects to the specified server for room creation or join

### Requirement: LAN settings persist and share cleanly
The client SHALL remember the last LAN server origin locally and SHALL include the active LAN server and room code in generated invite links.

#### Scenario: Sharing a LAN room
- **WHEN** a player starts a friend room while connected to a LAN server
- **THEN** the generated invite link preserves both the room code and the LAN server origin

### Requirement: Private room invites are scannable
The client SHALL present a QR code for private room invites, and that QR code SHALL encode the same effective invite URL shown in the share UI so scanned joins preserve the selected server origin.

#### Scenario: Scanning a LAN room invite
- **WHEN** the host opens the invite QR for a private room running on a LAN server
- **THEN** another device scanning the code opens the same room on that same LAN server without manually typing the address or room code

### Requirement: Browser transport limits are explained before failure
The client SHALL detect unsupported secure-to-insecure LAN connection combinations and SHALL present a clear message explaining how to use hotspot hosting correctly.

#### Scenario: HTTPS page tries to use an insecure hotspot server
- **WHEN** the player enters an `http://` or `ws://` LAN origin from a secure `https://` page
- **THEN** the client blocks the attempt and explains that the game should be opened from the LAN host or from a secure LAN endpoint
