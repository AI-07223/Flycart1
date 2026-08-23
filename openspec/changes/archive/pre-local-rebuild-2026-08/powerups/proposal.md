## Why

SmashCart now feels and looks good, but every plane is identical and there's little gameplay depth or comeback potential — once you're losing, nothing changes the dynamic. **Powerups** add variety, surprise, and reasons to fight over the map (and to keep playing). They fit the current flat arena and carry over to the future globe world.

## What Changes

- **Pickups spawn on the map** — floating, spinning, glowing crates/orbs (one icon/color per type), up to a max, respawning over time.
- **Fly through a pickup → a timed, server-authoritative effect** (or an instant one for repair). One active powerup at a time (a new pickup replaces the current).
- **Starter set (6):** 🔱 Spread shot · ⚡ Rapid fire · 🛡️ Shield · 🚀 Afterburner · ❤️ Repair · 🎯 Homing missiles.
- **Feedback** — HUD chip showing the active powerup + remaining time; a shield bubble around shielded planes; distinct homing-bullet look; a pickup sound + "grab" popup.
- **Schema additions (additive):** a `pickups` map and small per-entity fields (`Player.power`, `Bullet.homing`). Not breaking — additive fields; client and server deploy together.

## Capabilities

### New Capabilities
- `powerups`: map pickups that spawn/despawn, are collected by flying through them, and grant timed server-authoritative effects from a defined set, surfaced to the player via HUD and in-world visuals.

### Modified Capabilities
<!-- None — no existing specs. Adds new synced fields to ArenaState (additive). -->

## Impact

- **Server (most logic):**
  - `src/schema/ArenaState.ts` — new `Pickup` schema + `pickups: MapSchema<Pickup>`; `Player.power: string`; `Bullet.homing: boolean`.
  - `src/rooms/ArenaRoom.ts` — pickup spawning, pickup↔plane collection, active-effect tracking + expiry, and effect hooks in firing (spread/rapid/homing), movement (afterburner), and damage (shield); homing-bullet steering in the bullet step; instant repair.
  - `src/shared/constants.ts` — powerup tuning (durations, cooldown/speed factors, shield charges, spawn interval/max, type weights). Mirror gameplay-relevant values into `public/js/constants.js`.
- **Client:**
  - `public/js/render3d.js` — pickup meshes (spinning/glowing), shield bubble, homing-bullet look.
  - `public/js/main.js` — active-powerup HUD chip + timer; pickup sound + popup on a "pickup" event.
  - `public/index.html` / `public/css/style.css` — HUD chip element + styles.
  - `public/js/audio.js` — a pickup sound (reuse/extend the SFX set).
- **Unaffected:** matchmaking/rooms, deployment pipeline, the monitor auth, the visual/audio polish.
