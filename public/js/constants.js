// Client mirror of the gameplay-relevant constants in src/shared/constants.ts.
// Used for local input prediction and rendering. Keep in sync with the server.
// GLOBE ARENA: positions are unit-vector directions; speeds are linear surface speeds (÷ radius → angular).
window.GAME = {
  CRUISE_SPEED: 185,
  BOOST_SPEED: 320,
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

  // Dynamic planet radius (reference; the live value is synced as state.radius).
  R_BASE: 700, R_MIN: 560, R_MAX: 820, N_BASE: 6,

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

  // ----- arena map content (sphere-native) — mirror of src/shared/constants.ts -----
  // Hotspot direction + obstacle specs (angle from hotspot, azimuth, angular radius). The client
  // builds unit-vector dirs from these via window.Sphere.dirFrom(HOTSPOT_DIR, ang, az).
  HOTSPOT_DIR: null, // set below (needs Sphere.normalize)
  ZONES: { centerAng: 0.34, midAng: 0.7 },
  OBSTACLE_BEHAVIOR: {
    spire: { solid: true,  blocksBullets: true },
    rock:  { solid: true,  blocksBullets: true },
    tower: { solid: true,  blocksBullets: true },
    arch:  { solid: true,  blocksBullets: true },
    ring:  { solid: false, blocksBullets: false },
  },
  OB_SPECS: [
    { ang: 0.0,  az: 0,            angRadius: 0.12, height: 240, kind: "tower", landmark: "volcano" },
    { ang: 0.55, az: 0,            angRadius: 0.09, height: 170, kind: "spire", landmark: "lighthouse" },
    { ang: 0.55, az: Math.PI / 3,        angRadius: 0.10, height: 95,  kind: "rock",  landmark: "shipwreck" },
    { ang: 0.55, az: 2 * Math.PI / 3,    angRadius: 0.09, height: 165, kind: "arch" },
    { ang: 0.55, az: Math.PI,            angRadius: 0.10, height: 150, kind: "spire" },
    { ang: 0.55, az: 4 * Math.PI / 3,    angRadius: 0.09, height: 95,  kind: "rock",  landmark: "forest" },
    { ang: 0.55, az: 5 * Math.PI / 3,    angRadius: 0.09, height: 165, kind: "arch" },
    { ang: 0.28, az: 0.5 * Math.PI,      angRadius: 0.06, height: 130, kind: "spire" },
    { ang: 0.28, az: 1.5 * Math.PI,      angRadius: 0.06, height: 130, kind: "spire" },
    { ang: 0.95, az: 0.2 * Math.PI,      angRadius: 0.10, height: 120, kind: "ring" },
    { ang: 0.95, az: 1.0 * Math.PI,      angRadius: 0.10, height: 120, kind: "ring" },
    { ang: 0.95, az: 1.6 * Math.PI,      angRadius: 0.10, height: 120, kind: "ring" },
  ],
};
// Build the hotspot direction + obstacle dirs once Sphere is available.
window.GAME.HOTSPOT_DIR = window.Sphere.normalize(window.Sphere.vec(0, 0.35, 1));
window.GAME.OBSTACLES = window.GAME.OB_SPECS.map(function (s) {
  return {
    dir: window.Sphere.dirFrom(window.GAME.HOTSPOT_DIR, s.ang, s.az),
    angRadius: s.angRadius, height: s.height, kind: s.kind, landmark: s.landmark,
  };
});
