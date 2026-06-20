# Repository Guidelines

## Project Structure & Module Organization

SmashCart is a Node.js/TypeScript multiplayer air-combat game with a server-authoritative flat-world flight model.

- `src/index.ts` boots Express and Colyseus.
- `src/rooms/ArenaRoom.ts` contains the match loop, bots, combat, and pickup logic.
- `src/schema/ArenaState.ts` defines synchronized room state.
- `src/shared/` holds gameplay constants and shared 3D vector math.
- `src/client/` is the source for browser TypeScript; `public/js/*.js` is generated from it.
- `public/js/render3d.js` is the hand-authored Three.js renderer for the flat battlefield.
- `public/` also contains HTML, CSS, audio, images, and vendored browser libraries.
- `tests/` contains Vitest coverage for shared math and room simulation.
- `openspec/changes/` stores proposals, designs, specs, and task lists for planned changes.

Do not edit generated client files in `public/js/` except `render3d.js`.

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

Vitest discovers `tests/**/*.test.ts`. Name tests after the subject, for example `arena.test.ts`. Add deterministic coverage for movement, altitude limits, projectile collisions, bot-safe bounds, and latency-sensitive helpers. Prefer math- and simulation-level tests over timing-dependent browser tests.

## Commit & Pull Request Guidelines

Use Conventional Commit prefixes such as `feat:`, `fix:`, `docs:`, `build:`, and `infra:`. Keep subjects imperative and specific. PRs should summarize the player-visible change, reference the relevant OpenSpec change, and include build/test results. Include screenshots or a short clip for HUD, control, camera, or renderer changes.