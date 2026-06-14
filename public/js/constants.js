"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/shared/sphere.ts
  function normalize(a) {
    const l = len(a);
    return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 0, y: 1, z: 0 };
  }
  function rotateAxis(v, k, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const kv = cross(k, v);
    const kd = dot(k, v) * (1 - c);
    return {
      x: v.x * c + kv.x * s + k.x * kd,
      y: v.y * c + kv.y * s + k.y * kd,
      z: v.z * c + kv.z * s + k.z * kd
    };
  }
  var vec, add, scale, dot, cross, len;
  var init_sphere = __esm({
    "src/shared/sphere.ts"() {
      "use strict";
      vec = (x, y, z) => ({ x, y, z });
      add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
      scale = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
      dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
      cross = (a, b) => ({
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
      });
      len = (a) => Math.sqrt(dot(a, a));
    }
  });

  // src/shared/constants.ts
  function dirFromHotspot(ang, az) {
    const up = Math.abs(HOTSPOT_DIR.y) < 0.9 ? vec(0, 1, 0) : vec(1, 0, 0);
    const east = normalize(cross(up, HOTSPOT_DIR));
    const north = cross(HOTSPOT_DIR, east);
    const tangent = add(scale(east, Math.cos(az)), scale(north, Math.sin(az)));
    const axis = normalize(cross(HOTSPOT_DIR, tangent));
    return normalize(rotateAxis(HOTSPOT_DIR, axis, ang));
  }
  var TICK_RATE, TICK_MS, CRUISE_SPEED, BOOST_SPEED, ACCEL, TURN_RATE, PLANE_RADIUS, MAX_HP, BULLET_SPEED, BULLET_LIFE, BULLET_RADIUS, FIRE_COOLDOWN, R_BASE, N_BASE, R_MIN, R_MAX, SKIN_COUNT, POWERUP_DURATION, RAPID_FACTOR, SPREAD_ANGLE, AFTERBURNER_FACTOR, HOMING_TURN, OBSTACLE_BEHAVIOR, HOTSPOT_DIR, ZONES, SPAWN_REROLL, T, OB_SPECS, OBSTACLES;
  var init_constants = __esm({
    "src/shared/constants.ts"() {
      "use strict";
      init_sphere();
      TICK_RATE = 30;
      TICK_MS = 1e3 / TICK_RATE;
      CRUISE_SPEED = 185;
      BOOST_SPEED = 320;
      ACCEL = 900;
      TURN_RATE = 3.2;
      PLANE_RADIUS = 20;
      MAX_HP = 100;
      BULLET_SPEED = 720;
      BULLET_LIFE = 1.1;
      BULLET_RADIUS = 6;
      FIRE_COOLDOWN = 0.22;
      R_BASE = 700;
      N_BASE = 6;
      R_MIN = 560;
      R_MAX = 820;
      SKIN_COUNT = 5;
      POWERUP_DURATION = 10;
      RAPID_FACTOR = 0.45;
      SPREAD_ANGLE = 0.18;
      AFTERBURNER_FACTOR = 1.4;
      HOMING_TURN = 2.6;
      OBSTACLE_BEHAVIOR = {
        spire: { solid: true, blocksBullets: true },
        rock: { solid: true, blocksBullets: true },
        tower: { solid: true, blocksBullets: true },
        arch: { solid: true, blocksBullets: true },
        ring: { solid: false, blocksBullets: false }
      };
      HOTSPOT_DIR = normalize(vec(0, 0.35, 1));
      ZONES = { centerAng: 0.34, midAng: 0.7 };
      SPAWN_REROLL = 8;
      T = Math.PI / 3;
      OB_SPECS = [
        { ang: 0, az: 0, angRadius: 0.12, height: 240, kind: "tower", landmark: "volcano" },
        // mid-ring cover (~0.55 rad from hotspot), three double as landmarks
        { ang: 0.55, az: 0 * T, angRadius: 0.09, height: 170, kind: "spire", landmark: "lighthouse" },
        { ang: 0.55, az: 1 * T, angRadius: 0.1, height: 95, kind: "rock", landmark: "shipwreck" },
        { ang: 0.55, az: 2 * T, angRadius: 0.09, height: 165, kind: "arch" },
        { ang: 0.55, az: 3 * T, angRadius: 0.1, height: 150, kind: "spire" },
        { ang: 0.55, az: 4 * T, angRadius: 0.09, height: 95, kind: "rock", landmark: "forest" },
        { ang: 0.55, az: 5 * T, angRadius: 0.09, height: 165, kind: "arch" },
        // inner spires
        { ang: 0.28, az: 0.5 * Math.PI, angRadius: 0.06, height: 130, kind: "spire" },
        { ang: 0.28, az: 1.5 * Math.PI, angRadius: 0.06, height: 130, kind: "spire" },
        // fly-through rings near the calmer edges
        { ang: 0.95, az: 0.2 * Math.PI, angRadius: 0.1, height: 120, kind: "ring" },
        { ang: 0.95, az: 1 * Math.PI, angRadius: 0.1, height: 120, kind: "ring" },
        { ang: 0.95, az: 1.6 * Math.PI, angRadius: 0.1, height: 120, kind: "ring" }
      ];
      OBSTACLES = OB_SPECS.map((s) => ({
        dir: dirFromHotspot(s.ang, s.az),
        angRadius: s.angRadius,
        height: s.height,
        kind: s.kind,
        landmark: s.landmark
      }));
    }
  });

  // src/client/constants.ts
  var require_constants = __commonJS({
    "src/client/constants.ts"() {
      init_constants();
      var POWERUPS = {
        spread: { label: "Spread", color: 7077771, icon: "\u{1F531}" },
        rapid: { label: "Rapid Fire", color: 16769354, icon: "\u26A1" },
        shield: { label: "Shield", color: 4833535, icon: "\u{1F6E1}\uFE0F" },
        afterburner: { label: "Afterburner", color: 16747586, icon: "\u{1F680}" },
        repair: { label: "Repair", color: 16739179, icon: "\u2764\uFE0F" },
        homing: { label: "Homing", color: 12614655, icon: "\u{1F3AF}" }
      };
      window.GAME = {
        CRUISE_SPEED,
        BOOST_SPEED,
        ACCEL,
        TURN_RATE,
        PLANE_RADIUS,
        MAX_HP,
        BULLET_SPEED,
        AFTERBURNER_FACTOR,
        RAPID_FACTOR,
        FIRE_COOLDOWN,
        BULLET_LIFE,
        BULLET_RADIUS,
        SPREAD_ANGLE,
        HOMING_TURN,
        TICK_RATE,
        SKIN_COUNT,
        R_BASE,
        R_MIN,
        R_MAX,
        N_BASE,
        POWERUP_DURATION,
        ZONES,
        OBSTACLE_BEHAVIOR,
        SPAWN_REROLL,
        POWERUPS,
        OB_SPECS,
        HOTSPOT_DIR,
        OBSTACLES
      };
    }
  });
  require_constants();
})();
