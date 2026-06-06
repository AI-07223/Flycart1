// Core tuning shared across the authoritative simulation.
// A mirror of the gameplay-relevant values lives in public/js/constants.js
// for the client's prediction/rendering — keep them in sync.
//
// GLOBE ARENA: the world is the surface of a sphere. Positions are unit-vector directions
// (see src/shared/sphere.ts); speeds below are LINEAR surface speeds (world units/sec) that the
// sim converts to angular (rad/sec) by dividing by the current planet radius. Turn rate is angular.

import * as S from "./sphere";

export const TICK_RATE = 30; // server simulation ticks per second
export const TICK_MS = 1000 / TICK_RATE;

// Plane movement
export const CRUISE_SPEED = 260; // linear surface speed (world units/sec)
export const BOOST_SPEED = 440;
export const ACCEL = 900;        // how fast speed eases toward its target (u/s²)
export const TURN_RATE = 3.2;    // radians/sec heading turn (radius-independent)

// Combat (radii are world units; converted to angular via / radius)
export const PLANE_RADIUS = 20;
export const MAX_HP = 100;
export const BULLET_SPEED = 720; // linear surface speed (world units/sec)
export const BULLET_DAMAGE = 25;
export const BULLET_LIFE = 1.1;  // seconds before a bullet expires
export const BULLET_RADIUS = 6;
export const FIRE_COOLDOWN = 0.22;
export const RESPAWN_DELAY = 2.5;

// Match
export const ROUND_SECONDS = 150;
export const ROUND_INTERMISSION = 8;
export const MAX_CLIENTS = 8;
export const MIN_PLAYERS = 4;

// ---------- dynamic planet size (constant play density) ----------
// Radius scales with the number of bodies in the arena (humans + bots): area ∝ N → radius ∝ √N.
// Recomputed at round start (intermission) and held fixed per round. Clamped to floor/ceiling.
export const R_BASE = 700;   // radius at N_BASE bodies (world units)
export const N_BASE = 6;
export const R_MIN = 560;    // floor: not cramped with few players
export const R_MAX = 820;    // ceiling: still wraps fast enough with many players
export function radiusForBodies(n: number): number {
  const r = R_BASE * Math.sqrt(Math.max(1, n) / N_BASE);
  return Math.max(R_MIN, Math.min(R_MAX, r));
}

// Bots
export const BOT_NAMES = [
  "Maverick", "Goose", "Iceman", "Viper", "Rio",
  "Jester", "Slider", "Hollywood", "Merlin", "Wolfman",
];

export const SKIN_COUNT = 5;

// Powerups
export const PICKUP_MAX = 5;
export const PICKUP_INTERVAL = 6;
export const PICKUP_RADIUS = 26;
export const POWERUP_DURATION = 10;
export const SHIELD_CHARGES = 3;
export const RAPID_FACTOR = 0.45;
export const SPREAD_ANGLE = 0.18;      // radians between spread bullets (tangent-plane heading offset)
export const AFTERBURNER_FACTOR = 1.4;
export const HOMING_TURN = 2.6;        // radians/sec homing steer
export const POWERUP_TYPES = ["spread", "rapid", "shield", "afterburner", "repair", "homing"];
export const POWERUP_WEIGHTS: Record<string, number> = {
  spread: 1, rapid: 1, shield: 1, afterburner: 1, repair: 0.7, homing: 0.6,
};

// Robustness / hardening
export const DT_MAX = 0.05;
export const SPAWN_INVULN = 1.2;
export const RECONNECT_WINDOW = 20;
export const INPUT_RATE_MAX = 60;
export const NAME_RATE_MAX = 5;

// ====================== arena map content (sphere-native) ======================
// Obstacles are static surface geometry: a unit-vector direction + an ANGULAR radius (radians),
// so they spread proportionally as the planet radius changes (constant "fly-around" feel). The
// environment NEVER damages players — these flags only gate bullet-blocking (cover) and
// plane-solidity (deflect). `ring` = cosmetic fly-through gate.

export type ObstacleKind = "spire" | "rock" | "tower" | "arch" | "ring";
export type LandmarkKind = "lighthouse" | "shipwreck" | "forest" | "volcano";

