## Why

The current front end works, but it still feels like a prototype: the menu is a single card, the world reads as a bare test field, and there is no explicit low-latency local-play path. This change turns the first-run experience into a complete game shell and makes LAN play understandable for players using the same hotspot.

## What Changes

- Replace the current start screen with a landscape-first menu that separates solo play, friend rooms, and LAN party play.
- Add a LAN party flow with a server-address field, persisted LAN settings, sharable room links and QR codes, and clear messaging about when hotspot play lowers latency.
- Upgrade the rendered battlefield with terrain bands, runway/road features, prop dressing, and better landmark presentation so the flat map feels like a complete arena.
- Keep the current room-code multiplayer model and server-authoritative simulation; this change does not introduce peer-to-peer hosting.

## Capabilities

### New Capabilities

- `menu-shell`: A structured front-end menu with distinct play-mode entry points, status messaging, and mobile landscape guidance.
- `lan-party-join`: A local-network join flow that lets players connect to a LAN-hosted server and share room links that preserve the chosen server.
- `battlefield-landscape`: A richer battlefield presentation that visually fills the open-world map without changing flight or collision rules.

### Modified Capabilities

- None.

## Impact

Affected code includes `public/index.html`, `public/css/style.css`, `src/client/main.ts`, `src/client/net.ts`, and `public/js/render3d.js`. No new runtime dependency is required; the change extends the existing browser client and renderer.
