## Why

The current bot AI is functional but shallow. Bots pick the closest target, aim with some randomized error, and fire. They ignore powerups completely, fly straight through obstacles (missing the tactical advantage of cover), have no evasion behavior, and their skill is a flat random roll rather than progressive difficulty. Improving bot AI makes the game more engaging for solo players and provides a better experience when rooms are filling up.

## What Changes

- **Obstacle awareness**: Bots detect nearby obstacles and steer around them, and use solid obstacles as bullet cover
- **Powerup seeking**: Bots actively fly toward nearby powerups when they don't have a target or when a powerup is closer than their target
- **Evasion behavior**: Bots weave (oscillate heading) when under fire, and retreat toward obstacles when fleeing
- **Progressive difficulty**: Replace flat random skill with 3 tiers (rookie/veteran/ace) that affect reaction time, aim accuracy, lead prediction, and decision-making
- **Better target selection**: Consider threat level (distance + whether target is firing at them), not just raw distance

## Capabilities

### New Capabilities
- `obstacle-aware-bots`: bots detect and navigate around obstacles, use them as cover
- `powerup-seeking-bots`: bots pursue nearby powerups strategically
- `progressive-difficulty`: skill tiers (rookie/veteran/ace) instead of flat random

### Modified Capabilities
(No existing specs modified)

## Impact

- `src/rooms/ArenaRoom.ts` — `thinkBot()` method expanded with obstacle detection, powerup scanning, evasion logic, and tier-based parameters
- `src/rooms/ArenaRoom.ts` — `pickTarget()` improved with threat-based scoring
- No new files, no new dependencies
- No client changes — bot AI is entirely server-side
