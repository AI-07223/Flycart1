## ADDED Requirements

### Requirement: Server and client share types from src/shared
The client TypeScript source SHALL import types and constants from `src/shared/` rather than duplicating them.

#### Scenario: Constants are shared
- **WHEN** the client code references `CRUISE_SPEED` or `BULLET_DAMAGE`
- **THEN** it imports from `src/shared/constants.ts` (the single source of truth)
- **AND** no manual constant duplication exists

#### Scenario: Vec3 type is shared
- **WHEN** client code uses 3D vector operations
- **THEN** it uses the `Vec3` type from `src/shared/sphere.ts`
- **AND** the sphere functions are available as typed imports

### Requirement: Ambient type declarations for browser globals
A `globals.d.ts` file SHALL declare types for `window.GAME`, `window.Sphere`, `window.Quality`, `window.Render3D`, and other browser globals used by the client.

#### Scenario: Window globals are typed
- **WHEN** client code accesses `window.GAME.CRUISE_SPEED`
- **THEN** TypeScript resolves the type from the shared constants module
- **AND** autocomplete and type checking work correctly
