"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/shared/constants.ts
  var TICK_RATE, TICK_MS, CRUISE_SPEED, BOOST_SPEED, ACCEL, TURN_RATE, PITCH_RATE, PITCH_MAX, PLANE_RADIUS, MAX_HP, BULLET_SPEED, BULLET_DAMAGE, BULLET_LIFE, BULLET_RADIUS, FIRE_COOLDOWN, RESPAWN_DELAY, MAP_HALF, MAP_EDGE_SOFT, GROUND_Y, MIN_ALT, SPAWN_ALT, MAX_ALT, PICKUP_ALT_MIN, PICKUP_ALT_MAX, PICKUP_FIELD_RADIUS, BODY_SHAPE_COUNT, COLOR_COUNT, ACCENT_COUNT, TRAIL_COUNT, LIVERY_COUNT, SKIN_COUNT, POWERUP_DURATION, RAPID_FACTOR, SPREAD_ANGLE, AFTERBURNER_FACTOR, HOMING_TURN, LANDMARKS;
  var init_constants = __esm({
    "src/shared/constants.ts"() {
      "use strict";
      TICK_RATE = 30;
      TICK_MS = 1e3 / TICK_RATE;
      CRUISE_SPEED = 92;
      BOOST_SPEED = 155;
      ACCEL = 420;
      TURN_RATE = 2.2;
      PITCH_RATE = 1.35;
      PITCH_MAX = 0.5;
      PLANE_RADIUS = 16;
      MAX_HP = 100;
      BULLET_SPEED = 322;
      BULLET_DAMAGE = 25;
      BULLET_LIFE = 2.3;
      BULLET_RADIUS = 4;
      FIRE_COOLDOWN = 0.3;
      RESPAWN_DELAY = 1.2;
      MAP_HALF = 1800;
      MAP_EDGE_SOFT = 260;
      GROUND_Y = 0;
      MIN_ALT = 18;
      SPAWN_ALT = 58;
      MAX_ALT = 320;
      PICKUP_ALT_MIN = 28;
      PICKUP_ALT_MAX = 170;
      PICKUP_FIELD_RADIUS = 1120;
      BODY_SHAPE_COUNT = 4;
      COLOR_COUNT = 12;
      ACCENT_COUNT = 7;
      TRAIL_COUNT = 5;
      LIVERY_COUNT = 4;
      SKIN_COUNT = COLOR_COUNT;
      POWERUP_DURATION = 10;
      RAPID_FACTOR = 0.55;
      SPREAD_ANGLE = 0.12;
      AFTERBURNER_FACTOR = 1.22;
      HOMING_TURN = 1.45;
      LANDMARKS = [
        { kind: "tower", x: 0, z: 0, radius: 96, height: 170, color: 16747069, cover: true },
        { kind: "mesa", x: -620, z: -340, radius: 90, height: 56, color: 11636066, cover: true },
        { kind: "mesa", x: 720, z: -520, radius: 110, height: 62, color: 11636066, cover: true },
        { kind: "mesa", x: -760, z: 610, radius: 120, height: 60, color: 11636066, cover: true },
        { kind: "spire", x: 660, z: 660, radius: 54, height: 120, color: 9356031, cover: true },
        { kind: "spire", x: -180, z: 860, radius: 48, height: 108, color: 9356031, cover: true },
        { kind: "hangar", x: 940, z: 90, radius: 78, height: 36, color: 8293014, cover: true },
        { kind: "hangar", x: -980, z: 80, radius: 78, height: 36, color: 8293014, cover: true }
      ];
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
        homing: { label: "Homing", color: 12614655, icon: "\u{1F3AF}" },
        mine: { label: "Air Mines", color: 3820122, icon: "\u{1F4A3}" },
        star: { label: "Star", color: 16766720, icon: "\u2B50" },
        emp: { label: "EMP Burst", color: 6742271, icon: "\u{1F300}" },
        freeze: { label: "Freeze Ray", color: 10476799, icon: "\u2744\uFE0F" },
        // Colours match render3d.ts PICKUP_STYLES so the HUD chip and the world gem agree.
        ghost: { label: "Ghost", color: 16777215, icon: "\u{1F47B}" },
        magnet: { label: "Magnet", color: 53971, icon: "\u{1F9F2}" }
      };
      window.GAME = {
        CRUISE_SPEED,
        BOOST_SPEED,
        ACCEL,
        TURN_RATE,
        PITCH_RATE,
        PITCH_MAX,
        PLANE_RADIUS,
        MAX_HP,
        BULLET_SPEED,
        BULLET_DAMAGE,
        AFTERBURNER_FACTOR,
        RAPID_FACTOR,
        FIRE_COOLDOWN,
        RESPAWN_DELAY,
        BULLET_LIFE,
        BULLET_RADIUS,
        SPREAD_ANGLE,
        HOMING_TURN,
        TICK_RATE,
        SKIN_COUNT,
        BODY_SHAPE_COUNT,
        COLOR_COUNT,
        ACCENT_COUNT,
        TRAIL_COUNT,
        LIVERY_COUNT,
        MAP_HALF,
        MAP_EDGE_SOFT,
        GROUND_Y,
        MIN_ALT,
        SPAWN_ALT,
        MAX_ALT,
        PICKUP_ALT_MIN,
        PICKUP_ALT_MAX,
        PICKUP_FIELD_RADIUS,
        POWERUP_DURATION,
        POWERUPS,
        LANDMARKS
      };
    }
  });
  require_constants();
})();
