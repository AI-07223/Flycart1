## Context

`public/js/render3d.js` is a single IIFE that creates a `window.Render3D` object. All state (scene, camera, renderer, particles, geometries) lives in the IIFE closure. The returned object has methods: `init`, `resize`, `sync`, `draw`, `__debug`, plus private helpers `_seat`, `_orient`, `_spawn`, `_explode`, `_puff`.

The client uses ES module `<script type="module">` with import maps, but render3d.js itself uses the IIFE pattern (not ES modules). The other client files (`main.js`, `net.js`, `input.js`, etc.) also use IIFE + `window.*` globals.

## Goals / Non-Goals

**Goals:**
- Each module file is <200 lines and has a single responsibility
- Shared state (scene, camera, etc.) is accessible to all modules without globals
- The public API (`init`, `resize`, `sync`, `draw`) stays identical
- No behavior changes — same rendering, same performance

**Non-Goals:**
- Migrating to ES modules (the whole client uses IIFE + window globals — changing that is a separate effort)
- Adding TypeScript to the client
- Changing the rendering pipeline or visual quality

## Decisions

### 1. Renderer class with shared context

Convert the IIFE to a `Renderer` class. Shared state becomes instance properties. Each extracted module becomes a method group on the class or a helper that receives the renderer instance.

```js
class Renderer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.particles = [];
    // ... all shared state
  }
  init(canvas) { ... }
  resize() { ... }
  sync(state, dt, myId) { ... }
  draw(state, myId) { ... }
}
window.Render3D = new Renderer();
```

### 2. Module pattern via IIFE + window (matching existing codebase)

Since the rest of the client uses IIFE + `window.*`, the extracted modules will follow the same pattern. Each module file defines a `window.RenderXxx` namespace with helper functions that take the renderer instance as a parameter.

```js
// render/planet.js
window.RenderPlanet = {
  buildTerrain(renderer) { ... },
  buildObstacles(renderer) { ... },
  buildSkybox(renderer) { ... },
};
```

The main `render/index.js` loads after all modules and assembles them into the `Renderer` class.

### 3. Load order via script tags

Since the client uses `<script>` tags (not bundler), load order matters. The HTML will load modules first, then the main renderer:

```html
<script src="/js/render/planet.js"></script>
<script src="/js/render/planes.js"></script>
<script src="/js/render/effects.js"></script>
<script src="/js/render/camera.js"></script>
<script src="/js/render/minimap.js"></script>
<script src="/js/render/hud.js"></script>
<script src="/js/render/index.js"></script>
```

### 4. File responsibilities

| File | Lines (est.) | Responsibility |
|------|-------------|----------------|
| `planet.js` | ~120 | Terrain generation, obstacle meshes, skybox, water plane |
| `planes.js` | ~120 | `_seat()` plane construction, `_orient()`, skin colors |
| `effects.js` | ~60 | `_explode()`, `_puff()`, particle update loop |
| `camera.js` | ~60 | Camera rig, shake, FOV, follow logic |
| `minimap.js` | ~60 | 2D minimap drawing |
| `hud.js` | ~40 | Popup damage/score numbers |
| `index.js` | ~200 | Renderer class, `init`, `sync`, `draw` orchestration |

## Risks / Trade-offs

- **Load order fragility**: Script tag ordering is manual. A missing or misordered script breaks rendering silently. Mitigation: each module can check `window.RenderPlanet` exists before use, or add a guard in index.js.
- **No real encapsulation**: All modules share the renderer instance. This is intentional — matches the existing closure pattern, just reorganized.
- **Large refactor for no behavior change**: The risk of introducing visual bugs is real. Mitigation: visual regression testing by comparing screenshots before/after (manual or automated).

## Migration Plan

1. Create `public/js/render/` directory
2. Extract planet.js, planes.js, effects.js, camera.js, minimap.js, hud.js
3. Create index.js with Renderer class
4. Update index.html script tags
5. Update main.js to use new `window.Render3D` (same API)
6. Delete old render3d.js
7. Manual visual comparison (before/after screenshots)
