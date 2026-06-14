## Why

The client is ~1900 lines of untyped vanilla JavaScript across 9 files. The server is TypeScript but the client has zero type checking — typos in property names, wrong argument counts, and type mismatches are only caught at runtime (or by players). Migrating to TypeScript catches these bugs at build time, enables IDE autocomplete, and makes the shared constants/types between server and client authoritative.

## What Changes

- **Add a client TypeScript build step** using esbuild (fast, already available as a dependency)
- **Create `src/client/` directory** as the TypeScript source for client code
- **Migrate files incrementally** — one at a time, starting with the highest-value targets:
  - `constants.ts` (already auto-generated, now becomes the source of truth)
  - `net.ts` (Colyseus client — typed state sync)
  - `input.ts` (input handling — typed messages)
  - `main.ts` (game loop — orchestrates everything)
  - Remaining files as follow-up
- **Keep the IIFE + `window.*` pattern** — esbuild wraps each file in an IIFE, output goes to `public/js/*.js`
- **Share types** between server and client via `src/shared/` (already exists for constants and sphere)

## Capabilities

### New Capabilities
- `client-typescript-build`: esbuild compiles `src/client/*.ts` to `public/js/*.js`
- `shared-types`: server and client share types from `src/shared/`

### Modified Capabilities
- `constants-generator`: constants.ts becomes the source file directly (no more generation step)

## Impact

- `tsconfig.client.json` — new: separate TS config for client (DOM lib, no server types)
- `src/client/` — new directory with .ts source files
- `scripts/build-client.mjs` — new: esbuild script to compile client TS to JS
- `package.json` — update build script to include client compilation
- `public/js/*.js` — now generated from TypeScript sources
- No behavior changes — same runtime code, just type-checked
