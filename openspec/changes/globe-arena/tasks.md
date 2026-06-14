## 0. Prerequisite

- [x] 0.1 Land `stability-hardening` first (done — shipped to main) (don't port leaky renderer / flat-plane netcode onto a harder coordinate system)
- [x] 0.2 Confirm the coordinate model — RESOLVED: unit vector `p` + **forward unit vector `f`** (tangent), not a scalar heading (no pole singularity; renderer gets up=p, nose=f directly)

## 1. Stage A — visual curvature (flat sim, curved presentation; ships independently)

- [x] 1.1 SKIPPED (Stage A is the optional look-test) — went straight to Stage B, which is the real deliverable
- [x] 1.2 SKIPPED (optional) — chase camera/horizon built directly in the Stage B spherical renderer
- [x] 1.3 SKIPPED (optional) — radius/camera tuned against the real spherical sim instead
- [x] 1.4 SKIPPED (optional internal look-test) — not needed; Stage B implemented and verified directly

## 2. Stage B — shared spherical math

- [x] 2.1 Angular speeds/turn rates + dynamic radius config in `src/shared/constants.ts`; mirrored in `public/js/constants.js`; removed `ARENA_WIDTH/HEIGHT`, `WALL_MARGIN`
- [x] 2.2 Shared spherical helpers in `src/shared/sphere.ts` (+ `public/js/sphere.js`): great-circle `advance`, `turn`, `slerp`, `angBetween`, `tangentize`, `arcDistToPoint`/`arcClosestT`, `randomDir`
- [x] 2.3 Dynamic-radius config + `radiusForBodies(n) = clamp(R_BASE*sqrt(n/N_BASE), R_MIN, R_MAX)`; render converts angular↔world via the synced radius
- [x] 2.4 Map content sphere-native: obstacles stored as **unit-vector dir + angular radius** (built from `OB_SPECS` via `dirFromHotspot`), so they spread proportionally with radius

## 3. Stage B — authoritative server (`ArenaRoom.ts` + schema)

- [x] 3.1 `ArenaState` positions → unit-vector `px/py/pz` + forward `fx/fy/fz` for `Player`/`Bullet`, `px/py/pz` for `Pickup` (breaking; deploy together)
- [x] 3.2 `stepPlane` = great-circle advance + heading turn + bank; wall clamp/`deflect` deleted; solid-obstacle deflect (no hp change) ported to the sphere
- [x] 3.3 `stepBullets` = geodesic advance + swept angular hit (`arcDistToPoint`), earliest-hit obstacle-vs-plane, homing steer in the tangent plane
- [x] 3.4 `collectPickups` angular overlap; `spawn` = uniform random surface dir + tangent heading, clear of solids; spawn-invuln carried over
- [x] 3.5 Powerups on the sphere: spread = ± heading offset in the tangent plane; afterburner = higher angular speed; homing = angular steer
- [x] 3.6 Dynamic planet size: synced `ArenaState.radius`, computed via `radiusForBodies(players.size)` at round start (held fixed per round; positions are directions so nothing teleports)

## 4. Stage B — client netcode + renderer

- [x] 4.1 `_stepPredict` ported to the spherical great-circle step (mirrors server `stepPlane`, incl. obstacle deflect)
- [x] 4.2 `net.sample` interpolation = slerp positions + slerp/re-tangentize forward; bounded slerp extrapolation past the newest snapshot
- [x] 4.3 Planet built in `render3d.js` (grass sphere + atmosphere + starfield) replacing island/water/boundary; clouds orbit
- [x] 4.4 Planes placed/oriented on the surface (up = normal, nose = forward, bank); surface-following chase camera (curved horizon)
- [x] 4.5 Bullets/pickups placed on the sphere; shield bubble follows; eruption VFX on the surface
- [x] 4.6 Minimap replaced with a player-centric radar (bearing + angular distance; wrap-agnostic), showing obstacles/landmarks/players
- [x] 4.7 Reads `state.radius` and eases the rendered planet scale toward it (smooth, never a mid-round pop); all entities placed at the current radius; fog/camera scale with radius

## 5. Rollout safety

- [x] 5.1 DECISION: rollback via git-revert + redeploy (the established flow) instead of a dual flat/sphere runtime flag — that flag would mean carrying the entire old sim as dead code for a solo operator. Rollback = revert the commit, redeploy.
- [x] 5.2 Unit-tested the great-circle step + slerp + angular hits against known cases (`scripts/verify-sphere.cjs`, incl. full-2π wrap and pole-robust basis)

## 6. Verify & ship

- [x] 6.1 `tsc --noEmit` clean; breaking schema reviewed (positions are directions; only pickups + new `radius` synced)
- [x] 6.2 Headless verification (Preview): joins live, decodes the new schema, planet + 12 obstacles built, 4 planes placed exactly on the surface (|pos| = radius+ALT), 1900+ frames pumped with no console errors
- [x] 6.3 Netcode: slerp interpolation + tangentize (no chord-cutting) and spherical prediction/reconciliation implemented and load-verified (live feel is the user's test)
- [x] 6.4 Dynamic-size check: `radiusForBodies` follows √N (571/700/808 for 4/6/8), clamped to R_MIN/R_MAX; radius stable within a round, recomputed at round start; resize doesn't teleport/alter aim (verify-sphere.cjs, 20/20); live shows radius 572 for 4 bodies
- [x] 6.5 Commit (8a3fe6a) → push `main` → redeploy via Coolify (first attempt failed on the host's transient "Server is not functional" blip; retry succeeded ~13 min) → verified live: healthz/page 200, js/sphere.js 200, constants has OB_SPECS, render3d has _buildPlanet
