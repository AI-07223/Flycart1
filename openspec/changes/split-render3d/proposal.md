## Why

`public/js/render3d.js` is a 700-line IIFE containing all 3D rendering logic — scene setup, terrain, plane meshes, effects, camera, minimap, and HUD. Everything shares closure variables (scene, camera, renderer, particles array). This makes the file hard to navigate, hard to change one system without risking another, and impossible to test individual rendering functions. Splitting into focused modules makes each piece independently understandable and modifiable.

## What Changes

- **Refactor the IIFE into a `Renderer` class** that holds shared state (scene, camera, renderer, particles) as instance properties
- **Extract into focused modules** under `public/js/render/`:
  - `planet.js` — terrain mesh, obstacle meshes, skybox, water
  - `planes.js` — plane mesh construction (`_seat`), orientation, skins
  - `effects.js` — explosions, puffs, spark particles
  - `camera.js` — camera rig, shake, FOV, follow logic
  - `minimap.js` — 2D minimap overlay
  - `hud.js` — popup damage/score numbers
  - `index.js` — main Renderer class that composes the above

## Capabilities

### New Capabilities
- `modular-rendering`: rendering code split into focused, navigable modules

### Modified Capabilities
(No existing specs modified — this is a refactor, not a behavior change)

## Impact

- `public/js/render3d.js` — deleted (replaced by modules)
- `public/js/render/index.js` — new: main Renderer class
- `public/js/render/planet.js` — new: terrain + obstacles + skybox
- `public/js/render/planes.js` — new: plane mesh construction + orientation
- `public/js/render/effects.js` — new: particle effects
- `public/js/render/camera.js` — new: camera rig
- `public/js/render/minimap.js` — new: minimap rendering
- `public/js/render/hud.js` — new: popup numbers
- `public/js/main.js` — update import from `render3d.js` to `render/index.js`
- No behavior changes — purely structural refactor
