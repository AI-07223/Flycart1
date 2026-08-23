## ADDED Requirements

### Requirement: Sampled sound effects
The game SHALL play real sampled (Kenney CC0) sound effects for engine, gunfire, explosions, taking a hit, scoring a kill, and UI actions, replacing the synthesized audio. All audio assets MUST be self-hosted (no CDN).

#### Scenario: Gunfire plays on fire
- **WHEN** the local player fires
- **THEN** a sampled gunshot effect plays with low latency

#### Scenario: Kill jingle plays on kill
- **WHEN** the local player scores a kill
- **THEN** a celebratory kill jingle plays

### Requirement: Background music
The game SHALL loop an upbeat arcade music track during play from a self-hosted asset.

#### Scenario: Music loops during play
- **WHEN** a match is in progress and audio is unmuted
- **THEN** the music plays and loops seamlessly

### Requirement: Mute and volume control
Players SHALL be able to mute/unmute and adjust volume (a master control plus at least separate music and sfx levels), and the setting MUST persist across sessions.

#### Scenario: Mute toggles all audio
- **WHEN** the player toggles mute
- **THEN** all audio stops, and on unmute it resumes, with the choice persisted on reload

#### Scenario: Volume change applies
- **WHEN** the player lowers the volume
- **THEN** subsequently played sounds are quieter

### Requirement: Gesture unlock and graceful loading
Audio SHALL initialize on a user gesture to satisfy autoplay policies, and the game MUST remain playable if an audio asset fails to load.

#### Scenario: Audio unlocks on first interaction
- **WHEN** the player first clicks Play
- **THEN** the audio context unlocks and sound begins

#### Scenario: Missing asset does not break the game
- **WHEN** a sound asset fails to load
- **THEN** the game continues running without error
