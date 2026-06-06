## 0. Prerequisite

- [ ] 0.1 Land `stability-hardening` first (don't port leaky renderer / flat-plane netcode onto a harder coordinate system)
- [ ] 0.2 Confirm the coordinate model (unit-vector+heading recommended vs. lat/lon) — see design Open Questions

## 1. Stage A — visual curvature (flat sim, curved presentation; ships independently)

- [ ] 1.1 Replace the flat island/water/boundary in `render3d.js` with a large curved ground / partial-globe surface so the play area reads as the top of a planet
- [ ] 1.2 Adjust the chase camera + fog/horizon so the world curves away at the horizon; keep the flat 2D state mapping (x→arc) for now
- [ ] 1.3 Tune `GLOBE_RADIUS`-equivalent curvature + camera distance/pitch for readability; verify the existing flat gameplay still works unchanged
- [ ] 1.4 (Optional) Ship Stage A to production as a visual-only increment and gather feel feedback

## 2. Stage B — shared spherical math

- [ ] 2.1 Add `GLOBE_RADIUS`, angular speeds/turn rates, and angular hit radii to `src/shared/constants.ts`; mirror into `public/js/constants.js`; remove `ARENA_WIDTH/HEIGHT`, `WALL_MARGIN`
- [ ] 2.2 Implement shared spherical helpers (great-circle step: rotate position about `pos × forward`; tangent-frame heading derive; slerp; angular distance) usable by both server and client prediction

## 3. Stage B — authoritative server (`ArenaRoom.ts` + schema)

- [ ] 3.1 Change `ArenaState` position representation (unit-vector `px/py/pz` + tangent `heading`, or `lat/lon`) for `Player`, `Bullet`, `Pickup` (breaking; deploy together)
- [ ] 3.2 Rewrite `stepPlane` as a great-circle advance + bank; delete wall clamp/`deflect`
- [ ] 3.3 Rewrite `stepBullets` (geodesic advance + angular/swept hit test) and homing steer in the tangent plane
- [ ] 3.4 Rewrite `collectPickups` (angular overlap) and `spawn` (uniform random surface point + heading; carry over spawn-invuln/clear-area)
- [ ] 3.5 Port spread/afterburner powerup math to the tangent plane / angular speed

## 4. Stage B — client netcode + renderer

- [ ] 4.1 Port `_stepPredict` to the spherical great-circle step (mirror 3.2)
- [ ] 4.2 Port `net.sample` interpolation to slerp positions + tangent-heading interpolation; bullet extrapolation along the geodesic
- [ ] 4.3 Build the planet in `render3d.js` (sphere surface + continents/water + atmosphere) replacing island/water/boundary; orbit the decor
- [ ] 4.4 Place/orient planes on the surface (up = normal, nose = tangent heading, bank as today); surface-following chase camera with curved horizon
- [ ] 4.5 Place bullets/pickups on the sphere; shield bubble + homing visuals on the surface
- [ ] 4.6 Replace the minimap with a rotating mini-globe or equirectangular projection; wrap-aware off-screen target cues

## 5. Rollout safety

- [ ] 5.1 Put Stage B behind a feature flag defaulting to the flat arena; allow quick fallback during rollout
- [ ] 5.2 Unit-test the great-circle step + slerp against known cases (incl. near/through poles)

## 6. Verify & ship

- [ ] 6.1 `tsc --noEmit` clean; review the breaking schema shape
- [ ] 6.2 Local headless verification (Preview): fly all the way around the world (wrap), no walls, hits register by angular distance, homing pursues on the surface, planes hug/bank to the surface, horizon curves, minimap reads correctly, no console errors
- [ ] 6.3 Netcode check on the sphere: remote planes interpolate along the surface (no chord-cutting), local prediction has no rubber-band, bullets follow geodesics
- [ ] 6.4 Commit → push `main` → redeploy via Coolify; flip the flag on once verified; verify live
