## ADDED Requirements

### Requirement: Controls placed for two-thumb landscape reach

On-screen controls SHALL be placed in the bottom corners within natural thumb reach: the primary action (fire) largest in the bottom-right, boost adjacent to it (same thumb, minimal travel), steering in the bottom-left, with the screen center kept clear. Controls SHALL respect safe-area insets and meet a minimum touch-target size.

#### Scenario: Reachable, non-obstructing controls

- **WHEN** the player holds the device in landscape with two hands
- **THEN** fire (largest) and boost fall under the right thumb, steering under the left thumb, the center stays clear of controls, and nothing is clipped by a notch/home indicator

### Requirement: Controls are latency-safe

Action inputs SHALL be handled with immediate (DOM pointer) events; a press MUST take effect without waiting on any 3D raycast or render step. Depth styling MUST NOT add input latency.

#### Scenario: Instant fire

- **WHEN** the player taps fire
- **THEN** the shot input registers immediately (no perceptible delay from the control layer)

### Requirement: Tactile press feedback

Pressing a control SHALL give immediate feedback driven by the actual pressed-state (not CSS `:active`): a visible depress plus glow, and a haptic pulse where the device supports it; releasing springs back. Where haptics are unsupported, the visual feedback still applies.

#### Scenario: Button confirms a press

- **WHEN** the player presses a control
- **THEN** it visibly depresses/glows immediately and (on supported devices) gives a short haptic pulse; on release it returns to rest

#### Scenario: Multitouch press

- **WHEN** the player presses steering and fire at the same time
- **THEN** both controls register and give feedback independently

### Requirement: Controls reflect game state

Controls SHALL visually reflect relevant game state: the fire control reacts to actual shots (recoil per shot, dimmed during cooldown so rapid-fire reads), the boost control glows while boosting, and the active-powerup color tints the relevant control.

#### Scenario: Fire reads the cadence

- **WHEN** the player fires (including rapid-fire)
- **THEN** the fire control recoils per shot and dims during cooldown, matching the actual fire rate

#### Scenario: Boost shows engagement

- **WHEN** boost is held
- **THEN** the boost control glows/pulses while the afterburner is active

### Requirement: Virtual thumbstick steering option

The steering-mode setting SHALL offer a virtual thumbstick (in addition to arrows and tilt): dragging it left/right produces an analog turn with a centre dead-zone, recentring on release.

#### Scenario: Analog steering via stick

- **WHEN** the player selects the thumbstick steering mode and drags it
- **THEN** the plane turns proportionally to the drag (full deflection = full turn), and recenters to straight when released
