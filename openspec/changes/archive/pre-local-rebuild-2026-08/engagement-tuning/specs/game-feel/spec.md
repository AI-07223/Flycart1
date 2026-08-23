## ADDED Requirements

### Requirement: Steering matches input direction

Steering input SHALL turn the plane in the matching direction on every input source (keyboard, touch arrows, gyro tilt): a "right" input turns the plane right and "left" turns it left. The local (predicted) turn direction MUST match the authoritative server turn (no fight/rubber-band), and the plane's bank MUST lean into the turn.

#### Scenario: Right input turns right

- **WHEN** the player gives a right steering input (in landscape, via any input source)
- **THEN** the plane curves to the player's right and banks right, and the predicted motion matches the server

#### Scenario: Left input turns left

- **WHEN** the player gives a left steering input
- **THEN** the plane curves to the player's left and banks left

### Requirement: Enemy motion stays within the human trackable band

Plane speeds SHALL be tuned so that typical engagement motion (including head-on closing) stays within the range a human can smoothly track, leaving a usable reaction window before contact. Faster (boost) motion MAY exceed the steady-aim band briefly but MUST remain a short, deliberate burst.

#### Scenario: Cruising enemies are trackable

- **WHEN** two planes approach at cruise speed
- **THEN** their relative on-screen motion is slow enough to follow by eye and react to (a reaction window on the order of ~1.5s, not a fraction of a second)

#### Scenario: Boost is a brief burst

- **WHEN** a plane boosts
- **THEN** it is noticeably faster but boost is short-lived, not a sustained state

### Requirement: Flatter view without changing play size

The world SHALL be presentable with a flatter horizon and a wider field of view while the **gameplay** (movement speed, world size, encounter distances) remains unchanged. The visual presentation radius MAY be decoupled from the gameplay radius for this purpose.

#### Scenario: Flatter horizon, same play

- **WHEN** the flatter presentation is applied
- **THEN** the horizon curves more gently and the player sees further, while flight speed, world size and encounter cadence feel identical to before

#### Scenario: Field of view stays comfortable

- **WHEN** the field of view is widened
- **THEN** it stays within a comfortable range (no fisheye distortion or motion discomfort, especially on phones)

### Requirement: Minimap has low attention cost

The minimap SHALL be sized and styled so it does not obstruct play: smaller, semi-transparent when idle, kept in a corner clear of safe-area insets, and emphasised only when relevant (e.g., a nearby threat).

#### Scenario: Minimap stays out of the way

- **WHEN** the player is flying with no immediate threat
- **THEN** the minimap is small and unobtrusive (does not dominate the screen)

#### Scenario: Minimap draws attention on threat

- **WHEN** an enemy is within engagement range
- **THEN** the minimap emphasises that (e.g., brightens) so the player can glance and react
