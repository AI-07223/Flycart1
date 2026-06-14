// Client constants: imports gameplay values from shared/constants.ts and builds window.GAME.
// This replaces the old gen-constants.mjs script — the shared module is the source of truth.
import {
  CRUISE_SPEED, BOOST_SPEED, ACCEL, TURN_RATE,
  PLANE_RADIUS, MAX_HP, BULLET_SPEED,
  AFTERBURNER_FACTOR, RAPID_FACTOR, FIRE_COOLDOWN,
  BULLET_LIFE, BULLET_RADIUS, SPREAD_ANGLE, HOMING_TURN,
  TICK_RATE, SKIN_COUNT,
  R_BASE, R_MIN, R_MAX, N_BASE,
  POWERUP_DURATION,
  ZONES, OBSTACLE_BEHAVIOR, SPAWN_REROLL,
  HOTSPOT_DIR, OBSTACLES, OB_SPECS,
} from "../shared/constants";

interface PowerupMeta { label: string; color: number; icon: string; }

const POWERUPS: Record<string, PowerupMeta> = {
  spread:      { label: "Spread",      color: 0x6bff8b, icon: "\u{1F531}" },
  rapid:       { label: "Rapid Fire",  color: 0xffe14a, icon: "\u26A1" },
  shield:      { label: "Shield",      color: 0x49c0ff, icon: "\u{1F6E1}\uFE0F" },
  afterburner: { label: "Afterburner", color: 0xff8c42, icon: "\u{1F680}" },
  repair:      { label: "Repair",      color: 0xff6b6b, icon: "\u2764\uFE0F" },
  homing:      { label: "Homing",      color: 0xc07bff, icon: "\u{1F3AF}" },
};

(window as any).GAME = {
  CRUISE_SPEED, BOOST_SPEED, ACCEL, TURN_RATE,
  PLANE_RADIUS, MAX_HP, BULLET_SPEED,
  AFTERBURNER_FACTOR, RAPID_FACTOR, FIRE_COOLDOWN,
  BULLET_LIFE, BULLET_RADIUS, SPREAD_ANGLE, HOMING_TURN,
  TICK_RATE, SKIN_COUNT,
  R_BASE, R_MIN, R_MAX, N_BASE,
  POWERUP_DURATION,
  ZONES, OBSTACLE_BEHAVIOR, SPAWN_REROLL,
  POWERUPS,
  OB_SPECS,
  HOTSPOT_DIR,
  OBSTACLES,
};
