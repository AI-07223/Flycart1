## Why

The current menu is "a webpage of options" — `#start-screen` dumps Quick Play, Friends, LAN, P2P, Leaderboard, and Controls onto one scrolling page. Real games use **screens** you navigate in and out of like an app. Three concrete fly-test complaints: the "Invite friends" bar sits stranded on screen during play, there is **no way to open settings/pause in-game on touch** (pause is keyboard `P` only), and **QR scan is buried** inside "Have a code?".

## What Changes

- **Menu screen router.** `#start-screen` becomes a navigation shell with distinct screens — **Home → Play → Join / LAN / Leaderboard** — each with a back button and slide transition. Home shows a few big buttons, not every option at once. (Hangar and Settings already are screens; they get home buttons.)
- **In-game menu button.** Add a thumb-reachable `☰` button to the HUD so touch players can open Pause → Settings / Invite / Main Menu mid-game. (Keyboard `P` still works.)
- **Fix the stray Invite bar.** `#share-bar` is gated to the lobby only; it no longer lingers during gameplay. Mid-game invites move into the Pause menu (Invite → QR/link) for private/P2P rooms.
- **Surface QR scan.** Join becomes its own screen with a code field, paste-link, and a prominent **SCAN QR** (camera) button.

This is an information-architecture rebuild — almost all underlying features (settings, pause, scanner, hangar, lobby) already exist; they are being re-homed into a navigable screen system. No netcode, sim, or schema changes.

## Capabilities

### New Capabilities
- `menu-navigation`: an app-style screen router for the main menu (home/play/join/lan/leaderboard) with back navigation and transitions, plus in-game menu access (HUD menu button → pause) and context-correct invite (lobby share bar + pause invite).

### Modified Capabilities
<!-- none: no published specs in openspec/specs/ -->

## Impact

- `public/index.html` — restructure `#start-screen` into `.menu-router` + `.menu-screen` sections; add `#ingame-menu-btn` to `#hud`; add `#pause-invite-btn` to `#pause-screen`; fold `#join-code-modal` inputs into `#screen-join`.
- `public/css/style.css` — screen/nav/transition system, big nav buttons, back button, HUD menu button, pause invite button. Landscape-first, each screen fits viewport (no page scroll; only lists scroll internally).
- `src/client/main.ts` — a `nav` router (go/back/reset over menu screens), rewire menu buttons to navigation, gate `#share-bar` to lobby in `applyMode()`, wire `#ingame-menu-btn`→`togglePause()` and `#pause-invite-btn`→`showShareQr()`. Preserve the `mode` machine, netcode/lobby/render wiring untouched. Rebuild client (esbuild).
- Deploy: Coolify (flaky npm-ci, 5× retry loop — be patient).
