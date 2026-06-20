// Client constants: imports gameplay values from shared/constants.ts and builds window.GAME.
// Shared constants remain the source of truth for both the server and the browser.
import {
  CRUISE_SPEED, BOOST_SPEED, ACCEL, TURN_RATE, PITCH_RATE, PITCH_MAX,
  PLANE_RADIUS, MAX_HP, BULLET_SPEED, BULLET_DAMAGE,
  AFTERBURNER_FACTOR, RAPID_FACTOR, FIRE_COOLDOWN,
  BULLET_LIFE, BULLET_RADIUS, SPREAD_ANGLE, HOMING_TURN,
  TICK_RATE, SKIN_COUNT,
  MAP_HALF, MAP_EDGE_SOFT, GROUND_Y, MIN_ALT, SPAWN_ALT, MAX_ALT,
  PICKUP_ALT_MIN, PICKUP_ALT_MAX, PICKUP_FIELD_RADIUS,
  POWERUP_DURATION,
  LANDMARKS,
} from "../shared/constants";

interface PowerupMeta { label: string; color: number; icon: string; }

const POWERUPS: Record<string, PowerupMeta> = {
  spread:      { label: "Spread",      color: 0x6bff8b, icon: "🔱" },
  rapid:       { label: "Rapid Fire",  color: 0xffe14a, icon: "⚡" },
  shield:      { label: "Shield",      color: 0x49c0ff, icon: "🛡️" },
  afterburner: { label: "Afterburner", color: 0xff8c42, icon: "🚀" },
  repair:      { label: "Repair",      color: 0xff6b6b, icon: "❤️" },
  homing:      { label: "Homing",      color: 0xc07bff, icon: "🎯" },
};

(window as any).GAME = {
  CRUISE_SPEED, BOOST_SPEED, ACCEL, TURN_RATE, PITCH_RATE, PITCH_MAX,
  PLANE_RADIUS, MAX_HP, BULLET_SPEED, BULLET_DAMAGE,
  AFTERBURNER_FACTOR, RAPID_FACTOR, FIRE_COOLDOWN,
  BULLET_LIFE, BULLET_RADIUS, SPREAD_ANGLE, HOMING_TURN,
  TICK_RATE, SKIN_COUNT,
  MAP_HALF, MAP_EDGE_SOFT, GROUND_Y, MIN_ALT, SPAWN_ALT, MAX_ALT,
  PICKUP_ALT_MIN, PICKUP_ALT_MAX, PICKUP_FIELD_RADIUS,
  POWERUP_DURATION,
  POWERUPS,
  LANDMARKS,
};