export const OBSTACLE_BEHAVIOR: Record<ObstacleKind, { solid: boolean; blocksBullets: boolean }> = {
  spire: { solid: true, blocksBullets: true },
  rock:  { solid: true, blocksBullets: true },
  tower: { solid: true, blocksBullets: true },
  arch:  { solid: true, blocksBullets: true },
  ring:  { solid: false, blocksBullets: false },
};

// Contested centre (the volcano) — a fixed surface direction. Powerups weight toward it.
export const HOTSPOT_DIR: S.Vec3 = S.normalize(S.vec(0, 0.35, 1));

// Zone angular radii from the hotspot (authoring/minimap only; zoning is emergent from placement).
export const ZONES = { centerAng: 0.34, midAng: 0.7 };

// Pickup spawn weighting toward the hotspot.
export const HOTSPOT_BIAS = 2;   // >1 pulls spawns toward centre (angular power law)
export const SPAWN_REROLL = 8;   // bounded attempts to avoid spawning inside a solid obstacle

// Build a unit direction at angular distance `ang` from the hotspot along azimuth `az`.
export function dirFromHotspot(ang: number, az: number): S.Vec3 {
  const up = Math.abs(HOTSPOT_DIR.y) < 0.9 ? S.vec(0, 1, 0) : S.vec(1, 0, 0);
  const east = S.normalize(S.cross(up, HOTSPOT_DIR));
  const north = S.cross(HOTSPOT_DIR, east);
  const tangent = S.add(S.scale(east, Math.cos(az)), S.scale(north, Math.sin(az)));
  const axis = S.normalize(S.cross(HOTSPOT_DIR, tangent));
  return S.normalize(S.rotateAxis(HOTSPOT_DIR, axis, ang));
}

export interface Obstacle {
  dir: S.Vec3;       // unit-vector surface position
  angRadius: number; // collision radius in radians (scales with planet)
  height: number;    // render-only
  kind: ObstacleKind;
  landmark?: LandmarkKind;
}

// authoring spec: angular distance from hotspot, azimuth, angular radius
interface ObSpec { ang: number; az: number; angRadius: number; height: number; kind: ObstacleKind; landmark?: LandmarkKind; }
const T = Math.PI / 3; // 60°
const OB_SPECS: ObSpec[] = [
  { ang: 0.0,  az: 0,     angRadius: 0.12, height: 240, kind: "tower", landmark: "volcano" },
  // mid-ring cover (~0.55 rad from hotspot), three double as landmarks
  { ang: 0.55, az: 0 * T, angRadius: 0.09, height: 170, kind: "spire", landmark: "lighthouse" },
  { ang: 0.55, az: 1 * T, angRadius: 0.10, height: 95,  kind: "rock",  landmark: "shipwreck" },
  { ang: 0.55, az: 2 * T, angRadius: 0.09, height: 165, kind: "arch" },
  { ang: 0.55, az: 3 * T, angRadius: 0.10, height: 150, kind: "spire" },
  { ang: 0.55, az: 4 * T, angRadius: 0.09, height: 95,  kind: "rock",  landmark: "forest" },
  { ang: 0.55, az: 5 * T, angRadius: 0.09, height: 165, kind: "arch" },
  // inner spires
  { ang: 0.28, az: 0.5 * Math.PI, angRadius: 0.06, height: 130, kind: "spire" },
  { ang: 0.28, az: 1.5 * Math.PI, angRadius: 0.06, height: 130, kind: "spire" },
  // fly-through rings near the calmer edges
  { ang: 0.95, az: 0.2 * Math.PI, angRadius: 0.10, height: 120, kind: "ring" },
  { ang: 0.95, az: 1.0 * Math.PI, angRadius: 0.10, height: 120, kind: "ring" },
  { ang: 0.95, az: 1.6 * Math.PI, angRadius: 0.10, height: 120, kind: "ring" },
];

export const OBSTACLES: Obstacle[] = OB_SPECS.map((s) => ({
  dir: dirFromHotspot(s.ang, s.az),
  angRadius: s.angRadius,
  height: s.height,
  kind: s.kind,
  landmark: s.landmark,
}));
