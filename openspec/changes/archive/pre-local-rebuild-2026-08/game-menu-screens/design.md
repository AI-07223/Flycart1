# Design — Game Menu Screen System (CONTRACT)

This is the **shared contract** three agents build against (one owns `public/index.html`, one `public/css/style.css`, one `src/client/main.ts`). IDs, classes, and the nav API below are FIXED — every agent must use these exact names so the three files integrate without a meeting.

## Context (current state — do not break)

- `mode` machine in main.ts: `"menu" | "lobby" | "playing" | "paused" | "lost" | "error"`. `applyMode()` toggles top-level screens (`#start-screen`, `#lobby-screen`, `#hud`, `#pause-screen`, etc.) by `.hidden`. KEEP this — the new router lives *inside* `mode==="menu"`.
- Sub-overlays already exist and work: `#settings-screen` (showSettings/hideSettings), `#hangar-overlay` (showHangar/hideHangar), `#scan-overlay` (openScanner/closeScanner, jsQR), `#share-qr-overlay` (showShareQr/hideShareQr), `#pause-screen`. KEEP their show/hide functions and camera/scan logic intact.
- 3D background: `loop()` calls `Renderer.drawMenu(dt, selectedCosmetics)` while `mode==="menu"`. The menu overlay is translucent so the 3D shows through. KEEP this — screens must stay visually translucent (no opaque full-bleed backgrounds).
- Element refs use `const dollar = id => document.getElementById(id)!` cached in an `els` object. New refs follow the same pattern.
- Bug 1: `#share-bar` is shown by joinLobby/startP2PHost/joinP2PAsGuest and only hidden in startGame(public)/resetToMenu — so it LINGERS during play after a private lobby. Fix in `applyMode()`.
- Bug 2: no touch pause button — pause is keyboard `P` only (`Input.onPause`).
- Bug 3: scan is buried in `#join-code-modal`.

## A. Menu router markup (index.html)

Replace the body of `#start-screen` (the `.menu-shell` with its `.menu-hero` + `.menu-grid`) with a router shell. KEEP `#start-screen.overlay` as the outer element (applyMode toggles it).

```
#start-screen.overlay
  .menu-router
    section.menu-screen#screen-home.active
    section.menu-screen#screen-play
    section.menu-screen#screen-join
    section.menu-screen#screen-lan
    section.menu-screen#screen-leaders
```

Exactly ONE `.menu-screen` carries `.active` at a time. Default `#screen-home.active`.

Every non-home screen starts with a header:
```
<header class="screen-head">
  <button class="screen-back" data-back aria-label="Back">‹ Back</button>
  <h2 class="screen-title">…</h2>
</header>
```
Home has no back button; instead a top-right quick row with Settings + Hangar.

### #screen-home (root)
- Brand: `<h1>SMASH<span>CART</span></h1>` + short tagline.
- Top-right quick actions: `#menu-settings-btn` (⚙, KEEP id) and a small server badge `#menu-server-badge` (KEEP id).
- Call sign: `<input id="name-input" maxlength="14" placeholder="Call sign" />` (KEEP id).
- Bots toggle: `<label class="switch"><input type="checkbox" id="bots-check" checked /> 🤖 Fill empty seats with bots</label>` (KEEP id).
- Big nav buttons (class `menu-nav-btn`, large, icon + label, stacked or 2-col):
  - `▶ PLAY` → `data-nav="play"`
  - `✈ HANGAR` → id `hangar-btn` (KEEP id; opens hangar overlay)
  - `🏆 LEADERBOARD` → `data-nav="leaders"`
  - `⚙ SETTINGS` → id `menu-settings-btn` may live here instead of top-right (pick one; KEEP the id once)
- Keep `<p id="orientation-note" class="muted">` somewhere small (KEEP id).
- Tiny footer status `<p id="status" class="muted">` (KEEP id).

