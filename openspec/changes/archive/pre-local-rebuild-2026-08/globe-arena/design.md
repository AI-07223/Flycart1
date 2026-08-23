## Context

The authoritative sim is flat 2D (`x`, `y` in world units, `angle` heading), presented in 3D on a flat island; gameplay constants are mirrored client-side for prediction. The netcode (prediction + snapshot interpolation + bullet extrapolation) all assumes a flat plane with great-circle ≡ straight line. Moving to a sphere changes the *geometry of motion* everywhere those assumptions live. The art is arcade-cute (toy island, balloons, blimp), which translates naturally to a toy *planet*. This change has the largest blast radius of any so far and is explicitly a flight-model change — hence its own change, landing after `stability-hardening`.

## Goals / Non-Goals

**Goals:**
- A spherical play surface: great-circle flight, no walls, wrap-around dogfights. **Stage B (true spherical sim) is the committed deliverable** — the unbounded *feel* requires real wrap-around, not just a curved backdrop.
- Server stays authoritative; prediction/interpolation/extrapolation work on the sphere.
- **Planet size scales with player count to hold play density constant** — a bigger lobby gets a bigger world, recomputed between rounds, so encounter cadence feels right whether 4 or 8 planes.
- Preserve the arcade-cute feel and the existing powerup set; compose with `arena-content`'s cover/hotspot map (metric → angular).
- A de-risked path to ship (Stage A as an optional internal look-test on the way to Stage B).

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

10. **Stage B is the deliverable; Stage A is an optional look-test.**
    - **Stage B — true spherical sim (the deliverable).** Swap the authoritative model + netcode + collision to the sphere (decisions 1–9, 11). This is "globe instead of flat" and is the only stage that actually removes the boundary — the unbounded feel needs real wrap-around, because a curved backdrop over a still-bounded sim would let players hit invisible walls and break the illusion.
    - **Stage A — visual curvature (optional internal checkpoint).** Keep the flat 2D sim; bend the *presentation* so the play area reads as the top of a sphere, to validate camera/horizon/feel before the math-heavy Stage B. Not required to ship to production; it's a de-risking step, not a separate release.
    *Why:* the goal ("infinite / not bounded") is only met by Stage B, so we commit to it; Stage A stays available purely to tune the look cheaply first if useful.

11. **Dynamic planet size by player count (constant play density).** `GLOBE_RADIUS` is not fixed — it is computed from the number of bodies in the arena (humans + active bots, always within `[MIN_PLAYERS, MAX_CLIENTS]` = `[4, 8]`). To hold density constant, surface area (`4πr²`) scales with `N`, so **radius scales with √N**: `R = clamp(R_BASE * sqrt(N / N_BASE), R_MIN, R_MAX)`, with `N_BASE ≈ 6`. Recompute **only at round start during the intermission**, and hold `R` fixed for the whole round (never mid-round).
    *Why this is correct and cheap:* state stores **direction unit vectors** (radius-independent) and **angular** speeds / turn-rates / hit-radii, so `R` is only a placement+render scalar. Changing `R` rescales the world **without moving anyone in gameplay terms** — no teleport, aim preserved, collisions unchanged (they're angular). The renderer can ease the planet scale across the 8 s intermission for a smooth inflate/deflate. `arena-content`'s cover/landmarks are stored as **directions + angular sizes**, so they spread proportionally as `R` grows — a spire's "fly-around time" stays constant; optionally scale obstacle *count* with `N` at larger sizes (refinement, not required).
    *Why √N, total bodies, per-round:* √N (not ×N) keeps the variation gentle and tasteful ("not too much, not too little" — ~1.4× across 4→8); counting total bodies (not humans only) matches density to what's actually flying, since bots fill to the floor; per-round resize keeps it non-jarring. `R_MIN`/`R_MAX` are the "not too little / not too much" guardrails.
    *Alternatives considered:* fixed radius (empty at 4, cramped at 8) — rejected; continuous mid-match easing (always "right" but constant breathing + camera/collision churn) — rejected for jank; size by humans only (bots then over-pack a too-small world) — rejected in favour of total bodies. Formula is future-proof: raising `MAX_CLIENTS` later widens the range automatically.

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

- **Coordinate model — resolved:** unit-vector + tangent heading (robust, no pole singularities, and radius-independent so dynamic sizing is free). lat/lon remains a viable lean-wire fallback but is not the plan.
- **Stage A shipping — resolved:** Stage A is an optional internal look-test only; **Stage B is the committed deliverable** (decision 10).
- **Play band — resolved:** allow true full-sphere flight (no artificial band); uniform `acos(2u−1)` spawns avoid pole clustering; unit-tests cover motion through the poles.
- **Sizing tuning (open, by feel):** `R_BASE`, `R_MIN`, `R_MAX`, and `N_BASE` for the √N curve — dial in Stage A's camera test so the floor isn't cramped at 4 and the ceiling still wraps quickly at 8. Whether to also scale obstacle *count* with `N` is a later refinement.
- **Minimap form (open):** rotating mini-globe vs. equirectangular projection — pick by what reads best/cheapest during the renderer task.
