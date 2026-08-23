# Design — LAN Room Browser (CONTRACT)

Shared contract for the broker (`src/signal.ts`) and the client (`src/client/net-p2p.ts`, `main.ts`, `index.html`, `style.css`). The wire protocol below is FIXED so the broker and client agree.

## Context / constraints

- Browsers can't run a server socket or scan a LAN. The internet-reachable broker at `(origin)/signal` is the only shared rendezvous. Phone hotspots share mobile data, so the broker is reachable and all phones on one hotspot egress through ONE public IP → use public IP as the network key.
- Broker today (`src/signal.ts`): `rooms: Map<code, RoomState>`, `RoomState = { host, guests:Map<peerId,ws>, lastActivity, migrating? }`. Messages: `host`, `join`, `offer`, `answer`, `ice`. Host-migration + 30s TTL prune. The connection handler currently does NOT retain `req` — it must, to read the public IP.
- Client today (`net-p2p.ts`): connects `ws://host/signal`, sends `{type:"host",room}` or `{type:"join",room,peerId}`, relays SDP/ICE. `RTCPeerConnection` currently has no STUN.
- Keep host-migration, input-sequencing netcode, invite-link/QR/Offline-QR all working. GameSim is shared server/P2P — don't fork behavior.

## Wire protocol additions (FIXED)

Public IP capture: in `createSignalServer`, the `connection` handler receives `(ws, req)`. Stash `(ws as any)._signalIP = clientIP(req)` at connection. `clientIP(req)` = first comma-split token of `req.headers['x-forwarded-for']` (trimmed) if present, else `req.socket.remoteAddress`. (Traefik forwards XFF by default.)

Extend `RoomState` with: `name?: string; hostName?: string; publicIP?: string;` (count is derived as `guests.size`; "open" = has a live host AND `guests.size < MAX_GUESTS_PER_ROOM`).

- **host** (existing, extended): `{ type:"host", room, name?, hostName? }`. On handling: set `r.host=ws`, and if `name` provided set `r.name=name` (else KEEP existing `r.name` — preserves name across migration); if `hostName` provided set `r.hostName`; set `r.publicIP = ws._signalIP` (the host defines the room's network). Reply `hosted` as today.
- **list** (NEW): `{ type:"list" }` — sender may be a bare socket (no room). Reply:
  `{ type:"rooms", rooms: [ { code, name, hostName, count } ] }`
  including ONLY rooms where: `r.host` is OPEN, `r.guests.size < MAX_GUESTS_PER_ROOM`, and `r.publicIP === ws._signalIP`. `count = r.guests.size + 1` (host counts as a player). Cap the list length (e.g. 50). Do NOT auto-create a room for a `list` (the current `getOrCreateRoom` runs for every message keyed by `room` — `list` has no `room`, so handle it BEFORE the get-or-create/room-required block).
- join/offer/answer/ice: unchanged. Count updates are implicit (guests map). `peer-joined`/`peer-left` already fire.

Migration: the elected guest sends `host` WITHOUT a name → broker keeps `r.name`/`r.publicIP`. Good. (publicIP stays the original host's network; acceptable — the room is still "on that hotspot".)

## Client (net-p2p.ts)

- Host start: send `{ type:"host", room, name, hostName }` where `name` = chosen room name, `hostName` = call sign.
- Discovery API (NEW), e.g. `listRooms(): Promise<Array<{code,name,hostName,count}>>`:
  open a WebSocket to `${proto}://${location.host}/signal`, on open send `{type:"list"}`, resolve on the `rooms` message, then close. Timeout ~3s → resolve `[]`. (Or reuse an existing idle socket if simpler — a fresh short-lived socket is fine and avoids state coupling.)
- STUN: every `new RTCPeerConnection(...)` uses config `{ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }`. Find ALL RTCPeerConnection construction sites (host side per-guest + guest side) and add it. Same-LAN still connects via host candidates; STUN only helps across NAT.
- Late-join: a guest joining a room whose match is already "playing" must spawn into the running match. The P2P guest receives the host's snapshot; ensure no client-side gate blocks rendering/spawning when phase is already "playing" (today P2P may route through a lobby). Local rooms are continuous FFA (see below) so there is no lobby to gate on.

## Continuous FFA local rooms

- A "Create Local Room" host starts the P2P host-sim in **FFA**, **playing** immediately — no lobby/ready-up. If `startP2PHost()` currently enters a lobby phase, add a path (e.g. `startLocalRoom(name)`) that sets the sim's mode to ffa and phase to playing from the start (public-style continuous play), so create = instantly live.
- Guests joining go straight into the running match (host streams snapshots; the host-sim already supports add/remove player mid-match and round cycling/intermission). Leaving = existing peer-left / host-migration.
- "Everyone kills everyone" = FFA (team -1), already the default.

## UI (main.ts + index.html + css)

On the Local/Wi-Fi screen (the `📡` screen), present two clear actions:

- **CREATE ROOM**: a room-name input `#local-room-name` (prefilled with a fun random default — reuse/extend the existing room-name or bot-name word lists), and a `#local-create-btn`. On tap: start the continuous-FFA local host with that name; after creation SHOW the room name prominently in the waiting/playing header (e.g. set a `#local-room-title` / reuse `#lobby-title`) so the host can read it out.
- **SCAN ROOMS**: `#local-scan-btn` → calls `listRooms()` → renders rows into `#local-room-list`. Each row: room **name** (big) + host call sign + "N players" + the whole row is a JOIN tap target (`data-room="<code>"`). Tapping joins that code via the existing P2P guest path and shows the room name on entry so the guest verifies it. Empty → `#local-room-list` shows "No rooms found on your network — make sure everyone is on the host's hotspot." Provide a visible **Re-scan** (re-run `listRooms`). Optionally auto-refresh every few seconds while the scan view is open (clear the interval on leave).

Keep Offline QR available below as the no-data fallback. Keep the menu router intact; don't reintroduce VPS options.

CRITICAL (past failure): every `dollar("id")` in main.ts MUST have a matching element in index.html, or `init()` throws on the null ref and silently aborts all later wiring. Add the new ids to BOTH files in lockstep, and null-guard any optional ref. After building, diff `dollar("…")` ids vs index.html ids.

## Risks / Trade-offs

- **No shared data on the hotspot → discovery can't work** (broker unreachable). Mitigation: keep Offline QR fallback; the UI hint tells users to ensure data/hotspot.
- **CGNAT lumps strangers under one public IP** → they could see each other's rooms. Acceptable v1 (rooms are tap-to-join, low harm). Future mitigation: optional 4-digit network PIN (NOT in scope).
- **Public IP via XFF spoofing** — only affects which list you see; rooms are ephemeral and low-value. Acceptable.
- **STUN dependency on a public Google STUN** — only for cross-NAT; same-LAN unaffected. Fine.
- **Migration changes the host but room keeps original publicIP** — the room may briefly be "on" the original network key; acceptable for a LAN party (same hotspot).

## Verification

- `npm run build` + `npm test` green.
- Preview, two tabs against the live `/signal`: tab A `listRooms()` empty → create room "FOO" → tab B `listRooms()` shows FOO with count → tab B joins → both report connected, B spawns into the running match. Use DOM `preview_eval`/`preview_click` (screenshot hangs on WebGL).
- Confirm host-migration + Offline QR still work (don't regress).
