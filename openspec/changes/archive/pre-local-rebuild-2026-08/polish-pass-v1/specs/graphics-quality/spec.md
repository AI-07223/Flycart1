## ADDED Requirements

### Requirement: Selectable quality tiers
The game SHALL offer Low / Med / High graphics tiers that control pixel-ratio cap, bloom, shadow type/resolution, and particle and decor density. The selected tier MUST persist across sessions.

#### Scenario: Player changes quality
- **WHEN** the player selects a different quality tier
- **THEN** rendering updates to match that tier and the choice persists on reload

### Requirement: Sensible default tier by device
On first run, the game SHALL choose a starting quality tier using a device heuristic (e.g., device memory, mobile user agent, initial pixel ratio).

#### Scenario: Conservative default on weak device
- **WHEN** a low-memory or mobile device loads the game for the first time
- **THEN** a conservative quality tier is selected by default

### Requirement: Adaptive downscaling
The game SHALL monitor frame rate and automatically lower the quality tier when frame rate stays low for a sustained period; it MUST NOT automatically raise the tier (to avoid oscillation).

#### Scenario: Auto-downscale under load
- **WHEN** the average frame rate stays below roughly 45 fps for a sustained period
- **THEN** the game lowers the quality by one step

#### Scenario: No automatic upscaling
- **WHEN** frame rate recovers after an automatic downscale
- **THEN** the game does not automatically raise the quality tier
