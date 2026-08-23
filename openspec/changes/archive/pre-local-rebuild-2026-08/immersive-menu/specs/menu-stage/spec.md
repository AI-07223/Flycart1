## ADDED Requirements

### Requirement: The menu is a 3D scene on the planet

The menu SHALL be presented as a live 3D scene set on the game planet (a "home base" region) with a cinematic camera, rather than flat panels over a static background. The player's plane and the home-base structures SHALL be part of that scene.

#### Scenario: Menu shows the living world

- **WHEN** the menu is displayed
- **THEN** the camera shows the planet/home base in motion (a slow cinematic orbit), not a static flat backdrop

### Requirement: Seamless menu-to-game handoff

Starting a match from the menu SHALL transition the camera continuously into gameplay (a takeoff/dive that hands off to the in-game chase camera) rather than a hard screen cut.

#### Scenario: Quick Play takes off

- **WHEN** the player starts Quick Play
- **THEN** the camera transitions smoothly from the menu framing into the in-game view as the match begins (no abrupt screen swap)

### Requirement: 3D panels keep text and inputs usable

Menu panels SHALL be presented in the 3D scene (transformed with the camera) while their text stays crisp and their inputs remain real, usable form controls. Text entry (callsign, room code) and sliders MUST remain typeable/operable — not simulated by clicking 3D geometry.

#### Scenario: Typing in an immersive panel

- **WHEN** the player edits their callsign or a room code in a menu panel
- **THEN** it is a real text field they can type into, even though the panel is presented within the 3D scene

#### Scenario: Panels read as part of the scene

- **WHEN** the camera moves between sections
- **THEN** the panels move/orient with the scene (spatial), not as a flat fixed overlay

### Requirement: Spatial navigation via hotspots

The player SHALL be able to navigate menu sections by selecting their 3D structures (tap/click), in addition to any on-panel buttons.

#### Scenario: Tap a structure to open a section

- **WHEN** the player taps/clicks a home-base structure (e.g., the hangar)
- **THEN** the camera focuses it and the corresponding section opens

### Requirement: Performant and non-regressing

The 3D menu SHALL respect the graphics quality tiers (simpler on low tier), work in landscape, and MUST NOT regress the existing startup or the ability to start a match.

#### Scenario: Quick Play still works

- **WHEN** the player starts a match from the 3D menu on any supported device
- **THEN** the game connects and starts as before (the 3D presentation does not break the flow)

#### Scenario: Smooth on low tier

- **WHEN** the menu runs on a low graphics tier / weaker device
- **THEN** it uses a simpler presentation that stays smooth
