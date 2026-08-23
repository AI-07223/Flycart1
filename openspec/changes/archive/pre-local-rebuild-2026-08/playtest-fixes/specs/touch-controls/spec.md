## ADDED Requirements

### Requirement: Concurrent multitouch on-screen controls

On touch devices, the on-screen control surfaces (d-pad direction buttons, fire, and boost) SHALL each track their own pointer so that steering, firing, and boosting register simultaneously. Pressing one control MUST NOT cancel or release another control that is still held.

#### Scenario: Steer and fire at the same time

- **WHEN** the player holds a d-pad direction button and presses fire with a second finger
- **THEN** the input state reports both the steering direction and fire as active for as long as both are held

#### Scenario: Releasing one button keeps the other held

- **WHEN** the player holds steer + boost and lifts only the boost finger
- **THEN** boost clears and the steering input remains active until its own finger lifts

#### Scenario: Joystick scheme remains single-stick multitouch-safe

- **WHEN** the player uses the joystick control scheme and a second finger touches a fire/boost button
- **THEN** the joystick continues tracking its original touch identifier and the second button registers independently

### Requirement: Consistent steering handedness across schemes

All control schemes (d-pad, joystick, tilt) SHALL map a rightward input to a right (positive) turn, so handedness is consistent regardless of scheme. The `invertSteer` toggle SHALL flip the turn for every scheme.

#### Scenario: Drag-right turns right on joystick

- **WHEN** `invertSteer` is off and the player drags the joystick to the right
- **THEN** the reported turn has the same sign as pressing the d-pad right button

#### Scenario: Invert toggle flips all schemes

- **WHEN** `invertSteer` is on
- **THEN** every scheme reports the opposite turn sign from when it is off

### Requirement: Forced landscape orientation

On touch devices the app SHALL require landscape orientation at all times (menu and in-game). When the device is in portrait, a rotate-to-landscape overlay SHALL block interaction until the device is rotated to landscape. The app SHALL additionally attempt `screen.orientation.lock('landscape')` where supported, treating the overlay as the fallback where it is not (e.g. iOS Safari).

#### Scenario: Portrait on the menu is blocked

- **WHEN** a touch device loads the app in portrait orientation
- **THEN** the rotate-to-landscape overlay is shown over the menu and the menu is not interactable until landscape

#### Scenario: Rotating to landscape dismisses the overlay

- **WHEN** the device rotates from portrait to landscape
- **THEN** the rotate overlay is hidden and normal menu/game interaction resumes

#### Scenario: Desktop is unaffected

- **WHEN** a non-touch (keyboard) device loads the app
- **THEN** no rotate overlay is shown and orientation is never forced
