## 1. Schema + tuning

- [ ] 1.1 Add `Pickup` schema + `pickups: MapSchema<Pickup>` to `ArenaState`; add `Player.power: string` and `Bullet.homing: boolean`
- [ ] 1.2 Add powerup tuning to `src/shared/constants.ts` (durations, rapid cooldown factor, spread angle, afterburner factor, shield charges, homing turn rate, spawn interval/max, type weights); mirror gameplay-relevant values into `public/js/constants.js`

## 2. Spawning (server)

- [ ] 2.1 Maintain up to `PICKUP_MAX` pickups; spawn one every `PICKUP_INTERVAL` at a random in-bounds position with weighted type
- [ ] 2.2 Clear/repopulate pickups appropriately on round reset

## 3. Collection + active-effect lifecycle (server)

- [ ] 3.1 Each tick, detect plane↔pickup overlap; on grab remove the pickup, set `player.power` + server-side expiry, and `broadcast("pickup", {id, type})`
- [ ] 3.2 On expiry, clear `player.power` and revert modifiers; collecting a new powerup replaces the current one

## 4. Effects (server-authoritative)

- [ ] 4.1 Rapid fire (reduced per-player cooldown in `tryFire`) and Spread shot (3 bullets at `0, ±angle`)
- [ ] 4.2 Afterburner (raised speed targets in `stepPlane`) and Repair (instant full heal on pickup)
- [ ] 4.3 Shield (N absorb-charges; `damage()` consumes a charge before HP; clears when depleted)
- [ ] 4.4 Homing missiles: spawn `homing` bullets and steer them toward the nearest enemy (capped turn rate) in `stepBullets`

## 5. Client visuals + feedback

- [ ] 5.1 Render pickups in `render3d.js` (spinning, bobbing, glowing icon orbs colored per type)
- [ ] 5.2 Shield bubble around shielded planes; distinct look/trail for homing bullets
- [ ] 5.3 Active-powerup HUD chip + countdown in `main.js` (+ `index.html`/`css`); pickup sound + popup on the `pickup` event (add a pickup SFX in `audio.js`)

## 6. Verify & ship

- [ ] 6.1 Local headless verification (Preview): pickups spawn + render, collecting applies/expires effects, shield absorbs, homing steers, HUD chip updates, no console errors
- [ ] 6.2 `tsc --noEmit` clean; quick balance pass on durations/weights
- [ ] 6.3 Commit → push `main` → redeploy via Coolify; verify live (game 200, matchmake + WebSocket 101, pickups visible)
