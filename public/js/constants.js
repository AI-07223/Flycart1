// Client mirror of the gameplay-relevant constants in src/shared/constants.ts.
// Used for local input prediction and rendering. Keep in sync with the server.
window.GAME = {
  ARENA_WIDTH: 2600,
  ARENA_HEIGHT: 1800,
  WALL_MARGIN: 40,

  CRUISE_SPEED: 260,
  BOOST_SPEED: 440,
  ACCEL: 900,
  TURN_RATE: 3.2,

  PLANE_RADIUS: 20,
  MAX_HP: 100,
  BULLET_SPEED: 720,

  // Powerup-affecting values mirrored from the server so prediction + SFX match.
  AFTERBURNER_FACTOR: 1.4,
  RAPID_FACTOR: 0.45,
  FIRE_COOLDOWN: 0.22,
  BULLET_LIFE: 1.1,
  BULLET_RADIUS: 6,
  SPREAD_ANGLE: 0.18,
  HOMING_TURN: 2.6,

  TICK_RATE: 30,
  SKIN_COUNT: 5,

  // Sprites point UP (north) but our angle 0 = pointing right (east).
  // Add this when drawing a plane rotated to its heading.
  SPRITE_ROT_OFFSET: Math.PI / 2,

  // Powerups (client visuals + HUD). Durations/effects are server-authoritative.
  POWERUP_DURATION: 10,
  POWERUPS: {
    spread:      { label: "Spread",      color: 0x6bff8b, icon: "🔱" },
    rapid:       { label: "Rapid Fire",  color: 0xffe14a, icon: "⚡" },
    shield:      { label: "Shield",      color: 0x49c0ff, icon: "🛡️" },
    afterburner: { label: "Afterburner", color: 0xff8c42, icon: "🚀" },
    repair:      { label: "Repair",      color: 0xff6b6b, icon: "❤️" },
    homing:      { label: "Homing",      color: 0xc07bff, icon: "🎯" },
  },

  // ----- arena map content (arena-content) — mirror of src/shared/constants.ts -----
  // Static map geometry used for rendering + local prediction's obstacle deflect.
  // Environment NEVER damages players; these flags only gate cover/solidity.
  OBSTACLE_BEHAVIOR: {
    spire: { solid: true,  blocksBullets: true },
    rock:  { solid: true,  blocksBullets: true },
    tower: { solid: true,  blocksBullets: true },
    arch:  { solid: true,  blocksBullets: true },
    ring:  { solid: false, blocksBullets: false },
  },
  HOTSPOT: { x: 2600 / 2, y: 1800 / 2 },
  ZONES: { centerR: 280, midR: 760 },
  HOTSPOT_BIAS: 2,
  SPAWN_REROLL: 8,
  OBSTACLES: [
    { x: 1300, y: 900,  radius: 95, height: 240, kind: "tower", landmark: "volcano" },
    { x: 1820, y: 900,  radius: 70, height: 170, kind: "spire", landmark: "lighthouse" },
    { x: 1560, y: 1350, radius: 80, height: 95,  kind: "rock",  landmark: "shipwreck" },
    { x: 1040, y: 1350, radius: 72, height: 165, kind: "arch" },
    { x: 780,  y: 900,  radius: 80, height: 150, kind: "spire" },
    { x: 1040, y: 450,  radius: 72, height: 95,  kind: "rock",  landmark: "forest" },
    { x: 1560, y: 450,  radius: 72, height: 165, kind: "arch" },
    { x: 1300, y: 620,  radius: 46, height: 130, kind: "spire" },
    { x: 1300, y: 1180, radius: 46, height: 130, kind: "spire" },
    { x: 560,  y: 560,  radius: 70, height: 120, kind: "ring" },
    { x: 2040, y: 1240, radius: 70, height: 120, kind: "ring" },
    { x: 560,  y: 1240, radius: 70, height: 120, kind: "ring" },
  ],

  // ----- pluggable distance/collision metric (Euclidean; swap point for the globe) -----
  dist2(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; },
  within(ax, ay, bx, by, r) { return this.dist2(ax, ay, bx, by) <= r * r; },
  normalDir(fromx, fromy, tox, toy) {
    const dx = tox - fromx, dy = toy - fromy, len = Math.hypot(dx, dy);
    return len > 1e-6 ? { x: dx / len, y: dy / len } : { x: 1, y: 0 };
  },
};
