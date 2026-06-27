// Core gameplay tuning for the flat-world reboot.
// Server simulation and client-side prediction/rendering consume the same values.

export const TICK_RATE = 30;
export const TICK_MS = 1000 / TICK_RATE;

// Flight model: slow, readable, altitude-aware.
export const CRUISE_SPEED = 92;
export const BOOST_SPEED = 138;
export const ACCEL = 260;
export const TURN_RATE = 1.5;
export const PITCH_RATE = 1.05;
export const PITCH_MAX = 0.5;

// Combat.
export const PLANE_RADIUS = 16;
export const MAX_HP = 100;
export const BULLET_SPEED = 322; // was 215 (+50%)
export const BULLET_DAMAGE = 25;
export const BULLET_LIFE = 2.3;  // was 2.1 — scaled up so effective range is similar at higher speed
export const BULLET_RADIUS = 4;
export const FIRE_COOLDOWN = 0.34;
export const RESPAWN_DELAY = 2.5;

// Larger hit radius for bullet-vs-plane detection only (not plane-vs-landmark).
// ~1.6× PLANE_RADIUS so shots feel forgiving without changing collision geometry.
export const BULLET_HIT_RADIUS = 26; // PLANE_RADIUS(16) + 10 flat bonus

// Aim-assist: mild bullet magnetism for human-owned, non-homing bullets.
export const AIM_ASSIST_CONE  = 0.35; // radians (~20°) — target must be within this bearing of bullet forward
export const AIM_ASSIST_RANGE = 700;  // world units — only assist when enemy is closer than this
export const AIM_ASSIST_TURN  = 0.55; // radians/sec the bullet curves toward target (gentler than HOMING_TURN=1.45)

// Match flow.
export const ROUND_SECONDS = 150;
export const ROUND_INTERMISSION = 8;
export const MAX_CLIENTS = 8;
export const MIN_PLAYERS = 4;

// Arena envelope.
export const MAP_HALF = 1800;
export const MAP_EDGE_SOFT = 260;
export const GROUND_Y = 0;
export const MIN_ALT = 18;
export const SPAWN_ALT = 58;
export const MAX_ALT = 320;
export const PICKUP_ALT_MIN = 28;
export const PICKUP_ALT_MAX = 170;
export const PICKUP_FIELD_RADIUS = 1120;
export const SPAWN_REROLL = 14;

// Bots and cosmetics.
export const BOT_NAMES = [
  "Maverick", "Goose", "Iceman", "Viper", "Rio",
  "Jester", "Slider", "Hollywood", "Merlin", "Wolfman",
];
export const BODY_SHAPE_COUNT = 4;
export const COLOR_COUNT = 12;
export const ACCENT_COUNT = 7;
export const TRAIL_COUNT = 5;
export const LIVERY_COUNT = 4;
// SKIN_COUNT aliases COLOR_COUNT — skin is the primary color index.
export const SKIN_COUNT = COLOR_COUNT;

// Powerups.
export const PICKUP_MAX = 6;
export const PICKUP_INTERVAL = 5.5;
export const PICKUP_RADIUS = 24;
export const POWERUP_DURATION = 10;
export const SHIELD_CHARGES = 3;
export const RAPID_FACTOR = 0.55;
export const SPREAD_ANGLE = 0.12;
export const AFTERBURNER_FACTOR = 1.22;
export const HOMING_TURN = 1.45;
export const POWERUP_TYPES = ["spread", "rapid", "shield", "afterburner", "repair", "homing"];
export const POWERUP_WEIGHTS: Record<string, number> = {
  spread: 1,
  rapid: 1,
  shield: 1,
  afterburner: 1,
  repair: 0.7,
  homing: 0.55,
};

// Hardening.
export const DT_MAX = 0.05;
export const SPAWN_INVULN = 1.2;
export const RECONNECT_WINDOW = 20;
export const INPUT_RATE_MAX = 60;
export const NAME_RATE_MAX = 5;

// Lobby.
export const LOBBY_READY_TIMEOUT = 120;
export const LOBBY_RECONNECT_WINDOW = 5;
export const READY_RATE_MAX = 4;
export const HOST_MSG_RATE_MAX = 2;
export const HOST_KICK_RATE_MAX = 4;

export type LandmarkKind = "mesa" | "spire" | "tower" | "hangar";

export interface Landmark {
  kind: LandmarkKind;
  x: number;
  z: number;
  radius: number;
  height: number;
  color: number;
  cover: boolean;
}

export const LANDMARKS: Landmark[] = [
  { kind: "tower", x: 0, z: 0, radius: 96, height: 170, color: 0xff8a3d, cover: true },
  { kind: "mesa", x: -620, z: -340, radius: 90, height: 56, color: 0xb18d62, cover: true },
  { kind: "mesa", x: 720, z: -520, radius: 110, height: 62, color: 0xb18d62, cover: true },
  { kind: "mesa", x: -760, z: 610, radius: 120, height: 60, color: 0xb18d62, cover: true },
  { kind: "spire", x: 660, z: 660, radius: 54, height: 120, color: 0x8ec2ff, cover: true },
  { kind: "spire", x: -180, z: 860, radius: 48, height: 108, color: 0x8ec2ff, cover: true },
  { kind: "hangar", x: 940, z: 90, radius: 78, height: 36, color: 0x7e8a96, cover: true },
  { kind: "hangar", x: -980, z: 80, radius: 78, height: 36, color: 0x7e8a96, cover: true },
];