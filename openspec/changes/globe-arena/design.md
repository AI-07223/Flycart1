## Context

The authoritative sim is flat 2D (`x`, `y` in world units, `angle` heading), presented in 3D on a flat island; gameplay constants are mirrored client-side for prediction. The netcode (prediction + snapshot interpolation + bullet extrapolation) all assumes a flat plane with great-circle ≡ straight line. Moving to a sphere changes the *geometry of motion* everywhere those assumptions live. The art is arcade-cute (toy island, balloons, blimp), which translates naturally to a toy *planet*. This change has the largest blast radius of any so far and is explicitly a flight-model change — hence its own change, landing after `stability-hardening`.

## Goals / Non-Goals

**Goals:**
- A spherical play surface: great-circle flight, no walls, wrap-around dogfights.
- Server stays authoritative; prediction/interpolation/extrapolation work on the sphere.
- Preserve the arcade-cute feel and the existing powerup set.
- A de-risked path to ship (staged).

**Non-Goals:**
- Multiple planets / 3D free-flight off the surface (planes stay on the surface, like a top-down game wrapped onto a sphere).
- New game modes or altitude as a mechanic. (NOTE: the earlier "no obstacles/terrain" non-goal is **lifted** — the `arena-content` change adds a topology-agnostic obstacle/cover/hotspot map layer that composes onto the sphere by swapping its pluggable distance metric to angular; no map reauthoring. Obstacles deal **no** environment damage. Altitude remains out of scope.)
- Changing the powerup set, audio, matchmaking, or netcode *strategy* (still interpolation + prediction, not rollback).

## Decisions

1. **Surface model: top-down wrapped onto a sphere.** Planes move on the 2-sphere surface at a fixed "altitude" (render radius slightly above the planet). The state is a position on the sphere plus a heading in the local tangent plane. *Why:* keeps the proven top-down combat feel; the sphere only changes how "straight ahead" curves.

2. **Coordinate representation — unit vector + tangent heading (recommended).** Store position as a unit vector `(px,py,pz)` and a scalar `heading` (angle in the local tangent frame relative to a stable reference like the local "east"/north basis). Movement: build the tangent forward vector from `heading`, rotate the position vector about the axis `pos × forward` by `angularSpeed·dt` (great-circle step), then re-derive the heading in the new tangent frame. *Why:* no pole singularities (lat/lon math breaks at the poles), clean great-circle steps, and slerp/geodesic interpolation is straightforward. *Alt — lat/lon (2 floats, leanest wire):* rejected as the default for pole singularities and heading wrap pain, but viable if wire size matters (costs 1 extra float per entity to use the vector form). **This is the key decision to confirm before implementing.**

3. **Distance & collision → angular.** Replace squared-Euclidean distance with the dot product of unit vectors: `cosθ = a·b`, angular separation `θ`. Hit when `θ ≤ angularHitRadius` (a constant derived from the old pixel radius ÷ `GLOBE_RADIUS`). Swept collision (from `stability-hardening`) becomes "did the bullet's geodesic arc pass within the angular radius this step". *Why:* the only correct notion of nearness on a sphere.

4. **No walls.** Delete `WALL_MARGIN`, the clamp, and `deflect()` entirely — the surface is unbounded/wrapping. *Why:* the whole point of a globe; also removes code.

5. **Spawning.** Uniform random point on the sphere (normalize a Gaussian/`acos(2u-1)` latitude to avoid clustering at poles), random heading. Spawn-clear/invuln from `stability-hardening` carries over (angular clear-area test). 

6. **Renderer: toy planet.** Replace island/water/boundary build with a sphere (continents via the existing canvas-grass texture wrapped equirectangularly, or simple painted landmasses) + a translucent atmosphere shell; keep clouds/balloons/blimp orbiting at radius. Place each plane at `pos·(GLOBE_RADIUS+alt)`, orient it so its up = surface normal and its nose = tangent forward (bank as today). Chase camera sits behind/above along the surface tangent so the horizon curves; the planet auto-rotates under the player. *Why:* maximal toy-world charm with mostly existing assets.

7. **Netcode on the sphere.** Prediction `_stepPredict` mirrors the spherical step (same great-circle rotate). Snapshot interpolation **slerps** position unit vectors and short-angle-interpolates the tangent heading; bullet extrapolation advances along the geodesic (rotate about the bullet's `pos × forward` axis). The `INTERP_DELAY`, reconciliation easing, and snap-threshold concepts are unchanged — only the space they operate in. *Why:* reuse the validated strategy; swap Euclidean ops for spherical ones.

8. **Powerups in spherical space.** Pickup placement = random surface points; homing steer = rotate the bullet heading toward the target within the tangent plane (angular turn cap); spread = ± heading offset in the tangent plane; afterburner = higher angular speed. Effects/durations unchanged. *Why:* the powerup layer ports mechanically.

9. **HUD/minimap.** Minimap → a small rotating 3D globe (cheap, reuses the planet material) or an equirectangular 2D projection; off-screen cues point along the great-circle bearing to the target. *Why:* a rectangular minimap is meaningless on a wrapping world.

10. **Staged delivery (recommended).**
    - **Stage A — visual curvature only.** Keep the flat 2D sim; bend the *presentation* so the play area reads as the top of a large sphere (curved ground, horizon falloff). No netcode/collision change. Low risk, ships independently, validates the look and camera.
    - **Stage B — true spherical sim.** Swap the authoritative model + netcode + collision to the sphere (decisions 1–9). This is "globe instead of flat".
    *Why:* Stage A buys the visual win cheaply and lets us tune the camera/feel before committing to the math-heavy Stage B. Each stage is shippable.

## Risks / Trade-offs

- **Blast radius / regression risk** — touches sim, netcode, renderer, HUD at once. Mitigation: land `stability-hardening` first; do Stage A then Stage B; keep a feature flag to fall back to the flat arena during rollout.
- **Heading bookkeeping on the sphere** (parallel-transport drift, reference-frame choice) — pick a robust local basis and re-derive heading each step; unit-test the great-circle step against known cases.
- **Pole/edge cases** — unit-vector model avoids the worst; still test motion through/near the poles.
- **Wire size** — vector form adds ~1 float per entity vs. lat/lon; negligible at our entity counts (≤8 planes, ≤~40 bullets).
- **Camera comprehension** — a curved horizon + auto-rotating planet can disorient; tune camera distance/pitch in Stage A.
- **Breaking state shape** — server + client deploy together from `main` (single client), so no mixed-version concern, but old saved links/states are irrelevant anyway.

## Migration Plan

Land after `stability-hardening`. Ship **Stage A** (visual curvature) first as a self-contained increment; validate the look live. Then **Stage B** (spherical sim) behind a flag defaulting off, flip on once verified, via the existing Coolify-from-`main` pipeline. Rollback = flip the flag / revert the commit and redeploy (returns to the flat arena). No data migration (ephemeral match state).

## Open Questions

- **Confirm the coordinate model:** unit-vector+heading (recommended, robust) vs. lat/lon (leanest wire)?
- `GLOBE_RADIUS` and the resulting feel — how "small" should the planet be (how fast does the horizon wrap)? Tune in Stage A.
- Minimap form: rotating mini-globe vs. equirectangular projection?
- Do we keep an invisible "play band" (avoid poles) or allow true full-sphere flight including over the poles?
- Should Stage A ship to production on its own, or only as an internal checkpoint before Stage B?
