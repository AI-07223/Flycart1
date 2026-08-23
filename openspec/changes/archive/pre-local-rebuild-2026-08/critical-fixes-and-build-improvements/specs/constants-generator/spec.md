## ADDED Requirements

### Requirement: Client constants are generated from the server source of truth
A build script SHALL generate `public/js/constants.js` from `src/shared/constants.ts` so that gameplay values never drift between server and client.

#### Scenario: Build generates matching constants
- **WHEN** `npm run build` is executed
- **THEN** `public/js/constants.js` contains all gameplay-relevant constants matching the values in `src/shared/constants.ts`

#### Scenario: Generated file is idempotent
- **WHEN** the build runs twice without changing `constants.ts`
- **THEN** the generated `constants.js` is byte-identical both times

### Requirement: Manual edits to generated file are preserved until next build
The generated file SHALL include a header comment indicating it is auto-generated and should not be edited manually.

#### Scenario: Header warns developers
- **WHEN** a developer opens `public/js/constants.js`
- **THEN** the first line contains a comment stating the file is auto-generated and pointing to the source file

### Requirement: All steering modes persist across page reload
The client SHALL correctly persist and restore all three steering modes (arrows, stick, tilt) from localStorage.

#### Scenario: Stick mode survives reload
- **WHEN** the user selects "stick" steering mode and reloads the page
- **THEN** the stick steering mode is active on the next page load

#### Scenario: Tilt mode survives reload
- **WHEN** the user selects "tilt" steering mode and reloads the page
- **THEN** the tilt steering mode is active on the next page load
