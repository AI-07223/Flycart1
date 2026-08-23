# SmashCart

Local Wi-Fi dogfight: a server-authoritative 3D plane combat arena you host on your own laptop or Raspberry Pi, with friends joining from phones and tablets on the same network.

![gameplay](docs/screenshot.png)

## Features

- Server-authoritative multiplayer at 30 Hz with client-side prediction and interpolation.
- One process IS one room: Express serves the client, a single plain-WebSocket room host (`src/server/RoomHost.ts`) drives the simulation (`src/sim/GameSim.ts`).
- Installable PWA — fullscreen landscape on phones, works offline after first load.
- Bots fill the lobby so a match always has targets; difficulty is host-adjustable.
- 12 powerups including ghost and magnet, plus mines, homing rounds, freeze ray, EMP, and shields.
- Hangar customization: skin color, body shape, accent, trail, and livery.
- Zero-account join: scan the host's QR code or type `http://<lan-ip>:2567` — mDNS advertisement makes the room discoverable on the LAN.
- Flat-world flight model with altitude control, boost, and readable pacing.

## Controls

### Desktop

| Action | Keys |
| ------ | ---- |
| Turn | `A` / `D` or `Left` / `Right` |
| Climb | `W` or `Up` |
| Dive | `S` or `Down` |
| Boost | `Shift` |
| Fire | `Space` |
| Pause | `P` |
| Mute | `M` |

### Mobile

Use the on-screen `LEFT`, `RIGHT`, `CLIMB`, `DIVE`, `BOOST`, and `FIRE` buttons.

## How to play with friends

1. **Host:** run the server on any machine on the same network (laptop, desktop, Raspberry Pi):
   ```bash
   npm run build && npm start
   ```
2. **Host:** open `http://localhost:2567`, create a room, and start the match when everyone is in.
3. **Friends:** connect to the same Wi-Fi, then either
   - scan the QR code shown by the host client, or
   - browse to `http://<lan-ip>:2567` (the server also advertises itself via mDNS/Bonjour as "SmashCart").

**Hotspot option:** no router needed — enable the hotspot on one phone, connect the host machine *and* every other phone to that hotspot, then follow the steps above.

## Android app (APK)

A Capacitor-wrapped APK ships with the repo and is served by the game itself:

- **Download:** open the game in any browser and tap **GET THE ANDROID APP** on the home screen (`/apk/smashcart.apk`).
- **One-tap game Wi-Fi:** inside the APK, the home screen has a **Game Wi-Fi** card — tap START to open a local-only hotspot (Android's `startLocalOnlyHotspot`, no internet needed). Friends join that network; connect your host PC to it and run the server as above.
- **Rebuild the APK** after client changes:
  ```bash
  npm run build-apk     # build-client + cap sync + gradle assembleDebug -> public/apk/smashcart.apk
  ```
  Requires JDK 17+ and an Android SDK (platform 36 + build-tools).

The APK bundles the UI for instant offline launch but still connects to a LAN server for matches.

Everything stays on the LAN. There is no internet matchmaking, account, or cloud dependency.

## Local Development

```bash
npm ci          # install exact locked dependencies
npm run dev     # watch-mode server on port 2567
```

Useful commands:

```bash
npm run build-client   # rebuild public/js from src/client
npm run build          # rebuild client assets and compile the server into dist/
npm test               # run Vitest
npm start              # run the production build
npm run clean          # remove dist/ cross-platform
```

Open `http://localhost:2567` in two browser tabs to test multiplayer locally.

## Project Layout

```text
src/
  index.ts                 Express + ws bootstrap, mDNS advertisement
  server/RoomHost.ts       transport glue: join handshake, validation,
                           rate limiting, leader checks, event fan-out
  sim/GameSim.ts           framework-free authoritative simulation:
                           flight, bots, combat, pickups
  sim/types.ts             sim interfaces + serializable snapshot
  shared/protocol.ts       frozen wire contract (client ⇄ server messages)
  shared/constants.ts      gameplay tuning constants
  shared/                  shared vector math, flight model, loadout data
  client/                  browser TypeScript sources (menu.ts, net-ws.ts, ...)
public/
  index.html               menu and HUD shell
  js/                      generated client bundles + hand-authored render3d.js
  css/                     UI styling
  vendor/                  vendored three.js browser runtime
  assets/                  audio and art assets
scripts/                   build helpers
tests/                     Vitest suites (sim math + RoomHost protocol)
openspec/changes/archive/  historical change specs
deploy/                    docker/systemd/nginx deployment helpers
```

Removed during the local-only rebuild: Colyseus rooms/schema, P2P signaling and host migration, the `/colyseus` monitor, Sentry error tracking, and the leaderboard backend.

## Tuning

Gameplay tuning lives in `src/shared/constants.ts`. `public/js/constants.js` is generated from that shared source via `npm run build-client`; do not hand-edit the generated constants bundle.

## Deployment

The same server runs on any machine on the LAN — a laptop, a mini PC, or a Pi. Two conveniences are kept in the repo:

### Docker

```bash
docker compose up -d --build
```

### systemd

```bash
git clone <repo> /opt/smashcart && cd /opt/smashcart
npm ci
npm run build
sudo cp deploy/smashcart.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now smashcart
```

If you front the app with a reverse proxy, keep WebSocket upgrade headers enabled for `/ws`.

## License

MIT for code. Bundled generated audio is CC0, and legacy art credits remain in `public/assets/CREDITS.txt`.
