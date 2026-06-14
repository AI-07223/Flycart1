## 1. Setup

- [x] 1.1 Create `public/js/render/` directory

## 2. Extract Modules

- [x] 2.1 Extract `planet.js` — terrain mesh, obstacle meshes, skybox, water plane
- [x] 2.2 Extract `effects.js` — explosions, puffs, particle update loop
- [x] 2.3 Extract `minimap.js` — 2D minimap drawing

## 3. Assemble Renderer

- [x] 3.1 Create `index.js` with Renderer class composing all modules
- [x] 3.2 Expose `window.Renderer` with same public API

## 4. Wire Up

- [x] 4.1 Update `index.html` to load render modules before `index.js`
- [x] 4.2 Delete old `render3d.js`

## 5. Verification

- [x] 5.1 Build passes, tests pass
