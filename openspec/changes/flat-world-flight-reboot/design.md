## Context

SmashCart currently couples its core simulation to a spherical world model: server movement uses surface directions and tangent headings, the client predicts against globe math, and rendering assumes a curved planet with wraparound flow. The requested change breaks that contract on purpose. It replaces the world topology, changes movement into true 3D flight, slows pacing sharply, and asks for visible latency improvements at the same time.

This is cross-cutting work. It touches shared math, authoritative schema, bot steering, projectile travel, prediction, interpolation, HUD, camera, and mobile controls. Because the game is a single server and a single browser client shipped together, the correct approach is a coordinated release rather than a compatibility bridge between globe and flat-world state.

## Goals / Non-Goals

**Goals:**
- Replace globe movement with a flat large-map 3D flight model.
- Add true altitude with climb and dive as first-class gameplay, not visual trickery.
- Retune movement and combat to a much slower readable pace.
- Improve perceived latency through a simpler movement model, better local prediction, and bounded reconciliation.
- Keep the existing Node.js, Colyseus, and Three.js stack.

**Non-Goals:**
- Preserving compatibility with the old globe schema or movement math.
- Full rollback netcode or server-side lag compensation.
- New progression systems, game modes, or backend services.
- Full flight-sim physics such as stalls, roll authority, or manual throttle management.

## Decisions

### 1. Use flat 3D position plus forward vector as the new authoritative state

Players, bots, pickups, and projectiles will use flat-world `x/y/z` position plus a normalized forward vector. This keeps the current "position plus facing vector" pattern from the globe build, but swaps out spherical math for standard 3D vector math.

Why this over yaw/pitch-only state:
- It keeps collision, aim, and projectile travel in one representation.
- It avoids repeated angle-to-vector conversion throughout server and renderer code.
- It makes bot steering, projectile homing, and camera follow logic simpler than maintaining several coupled angles.

### 2. Use a very large bounded square map with a soft edge band

The new world will be a broad square battlefield with a large interior play zone and a soft edge band that pushes players back toward the center before a hard out-of-bounds cutoff. There is no globe wrap and no tiny arena wall.

Why this over infinite space:
- Players still need encounter density, spawn safety, and a minimap that resolves to something readable.
- Bots and pickups are much easier to manage when the battlefield has a known footprint.
- A soft edge is less jarring than the current hard wall while still giving the game a real playable envelope.

### 3. Keep arcade auto-thrust and add explicit climb/dive controls

The flight model will stay arcade-simple. The plane always moves forward at cruise speed unless boosting. Steering controls yaw, and a dedicated climb/dive input changes vertical direction within pitch and altitude limits. Banking remains a visual effect derived from turn input rather than a full roll simulation.

Why this over full six-degree flight:
- The user asked for real up/down, not for a flight simulator.
- Mobile controls remain feasible if vertical movement is one additional axis rather than a full cockpit.
- Slower pacing plus auto-thrust keeps onboarding manageable while still making altitude meaningful.

### 4. Retune around slow, readable combat rather than preserving current numbers

Cruise, boost, turn, climb, descent, projectile speed, fire cadence, and spawn spacing will all be reduced together. The goal is not to slightly soften the existing game. The goal is to make engagements readable at a crawl so latency correction and target tracking stop fighting the player.

Why this over incremental tuning:
- The current globe values were built for a different topology and camera.
- Altitude adds another dimension of evasive space, so speeds must come down materially or combat becomes noise.
- Latency is easier to mask when positional error accumulates slowly.

### 5. Use sequence-based local prediction and bounded remote smoothing, not rollback

The latency strategy will stay server-authoritative. The client will tag local inputs with sequence numbers, predict immediately, and reconcile against authoritative snapshots by smoothing small errors and snapping only when divergence exceeds a hard threshold. Remote players will use interpolation plus short bounded extrapolation. Projectiles will use short extrapolation windows and immediate cleanup on authoritative despawn.

Why this over full rollback:
- It is materially better than the current model and fits the existing Colyseus architecture.
- The slower flight model reduces the value gap between full rollback and bounded prediction.
- Full rollback would multiply scope by forcing deterministic re-simulation across the whole 3D flight stack.

### 6. Replace globe-specific rendering with a flat terrain mat and altitude-readable camera

Rendering will shift to a flat terrain mat with distant landmarks, low cover, and clear ground reference. The chase camera will emphasize forward space and altitude difference rather than curved-horizon spectacle. The minimap becomes a flat-world tactical map with altitude cues for nearby threats.

Why this over reusing the globe renderer shape:
- The user explicitly wants the globe removed.
- Flat-world readability depends on horizon and ground cues that fight the current planet camera.
- The renderer should match the simulation contract instead of masking it.

### 7. Treat this as a replacement migration, not a dual-path transition

The old spherical modules will not remain as a supported runtime mode. Implementation may reuse pieces temporarily during development, but the release target is one flat-world path. Tests, tuning constants, and specs will be rewritten against the new world model.

Why this over keeping both:
- Keeping both topologies active would double complexity in the exact codepaths that already need the largest rewrite.
- The repo is a single-game codebase, not a platform serving multiple live game variants.

## Risks / Trade-offs

- Input complexity increases -> Mitigation: keep auto-thrust, keep roll cosmetic, and restrict vertical controls to one explicit axis.
- Slowing the game too far could make combat feel inert -> Mitigation: tune speeds as a family, keep boost meaningful, and validate with playtests before expanding features.
- The rewrite will invalidate parts of the current tests and assumptions -> Mitigation: rewrite specs first, then replace globe-dependent tests with flat-world simulation and latency cases.
- Remote smoothing may still show artifacts at very high ping -> Mitigation: define hard extrapolation limits and explicit snap thresholds instead of pretending to solve extreme latency.
- A huge flat field can feel empty -> Mitigation: use a bounded square map, central traffic bias, landmarks, and spawn logic that encourages repeat encounters.

## Migration Plan

1. Replace shared movement primitives with flat 3D vector helpers and new tuning constants.
2. Rewrite the authoritative schema and `ArenaRoom` simulation around flat-world position, altitude, and sequence-aware input handling.
3. Port client netcode to the new prediction, interpolation, and reconciliation model.
4. Rebuild rendering, HUD, minimap, and controls around the flat battlefield and altitude cues.
5. Replace or rewrite globe-specific tests, then run a focused playtest pass on pacing and latency feel.
6. Remove leftover spherical codepaths and assets that are no longer referenced.

Rollback strategy:
- This ships as one coordinated client/server release.
- If the flat-world build fails acceptance, revert the change and redeploy the prior globe build. No persistent data migration is required.

## Open Questions

- Exact desktop climb/dive mapping: `W/S`, arrow up/down, or another split from boost.
- Exact mobile input scheme for altitude: second thumb axis versus dedicated climb/dive buttons.
- Final map size, edge-band width, and altitude ceiling after the first flat-world playtest.
- Whether pickups and low obstacles should stay near the ground only, or whether some should occupy mid-air lanes.