### #screen-play  (title "Play")
back → home. Big `menu-nav-btn` choices:
- `QUICK PLAY` → id `quickplay-btn` (KEEP id) — public arena.
- `CREATE PRIVATE ROOM` → id `friends-btn` (KEEP id).
- `JOIN A ROOM` → `data-nav="join"`.
- `LAN / LOCAL` → `data-nav="lan"`.
Short one-line descriptions under each are fine. Keep `#friends-note` if convenient (optional).

### #screen-join  (title "Join a Room")
back → play. This REPLACES `#join-code-modal` (delete that modal; move its inputs here, same ids):
- `<input id="join-code-input" maxlength="200" placeholder="ABCDEF or paste link" autocomplete="off" spellcheck="false" />` (KEEP id).
- Primary `<button id="join-code-submit">JOIN</button>` (KEEP id).
- Prominent camera button `<button id="scan-open-btn" class="menu-nav-btn scan-cta">📷 SCAN QR</button>` (KEEP id) — visually the hero action of this screen.
- helper text "Enter a 6-char code, paste an invite link, or scan a QR."
- The `#scan-overlay` camera overlay STAYS as-is (launched on top); do not move it into the router.

### #screen-lan  (title "LAN / Local")
back → play. Move the existing LAN + P2P block here verbatim, KEEPING all ids: `#lan-server-input`, `#lan-quick-btn`, `#lan-friends-btn`, `#lan-hint`, `#p2p-host-btn`, `#p2p-offline-btn`, `#p2p-offline-section`, `#p2p-offline-canvas`, `#p2p-answer-input`, `#p2p-answer-submit`.

### #screen-leaders  (title "All-Time Leaders")
back → home. Move `<div id="menu-leaderboard">` here (KEEP id). The list scrolls internally if long.

The big "Controls" reference panel is removed from the page (the info lives in Settings / is obvious). Do NOT delete the Settings controls; only drop the redundant menu Controls panel. Keep `#room-code-chip` only if trivial, else drop.

## B. In-game menu button + pause invite (index.html)

- Inside `#hud`, add `<button id="ingame-menu-btn" class="hud-menu-btn" title="Menu" aria-label="Menu">☰</button>` (top-left, thumb zone; visible whenever HUD is). It must not overlap the minimap/score badly — top-left corner.
- In `#pause-screen` `.btn-row`, add `<button id="pause-invite-btn" class="secondary hidden">📨 INVITE</button>` between Resume and Main Menu (KEEP existing `#resume-btn`, `#pause-settings-btn`, `#pause-menu-btn`).

## C. Nav router API (main.ts)

Add a small router that operates ONLY over the menu screens. Do not disturb `mode`/`applyMode`.

```ts
const MENU_SCREENS = ["home", "play", "join", "lan", "leaders"] as const;
let navStack: string[] = ["home"];

function navShow(id: string): void {
  // toggle .active on the matching .menu-screen (#screen-<id>), hide others
  document.querySelectorAll(".menu-screen").forEach((s) => {
    s.classList.toggle("active", s.id === `screen-${id}`);
  });
}
function navGo(id: string): void {
  if (navStack[navStack.length - 1] === id) return;
  navStack.push(id);
  navShow(id);
}
function navBack(): void {
  if (navStack.length > 1) { navStack.pop(); navShow(navStack[navStack.length - 1]); }
}
function navReset(): void { navStack = ["home"]; navShow("home"); }
```

Wiring (in init()):
- Every `[data-nav]` button → `navGo(btn.dataset.nav)`.
- Every `.screen-back` (`[data-back]`) button → `navBack()`.
- `resetToMenu()` MUST call `navReset()` (so returning to menu always lands on Home).
- The initial menu entry (first `applyMode("menu")` / boot) should ensure Home is active (call `navReset()` once on init).
- Escape key while `mode==="menu"` and not on home → `navBack()` (add to the existing Escape chain WITHOUT breaking modal closes: modal closes take priority; only if no modal open and in menu, navBack).
- `#join-code-open-btn` no longer exists → remove its listener. The old `openJoinCode()/closeJoinCode()` modal helpers become unused; replace the "Have a code?" entry point with the PLAY→JOIN nav button. Keep `#join-code-submit` and `#scan-open-btn` wiring exactly as before (submit → startGame(code,null); scan → openScanner()). If `openJoinCode/closeJoinCode` are referenced elsewhere (e.g. resetToMenu, Escape chain), repoint them to navBack/no-op safely.

