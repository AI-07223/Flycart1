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

  TICK_RATE: 30,
  SKIN_COUNT: 5,

  // Sprites point UP (north) but our angle 0 = pointing right (east).
  // Add this when drawing a plane rotated to its heading.
  SPRITE_ROT_OFFSET: Math.PI / 2,
};
