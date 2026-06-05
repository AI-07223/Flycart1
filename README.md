# 🛩️ SmashCart

Online, top-down **plane combat arena** — fly, shoot, and smash everyone out of the
sky. Built to be instantly playable and easy to share with friends: click **Quick
Play** and you're dogfighting in seconds, or spin up a private room and send the
link. Empty slots are filled with AI bots so a match is never empty.

Authoritative **Colyseus** multiplayer server + a dependency-free **HTML5 Canvas**
client, designed to be self-hosted on your own VPS.

![gameplay](docs/screenshot.png)

## Features

- **Real-time online multiplayer** — server-authoritative simulation at 30 Hz with
  client-side smoothing/interpolation.
- **Quick Play + private rooms** — `?room=CODE` share links; bots auto-fill to keep
  the arena lively.
- **Fast, one-axis controls** — auto-thrust; you steer, boost, and fire. Anyone gets
  it in five seconds.
- **Plays on phones** — on-screen FIRE/BOOST buttons plus **gyro tilt-to-steer**
  (tilt your phone to bank), with a tap-to-recenter button. Falls back to on-screen
  arrows if you turn gyro off.
- **Juice** — sprite planes with banking, smoke trails, boost flames, bullet tracers,
  particle explosions, screen shake, hit-stop, a kill feed, floating "+1 SMASH!"
  popups, a damage vignette, low-health screen pulse, and a minimap.
- **Procedural audio** — looping background music, engine drone, gunfire, explosions,
  kill jingle, and UI sounds — all synthesized with the Web Audio API (no audio files).
- **CC0 art** — plane sprites from Kenney's *Pixel Shmup* pack (public domain).

## Controls

**Desktop**

| Action | Keys |
| ------ | ---- |
| Steer  | `A` / `D` or `◀` / `▶` |
| Boost  | `W` / `Shift` |
| Fire   | `Space` |
| Pause  | `P` |
| Mute   | `M` |

**Mobile** — on-screen **FIRE** and **BOOST** buttons. Steering is **gyro tilt** by
default (tilt the phone left/right; tap **⟳** to recenter neutral). Uncheck *"Tilt to
steer"* on the start screen to use on-screen **◀ ▶** arrows instead. iOS prompts for
motion permission on first start.

## Tech stack

- **Server:** Node.js + [Colyseus](https://colyseus.io) `0.16` (`@colyseus/schema` v3),
  Express for static hosting, TypeScript.
- **Client:** vanilla JS + Canvas 2D, Colyseus browser client vendored at
  `public/vendor/colyseus.js` (no CDN needed).

> **Version note:** the stack is pinned to the **Colyseus 0.16 line** because the
> published browser client (`colyseus.js@0.16.x`) ships schema **v3**, while server
> core `0.17` requires schema **v4** — mixing them breaks state decoding in the
> browser. Keep server and client on the same major line.

## Local development

```bash
npm install          # install deps + vendor the browser client
npm run dev          # tsx watch — http://localhost:2567
```

Open http://localhost:2567 in two tabs to test multiplayer. The Colyseus monitor is
at http://localhost:2567/colyseus (lock this down in production).

## Production build

```bash
npm run build        # tsc -> dist/
npm start            # node dist/index.js
```

## Deploying to your VPS

### Option A — Docker (recommended)

```bash
docker compose up -d --build
# app on :2567 — put nginx in front for TLS (see deploy/nginx.conf.example)
```

### Option B — systemd

```bash
git clone <repo> /opt/smashcart && cd /opt/smashcart
npm ci && npm run build
sudo cp deploy/smashcart.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now smashcart
```

Then reverse-proxy with nginx (WebSocket upgrade headers are **required** for
Colyseus — see [`deploy/nginx.conf.example`](deploy/nginx.conf.example)) and add TLS
with certbot.

## Project layout

```
src/                       Colyseus server (TypeScript)
  index.ts                 bootstrap: serves client + WebSocket, defines room
  rooms/ArenaRoom.ts       authoritative game loop, physics, bots, scoring
  schema/ArenaState.ts     synchronized state (players, bullets, timer)
  shared/constants.ts      gameplay tuning
public/                    static client (served by the server)
  index.html, css/, js/    UI + canvas client (constants/audio/assets/input/net/render/main)
  vendor/colyseus.js       vendored browser client
  assets/                  CC0 sprites (Kenney Pixel Shmup) + CREDITS
deploy/                    systemd unit + nginx example
Dockerfile, docker-compose.yml
```

## Tuning

Gameplay values live in `src/shared/constants.ts` (server, authoritative) mirrored in
`public/js/constants.js` (client prediction/rendering). Edit speeds, damage, round
length, arena size, bot count, etc. — **keep the two files in sync.**

## Credits

- Plane/tile sprites: **"Pixel Shmup" by Kenney** — [kenney.nl](https://kenney.nl),
  CC0 1.0 (public domain). See `public/assets/CREDITS.txt`.
- Multiplayer framework: [Colyseus](https://colyseus.io).

## License

MIT (code). Bundled art is CC0.
