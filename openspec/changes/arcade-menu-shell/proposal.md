## Why

SmashCart's current menu works, but it still reads like a configured web interface instead of the front-end of an arcade flight game. The next step is not more polishing on that structure; it is a separate menu shell that feels like a mode-select screen with deliberate navigation, stronger button hierarchy, and clearer screen-to-screen movement.

## What Changes

- Introduce a separate **arcade-style menu shell** with its own root, screen layout, button language, and navigation flow instead of continuing to evolve the current menu markup.
- Rebuild home, launch, join, local Wi-Fi, leaderboard, and customization entry screens inside that shell so they feel like game screens rather than application panels.
- Keep the current menu in the repository as dormant fallback structure, while routing live menu behavior through the new shell.
- Preserve all existing room, loadout, invite, and local Wi-Fi behaviors, but present them through larger game-style buttons, clearer screen headers, stronger back navigation, and more intentional focus flow.

## Capabilities

### New Capabilities
- `arcade-menu-shell`: a dedicated game-style front-end shell that owns menu screen composition, primary action buttons, and screen-to-screen navigation behavior.

### Modified Capabilities
- `preflight-command-surface`: the preflight experience will now be delivered through the new arcade menu shell, with stronger mode-select hierarchy and explicit game-like navigation between launch paths.

## Impact

- `public/index.html` — add a new menu root placeholder while leaving the old menu markup intact.
- `public/css/arcade-menu.css` — dedicated styling for the new game-style menu shell, buttons, headers, and screen transitions.
- `src/client/arcadeMenu.ts` — new shell markup/composition for the replacement menu screens.
- `src/client/main.ts` — point menu orchestration, loadout rendering, local Wi-Fi UI, and screen routing at the new shell IDs and containers.
- `public/js/main.js` — rebuilt client bundle for the new menu shell.
