## 1. Markup — index.html (Agent HTML)

- [x] 1.1 Restructure `#start-screen` into `.menu-router` + `.menu-screen` sections (home/play/join/lan/leaders) per design §A; one `.active`
- [x] 1.2 Build #screen-home (brand, name-input, bots-check, big nav buttons PLAY/HANGAR/LEADERBOARD/SETTINGS, orientation-note, status) — KEEP ids
- [x] 1.3 Build #screen-play (Quick Play/Create Room/Join/LAN nav) + #screen-join (fold join-code-modal inputs, prominent SCAN QR) + #screen-lan (move LAN+P2P) + #screen-leaders (move menu-leaderboard) — KEEP all ids; delete #join-code-modal wrapper
- [x] 1.4 Add `#ingame-menu-btn` (☰) to #hud and `#pause-invite-btn` to #pause-screen .btn-row
- [x] 1.5 Add back-button headers (.screen-head/.screen-back[data-back]) + data-nav attributes per design

## 2. Styles — style.css (Agent CSS)

- [x] 2.1 `.menu-router` / `.menu-screen` (+ `.active`) fade+slide transition; landscape-first, each screen fits viewport, only lists scroll
- [x] 2.2 `.screen-head` / `.screen-back` back button
- [x] 2.3 `.menu-nav-btn` big glass tap targets (icon+label, press feel) + `.scan-cta` hero emphasis
- [x] 2.4 `.hud-menu-btn` (top-left HUD, thumb zone, no minimap collision) + `#pause-invite-btn`
- [x] 2.5 Keep translucent (3D shows through); reuse `--ui-*` tokens; verify landscape phone + desktop

## 3. Router + wiring — main.ts (Agent MAIN)

- [x] 3.1 Add nav router (MENU_SCREENS, navStack, navShow/navGo/navBack/navReset) per design §C
- [x] 3.2 Wire `[data-nav]` → navGo, `.screen-back` → navBack; call navReset() in resetToMenu() and once on init; Escape→navBack in menu (modal closes keep priority)
- [x] 3.3 Repoint old join-code-modal entry: remove `#join-code-open-btn` listener; keep `#join-code-submit` + `#scan-open-btn` behavior; neutralize openJoinCode/closeJoinCode refs safely
- [x] 3.4 Gate share-bar: in applyMode() add `if (mode !== "lobby") els.share.classList.add("hidden")`
- [x] 3.5 Wire `#ingame-menu-btn`→togglePause(); `#pause-invite-btn`→showShareQr(); toggle pause-invite visible only when an invite link exists
- [x] 3.6 Add new element refs to `els` (dollar pattern); do NOT touch netcode/lobby/render/sim wiring

## 4. Integrate, verify, deploy (orchestrator)

- [x] 4.1 `npm run build` (esbuild + tsc) clean; `npm test` green
- [x] 4.2 Preview verify desktop + landscape-phone: Home→Play→Join→back; SCAN QR visible; in-game ☰ opens pause; pause Invite only in private; no stray share bar in public play; screenshot proof
- [x] 4.3 Commit, push, Coolify redeploy (patient — 5× npm-ci retry loop), verify live bundle
