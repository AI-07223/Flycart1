## Context

Bot AI lives in `ArenaRoom.ts` in two methods: `thinkBot()` (movement + firing decisions) and `pickTarget()` (target selection). Each bot has a `BotBrain` with: `targetId`, `retargetAt`, `wander`, `react`, `aimErr`, `lead`. The arena is spherical — all positions are unit-vector directions, distances are angular.

The game already has obstacle data: `C.OBSTACLES` with `{ dir, angRadius, height, kind, landmark }`. Powerups are in `state.pickups` with `{ x, y, z, type }` (but positions are on the sphere surface).

## Goals / Non-Goals

**Goals:**
- Bots make tactically interesting decisions (use cover, seek powerups, evade)
- Difficulty tiers feel distinct — rookies are beatable, aces are threatening
- Performance: bot AI must run at 30Hz for up to 7 bots without measurable overhead
- No new files or dependencies — changes are contained in ArenaRoom.ts

**Non-Goals:**
- Machine learning / neural network bots
- Coordinated team tactics (bots don't communicate)
- Path-finding (on a sphere, direct steering with obstacle avoidance is sufficient)

## Decisions

### 1. Obstacle avoidance via arc-distance checks

For each bot, check the angular distance to the nearest solid obstacle. If heading toward one within a detection range, steer to avoid it. Use the existing `S.arcDistToPoint()` function.

```
for each solid obstacle:
  angDist = S.angBetween(botPos, obstacle.dir)
  if angDist < detectionThreshold:
    // steer away from obstacle center
    avoidance = S.normalize(S.sub(botPos, obstacle.dir))
    blend avoidance into desired heading
```

Detection threshold: `obstacle.angRadius * 1.5` (approach from the side, not head-on).

### 2. Cover-seeking behavior

When fleeing (HP < threshold), bots prefer to steer toward the nearest solid obstacle rather than the antipode of the threat. The obstacle provides bullet-blocking cover.

```
if fleeing:
  nearestCover = find nearest solid obstacle
  if cover is closer than flee distance:
    desiredBearing = toward cover
  else:
    desiredBearing = away from threat (current behavior)
```

### 3. Powerup seeking

Scan `state.pickups` for nearby powerups. If a powerup is within a seek radius and the bot doesn't already have that power type, divert toward it.

Priority: shield (when low HP) > afterburner > spread > rapid > homing > repair

```
for each pickup in state.pickups:
  dist = S.angBetween(botPos, pickupPos) * R
  if dist < seekRadius and bot doesn't have this power type:
    score = powerPriority / dist
    if score > bestScore: bestPickup = pickup
```

Seek radius: 400 world-units (roughly 2-3 seconds of flight).

### 4. Progressive difficulty tiers

Replace flat random skill with 3 tiers assigned when bot spawns:

| Tier | react | aimErr | lead | Evades | Seeks powerups | Uses cover |
|------|-------|--------|------|--------|----------------|------------|
| Rookie | 2.0-3.0s | 0.15-0.25 | 0.3-0.5 | No | No | No |
| Veteran | 1.0-1.8s | 0.06-0.12 | 0.6-0.8 | Yes | Yes | No |
| Ace | 0.5-0.8s | 0.02-0.05 | 0.85-1.0 | Yes | Yes | Yes |

Tier distribution: 50% rookie, 35% veteran, 15% ace.

### 5. Evasion weaving

When a bot is being fired at (bullet heading toward it within detection cone), oscillate the heading to make the bot harder to hit.

```
nearbyThreats = bullets heading toward bot within 0.5 rad cone
if nearbyThreats > 0:
  weavePhase = Math.sin(time * weaveFreq) * weaveAmplitude
  desiredBearing = adjust by weavePhase perpendicular to threat direction
```

Weave frequency: 3-5 Hz (realistic plane maneuvering). Amplitude: 0.3-0.5 radians.

### 6. Improved target selection

Current: closest alive player. Improved: score by threat level.

```
score = 1 / (dist + 1)              // closer = higher priority
if target is aiming at me: score *= 2  // threats get priority
if target.hp < 30: score *= 1.5       // finish off weak targets
```

## Risks / Trade-offs

- **Performance**: Each bot scans obstacles (5-6) and powerups (up to 5) every tick. With 7 bots that's ~70 distance checks per tick — negligible at 30Hz.
- **Obstacle avoidance oscillation**: Bots might get stuck oscillating between two obstacles. Mitigation: add a small random jitter to avoidance steering.
- **Powerup camping**: If bots always seek powerups, they might ignore combat. Mitigation: only seek when no target is within engagement range (< 500 world-units).

## Migration Plan

1. Refactor `BotBrain` type to include tier, evasion state, and powerup target
2. Implement obstacle detection in `thinkBot()`
3. Implement powerup seeking
4. Implement evasion weaving
5. Implement tier-based skill parameters
6. Implement improved target scoring in `pickTarget()`
7. Test with varying bot counts and skill distributions
