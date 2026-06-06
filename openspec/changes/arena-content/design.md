## Context

The authoritative sim (`src/rooms/ArenaRoom.ts`) runs in flat 2D (`x`, `y`, `angle`) inside a bounded rectangle (`ARENA_WIDTH` × `ARENA_HEIGHT`) with wall clamp + `deflect()` at the edges. Bullets advance per tick and use a swept segment-vs-circle test (`segHitsCircle`) against planes. Pickups spawn at uniform-random interior positions (`maintainPickups`). The renderer (`public/js/render3d.js`) draws a flat grass island over water with decorative props and a 2D `_drawMinimap`. There is **no gameplay content** in the space itself.

We want to add cover, a contested centre, and orientation landmarks — without changing the flight feel and without ever letting the environment damage a player. The same content must port to the planned spherical world (`globe-arena`) with minimal rework, so the design is **topology-agnostic**: map data is plain positions/radii, and every distance/overlap test the new code performs goes through one pluggable metric that is Euclidean today and angular on the sphere later.

This builds directly on `stability-hardening` (already in the tree): we reuse its `deflect()` and `segHitsCircle()` and its `disposeObject()` discipline on the client.

## Goals / Non-Goals

**Goals:**
- A single **data-driven map definition** in `src/shared/constants.ts` (mirrored in `public/js/constants.js`): obstacle list `{ position, radius, height, kind }`, a hotspot position, zone radii, and pickup spawn-weighting params.
- **Cover obstacles** that (a) block bullets for line-of-sight cover and (b) are solid to planes (deflect/slide), with **zero HP change ever**.
- A **central hotspot** that biases powerup spawns toward the middle to create a contested centre.
- **Orientation landmarks** and **zoning** (hot centre / cover mid-ring / open edges) expressed through placement.
- **Purely-visual dynamic flavour** (eruption/drift) with no gameplay effect.
- A **pluggable distance/collision metric** so identical map data drives both the flat arena and the future globe.
- **No `ArenaState` schema change** — obstacles are static shared geometry; only pickups (already synced) move.

**Non-Goals:**
- Any environmental damage, hazard zones, or instant-death terrain. **Explicitly excluded** — the only thing that changes a player's HP remains an enemy bullet.
- Altitude / 3D flight. The sim stays 2D; obstacle `height` is for rendering only.
- Destructible / moving obstacles (static this change).
- The spherical simulation itself (that is `globe-arena`; this change only makes its map content composable).
- New powerup types or HUD changes (the powerup *set* is unchanged; only *where* pickups spawn changes).

## Decisions

### 1. Map content is static shared data, not synced state
Obstacles, hotspot, landmarks, and zone radii are constants both processes already hold (server imports `src/shared/constants.ts`; client mirrors `public/js/constants.js`). The server computes collisions against them; the client renders them at the same coordinates. Nothing about them is broadcast.

- **Why:** they never move, so syncing would waste bandwidth and force a breaking `ArenaState` change. Keeping them in the existing shared-constants mirror matches how `ARENA_WIDTH` etc. are already shared.
- **Alternative considered:** add an `obstacles` MapSchema to `ArenaState` for server-authored maps / future destructibility. Rejected for now — breaking schema change, more patch traffic, and destructibility is a non-goal. The data shape (`{position,radius,height,kind}`) is chosen so it *could* migrate to schema later without reauthoring.

### 2. Obstacle behaviour is derived from `kind`, and damage is structurally impossible
Each obstacle's `kind` maps to two booleans:

| kind | solid (planes deflect) | blocksBullets | role |
|---|---|---|---|
| `spire` / `rock` / `tower` | yes | yes | full hard cover |
| `arch` | yes | yes | hard cover (modelled as solid in 2D) |
| `ring` | no | no | cosmetic fly-through skill gate |

The collision code lives entirely in `stepPlane` (deflect) and `stepBullets` (block). **Neither path calls `damage()`** — there is no code route from environment contact to HP. This is the enforced invariant, asserted in specs and verified in tasks.

