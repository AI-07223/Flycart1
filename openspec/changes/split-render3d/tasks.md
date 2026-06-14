## 1. Setup

- [ ] 1.1 Create `public/js/render/` directory

## 2. Extract Modules

- [ ] 2.1 Extract `planet.js` — terrain mesh, obstacle meshes, skybox, water plane
- [ ] 2.2 Extract `planes.js` — `_seat()` plane construction, `_orient()`, skin colors
- [ ] 2.3 Extract `effects.js` — `_explode()`, `_puff()`, particle update loop
- [ ] 2.4 Extract `camera.js` — camera rig, shake, FOV, follow logic
- [ ] 2.5 Extract `minimap.js` — 2D minimap drawing
- [ ] 2.6 Extract `hud.js` — popup damage/score numbers

## 3. Assemble Renderer

- [ ] 3.1 Create `index.js` with Renderer class composing all modules
- [ ] 3.2 Expose `window.Render3D = new Renderer()` with same public API

## 4. Wire Up

- [ ] 4.1 Update `index.html` to load render modules before `index.js`
- [ ] 4.2 Update `main.js` import if needed (API should be identical)
- [ ] 4.3 Delete old `render3d.js`

## 5. Verification

- [ ] 5.1 Load game in browser — verify rendering looks identical
- [ ] 5.2 Verify no console errors on load
- [ ] 5.3 Verify all features work: planes, bullets, effects, minimap, HUD popups
