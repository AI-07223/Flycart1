## Context

SmashCart already has working menu flows, but they are implemented inside one large menu structure that now carries both product logic and visual structure. That has made the menu feel like an application dashboard: the interactions work, but the hierarchy, button treatment, and screen flow do not read like a game front-end.

The user explicitly wants a new menu rather than another pass over the current one. That creates an implementation constraint: keep the current menu markup in the repository as fallback context, but stop treating it as the live front-end. The game loop, networking, local Wi-Fi flows, share flows, and customization data model should remain intact.

This is a cross-cutting client change because menu state currently touches:
- `public/index.html` for menu containers and overlays;
- `src/client/main.ts` for menu routing, loadout rendering, leaderboard, LAN discovery, and settings entry;
- `public/css/style.css` for the current visual system;
- `public/js/render3d.js` for scene-mode behavior that responds to menu state.

## Goals / Non-Goals

**Goals:**
- Deliver a separate game-style menu shell with stronger button hierarchy, clearer screen-to-screen movement, and more console-like presentation.
- Keep the old menu source present but dormant so the new shell does not depend on destructive rewrites of existing menu markup.
- Preserve all existing behaviors for loadout, room creation, invites, QR scanning, local Wi-Fi flows, leaderboard loading, and settings access.
- Improve navigation clarity with explicit home, launch, join, local, leaderboard, and customization screens that feel like game screens instead of stacked app panels.
- Keep the mobile experience readable and deliberate, with big buttons and vertical progression rather than compressed desktop cards.

**Non-Goals:**
- No change to gameplay systems, room protocol, invite format, or loadout payload shape.
- No redesign of pause, lobby, intermission, or in-match HUD behavior beyond whatever existing scene-mode rules already support.
- No removal of the old menu markup from the repository in this pass.

## Decisions

### 1. Mount a dedicated arcade menu root and hide the legacy start screen

A new overlay root will be added for the live menu shell. The legacy `#start-screen` markup will stay in the document but will be hidden whenever the new shell is active.

Why:
- This honors the request to create a new menu instead of continuously editing the old one.
- It avoids risky in-place surgery on a large markup tree that already has working behavior.
- It gives the new menu complete control over visual composition and navigation structure.

Alternative considered:
- Continue refactoring the current `#start-screen` tree in place.
- Rejected because it keeps implementation and legacy structure entangled, which is exactly the problem this request is trying to avoid.

### 2. Generate the new shell from a dedicated client module

The new menu markup will be composed by a separate client module, mounted into the new root before `main.ts` resolves menu elements.

Why:
- It gives the new menu a clean boundary and keeps the shell self-contained.
- It allows the game to keep the dormant legacy markup untouched in `index.html`.
- It reduces HTML churn and makes future menu iteration easier.

Alternative considered:
- Hard-code the new shell inline directly into `public/index.html`.
- Rejected because it duplicates a large amount of structure in the main HTML file and makes it harder to keep the new shell modular.

### 3. Namespace the new menu DOM and retarget menu logic through fallback-aware selectors

Menu-facing elements will use new IDs and screen classes under the arcade shell. `main.ts` will resolve menu references by preferring the new shell elements while still allowing legacy fallback if needed.

Why:
- It avoids duplicate IDs between the legacy and new menu trees.
- It keeps the migration incremental and safer than ripping out old code.
- It preserves the rest of the game logic and only redirects the menu-facing surface.

Alternative considered:
- Reuse the same IDs in both old and new markup and rely on DOM order.
- Rejected because duplicate IDs make behavior brittle and debugging painful.

### 4. Keep existing flows and move only presentation and menu composition

The new shell will call the same start-game, LAN discovery, join, leaderboard, and loadout behaviors that already exist. The menu overhaul is about structure, copy, and visual hierarchy, not replacing those underlying flows.

Why:
- The user asked for a game-like menu, not a protocol rewrite.
- Existing LAN and loadout behaviors already work and have tests/spec coverage.
- Limiting the change surface reduces regression risk while still delivering a visibly different menu.

Alternative considered:
- Rebuild the menu logic and flow wiring from scratch along with the visuals.
- Rejected because it increases risk without improving the user-facing goal.

### 5. Use an arcade cabinet / combat briefing direction with one signature move

Subject: arcade dogfight launch deck.
Audience: players deciding what to play in seconds.
Single job: make the front-end feel like selecting a mode in a game, not configuring a tool.

Visual direction:
- heavy title treatment and oversized mode-select buttons;
- clear “screen” framing with back labels and stage dividers;
- strong focus states and large primary actions;
- one signature move: a central mode-select stack that reads like a mission board rather than a form layout.

Alternative considered:
- Minimal futuristic app cards with smaller action density.
- Rejected because it would continue reading as software UI instead of game UI.

## Risks / Trade-offs

- [Two menu trees can drift] → Keep the old tree hidden and route all live menu behavior through the new shell selectors.
- [Main client file already owns a lot of menu logic] → Isolate new shell composition in its own module and keep `main.ts` changes focused on element resolution and router targeting.
- [Mobile game-style buttons can push deeper content below the fold] → Prioritize large primary actions at the top and allow natural vertical progression for lower-priority content.
- [Concurrent repo work could touch the same client files] → Add new files for the shell and CSS, and keep rewiring changes in `main.ts` scoped to menu references only.

## Migration Plan

1. Add the new menu root placeholder and dedicated menu module/CSS.
2. Mount the arcade shell before menu element lookups happen in `main.ts`.
3. Retarget menu state, routing, loadout rendering, join/LAN UI, and leaderboard output to the new shell IDs.
4. Hide the legacy live menu while keeping it in the repo as dormant fallback.
5. Verify desktop and narrow-mobile navigation flows in the browser.

## Open Questions

- None for this pass. The direction is to replace the live menu shell while preserving underlying menu behaviors.