- **Why two flags instead of one "solid":** bullets and planes have independent needs (a ring blocks neither; a future "force field" could block bullets but not planes). Cheap to express, future-proof.
- **Alternative considered (noted as fallback):** *bullet-blockers only* — obstacles block shots but planes fly over them freely (no plane collision at all). Simpler and zero risk of deflect-related rubber-banding, but loses the "weave through the spires" feel. We choose **solid + no-damage** as primary and keep bullet-blockers-only as the documented fallback if plane deflection proves jittery under prediction.

### 3. Plane deflection reuses the wall `deflect()` approach
In `stepPlane`, after the existing wall clamp, iterate solid obstacles. Using the metric, if a plane is within `obstacle.radius + PLANE_RADIUS` of an obstacle centre: push it back out to the surface along the outward normal, and blend its heading away using the existing `deflect(angle, inward)` (where `inward` = atan2 from obstacle centre to plane — i.e. steer outward). No HP touched.

```
        bullet ──►  ✕ blocked (segCircleT obstacle < segCircleT plane)
                   ███
   plane ►╲       █████   ← obstacle (solid): push to surface,
          ╲______█████      deflect heading outward, HP unchanged
                  ███
```

- **Why:** `deflect()` already produces the smooth arcade "bank away" the walls use; client prediction (`_stepPredict`) mirrors `stepPlane`, so reusing the same primitive keeps prediction/repro identical and avoids a new rubber-band source.
- **Alternative considered:** hard stop (zero out velocity). Rejected — feels bad, fights prediction. Tangential slide via `deflect` keeps momentum.

### 4. Bullets resolve the earliest hit along their swept segment
Generalise `segHitsCircle` into an entry-parameter helper `segCircleT(ax,ay,bx,by,cx,cy,r) → t ∈ [0,1] | Infinity`. Each tick a bullet computes the smallest `t` over (a) bullet-blocking obstacles and (b) enemy planes. Whichever is smaller wins: obstacle → despawn with **no** damage; plane → `damage()` as today. `segHitsCircle` is kept as a thin `t !== Infinity` wrapper so existing call sites are untouched.

- **Why:** prevents the wrong resolution when a plane hides just behind cover — the bullet must hit whatever is first along its path. Reuses the proven swept math (no tunnelling).
- **Alternative considered:** test obstacles first and `continue` on any hit. Simpler but mis-resolves a plane that is in front of an obstacle on the same segment. The t-compare is a few lines more for correctness.

### 5. One pluggable metric module; new code routes through it
Add a small metric helper (shared + mirrored): `dist2(ax,ay,bx,by)`, `within(ax,ay,bx,by,r)`, and `normalDir(fromx,fromy,tox,toy)`. Euclidean today. The new obstacle collision and pickup spawn-weighting call **only** these. The globe change swaps the metric body to angular/great-circle and the same map data + collision logic work unchanged.

- **Why:** isolates the single thing topology changes — distance — behind three functions. This is the core "design once, port later" lever.
- **Scope guard:** this change routes the *new* obstacle/pickup code through the metric. Migrating the pre-existing inline distance math (homing target search, `collectPickups`, `pickSpawn`) to the metric is **globe-arena's** job (those already work on flat); we note it so the port is a known, bounded follow-up rather than a surprise.

### 6. Pickup spawns are weighted toward the hotspot (radial power-law), obstacle-aware
Replace the uniform pick in `maintainPickups` with: sample angle uniformly, radius `r = maxR * random() ** HOTSPOT_BIAS` (BIAS > 1 pulls inward), position = hotspot + (cosθ,sinθ)·r, clamped to the arena. Re-roll (small fixed cap) if the point lands inside a solid obstacle. The power law still allows occasional edge spawns (calmer edges still get some loot), so zoning stays soft.

- **Why:** pulls players into the centre for conflict without hard-gating loot to one spot. One tunable (`HOTSPOT_BIAS`) controls how contested the centre is.
- **Alternative considered:** rejection-sample against a 2D weight field. More flexible but more code; the radial law is enough for a single central hotspot and reads clearly.

