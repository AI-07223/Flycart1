## ADDED Requirements

### Requirement: Players can edit a persistent plane loadout
The client SHALL let the player configure a cosmetic plane loadout consisting of airframe, primary color, accent color, livery, and trail, and SHALL persist that loadout between sessions without changing gameplay balance.

#### Scenario: Returning player sees saved loadout
- **WHEN** a player reopens the game after previously saving cosmetic selections
- **THEN** the same loadout is restored for menu preview and future match entry

#### Scenario: Loadout affects visual identity only
- **WHEN** a player joins or hosts a match with a selected loadout
- **THEN** the selected cosmetic values are used for that plane and no gameplay stats, damage values, or flight behavior change

### Requirement: Customization provides live preview and readable summary
The customization experience SHALL show a large live aircraft preview and a readable summary of the current loadout so the player can understand what they have selected before launching.

#### Scenario: Player changes a cosmetic option
- **WHEN** the player changes airframe, paint, accent, livery, or trail
- **THEN** the preview updates immediately and the loadout summary reflects the new selection

#### Scenario: Selected plane stays visible before match entry
- **WHEN** the player returns to the preflight surface after customizing
- **THEN** the selected plane and its current loadout summary remain visible without reopening customization

### Requirement: Players can save, randomize, and reset cosmetic presets
The client SHALL provide preset slots plus randomize and reset actions so players can create, recover, and switch looks quickly.

#### Scenario: Save and reuse a preset
- **WHEN** the player saves the current loadout into a preset slot and later applies that slot
- **THEN** the full saved loadout is restored

#### Scenario: Reset or randomize loadout
- **WHEN** the player chooses reset or randomize
- **THEN** the loadout changes immediately to the default or a valid random combination and remains editable before launch
