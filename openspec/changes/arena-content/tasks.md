## 1. Shared map data + pluggable metric

- [x] 1.1 Add the map definition to `src/shared/constants.ts`: `OBSTACLES` array of `{ position:{x,y}, radius, height, kind }` (kinds: `spire`/`rock`/`tower`/`arch`/`ring`), `HOTSPOT:{x,y}` (arena centre), `ZONES` radii (centre / mid-ring / edge), and spawn-weighting params (`HOTSPOT_BIAS≈2`, spawn re-roll cap)
- [x] 1.2 Add a `kind → { solid, blocksBullets }` map (spire/rock/tower/arch → solid+blocks; ring → neither)
- [x] 1.3 Add a pluggable metric helper (shared): `dist2(ax,ay,bx,by)`, `within(ax,ay,bx,by,r)`, `normalDir(fromx,fromy,tox,toy)` — Euclidean bodies; documented as the single swap point for the globe
- [x] 1.4 Mirror 1.1–1.3 verbatim in `public/js/constants.js` (paired edit; identical literals so client/server cover never desyncs)
- [x] 1.5 Author a starter layout (~8–14 obstacles): dense mid-ring cover, a couple of fly-through rings, sparse edges, hotspot at centre — tune by eye later

## 2. Server collision (authoritative, no damage)

- [x] 2.1 Generalise `segHitsCircle` into `segCircleT(ax,ay,bx,by,cx,cy,r) → t∈[0,1]|Infinity`; keep `segHitsCircle` as a `t !== Infinity` wrapper (existing call sites untouched)
- [x] 2.2 In `stepBullets`: compute the smallest entry-`t` over bullet-blocking obstacles AND enemy planes along the swept segment; earliest wins — obstacle → despawn bullet with **no** damage, plane → existing `damage()`
- [x] 2.3 In `stepPlane`: after the wall clamp, for each solid obstacle within `radius + PLANE_RADIUS` (via metric) push the plane to the surface along the outward normal and deflect heading outward using the existing `deflect(angle, inward)`; **never** call `damage()` / touch `hp`
- [x] 2.4 Route 2.2/2.3 distance + overlap tests through the metric helper (1.3)
- [x] 2.5 Weight pickup spawns in `maintainPickups`: angle uniform, `r = maxR * random()**HOTSPOT_BIAS` around `HOTSPOT`, clamp to arena, re-roll (bounded) if inside a solid obstacle
- [x] 2.6 Make `pickSpawn` re-roll away from solid obstacles within bounded attempts (never hang; fall through to last candidate)
- [x] 2.7 `tsc --noEmit` clean; confirm by code review that there is **no** path from obstacle/hotspot/landmark contact to an HP change

## 3. Client render + minimap + prediction

- [x] 3.1 Build obstacle meshes per `kind` from the shared `OBSTACLES` data (reuse shared geometries per kind; gate on non-empty list); add to scene on init
- [x] 3.2 Add the central hotspot landmark (volcano/tower) and per-region landmarks (lighthouse / shipwreck / forest) for orientation; some over solid obstacles
- [x] 3.3 Add **non-damaging** eruption / drift VFX (particles only; emits/reads no state)
- [x] 3.4 `disposeObject` all new obstacle/landmark/VFX objects on teardown (no GPU leak; shared geos flagged `__shared` stay alive)
- [x] 3.5 Mirror the obstacle deflect in `_stepPredict` so the local plane doesn't rubber-band near cover (same `deflect` semantics + metric as server 2.3)
- [x] 3.6 Extend `_drawMinimap` to draw obstacle markers + landmark icons (and optional zone shading)

## 4. Compose with globe-arena

- [x] 4.1 Edit `openspec/changes/globe-arena/design.md`: lift the "terrain gameplay (mountains/obstacles)" non-goal — note obstacle/terrain content now comes from `arena-content` and composes via the angular metric (altitude stays a non-goal)
- [x] 4.2 Edit `openspec/changes/globe-arena/proposal.md` (and `specs/globe-world` if needed): record that `arena-content`'s map data + collision apply on the sphere by swapping the metric to angular; no map reauthoring

## 5. Verify & ship

- [x] 5.1 Preview: fly into every obstacle kind → plane deflects/slides, keeps flying, **HP never drops** from contact; fly a ring → passes through cleanly  (verified vs real compiled room: T3 deflect-to-surface + HP unchanged, T4 20s/6-plane sim minHp=100, rings non-solid)
- [x] 5.2 Preview: shoot into cover → bullets stop at the obstacle; an enemy hidden behind cover is protected; an enemy in front of cover is still hit  (T2a hidden→hp100, T2b exposed→hp75)
- [x] 5.3 Preview: over a round, pickups visibly cluster toward the centre with some edge spawns; none embedded in obstacles  (T5a 0/8000 in solid, T5b centre>edge)
- [x] 5.4 Preview: minimap shows obstacles + landmarks; regions read as distinct  (pixel-verified: volcano #ff7b2e, landmark tan, ring cyan outline, zone tint)
- [x] 5.5 Leak check: sustained session → `renderer.info.memory` counts stay bounded after obstacle/VFX churn  (1400 frames: geometries/textures/programs flat at 69/6/26; particles bounded)
- [ ] 5.6 Commit → push `main` → Coolify redeploy → verify live (game 200, matchmake + WebSocket 101, no environment damage in a live match)
