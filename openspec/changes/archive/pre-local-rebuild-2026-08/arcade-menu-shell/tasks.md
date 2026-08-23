## 1. Arcade Shell Setup

- [x] 1.1 Add a dedicated arcade menu root and a new client module that mounts the replacement menu shell without deleting the legacy start screen.
- [x] 1.2 Add a dedicated `public/css/arcade-menu.css` stylesheet for the new game-style menu visuals, buttons, and screen transitions.

## 2. Screen Composition

- [x] 2.1 Build new home and launch screens with game-style primary action buttons, explicit back flow, and selected-plane summary areas.
- [x] 2.2 Build new join, local Wi-Fi, leaderboard, and customization screens inside the new shell while preserving the existing behaviors they expose.

## 3. Client Rewiring

- [x] 3.1 Retarget menu element resolution and router behavior in `src/client/main.ts` to the new shell IDs and screen classes while keeping legacy fallback possible.
- [x] 3.2 Retarget loadout rendering, leaderboard output, join input handling, and local Wi-Fi discovery UI to the new shell containers.

## 4. Validation

- [x] 4.1 Run `npm run build && npm test`.
- [x] 4.2 Verify in browser on desktop and narrow mobile that the new shell is the live menu, the selected plane remains visible on preflight, navigation works between screens, and combat chrome stays hidden outside active play.
