## Context

The SmashCart client is 1874 lines of vanilla JavaScript across 9 files in `public/js/`. It uses IIFE + `window.*` globals — no ES modules, no bundler, no type checking. The server is TypeScript with shared types in `src/shared/`. The client loads via `<script>` tags with an import map for Three.js.

## Goals / Non-Goals

**Goals:**
- Type-check the client code at build time
- Share types between server and client (constants, Vec3, state schema)
- Incremental migration — one file at a time, no big bang
- Keep the existing IIFE + window.* runtime pattern
- Fast build (<2s for all client files)

**Non-Goals:**
- Switching to ES modules or a bundler (Vite/Webpack) — too much churn
- Adding a framework (React, etc.) — the game renders with Three.js directly
- 100% TypeScript coverage in the first pass — start with high-value files

## Decisions

### 1. esbuild for client compilation

esbuild is already a dependency (used by gen-constants.mjs). It compiles TS→JS in milliseconds and can output IIFE-wrapped files that match the current pattern. No new tooling needed.

### 2. Separate tsconfig.client.json

The client runs in a browser (needs `DOM`, `ES2020` lib) but doesn't need Colyseus server types. A separate tsconfig prevents conflicts with the server tsconfig.

### 3. Incremental migration order

| Order | File | Why first | Effort |
|-------|------|-----------|--------|
| 1 | `constants.ts` | Already auto-generated — becomes the source. Eliminates gen-constants step. | Low |
| 2 | `net.ts` | Colyseus client state sync — most type-sensitive (state schema access). | Medium |
| 3 | `input.ts` | Input handling — typed message payloads. | Low |
| 4 | `main.ts` | Game loop — orchestrates everything, benefits from typed imports. | Medium |
| 5 | `quality.ts` | Small, simple. | Low |
| 6 | `audio.ts` | Small, simple. | Low |
| 7 | `sphere.ts` | Mirror of server sphere — becomes a re-export or shared import. | Low |
| 8 | `assets.ts` | Small, simple. | Low |
| 9 | `render3d.js` | Skip for now — depends on split-render3d change landing first. | Deferred |

### 4. Handling window.* globals

TypeScript doesn't know about `window.GAME`, `window.Sphere`, etc. Define ambient declarations in `src/client/globals.d.ts`.

### 5. Eliminating gen-constants step

Once `constants.ts` is the client source, the gen-constants.mjs script is no longer needed. esbuild compiles constants.ts directly to `public/js/constants.js` (as an IIFE that assigns to window).

## Risks / Trade-offs

- **Type errors on first pass**: The existing code likely has implicit `any` types everywhere. Start with `strict: false` and tighten incrementally.
- **Two tsconfigs**: Having separate server and client tsconfigs adds complexity. The build script handles which to use.
- **Depends on split-render3d**: The largest file (render3d.js) should be split before migrating to TS, otherwise it's a 700-line TS file.

## Migration Plan

1. Create `tsconfig.client.json`
2. Create `src/client/globals.d.ts` with ambient type declarations
3. Create `scripts/build-client.mjs`
4. Migrate constants.ts (eliminate gen-constants.mjs)
5. Migrate net.ts, input.ts, main.ts
6. Migrate remaining small files
7. Update `npm run build` to include client compilation
8. Delete old `public/js/*.js` (now generated)
