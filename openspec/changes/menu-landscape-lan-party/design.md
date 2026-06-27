## Context

SmashCart already has a playable flat-world flight model, but the user-facing shell still behaves like a prototype. The menu is a single centered card, local play is hidden behind generic room codes, and the renderer leaves large parts of the map visually empty. The change touches markup, menu orchestration, networking entry points, and Three.js scene construction, so it benefits from an explicit design before coding.

## Goals / Non-Goals

**Goals:**
- Present the game as a complete product from the first screen, especially in landscape orientation.
- Add a practical LAN party flow for players on the same hotspot or local network.
- Increase battlefield visual density without changing server physics or collision rules.

**Non-Goals:**
- Peer-to-peer hosting from the browser.
- New backend services, matchmaking infrastructure, or schema changes.
- Rebalancing flight, weapons, or room simulation in this change.

## Decisions

### 1. Replace the menu card with a multi-panel shell
The start screen will become a landscape-first shell with a hero area, play-mode cards, and an always-visible controls/status section. This gives each mode a clear call to action and avoids overloading one vertical card.

Alternative considered: keeping the current modal and only adding more buttons. Rejected because it would increase clutter without improving first-run clarity.

### 2. Implement LAN play as a server-origin override
LAN mode will let players enter or reuse a local server origin, store it in local storage, and include it in share links. The browser client will connect to that server for Colyseus instead of always using `location.host`.

Alternative considered: peer-hosted hotspot matches from the browser. Rejected because the game is server-authoritative and the browser cannot host the Node.js simulation.

### 2.1 Put QR invites on top of the existing share link
Private-room share UI will keep the copyable invite link, but it will also render a scannable QR code generated from that exact URL. That keeps the room code, the chosen server origin, and the phone-join path in one source of truth, which is the least fragile way to match the proven `tank2` flow.

Alternative considered: generating a second QR-specific URL format. Rejected because it would duplicate join logic and risk drift between copy-link and QR invite behavior.

### 3. Keep LAN constraints explicit in the UI
The menu will detect when the app is not already served from a private/local origin and explain that true hotspot latency gains come from opening the game from the hotspot host itself. Secure-page to insecure-LAN combinations will be called out before connect attempts.

Alternative considered: silently accepting any server string. Rejected because mixed-content failures would look like random connection bugs.

### 4. Make the battlefield feel complete through renderer-only dressing
Landscape improvements will stay client-side: layered ground colors, runway and road decals, simple prop clusters, and landmark embellishment built from deterministic geometry. This keeps the world richer without affecting collisions, snapshots, or the authoritative room model.

Alternative considered: adding new server landmark data. Rejected because the user request is primarily presentation and menu flow, not gameplay geometry expansion.

## Risks / Trade-offs

- [LAN server override from an HTTPS page can be blocked by mixed-content rules] → Detect and message this case before joining, and prefer same-origin LAN hosting when possible.
- [More map geometry can hurt weaker mobile GPUs] → Use low-poly meshes, shared materials, and static dressing only.
- [A denser menu can become hard to scan on phones] → Use stacked cards on portrait/mobile and keep one primary action per card.

## Migration Plan

This change is client-only. Deploying the updated static assets and server bundle is sufficient. Rollback is straightforward by redeploying the previous build.

## Open Questions

None blocking. The chosen implementation keeps current server behavior intact and focuses change risk on the client shell and renderer.
