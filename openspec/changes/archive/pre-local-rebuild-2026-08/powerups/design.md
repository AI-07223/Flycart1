## Context

Authoritative Colyseus 0.16 server with a small `ArenaState` (players, bullets, timer, phase). Effects must be **server-authoritative** to stay fair, so this change adds server logic + a few synced fields, with client visuals on top. Gameplay constants are mirrored in `public/js/constants.js`. This is the first deliberate schema growth since launch (additive).

## Goals / Non-Goals

**Goals:**
- A fun, readable powerup layer with a starter set of 6 effects.
- Server-authoritative effects (no client trust); minimal, additive schema.
- Works in the current flat arena and ports to the globe later.

**Non-Goals:**
- Persistent unlocks / loadouts / economy (future).
- More than one active powerup at a time (kept simple).
- New game modes. The globe (separate change).

## Decisions

1. **Schema (additive).** `Pickup { type: string, x: number, y: number }` in `pickups: MapSchema<Pickup>`; `Player.power: string` ("" or active type, for visuals); `Bullet.homing: boolean` (for homing-missile rendering + steering). Effect **expiry** is tracked server-side only (a non-synced `Map<id, expiresAt>`), keeping the wire small. *Why:* smallest sync surface that still drives client visuals.

2. **Spawning.** Server keeps up to `PICKUP_MAX` (≈5) pickups, spawning one every `PICKUP_INTERVAL` at a random in-bounds position, type chosen by weight. *Why:* steady supply without clutter.

3. **Collection.** Each tick, test plane↔pickup overlap (radius); on grab: remove the pickup, set `player.power` + server expiry, and `broadcast("pickup", {id, type})` for sound/popup. Repair applies instantly (full heal) and does **not** occupy the timed slot. *Why:* reuses the existing broadcast pattern (like `kill`).

4. **One active power at a time.** A new pickup replaces the current effect (and reverts its modifiers). *Why:* readable for players and simpler to balance. *Alt:* stacking — rejected for v1.

5. **Effect hooks (server-authoritative):**
   - **Rapid** → `tryFire` uses a reduced cooldown for that player.
   - **Spread** → `tryFire` emits 3 bullets at `0, ±spreadAngle`.
   - **Afterburner** → `stepPlane` uses raised cruise/boost speed targets.
   - **Shield** → grant N absorb-charges; `damage()` consumes a charge instead of HP; clears `power` when depleted (drives the bubble visual).
   - **Repair** → instant heal to `MAX_HP` on pickup.
   - **Homing** → `tryFire` spawns `homing` bullets; `stepBullets` gently steers homing bullets toward the nearest enemy (capped turn rate) until they expire.
   On expiry: clear `player.power` and revert any modifiers.

6. **Client visuals.** Pickups = spinning, bobbing, glowing (bloom) icon orbs colored per type; active-power HUD chip with a countdown; shield = translucent bubble around the plane; homing bullets get a distinct color/trail; pickup grab plays a sound + a floating popup. *Why:* clarity + arcade juice, consistent with the polish pass.

7. **Tuning in shared constants** (durations, rapid cooldown factor, spread angle, afterburner factor, shield charges, homing turn rate, spawn interval/max, type weights), mirrored client-side where needed.

## Risks / Trade-offs

- **Balance** (homing/shield can dominate) → tune via constants; modest durations; one-at-a-time; homing turn rate capped and limited shots.
- **Visual clutter** → cap concurrent pickups; clear, distinct icons/colors; subtle idle animation.
- **Schema/version skew** → additive fields + client and server deploy together from `main` (single client), so no mixed-version concern in practice.
- **Bandwidth** → pickups map is tiny (≤5 entries); negligible.

## Migration Plan

Additive schema + server logic + client visuals, deployed together via the existing Coolify-from-`main` pipeline. No data migration. Rollback = revert the change commit and redeploy (pickups simply stop existing).

## Open Questions

- Final set/weights and durations — start from the 6 above; tune in playtesting.
- Should shield coexist with an offensive power (one defensive + one offensive slot) instead of strictly one-at-a-time? (v2 consideration)
- Homing strength: number of shots + turn rate (start conservative).