### 7. Zoning is authoring, not a code path
Hot centre / cover mid-ring / open edges emerge from *where* obstacles are placed in the data plus the spawn bias — there is no special-cased per-zone logic. Zone radii are stored only for authoring clarity and minimap shading.

- **Why:** keeps the engine generic and the "map" fully data-driven; retuning the map is editing constants, not code.

### 8. Dynamic flavour is render-only
Volcano eruption particles and drifting elements live entirely in `render3d.js`. They emit no state and the server has no concept of them. This makes "non-damaging" structural, not a number we could fat-finger.

### 9. Composition with `globe-arena`
`globe-arena`'s non-goal "*New game modes, terrain gameplay (mountains/obstacles), or altitude as a mechanic*" is **lifted for obstacles/terrain content** (altitude stays a non-goal). On the sphere, the same obstacle/zone/hotspot data is interpreted on the surface and the metric becomes angular; `stepPlane` deflect and `stepBullets` block are unchanged because they already speak only through the metric. This change updates globe-arena's `design.md`/`proposal.md` to record the lift.

## Risks / Trade-offs

- **Plane deflection jitter under prediction** → the client predicts `stepPlane`; if obstacle deflect isn't mirrored exactly in `_stepPredict`, planes rubber-band near cover. Mitigation: implement deflect once via the shared `deflect()` semantics and mirror it in `_stepPredict` in the same task; if still jittery, fall back to bullet-blockers-only (Decision 2 fallback) which needs no plane prediction change.
- **Bots are obstacle-blind** → bots may hug/orbit a spire. Mitigation: acceptable for this change (they still deflect, never get damaged, never stick — `deflect` always yields tangential motion); a light "steer around nearest solid obstacle" nudge is a noted optional follow-up, not required.
- **Spawning inside an obstacle** → a plane/pickup could spawn overlapping cover. Mitigation: `pickSpawn` and the pickup sampler re-roll against solid obstacles (bounded attempts; fall through to last candidate so spawning can never hang).
- **Map clutter hurting readability/perf** → too many obstacles muddy the arcade look or add draw calls. Mitigation: start with a small authored set (≈8–14 obstacles), reuse shared geometries per kind and `disposeObject` on teardown; tune by eye in Preview.
- **Client/server constant drift** → the two mirrors disagree, so cover desyncs. Mitigation: identical literal blocks in both files, called out in tasks as a paired edit; the metric + map data are the only new shared truth.
- **Globe non-goal lift scope creep** → lifting the non-goal invites doing globe terrain now. Mitigation: this change stays on the flat sim; it only edits globe-arena's *artifacts* to record composability, no globe code.

## Migration Plan

1. Land shared data + metric (constants both sides) — inert until used.
2. Server collision (bullet-block earliest-t, plane deflect no-damage, spawn-weighting + obstacle-aware spawns). `tsc --noEmit` clean.
3. Client render (obstacles/landmarks/hotspot + eruption VFX) + `_drawMinimap` markers + `_stepPredict` deflect mirror.
4. Update `globe-arena` artifacts (non-goal lift).
5. Verify in Preview: fly into every obstacle kind → deflect, **HP never drops** from contact; shoot into cover → bullets stop; pickups cluster centre; minimap shows cover; memory counts bounded across a session.
6. Ship via the normal Coolify redeploy.

**Rollback:** the map data is additive and the collision code is gated on a non-empty obstacle list — shipping an empty `OBSTACLES = []` disables all new collision and returns the arena to today's behaviour without a revert. Renderer guards on the same empty list.

## Open Questions

- Final obstacle count/layout and `HOTSPOT_BIAS` value — tune by eye in Preview during apply; start ~8–14 obstacles, BIAS ≈ 2.
- Should `ring` fly-throughs grant a small reward later (boost/score)? Out of scope now; data shape leaves room.
- Exact landmark art (lighthouse/shipwreck/forest) vs. reusing existing prop meshes — decide during the render task by what looks good and stays cheap.