## D. Share-bar gating (main.ts) — fixes the stray Invite bar

In `applyMode()`, after the existing toggles add:
```ts
if (mode !== "lobby") els.share.classList.add("hidden");
```
This hides `#share-bar` on lobby→playing (and every non-lobby mode). KEEP the existing show calls in joinLobby/startP2PHost/joinP2PAsGuest (they run for lobby). Net effect: the invite bar shows in the lobby only.

## E. In-game menu + invite wiring (main.ts)

- `#ingame-menu-btn` click → `togglePause()` (only meaningful when playing/paused; togglePause already guards). 
- `#pause-invite-btn` click → `showShareQr()` (reuses the existing QR + link overlay).
- Show/hide `#pause-invite-btn`: it should be visible only when an invite exists (private/P2P room). Simplest: when entering pause (in `togglePause()` → paused, or in `applyMode` paused branch), toggle it by whether a share link exists. Reuse whatever variable currently gates the share bar / holds the invite URL (e.g. the value of `#share-link`). If `els.shareLink.value` is non-empty → show `#pause-invite-btn`, else hide.

## F. CSS (style.css)

Reuse existing design tokens (`--ui-accent/-fire/-boost/-glass/-rim/-bevel/-shadow/-press`). Arcade-neon, glassy.

- `.menu-router`: fills `#start-screen` safe-area; `position: relative` container. **Landscape-first: each `.menu-screen` fits the viewport without page scroll**; only inner lists (`#menu-leaderboard`) scroll.
- `.menu-screen`: absolutely positioned fill, `opacity:0; transform: translateX(12px); pointer-events:none; transition: opacity .2s, transform .2s;`. `.menu-screen.active { opacity:1; transform:none; pointer-events:auto; }`. (A simple fade+slide. Don't over-engineer.)
- `.screen-head`: row with back button left, title. `.screen-back`: pill/ghost button with a `‹`. 
- `.menu-nav-btn`: large tap target (min-height ~56px), icon + label, glassy with rim/bevel, `:active` press feel. Stack on narrow, 2-col on wide if it fits without scroll.
- `.scan-cta`: emphasize (accent border/glow) so SCAN QR reads as the hero on the join screen.
- `.hud-menu-btn`: small glass icon button, top-left of `#hud`, thumb-reachable, above the canvas; ~40px, `touch-action:none`. Don't collide with `#hud-team-score` / minimap (top-center) — keep it hard left.
- `#pause-invite-btn`: matches the pause `.btn-row` buttons.
- Keep everything translucent so the 3D menu background shows through (don't add opaque page backgrounds).
- Must look right in landscape on a phone (the common case) AND desktop.

## Risks / Trade-offs

- **Integration mismatch across 3 files** → mitigated by this fixed contract (exact ids/classes/API). The orchestrator integrates + builds + preview-verifies after.
- **main.ts is large** → the main.ts agent AUGMENTS (adds router + rewires menu buttons + 2 gating lines); it must NOT touch netcode/lobby/render/sim wiring. Everything outside the menu/pause/share wiring stays byte-for-byte.
- **Losing a working feature during restructure** → all existing ids are preserved; the scanner/settings/hangar/lobby overlays are untouched; only the menu page layout + a few new buttons change.
- **Landscape overflow** → screens are designed to fit one viewport; verify with preview at landscape phone size.

## Verification

- `npm run build` (esbuild + tsc) clean; `npm test` green.
- Preview (desktop + resized landscape phone): Home shows; PLAY→JOIN→back works; SCAN QR button visible on Join; in-game `☰` opens pause; pause Invite shows only in private room; share bar gone during public play. Screenshot proof.
