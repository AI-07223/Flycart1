## 1. Broker room directory (src/signal.ts)

- [x] 1.1 Capture public IP: stash `(ws as any)._signalIP = clientIP(req)` in the `connection` handler; `clientIP` = first X-Forwarded-For token, fallback `req.socket.remoteAddress`
- [x] 1.2 Extend `RoomState` with `name?`, `hostName?`, `publicIP?`
- [x] 1.3 `host` message: accept+store `name` (keep existing if absent — migration), `hostName`; set `r.publicIP = ws._signalIP`
- [x] 1.4 Add `list` message handled BEFORE the room-required/get-or-create block → reply `{ type:"rooms", rooms:[{code,name,hostName,count}] }` for open, non-full, live-host rooms where `publicIP === ws._signalIP` (count = guests.size+1, cap ~50)
- [x] 1.5 Keep TTL prune + host-migration intact (name/publicIP preserved across migration)

## 2. Client P2P (src/client/net-p2p.ts)

- [x] 2.1 Host registration sends `{type:"host", room, name, hostName}`
- [x] 2.2 Add `listRooms()` discovery: short-lived /signal socket → send `{type:"list"}` → resolve `rooms` (3s timeout → [])
- [x] 2.3 Add STUN `{iceServers:[{urls:"stun:stun.l.google.com:19302"}]}` to EVERY `RTCPeerConnection` (host-per-guest + guest)
- [x] 2.4 `startLocalRoom(name)` (or flag): start host-sim in FFA + phase playing immediately (no lobby gate); guests late-join spawn into the running match

## 3. Continuous FFA / free join-leave

- [x] 3.1 Local rooms default to FFA (team -1), continuous play, rounds keep cycling (reuse existing round/intermission loop)
- [x] 3.2 Guest joining mid-match spawns immediately (no ready-up gate); leaving uses existing peer-left / host-migration — verify no regression

## 4. UI (main.ts + index.html + style.css)

- [x] 4.1 Local/Wi-Fi screen: CREATE ROOM with `#local-room-name` (fun random default) + `#local-create-btn` → start continuous-FFA local host; show room name prominently after creation (`#local-room-title` / lobby header)
- [x] 4.2 SCAN ROOMS `#local-scan-btn` → `listRooms()` → render rows into `#local-room-list` (name + host + N players, row = JOIN tap target `data-room`); tap → P2P join + show room name to verify
- [x] 4.3 Empty list hint + visible Re-scan; optional auto-refresh while scan view open (clear on leave)
- [x] 4.4 Keep Offline QR fallback + menu router + no VPS options; add all new ids to index.html in lockstep with main.ts dollar() refs; null-guard optional refs

## 5. Integrate, verify, deploy (orchestrator)

- [x] 5.1 `npm run build` (esbuild + tsc) + `npm test` green; diff dollar() ids vs index.html (no missing → no init abort)
- [x] 5.2 Preview two-tab test on live /signal: A create "FOO" → B listRooms shows FOO → B taps join → both connected, B spawns into running match; host-migration + Offline QR unregressed
- [x] 5.3 Commit, push, Coolify redeploy (patient — 5× npm-ci retry), verify live (broker `list` works, room browser serves)
