## Why

Local play exists (P2P + LAN) but joining still requires knowing a room code or scanning a QR per guest. For a hotspot LAN party the experience should be: host taps **Create Room**, everyone else taps **Scan Rooms**, sees the room by name, and taps to join — zero typing, free join/leave, the match never stops. Browsers can't scan a LAN or run a server socket, but phone hotspots share mobile data, so the existing signaling broker can act as a **network-scoped room directory**.

## What Changes

- **Broker room directory** (`src/signal.ts`): rooms gain a `name`, host call sign, live player count, and the host's public IP. A new `list` request returns the open rooms **on the requester's own network** (same public IP) — so a guest only sees rooms from their hotspot. Host-migration and TTL pruning still work.
- **Create Local Room**: host names the room (fun random default) and drops straight into a continuous **everyone-kills-everyone (FFA)** match — no lobby ready-up gate. The room name is shown prominently so the host can read it out.
- **Scan Rooms**: guests see a live list of rooms on their network (name + host + player count) and tap to join via the existing P2P path. The room name is shown on join so they can verify. Empty list → a clear "make sure you're on the host's hotspot" hint, plus a re-scan.
- **Free join/leave, continuous rounds**: guests late-join the running FFA and spawn immediately; leaving uses the existing peer-left / host-migration handling; rounds keep cycling.
- **Reliability**: add a public **STUN** server to the WebRTC config so peer connects work across NATs (same-LAN still uses local candidates).
- The manual **Offline QR** path stays as the no-data fallback. No VPS options return.

## Capabilities

### New Capabilities
- `lan-room-browser`: a network-scoped room directory in the signaling broker plus the client UI to create named, continuous-FFA local rooms and discover/join them with zero typing.

### Modified Capabilities
<!-- none: no published specs in openspec/specs/ -->

## Impact

- `src/signal.ts` — RoomState gains `name`/`hostName`/`count`/`publicIP`/`open`; capture public IP from the upgrade request (X-Forwarded-For first hop behind Traefik, fallback `req.socket.remoteAddress`); the `host` message carries name+hostName; new `list` → `rooms` reply filtered by public IP, live host, and not-full; counts maintained on join/leave; migration preserves the name.
- `src/client/net-p2p.ts` — host registration sends name+call sign; a discovery call (`list` → `rooms`); STUN in the `RTCPeerConnection` ICE config; guest late-join into an in-progress match.
- `src/client/main.ts` + `public/index.html` + `public/css/style.css` — Create Room (name input) + Scan Rooms (live room list) UI on the Local/Wi-Fi screen; show room name after create and on join; keep the menu router and Offline QR fallback intact. (Keep every `dollar("id")` matched to an element — a missing id throws and aborts init.)
- No schema/sim changes beyond defaulting local rooms to continuous FFA. Constraint: a hotspot with **no** shared data can't use discovery (browser limitation) → Offline QR fallback. Possible future: optional 4-digit network PIN to disambiguate CGNAT (not in scope).
- Deploy: Coolify (flaky npm-ci, 5× retry loop — be patient).
