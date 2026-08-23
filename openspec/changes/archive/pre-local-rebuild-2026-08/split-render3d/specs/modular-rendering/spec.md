## MODIFIED Requirements

### Requirement: Rendering is split into focused modules
The monolithic `render3d.js` SHALL be replaced by a set of focused modules under `public/js/render/`, each with a single responsibility.

#### Scenario: Module structure
- **WHEN** the `public/js/render/` directory is examined
- **THEN** it contains: `planet.js`, `planes.js`, `effects.js`, `camera.js`, `minimap.js`, `hud.js`, `index.js`
- **AND** no file exceeds 200 lines

#### Scenario: Public API unchanged
- **WHEN** `main.js` accesses `window.Render3D`
- **THEN** the object has the same methods: `init(canvas)`, `resize()`, `sync(state, dt, myId)`, `draw(state, myId)`
- **AND** behavior is identical to the original monolithic file

#### Scenario: Shared state accessible
- **WHEN** any module function needs scene, camera, renderer, or particles
- **THEN** it receives them via the renderer instance (no global state)

### Requirement: No visual regression
The refactored rendering SHALL produce identical output to the original.

#### Scenario: Visual comparison
- **WHEN** the game is loaded before and after the refactor
- **THEN** the rendered scene looks identical (same terrain, planes, effects, minimap)
