# Repository Guidelines

## Project Structure & Module Organization

SmashCart is a Node.js/TypeScript local Wi-Fi air-combat game with a server-authoritative flat-world flight model.

- `src/index.ts` boots Express, the plain `ws` WebSocketServer on `/ws`, and mDNS advertisement.
- `src/server/RoomHost.ts` is the transport glue: join handshake, validation, rate limiting, leader checks, and event fan-out for the single room the process hosts.
- `src/sim/GameSim.ts` is the framework-free authoritative simulation: match loop, bots, combat, and pickup logic.
- `src/shared/protocol.ts` defines the frozen wire contract between client and server.
- `src/shared/` also holds gameplay constants and shared 3D vector math.
- `src/client/` is the source for browser TypeScript (`menu.ts`, `net-ws.ts`, ...); `public/js/*.js` is generated from it.
- `src/client/render3d.ts` is the Three.js renderer for the flat battlefield. It is the one ESM
  entry: `index.html` loads `js/render3d.js` with `<script type="module">` and resolves its bare
  `three` import through the page's import map, so it is emitted as ESM with `three` external.
- `public/` also contains HTML, CSS, audio, images, and vendored browser libraries.
- `tests/` contains Vitest coverage for shared math, the combat loop, all 12 powerups, and RoomHost protocol behavior.
- `openspec/changes/archive/` stores historical proposals, designs, specs, and task lists.

Do not edit generated client files in `public/js/` — every one of them is built from `src/client/`.
The `CACHE` constant in `public/sw.js` is generated too: `build-client.mjs` hashes the shipped
bundles, HTML, manifest and CSS and rewrites it, so a client change always rotates the cache.

## Build, Test, and Development Commands

- `npm ci` — install exact locked dependencies.
- `npm run dev` — start the server in watch mode on port `2567`.
- `npm run build-client` — compile `src/client/*.ts` into `public/js/*.js`.
- `npm run build` — build client assets and compile the server into `dist/`.
- `npm test` — run the Vitest suite.
- `npm start` — run the production build.

Before shipping changes, run `npm run build && npm test`.

## Coding Style & Naming Conventions

Use two-space indentation, double quotes, semicolons, and trailing commas in multiline structures. Use `camelCase` for values/functions, `PascalCase` for classes, and `UPPER_SNAKE_CASE` for shared tuning constants. Keep the server authoritative. Flat-world positions use `x/y/z`, with `y` as altitude; do not reintroduce globe/radius assumptions.

## Testing Guidelines

Vitest discovers `tests/**/*.test.ts`. Name tests after the subject, for example `roomhost.test.ts`. Add deterministic coverage for movement, altitude limits, projectile collisions, bot-safe bounds, and latency-sensitive helpers. Prefer math- and simulation-level tests over timing-dependent browser tests.

## Commit & Pull Request Guidelines

Use Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, `build:`, and `infra:`. Keep subjects imperative and specific. PRs should summarize the player-visible change, reference the relevant OpenSpec change, and include build/test results. Include screenshots or a short clip for HUD, control, camera, or renderer changes.