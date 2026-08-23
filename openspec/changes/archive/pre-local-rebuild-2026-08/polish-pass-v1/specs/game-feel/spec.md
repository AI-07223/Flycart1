## ADDED Requirements

### Requirement: Speed-sensing chase camera
The chase camera SHALL widen its field of view while the local player is boosting and return to normal afterward, to convey speed.

#### Scenario: FOV kick on boost
- **WHEN** the local player boosts
- **THEN** the camera field of view widens, and narrows back when boosting ends

### Requirement: Damage feedback
On taking damage, the view SHALL react with a brief dip/shake and a red damage vignette; while the local player's health is low, a pulse SHALL be shown.

#### Scenario: Hit reaction
- **WHEN** the local player takes a hit
- **THEN** a brief camera dip/shake and a red vignette occur

#### Scenario: Low-health pulse
- **WHEN** the local player's health is below 30 and they are alive
- **THEN** a low-health pulse is shown until they heal or respawn

### Requirement: Hit-stop on kills
When the local player scores a kill, the game SHALL apply a brief hit-stop (no longer than ~90 ms) that affects only local camera and particle timing — never input handling or remote-entity interpolation.

#### Scenario: Kill hit-stop
- **WHEN** the local player scores a kill
- **THEN** a brief freeze-frame emphasis occurs and normal motion resumes shortly after

### Requirement: Score popups and streak callouts
On a kill, the game SHALL show a squash/stretch "+1 SMASH!" popup over the killer, and SHALL show a combo / kill-streak callout when the local player scores multiple kills in quick succession.

#### Scenario: Score popup
- **WHEN** a kill occurs
- **THEN** a "+1 SMASH!" popup animates over the killer and fades

#### Scenario: Streak callout
- **WHEN** the local player scores two or more kills within a short time window
- **THEN** a streak callout (e.g., "DOUBLE SMASH!") is displayed
