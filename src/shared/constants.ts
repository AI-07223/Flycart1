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

// ====================== arena map content (arena-content) ======================
// Static map geometry shared by server (collision) and client (render). NOT synced
// in ArenaState — both processes hold this same data. The environment NEVER damages
// players: these flags only gate bullet-blocking (cover) and plane-solidity (deflect).

export type ObstacleKind = "spire" | "rock" | "tower" | "arch" | "ring";
export type LandmarkKind = "lighthouse" | "shipwreck" | "forest" | "volcano";

export interface Obstacle {
  x: number;
  y: number;
  radius: number;       // collision radius (world units)
  height: number;       // render-only (the sim is 2D; height never affects gameplay)
  kind: ObstacleKind;
  landmark?: LandmarkKind; // render-only orientation tag; ignored by the server
}

// kind → behaviour. `ring` is a cosmetic fly-through gate (neither solid nor blocking).
export const OBSTACLE_BEHAVIOR: Record<ObstacleKind, { solid: boolean; blocksBullets: boolean }> = {
  spire: { solid: true, blocksBullets: true },
  rock:  { solid: true, blocksBullets: true },
  tower: { solid: true, blocksBullets: true },
  arch:  { solid: true, blocksBullets: true },
  ring:  { solid: false, blocksBullets: false },
};

// Contested centre (the volcano). Powerup spawns are weighted toward this point.
export const HOTSPOT = { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 };

// Zone radii from HOTSPOT — authoring/minimap only. Zoning is emergent from placement.
export const ZONES = { centerR: 280, midR: 760 };

// Pickup spawn weighting toward the hotspot.
export const HOTSPOT_BIAS = 2;   // >1 pulls spawns toward centre (radial power law); occasional edge spawns remain
export const SPAWN_REROLL = 8;   // bounded attempts to avoid spawning inside a solid obstacle

// Starter layout (~12): central volcano hotspot, a cover-rich mid-ring, inner spires,
// sparse fly-through rings near the edges. Tune by eye in Preview.
export const OBSTACLES: Obstacle[] = [
  // central volcano/tower landmark — solid cover; powerups cluster AROUND it
  { x: 1300, y: 900,  radius: 95, height: 240, kind: "tower", landmark: "volcano" },
  // mid-ring cover (~520 from centre), alternating kinds; three double as landmarks
  { x: 1820, y: 900,  radius: 70, height: 170, kind: "spire", landmark: "lighthouse" },
  { x: 1560, y: 1350, radius: 80, height: 95,  kind: "rock",  landmark: "shipwreck" },
  { x: 1040, y: 1350, radius: 72, height: 165, kind: "arch" },
  { x: 780,  y: 900,  radius: 80, height: 150, kind: "spire" },
  { x: 1040, y: 450,  radius: 72, height: 95,  kind: "rock",  landmark: "forest" },
  { x: 1560, y: 450,  radius: 72, height: 165, kind: "arch" },
  // inner spires — make the centre busy but navigable
  { x: 1300, y: 620,  radius: 46, height: 130, kind: "spire" },
  { x: 1300, y: 1180, radius: 46, height: 130, kind: "spire" },
  // fly-through rings (cosmetic skill gates) near the calmer edges
  { x: 560,  y: 560,  radius: 70, height: 120, kind: "ring" },
  { x: 2040, y: 1240, radius: 70, height: 120, kind: "ring" },
  { x: 560,  y: 1240, radius: 70, height: 120, kind: "ring" },
];

// ---------- pluggable distance/collision metric ----------
// Euclidean today. This is the SINGLE place topology lives: swapping these for
// angular/great-circle versions runs the same map data on the sphere (globe-arena),
// with no change to the map definition or the collision call-sites above.
export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  return dx * dx + dy * dy;
}
export function within(ax: number, ay: number, bx: number, by: number, r: number): boolean {
  return dist2(ax, ay, bx, by) <= r * r;
}
// Unit direction from (fromx,fromy) toward (tox,toy). Degenerate → (1,0).
export function normalDir(fromx: number, fromy: number, tox: number, toy: number): { x: number; y: number } {
  const dx = tox - fromx, dy = toy - fromy;
  const len = Math.hypot(dx, dy);
  return len > 1e-6 ? { x: dx / len, y: dy / len } : { x: 1, y: 0 };
}
