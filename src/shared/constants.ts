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

// Powerups
export const PICKUP_MAX = 5;
export const PICKUP_INTERVAL = 6;      // seconds between spawns while below max
export const PICKUP_RADIUS = 26;
export const POWERUP_DURATION = 10;    // seconds for timed effects
export const SHIELD_CHARGES = 3;
export const RAPID_FACTOR = 0.45;      // fire-cooldown multiplier while rapid
export const SPREAD_ANGLE = 0.18;      // radians between spread bullets
export const AFTERBURNER_FACTOR = 1.4; // speed multiplier
export const HOMING_TURN = 2.6;        // radians/sec homing steer
export const POWERUP_TYPES = ["spread", "rapid", "shield", "afterburner", "repair", "homing"];
export const POWERUP_WEIGHTS: Record<string, number> = {
  spread: 1, rapid: 1, shield: 1, afterburner: 1, repair: 0.7, homing: 0.6,
};

// Robustness / hardening
export const DT_MAX = 0.05;          // clamp the server step so a hitch can't tunnel/blow up physics
export const SPAWN_INVULN = 1.2;     // seconds of invulnerability after (re)spawn (drops on first fire)
export const RECONNECT_WINDOW = 20;  // seconds the server keeps a dropped player's slot for reconnection
export const INPUT_RATE_MAX = 60;    // max "input" messages/sec processed per client
export const NAME_RATE_MAX = 5;      // max "setName" messages/sec processed per client
