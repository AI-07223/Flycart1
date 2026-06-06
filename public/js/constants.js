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
};
