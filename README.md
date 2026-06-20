# SmashCart

Online 3D plane combat on a large flat battlefield. Launch straight into `Quick Play` or share a private room code; bots keep public matches populated when humans are scarce. The game is self-hosted: the Colyseus server, browser client, and vendored runtime assets all live in this repository.

![gameplay](docs/screenshot.png)

## Features

- Server-authoritative multiplayer at 30 Hz with client-side interpolation, local prediction, and reconnect support.
- Flat-world 3D flight with altitude control, slow readable pacing, boost, pickups, and AI bots.
- Quick Play plus 6-character private room codes and share links.
- Desktop and touch controls, including dedicated climb and dive inputs.
- Vendored browser dependencies under `public/vendor/` so deployment does not depend on a CDN.

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

## Tech Stack

- Server: Node.js, TypeScript, Express, Colyseus `0.16`
- Client source: `src/client/*.ts`, bundled into `public/js/*.js`
- Renderer: hand-authored Three.js scene code in `public/js/render3d.js`
- Shared game model: `src/shared/constants.ts` and `src/shared/sphere.ts`

## Local Development

```bash
npm ci
npm run dev
```

Open `http://localhost:2567` in two tabs to test multiplayer. The Colyseus monitor is available at `http://localhost:2567/colyseus` and should be locked down in production.

Useful commands:

```bash
npm run build-client   # rebuild public/js from src/client
npm run build          # rebuild client assets and compile the server into dist/
npm test               # run Vitest
npm start              # run the production build
npm run clean          # remove dist/ cross-platform
```

## Deployment

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

If you front the app with nginx, keep WebSocket upgrade headers enabled for Colyseus.

## Project Layout

```text
src/
  index.ts                 Express + Colyseus bootstrap
  rooms/ArenaRoom.ts       authoritative match loop, bots, combat, pickups
  schema/ArenaState.ts     synchronized room state
  shared/                  shared constants and flat-world vector math
  client/                  browser TypeScript sources
public/
  index.html               menu and HUD shell
  js/                      generated client bundles + hand-authored render3d.js
  css/                     UI styling
  vendor/                  vendored three.js and colyseus browser runtime
  assets/                  audio and legacy art assets
scripts/                   build helpers
openspec/changes/          proposals, specs, and tasks for tracked changes
```

## Tuning

Gameplay tuning lives in `src/shared/constants.ts`. `public/js/constants.js` is generated from that shared source via `npm run build-client`; do not hand-edit the generated constants bundle.

## License

MIT for code. Bundled generated audio is CC0, and legacy art credits remain in `public/assets/CREDITS.txt`.
