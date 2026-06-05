// Core tuning shared across the authoritative simulation.
// A mirror of the gameplay-relevant values lives in public/js/constants.js
// for the client's prediction/rendering — keep them in sync.

export const TICK_RATE = 30; // server simulation ticks per second
export const TICK_MS = 1000 / TICK_RATE;

// Arena (world units). Camera follows the player; world is bounded.
export const ARENA_WIDTH = 2600;
export const ARENA_HEIGHT = 1800;
export const WALL_MARGIN = 40;

// Plane movement (units per second)
export const CRUISE_SPEED = 260;
export const BOOST_SPEED = 440;
export const ACCEL = 900; // how fast speed eases toward its target
export const TURN_RATE = 3.2; // radians per second at full turn

// Combat
export const PLANE_RADIUS = 20;
export const MAX_HP = 100;
export const BULLET_SPEED = 720;
export const BULLET_DAMAGE = 25;
export const BULLET_LIFE = 1.1; // seconds before a bullet expires
export const BULLET_RADIUS = 6;
export const FIRE_COOLDOWN = 0.22; // seconds between shots
export const RESPAWN_DELAY = 2.5; // seconds dead before respawn

// Match
export const ROUND_SECONDS = 150;
export const ROUND_INTERMISSION = 8;
export const MAX_CLIENTS = 8; // human + bot slots per room
export const MIN_PLAYERS = 4; // keep at least this many in the arena via bots

// Bots
export const BOT_NAMES = [
  "Maverick", "Goose", "Iceman", "Viper", "Rio",
  "Jester", "Slider", "Hollywood", "Merlin", "Wolfman",
];

// Plane skins (index → asset). Players cycle through these.
export const SKIN_COUNT = 5;
