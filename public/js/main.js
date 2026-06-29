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
  var TICK_RATE, TICK_MS, CRUISE_SPEED, BOOST_SPEED, ACCEL, TURN_RATE, PITCH_RATE, PITCH_MAX, PLANE_RADIUS, MAX_HP, BULLET_SPEED, BULLET_DAMAGE, BULLET_LIFE, BULLET_RADIUS, FIRE_COOLDOWN, RESPAWN_DELAY, BULLET_HIT_RADIUS, AIM_ASSIST_CONE, AIM_ASSIST_RANGE, AIM_ASSIST_TURN, ROUND_SECONDS, ROUND_INTERMISSION, MIN_PLAYERS, MAP_HALF, MAP_EDGE_SOFT, GROUND_Y, MIN_ALT, SPAWN_ALT, MAX_ALT, PICKUP_ALT_MIN, PICKUP_ALT_MAX, PICKUP_FIELD_RADIUS, SPAWN_REROLL, BOT_NAMES, COLOR_COUNT, ACCENT_COUNT, TRAIL_COUNT, LIVERY_COUNT, SKIN_COUNT, DEFAULT_BOT_DIFFICULTY, BOT_DIFFICULTY, PICKUP_MAX, PICKUP_INTERVAL, PICKUP_RADIUS, POWERUP_DURATION, SHIELD_CHARGES, RAPID_FACTOR, SPREAD_ANGLE, AFTERBURNER_FACTOR, HOMING_TURN, POWERUP_TYPES, POWERUP_WEIGHTS, SPAWN_INVULN, LOBBY_READY_TIMEOUT, TEAM_COUNT, LANDMARKS;
  var init_constants = __esm({
    "src/shared/constants.ts"() {
      "use strict";
      TICK_RATE = 30;
      TICK_MS = 1e3 / TICK_RATE;
      CRUISE_SPEED = 92;
      BOOST_SPEED = 138;
      ACCEL = 260;
      TURN_RATE = 1.5;
      PITCH_RATE = 1.05;
      PITCH_MAX = 0.5;
      PLANE_RADIUS = 16;
      MAX_HP = 100;
      BULLET_SPEED = 322;
      BULLET_DAMAGE = 25;
      BULLET_LIFE = 2.3;
      BULLET_RADIUS = 4;
      FIRE_COOLDOWN = 0.34;
      RESPAWN_DELAY = 2.5;
      BULLET_HIT_RADIUS = 26;
      AIM_ASSIST_CONE = 0.35;
      AIM_ASSIST_RANGE = 700;
      AIM_ASSIST_TURN = 0.55;
      ROUND_SECONDS = 150;
      ROUND_INTERMISSION = 8;
      MIN_PLAYERS = 4;
      MAP_HALF = 1800;
      MAP_EDGE_SOFT = 260;
      GROUND_Y = 0;
      MIN_ALT = 18;
      SPAWN_ALT = 58;
      MAX_ALT = 320;
      PICKUP_ALT_MIN = 28;
      PICKUP_ALT_MAX = 170;
      PICKUP_FIELD_RADIUS = 1120;
      SPAWN_REROLL = 14;
      BOT_NAMES = [
        "Maverick",
        "Goose",
        "Iceman",
        "Viper",
        "Rio",
        "Jester",
        "Slider",
        "Hollywood",
        "Merlin",
        "Wolfman"
      ];
      COLOR_COUNT = 12;
      ACCENT_COUNT = 7;
      TRAIL_COUNT = 5;
      LIVERY_COUNT = 4;
      SKIN_COUNT = COLOR_COUNT;
      DEFAULT_BOT_DIFFICULTY = "medium";
      BOT_DIFFICULTY = {
        easy: { aimErr: 0.3, fireCone: 0.12, leadFactor: 0.4, reactMin: 0.8, reactMax: 1.4 },
        medium: { aimErr: 0.16, fireCone: 0.13, leadFactor: 0.7, reactMin: 0.6, reactMax: 1 },
        high: { aimErr: 0.07, fireCone: 0.15, leadFactor: 0.9, reactMin: 0.4, reactMax: 0.8 }
      };
      PICKUP_MAX = 6;
      PICKUP_INTERVAL = 5.5;
      PICKUP_RADIUS = 44;
      POWERUP_DURATION = 10;
      SHIELD_CHARGES = 3;
      RAPID_FACTOR = 0.55;
      SPREAD_ANGLE = 0.12;
      AFTERBURNER_FACTOR = 1.22;
      HOMING_TURN = 1.45;
      POWERUP_TYPES = ["spread", "rapid", "shield", "afterburner", "repair", "homing"];
      POWERUP_WEIGHTS = {
        spread: 1,
        rapid: 1,
        shield: 1,
        afterburner: 1,
        repair: 0.7,
        homing: 0.55
      };
      SPAWN_INVULN = 1.2;
      LOBBY_READY_TIMEOUT = 120;
      TEAM_COUNT = 2;
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

  // src/shared/sphere.ts
  function normalize(a) {
    const l = len(a);
    return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 1, y: 0, z: 0 };
  }
  function rotateAxis(v, k, ang) {
    const axis = normalize(k);
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const kv = cross(axis, v);
    const kd = dot(axis, v) * (1 - c);
    return {
      x: v.x * c + kv.x * s + axis.x * kd,
      y: v.y * c + kv.y * s + axis.y * kd,
      z: v.z * c + kv.z * s + axis.z * kd
    };
  }
  function advance(p, f, dist) {
    const dir = normalize(f);
    return { p: add(p, scale(dir, dist)), f: dir };
  }
  function turn(_pos, f, ang) {
    return normalize(rotateAxis(f, WORLD_UP, ang));
  }
  function angBetween(a, b) {
    const na = normalize(a);
    const nb = normalize(b);
    return Math.acos(clamp(dot(na, nb), -1, 1));
  }
  function slerp(a, b, t) {
    const ta = normalize(a);
    const tb = normalize(b);
    const d = clamp(dot(ta, tb), -1, 1);
    if (d > 0.9995 || d < -0.9995) return normalize(lerpVec(ta, tb, t));
    const th = Math.acos(d);
    const s = Math.sin(th);
    const wa = Math.sin((1 - t) * th) / s;
    const wb = Math.sin(t * th) / s;
    return normalize({
      x: ta.x * wa + tb.x * wb,
      y: ta.y * wa + tb.y * wb,
      z: ta.z * wa + tb.z * wb
    });
  }
  function signedAngle(normal, from, to) {
    const n = normalize(normal);
    const a = normalize(from);
    const b = normalize(to);
    return Math.atan2(dot(cross(a, b), n), dot(a, b));
  }
  function yawPitchForward(yaw, pitch) {
    const cp = Math.cos(pitch);
    return normalize({
      x: Math.cos(yaw) * cp,
      y: Math.sin(pitch),
      z: Math.sin(yaw) * cp
    });
  }
  function yawPitchFromForward(f) {
    const dir = normalize(f);
    return {
      yaw: Math.atan2(dir.z, dir.x),
      pitch: Math.asin(clamp(dir.y, -1, 1))
    };
  }
  function withPitch(f, pitch) {
    const { yaw } = yawPitchFromForward(f);
    return yawPitchForward(yaw, pitch);
  }
  function segmentPointT(a, b, p) {
    const ab = sub(b, a);
    const ll = lenSq(ab);
    if (ll < 1e-9) return 0;
    return clamp(dot(sub(p, a), ab) / ll, 0, 1);
  }
  function segmentPointDistance(a, b, p) {
    const t = segmentPointT(a, b, p);
    return distance(add(a, scale(sub(b, a), t)), p);
  }
  var WORLD_UP, vec, add, sub, scale, dot, cross, lenSq, len, distanceSq, distance, clamp, lerp, lerpVec;
  var init_sphere = __esm({
    "src/shared/sphere.ts"() {
      "use strict";
      WORLD_UP = { x: 0, y: 1, z: 0 };
      vec = (x, y, z) => ({ x, y, z });
      add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
      sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
      scale = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
      dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
      cross = (a, b) => ({
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
      });
      lenSq = (a) => dot(a, a);
      len = (a) => Math.sqrt(lenSq(a));
      distanceSq = (a, b) => lenSq(sub(a, b));
      distance = (a, b) => Math.sqrt(distanceSq(a, b));
      clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      lerp = (a, b, t) => a + (b - a) * t;
      lerpVec = (a, b, t) => ({
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        z: lerp(a.z, b.z, t)
      });
    }
  });

  // src/shared/flight.ts
  function resolveLandmarkCollisions(pos, fwd, landmarks, radius) {
    let nextPos = { ...pos };
    let nextFwd = normalize(fwd);
    let collided = false;
    for (const landmark of landmarks) {
      const dx = nextPos.x - landmark.x;
      const dz = nextPos.z - landmark.z;
      const rr = landmark.radius + radius;
      if (dx * dx + dz * dz > rr * rr) continue;
      const floor = landmark.height + radius;
      if (nextPos.y > floor) continue;
      const out = normalize({ x: dx || 1, y: 0, z: dz || 0 });
      nextPos = {
        x: landmark.x + out.x * rr,
        y: Math.max(nextPos.y, floor),
        z: landmark.z + out.z * rr
      };
      nextFwd = normalize({
        x: lerp(nextFwd.x, out.x, 0.35),
        y: Math.max(0.08, nextFwd.y),
        z: lerp(nextFwd.z, out.z, 0.35)
      });
      collided = true;
    }
    return { pos: nextPos, fwd: nextFwd, collided };
  }
  var init_flight = __esm({
    "src/shared/flight.ts"() {
      "use strict";
      init_sphere();
    }
  });

  // src/sim/GameSim.ts
  function rand(min, max) {
    return min + Math.random() * (max - min);
  }
  function signWithDeadzone(v, deadzone) {
    return Math.abs(v) <= deadzone ? 0 : Math.sign(v);
  }
  function horizontal(v) {
    return { x: v.x, y: 0, z: v.z };
  }
  function normalizeHorizontal(v) {
    const h = horizontal(v);
    return lenSq(h) > 1e-9 ? normalize(h) : { x: 1, y: 0, z: 0 };
  }
  function signedYaw(from, to) {
    return signedAngle(WORLD_UP, normalizeHorizontal(from), normalizeHorizontal(to));
  }
  function steerToward(from, to, maxTurn) {
    const angle = angBetween(from, to);
    if (angle < 1e-5) return normalize(to);
    const t = Math.min(1, maxTurn / angle);
    return slerp(from, to, t);
  }
  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  function applyInputPatch(current, data) {
    if (!isRecord(data)) return null;
    const next = { ...current };
    const seq = typeof data.seq === "number" && Number.isFinite(data.seq) ? Math.floor(data.seq) : current.seq;
    if (seq < current.seq) return null;
    next.seq = seq;
    if (typeof data.turn === "number" && Number.isFinite(data.turn)) next.turn = clamp(data.turn, -1, 1);
    if (typeof data.climb === "number" && Number.isFinite(data.climb)) next.climb = clamp(data.climb, -1, 1);
    if (typeof data.boost === "boolean") next.boost = data.boost;
    if (typeof data.fire === "boolean") next.fire = data.fire;
    return next;
  }
  var ZERO_INPUT, TAU, getP, getF, setP, setF, GameSim;
  var init_GameSim = __esm({
    "src/sim/GameSim.ts"() {
      "use strict";
      init_constants();
      init_flight();
      init_sphere();
      ZERO_INPUT = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };
      TAU = Math.PI * 2;
      getP = (e) => ({ x: e.px, y: e.py, z: e.pz });
      getF = (e) => ({ x: e.fx, y: e.fy, z: e.fz });
      setP = (e, v) => {
        e.px = v.x;
        e.py = v.y;
        e.pz = v.z;
      };
      setF = (e, v) => {
        e.fx = v.x;
        e.fy = v.y;
        e.fz = v.z;
      };
      GameSim = class {
        constructor(opts) {
          // Simulation state — plain Maps of plain objects.
          this.players = /* @__PURE__ */ new Map();
          this.bullets = /* @__PURE__ */ new Map();
          this.pickups = /* @__PURE__ */ new Map();
          // Side-channel Maps (verbatim from ArenaRoom private fields).
          this.inputs = /* @__PURE__ */ new Map();
          this.lastShot = /* @__PURE__ */ new Map();
          this.respawnAt = /* @__PURE__ */ new Map();
          this.bots = /* @__PURE__ */ new Map();
          this.bulletLife = /* @__PURE__ */ new Map();
          this.powerUntil = /* @__PURE__ */ new Map();
          this.shield = /* @__PURE__ */ new Map();
          this.invulnUntil = /* @__PURE__ */ new Map();
          // Scalar sim state.
          this.now = 0;
          this.bulletSeq = 0;
          this.botSeq = 0;
          this.pickupSeq = 0;
          this.pickupAt = 0;
          this.lobbyElapsed = 0;
          this.hostId = "";
          this.botsEnabled = opts.botsEnabled;
          this.isPublic = opts.isPublic;
          this.onEvent = opts.onEvent;
          this.roundLength = ROUND_SECONDS;
          this.roomName = "";
          this.botsInRoom = opts.botsEnabled;
          this.mode = "ffa";
          this.teamScore0 = 0;
          this.teamScore1 = 0;
          this.botDifficulty = DEFAULT_BOT_DIFFICULTY;
          if (this.isPublic) {
            this.phase = "playing";
            this.timeLeft = ROUND_SECONDS;
          } else {
            this.phase = "lobby";
            this.timeLeft = 0;
            this.lobbyElapsed = 0;
          }
          if (opts.initialState) {
            this._restoreFromSnapshot(opts.initialState);
          }
        }
        /**
         * Restore all simulation state from a snapshot (used during P2P host migration).
         * Bullets are skipped (acceptable in-flight loss per design).
         * Side-channel maps that are not in the snapshot (powerUntil, invulnUntil, etc.)
         * are left empty — a tolerable loss for a single migration event.
         */
        _restoreFromSnapshot(snap) {
          this.phase = snap.phase ?? this.phase;
          this.timeLeft = snap.timeLeft ?? this.timeLeft;
          this.hostId = snap.hostId ?? this.hostId;
          this.roundLength = snap.roundLength ?? this.roundLength;
          this.roomName = snap.roomName ?? this.roomName;
          this.botsInRoom = snap.botsInRoom ?? this.botsInRoom;
          this.mode = snap.mode ?? this.mode;
          this.teamScore0 = snap.teamScore0 ?? this.teamScore0;
          this.teamScore1 = snap.teamScore1 ?? this.teamScore1;
          this.botDifficulty = snap.botDifficulty ?? this.botDifficulty;
          this.players.clear();
          this.inputs.clear();
          const ZERO = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };
          if (Array.isArray(snap.players)) {
            for (const [id, p] of snap.players) {
              this.players.set(id, { ...p });
              this.inputs.set(id, { ...ZERO, seq: p.seq ?? 0 });
            }
          }
          this.pickups.clear();
          if (Array.isArray(snap.pickups)) {
            for (const [id, pk] of snap.pickups) {
              this.pickups.set(id, { ...pk });
            }
          }
          this.bullets.clear();
          this.bulletLife.clear();
          this.bulletSeq = 0;
          this.now = 0;
        }
        // ---------------------------------------------------------------------------
        // Public API
        // ---------------------------------------------------------------------------
        /**
         * Add a player to the simulation. Creates a SimPlayer with default values,
         * then overwrites cosmetics+name from opts. Applies the same spawn/lobby
         * logic as the old onJoin.
         */
        addPlayer(id, opts) {
          const p = {
            name: opts.name,
            px: 0,
            py: SPAWN_ALT,
            pz: 0,
            fx: 1,
            fy: 0,
            fz: 0,
            seq: 0,
            speed: 0,
            turn: 0,
            climb: 0,
            hp: MAX_HP,
            score: 0,
            skin: opts.skin,
            alive: true,
            bot: false,
            boosting: false,
            power: "",
            powerLeft: 0,
            ready: false,
            bodyShape: opts.bodyShape,
            accent: opts.accent,
            trail: opts.trail,
            livery: opts.livery,
            team: -1
          };
          if (this.isPublic) {
            this.spawn(id, p);
          } else {
            p.alive = false;
            p.px = 0;
            p.py = SPAWN_ALT;
            p.pz = 0;
            p.fx = 1;
            p.fy = 0;
            p.fz = 0;
            p.speed = 0;
            p.hp = MAX_HP;
            if (this.hostId === "") {
              this.hostId = id;
            }
          }
          this.players.set(id, p);
          this.inputs.set(id, { ...ZERO_INPUT });
          return p;
        }
        /**
         * Remove a player from the simulation, cleaning up ALL side-channel Maps
         * and host reassignment. Returns the id for call-site convenience.
         */
        removePlayer(id) {
          if (id === this.hostId) {
            let nextHost = "";
            for (const [pid, p] of this.players) {
              if (pid !== id && !p.bot) {
                nextHost = pid;
                break;
              }
            }
            this.hostId = nextHost;
          }
          this.players.delete(id);
          this.inputs.delete(id);
          this.lastShot.delete(id);
          this.respawnAt.delete(id);
          this.bots.delete(id);
          this.bulletLife.forEach((_value, key) => {
            const bullet = this.bullets.get(key);
            if (bullet && bullet.owner === id) {
              this.bullets.delete(key);
              this.bulletLife.delete(key);
            }
          });
          this.powerUntil.delete(id);
          this.shield.delete(id);
          this.invulnUntil.delete(id);
          return id;
        }
        /**
         * Apply a validated input patch. No rate limiting here — that lives in ArenaRoom.
         */
        applyInput(id, data) {
          const cur = this.inputs.get(id);
          if (!cur) return;
          const next = applyInputPatch(cur, data);
          if (!next) return;
          this.inputs.set(id, next);
        }
        /**
         * Force-zero the input for a player, bypassing seq validation.
         * Used by the adapter during the reconnect window so the plane doesn't
         * keep flying with stale input — mirrors the old direct map assignment.
         */
        zeroInput(id) {
          const cur = this.inputs.get(id);
          if (!cur) return;
          this.inputs.set(id, { ...ZERO_INPUT, seq: cur.seq });
        }
        setPlayerName(id, name) {
          const p = this.players.get(id);
          if (p) p.name = name;
        }
        setReady(id) {
          const p = this.players.get(id);
          if (!p || p.bot) return;
          p.ready = !p.ready;
          this.checkAutoStart();
        }
        hostStart(callerId) {
          if (callerId !== this.hostId) return;
          if (this.phase !== "lobby") return;
          this.startMatch();
        }
        /**
         * Update host-controlled room settings (round length, room name, and/or bots).
         * Silently ignores calls from non-hosts.
         */
        setHostSettings(callerId, s) {
          if (callerId !== this.hostId) return;
          if (typeof s.roundLength === "number" && Number.isFinite(s.roundLength)) {
            this.roundLength = Math.max(60, Math.min(300, Math.round(s.roundLength)));
          }
          if (typeof s.roomName === "string") {
            this.roomName = s.roomName.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 20);
          }
          if (typeof s.botsInRoom === "boolean" && !this.isPublic) {
            this.botsInRoom = s.botsInRoom;
            if (!this.botsInRoom) {
              for (const id of [...this.bots.keys()]) this.removePlayer(id);
            }
          }
          if (typeof s.mode === "string" && (s.mode === "ffa" || s.mode === "tdm")) {
            this.mode = s.mode;
          }
          if (typeof s.botDifficulty === "string" && (s.botDifficulty === "easy" || s.botDifficulty === "medium" || s.botDifficulty === "high") && !this.isPublic) {
            this.botDifficulty = s.botDifficulty;
            for (const [, brain] of this.bots) this._applyDifficulty(brain);
          }
        }
        _applyDifficulty(brain) {
          const d = BOT_DIFFICULTY[this.botDifficulty] ?? BOT_DIFFICULTY[DEFAULT_BOT_DIFFICULTY];
          brain.aimErr = d.aimErr;
          brain.fireCone = d.fireCone;
          brain.leadFactor = d.leadFactor;
          brain.reactMin = d.reactMin;
          brain.reactMax = d.reactMax;
        }
        /**
         * Validates and removes the target player from the sim.
         * Returns the targetId to kick at the transport layer, or null if invalid.
         * The actual client.leave() call stays in ArenaRoom.
         */
        hostKick(callerId, targetId) {
          if (callerId !== this.hostId) return null;
          const target = this.players.get(targetId);
          if (!target || target.bot) return null;
          if (targetId === callerId) return null;
          this.removePlayer(targetId);
          return targetId;
        }
        /**
         * Advance the simulation by dt seconds. This is the main loop driver.
         */
        tick(dt) {
          this.now += dt;
          const playing = this.phase === "playing";
          if (playing) {
            this.maintainBots();
            this.maintainPickups();
          }
          this.updateTimer(dt);
          if (playing) {
            for (const [id, brain] of this.bots) this.thinkBot(id, brain);
            for (const [id, p] of this.players) {
              if (!p.alive) {
                const at = this.respawnAt.get(id) ?? 0;
                if (this.now >= at) this.spawn(id, p);
                continue;
              }
              this.stepPlane(id, p, dt, playing);
            }
            this.stepBullets(dt, playing);
            this.collectPickups();
            this.expirePowers();
          }
        }
        /**
         * Returns readonly references to the Maps and scalar state.
         * The adapter (ArenaRoom) reads this to sync into the Colyseus Schema.
         */
        getState() {
          return {
            players: this.players,
            bullets: this.bullets,
            pickups: this.pickups,
            phase: this.phase,
            timeLeft: this.timeLeft,
            hostId: this.hostId,
            roundLength: this.roundLength,
            roomName: this.roomName,
            botsInRoom: this.botsInRoom,
            mode: this.mode,
            teamScore0: this.teamScore0,
            teamScore1: this.teamScore1,
            botDifficulty: this.botDifficulty
          };
        }
        /**
         * Deep plain-object copy of all state — suitable for P2P snapshot transmission.
         */
        snapshot() {
          return {
            players: Array.from(this.players.entries()).map(([k, v]) => [k, { ...v }]),
            bullets: Array.from(this.bullets.entries()).map(([k, v]) => [k, { ...v }]),
            pickups: Array.from(this.pickups.entries()).map(([k, v]) => [k, { ...v }]),
            phase: this.phase,
            timeLeft: this.timeLeft,
            hostId: this.hostId,
            roundLength: this.roundLength,
            roomName: this.roomName,
            botsInRoom: this.botsInRoom,
            mode: this.mode,
            teamScore0: this.teamScore0,
            teamScore1: this.teamScore1,
            botDifficulty: this.botDifficulty
          };
        }
        // ---------------------------------------------------------------------------
        // Internal simulation methods (moved verbatim from ArenaRoom, substitutions applied)
        // ---------------------------------------------------------------------------
        updateTimer(dt) {
          if (this.phase === "lobby") {
            let humanCount = 0;
            for (const [, p] of this.players) if (!p.bot) humanCount++;
            if (humanCount >= 2) {
              this.lobbyElapsed += dt;
              if (this.lobbyElapsed >= LOBBY_READY_TIMEOUT) {
                this.startMatch();
              }
            } else {
              this.lobbyElapsed = 0;
            }
            return;
          }
          if (this.phase === "playing") {
            this.timeLeft = Math.max(0, this.timeLeft - dt);
            if (this.timeLeft <= 0) {
              const scores = Array.from(this.players.values()).filter((p) => !p.bot && p.score > 0).map((p) => ({ name: p.name, score: p.score }));
              this.onEvent({ type: "roundEnd", scores });
              this.phase = "intermission";
              this.timeLeft = ROUND_INTERMISSION;
            }
            return;
          }
          this.timeLeft = Math.max(0, this.timeLeft - dt);
          if (this.timeLeft > 0) return;
          if (this.isPublic) {
            for (const [id, p] of this.players) {
              p.score = 0;
              this.spawn(id, p);
            }
            this.phase = "playing";
            this.timeLeft = ROUND_SECONDS;
          } else {
            for (const [, p] of this.players) {
              p.score = 0;
              p.ready = false;
              p.alive = false;
            }
            this.lobbyElapsed = 0;
            this.phase = "lobby";
            this.timeLeft = 0;
          }
        }
        stepPlane(id, p, dt, playing) {
          const input = this.inputs.get(id) ?? ZERO_INPUT;
          let pos = getP(p);
          let fwd = normalize(getF(p));
          const angles = yawPitchFromForward(fwd);
          const yaw = angles.yaw + input.turn * TURN_RATE * dt;
          const pitch = clamp(angles.pitch + input.climb * PITCH_RATE * dt, -PITCH_MAX, PITCH_MAX);
          fwd = yawPitchForward(yaw, pitch);
          p.turn = input.turn;
          p.climb = input.climb;
          p.boosting = input.boost;
          p.seq = Math.max(p.seq, input.seq);
          let targetSpeed = input.boost ? BOOST_SPEED : CRUISE_SPEED;
          if (p.power === "afterburner") targetSpeed *= AFTERBURNER_FACTOR;
          const delta = targetSpeed - p.speed;
          const step = Math.sign(delta) * ACCEL * dt;
          p.speed = Math.abs(step) >= Math.abs(delta) ? targetSpeed : p.speed + step;
          const edge = Math.max(Math.abs(pos.x), Math.abs(pos.z));
          if (edge > MAP_HALF - MAP_EDGE_SOFT) {
            const edgeT = clamp((edge - (MAP_HALF - MAP_EDGE_SOFT)) / MAP_EDGE_SOFT, 0, 1);
            const home = normalizeHorizontal({ x: -pos.x, y: 0, z: -pos.z });
            fwd = normalize({
              x: lerp(fwd.x, home.x, edgeT * 0.25),
              y: fwd.y * (1 - edgeT * 0.2),
              z: lerp(fwd.z, home.z, edgeT * 0.25)
            });
          }
          pos = advance(pos, fwd, p.speed * dt).p;
          const collision = resolveLandmarkCollisions(pos, fwd, LANDMARKS, PLANE_RADIUS);
          pos = collision.pos;
          fwd = collision.fwd;
          pos.x = clamp(pos.x, -MAP_HALF, MAP_HALF);
          pos.z = clamp(pos.z, -MAP_HALF, MAP_HALF);
          pos.y = clamp(pos.y, MIN_ALT, MAX_ALT);
          if (pos.y <= MIN_ALT + 0.01 && fwd.y < 0) fwd = withPitch(fwd, 0.02);
          if (pos.y >= MAX_ALT - 0.01 && fwd.y > 0) fwd = withPitch(fwd, -0.02);
          setP(p, pos);
          setF(p, normalize(fwd));
          if (input.fire && playing) this.tryFire(id, p);
        }
        tryFire(id, p) {
          this.invulnUntil.delete(id);
          const last = this.lastShot.get(id) ?? -999;
          const cooldown = FIRE_COOLDOWN * (p.power === "rapid" ? RAPID_FACTOR : 1);
          if (this.now - last < cooldown) return;
          this.lastShot.set(id, this.now);
          const pos = getP(p);
          const fwd = getF(p);
          if (p.power === "spread") {
            this.spawnBullet(id, pos, turn(pos, fwd, -SPREAD_ANGLE), false);
            this.spawnBullet(id, pos, fwd, false);
            this.spawnBullet(id, pos, turn(pos, fwd, SPREAD_ANGLE), false);
          } else {
            this.spawnBullet(id, pos, fwd, p.power === "homing");
          }
        }
        spawnBullet(owner, pos, fwd, homing) {
          const b = {
            px: 0,
            py: 0,
            pz: 0,
            fx: 1,
            fy: 0,
            fz: 0,
            owner,
            homing
          };
          const start = add(pos, scale(normalize(fwd), PLANE_RADIUS + 10));
          setP(b, start);
          setF(b, normalize(fwd));
          const key = `b${this.bulletSeq++}`;
          this.bulletLife.set(key, BULLET_LIFE);
          this.bullets.set(key, b);
        }
        stepBullets(dt, playing) {
          for (const [key, b] of this.bullets) {
            const life = (this.bulletLife.get(key) ?? BULLET_LIFE) - dt;
            if (life <= 0) {
              this.bullets.delete(key);
              this.bulletLife.delete(key);
              continue;
            }
            this.bulletLife.set(key, life);
            let pos = getP(b);
            let fwd = normalize(getF(b));
            if (b.homing) {
              const target = this.closestTarget(b.owner, pos);
              if (target) {
                const desired = normalize(sub(getP(target.player), pos));
                fwd = steerToward(fwd, desired, HOMING_TURN * dt);
              }
            } else {
              const ownerPlayer = this.players.get(b.owner);
              if (ownerPlayer && !ownerPlayer.bot) {
                let bestAssistDist = Infinity;
                let assistTarget = null;
                for (const [pid, p] of this.players) {
                  if (!p.alive || pid === b.owner) continue;
                  const toTarget = sub(getP(p), pos);
                  const dist = len(toTarget);
                  if (dist > AIM_ASSIST_RANGE) continue;
                  const angle = angBetween(fwd, normalize(toTarget));
                  if (angle > AIM_ASSIST_CONE) continue;
                  if (dist < bestAssistDist) {
                    bestAssistDist = dist;
                    assistTarget = p;
                  }
                }
                if (assistTarget) {
                  const desired = normalize(sub(getP(assistTarget), pos));
                  fwd = steerToward(fwd, desired, AIM_ASSIST_TURN * dt);
                }
              }
            }
            const prev = pos;
            pos = advance(pos, fwd, BULLET_SPEED * dt).p;
            let bestT = Infinity;
            let victim = null;
            let victimId = "";
            let blocked = false;
            if (playing) {
              for (const [pid, p] of this.players) {
                if (!p.alive || pid === b.owner) continue;
                const targetPos = getP(p);
                const hitDist = BULLET_HIT_RADIUS + BULLET_RADIUS;
                if (segmentPointDistance(prev, pos, targetPos) > hitDist) continue;
                const t = segmentPointT(prev, pos, targetPos);
                if (t < bestT) {
                  bestT = t;
                  victim = p;
                  victimId = pid;
                  blocked = false;
                }
              }
            }
            for (const landmark of LANDMARKS) {
              if (!landmark.cover) continue;
              const cylPoint = { x: landmark.x, y: 0, z: landmark.z };
              const flatA = { x: prev.x, y: 0, z: prev.z };
              const flatB = { x: pos.x, y: 0, z: pos.z };
              if (segmentPointDistance(flatA, flatB, cylPoint) > landmark.radius + BULLET_RADIUS) continue;
              const t = segmentPointT(flatA, flatB, cylPoint);
              const y = lerp(prev.y, pos.y, t);
              if (y > landmark.height + BULLET_RADIUS) continue;
              if (t < bestT) {
                bestT = t;
                victim = null;
                blocked = true;
              }
            }
            if (victim || blocked) {
              if (victim) this.damage(victim, victimId, b.owner);
              this.bullets.delete(key);
              this.bulletLife.delete(key);
              continue;
            }
            if (Math.abs(pos.x) > MAP_HALF || Math.abs(pos.z) > MAP_HALF || pos.y < GROUND_Y || pos.y > MAX_ALT + 40) {
              this.bullets.delete(key);
              this.bulletLife.delete(key);
              continue;
            }
            setP(b, pos);
            setF(b, fwd);
          }
        }
        damage(p, victimId, killerId) {
          if (this.mode === "tdm") {
            const killer2 = this.players.get(killerId);
            if (killer2 && killer2.team >= 0 && p.team >= 0 && killer2.team === p.team) return;
          }
          if (this.now < (this.invulnUntil.get(victimId) ?? 0)) return;
          const shield = this.shield.get(victimId) ?? 0;
          if (shield > 0) {
            this.shield.set(victimId, shield - 1);
            if (shield - 1 <= 0) {
              this.shield.delete(victimId);
              if (p.power === "shield") this.clearPower(victimId, p);
            }
            return;
          }
          p.hp -= BULLET_DAMAGE;
          if (p.hp > 0) return;
          p.hp = 0;
          p.alive = false;
          p.boosting = false;
          p.turn = 0;
          p.climb = 0;
          this.clearPower(victimId, p);
          this.respawnAt.set(victimId, this.now + RESPAWN_DELAY);
          const killer = this.players.get(killerId);
          if (killer && killerId !== victimId) {
            killer.score += 1;
            if (this.mode === "tdm" && killer.team === 0) {
              this.teamScore0 += 1;
            } else if (this.mode === "tdm" && killer.team === 1) {
              this.teamScore1 += 1;
            }
          }
          this.onEvent({
            type: "kill",
            killer: killerId,
            victim: victimId,
            killerName: killer ? killer.name : "?",
            victimName: p.name
          });
        }
        maintainPickups() {
          if (this.pickups.size >= PICKUP_MAX || this.now < this.pickupAt) return;
          this.pickupAt = this.now + PICKUP_INTERVAL;
          const pk = {
            type: this.weightedPowerup(),
            px: 0,
            py: 0,
            pz: 0
          };
          setP(pk, this.pickPickupPosition());
          this.pickups.set(`pk${this.pickupSeq++}`, pk);
        }
        pickPickupPosition() {
          let best = vec(0, SPAWN_ALT, 0);
          for (let i = 0; i < SPAWN_REROLL; i++) {
            const r = Math.pow(Math.random(), 1.35) * PICKUP_FIELD_RADIUS;
            const ang = Math.random() * TAU;
            const pos = vec(Math.cos(ang) * r, rand(PICKUP_ALT_MIN, PICKUP_ALT_MAX), Math.sin(ang) * r);
            if (this.insideLandmark(pos, PICKUP_RADIUS)) continue;
            best = pos;
            break;
          }
          return best;
        }
        weightedPowerup() {
          let total = 0;
          for (const type of POWERUP_TYPES) total += POWERUP_WEIGHTS[type] ?? 1;
          let roll = Math.random() * total;
          for (const type of POWERUP_TYPES) {
            roll -= POWERUP_WEIGHTS[type] ?? 1;
            if (roll <= 0) return type;
          }
          return POWERUP_TYPES[0];
        }
        collectPickups() {
          for (const [key, pk] of this.pickups) {
            const pkPos = getP(pk);
            for (const [pid, p] of this.players) {
              if (!p.alive) continue;
              if (distance(pkPos, getP(p)) > PICKUP_RADIUS + PLANE_RADIUS) continue;
              if (pk.type === "repair" && p.hp >= MAX_HP) continue;
              this.applyPowerup(pid, p, pk.type);
              this.pickups.delete(key);
              this.onEvent({ type: "pickup", by: pid, pickupType: pk.type });
              break;
            }
          }
        }
        applyPowerup(id, p, type) {
          if (type === "repair") {
            p.hp = MAX_HP;
            return;
          }
          this.shield.delete(id);
          p.power = type;
          p.powerLeft = POWERUP_DURATION;
          this.powerUntil.set(id, this.now + POWERUP_DURATION);
          if (type === "shield") this.shield.set(id, SHIELD_CHARGES);
        }
        clearPower(id, p) {
          this.powerUntil.delete(id);
          this.shield.delete(id);
          if (p) {
            p.power = "";
            p.powerLeft = 0;
          }
        }
        expirePowers() {
          for (const [id, until] of this.powerUntil) {
            const p = this.players.get(id);
            if (!p) {
              this.powerUntil.delete(id);
              continue;
            }
            if (this.now >= until) this.clearPower(id, p);
            else p.powerLeft = Math.max(0, until - this.now);
          }
        }
        spawn(id, p) {
          const pos = this.pickSpawnPoint();
          const center = normalizeHorizontal({ x: -pos.x, y: 0, z: -pos.z });
          const yaw = Math.atan2(center.z, center.x) + rand(-0.4, 0.4);
          const pitch = rand(-0.06, 0.08);
          const fwd = yawPitchForward(yaw, pitch);
          setP(p, pos);
          setF(p, fwd);
          p.seq = this.inputs.get(id)?.seq ?? 0;
          p.speed = CRUISE_SPEED;
          p.turn = 0;
          p.climb = 0;
          p.hp = MAX_HP;
          p.alive = true;
          p.boosting = false;
          this.clearPower(id, p);
          this.lastShot.delete(id);
          this.invulnUntil.set(id, this.now + SPAWN_INVULN);
        }
        pickSpawnPoint() {
          let best = vec(0, SPAWN_ALT, 0);
          let bestScore = -Infinity;
          for (let i = 0; i < SPAWN_REROLL; i++) {
            const ang = Math.random() * TAU;
            const r = rand(MAP_HALF * 0.45, MAP_HALF * 0.8);
            const pos = vec(Math.cos(ang) * r, rand(SPAWN_ALT - 18, SPAWN_ALT + 42), Math.sin(ang) * r);
            if (this.insideLandmark(pos, PLANE_RADIUS)) continue;
            let nearest = Infinity;
            for (const [, other] of this.players) {
              if (!other.alive) continue;
              nearest = Math.min(nearest, distance(pos, getP(other)));
            }
            const centerPull = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
            const score = (nearest === Infinity ? 1200 : nearest) + centerPull * 0.12;
            if (score > bestScore) {
              bestScore = score;
              best = pos;
            }
          }
          return best;
        }
        insideLandmark(pos, radius) {
          for (const landmark of LANDMARKS) {
            if (!landmark.cover) continue;
            const rr = landmark.radius + radius;
            const dx = pos.x - landmark.x;
            const dz = pos.z - landmark.z;
            if (dx * dx + dz * dz <= rr * rr && pos.y <= landmark.height + radius) return true;
          }
          return false;
        }
        startMatch() {
          this.phase = "playing";
          this.timeLeft = this.roundLength;
          this.lobbyElapsed = 0;
          this.teamScore0 = 0;
          this.teamScore1 = 0;
          if (this.mode === "tdm") {
            let teamIdx = 0;
            for (const [, p] of this.players) {
              p.team = teamIdx % TEAM_COUNT;
              teamIdx++;
            }
          }
          for (const [id, p] of this.players) {
            p.score = 0;
            p.ready = false;
            this.spawn(id, p);
          }
        }
        checkAutoStart() {
          if (this.phase !== "lobby") return;
          let humanCount = 0;
          let readyCount = 0;
          for (const [, p] of this.players) {
            if (!p.bot) {
              humanCount++;
              if (p.ready) readyCount++;
            }
          }
          if (humanCount >= 2 && readyCount === humanCount) {
            this.startMatch();
          }
        }
        maintainBots() {
          const shouldMaintain = this.isPublic ? this.botsEnabled : this.botsEnabled && this.botsInRoom;
          if (!shouldMaintain) {
            for (const id of [...this.bots.keys()]) this.removePlayer(id);
            return;
          }
          const total = this.players.size;
          if (total < MIN_PLAYERS) {
            this.addBot();
            return;
          }
          if (this.bots.size > 0 && total > MIN_PLAYERS) {
            const firstBot = this.bots.keys().next().value;
            if (firstBot) this.removePlayer(firstBot);
          }
        }
        addBot() {
          const id = `bot_${this.botSeq++}`;
          const p = {
            name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
            px: 0,
            py: 0,
            pz: 0,
            fx: 1,
            fy: 0,
            fz: 0,
            seq: 0,
            speed: 0,
            turn: 0,
            climb: 0,
            hp: MAX_HP,
            score: 0,
            skin: Math.floor(Math.random() * SKIN_COUNT),
            alive: true,
            bot: true,
            boosting: false,
            power: "",
            powerLeft: 0,
            ready: false,
            bodyShape: Math.floor(Math.random() * 2),
            // capped [0,1] to protect mobile draw calls
            accent: Math.floor(Math.random() * ACCENT_COUNT),
            trail: Math.floor(Math.random() * TRAIL_COUNT),
            livery: Math.floor(Math.random() * LIVERY_COUNT),
            team: -1
          };
          if (this.mode === "tdm" && this.phase === "playing") {
            let t0 = 0;
            let t1 = 0;
            for (const [, pl] of this.players) {
              if (pl.team === 0) t0++;
              else if (pl.team === 1) t1++;
            }
            p.team = t0 <= t1 ? 0 : 1;
          }
          this.spawn(id, p);
          this.players.set(id, p);
          this.inputs.set(id, { ...ZERO_INPUT });
          const brain = {
            targetId: null,
            retargetAt: 0,
            wanderYaw: rand(-1, 1),
            aimErr: 0,
            fireCone: 0.15,
            leadFactor: 1,
            reactMin: 0.6,
            reactMax: 1.2,
            aimJitter: 0
          };
          this._applyDifficulty(brain);
          brain.aimJitter = rand(-brain.aimErr, brain.aimErr);
          this.bots.set(id, brain);
        }
        thinkBot(id, brain) {
          const me = this.players.get(id);
          const input = this.inputs.get(id);
          if (!me || !input) return;
          if (!me.alive) {
            input.turn = 0;
            input.climb = 0;
            input.boost = false;
            input.fire = false;
            return;
          }
          if (this.now >= brain.retargetAt) {
            brain.targetId = this.pickBotTarget(id, getP(me));
            brain.retargetAt = this.now + rand(brain.reactMin, brain.reactMax);
            brain.aimJitter = rand(-brain.aimErr, brain.aimErr);
          }
          const myPos = getP(me);
          const myFwd = getF(me);
          const target = brain.targetId ? this.players.get(brain.targetId) : void 0;
          let desired = normalize({ x: Math.cos(brain.wanderYaw), y: 0, z: Math.sin(brain.wanderYaw) });
          let fire = false;
          let boost = false;
          const pickup = this.bestPickupForBot(me);
          if (pickup && (!target || me.hp < 45 || me.power === "")) {
            desired = normalize(sub(pickup, myPos));
          }
          if (target && target.alive) {
            const targetPos = getP(target);
            const leadTime = distance(myPos, targetPos) / Math.max(BULLET_SPEED, 1) * 0.8 * brain.leadFactor;
            const leadPos = add(targetPos, scale(getF(target), target.speed * leadTime));
            desired = normalize(sub(leadPos, myPos));
            desired = turn(myPos, desired, brain.aimJitter);
            if (me.hp < 35 && distance(myPos, targetPos) < 340) {
              desired = normalize(add(sub(myPos, targetPos), scale(normalizeHorizontal({ x: -myPos.x, y: 0, z: -myPos.z }), 0.6)));
              boost = true;
            }
            const aim = Math.abs(signedYaw(myFwd, desired));
            const altDelta = targetPos.y - myPos.y;
            fire = aim < brain.fireCone && Math.abs(altDelta) < 70 && distance(myPos, targetPos) < 560;
            boost = boost || distance(myPos, targetPos) > 520;
          } else {
            brain.wanderYaw += rand(-0.25, 0.25);
            desired = normalize({ x: Math.cos(brain.wanderYaw), y: signWithDeadzone(SPAWN_ALT - myPos.y, 18) * 0.18, z: Math.sin(brain.wanderYaw) });
          }
          const edge = Math.max(Math.abs(myPos.x), Math.abs(myPos.z));
          if (edge > MAP_HALF - MAP_EDGE_SOFT * 1.1) {
            desired = normalize(add(desired, scale(normalizeHorizontal({ x: -myPos.x, y: 0, z: -myPos.z }), 0.8)));
            boost = true;
          }
          input.turn = signWithDeadzone(signedYaw(myFwd, desired), 0.06);
          input.climb = signWithDeadzone(desired.y, 0.08);
          input.boost = boost;
          input.fire = fire;
          input.seq += 1;
        }
        pickBotTarget(selfId, myPos) {
          let bestId = null;
          let bestScore = -Infinity;
          for (const [pid, p] of this.players) {
            if (pid === selfId || !p.alive) continue;
            const pos = getP(p);
            const dist = distance(myPos, pos);
            const centerBias = 1 - Math.min(1, Math.sqrt(pos.x * pos.x + pos.z * pos.z) / MAP_HALF);
            let score = 1 / Math.max(1, dist);
            score += centerBias * 4e-3;
            score += (MAX_HP - p.hp) * 8e-4;
            if (score > bestScore) {
              bestScore = score;
              bestId = pid;
            }
          }
          return bestId;
        }
        bestPickupForBot(me) {
          let best = null;
          let bestScore = -Infinity;
          for (const [, pickup] of this.pickups) {
            if (pickup.type === "repair" && me.hp >= MAX_HP) continue;
            if (pickup.type === me.power) continue;
            const pos = getP(pickup);
            const dist = distance(getP(me), pos);
            if (dist > 500) continue;
            const weight = pickup.type === "shield" && me.hp < 50 ? 4 : pickup.type === "afterburner" ? 2.6 : 1.8;
            const score = weight / Math.max(1, dist);
            if (score > bestScore) {
              bestScore = score;
              best = pos;
            }
          }
          return best;
        }
        closestTarget(owner, pos) {
          let best = null;
          let bestDist = Infinity;
          for (const [id, p] of this.players) {
            if (id === owner || !p.alive) continue;
            const dist = distance(pos, getP(p));
            if (dist < bestDist) {
              bestDist = dist;
              best = { id, player: p };
            }
          }
          return best;
        }
      };
    }
  });

  // src/client/net-p2p.ts
  function makePeerConnection(iceServers) {
    return new RTCPeerConnection({ iceServers });
  }
  async function compressB64(text) {
    try {
      const enc = new TextEncoder().encode(text);
      const cs = new window.CompressionStream("deflate-raw");
      const w = cs.writable.getWriter();
      const r = cs.readable.getReader();
      w.write(enc);
      w.close();
      const chunks = [];
      while (true) {
        const { done, value } = await r.read();
        if (done) break;
        chunks.push(value);
      }
      const buf = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
      let offset = 0;
      for (const c of chunks) {
        buf.set(c, offset);
        offset += c.length;
      }
      let b64 = btoa(String.fromCharCode(...buf));
      b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
      return b64;
    } catch {
      let b64 = btoa(unescape(encodeURIComponent(text)));
      b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
      return b64;
    }
  }
  async function decompressB64(b64url) {
    try {
      let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const bin = atob(b64);
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      try {
        const ds = new window.DecompressionStream("deflate-raw");
        const w = ds.writable.getWriter();
        const r = ds.readable.getReader();
        w.write(buf);
        w.close();
        const chunks = [];
        while (true) {
          const { done, value } = await r.read();
          if (done) break;
          chunks.push(value);
        }
        const total = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
        let offset = 0;
        for (const c of chunks) {
          total.set(c, offset);
          offset += c.length;
        }
        return new TextDecoder().decode(total);
      } catch {
        return decodeURIComponent(escape(atob(b64)));
      }
    } catch {
      return b64url;
    }
  }
  function filterSdpToLocal(sdp) {
    return sdp.split("\n").filter((line) => {
      if (!line.startsWith("a=candidate:")) return true;
      if (/\b10\.\d+\.\d+\.\d+\b/.test(line)) return true;
      if (/\b172\.(1[6-9]|2\d|3[01])\.\d+\.\d+\b/.test(line)) return true;
      if (/\b192\.168\.\d+\.\d+\b/.test(line)) return true;
      if (/\bfe80::/i.test(line)) return true;
      if (/\b127\.0\.0\.1\b/.test(line)) return true;
      return false;
    }).join("\n");
  }
  var DT_MAX, STATE_HZ, INPUT_HZ, SNAP_BUFFER_MS, MAX_EXTRAP_MS, SNAP_DISTANCE, MAX_GUESTS, ICE_SERVER, STUN_ICE, StableMap, GuestTransportState, HostTransportState, SignalSocket, WebRtcTransport;
  var init_net_p2p = __esm({
    "src/client/net-p2p.ts"() {
      "use strict";
      init_GameSim();
      DT_MAX = 0.05;
      STATE_HZ = 30;
      INPUT_HZ = 25;
      SNAP_BUFFER_MS = 1400;
      MAX_EXTRAP_MS = 120;
      SNAP_DISTANCE = 140;
      MAX_GUESTS = 6;
      ICE_SERVER = "stun:stun.l.google.com:19302";
      STUN_ICE = [{ urls: ICE_SERVER }];
      StableMap = class {
        constructor() {
          this._m = /* @__PURE__ */ new Map();
        }
        get size() {
          return this._m.size;
        }
        get(k) {
          return this._m.get(k);
        }
        forEach(cb) {
          this._m.forEach(cb);
        }
        /** Merge an array of [key, value] entries into this map in-place. */
        mergeFrom(entries) {
          const seen = /* @__PURE__ */ new Set();
          for (const [k, v] of entries) {
            seen.add(k);
            const existing = this._m.get(k);
            if (existing) {
              Object.assign(existing, v);
            } else {
              this._m.set(k, Object.assign({}, v));
            }
          }
          for (const k of this._m.keys()) {
            if (!seen.has(k)) this._m.delete(k);
          }
        }
      };
      GuestTransportState = class {
        constructor() {
          this.players = new StableMap();
          this.bullets = new StableMap();
          this.pickups = new StableMap();
          this.phase = "lobby";
          this.timeLeft = 0;
          this.hostId = "";
          this.roomName = "";
          this.roundLength = 150;
          this.botsInRoom = false;
          this.mode = "ffa";
          this.teamScore0 = 0;
          this.teamScore1 = 0;
          this.botDifficulty = "medium";
        }
      };
      HostTransportState = class {
        constructor(sim) {
          this.sim = sim;
        }
        get players() {
          return this.sim.players;
        }
        get bullets() {
          return this.sim.bullets;
        }
        get pickups() {
          return this.sim.pickups;
        }
        get phase() {
          return this.sim.phase;
        }
        get timeLeft() {
          return this.sim.timeLeft;
        }
        get hostId() {
          return this.sim.hostId;
        }
        get roomName() {
          return this.sim.roomName;
        }
        get roundLength() {
          return this.sim.roundLength;
        }
        get botsInRoom() {
          return this.sim.botsInRoom;
        }
        get mode() {
          return this.sim.mode;
        }
        get teamScore0() {
          return this.sim.teamScore0;
        }
        get teamScore1() {
          return this.sim.teamScore1;
        }
        get botDifficulty() {
          return this.sim.botDifficulty;
        }
      };
      SignalSocket = class {
        constructor() {
          this.ws = null;
          this.queue = [];
          this.onMessage = null;
          this.onClose = null;
        }
        open(room, role, peerId) {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
              this.ws.close();
            } catch {
            }
          }
          return new Promise((resolve, reject) => {
            const proto = location.protocol === "https:" ? "wss" : "ws";
            const url = `${proto}://${location.host}/signal`;
            const ws = new WebSocket(url);
            this.ws = ws;
            ws.onopen = () => {
              if (role === "host") {
                const hostMsg = { type: "host", room };
                if (this.hostRoomName !== void 0) hostMsg.name = this.hostRoomName;
                if (this.hostCallSign !== void 0) hostMsg.hostName = this.hostCallSign;
                this.send(hostMsg);
              } else {
                this.send({ type: "join", room, peerId });
              }
              for (const m of this.queue) this._rawSend(m);
              this.queue = [];
              resolve();
            };
            ws.onmessage = (ev) => {
              try {
                const msg = JSON.parse(ev.data);
                if (this.onMessage) this.onMessage(msg);
              } catch {
              }
            };
            ws.onerror = () => reject(new Error("Signal WS error"));
            ws.onclose = () => {
              if (this.onClose) this.onClose();
            };
          });
        }
        send(msg) {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.queue.push(msg);
            return;
          }
          this._rawSend(msg);
        }
        _rawSend(msg) {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
          }
        }
        close() {
          if (this.ws) {
            try {
              this.ws.close();
            } catch {
            }
            this.ws = null;
          }
        }
      };
      WebRtcTransport = class {
        constructor() {
          // ITransport fields
          this.sessionId = null;
          this.localPose = {
            active: false,
            p: { x: 0, y: 0, z: 0 },
            f: { x: 1, y: 0, z: 0 },
            speed: 0,
            seq: 0,
            turn: 0,
            climb: 0,
            boost: false,
            fire: false,
            alive: false,
            ackSeq: 0
          };
          this.onKill = null;
          this.onPickup = null;
          this.onDisconnect = null;
          this.onStateChange = null;
          // Internal
          this._isHost = false;
          this._room = "";
          this._signal = null;
          // HOST-only
          this._sim = null;
          this._hostState = null;
          this._peers = /* @__PURE__ */ new Map();
          this._rafId = null;
          this._lastTick = 0;
          this._stateAccum = 0;
          this._lastSent = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };
          // GUEST-only
          this._guestState = null;
          this._guestPc = null;
          this._guestInputCh = null;
          this._guestEventCh = null;
          this._snaps = [];
          this._lastSentAt = 0;
          // Migration state (guest and elected-new-host paths)
          this._peerId = "";
          this._savedName = "";
          this._savedCosmetics = { color: 0, bodyShape: 0, accent: 0, trail: 0, livery: 0 };
          this._migrationState = "none";
          this._migrationTimeout = null;
          // When true, the next guest state message should fire migration-complete
          this._awaitingPostMigrationState = false;
          // Offline QR flag — migration is no-op for offline sessions (no broker socket)
          this._isOfflineQr = false;
        }
        // ── Shared ─────────────────────────────────────────────────────────────────
        get state() {
          if (this._isHost) return this._hostState;
          return this._guestState;
        }
        getPhase() {
          return this.state?.phase ?? null;
        }
        getHostId() {
          return this.state?.hostId ?? null;
        }
        getRosterSnapshot() {
          const s = this.state;
          if (!s) return [];
          const out = [];
          s.players.forEach((p, id) => {
            out.push({
              id,
              name: p.name || "Pilot",
              ready: !!p.ready,
              bot: !!p.bot,
              score: p.score || 0,
              color: p.skin || 0
            });
          });
          return out;
        }
        leave() {
          this._stopHostLoop();
          this._teardownPeers();
          if (this._signal) {
            this._signal.close();
            this._signal = null;
          }
          if (this._guestPc) {
            try {
              this._guestPc.close();
            } catch {
            }
            this._guestPc = null;
          }
          this._sim = null;
          this._hostState = null;
          this._guestState = null;
          this._snaps = [];
          this.localPose.active = false;
          this.sessionId = null;
        }
        tryReconnect() {
          return Promise.resolve(false);
        }
        // ── HOST MODE ──────────────────────────────────────────────────────────────
        /**
         * Start as P2P host.
         * `name` = player call sign, `code` = P- room code (with prefix),
         * `cosmetics` = selected cosmetics.
         * `opts.roomName` = room display name shown in the LAN browser (defaults to `code`).
         * `opts.continuous` = when true, starts as a live FFA match immediately (no lobby).
         * Backward-compat: existing callers omit opts and get the original lobby behaviour.
         */
        async startHost(name, code, cosmetics, opts) {
          this._isHost = true;
          this._room = code;
          this.sessionId = "host";
          const continuous = opts?.continuous ?? false;
          const roomName = opts?.roomName ?? code;
          const sim = new GameSim({
            botsEnabled: false,
            // Continuous local rooms start in playing/ffa state immediately (same as isPublic).
            isPublic: continuous,
            onEvent: (e) => this._onSimEvent(e)
          });
          this._sim = sim;
          this._hostState = new HostTransportState(sim);
          sim.addPlayer("host", {
            name,
            skin: cosmetics.color,
            bodyShape: cosmetics.bodyShape,
            accent: cosmetics.accent,
            trail: cosmetics.trail,
            livery: cosmetics.livery
          });
          const sig = new SignalSocket();
          sig.hostRoomName = roomName;
          sig.hostCallSign = name;
          this._signal = sig;
          sig.onMessage = (msg) => this._onSignalHost(msg);
          sig.onClose = () => {
          };
          try {
            await sig.open(code, "host");
          } catch {
          }
          this._startHostLoop();
          if (this.onStateChange) this.onStateChange();
        }
        /**
         * List rooms visible from this client's network by querying the broker's
         * `{type:"list"}` message. Returns an empty array on any error or timeout.
         * This is a static method so callers can use `WebRtcTransport.listRooms()`
         * without needing an instance.
         */
        static listRooms() {
          return new Promise((resolve) => {
            let settled = false;
            const done = (rooms) => {
              if (settled) return;
              settled = true;
              try {
                ws.close();
              } catch {
              }
              resolve(rooms);
            };
            const proto = location.protocol === "https:" ? "wss" : "ws";
            const ws = new WebSocket(`${proto}://${location.host}/signal`);
            const timer = setTimeout(() => done([]), 6e3);
            ws.onopen = () => {
              try {
                ws.send(JSON.stringify({ type: "list" }));
              } catch {
                done([]);
              }
            };
            ws.onmessage = (ev) => {
              try {
                const msg = JSON.parse(ev.data);
                if (msg.type === "rooms") {
                  clearTimeout(timer);
                  done(Array.isArray(msg.rooms) ? msg.rooms : []);
                }
              } catch {
              }
            };
            ws.onerror = () => {
              clearTimeout(timer);
              done([]);
            };
            ws.onclose = () => {
              clearTimeout(timer);
              done([]);
            };
          });
        }
        _onSimEvent(e) {
          if (e.type === "kill") {
            if (this.onKill) this.onKill({ killer: e.killer, victim: e.victim, killerName: e.killerName, victimName: e.victimName });
            this._broadcastEvent({ type: "kill", killer: e.killer, victim: e.victim, killerName: e.killerName, victimName: e.victimName });
          } else if (e.type === "pickup") {
            if (this.onPickup) this.onPickup({ by: e.by, type: e.pickupType });
            this._broadcastEvent({ type: "pickup", by: e.by, pickupType: e.pickupType });
          } else if (e.type === "roundEnd") {
            this._broadcastEvent({ type: "roundEnd", scores: e.scores });
          }
          if (this.onStateChange) this.onStateChange();
        }
        _startHostLoop() {
          this._lastTick = performance.now();
          this._stateAccum = 0;
          const interval = 1e3 / STATE_HZ;
          const tick = (now) => {
            this._rafId = requestAnimationFrame(tick);
            if (document.hidden) return;
            let dtMs = now - this._lastTick;
            this._lastTick = now;
            if (dtMs <= 0 || !isFinite(dtMs)) dtMs = 16;
            let dt = dtMs / 1e3;
            while (dt > 0) {
              const step = Math.min(dt, DT_MAX);
              this._sim.tick(step);
              dt -= step;
            }
            this._stateAccum += dtMs;
            if (this._stateAccum >= interval) {
              this._stateAccum -= interval;
              this._broadcastState();
              if (this.onStateChange) this.onStateChange();
            }
          };
          this._rafId = requestAnimationFrame(tick);
        }
        _stopHostLoop() {
          if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
          }
        }
        _broadcastState() {
          if (!this._sim || !this._peers.size) return;
          const snap = this._sim.snapshot();
          const payload = JSON.stringify({ type: "state", snap });
          for (const [, peer] of this._peers) {
            if (peer.state && peer.state.readyState === "open") {
              try {
                peer.state.send(payload);
              } catch {
              }
            }
          }
        }
        _broadcastEvent(evt) {
          const payload = JSON.stringify({ type: "event", event: evt });
          for (const [, peer] of this._peers) {
            if (peer.events && peer.events.readyState === "open") {
              try {
                peer.events.send(payload);
              } catch {
              }
            }
          }
        }
        async _onSignalHost(msg) {
          if (!this._sim) return;
          const sig = this._signal;
          if (msg.type === "peer-joined") {
            const peerId = msg.peerId;
            if (this._peers.size >= MAX_GUESTS) return;
            const pc = makePeerConnection(STUN_ICE);
            const stateCh = pc.createDataChannel("state", { ordered: true, maxRetransmits: 0 });
            const inputsCh = pc.createDataChannel("inputs", { ordered: false, maxRetransmits: 0 });
            const eventsCh = pc.createDataChannel("events", { ordered: true });
            stateCh.binaryType = "arraybuffer";
            inputsCh.binaryType = "arraybuffer";
            eventsCh.binaryType = "arraybuffer";
            const channels = { pc, state: stateCh, inputs: inputsCh, events: eventsCh };
            this._peers.set(peerId, channels);
            inputsCh.onmessage = (ev) => this._onGuestInput(peerId, ev.data);
            eventsCh.onmessage = (ev) => this._onGuestControl(peerId, ev.data);
            pc.onicecandidate = (ev) => {
              if (ev.candidate) sig.send({ type: "ice", room: this._room, to: peerId, candidate: ev.candidate.toJSON() });
            };
            pc.onconnectionstatechange = () => {
              if (pc.connectionState === "failed" || pc.connectionState === "disconnected" || pc.connectionState === "closed") {
                this._removePeer(peerId);
              }
            };
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sig.send({ type: "offer", room: this._room, to: peerId, sdp: pc.localDescription.toJSON() });
          }
          if (msg.type === "answer" && msg.to === "host") {
            const peer = this._peers.get(msg.from || msg.peerId);
            for (const [, p] of this._peers) {
              if (p.pc.signalingState === "have-local-offer") {
                await p.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
                break;
              }
            }
          }
          if (msg.type === "ice" && msg.to === "host") {
            for (const [, p] of this._peers) {
              try {
                await p.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
              } catch {
              }
            }
          }
        }
        _onGuestInput(peerId, data) {
          if (!this._sim) return;
          try {
            const text = typeof data === "string" ? data : new TextDecoder().decode(data);
            const msg = JSON.parse(text);
            if (msg.type === "input") {
              this._sim.applyInput(peerId, msg.input);
            }
          } catch {
          }
        }
        _onGuestControl(peerId, data) {
          if (!this._sim) return;
          try {
            const text = typeof data === "string" ? data : new TextDecoder().decode(data);
            const msg = JSON.parse(text);
            if (msg.type === "join") {
              const peer = this._peers.get(peerId);
              if (this._sim.players.has(peerId)) {
                if (peer?.events?.readyState === "open") {
                  peer.events.send(JSON.stringify({ type: "session", sessionId: peerId }));
                }
              } else {
                this._sim.addPlayer(peerId, {
                  name: msg.name || "Pilot",
                  skin: msg.skin || 0,
                  bodyShape: msg.bodyShape || 0,
                  accent: msg.accent || 0,
                  trail: msg.trail || 0,
                  livery: msg.livery || 0
                });
                if (peer?.events?.readyState === "open") {
                  peer.events.send(JSON.stringify({ type: "session", sessionId: peerId }));
                }
                if (this.onStateChange) this.onStateChange();
              }
            } else if (msg.type === "ready") {
              this._sim.setReady(peerId);
              if (this.onStateChange) this.onStateChange();
            } else if (msg.type === "hostStart") {
              this._sim.hostStart(peerId);
              if (this.onStateChange) this.onStateChange();
            } else if (msg.type === "hostKick") {
              this._sim.hostKick(peerId, msg.targetId);
              this._broadcastEvent({ type: "kicked", targetId: msg.targetId });
              if (this.onStateChange) this.onStateChange();
            } else if (msg.type === "hostSettings") {
              this._sim.setHostSettings(peerId, {
                roundLength: typeof msg.roundLength === "number" ? msg.roundLength : void 0,
                roomName: typeof msg.roomName === "string" ? msg.roomName : void 0,
                botsInRoom: typeof msg.botsInRoom === "boolean" ? msg.botsInRoom : void 0,
                mode: typeof msg.mode === "string" ? msg.mode : void 0,
                botDifficulty: typeof msg.botDifficulty === "string" ? msg.botDifficulty : void 0
              });
              if (this.onStateChange) this.onStateChange();
            }
          } catch {
          }
        }
        _removePeer(peerId) {
          const peer = this._peers.get(peerId);
          if (!peer) return;
          try {
            peer.pc.close();
          } catch {
          }
          this._peers.delete(peerId);
          if (this._sim) this._sim.removePlayer(peerId);
          this._broadcastEvent({ type: "roster-change" });
          if (this.onStateChange) this.onStateChange();
        }
        _teardownPeers() {
          try {
            this._broadcastEvent({ type: "host-left" });
          } catch {
          }
          for (const [, peer] of this._peers) {
            try {
              peer.pc.close();
            } catch {
            }
          }
          this._peers.clear();
        }
        // ── GUEST MODE ─────────────────────────────────────────────────────────────
        async connect(name, code, cosmetics, _serverOrigin) {
          this._isHost = false;
          this._room = code;
          this._guestState = new GuestTransportState();
          this.sessionId = null;
          const peerId = "g-" + Math.random().toString(36).slice(2, 10);
          this._peerId = peerId;
          this._savedName = name;
          this._savedCosmetics = { ...cosmetics };
          const sig = new SignalSocket();
          this._signal = sig;
          const pc = makePeerConnection(STUN_ICE);
          this._guestPc = pc;
          this._wireGuestPc(pc, peerId, code, sig);
          sig.onMessage = async (msg) => {
            await this._onSignalGuest(msg, peerId, code, sig, pc);
          };
          await sig.open(code, "join", peerId);
          await this._waitForGuestChannels();
          this._sendGuestJoin();
        }
        /** Wire the standard guest-side PC event handlers. */
        _wireGuestPc(pc, peerId, code, sig) {
          pc.onicecandidate = (ev) => {
            if (ev.candidate) sig.send({ type: "ice", room: code, to: "host", candidate: ev.candidate.toJSON() });
          };
          pc.ondatachannel = (ev) => {
            const ch = ev.channel;
            ch.binaryType = "arraybuffer";
            if (ch.label === "state") {
              ch.onmessage = (e) => this._onGuestStateMsg(e.data);
            } else if (ch.label === "events") {
              this._guestEventCh = ch;
              ch.onmessage = (e) => this._onGuestEventMsg(e.data);
            } else if (ch.label === "inputs") {
              this._guestInputCh = ch;
            } else if (ch.label === "inputs-fallback") {
              this._guestInputCh = ch;
            }
          };
          pc.onconnectionstatechange = () => {
            if (pc.connectionState === "failed" || pc.connectionState === "disconnected" || pc.connectionState === "closed") {
              if (this._migrationState !== "none") return;
              setTimeout(() => {
                if (this._migrationState !== "none") return;
                if (this.onDisconnect) this.onDisconnect({ type: "leave", code: 1001 });
              }, 400);
            }
          };
        }
        /** Route guest-side signaling messages, including migration control messages. */
        async _onSignalGuest(msg, peerId, code, sig, pc) {
          if (msg.type === "offer" && msg.to === peerId) {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sig.send({ type: "answer", room: code, to: "host", sdp: pc.localDescription.toJSON() });
          } else if (msg.type === "ice" && msg.to === peerId) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch {
            }
          } else if (msg.type === "host-migrating") {
            if (this._isOfflineQr) return;
            const migMsg = msg;
            if (migMsg.nextHost === this._peerId) {
              this._startMigrationAsElected();
            } else {
              this._startMigrationAsGuest();
            }
          } else if (msg.type === "host-arrived") {
            if (this._migrationState === "guest-wait") {
              this._reconnectGuestToNewHost();
            }
          } else if (msg.type === "host-left") {
            if (this._migrationState !== "none") {
              if (this._migrationTimeout !== null) {
                clearTimeout(this._migrationTimeout);
                this._migrationTimeout = null;
              }
            }
            if (this.onDisconnect) this.onDisconnect({ type: "host-left" });
          }
        }
        /** Wait for both guest data channels to open (up to 15 s). */
        _waitForGuestChannels() {
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("P2P connection timeout")), 15e3);
            const check = () => {
              if (this._guestInputCh?.readyState === "open" && this._guestEventCh?.readyState === "open") {
                clearTimeout(timeout);
                resolve();
              }
            };
            const poll = setInterval(() => {
              if (this._guestInputCh && this._guestEventCh) {
                this._guestInputCh.onopen = check;
                this._guestEventCh.onopen = check;
                clearInterval(poll);
                check();
              }
            }, 100);
          });
        }
        /** Send the initial join announcement to the host over the events channel. */
        _sendGuestJoin() {
          if (this._guestEventCh?.readyState === "open") {
            this._guestEventCh.send(JSON.stringify({
              type: "join",
              name: this._savedName,
              skin: this._savedCosmetics.color,
              bodyShape: this._savedCosmetics.bodyShape,
              accent: this._savedCosmetics.accent,
              trail: this._savedCosmetics.trail,
              livery: this._savedCosmetics.livery
            }));
          }
        }
        // ── MIGRATION STATE MACHINE ───────────────────────────────────────────────────
        /**
         * Build a SimStateSnapshot from the current guest state (used as the seed
         * for the new host's GameSim when this guest is elected as the new host).
         */
        _buildMigrationSnapshot() {
          const gs = this._guestState;
          const players = [];
          gs.players.forEach((v, k) => players.push([k, { ...v }]));
          const bullets = [];
          gs.bullets.forEach((v, k) => bullets.push([k, { ...v }]));
          const pickups = [];
          gs.pickups.forEach((v, k) => pickups.push([k, { ...v }]));
          return {
            players,
            bullets,
            pickups,
            phase: gs.phase,
            timeLeft: gs.timeLeft,
            hostId: this._peerId,
            // this guest becomes the new host
            roundLength: gs.roundLength,
            roomName: gs.roomName,
            botsInRoom: gs.botsInRoom,
            mode: gs.mode,
            teamScore0: gs.teamScore0,
            teamScore1: gs.teamScore1,
            botDifficulty: gs.botDifficulty
          };
        }
        /**
         * Called when this guest has been elected as the new host.
         * Tears down the guest WebRTC path, claims the host slot on the broker,
         * and starts a new GameSim seeded from the last known state.
         */
        _startMigrationAsElected() {
          if (this._migrationState !== "none") return;
          this._migrationState = "electing";
          const snap = this._buildMigrationSnapshot();
          if (this._guestPc) {
            try {
              this._guestPc.close();
            } catch {
            }
            this._guestPc = null;
            this._guestInputCh = null;
            this._guestEventCh = null;
          }
          const room = this._room;
          const peerId = this._peerId;
          const sig = this._signal ?? new SignalSocket();
          this._signal = sig;
          sig.open(room, "host").then(() => {
            const origOnMessage = sig.onMessage;
            sig.onMessage = (msg) => {
              if (msg.type === "hosted") {
                sig.onMessage = origOnMessage;
                this._onElectedHosted(msg, snap, peerId);
              } else if (msg.type === "peer-joined") {
                if (origOnMessage) origOnMessage(msg);
              }
            };
          }).catch(() => {
            this._migrationState = "none";
            if (this.onDisconnect) this.onDisconnect({ type: "host-left" });
          });
        }
        /** After broker confirms hosted, set up the new GameSim and host loop. */
        _onElectedHosted(hostedMsg, snap, peerId) {
          const sim = new GameSim({
            botsEnabled: false,
            isPublic: false,
            onEvent: (e) => this._onSimEvent(e),
            initialState: snap
          });
          sim.hostId = peerId;
          this._isHost = true;
          this._sim = sim;
          this._hostState = new HostTransportState(sim);
          this.sessionId = peerId;
          const sig = this._signal;
          sig.onMessage = (msg) => this._onSignalHost(msg);
          this._startHostLoop();
          const existingPeers = hostedMsg.peers ?? [];
          for (const gPeerId of existingPeers) {
            if (gPeerId !== peerId) {
              this._onSignalHost({ type: "peer-joined", peerId: gPeerId });
            }
          }
          this._migrationState = "none";
          if (this.onStateChange) this.onStateChange();
          if (this.onDisconnect) this.onDisconnect({ type: "migration-complete" });
        }
        /**
         * Called when another guest was elected host. Show the "reconnecting" overlay
         * and wait for 'host-arrived' from the broker, then re-establish WebRTC.
         */
        _startMigrationAsGuest() {
          if (this._migrationState !== "none") return;
          this._migrationState = "guest-wait";
          if (this.onDisconnect) this.onDisconnect({ type: "host-migrating" });
          if (this._guestPc) {
            try {
              this._guestPc.close();
            } catch {
            }
            this._guestPc = null;
            this._guestInputCh = null;
            this._guestEventCh = null;
          }
          this._migrationTimeout = setTimeout(() => {
            if (this._migrationState !== "guest-wait") return;
            this._migrationState = "none";
            if (this.onDisconnect) this.onDisconnect({ type: "host-left" });
          }, 5e3);
        }
        /**
         * Guest reconnect: called when broker sends 'host-arrived'.
         * Creates a fresh WebRTC peer connection to the new host.
         */
        _reconnectGuestToNewHost() {
          if (this._migrationTimeout !== null) {
            clearTimeout(this._migrationTimeout);
            this._migrationTimeout = null;
          }
          const room = this._room;
          const peerId = this._peerId;
          const sig = this._signal;
          const pc = makePeerConnection(STUN_ICE);
          this._guestPc = pc;
          this._guestInputCh = null;
          this._guestEventCh = null;
          this._wireGuestPc(pc, peerId, room, sig);
          sig.onMessage = async (msg) => {
            if (msg.type === "offer" && msg.to === peerId) {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sig.send({ type: "answer", room, to: "host", sdp: pc.localDescription.toJSON() });
            } else if (msg.type === "ice" && msg.to === peerId) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
              } catch {
              }
            } else if (msg.type === "host-migrating") {
              if (this._isOfflineQr) return;
              const migMsg = msg;
              this._migrationState = "none";
              this._awaitingPostMigrationState = false;
              if (migMsg.nextHost === this._peerId) {
                this._startMigrationAsElected();
              } else {
                this._startMigrationAsGuest();
              }
            } else if (msg.type === "host-left") {
              this._migrationState = "none";
              this._awaitingPostMigrationState = false;
              if (this.onDisconnect) this.onDisconnect({ type: "host-left" });
            }
          };
          sig.send({ type: "join", room, peerId });
          this._awaitingPostMigrationState = true;
          this._waitForGuestChannels().then(() => {
            this._sendGuestJoin();
          }).catch(() => {
            this._migrationState = "none";
            this._awaitingPostMigrationState = false;
            if (this.onDisconnect) this.onDisconnect({ type: "host-left" });
          });
        }
        _onGuestStateMsg(data) {
          try {
            const text = typeof data === "string" ? data : new TextDecoder().decode(data);
            const parsed = JSON.parse(text);
            if (parsed.type !== "state") return;
            const snap = parsed.snap;
            const gs = this._guestState;
            gs.phase = snap.phase;
            gs.timeLeft = snap.timeLeft;
            gs.hostId = snap.hostId;
            gs.roomName = snap.roomName ?? "";
            gs.roundLength = snap.roundLength ?? 150;
            gs.botsInRoom = snap.botsInRoom ?? false;
            gs.mode = snap.mode ?? "ffa";
            gs.botDifficulty = snap.botDifficulty ?? "medium";
            gs.teamScore0 = snap.teamScore0 ?? 0;
            gs.teamScore1 = snap.teamScore1 ?? 0;
            gs.players.mergeFrom(snap.players);
            gs.bullets.mergeFrom(snap.bullets);
            gs.pickups.mergeFrom(snap.pickups);
            if (this._awaitingPostMigrationState) {
              this._awaitingPostMigrationState = false;
              this._migrationState = "none";
              if (this.onDisconnect) this.onDisconnect({ type: "migration-complete" });
            }
            this._snapFromState(gs);
            if (this.onStateChange) this.onStateChange();
          } catch {
          }
        }
        _onGuestEventMsg(data) {
          try {
            const text = typeof data === "string" ? data : new TextDecoder().decode(data);
            const parsed = JSON.parse(text);
            if (parsed.type !== "event") {
              if (parsed.type === "session") {
                this.sessionId = parsed.sessionId;
              }
              return;
            }
            const evt = parsed.event;
            if (evt.type === "kill" && this.onKill) this.onKill(evt);
            if (evt.type === "pickup" && this.onPickup) this.onPickup({ by: evt.by, type: evt.pickupType });
            if (evt.type === "host-left") {
              if (this.onDisconnect) this.onDisconnect({ type: "host-left" });
            }
            if (evt.type === "kicked" && evt.targetId === this.sessionId) {
              if (this.onDisconnect) this.onDisconnect({ type: "kicked" });
            }
          } catch {
          }
        }
        // ── INPUT ──────────────────────────────────────────────────────────────────
        sendInput(turn2, climb, boost, fire) {
          if (this._isHost) {
            if (!this._sim) return;
            const last = this._lastSent;
            const changed = Math.abs(turn2 - last.turn) >= 0.03 || Math.abs(climb - last.climb) >= 0.03 || boost !== last.boost || fire !== last.fire;
            const now = performance.now();
            if (!changed && now - this._lastSentAt < 1e3 / INPUT_HZ) return;
            const seq = last.seq + 1;
            this._lastSent = { seq, turn: turn2, climb, boost, fire };
            this._lastSentAt = now;
            this._sim.applyInput("host", { seq, turn: turn2, climb, boost, fire });
          } else {
            if (!this._guestInputCh || this._guestInputCh.readyState !== "open") return;
            const now = performance.now();
            const last = this._lastSent;
            const changed = Math.abs(turn2 - last.turn) >= 0.03 || Math.abs(climb - last.climb) >= 0.03 || boost !== last.boost || fire !== last.fire;
            if (!changed && now - this._lastSentAt < 1e3 / INPUT_HZ) return;
            const seq = last.seq + 1;
            this._lastSent = { seq, turn: turn2, climb, boost, fire };
            this._lastSentAt = now;
            try {
              this._guestInputCh.send(JSON.stringify({ type: "input", input: { seq, turn: turn2, climb, boost, fire } }));
            } catch {
            }
          }
        }
        // ── LOBBY CONTROL ──────────────────────────────────────────────────────────
        sendReady() {
          if (this._isHost) {
            if (this._sim) {
              this._sim.setReady("host");
              if (this.onStateChange) this.onStateChange();
            }
          } else {
            this._sendControl({ type: "ready" });
          }
        }
        sendHostStart() {
          if (this._isHost) {
            if (this._sim) {
              this._sim.hostStart("host");
              if (this.onStateChange) this.onStateChange();
            }
          } else {
            this._sendControl({ type: "hostStart" });
          }
        }
        sendHostKick(targetId) {
          if (this._isHost) {
            if (this._sim) {
              this._sim.hostKick("host", targetId);
              if (this.onStateChange) this.onStateChange();
            }
          } else {
            this._sendControl({ type: "hostKick", targetId });
          }
        }
        sendHostSettings(s) {
          if (this._isHost) {
            if (this._sim) {
              this._sim.setHostSettings("host", s);
              if (this.onStateChange) this.onStateChange();
            }
          } else {
            this._sendControl({ type: "hostSettings", ...s });
          }
        }
        _sendControl(msg) {
          if (!this._guestEventCh || this._guestEventCh.readyState !== "open") return;
          try {
            this._guestEventCh.send(JSON.stringify(msg));
          } catch {
          }
        }
        // ── PREDICTION (verbatim from net.ts, adapted for P2P) ──────────────────
        _authoritativeSelf() {
          const s = this.state;
          if (!s || !this.sessionId) return null;
          return s.players.get(this.sessionId) || null;
        }
        _setLocalFromAuth(me) {
          this.localPose.active = true;
          this.localPose.p = { x: me.px, y: me.py, z: me.pz };
          this.localPose.f = { x: me.fx, y: me.fy, z: me.fz };
          this.localPose.speed = me.speed || window.GAME.CRUISE_SPEED;
          this.localPose.seq = me.seq || 0;
          this.localPose.turn = me.turn || 0;
          this.localPose.climb = me.climb || 0;
          this.localPose.boost = !!me.boosting;
          this.localPose.fire = false;
          this.localPose.alive = !!me.alive;
          this.localPose.ackSeq = me.seq || 0;
        }
        _snapFromState(ts) {
          const players = {};
          ts.players.forEach((p, id) => {
            players[id] = {
              p: { x: p.px, y: p.py, z: p.pz },
              f: { x: p.fx, y: p.fy, z: p.fz },
              alive: !!p.alive,
              speed: p.speed || 0,
              turn: p.turn || 0,
              climb: p.climb || 0,
              seq: p.seq || 0
            };
          });
          const t = performance.now();
          this._snaps.push({ t, players });
          this._snaps.sort((a, b) => a.t - b.t);
          const cut = t - SNAP_BUFFER_MS;
          while (this._snaps.length > 2 && this._snaps[0].t < cut) this._snaps.shift();
          const me = this._authoritativeSelf();
          if (!me) return;
          if (!this.localPose.active || !me.alive) {
            this._setLocalFromAuth(me);
            return;
          }
          const Sp = window.Sphere;
          const auth = { x: me.px, y: me.py, z: me.pz };
          const authF = { x: me.fx, y: me.fy, z: me.fz };
          const err = Sp.distance(this.localPose.p, auth);
          if (err > SNAP_DISTANCE) {
            this._setLocalFromAuth(me);
            return;
          }
          this.localPose.p = Sp.lerpVec(this.localPose.p, auth, 0.22);
          this.localPose.f = Sp.normalize(Sp.lerpVec(this.localPose.f, authF, 0.28));
          this.localPose.speed = me.speed || this.localPose.speed;
          this.localPose.seq = Math.max(this.localPose.seq, me.seq || 0);
          this.localPose.ackSeq = me.seq || this.localPose.ackSeq;
          this.localPose.alive = !!me.alive;
        }
        stepLocal(dt) {
          if (this._isHost) {
            const me2 = this._sim?.players.get("host");
            if (!me2) return;
            this.localPose.active = true;
            this.localPose.p = { x: me2.px, y: me2.py, z: me2.pz };
            this.localPose.f = { x: me2.fx, y: me2.fy, z: me2.fz };
            this.localPose.speed = me2.speed;
            this.localPose.alive = me2.alive;
            return;
          }
          const me = this._authoritativeSelf();
          if (!me) return;
          if (!this.localPose.active) {
            this._setLocalFromAuth(me);
          }
          if (!this.localPose.alive || !me.alive) {
            this._setLocalFromAuth(me);
            return;
          }
          const Sp = window.Sphere;
          const G = window.GAME;
          const inp = this._lastSent;
          const angles = Sp.yawPitchFromForward(this.localPose.f);
          const yaw = angles.yaw + inp.turn * G.TURN_RATE * dt;
          const pitch = Sp.clamp(angles.pitch + inp.climb * G.PITCH_RATE * dt, -G.PITCH_MAX, G.PITCH_MAX);
          let fwd = Sp.yawPitchForward(yaw, pitch);
          let targetSpeed = inp.boost ? G.BOOST_SPEED : G.CRUISE_SPEED;
          if (me.power === "afterburner") targetSpeed *= G.AFTERBURNER_FACTOR;
          const delta = targetSpeed - this.localPose.speed;
          const step = Math.sign(delta) * G.ACCEL * dt;
          this.localPose.speed = Math.abs(step) >= Math.abs(delta) ? targetSpeed : this.localPose.speed + step;
          const pos = this.localPose.p;
          const edge = Math.max(Math.abs(pos.x), Math.abs(pos.z));
          if (edge > G.MAP_HALF - G.MAP_EDGE_SOFT) {
            const edgeT = Sp.clamp((edge - (G.MAP_HALF - G.MAP_EDGE_SOFT)) / G.MAP_EDGE_SOFT, 0, 1);
            const home = Sp.normalize({ x: -pos.x || 1, y: 0, z: -pos.z });
            fwd = Sp.normalize({
              x: Sp.lerp(fwd.x, home.x, edgeT * 0.25),
              y: fwd.y * (1 - edgeT * 0.2),
              z: Sp.lerp(fwd.z, home.z, edgeT * 0.25)
            });
          }
          let next = Sp.advance(pos, fwd, this.localPose.speed * dt).p;
          next.x = Sp.clamp(next.x, -G.MAP_HALF, G.MAP_HALF);
          next.z = Sp.clamp(next.z, -G.MAP_HALF, G.MAP_HALF);
          next.y = Sp.clamp(next.y, G.MIN_ALT, G.MAX_ALT);
          if (next.y <= G.MIN_ALT + 0.01 && fwd.y < 0) fwd = Sp.withPitch(fwd, 0.02);
          if (next.y >= G.MAX_ALT - 0.01 && fwd.y > 0) fwd = Sp.withPitch(fwd, -0.02);
          const auth = { x: me.px, y: me.py, z: me.pz };
          const authF = { x: me.fx, y: me.fy, z: me.fz };
          const err = Sp.distance(next, auth);
          if (err > SNAP_DISTANCE) {
            next = auth;
            fwd = authF;
            this.localPose.speed = me.speed || this.localPose.speed;
          } else {
            next = Sp.lerpVec(next, auth, Math.min(0.12, dt * 3.5));
            fwd = Sp.normalize(Sp.lerpVec(fwd, authF, Math.min(0.18, dt * 4.5)));
          }
          this.localPose.p = next;
          this.localPose.f = fwd;
          this.localPose.turn = inp.turn;
          this.localPose.climb = inp.climb;
          this.localPose.boost = inp.boost;
          this.localPose.fire = inp.fire;
          this.localPose.seq = inp.seq;
        }
        sample(renderTime) {
          const Sp = window.Sphere;
          const snaps = this._snaps;
          const out = {};
          if (!snaps.length) return out;
          const clone = (p) => ({
            p: { ...p.p },
            f: { ...p.f },
            alive: p.alive,
            speed: p.speed,
            turn: p.turn,
            climb: p.climb,
            seq: p.seq
          });
          const blend = (a2, b2, t2) => ({
            p: Sp.lerpVec(a2.p, b2.p, t2),
            f: Sp.normalize(Sp.lerpVec(a2.f, b2.f, t2)),
            alive: b2.alive,
            speed: Sp.lerp(a2.speed, b2.speed, t2),
            turn: Sp.lerp(a2.turn, b2.turn, t2),
            climb: Sp.lerp(a2.climb, b2.climb, t2),
            seq: b2.seq
          });
          const latest = snaps[snaps.length - 1];
          if (renderTime >= latest.t) {
            if (snaps.length < 2) {
              for (const id in latest.players) out[id] = clone(latest.players[id]);
              return out;
            }
            const prev = snaps[snaps.length - 2];
            const span = latest.t - prev.t || 1;
            const k = Math.min(renderTime - latest.t, MAX_EXTRAP_MS) / span;
            for (const id in latest.players) {
              const b2 = latest.players[id];
              const a2 = prev.players[id] || b2;
              const blended = blend(a2, b2, 1 + k);
              blended.p = Sp.add(b2.p, Sp.scale(Sp.sub(b2.p, a2.p), k));
              blended.f = Sp.normalize(Sp.lerpVec(a2.f, b2.f, 1 + k));
              out[id] = blended;
            }
            return out;
          }
          let idx = 0;
          while (idx < snaps.length && snaps[idx].t < renderTime) idx++;
          if (idx === 0) {
            for (const id in snaps[0].players) out[id] = clone(snaps[0].players[id]);
            return out;
          }
          const a = snaps[idx - 1];
          const b = snaps[idx];
          const t = (renderTime - a.t) / (b.t - a.t || 1);
          for (const id in b.players) {
            out[id] = blend(a.players[id] || b.players[id], b.players[id], t);
          }
          return out;
        }
        // ── OFFLINE QR HOST SIDE ──────────────────────────────────────────────────
        /**
         * Build an offline offer: create PC with no ICE servers, gather local-only
         * candidates, encode to base64url.  Call after the ICE gathering is complete.
         * Renders the result to `canvas` using window.QR.
         *
         * Returned promise resolves with the encoded payload string (for debugging).
         */
        async startOfflineQrOffer(canvas) {
          this._isOfflineQr = true;
          const pc = makePeerConnection([]);
          this._guestPc = pc;
          const stateCh = pc.createDataChannel("state", { ordered: true, maxRetransmits: 0 });
          const inputsCh = pc.createDataChannel("inputs", { ordered: false, maxRetransmits: 0 });
          const eventsCh = pc.createDataChannel("events", { ordered: true });
          stateCh.binaryType = "arraybuffer";
          inputsCh.binaryType = "arraybuffer";
          eventsCh.binaryType = "arraybuffer";
          inputsCh.onmessage = (ev) => this._onGuestInput("offline-guest", ev.data);
          eventsCh.onmessage = (ev) => this._onGuestControl("offline-guest", ev.data);
          const channels = { pc, state: stateCh, inputs: inputsCh, events: eventsCh };
          this._peers.set("offline-guest", channels);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await new Promise((resolve) => {
            if (pc.iceGatheringState === "complete") {
              resolve();
              return;
            }
            pc.onicegatheringstatechange = () => {
              if (pc.iceGatheringState === "complete") resolve();
            };
            setTimeout(resolve, 5e3);
          });
          const sdpLocal = filterSdpToLocal(pc.localDescription.sdp);
          const payload = JSON.stringify({ type: "offer", sdp: { type: "offer", sdp: sdpLocal } });
          const encoded = await compressB64(payload);
          if (encoded.length > 2400) {
            throw new Error("too many network interfaces \u2014 use code instead");
          }
          const joinUrl = `${location.origin}${location.pathname}?offline-answer=${encoded}`;
          window.QR.render(canvas, joinUrl, {
            size: window.Input.isTouchDevice() ? 220 : 256,
            errorCorrectionLevel: "M"
          });
          return encoded;
        }
        /**
         * Guest: decode offer QR payload, create answer, encode answer, render QR.
         */
        async startOfflineQrAnswer(encoded, answerCanvas) {
          this._isOfflineQr = true;
          const payload = await decompressB64(encoded);
          const { sdp: offerSdp } = JSON.parse(payload);
          const pc = makePeerConnection([]);
          this._guestPc = pc;
          pc.ondatachannel = (ev) => {
            const ch = ev.channel;
            ch.binaryType = "arraybuffer";
            if (ch.label === "state") ch.onmessage = (e) => this._onGuestStateMsg(e.data);
            if (ch.label === "events") {
              this._guestEventCh = ch;
              ch.onmessage = (e) => this._onGuestEventMsg(e.data);
            }
            if (ch.label === "inputs" || ch.label === "inputs-fallback") this._guestInputCh = ch;
          };
          await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await new Promise((resolve) => {
            if (pc.iceGatheringState === "complete") {
              resolve();
              return;
            }
            pc.onicegatheringstatechange = () => {
              if (pc.iceGatheringState === "complete") resolve();
            };
            setTimeout(resolve, 5e3);
          });
          const sdpLocal = filterSdpToLocal(pc.localDescription.sdp);
          const answerPayload = JSON.stringify({ type: "answer", sdp: { type: "answer", sdp: sdpLocal } });
          const answerEncoded = await compressB64(answerPayload);
          if (answerEncoded.length > 2400) throw new Error("too many network interfaces \u2014 use code instead");
          window.QR.render(answerCanvas, answerEncoded, {
            size: window.Input.isTouchDevice() ? 220 : 256,
            errorCorrectionLevel: "M"
          });
        }
        /**
         * Host: accept offline QR answer (pasted/scanned base64url string).
         */
        async finishOfflineQrOffer(answerEncoded) {
          const payload = await decompressB64(answerEncoded);
          const { sdp: answerSdp } = JSON.parse(payload);
          const peer = this._peers.get("offline-guest");
          if (!peer) throw new Error("No pending offline offer");
          await peer.pc.setRemoteDescription(new RTCSessionDescription(answerSdp));
        }
      };
    }
  });

  // src/client/host-sim.ts
  var init_host_sim = __esm({
    "src/client/host-sim.ts"() {
      "use strict";
      init_net_p2p();
    }
  });

  // src/client/arcadeMenu.ts
  function arcadeScreenId(screen2) {
    return `arcade-screen-${screen2}`;
  }
  function mountArcadeMenu() {
    const host = document.getElementById(ARCADE_MENU_HOST_ID);
    if (!(host instanceof HTMLElement)) return null;
    if (!host.dataset.mounted) {
      host.innerHTML = getArcadeMenuMarkup();
      host.dataset.mounted = "1";
    }
    host.classList.remove("hidden");
    document.body.classList.add("arcade-menu-enabled");
    return host;
  }
  function getArcadeMenuMarkup() {
    return `
    <div class="arcade-menu-shell">
      <div class="arcade-menu-router">
        <section class="${ARCADE_MENU_SCREEN_CLASS} active" id="${arcadeScreenId("home")}">
          <div class="arcade-home-hero">
            <div class="arcade-title-block">
              <p class="arcade-kicker">Sky League // Carrier Deck</p>
              <h1>SMASHCART</h1>
              <p class="arcade-tagline">Pick the mission, arm the plane, and launch from a menu that finally feels like a combat game.</p>
            </div>
            <div class="arcade-hero-console">
              <div class="arcade-chip-cluster">
                <span id="arcade-room-code-chip" class="signal-chip signal-chip--ready">Deck local</span>
                <span id="arcade-menu-server-badge" class="server-badge">Local play</span>
              </div>
              <div class="arcade-hero-actions">
                <button type="button" class="arcade-meta-btn" data-arcade-nav="join">Join Invite</button>
                <button type="button" id="arcade-menu-settings-btn" class="arcade-meta-btn arcade-meta-btn--secondary">Settings</button>
              </div>
              <p class="arcade-hero-copy">Fast entry, local hotspot support, and a full hangar customization pass all live on the same deck.</p>
            </div>
          </div>

          <div class="arcade-home-grid">
            <section class="arcade-panel arcade-loadout-panel">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">Active Aircraft</p>
                  <h2 id="arcade-selected-plane-name" class="arcade-panel-title">Viper Fighter</h2>
                </div>
                <button type="button" id="arcade-customize-open-btn" class="arcade-panel-action" data-arcade-nav="customize">Open Hangar</button>
              </div>
              <p id="arcade-selected-plane-summary" class="arcade-panel-copy">Scarlet paint, Midnight accent, Clean livery, White Smoke trail</p>
              <div id="arcade-selected-plane-chips" class="arcade-chip-strip"></div>
              <div class="arcade-field-row">
                <label class="arcade-field">
                  <span class="arcade-field-label">Call Sign</span>
                  <input id="arcade-name-input" class="arcade-input" maxlength="14" placeholder="Pilot name" aria-label="Call sign" />
                </label>
                <label class="arcade-switch" for="arcade-bots-check">
                  <input type="checkbox" id="arcade-bots-check" checked />
                  <span>Fill empty seats with bots</span>
                </label>
              </div>
            </section>

            <section class="arcade-panel arcade-mission-panel">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">Mission Select</p>
                  <h2 class="arcade-panel-title">Choose Your Route</h2>
                </div>
                <span class="arcade-panel-badge">Ready</span>
              </div>
              <div class="arcade-command-stack">
                <button type="button" class="arcade-command-btn arcade-command-btn--major" data-arcade-nav="play">
                  <span class="arcade-command-icon">01</span>
                  <span class="arcade-command-copy">
                    <strong>Launch Match</strong>
                    <span>Public, private, and hotspot dogfights branch from one proper start screen.</span>
                  </span>
                  <span class="arcade-command-tag">Primary</span>
                </button>
                <button type="button" class="arcade-command-btn" data-arcade-nav="join">
                  <span class="arcade-command-icon">02</span>
                  <span class="arcade-command-copy">
                    <strong>Join Invite</strong>
                    <span>Scan a QR, paste a link, or enter a room code without hunting through utility UI.</span>
                  </span>
                  <span class="arcade-command-tag">Fast</span>
                </button>
                <button type="button" class="arcade-command-btn" data-arcade-nav="lan">
                  <span class="arcade-command-icon">03</span>
                  <span class="arcade-command-copy">
                    <strong>Local Wi-Fi Ops</strong>
                    <span>Host on one device, scan on nearby phones, and keep hotspot matches one tap away.</span>
                  </span>
                  <span class="arcade-command-tag">OpsX</span>
                </button>
                <button type="button" class="arcade-command-btn" data-arcade-nav="leaders">
                  <span class="arcade-command-icon">04</span>
                  <span class="arcade-command-copy">
                    <strong>Leaderboard</strong>
                    <span>Check the all-time aces before rolling out to the runway.</span>
                  </span>
                  <span class="arcade-command-tag">Aces</span>
                </button>
              </div>
            </section>
          </div>
        </section>

        <section class="${ARCADE_MENU_SCREEN_CLASS}" id="${arcadeScreenId("play")}">
          <header class="arcade-screen-header">
            <button type="button" class="arcade-back-btn" data-arcade-back>Back</button>
            <div class="arcade-screen-title-wrap">
              <p class="arcade-panel-kicker">Launch Bay</p>
              <h2 class="arcade-screen-title">Pick A Match Type</h2>
              <p class="arcade-screen-copy">Your aircraft stays armed. Choose the room style that matches how people are joining.</p>
            </div>
          </header>

          <div class="arcade-banner">
            <span class="arcade-banner-label">Current loadout</span>
            <p id="arcade-play-loadout-summary">Viper Fighter - Scarlet - Clean - White Smoke</p>
          </div>

          <div class="arcade-mode-grid">
            <button type="button" id="arcade-quick-play-btn" class="arcade-command-btn arcade-command-btn--major">
              <span class="arcade-command-icon">A</span>
              <span class="arcade-command-copy">
                <strong>Public Scramble</strong>
                <span>Instant action. Launch straight into the live public fight with your current plane.</span>
              </span>
              <span class="arcade-command-tag">Fastest</span>
            </button>
            <button type="button" id="arcade-private-room-btn" class="arcade-command-btn">
              <span class="arcade-command-icon">B</span>
              <span class="arcade-command-copy">
                <strong>Private Squad Room</strong>
                <span>Create an invite code, wait in the lobby, and launch when your squad is ready.</span>
              </span>
              <span class="arcade-command-tag">Invite</span>
            </button>
            <button type="button" class="arcade-command-btn" data-arcade-nav="lan">
              <span class="arcade-command-icon">C</span>
              <span class="arcade-command-copy">
                <strong>Local Wi-Fi Field Play</strong>
                <span>For couch sessions and hotspot matches. One host creates the room, everyone else scans.</span>
              </span>
              <span class="arcade-command-tag">Nearby</span>
            </button>
          </div>

          <section class="arcade-panel arcade-route-panel">
            <div class="arcade-panel-header">
              <div>
                <p class="arcade-panel-kicker">Route Guide</p>
                <h3 class="arcade-panel-title">Which Button Should Players Use?</h3>
              </div>
              <span class="arcade-panel-badge arcade-panel-badge--subtle">Briefing</span>
            </div>
            <p class="arcade-panel-copy">Public Scramble is for immediate matchmaking. Private Squad Room is for invited players. Local Wi-Fi Field Play is the dedicated hotspot path and keeps the OpsX local-play flow front and center.</p>
          </section>
        </section>

        <section class="${ARCADE_MENU_SCREEN_CLASS}" id="${arcadeScreenId("join")}">
          <header class="arcade-screen-header">
            <button type="button" class="arcade-back-btn" data-arcade-back>Back</button>
            <div class="arcade-screen-title-wrap">
              <p class="arcade-panel-kicker">Join Console</p>
              <h2 class="arcade-screen-title">Scan Or Enter Invite</h2>
              <p class="arcade-screen-copy">Every join path funnels through one clear screen so players are never stuck guessing.</p>
            </div>
          </header>

          <div class="arcade-join-grid">
            <button type="button" id="arcade-scan-open-btn" class="arcade-command-btn arcade-command-btn--major">
              <span class="arcade-command-icon">QR</span>
              <span class="arcade-command-copy">
                <strong>Scan QR Invite</strong>
                <span>Use the host's on-screen code and join with the least friction.</span>
              </span>
              <span class="arcade-command-tag">Camera</span>
            </button>

            <section class="arcade-panel arcade-join-panel">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">Manual Entry</p>
                  <h3 class="arcade-panel-title">Paste Code Or Link</h3>
                </div>
              </div>
              <p class="arcade-panel-copy">Private-room links, short room codes, and local invites all resolve from the same input.</p>
              <input id="arcade-join-code-input" class="arcade-input arcade-input--wide" maxlength="200" placeholder="ABCDEF or paste invite link" autocomplete="off" spellcheck="false" aria-label="Room code or invite link" />
              <button type="button" id="arcade-join-code-submit" class="arcade-panel-action arcade-panel-action--wide">Join Room</button>
            </section>

            <section class="arcade-panel arcade-invite-guide">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">Accepted Invites</p>
                  <h3 class="arcade-panel-title">One Input, Three Formats</h3>
                </div>
                <span class="arcade-panel-badge arcade-panel-badge--subtle">Simple</span>
              </div>
              <div class="arcade-rule-list">
                <div class="arcade-rule-row"><strong>Room code</strong><span>Enter the 6-character code from the host.</span></div>
                <div class="arcade-rule-row"><strong>Invite link</strong><span>Paste the full URL exactly as it was shared.</span></div>
                <div class="arcade-rule-row"><strong>Local QR</strong><span>Scan when the host shows a nearby or hotspot invite.</span></div>
              </div>
            </section>
          </div>
        </section>

        <section class="${ARCADE_MENU_SCREEN_CLASS}" id="${arcadeScreenId("lan")}">
          <header class="arcade-screen-header">
            <button type="button" class="arcade-back-btn" data-arcade-back>Back</button>
            <div class="arcade-screen-title-wrap">
              <p class="arcade-panel-kicker">OpsX Local Play</p>
              <h2 class="arcade-screen-title">Local Wi-Fi Command</h2>
              <p class="arcade-screen-copy">Built for one hotspot: host creates the room, nearby players scan, and fallback tools stay tucked below.</p>
            </div>
          </header>

          <div class="arcade-banner">
            <span class="arcade-banner-label">Selected plane</span>
            <p id="arcade-local-loadout-summary">Viper Fighter - Scarlet - Clean - White Smoke</p>
          </div>

          <div class="arcade-local-grid">
            <section class="arcade-panel arcade-local-panel">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">Host On This Device</p>
                  <h3 class="arcade-panel-title">Create Room</h3>
                </div>
                <span class="arcade-panel-badge">Primary</span>
              </div>
              <p class="arcade-panel-copy">Start the hotspot match here. Friends on the same Wi-Fi only need to scan and tap Join.</p>
              <div class="arcade-inline-field">
                <input id="arcade-local-room-name" class="arcade-input" maxlength="20" placeholder="Room name" aria-label="Room name" />
                <button type="button" id="arcade-local-create-btn" class="arcade-panel-action">Create Room</button>
              </div>
            </section>

            <section class="arcade-panel arcade-local-panel">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">Join Nearby</p>
                  <h3 class="arcade-panel-title">Scan Rooms</h3>
                </div>
                <span class="arcade-panel-badge arcade-panel-badge--subtle">Nearby</span>
              </div>
              <p class="arcade-panel-copy">See live rooms on the same hotspot, inspect player counts, and join without typing a server address.</p>
              <div class="arcade-local-actions">
                <button type="button" id="arcade-local-scan-btn" class="arcade-panel-action arcade-panel-action--wide">Scan Rooms</button>
                <div id="arcade-local-room-list" class="local-room-list arcade-local-room-list">
                  <p class="muted local-empty">No scan yet. If someone is already hosting, tap Scan Rooms.</p>
                </div>
              </div>
            </section>
          </div>

          <div class="arcade-local-grid arcade-local-grid--brief">
            <section class="arcade-panel arcade-opsx-panel">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">OpsX Proposal</p>
                  <h3 class="arcade-panel-title">Upcoming Local Field Flow</h3>
                </div>
                <span class="arcade-panel-badge arcade-panel-badge--subtle">Pilot Plan</span>
              </div>
              <div class="arcade-rule-list">
                <div class="arcade-rule-row"><strong>Step 1</strong><span>Host launches from this screen and names the room.</span></div>
                <div class="arcade-rule-row"><strong>Step 2</strong><span>Guests on the same hotspot tap Scan Rooms and see the host immediately.</span></div>
                <div class="arcade-rule-row"><strong>Step 3</strong><span>Fallback server and offline QR tools stay available only when auto-discovery is not enough.</span></div>
              </div>
            </section>

            <section class="arcade-panel arcade-fallback-panel">
              <div class="arcade-panel-header">
                <div>
                  <p class="arcade-panel-kicker">Fallback Utilities</p>
                  <h3 class="arcade-panel-title">Manual Server And Offline QR</h3>
                </div>
                <span class="arcade-panel-badge arcade-panel-badge--subtle">Secondary</span>
              </div>
              <p class="arcade-panel-copy">Use these only when hotspot discovery is unavailable. The main intended flow is Create Room plus Scan Rooms.</p>
              <label class="arcade-field">
                <span class="arcade-field-label">Hotspot server</span>
                <input id="arcade-lan-server-input" class="arcade-input" maxlength="120" placeholder="http://192.168.43.1:2567" />
              </label>
              <div class="arcade-fallback-actions">
                <button type="button" id="arcade-lan-quick-btn" class="arcade-panel-action">LAN Quick Play</button>
                <button type="button" id="arcade-lan-friends-btn" class="arcade-panel-action arcade-panel-action--secondary">LAN Room</button>
              </div>
              <p id="arcade-lan-hint" class="muted arcade-hint"></p>
              <div class="arcade-divider"></div>
              <p class="arcade-panel-copy">No hotspot server? Use the offline browser-to-browser fallback below.</p>
              <div class="arcade-fallback-actions">
                <button type="button" id="arcade-p2p-offline-btn" class="arcade-panel-action arcade-panel-action--secondary">Offline QR</button>
              </div>
              <div id="arcade-p2p-offline-section" class="hidden arcade-offline-section">
                <p class="muted">Host: scan the QR below on the guest device. Guest: paste the answer payload here.</p>
                <canvas id="arcade-p2p-offline-canvas" class="arcade-offline-canvas"></canvas>
                <div class="arcade-inline-field">
                  <input id="arcade-p2p-answer-input" class="arcade-input" placeholder="Paste guest answer" />
                  <button type="button" id="arcade-p2p-answer-submit" class="arcade-panel-action arcade-panel-action--secondary">Connect</button>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section class="${ARCADE_MENU_SCREEN_CLASS}" id="${arcadeScreenId("leaders")}">
          <header class="arcade-screen-header">
            <button type="button" class="arcade-back-btn" data-arcade-back>Back</button>
            <div class="arcade-screen-title-wrap">
              <p class="arcade-panel-kicker">Aces Board</p>
              <h2 class="arcade-screen-title">All-Time Leaders</h2>
              <p class="arcade-screen-copy">Persistent pilot rankings with enough weight to feel like part of the game front-end.</p>
            </div>
          </header>

          <section class="arcade-panel arcade-leaderboard-panel">
            <div class="arcade-panel-header">
              <div>
                <p class="arcade-panel-kicker">Top Pilots</p>
                <h3 class="arcade-panel-title">Current Scoreline</h3>
              </div>
              <span class="arcade-panel-badge arcade-panel-badge--subtle">Top 10</span>
            </div>
            <div id="arcade-menu-leaderboard">
              <div class="lb-row muted">Loading...</div>
            </div>
          </section>
        </section>

        <section class="${ARCADE_MENU_SCREEN_CLASS}" id="${arcadeScreenId("customize")}">
          <header class="arcade-screen-header">
            <button type="button" class="arcade-back-btn" data-arcade-back>Back</button>
            <div class="arcade-screen-title-wrap">
              <p class="arcade-panel-kicker">Hangar</p>
              <h2 class="arcade-screen-title">Customize Your Plane</h2>
              <p class="arcade-screen-copy">A proper loadout system: save presets, swap airframes, and carry the same plane into public, private, and local Wi-Fi matches.</p>
            </div>
          </header>

          <div class="arcade-customize-layout">
            <aside class="arcade-customize-sidebar">
              <section class="arcade-panel arcade-hangar-panel">
                <div class="arcade-panel-header">
                  <div>
                    <p class="arcade-panel-kicker">Armed Loadout</p>
                    <h3 id="arcade-customize-summary-name" class="arcade-panel-title">Viper Fighter</h3>
                  </div>
                  <span class="arcade-panel-badge">Live</span>
                </div>
                <p id="arcade-customize-summary-text" class="arcade-panel-copy">Scarlet paint, Midnight accent, Clean livery, White Smoke trail</p>
                <div id="arcade-customize-summary-grid" class="summary-grid"></div>
                <div class="arcade-fallback-actions">
                  <button type="button" id="arcade-customize-randomize" class="arcade-panel-action arcade-panel-action--secondary">Randomize</button>
                  <button type="button" id="arcade-customize-reset" class="arcade-panel-action arcade-panel-action--secondary">Reset</button>
                  <button type="button" id="arcade-customize-done" class="arcade-panel-action" data-arcade-back>Done</button>
                </div>
                <p id="arcade-customize-feedback" class="muted arcade-hint">Cosmetics are visual only. No effect on flight or damage.</p>
              </section>

              <section class="arcade-panel">
                <div class="arcade-panel-header">
                  <div>
                    <p class="arcade-panel-kicker">Preset Slots</p>
                    <h3 class="arcade-panel-title">Save And Swap</h3>
                  </div>
                  <span class="arcade-panel-badge arcade-panel-badge--subtle">4 slots</span>
                </div>
                <div id="arcade-preset-grid" class="preset-grid"></div>
              </section>
            </aside>

            <div class="arcade-customize-main">
              <section class="arcade-panel arcade-stage-panel">
                <div class="arcade-stage-grid">
                  <div class="arcade-stage-radar"></div>
                  <div>
                    <p class="arcade-panel-kicker">Runway Camera</p>
                    <h3 class="arcade-panel-title">Live Preview Behind The UI</h3>
                    <p class="arcade-panel-copy">The 3D scene keeps the selected aircraft visible while you tune paint, airframe, livery, and trail from a real hangar screen instead of a settings list.</p>
                  </div>
                </div>
              </section>

              <div class="arcade-option-columns">
                <section class="arcade-panel">
                  <div class="arcade-panel-header">
                    <div>
                      <p class="arcade-panel-kicker">Airframe</p>
                      <h3 class="arcade-panel-title">Choose The Silhouette</h3>
                    </div>
                  </div>
                  <div id="arcade-customize-airframe" class="option-grid option-grid--cards"></div>
                </section>

                <section class="arcade-panel">
                  <div class="arcade-panel-header">
                    <div>
                      <p class="arcade-panel-kicker">Paint</p>
                      <h3 class="arcade-panel-title">Primary Finish</h3>
                    </div>
                  </div>
                  <div id="arcade-customize-paint" class="option-grid option-grid--swatches"></div>
                </section>

                <section class="arcade-panel">
                  <div class="arcade-panel-header">
                    <div>
                      <p class="arcade-panel-kicker">Accent</p>
                      <h3 class="arcade-panel-title">Trim Color</h3>
                    </div>
                  </div>
                  <div id="arcade-customize-accent" class="option-grid option-grid--swatches"></div>
                </section>

                <section class="arcade-panel">
                  <div class="arcade-panel-header">
                    <div>
                      <p class="arcade-panel-kicker">Livery</p>
                      <h3 class="arcade-panel-title">Pattern Layout</h3>
                    </div>
                  </div>
                  <div id="arcade-customize-livery" class="option-grid option-grid--cards"></div>
                </section>

                <section class="arcade-panel">
                  <div class="arcade-panel-header">
                    <div>
                      <p class="arcade-panel-kicker">Trail</p>
                      <h3 class="arcade-panel-title">Engine Wake</h3>
                    </div>
                  </div>
                  <div id="arcade-customize-trail" class="option-grid option-grid--swatches"></div>
                </section>
              </div>
            </div>
          </div>
        </section>

        <div class="arcade-menu-footer">
          <p id="arcade-orientation-note" class="muted">Landscape is recommended on touch devices.</p>
          <p id="arcade-friends-note" class="muted"></p>
          <p id="arcade-status" class="muted arcade-status-line" aria-live="polite"></p>
        </div>
      </div>
    </div>
  `;
  }
  var ARCADE_MENU_HOST_ID, ARCADE_MENU_SCREEN_CLASS;
  var init_arcadeMenu = __esm({
    "src/client/arcadeMenu.ts"() {
      "use strict";
      ARCADE_MENU_HOST_ID = "arcade-start-screen";
      ARCADE_MENU_SCREEN_CLASS = "arcade-menu-screen";
    }
  });

  // src/shared/loadout.ts
  function toInt(value) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === "string" && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
  function clampIndex(value, count, fallback) {
    const parsed = toInt(value);
    return parsed !== null && parsed >= 0 && parsed < count ? parsed : fallback;
  }
  function cloneLoadout(loadout) {
    return {
      color: loadout.color,
      bodyShape: loadout.bodyShape,
      accent: loadout.accent,
      trail: loadout.trail,
      livery: loadout.livery
    };
  }
  function sameLoadout(a, b) {
    return a.color === b.color && a.bodyShape === b.bodyShape && a.accent === b.accent && a.trail === b.trail && a.livery === b.livery;
  }
  function clampLoadout(loadout) {
    return {
      color: clampIndex(loadout.color, PAINT_OPTIONS.length, DEFAULT_LOADOUT.color),
      bodyShape: clampIndex(loadout.bodyShape, AIRFRAME_OPTIONS.length, DEFAULT_LOADOUT.bodyShape),
      accent: clampIndex(loadout.accent, ACCENT_OPTIONS.length, DEFAULT_LOADOUT.accent),
      trail: clampIndex(loadout.trail, TRAIL_OPTIONS.length, DEFAULT_LOADOUT.trail),
      livery: clampIndex(loadout.livery, LIVERY_OPTIONS.length, DEFAULT_LOADOUT.livery)
    };
  }
  function createDefaultLoadoutStore() {
    return {
      version: 1,
      active: cloneLoadout(DEFAULT_LOADOUT),
      presets: Array.from({ length: PRESET_SLOT_COUNT }, () => cloneLoadout(DEFAULT_LOADOUT))
    };
  }
  function parseLoadoutStore(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      const store = createDefaultLoadoutStore();
      store.active = clampLoadout(parsed.active || {});
      const rawPresets = Array.isArray(parsed.presets) ? parsed.presets : [];
      store.presets = Array.from(
        { length: PRESET_SLOT_COUNT },
        (_, index) => clampLoadout(rawPresets[index] || DEFAULT_LOADOUT)
      );
      return store;
    } catch {
      return null;
    }
  }
  function loadoutFromLegacy(source) {
    const fallbackColor = clampIndex(source.skin, PAINT_OPTIONS.length, DEFAULT_LOADOUT.color);
    return {
      color: clampIndex(source.color, PAINT_OPTIONS.length, fallbackColor),
      bodyShape: clampIndex(source.bodyShape, AIRFRAME_OPTIONS.length, DEFAULT_LOADOUT.bodyShape),
      accent: clampIndex(source.accent, ACCENT_OPTIONS.length, DEFAULT_LOADOUT.accent),
      trail: clampIndex(source.trail, TRAIL_OPTIONS.length, DEFAULT_LOADOUT.trail),
      livery: clampIndex(source.livery, LIVERY_OPTIONS.length, DEFAULT_LOADOUT.livery)
    };
  }
  function randomizeLoadout(random = Math.random) {
    const pick = (count) => Math.max(0, Math.min(count - 1, Math.floor(random() * count)));
    return {
      color: pick(PAINT_OPTIONS.length),
      bodyShape: pick(AIRFRAME_OPTIONS.length),
      accent: pick(ACCENT_OPTIONS.length),
      trail: pick(TRAIL_OPTIONS.length),
      livery: pick(LIVERY_OPTIONS.length)
    };
  }
  function getLoadoutSummary(loadout) {
    const airframe = AIRFRAME_OPTIONS[loadout.bodyShape] || AIRFRAME_OPTIONS[0];
    const paint = PAINT_OPTIONS[loadout.color] || PAINT_OPTIONS[0];
    const accent = ACCENT_OPTIONS[loadout.accent] || ACCENT_OPTIONS[0];
    const livery = LIVERY_OPTIONS[loadout.livery] || LIVERY_OPTIONS[0];
    const trail = TRAIL_OPTIONS[loadout.trail] || TRAIL_OPTIONS[0];
    return {
      title: `${airframe.callsign} ${airframe.label}`,
      subtitle: `${paint.label} paint \xB7 ${accent.label} accent \xB7 ${livery.label} livery \xB7 ${trail.label} trail`
    };
  }
  function getLoadoutDetailRows(loadout) {
    return [
      { label: "Airframe", value: (AIRFRAME_OPTIONS[loadout.bodyShape] || AIRFRAME_OPTIONS[0]).label },
      { label: "Paint", value: (PAINT_OPTIONS[loadout.color] || PAINT_OPTIONS[0]).label },
      { label: "Accent", value: (ACCENT_OPTIONS[loadout.accent] || ACCENT_OPTIONS[0]).label },
      { label: "Livery", value: (LIVERY_OPTIONS[loadout.livery] || LIVERY_OPTIONS[0]).label },
      { label: "Trail", value: (TRAIL_OPTIONS[loadout.trail] || TRAIL_OPTIONS[0]).label }
    ];
  }
  var LOADOUT_STORAGE_KEY, PRESET_SLOT_COUNT, DEFAULT_LOADOUT, LEGACY_LOADOUT_KEYS, AIRFRAME_OPTIONS, PAINT_OPTIONS, ACCENT_OPTIONS, LIVERY_OPTIONS, TRAIL_OPTIONS, PRESET_SLOTS;
  var init_loadout = __esm({
    "src/shared/loadout.ts"() {
      "use strict";
      LOADOUT_STORAGE_KEY = "smashcart.loadout.v1";
      PRESET_SLOT_COUNT = 4;
      DEFAULT_LOADOUT = {
        color: 0,
        bodyShape: 0,
        accent: 0,
        trail: 0,
        livery: 0
      };
      LEGACY_LOADOUT_KEYS = {
        skin: "smashcart.skin",
        color: "smashcart.color",
        bodyShape: "smashcart.bodyShape",
        accent: "smashcart.accent",
        trail: "smashcart.trail",
        livery: "smashcart.livery"
      };
      AIRFRAME_OPTIONS = [
        { value: 0, label: "Fighter", callsign: "Viper", note: "Balanced silhouette with a steady mid-wing stance." },
        { value: 1, label: "Interceptor", callsign: "Razor", note: "Slim nose and swept wings for a fast strike profile." },
        { value: 2, label: "Bomber", callsign: "Mammoth", note: "Broad wings and a heavy center mass with twin nacelles." },
        { value: 3, label: "Biplane", callsign: "Stork", note: "Stacked wings and struts for a vintage dogfight look." }
      ];
      PAINT_OPTIONS = [
        { value: 0, label: "Scarlet", note: "Classic red launch paint.", swatch: "#ff6b6b" },
        { value: 1, label: "Cobalt", note: "Cold blue squadron finish.", swatch: "#49c0ff" },
        { value: 2, label: "Olive", note: "Field-ready tactical green.", swatch: "#8be34a" },
        { value: 3, label: "Sunburst", note: "High-visibility yellow sweep.", swatch: "#ffd24a" },
        { value: 4, label: "Violet", note: "Arcade purple glow tone.", swatch: "#c07bff" },
        { value: 5, label: "Ember", note: "Hot orange carrier deck flare.", swatch: "#ff9f43" },
        { value: 6, label: "Teal", note: "Sea-glass cyan finish.", swatch: "#00d2d3" },
        { value: 7, label: "Cream", note: "Warm ivory patrol coat.", swatch: "#ffeaa7" },
        { value: 8, label: "Ghost", note: "Pale alloy shell.", swatch: "#dfe6e9" },
        { value: 9, label: "Stealth", note: "Low-light blacked-out finish.", swatch: "#2d3436" },
        { value: 10, label: "Rust", note: "Weathered copper strike paint.", swatch: "#e17055" },
        { value: 11, label: "Mint", note: "Bright coastal mint.", swatch: "#55efc4" }
      ];
      ACCENT_OPTIONS = [
        { value: 0, label: "Midnight", note: "Dark utility trim.", swatch: "#273244" },
        { value: 1, label: "Signal White", note: "Clean instrument-white contrast.", swatch: "#ffffff" },
        { value: 2, label: "Iron Black", note: "Deep matte shadow line.", swatch: "#000000" },
        { value: 3, label: "Gold", note: "Showcase deck stripe highlight.", swatch: "#ffd24a" },
        { value: 4, label: "Crimson", note: "Red warning-band accent.", swatch: "#ff6b6b" },
        { value: 5, label: "Ice Blue", note: "Cold neon wing edge.", swatch: "#49c0ff" },
        { value: 6, label: "Vector Green", note: "Radar-green trim.", swatch: "#8be34a" }
      ];
      LIVERY_OPTIONS = [
        { value: 0, label: "Clean", note: "Primary body with crisp wing contrast." },
        { value: 1, label: "Stripe", note: "Single bold centerline stripe." },
        { value: 2, label: "Two-Tone", note: "Split-color wing and tail treatment." },
        { value: 3, label: "Camo", note: "Patchwork accent markers across the shell." }
      ];
      TRAIL_OPTIONS = [
        { value: 0, label: "White Smoke", note: "Neutral engine exhaust.", swatch: "#ffffff" },
        { value: 1, label: "Afterburner Orange", note: "Hot thrust flare.", swatch: "#ff9f43" },
        { value: 2, label: "Cryo Blue", note: "Cold plasma stream.", swatch: "#49c0ff" },
        { value: 3, label: "Plasma Violet", note: "Electric purple trail.", swatch: "#c07bff" },
        { value: 4, label: "Toxic Green", note: "Acid-green vapor wake.", swatch: "#8be34a" }
      ];
      PRESET_SLOTS = [
        { index: 0, label: "Deck 1" },
        { index: 1, label: "Deck 2" },
        { index: 2, label: "Deck 3" },
        { index: 3, label: "Deck 4" }
      ];
    }
  });

  // src/client/main.ts
  var require_main = __commonJS({
    "src/client/main.ts"() {
      init_host_sim();
      init_arcadeMenu();
      init_loadout();
      var dollar = (id) => document.getElementById(id);
      var menuRoot = mountArcadeMenu() || dollar("start-screen");
      var useArcadeMenu = menuRoot.id === ARCADE_MENU_HOST_ID;
      var menuDollar = (...ids) => {
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el) return el;
        }
        throw new Error(`Missing DOM element: ${ids.join(", ")}`);
      };
      var menuScreenSelector = useArcadeMenu ? `.${ARCADE_MENU_SCREEN_CLASS}` : ".menu-screen";
      var menuNavSelector = useArcadeMenu ? "[data-arcade-nav]" : "[data-nav]";
      var menuBackSelector = useArcadeMenu ? "[data-arcade-back]" : "[data-back]";
      var menuScreenElementId = (id) => useArcadeMenu ? arcadeScreenId(id) : `screen-${id}`;
      var G = window.GAME;
      var buzz = (ms) => {
        try {
          if (navigator.vibrate) navigator.vibrate(ms);
        } catch {
        }
      };
      var els = {
        canvas: dollar("game"),
        hud: dollar("hud"),
        score: dollar("hud-score"),
        time: dollar("hud-time"),
        alt: dollar("hud-alt"),
        speed: dollar("hud-speed"),
        boostFill: dollar("boost-fill"),
        crosshair: dollar("crosshair"),
        oobWarning: dollar("oob-warning"),
        leaderboard: dollar("leaderboard"),
        health: dollar("healthbar"),
        healthfill: dollar("healthfill"),
        respawn: dollar("respawn"),
        start: menuRoot,
        name: menuDollar("arcade-name-input", "name-input"),
        lanServer: menuDollar("arcade-lan-server-input", "lan-server-input"),
        lanQuick: menuDollar("arcade-lan-quick-btn", "lan-quick-btn"),
        lanFriends: menuDollar("arcade-lan-friends-btn", "lan-friends-btn"),
        lanHint: menuDollar("arcade-lan-hint", "lan-hint"),
        serverBadge: menuDollar("arcade-menu-server-badge", "menu-server-badge"),
        roomChip: menuDollar("arcade-room-code-chip", "room-code-chip"),
        orientationNote: menuDollar("arcade-orientation-note", "orientation-note"),
        friendsNote: menuDollar("arcade-friends-note", "friends-note"),
        status: menuDollar("arcade-status", "status"),
        mute: dollar("mute-btn"),
        pause: dollar("pause-screen"),
        resume: dollar("resume-btn"),
        pauseMenu: dollar("pause-menu-btn"),
        pauseSettings: dollar("pause-settings-btn"),
        share: dollar("share-bar"),
        shareLink: dollar("share-link"),
        qrBtn: dollar("qr-btn"),
        copy: dollar("copy-btn"),
        shareQrOverlay: dollar("share-qr-overlay"),
        shareQrCanvas: dollar("share-qr-canvas"),
        shareQrRoom: dollar("share-qr-room"),
        shareQrCode: dollar("share-qr-code"),
        shareQrNote: dollar("share-qr-note"),
        shareQrLink: dollar("share-qr-link"),
        shareQrCopy: dollar("share-qr-copy"),
        shareQrClose: dollar("share-qr-close"),
        scanOverlay: dollar("scan-overlay"),
        scanVideo: dollar("scan-video"),
        scanCanvas: dollar("scan-canvas"),
        scanStatus: dollar("scan-status"),
        scanCloseBtn: dollar("scan-close-btn"),
        scanOpenBtn: menuDollar("arcade-scan-open-btn", "scan-open-btn"),
        inter: dollar("intermission"),
        finalBoard: dollar("final-board"),
        interTime: dollar("inter-time"),
        winnerLine: dollar("winner-line"),
        yourPlace: dollar("your-place"),
        killfeed: dollar("killfeed"),
        callout: dollar("callout"),
        vignette: dollar("vignette"),
        powerChip: dollar("power-chip"),
        touch: dollar("touch-controls"),
        left: dollar("left-btn"),
        right: dollar("right-btn"),
        climb: dollar("climb-btn"),
        dive: dollar("dive-btn"),
        boost: dollar("boost-btn"),
        fire: dollar("fire-btn"),
        rotate: dollar("rotate-overlay"),
        connLost: dollar("conn-lost"),
        connMsg: dollar("conn-msg"),
        connRetry: dollar("conn-retry"),
        connMenu: dollar("conn-menu"),
        bots: menuDollar("arcade-bots-check", "bots-check"),
        countdown: dollar("countdown"),
        interLeave: dollar("intermission-leave"),
        p2pOfflineBtn: menuDollar("arcade-p2p-offline-btn", "p2p-offline-btn"),
        p2pOfflineCanvas: menuDollar("arcade-p2p-offline-canvas", "p2p-offline-canvas"),
        p2pAnswerInput: menuDollar("arcade-p2p-answer-input", "p2p-answer-input"),
        p2pAnswerSubmit: menuDollar("arcade-p2p-answer-submit", "p2p-answer-submit"),
        p2pOfflineSection: menuDollar("arcade-p2p-offline-section", "p2p-offline-section"),
        hostLeftOverlay: dollar("host-left-overlay"),
        hostLeftMenuBtn: dollar("host-left-menu-btn"),
        p2pMigratingOverlay: dollar("p2p-migrating-overlay"),
        bootOverlay: dollar("boot-overlay"),
        fatalOverlay: dollar("fatal-overlay"),
        fatalMsg: dollar("fatal-msg"),
        lobbyScreen: dollar("lobby-screen"),
        lobbyTitle: dollar("lobby-title"),
        lobbySettings: dollar("lobby-settings"),
        lobbyRoomName: dollar("lobby-room-name"),
        lobbyRoundLength: dollar("lobby-round-length"),
        lobbyBotsCheck: dollar("lobby-bots-check"),
        lobbyMode: dollar("lobby-mode"),
        hudTeamScore: dollar("hud-team-score"),
        hudTeamBlue: dollar("hud-team-blue"),
        hudTeamRed: dollar("hud-team-red"),
        hudTScore0: dollar("hud-tscore0"),
        hudTScore1: dollar("hud-tscore1"),
        lobbyRoster: dollar("lobby-roster"),
        lobbyReadyBtn: dollar("lobby-ready-btn"),
        lobbyStartBtn: dollar("lobby-start-btn"),
        lobbyLeaveBtn: dollar("lobby-leave-btn"),
        settingsScreen: dollar("settings-screen"),
        settingsCloseBtn: dollar("settings-close-btn"),
        settingsCloseBtn2: dollar("settings-close-btn2"),
        menuSettingsBtn: menuDollar("arcade-menu-settings-btn", "menu-settings-btn"),
        joinCodeInput: menuDollar("arcade-join-code-input", "join-code-input"),
        joinCodeSubmit: menuDollar("arcade-join-code-submit", "join-code-submit"),
        menuLeaderboard: menuDollar("arcade-menu-leaderboard", "menu-leaderboard"),
        lobbyRoomChip: dollar("lobby-room-chip"),
        lobbyModeChip: dollar("lobby-mode-chip"),
        lobbyPlaneSummary: dollar("lobby-plane-summary"),
        customizeOpenBtn: menuDollar("arcade-customize-open-btn", "customize-open-btn"),
        selectedPlaneName: menuDollar("arcade-selected-plane-name", "selected-plane-name"),
        selectedPlaneSummary: menuDollar("arcade-selected-plane-summary", "selected-plane-summary"),
        selectedPlaneChips: menuDollar("arcade-selected-plane-chips", "selected-plane-chips"),
        quickPlayBtn: menuDollar("arcade-quick-play-btn", "quick-play-btn"),
        privateRoomBtn: menuDollar("arcade-private-room-btn", "private-room-btn"),
        playLoadoutSummary: menuDollar("arcade-play-loadout-summary", "play-loadout-summary"),
        localLoadoutSummary: menuDollar("arcade-local-loadout-summary", "local-loadout-summary"),
        customizeSummaryName: menuDollar("arcade-customize-summary-name", "customize-summary-name"),
        customizeSummaryText: menuDollar("arcade-customize-summary-text", "customize-summary-text"),
        customizeSummaryGrid: menuDollar("arcade-customize-summary-grid", "customize-summary-grid"),
        customizeFeedback: menuDollar("arcade-customize-feedback", "customize-feedback"),
        presetGrid: menuDollar("arcade-preset-grid", "preset-grid"),
        customizeAirframe: menuDollar("arcade-customize-airframe", "customize-airframe"),
        customizePaint: menuDollar("arcade-customize-paint", "customize-paint"),
        customizeAccent: menuDollar("arcade-customize-accent", "customize-accent"),
        customizeLivery: menuDollar("arcade-customize-livery", "customize-livery"),
        customizeTrail: menuDollar("arcade-customize-trail", "customize-trail"),
        customizeRandomize: menuDollar("arcade-customize-randomize", "customize-randomize"),
        customizeReset: menuDollar("arcade-customize-reset", "customize-reset"),
        customizeDone: menuDollar("arcade-customize-done", "customize-done"),
        ingameMenuBtn: dollar("ingame-menu-btn"),
        pauseInviteBtn: dollar("pause-invite-btn"),
        localRoomName: menuDollar("arcade-local-room-name", "local-room-name"),
        localCreateBtn: menuDollar("arcade-local-create-btn", "local-create-btn"),
        localScanBtn: menuDollar("arcade-local-scan-btn", "local-scan-btn"),
        localRoomList: menuDollar("arcade-local-room-list", "local-room-list")
      };
      var mode = "menu";
      var sceneMode = "preflight";
      var settingsOpen = false;
      var joinCodeOpen = false;
      var last = 0;
      var prevPhase = "playing";
      var prevHp = G.MAX_HP;
      var streak = 0;
      var lastKill = 0;
      var lastFireSnd = 0;
      var engineStarted = false;
      var botsEnabled = true;
      var botDifficulty = "medium";
      var inviteRoom = null;
      var inviteServer = null;
      var activeShareUrl = null;
      var deathTime = -1;
      var wasAlive = true;
      var oobShownUntil = 0;
      var boostLevel = 0;
      var countdownActive = false;
      var currentLobbyCode = null;
      var currentLobbyServer = null;
      var _settingsDebounce = null;
      var _colyseusNet = null;
      var _isP2PSession = false;
      var scannerOpen = false;
      var scanRafId = null;
      var _localScanInterval = null;
      var presetFeedbackTimeout = null;
      var COLORS_HEX = PAINT_OPTIONS.map((option) => option.swatch || "#ffffff");
      function readLegacyLoadout() {
        return loadoutFromLegacy({
          skin: localStorage.getItem(LEGACY_LOADOUT_KEYS.skin),
          color: localStorage.getItem(LEGACY_LOADOUT_KEYS.color),
          bodyShape: localStorage.getItem(LEGACY_LOADOUT_KEYS.bodyShape),
          accent: localStorage.getItem(LEGACY_LOADOUT_KEYS.accent),
          trail: localStorage.getItem(LEGACY_LOADOUT_KEYS.trail),
          livery: localStorage.getItem(LEGACY_LOADOUT_KEYS.livery)
        });
      }
      function loadPersistedLoadoutStore() {
        try {
          const saved = parseLoadoutStore(localStorage.getItem(LOADOUT_STORAGE_KEY));
          if (saved) return saved;
        } catch {
        }
        const store = createDefaultLoadoutStore();
        try {
          store.active = readLegacyLoadout();
        } catch {
          store.active = cloneLoadout(DEFAULT_LOADOUT);
        }
        return store;
      }
      var loadoutStore = loadPersistedLoadoutStore();
      var selectedCosmetics = cloneLoadout(loadoutStore.active);
      loadoutStore.active = selectedCosmetics;
      function persistLoadoutStore() {
        try {
          localStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(loadoutStore));
          localStorage.setItem(LEGACY_LOADOUT_KEYS.color, String(selectedCosmetics.color));
          localStorage.setItem(LEGACY_LOADOUT_KEYS.bodyShape, String(selectedCosmetics.bodyShape));
          localStorage.setItem(LEGACY_LOADOUT_KEYS.accent, String(selectedCosmetics.accent));
          localStorage.setItem(LEGACY_LOADOUT_KEYS.trail, String(selectedCosmetics.trail));
          localStorage.setItem(LEGACY_LOADOUT_KEYS.livery, String(selectedCosmetics.livery));
        } catch {
        }
      }
      try {
        botsEnabled = localStorage.getItem("smashcart.bots") !== "0";
      } catch {
      }
      try {
        const savedDiff = localStorage.getItem("smashcart.difficulty");
        if (savedDiff === "easy" || savedDiff === "medium" || savedDiff === "high") {
          botDifficulty = savedDiff;
        }
      } catch {
      }
      function loadInputPrefs() {
        try {
          window.Input.invertPitch = localStorage.getItem("smashcart.invertPitch") === "1";
        } catch {
        }
        try {
          window.Input.invertSteer = localStorage.getItem("smashcart.invertSteer") === "1";
        } catch {
        }
      }
      function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
      }
      function ordinal(n) {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      }
      function formatClock(totalSeconds) {
        const safe = Math.max(0, Math.ceil(totalSeconds || 0));
        const minutes = Math.floor(safe / 60);
        const seconds = safe % 60;
        return `${minutes}:${String(seconds).padStart(2, "0")}`;
      }
      function genCode() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let out = "";
        for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return out;
      }
      function isPrivateHost(hostname) {
        const host = String(hostname || "").toLowerCase();
        if (!host) return false;
        if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
        if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
        const parts = host.split(".");
        if (parts.length === 4 && parts[0] === "172") {
          const second = Number(parts[1]);
          if (second >= 16 && second <= 31) return true;
        }
        return false;
      }
      function toPageOrigin(origin) {
        const url = new URL(origin);
        if (url.protocol === "ws:") url.protocol = "http:";
        if (url.protocol === "wss:") url.protocol = "https:";
        return url.origin;
      }
      function toSocketOrigin(origin) {
        const url = new URL(origin);
        if (url.protocol === "http:") url.protocol = "ws:";
        if (url.protocol === "https:") url.protocol = "wss:";
        return url.origin;
      }
      function normalizeServerOrigin(raw) {
        const trimmed = String(raw || "").trim();
        if (!trimmed) return null;
        let candidate = trimmed;
        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) candidate = `http://${candidate}`;
        try {
          const url = new URL(candidate);
          if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) return null;
          if (!url.hostname) return null;
          url.username = "";
          url.password = "";
          url.pathname = "";
          url.search = "";
          url.hash = "";
          if (!url.port && (url.protocol === "http:" || url.protocol === "ws:")) url.port = location.port || "2567";
          return url.origin;
        } catch {
          return null;
        }
      }
      function secureMismatch(origin) {
        return location.protocol === "https:" && toSocketOrigin(origin).startsWith("ws://");
      }
      function readInviteFromUrl() {
        const params = new URLSearchParams(location.search);
        const room = params.get("room");
        inviteRoom = room ? room.toUpperCase().slice(0, 6) : null;
        inviteServer = normalizeServerOrigin(params.get("server"));
        const p2pParam = params.get("p2p");
        if (p2pParam) {
          const p2pCode = p2pParam.trim().toUpperCase().slice(0, 8);
          if (p2pCode.startsWith("P-")) {
            inviteRoom = p2pCode;
            inviteServer = null;
          }
        }
      }
      function loadSavedLanOrigin() {
        try {
          return localStorage.getItem("smashcart.lanServer") || "";
        } catch {
          return "";
        }
      }
      function saveLanOrigin(origin) {
        try {
          if (origin) localStorage.setItem("smashcart.lanServer", toPageOrigin(origin));
          else localStorage.removeItem("smashcart.lanServer");
        } catch {
        }
      }
      function setInviteState(code, serverOrigin) {
        inviteRoom = code;
        inviteServer = code ? serverOrigin : null;
        updateBrowserUrl(code, serverOrigin);
      }
      function updateBrowserUrl(code, serverOrigin) {
        const url = new URL(location.href);
        url.searchParams.delete("room");
        url.searchParams.delete("server");
        if (code) {
          url.searchParams.set("room", code);
          if (serverOrigin && toPageOrigin(serverOrigin) !== location.origin) url.searchParams.set("server", toPageOrigin(serverOrigin));
        }
        const search = url.searchParams.toString();
        history.replaceState(null, "", url.pathname + (search ? `?${search}` : ""));
      }
      function currentLanInputOrigin() {
        return normalizeServerOrigin(els.lanServer.value);
      }
      function currentLanConnectOrigin() {
        return currentLanInputOrigin() || (isPrivateHost(location.hostname) ? location.origin : null);
      }
      function buildShareUrl(code, serverOrigin) {
        const base = serverOrigin ? toPageOrigin(serverOrigin) : location.origin;
        const url = new URL(location.pathname, base.endsWith("/") ? base : base + "/");
        url.searchParams.set("room", code);
        return url.toString();
      }
      function hideShareQr() {
        els.shareQrOverlay.classList.add("hidden");
      }
      async function copyShareLink() {
        const value = activeShareUrl || els.shareLink.value;
        if (!value) return false;
        try {
          els.shareLink.select();
        } catch {
        }
        try {
          els.shareQrLink.select();
        } catch {
        }
        try {
          if (navigator.clipboard) await navigator.clipboard.writeText(value);
          else document.execCommand("copy");
          return true;
        } catch {
          return false;
        }
      }
      function updateShareInvite(code, serverOrigin) {
        const shareUrl = buildShareUrl(code, serverOrigin);
        const shareHost = new URL(serverOrigin ? toPageOrigin(serverOrigin) : location.origin).host;
        const shareHostname = new URL(shareUrl).hostname;
        activeShareUrl = shareUrl;
        els.shareLink.value = shareUrl;
        els.shareQrLink.value = shareUrl;
        els.shareQrRoom.textContent = `Room ${code}`;
        els.shareQrCode.textContent = code;
        els.shareQrNote.textContent = isPrivateHost(shareHostname) ? `Scan on the same hotspot to join ${code} at ${shareHost}.` : `Scan to open room ${code} on ${shareHost}.`;
        els.copy.disabled = false;
        els.shareQrCopy.disabled = false;
        try {
          window.QR.render(els.shareQrCanvas, shareUrl, {
            size: window.Input.isTouchDevice() ? 220 : 256,
            errorCorrectionLevel: "M"
          });
          els.qrBtn.disabled = false;
        } catch {
          els.qrBtn.disabled = true;
          els.shareQrNote.textContent = `Copy the link to join ${code} on ${shareHost}.`;
          els.shareQrCanvas.width = 0;
          els.shareQrCanvas.height = 0;
        }
      }
      function clearShareInvite() {
        activeShareUrl = null;
        els.shareLink.value = "";
        els.shareQrLink.value = "";
        els.shareQrRoom.textContent = "Room";
        els.shareQrCode.textContent = "";
        els.shareQrNote.textContent = "Scan to join this room.";
        els.shareQrCanvas.width = 0;
        els.shareQrCanvas.height = 0;
        els.copy.disabled = true;
        els.shareQrCopy.disabled = true;
        els.qrBtn.disabled = true;
        els.copy.textContent = "Copy";
        els.shareQrCopy.textContent = "Copy Link";
        hideShareQr();
      }
      function showShareQr() {
        if (!activeShareUrl || els.qrBtn.disabled) return;
        els.shareQrOverlay.classList.remove("hidden");
      }
      function updateLobbyMeta() {
        const state = window.Net.state;
        const modeLabel = state?.mode === "tdm" ? "Team Deathmatch" : "Free-for-all";
        const roundLength = typeof state?.roundLength === "number" ? state.roundLength : 150;
        const roomLabel = currentLobbyCode ? `Code ${currentLobbyCode}` : _isP2PSession ? "Wi-Fi live" : "Private room";
        els.lobbyRoomChip.textContent = roomLabel;
        els.lobbyModeChip.textContent = `${modeLabel} \xB7 ${formatClock(roundLength)}`;
      }
      function renderLobbyRoster() {
        const myId = window.Net.sessionId;
        const hostId = window.Net.getHostId();
        const roster = window.Net.getRosterSnapshot();
        const iAmHost = myId === hostId;
        const stateName = window.Net.state?.roomName;
        if (stateName) {
          els.lobbyTitle.textContent = stateName;
        } else if (currentLobbyCode) {
          els.lobbyTitle.textContent = `Room ${currentLobbyCode}`;
        }
        updateLobbyMeta();
        if (iAmHost) {
          els.lobbySettings.classList.remove("hidden");
          const serverRoomName = window.Net.state?.roomName ?? "";
          const serverRoundLength = String(window.Net.state?.roundLength ?? 150);
          if (document.activeElement !== els.lobbyRoomName) {
            els.lobbyRoomName.value = serverRoomName;
          }
          if (document.activeElement !== els.lobbyRoundLength) {
            els.lobbyRoundLength.value = serverRoundLength;
          }
          const serverBotsInRoom = window.Net.state?.botsInRoom ?? false;
          els.lobbyBotsCheck.checked = serverBotsInRoom;
          const serverMode = window.Net.state?.mode ?? "ffa";
          els.lobbyMode.value = serverMode;
        } else {
          els.lobbySettings.classList.add("hidden");
        }
        if (!roster.length) {
          els.lobbyRoster.innerHTML = '<p class="muted">Waiting for players\u2026</p>';
          return;
        }
        els.lobbyRoster.innerHTML = roster.map((p) => {
          const isMe = p.id === myId;
          const isHost = p.id === hostId;
          const isLocalHost = myId === hostId;
          const hostBadge = isHost ? '<span class="lobby-badge lobby-badge--host">HOST</span>' : "";
          const botBadge = p.bot ? '<span class="lobby-badge lobby-badge--bot">BOT</span>' : "";
          const readyMark = !p.bot ? `<span class="lobby-ready-mark ${p.ready ? "is-ready" : ""}">${p.ready ? "\u2713" : "\u25CB"}</span>` : "";
          const kickBtn = isLocalHost && !isMe && !p.bot ? `<button class="lobby-kick-btn secondary" data-target="${escapeHtml(p.id)}" title="Kick">\u2715</button>` : "";
          const colorHex = COLORS_HEX[typeof p.color === "number" && p.color >= 0 && p.color < COLORS_HEX.length ? p.color : 0];
          const colorDot = `<span class="lobby-color-dot" style="background:${colorHex}"></span>`;
          return `<div class="lobby-row${isMe ? " lobby-row--me" : ""}">
  <span class="lobby-row-name">${colorDot}${hostBadge}${botBadge}${escapeHtml(p.name)}</span>
  <span class="lobby-row-right">${readyMark}${kickBtn}</span>
</div>`;
        }).join("");
        els.lobbyRoster.querySelectorAll(".lobby-kick-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            const targetId = btn.dataset.target;
            if (targetId) {
              window.SFX.uiClick();
              window.Net.sendHostKick(targetId);
            }
          });
        });
        const me = roster.find((p) => p.id === myId);
        if (me) {
          els.lobbyReadyBtn.textContent = me.ready ? "Unready" : "Ready";
          els.lobbyReadyBtn.classList.toggle("active", me.ready);
        }
        els.lobbyStartBtn.classList.toggle("hidden", !iAmHost);
      }
      function enterPlayingFromLobby() {
        prevPhase = "playing";
        prevHp = G.MAX_HP;
        wasAlive = true;
        deathTime = -1;
        applyMode("playing");
        els.respawn.classList.add("hidden");
        els.inter.classList.add("hidden");
        if (window.Input.isTouchDevice()) {
          els.touch.classList.remove("hidden");
          applyControlSchemeUI(window.Input.controlScheme);
        }
        if (!engineStarted) {
          window.SFX.startEngine();
          engineStarted = true;
        }
        if (window.SFX.stopMenuAmbient) window.SFX.stopMenuAmbient();
        window.SFX.startMusic();
        runCountdown();
      }
      function setStatus(text = "") {
        els.status.textContent = text;
      }
      function setBusy(busy) {
        [els.lanQuick, els.lanFriends, els.localCreateBtn, els.localScanBtn, els.quickPlayBtn, els.privateRoomBtn, els.joinCodeSubmit].forEach((button) => {
          button.disabled = busy;
        });
      }
      function updateMenuMeta(preserveStatus = true) {
        const lanOrigin = currentLanConnectOrigin();
        els.serverBadge.textContent = lanOrigin ? `LAN ${new URL(toPageOrigin(lanOrigin)).host}` : "Local play";
        const portrait = !!(window.matchMedia && window.matchMedia("(orientation: portrait)").matches);
        if (!window.Input.isTouchDevice()) {
          els.orientationNote.textContent = "Keyboard flight: A/D steer, W/S climb, Shift boost, Space fire.";
        } else if (portrait) {
          els.orientationNote.textContent = "Portrait is fine for setup. Rotate to landscape before you launch.";
        } else {
          els.orientationNote.textContent = "Landscape ready. Touch controls appear after launch.";
        }
        if (inviteRoom) {
          els.roomChip.textContent = `Invite ${inviteRoom}`;
          els.roomChip.dataset.state = "invite";
          const inviteHost = inviteServer ? new URL(toPageOrigin(inviteServer)).host : location.host;
          if (els.friendsNote) els.friendsNote.textContent = `Invite ready for room ${inviteRoom} on ${inviteHost}. Open Join / Scan to connect.`;
          if (!preserveStatus || !els.status.textContent) setStatus(`Invite ready: room ${inviteRoom}`);
        } else {
          els.roomChip.textContent = lanOrigin ? "LAN ready" : "Deck local";
          els.roomChip.dataset.state = lanOrigin ? "lan" : "local";
          if (els.friendsNote) els.friendsNote.textContent = "";
          if (!preserveStatus) setStatus("");
        }
        const typed = els.lanServer.value.trim();
        const lanInput = currentLanInputOrigin();
        if (typed && !lanInput) {
          els.lanHint.textContent = "Enter a valid server address like 192.168.1.10:2567 or http://192.168.1.10:2567.";
        } else if (lanInput && secureMismatch(lanInput)) {
          els.lanHint.textContent = "This page is HTTPS. Insecure LAN servers will be blocked here. Open the game from the hotspot host address instead.";
        } else if (lanInput) {
          const url = new URL(toPageOrigin(lanInput));
          els.lanHint.textContent = isPrivateHost(url.hostname) ? `LAN target ready: ${url.host}. Share that local address with everyone on the hotspot.` : `Custom server selected: ${url.host}. Latency only improves if that server is on the same local network.`;
        } else if (isPrivateHost(location.hostname)) {
          els.lanHint.textContent = `This device is already serving the game locally at ${location.host}. Use the LAN buttons or share this address.`;
        } else {
          els.lanHint.textContent = "For hotspot play, run the game on the host device and enter its local address here.";
        }
      }
      function primeLanInput() {
        const preferred = inviteServer ? toPageOrigin(inviteServer) : loadSavedLanOrigin() || (isPrivateHost(location.hostname) ? location.origin : "");
        els.lanServer.value = preferred;
      }
      function commitLanInput() {
        const normalized = currentLanInputOrigin();
        if (normalized) {
          els.lanServer.value = toPageOrigin(normalized);
          saveLanOrigin(normalized);
        } else if (!els.lanServer.value.trim()) {
          saveLanOrigin(null);
        }
        updateMenuMeta(true);
      }
      function resolveLanOrigin() {
        const raw = els.lanServer.value.trim();
        const normalized = currentLanInputOrigin();
        if (raw && !normalized) {
          setStatus("Enter a valid hotspot address, for example 192.168.1.10:2567.");
          return null;
        }
        const origin = normalized || (isPrivateHost(location.hostname) ? location.origin : null);
        if (!origin) {
          setStatus("Enter the hotspot host address first, for example 192.168.1.10:2567.");
          return null;
        }
        if (secureMismatch(origin)) {
          setStatus("This HTTPS page cannot connect to that insecure LAN server. Open the game from the hotspot host address instead.");
          return null;
        }
        els.lanServer.value = toPageOrigin(origin);
        saveLanOrigin(origin);
        return origin;
      }
      var MENU_SCREENS = ["home", "play", "join", "lan", "leaders", "customize"];
      var navStack = ["home"];
      function currentMenuScreen() {
        return navStack[navStack.length - 1] || "home";
      }
      function deriveSceneMode(state = window.Net?.state) {
        if (mode === "menu") return currentMenuScreen() === "customize" ? "customize" : "preflight";
        if (mode === "lobby") return "lobby";
        if (mode === "paused") return "paused";
        if (mode === "playing") return state && state.phase === "intermission" ? "results" : "playing";
        return "preflight";
      }
      function syncSceneMode(state = window.Net?.state) {
        const next = deriveSceneMode(state);
        if (sceneMode === next && document.body.dataset.sceneMode === next) return;
        sceneMode = next;
        document.body.dataset.sceneMode = next;
        if (window.Renderer && window.Renderer.setSceneMode) window.Renderer.setSceneMode(next);
      }
      function navShow(id) {
        document.body.dataset.menuScreen = id;
        menuRoot.querySelectorAll(menuScreenSelector).forEach((screen2) => screen2.classList.toggle("active", screen2.id === menuScreenElementId(id)));
        menuRoot.scrollTop = 0;
        const menuShell = menuRoot.firstElementChild;
        if (menuShell instanceof HTMLElement) menuShell.scrollTop = 0;
        if (id === "lan") startLocalScanWithAutoRefresh();
        else stopLocalScanInterval();
        syncSceneMode(window.Net?.state);
      }
      function navGo(id) {
        if (navStack[navStack.length - 1] === id) return;
        navStack.push(id);
        navShow(id);
      }
      function navBack() {
        if (navStack.length > 1) {
          navStack.pop();
          navShow(navStack[navStack.length - 1]);
        }
      }
      function navReset() {
        navStack = ["home"];
        navShow("home");
      }
      function applyMode(nextMode) {
        mode = nextMode;
        const isMenu = mode === "menu";
        const isLobby = mode === "lobby";
        const isPlaying = mode === "playing" || mode === "paused";
        const isLost = mode === "lost";
        const isError = mode === "error";
        els.bootOverlay.classList.add("hidden");
        els.start.classList.toggle("hidden", !isMenu);
        els.lobbyScreen.classList.toggle("hidden", !isLobby);
        els.hud.classList.toggle("hidden", !isPlaying);
        els.health.classList.toggle("hidden", !isPlaying);
        els.pause.classList.toggle("hidden", mode !== "paused");
        els.connLost.classList.toggle("hidden", !isLost);
        els.fatalOverlay.classList.toggle("hidden", !isError);
        els.crosshair.classList.toggle("hidden", mode !== "playing");
        if (mode !== "playing") els.oobWarning.classList.add("hidden");
        els.hostLeftOverlay.classList.add("hidden");
        els.p2pMigratingOverlay.classList.add("hidden");
        if (mode !== "lobby") els.share.classList.add("hidden");
        if (!isMenu) stopLocalScanInterval();
        syncSceneMode(window.Net?.state);
      }
      function showHostLeftOverlay() {
        els.hostLeftOverlay.classList.remove("hidden");
      }
      function showFatal(msg) {
        els.fatalMsg.textContent = msg;
        applyMode("error");
      }
      function populateSettingsUI() {
        const vols = window.SFX.vols();
        const volMasterEl = document.getElementById("set-vol-master");
        const volSfxEl = document.getElementById("set-vol-sfx");
        const volMusicEl = document.getElementById("set-vol-music");
        if (volMasterEl) volMasterEl.value = String(vols.master);
        if (volSfxEl) volSfxEl.value = String(vols.sfx);
        if (volMusicEl) volMusicEl.value = String(vols.music);
        const qualityTier = window.Quality._auto ? "auto" : window.Quality.current;
        const qualitySelect = document.getElementById("set-quality");
        if (qualitySelect && qualitySelect.tagName === "SELECT") {
          qualitySelect.value = qualityTier;
        } else {
          const radios = document.querySelectorAll('input[name="set-quality"]');
          radios.forEach((r) => {
            r.checked = r.value === qualityTier;
          });
        }
        const invertPitchEl = document.getElementById("set-invert-pitch");
        const invertSteerEl = document.getElementById("set-invert-steer");
        if (invertPitchEl) invertPitchEl.checked = window.Input.invertPitch;
        if (invertSteerEl) invertSteerEl.checked = window.Input.invertSteer;
        const schemeRadios = document.querySelectorAll('input[name="ctrl-scheme"]');
        schemeRadios.forEach((r) => {
          r.checked = r.value === window.Input.controlScheme;
        });
        const liveDiff = window.Net?.state?.botDifficulty;
        const activeDiff = liveDiff === "easy" || liveDiff === "medium" || liveDiff === "high" ? liveDiff : botDifficulty;
        document.querySelectorAll('input[name="difficulty"]').forEach((r) => {
          r.checked = r.value === activeDiff;
        });
      }
      function showSettings() {
        settingsOpen = true;
        populateSettingsUI();
        els.settingsScreen.classList.remove("hidden");
      }
      function hideSettings() {
        settingsOpen = false;
        els.settingsScreen.classList.add("hidden");
      }
      function closeJoinCode() {
        joinCodeOpen = false;
      }
      function stopScanCamera() {
        if (scanRafId !== null) {
          cancelAnimationFrame(scanRafId);
          scanRafId = null;
        }
        const vid = els.scanVideo;
        const s = vid.srcObject;
        if (s) {
          s.getTracks().forEach((t) => t.stop());
          vid.srcObject = null;
        }
      }
      function extractCodeFromScanResult(raw) {
        const trimmed = raw.trim();
        if (!trimmed) return null;
        try {
          const url = new URL(trimmed);
          const p2p = url.searchParams.get("p2p");
          if (p2p) return p2p.trim().toUpperCase().slice(0, 6);
          const room = url.searchParams.get("room");
          if (room) return room.trim().toUpperCase().slice(0, 6);
          const code = url.searchParams.get("code");
          if (code) return code.trim().toUpperCase().slice(0, 6);
        } catch {
        }
        const bare = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
        return bare || null;
      }
      function openScanner() {
        scannerOpen = true;
        els.scanOverlay.classList.remove("hidden");
        els.scanStatus.textContent = "Starting camera\u2026";
        if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          els.scanStatus.textContent = "Camera needs a secure (HTTPS) connection. On a local Wi-Fi host this isn't available \u2014 type the code instead, or scan the host's QR with your phone's normal camera app.";
          return;
        }
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }).then((stream) => {
          if (!scannerOpen) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          els.scanVideo.srcObject = stream;
          els.scanStatus.textContent = "Point at a SmashCart QR code\u2026";
          els.scanVideo.play().catch(() => {
          });
          function tick() {
            if (!scannerOpen) return;
            const vid = els.scanVideo;
            if (vid.readyState < vid.HAVE_ENOUGH_DATA) {
              scanRafId = requestAnimationFrame(tick);
              return;
            }
            const w = vid.videoWidth;
            const h = vid.videoHeight;
            if (!w || !h) {
              scanRafId = requestAnimationFrame(tick);
              return;
            }
            const cvs = els.scanCanvas;
            cvs.width = w;
            cvs.height = h;
            const ctx = cvs.getContext("2d");
            ctx.drawImage(vid, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            const result = (typeof jsQR !== "undefined" ? jsQR : window.jsQR)?.(img.data, w, h);
            if (result && result.data) {
              const code = extractCodeFromScanResult(result.data);
              if (code) {
                els.scanStatus.textContent = "QR detected \u2014 joining\u2026";
                stopScanCamera();
                scannerOpen = false;
                els.scanOverlay.classList.add("hidden");
                els.joinCodeInput.value = code;
                closeJoinCode();
                window.SFX.uiClick();
                startGame(code, null);
                return;
              }
            }
            scanRafId = requestAnimationFrame(tick);
          }
          scanRafId = requestAnimationFrame(tick);
        }).catch((err) => {
          let msg = "Camera error. Type the code instead.";
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            msg = "Camera permission denied. Allow camera access in your browser settings, or type the code instead.";
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            msg = "No camera found on this device. Type the code instead.";
          } else if (err.name === "NotReadableError") {
            msg = "Camera is in use by another app. Close it and try again, or type the code instead.";
          }
          els.scanStatus.textContent = msg;
        });
      }
      function closeScanner() {
        scannerOpen = false;
        stopScanCamera();
        els.scanOverlay.classList.add("hidden");
      }
      function fetchLeaderboard() {
        fetch("/leaderboard?n=10").then((r) => r.ok ? r.json() : []).then((rows) => {
          if (!Array.isArray(rows) || !rows.length) {
            els.leaderboard.innerHTML = '<div class="lb-row muted">No scores yet</div>';
            els.menuLeaderboard.innerHTML = '<div class="lb-row muted">No scores yet</div>';
            return;
          }
          const makeRow = (entry, i) => `<div class="lb-row"><span>${i + 1}. ${escapeHtml(entry.name)}</span><span>${entry.score | 0}</span></div>`;
          els.leaderboard.innerHTML = rows.slice(0, 5).map(makeRow).join("");
          els.menuLeaderboard.innerHTML = rows.slice(0, 10).map(makeRow).join("");
        }).catch(() => {
          els.leaderboard.innerHTML = '<div class="lb-row muted">Leaderboard unavailable</div>';
          els.menuLeaderboard.innerHTML = '<div class="lb-row muted">Leaderboard unavailable</div>';
        });
      }
      function setCustomizeFeedback(text, sticky = false) {
        els.customizeFeedback.textContent = text;
        if (presetFeedbackTimeout !== null) {
          clearTimeout(presetFeedbackTimeout);
          presetFeedbackTimeout = null;
        }
        if (!sticky) {
          presetFeedbackTimeout = setTimeout(() => {
            presetFeedbackTimeout = null;
            els.customizeFeedback.textContent = "Cosmetics are visual only. No effect on flight or damage.";
          }, 2200);
        }
      }
      function findActivePresetIndex() {
        return loadoutStore.presets.findIndex((preset) => sameLoadout(preset, selectedCosmetics));
      }
      function renderChipStrip(target, rows) {
        target.innerHTML = rows.map(
          (row) => `<span class="summary-chip"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></span>`
        ).join("");
      }
      function renderSummaryGrid(rows) {
        els.customizeSummaryGrid.innerHTML = rows.map(
          (row) => `<div class="summary-grid-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`
        ).join("");
      }
      function updateSelectedLoadout(next, feedback) {
        selectedCosmetics = cloneLoadout(next);
        loadoutStore.active = selectedCosmetics;
        persistLoadoutStore();
        renderLoadoutUI();
        if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(selectedCosmetics);
        if (feedback) setCustomizeFeedback(feedback);
      }
      function updateLoadoutField(key, value) {
        const next = cloneLoadout(selectedCosmetics);
        next[key] = value;
        updateSelectedLoadout(next);
      }
      function renderPresetGrid() {
        const activePreset = findActivePresetIndex();
        els.presetGrid.innerHTML = PRESET_SLOTS.map((slot) => {
          const preset = loadoutStore.presets[slot.index] || cloneLoadout(DEFAULT_LOADOUT);
          const summary = getLoadoutSummary(preset);
          const isActive = activePreset === slot.index;
          const swatches = [
            PAINT_OPTIONS[preset.color]?.swatch || "#ffffff",
            ACCENT_OPTIONS[preset.accent]?.swatch || "#ffffff",
            TRAIL_OPTIONS[preset.trail]?.swatch || "#ffffff"
          ];
          return `
      <article class="preset-card${isActive ? " is-active" : ""}">
        <div class="preset-card-head">
          <div>
            <p class="preset-label">${escapeHtml(slot.label)}</p>
            <h4>${escapeHtml(summary.title)}</h4>
          </div>
          <span class="preset-state">${isActive ? "Armed" : "Stored"}</span>
        </div>
        <p class="preset-copy">${escapeHtml(summary.subtitle)}</p>
        <div class="preset-swatch-row">${swatches.map((swatch) => `<span class="preset-swatch" style="--swatch:${swatch}"></span>`).join("")}</div>
        <div class="preset-actions">
          <button class="preset-apply-btn" data-slot="${slot.index}">APPLY</button>
          <button class="preset-save-btn secondary" data-slot="${slot.index}">SAVE</button>
        </div>
      </article>`;
        }).join("");
        els.presetGrid.querySelectorAll(".preset-apply-btn").forEach((button) => {
          button.addEventListener("click", () => {
            const slot = Number.parseInt(button.dataset.slot || "", 10);
            if (!Number.isFinite(slot) || !loadoutStore.presets[slot]) return;
            window.SFX.uiClick();
            updateSelectedLoadout(loadoutStore.presets[slot], `${PRESET_SLOTS[slot].label} armed.`);
          });
        });
        els.presetGrid.querySelectorAll(".preset-save-btn").forEach((button) => {
          button.addEventListener("click", () => {
            const slot = Number.parseInt(button.dataset.slot || "", 10);
            if (!Number.isFinite(slot) || !loadoutStore.presets[slot]) return;
            loadoutStore.presets[slot] = cloneLoadout(selectedCosmetics);
            persistLoadoutStore();
            renderLoadoutUI();
            window.SFX.uiClick();
            setCustomizeFeedback(`${PRESET_SLOTS[slot].label} saved.`);
          });
        });
      }
      function renderOptionGroup(target, key, options, variant) {
        target.innerHTML = options.map((option) => {
          const selected = selectedCosmetics[key] === option.value;
          if (variant === "swatches") {
            return `
        <button class="option-btn option-btn--swatch${selected ? " is-selected" : ""}" data-key="${key}" data-value="${option.value}" style="--swatch:${option.swatch || "#ffffff"}">
          <span class="option-swatch"></span>
          <span class="option-copy">
            <strong>${escapeHtml(option.label)}</strong>
            <span>${escapeHtml(option.note)}</span>
          </span>
        </button>`;
          }
          return `
      <button class="option-btn option-btn--card${selected ? " is-selected" : ""}" data-key="${key}" data-value="${option.value}">
        <strong>${escapeHtml(option.label)}</strong>
        <span>${escapeHtml(option.note)}</span>
      </button>`;
        }).join("");
        target.querySelectorAll(".option-btn").forEach((button) => {
          button.addEventListener("click", () => {
            const value = Number.parseInt(button.dataset.value || "", 10);
            if (!Number.isFinite(value)) return;
            window.SFX.uiClick();
            updateLoadoutField(key, value);
          });
        });
      }
      function renderLoadoutUI() {
        const summary = getLoadoutSummary(selectedCosmetics);
        const rows = getLoadoutDetailRows(selectedCosmetics);
        els.selectedPlaneName.textContent = summary.title;
        els.selectedPlaneSummary.textContent = summary.subtitle;
        els.playLoadoutSummary.textContent = `${summary.title} \xB7 ${rows.map((row) => row.value).join(" \xB7 ")}`;
        els.localLoadoutSummary.textContent = `${summary.title} \xB7 ${rows.map((row) => row.value).join(" \xB7 ")}`;
        els.lobbyPlaneSummary.textContent = `${summary.title} \xB7 ${rows.map((row) => row.value).join(" \xB7 ")}`;
        els.customizeSummaryName.textContent = summary.title;
        els.customizeSummaryText.textContent = summary.subtitle;
        renderChipStrip(els.selectedPlaneChips, rows);
        renderSummaryGrid(rows);
        renderPresetGrid();
        renderOptionGroup(els.customizeAirframe, "bodyShape", AIRFRAME_OPTIONS, "cards");
        renderOptionGroup(els.customizePaint, "color", PAINT_OPTIONS, "swatches");
        renderOptionGroup(els.customizeAccent, "accent", ACCENT_OPTIONS, "swatches");
        renderOptionGroup(els.customizeLivery, "livery", LIVERY_OPTIONS, "cards");
        renderOptionGroup(els.customizeTrail, "trail", TRAIL_OPTIONS, "swatches");
      }
      async function startGame(code, serverOrigin = null) {
        let roomCode = code;
        if (roomCode === "PUBLIC" && !botsEnabled) roomCode = "NOBOTS";
        if (roomCode.startsWith("P-")) {
          return joinP2PAsGuest(roomCode);
        }
        if (roomCode !== "PUBLIC" && roomCode !== "NOBOTS") {
          return joinLobby(roomCode, serverOrigin);
        }
        if (serverOrigin) {
          const normalized = normalizeServerOrigin(serverOrigin);
          if (!normalized) {
            setStatus("The selected server address is not valid.");
            return;
          }
          if (secureMismatch(normalized)) {
            setStatus("This HTTPS page cannot connect to that insecure LAN server. Open the game from the hotspot host address instead.");
            return;
          }
          serverOrigin = normalized;
          saveLanOrigin(serverOrigin);
          els.lanServer.value = toPageOrigin(serverOrigin);
        }
        window.SFX.unlock();
        enterImmersive();
        window.Renderer.startTakeoff && window.Renderer.startTakeoff();
        const name = (els.name.value || "Pilot").slice(0, 14);
        setStatus("Connecting\u2026");
        setBusy(true);
        try {
          await window.Net.connect(name, roomCode, selectedCosmetics, serverOrigin);
        } catch (e) {
          setStatus("Could not connect: " + (e && e.message ? e.message : e));
          setBusy(false);
          return;
        }
        prevPhase = "playing";
        prevHp = G.MAX_HP;
        wasAlive = true;
        deathTime = -1;
        applyMode("playing");
        els.respawn.classList.add("hidden");
        els.inter.classList.add("hidden");
        setStatus("");
        if (window.Input.isTouchDevice()) {
          els.touch.classList.remove("hidden");
          applyControlSchemeUI(window.Input.controlScheme);
        }
        if (!engineStarted) {
          window.SFX.startEngine();
          engineStarted = true;
        }
        if (window.SFX.stopMenuAmbient) window.SFX.stopMenuAmbient();
        window.SFX.startMusic();
        setInviteState(null, null);
        clearShareInvite();
        els.share.classList.add("hidden");
      }
      async function joinLobby(code, serverOrigin = null) {
        if (serverOrigin) {
          const normalized = normalizeServerOrigin(serverOrigin);
          if (!normalized) {
            setStatus("The selected server address is not valid.");
            return;
          }
          if (secureMismatch(normalized)) {
            setStatus("This HTTPS page cannot connect to that insecure LAN server. Open the game from the hotspot host address instead.");
            return;
          }
          serverOrigin = normalized;
          saveLanOrigin(serverOrigin);
          els.lanServer.value = toPageOrigin(serverOrigin);
        }
        window.SFX.unlock();
        enterImmersive();
        const name = (els.name.value || "Pilot").slice(0, 14);
        setStatus("Connecting\u2026");
        setBusy(true);
        try {
          await window.Net.connect(name, code, selectedCosmetics, serverOrigin);
        } catch (e) {
          setStatus("Could not connect: " + (e && e.message ? e.message : e));
          setBusy(false);
          return;
        }
        setStatus("");
        setBusy(false);
        currentLobbyCode = code;
        currentLobbyServer = serverOrigin;
        setInviteState(code, serverOrigin);
        updateShareInvite(code, serverOrigin);
        els.share.classList.remove("hidden");
        window.Net.onStateChange = onLobbyStateChange;
        els.lobbyTitle.textContent = `Room ${code}`;
        renderLobbyRoster();
        window.Net?.sendHostSettings?.({ botDifficulty });
        applyMode("lobby");
        const phase = window.Net.getPhase();
        if (phase === "playing") {
          window.Net.onStateChange = null;
          enterPlayingFromLobby();
        }
      }
      async function startP2PHost() {
        window.SFX.unlock();
        enterImmersive();
        const name = (els.name.value || "Pilot").slice(0, 14);
        const code = "P-" + genCode();
        if (!_isP2PSession) {
          _colyseusNet = window.Net;
        }
        const transport = new WebRtcTransport();
        window.Net = transport;
        _isP2PSession = true;
        transport.onKill = onKill;
        transport.onPickup = onPickup;
        transport.onDisconnect = onP2PDisconnect;
        setStatus("Starting P2P host\u2026");
        setBusy(true);
        try {
          await transport.startHost(name, code, selectedCosmetics);
        } catch (e) {
          setStatus("Could not start P2P host: " + (e && e.message ? e.message : e));
          setBusy(false);
          window.Net = _colyseusNet;
          _colyseusNet = null;
          _isP2PSession = false;
          return;
        }
        setStatus("");
        setBusy(false);
        currentLobbyCode = code;
        currentLobbyServer = null;
        const p2pUrl = buildP2PShareUrl(code);
        activeShareUrl = p2pUrl;
        els.shareLink.value = p2pUrl;
        els.shareQrLink.value = p2pUrl;
        els.shareQrRoom.textContent = `Room ${code}`;
        els.shareQrCode.textContent = code;
        els.shareQrNote.textContent = `Scan on the same Wi-Fi to join P2P room ${code}.`;
        els.copy.disabled = false;
        els.shareQrCopy.disabled = false;
        try {
          window.QR.render(els.shareQrCanvas, p2pUrl, {
            size: window.Input.isTouchDevice() ? 220 : 256,
            errorCorrectionLevel: "M"
          });
          els.qrBtn.disabled = false;
        } catch {
          els.qrBtn.disabled = true;
          els.shareQrCanvas.width = 0;
        }
        els.share.classList.remove("hidden");
        transport.onStateChange = onLobbyStateChange;
        els.lobbyTitle.textContent = `P2P Room ${code}`;
        renderLobbyRoster();
        window.Net?.sendHostSettings?.({ botDifficulty });
        applyMode("lobby");
      }
      function buildP2PShareUrl(code) {
        const url = new URL(location.pathname, location.origin);
        url.searchParams.set("p2p", code);
        return url.toString();
      }
      var LOCAL_ROOM_ADJECTIVES = ["Ace", "Bolt", "Cobalt", "Dusk", "Echo", "Flare", "Ghost", "Hyper", "Iron", "Jade", "Keen", "Laser", "Mach", "Nova", "Orbit", "Pixel", "Quick", "Red", "Solar", "Turbo", "Ultra", "Venom", "Wild", "Xenon", "Zero"];
      var LOCAL_ROOM_NOUNS = ["Arena", "Base", "Circuit", "Dome", "Engine", "Field", "Grid", "Haven", "Isle", "Junction", "Lair", "Mesa", "Nexus", "Orbit", "Peak", "Range", "Sector", "Tower", "Vault", "Wing", "Zone"];
      function randomLocalRoomName() {
        const adj = LOCAL_ROOM_ADJECTIVES[Math.floor(Math.random() * LOCAL_ROOM_ADJECTIVES.length)];
        const noun = LOCAL_ROOM_NOUNS[Math.floor(Math.random() * LOCAL_ROOM_NOUNS.length)];
        return `${adj} ${noun}`;
      }
      async function startLocalRoom() {
        window.SFX.unlock();
        enterImmersive();
        const name = (els.name.value || "Pilot").slice(0, 14);
        const code = "P-" + genCode();
        const roomName = (els.localRoomName.value.trim() || els.localRoomName.placeholder || randomLocalRoomName()).slice(0, 20);
        if (!_isP2PSession) {
          _colyseusNet = window.Net;
        }
        const transport = new WebRtcTransport();
        window.Net = transport;
        _isP2PSession = true;
        transport.onKill = onKill;
        transport.onPickup = onPickup;
        transport.onDisconnect = onP2PDisconnect;
        setStatus("Starting local room\u2026");
        setBusy(true);
        try {
          await transport.startHost(name, code, selectedCosmetics, { roomName, continuous: true });
        } catch (e) {
          setStatus("Could not start local room: " + (e && e.message ? e.message : e));
          setBusy(false);
          window.Net = _colyseusNet;
          _colyseusNet = null;
          _isP2PSession = false;
          return;
        }
        setStatus("");
        setBusy(false);
        currentLobbyCode = code;
        currentLobbyServer = null;
        const p2pUrl = buildP2PShareUrl(code);
        activeShareUrl = p2pUrl;
        els.shareLink.value = p2pUrl;
        els.shareQrLink.value = p2pUrl;
        els.shareQrRoom.textContent = roomName;
        els.shareQrCode.textContent = code;
        els.shareQrNote.textContent = `Scan on the same Wi-Fi to join "${roomName}".`;
        els.copy.disabled = false;
        els.shareQrCopy.disabled = false;
        try {
          window.QR.render(els.shareQrCanvas, p2pUrl, {
            size: window.Input.isTouchDevice() ? 220 : 256,
            errorCorrectionLevel: "M"
          });
          els.qrBtn.disabled = false;
        } catch {
          els.qrBtn.disabled = true;
          els.shareQrCanvas.width = 0;
        }
        els.share.classList.remove("hidden");
        els.lobbyTitle.textContent = roomName;
        transport.onStateChange = onLobbyStateChange;
        renderLobbyRoster();
        window.Net?.sendHostSettings?.({ botDifficulty });
        applyMode("lobby");
      }
      function stopLocalScanInterval() {
        if (_localScanInterval !== null) {
          clearInterval(_localScanInterval);
          _localScanInterval = null;
        }
      }
      async function runLocalScan() {
        els.localRoomList.innerHTML = '<article class="local-state-card"><p class="deck-label">Scanning hotspot</p><h4>Looking for active rooms</h4><p class="muted">Hosts on the same Wi-Fi appear here automatically.</p></article>';
        let rooms = [];
        try {
          rooms = await WebRtcTransport.listRooms();
        } catch {
          rooms = [];
        }
        if (!rooms.length) {
          els.localRoomList.innerHTML = '<article class="local-state-card"><p class="deck-label">No rooms found</p><h4>Nothing is broadcasting yet</h4><p class="muted">Ask the host to tap Create Room on the hotspot device, then scan again.</p></article><button class="local-rescan-btn secondary" id="local-rescan-btn">Re-scan</button>';
          const rescan2 = document.getElementById("local-rescan-btn");
          if (rescan2) rescan2.addEventListener("click", () => {
            window.SFX.uiClick();
            runLocalScan();
          });
          return;
        }
        els.localRoomList.innerHTML = rooms.map(
          (r) => `<div class="local-room-row" data-room="${escapeHtml(r.code)}" role="button" tabindex="0" aria-label="Join ${escapeHtml(r.name || r.code)}">
      <div class="local-room-row-info">
        <div class="local-room-row-head">
          <span class="local-room-row-name">${escapeHtml(r.name || r.code)}</span>
          <span class="local-room-tag">${r.count} pilot${r.count !== 1 ? "s" : ""}</span>
        </div>
        <span class="local-room-row-meta">Hosted by ${escapeHtml(r.hostName || "Unknown")} \xB7 Same hotspot</span>
      </div>
      <button class="local-room-join-btn" data-room="${escapeHtml(r.code)}">Join</button>
    </div>`
        ).join("") + '<button class="local-rescan-btn secondary" id="local-rescan-btn">Re-scan</button>';
        els.localRoomList.querySelectorAll(".local-room-row").forEach((row) => {
          const joinHandler = () => {
            const roomCode = row.dataset.room;
            if (!roomCode) return;
            const matchedRoom = rooms.find((r) => r.code === roomCode);
            const friendlyName = matchedRoom ? matchedRoom.name || roomCode : void 0;
            stopLocalScanInterval();
            window.SFX.uiClick();
            joinP2PAsGuest(roomCode, friendlyName);
          };
          row.addEventListener("click", joinHandler);
          row.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              joinHandler();
            }
          });
        });
        els.localRoomList.querySelectorAll(".local-room-join-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const roomCode = btn.dataset.room;
            if (!roomCode) return;
            const matchedRoom = rooms.find((r) => r.code === roomCode);
            const friendlyName = matchedRoom ? matchedRoom.name || roomCode : void 0;
            stopLocalScanInterval();
            window.SFX.uiClick();
            joinP2PAsGuest(roomCode, friendlyName);
          });
        });
        const rescan = document.getElementById("local-rescan-btn");
        if (rescan) rescan.addEventListener("click", () => {
          window.SFX.uiClick();
          runLocalScan();
        });
      }
      function startLocalScanWithAutoRefresh() {
        runLocalScan();
        stopLocalScanInterval();
        _localScanInterval = setInterval(() => {
          const lanScreen = document.getElementById(menuScreenElementId("lan"));
          if (!lanScreen || !lanScreen.classList.contains("active")) {
            stopLocalScanInterval();
            return;
          }
          runLocalScan();
        }, 3e3);
      }
      async function joinP2PAsGuest(code, friendlyName) {
        window.SFX.unlock();
        enterImmersive();
        const name = (els.name.value || "Pilot").slice(0, 14);
        if (!_isP2PSession) {
          _colyseusNet = window.Net;
        }
        const transport = new WebRtcTransport();
        window.Net = transport;
        _isP2PSession = true;
        transport.onKill = onKill;
        transport.onPickup = onPickup;
        transport.onDisconnect = onP2PDisconnect;
        setStatus("Connecting via P2P\u2026");
        setBusy(true);
        try {
          await transport.connect(name, code, selectedCosmetics, null);
        } catch (e) {
          setStatus("Could not connect (P2P): " + (e && e.message ? e.message : e));
          setBusy(false);
          window.Net = _colyseusNet;
          _colyseusNet = null;
          _isP2PSession = false;
          return;
        }
        setStatus("");
        setBusy(false);
        currentLobbyCode = code;
        currentLobbyServer = null;
        const p2pUrl = buildP2PShareUrl(code);
        activeShareUrl = p2pUrl;
        els.shareLink.value = p2pUrl;
        els.share.classList.remove("hidden");
        transport.onStateChange = onLobbyStateChange;
        els.lobbyTitle.textContent = friendlyName || `P2P Room ${code}`;
        renderLobbyRoster();
        applyMode("lobby");
        const phase = transport.getPhase();
        if (phase === "playing") {
          transport.onStateChange = null;
          enterPlayingFromLobby();
        }
      }
      function onP2PDisconnect(info) {
        if (info && info.type === "host-migrating") {
          if (window.SFX.suspend) window.SFX.suspend();
          els.p2pMigratingOverlay.classList.remove("hidden");
          return;
        }
        if (info && info.type === "migration-complete") {
          els.p2pMigratingOverlay.classList.add("hidden");
          if (window.SFX.resume) window.SFX.resume();
          return;
        }
        if (info && (info.type === "host-left" || info.type === "kicked")) {
          els.p2pMigratingOverlay.classList.add("hidden");
          if (window.SFX.suspend) window.SFX.suspend();
          showHostLeftOverlay();
          return;
        }
        onDisconnect(info);
      }
      function onLobbyStateChange() {
        const phase = window.Net.getPhase();
        if (mode === "lobby") {
          renderLobbyRoster();
          if (phase === "playing") {
            window.Net.onStateChange = null;
            enterPlayingFromLobby();
          }
        } else if (mode === "playing" || mode === "paused") {
        }
      }
      function loop(ts) {
        requestAnimationFrame(loop);
        let dt = (ts - last) / 1e3;
        last = ts;
        if (!isFinite(dt) || dt <= 0) return;
        dt = Math.min(dt, 0.05);
        const state = window.Net.state;
        syncSceneMode(state);
        if (mode === "playing" && state) {
          const myId = window.Net.sessionId;
          const input = window.Input.get();
          window.Net.sendInput(input.turn, input.climb, input.boost, input.fire);
          window.Net.stepLocal(dt);
          window.Quality.sample(dt);
          window.Renderer.sync(state, dt, myId);
          window.Renderer.draw(state, myId);
          updateHud(state, myId);
          const me = state.players.get(myId);
          if (me && engineStarted) {
            window.SFX.setEngine(me.boosting ? 1 : 0.5, !!me.boosting);
            const fireCd = G.FIRE_COOLDOWN * (me.power === "rapid" ? G.RAPID_FACTOR : 1);
            if (me.alive && input.fire && ts / 1e3 - lastFireSnd > fireCd) {
              window.SFX.fire();
              lastFireSnd = ts / 1e3;
            }
          }
        } else if (mode === "lobby" && state) {
          window.Renderer.draw(state, window.Net.sessionId);
        } else if (mode === "menu") {
          window.Renderer.drawMenu(dt, selectedCosmetics);
        } else if (state) {
          window.Renderer.draw(state, window.Net.sessionId);
        }
      }
      function updateHud(state, myId) {
        const me = state.players.get(myId);
        const local = window.Net.localPose;
        els.score.textContent = String(me ? me.score : 0);
        els.time.textContent = formatClock(state.timeLeft);
        const altitude = local && local.active ? local.p.y : me ? me.py : 0;
        const speed = local && local.active ? local.speed : me ? me.speed : 0;
        els.alt.textContent = String(Math.round(altitude));
        els.speed.textContent = String(Math.round(speed));
        const inputNow = window.Input.get();
        const isBoosting = inputNow.boost;
        const boostTarget = isBoosting ? 1 : 0;
        boostLevel += (boostTarget - boostLevel) * (isBoosting ? 0.18 : 0.08);
        boostLevel = Math.max(0, Math.min(1, boostLevel));
        els.boostFill.style.width = (boostLevel * 100).toFixed(1) + "%";
        const posX = local && local.active ? local.p.x : me ? me.px : 0;
        const posZ = local && local.active ? local.p.z : me ? me.pz : 0;
        const isOob = Math.abs(posX) > G.MAP_HALF - G.MAP_EDGE_SOFT || Math.abs(posZ) > G.MAP_HALF - G.MAP_EDGE_SOFT;
        const nowSec = performance.now() / 1e3;
        if (isOob && me && me.alive) {
          if (nowSec >= oobShownUntil) {
            els.oobWarning.classList.remove("hidden");
            oobShownUntil = nowSec + 2;
          }
        } else {
          els.oobWarning.classList.add("hidden");
          oobShownUntil = 0;
        }
        const isLowTime = state.phase === "playing" && state.timeLeft <= 10;
        els.time.classList.toggle("low", isLowTime);
        if (me) {
          els.healthfill.style.width = Math.max(0, me.hp / G.MAX_HP * 100) + "%";
          if (!me.alive) {
            if (wasAlive) {
              deathTime = performance.now() / 1e3;
              wasAlive = false;
            }
            const elapsed = performance.now() / 1e3 - deathTime;
            const remaining = Math.max(0, Math.ceil(G.RESPAWN_DELAY - elapsed));
            els.respawn.textContent = remaining > 0 ? `Shot down \u2014 respawning in ${remaining}\u2026` : "Shot down \u2014 respawning\u2026";
            els.respawn.classList.remove("hidden");
          } else {
            wasAlive = true;
            els.respawn.classList.add("hidden");
          }
          if (me.alive && me.hp < prevHp) {
            els.vignette.classList.add("hit");
            setTimeout(() => els.vignette.classList.remove("hit"), 120);
            window.SFX.hit();
          }
          els.vignette.classList.toggle("low", me.alive && me.hp > 0 && me.hp < 30);
          prevHp = me.hp;
          if (me.power && me.power !== "repair") {
            const info = G.POWERUPS[me.power] || { label: me.power, icon: "\u2605", color: 16777215 };
            const left = typeof me.powerLeft === "number" ? me.powerLeft : G.POWERUP_DURATION;
            const pct = Math.max(0, Math.min(100, left / G.POWERUP_DURATION * 100));
            const hex = "#" + info.color.toString(16).padStart(6, "0");
            els.powerChip.classList.remove("hidden");
            els.powerChip.innerHTML = `<span class="pc-label">${escapeHtml(info.icon)} ${escapeHtml(info.label)}</span><span class="pc-bar"><span class="pc-fill" style="width:${pct}%;background:${hex}"></span></span>`;
          } else {
            els.powerChip.classList.add("hidden");
          }
        }
        const isTdm = state.mode === "tdm";
        if (isTdm) {
          els.hudTeamScore.classList.remove("hidden");
          const ts0 = state.teamScore0 ?? 0;
          const ts1 = state.teamScore1 ?? 0;
          els.hudTScore0.textContent = String(ts0);
          els.hudTScore1.textContent = String(ts1);
          const myTeam = me ? me.team ?? -1 : -1;
          els.hudTeamBlue.classList.toggle("is-my-team", myTeam === 0);
          els.hudTeamRed.classList.toggle("is-my-team", myTeam === 1);
        } else {
          els.hudTeamScore.classList.add("hidden");
        }
        const list = [];
        state.players.forEach((p, id) => list.push({ id, name: p.name, score: p.score, bot: p.bot, team: p.team ?? -1 }));
        list.sort((a, b) => b.score - a.score);
        els.leaderboard.innerHTML = list.slice(0, 5).map((p, i) => {
          const teamDot = isTdm && p.team >= 0 ? `<span class="lb-team-dot" style="background:${p.team === 0 ? "#4aa3ff" : "#ff5a5a"}"></span>` : "";
          return `<div class="lb-row ${p.id === myId ? "me" : ""}"><span>${teamDot}${i + 1}. ${escapeHtml(p.name)}${p.bot ? " \u{1F916}" : ""}</span><span>${p.score}</span></div>`;
        }).join("");
        if (state.phase !== prevPhase) {
          if (state.phase === "intermission") {
            window.SFX.explosion();
          } else if (state.phase === "playing") {
            runCountdown();
          } else {
            window.SFX.go();
          }
          prevPhase = state.phase;
        }
        if (state.phase === "intermission") {
          els.inter.classList.remove("hidden");
          els.interTime.textContent = formatClock(state.timeLeft);
          if (isTdm) {
            const ts0 = state.teamScore0 ?? 0;
            const ts1 = state.teamScore1 ?? 0;
            const myTeam = me ? me.team ?? -1 : -1;
            const winTeam = ts0 > ts1 ? 0 : ts1 > ts0 ? 1 : -1;
            const winTeamName = winTeam === 0 ? "Blue" : winTeam === 1 ? "Red" : null;
            if (winTeam < 0) {
              els.winnerLine.textContent = "\u{1F3C6} Draw!";
            } else if (myTeam === winTeam) {
              els.winnerLine.textContent = `\u{1F3C6} ${winTeamName} team wins! (You're on it!)`;
            } else {
              els.winnerLine.textContent = `\u{1F3C6} ${winTeamName} team wins!`;
            }
          } else {
            const winner = list[0];
            els.winnerLine.textContent = winner ? winner.id === myId ? "\u{1F3C6} You win!" : `\u{1F3C6} ${winner.name} wins!` : "";
          }
          els.finalBoard.innerHTML = list.slice(0, 6).map((p, i) => {
            const teamDot = isTdm && p.team >= 0 ? `<span class="lb-team-dot" style="background:${p.team === 0 ? "#4aa3ff" : "#ff5a5a"}"></span>` : "";
            return `<li class="${p.id === myId ? "me" : ""}${i === 0 ? " win" : ""}"><span>${teamDot}${i + 1}. ${escapeHtml(p.name)}${p.bot ? " \u{1F916}" : ""}</span><span>${p.score}</span></li>`;
          }).join("");
          const myRank = list.findIndex((p) => p.id === myId);
          els.yourPlace.textContent = myRank >= 0 ? `You placed ${ordinal(myRank + 1)} of ${list.length}` : "";
        } else {
          els.inter.classList.add("hidden");
        }
      }
      function showCallout(text) {
        els.callout.textContent = text;
        els.callout.classList.remove("show");
        void els.callout.offsetWidth;
        els.callout.classList.add("show");
      }
      function runCountdown() {
        if (countdownActive) return;
        countdownActive = true;
        const steps = ["3", "2", "1", "GO!"];
        let i = 0;
        function showStep() {
          if (i >= steps.length) {
            countdownActive = false;
            els.countdown.classList.remove("pop", "go");
            els.countdown.textContent = "";
            return;
          }
          const label = steps[i];
          const isGo = label === "GO!";
          els.countdown.textContent = label;
          els.countdown.classList.toggle("go", isGo);
          els.countdown.classList.remove("pop");
          void els.countdown.offsetWidth;
          els.countdown.classList.add("pop");
          if (isGo) {
            try {
              window.SFX.go();
            } catch {
            }
          } else {
            try {
              window.SFX.uiClick && window.SFX.uiClick();
            } catch {
            }
          }
          i++;
          setTimeout(showStep, isGo ? 900 : 850);
        }
        showStep();
      }
      function streakName(streakSize) {
        return streakSize >= 6 ? "GODLIKE!" : streakSize >= 5 ? "UNSTOPPABLE!" : streakSize >= 4 ? "RAMPAGE!" : streakSize >= 3 ? "TRIPLE HIT!" : "DOUBLE HIT!";
      }
      function onKill(msg) {
        const myId = window.Net.sessionId;
        const mine = msg.killer === myId;
        const victimIsMe = msg.victim === myId;
        const row = document.createElement("div");
        row.className = "kill-msg" + (mine ? " mine" : "");
        row.innerHTML = `${escapeHtml(mine ? "You" : msg.killerName)} \u{1F4A5} <span class="vic">${escapeHtml(victimIsMe ? "You" : msg.victimName)}</span>`;
        els.killfeed.appendChild(row);
        setTimeout(() => row.remove(), 3600);
        while (els.killfeed.children.length > 5) els.killfeed.firstChild?.remove();
        window.Renderer.killPopup(msg.killer, mine);
        if (victimIsMe) window.SFX.explosion();
        if (mine) {
          window.SFX.kill();
          window.Renderer.hitStop(80);
          const now = performance.now() / 1e3;
          streak = now - lastKill < 3 ? streak + 1 : 1;
          lastKill = now;
          if (streak >= 2) showCallout(streakName(streak));
        }
      }
      function onPickup(msg) {
        if (!window.Net || msg.by !== window.Net.sessionId) return;
        window.SFX.pickup();
        const info = G.POWERUPS[msg.type];
        showCallout((info ? `${info.icon} ${info.label}` : "POWERUP") + "!");
      }
      function setupTouchButtons() {
        const bind = (el, key) => {
          let pid = -1;
          const down = (e) => {
            e.preventDefault();
            pid = e.pointerId;
            try {
              el.setPointerCapture(e.pointerId);
            } catch {
            }
            window.Input.touch[key] = true;
            el.classList.add("pressed");
            buzz(8);
          };
          const up = (e) => {
            if (e.pointerId !== pid) return;
            pid = -1;
            window.Input.touch[key] = false;
            el.classList.remove("pressed");
          };
          el.addEventListener("pointerdown", down);
          el.addEventListener("pointerup", up);
          el.addEventListener("pointercancel", up);
        };
        bind(els.left, "left");
        bind(els.right, "right");
        bind(els.climb, "climb");
        bind(els.dive, "dive");
        bind(els.boost, "boost");
        bind(els.fire, "fire");
        const joystickBase = document.getElementById("joystick-base");
        const joystickThumb = document.getElementById("joystick-thumb");
        if (joystickBase && joystickThumb) {
          window.Input.attachJoystick(joystickBase, joystickThumb);
        }
        const tiltCalBtn = document.getElementById("tilt-cal-btn");
        if (tiltCalBtn) {
          tiltCalBtn.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            window.Input.calibrateTilt();
            buzz(20);
            tiltCalBtn.classList.add("pressed");
            setTimeout(() => tiltCalBtn.classList.remove("pressed"), 120);
          });
        }
      }
      function applyControlSchemeUI(scheme) {
        const dpadLeft = document.getElementById("dpad-left");
        const joystickLeft = document.getElementById("joystick-left");
        const tiltLeft = document.getElementById("tilt-left");
        if (dpadLeft) dpadLeft.classList.toggle("hidden", scheme !== "dpad");
        if (joystickLeft) joystickLeft.classList.toggle("hidden", scheme !== "joystick");
        if (tiltLeft) tiltLeft.classList.toggle("hidden", scheme !== "tilt");
      }
      function togglePause() {
        if (mode === "playing") {
          applyMode("paused");
          window.Net.sendInput(0, 0, false, false);
          window.SFX.setEngine(0, false);
          if (activeShareUrl || els.shareLink.value) {
            els.pauseInviteBtn.classList.remove("hidden");
          } else {
            els.pauseInviteBtn.classList.add("hidden");
          }
        } else if (mode === "paused") {
          applyMode("playing");
        }
      }
      function toggleMute() {
        const muted = window.SFX.toggleMute();
        els.mute.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
      }
      function resetToMenu() {
        window.Net.onStateChange = null;
        currentLobbyCode = null;
        currentLobbyServer = null;
        els.p2pMigratingOverlay.classList.add("hidden");
        try {
          window.Net.leave();
        } catch {
        }
        if (_isP2PSession && _colyseusNet !== null) {
          window.Net = _colyseusNet;
          _colyseusNet = null;
          _isP2PSession = false;
          window.Net.onKill = onKill;
          window.Net.onPickup = onPickup;
          window.Net.onDisconnect = onDisconnect;
        }
        if (window.SFX.stopLoops) window.SFX.stopLoops();
        if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient();
        engineStarted = false;
        try {
          const so = screen.orientation;
          if (so && so.unlock) so.unlock();
        } catch {
        }
        wasAlive = true;
        deathTime = -1;
        countdownActive = false;
        boostLevel = 0;
        oobShownUntil = 0;
        els.countdown.classList.remove("pop", "go");
        els.countdown.textContent = "";
        els.time.classList.remove("low");
        applyMode("menu");
        els.touch.classList.add("hidden");
        els.share.classList.add("hidden");
        els.inter.classList.add("hidden");
        els.respawn.classList.add("hidden");
        els.powerChip.classList.add("hidden");
        els.lobbyTitle.textContent = "Private Room";
        els.lobbyRoster.innerHTML = '<p class="muted">Waiting for players\u2026</p>';
        els.lobbySettings.classList.add("hidden");
        els.lobbyRoomName.value = "";
        els.lobbyRoundLength.value = "150";
        els.lobbyBotsCheck.checked = false;
        els.lobbyMode.value = "ffa";
        els.hudTeamScore.classList.add("hidden");
        hideSettings();
        closeJoinCode();
        navReset();
        closeScanner();
        stopLocalScanInterval();
        hideShareQr();
        clearShareInvite();
        setBusy(false);
        fetchLeaderboard();
        setStatus("");
        updateMenuMeta(false);
        updateRotateOverlay();
      }
      function onDisconnect(_info) {
        if (mode === "menu" || mode === "lost") return;
        if (window.SFX.suspend) window.SFX.suspend();
        els.connMsg.textContent = "Reconnecting\u2026";
        els.connRetry.classList.add("hidden");
        applyMode("lost");
        window.Net.tryReconnect().then((ok) => {
          if (mode !== "lost") return;
          if (ok) {
            if (window.SFX.resume) window.SFX.resume();
            const phase = window.Net.getPhase();
            if (phase === "lobby") {
              window.Net.onStateChange = onLobbyStateChange;
              renderLobbyRoster();
              applyMode("lobby");
            } else {
              applyMode("playing");
            }
          } else {
            els.connMsg.textContent = "Couldn't reconnect.";
            els.connRetry.classList.remove("hidden");
          }
        });
      }
      function enterImmersive() {
        if (!window.Input.isTouchDevice()) {
          updateRotateOverlay();
          return;
        }
        const root = document.documentElement;
        const request = root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen;
        if (request) {
          try {
            const res = request.call(root);
            if (res && res.catch) res.catch(() => {
            });
          } catch {
          }
        }
        try {
          const so = screen.orientation;
          if (so && so.lock) {
            so.lock("landscape").catch(() => {
            });
          }
        } catch {
        }
        updateRotateOverlay();
      }
      function updateRotateOverlay() {
        const portrait = window.matchMedia && window.matchMedia("(orientation: portrait)").matches;
        const show = window.Input.isTouchDevice() && portrait;
        els.rotate.classList.toggle("show", !!show);
        updateMenuMeta(true);
      }
      function init() {
        readInviteFromUrl();
        primeLanInput();
        window.Renderer.init(els.canvas);
        window.Input.attach();
        loadInputPrefs();
        window.Assets.load();
        window.Net.onKill = onKill;
        window.Net.onPickup = onPickup;
        window.Net.onDisconnect = onDisconnect;
        els.bots.checked = botsEnabled;
        els.bots.addEventListener("change", () => {
          botsEnabled = els.bots.checked;
          try {
            localStorage.setItem("smashcart.bots", botsEnabled ? "1" : "0");
          } catch {
          }
          window.SFX.uiClick();
        });
        renderLoadoutUI();
        persistLoadoutStore();
        fetchLeaderboard();
        setupTouchButtons();
        updateRotateOverlay();
        updateMenuMeta(false);
        clearShareInvite();
        if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient();
        if (window.Input.isTouchDevice()) document.body.classList.add("touch-device");
        els.localRoomName.placeholder = randomLocalRoomName();
        els.localRoomName.value = "";
        menuRoot.querySelectorAll(menuNavSelector).forEach((el) => {
          el.addEventListener("click", () => {
            const target = useArcadeMenu ? el.dataset.arcadeNav : el.dataset.nav;
            if (!target) return;
            window.SFX.uiClick();
            navGo(target);
          });
        });
        menuRoot.querySelectorAll(menuBackSelector).forEach((el) => {
          el.addEventListener("click", () => {
            window.SFX.uiClick();
            navBack();
          });
        });
        const initialHashScreen = location.hash.replace(/^#/, "").toLowerCase();
        if (MENU_SCREENS.includes(initialHashScreen)) {
          navStack = [initialHashScreen];
          navShow(initialHashScreen);
        } else {
          navReset();
        }
        els.ingameMenuBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          togglePause();
        });
        els.pauseInviteBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          showShareQr();
        });
        els.p2pOfflineBtn.addEventListener("click", async () => {
          window.SFX.uiClick();
          if (!_isP2PSession) {
            await startP2PHost();
          }
          els.p2pOfflineSection.classList.remove("hidden");
          const transport = window.Net;
          if (typeof transport.startOfflineQrOffer === "function") {
            try {
              await transport.startOfflineQrOffer(els.p2pOfflineCanvas);
            } catch (e) {
              setStatus(e && e.message ? e.message : "Offline QR error");
            }
          }
        });
        els.p2pAnswerSubmit.addEventListener("click", async () => {
          const val = els.p2pAnswerInput.value.trim();
          if (!val) return;
          window.SFX.uiClick();
          const transport = window.Net;
          if (typeof transport.finishOfflineQrOffer === "function") {
            try {
              await transport.finishOfflineQrOffer(val);
              setStatus("Offline P2P connected!");
            } catch (e) {
              setStatus("Offline answer error: " + (e && e.message ? e.message : e));
            }
          }
        });
        els.hostLeftMenuBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          resetToMenu();
        });
        els.localCreateBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          startLocalRoom();
        });
        els.localRoomName.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            window.SFX.uiClick();
            startLocalRoom();
          }
        });
        els.localScanBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          startLocalScanWithAutoRefresh();
        });
        els.lanQuick.addEventListener("click", () => {
          window.SFX.uiClick();
          const origin = resolveLanOrigin();
          if (origin) startGame("PUBLIC", origin);
        });
        els.lanFriends.addEventListener("click", () => {
          window.SFX.uiClick();
          const origin = resolveLanOrigin();
          if (origin) startGame(genCode(), origin);
        });
        try {
          const savedName = localStorage.getItem("smashcart.name");
          if (savedName) els.name.value = savedName;
        } catch {
        }
        els.name.addEventListener("change", () => {
          try {
            localStorage.setItem("smashcart.name", els.name.value);
          } catch {
          }
        });
        els.name.addEventListener("blur", () => {
          try {
            localStorage.setItem("smashcart.name", els.name.value);
          } catch {
          }
        });
        els.name.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            try {
              localStorage.setItem("smashcart.name", els.name.value);
            } catch {
            }
            navGo("play");
          }
        });
        els.lanServer.addEventListener("input", () => updateMenuMeta(true));
        els.lanServer.addEventListener("blur", () => commitLanInput());
        els.lanServer.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitLanInput();
            const origin = resolveLanOrigin();
            if (origin) startGame(inviteRoom || "PUBLIC", origin);
          }
        });
        els.qrBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          showShareQr();
        });
        els.copy.addEventListener("click", async () => {
          const copied = await copyShareLink();
          if (copied) {
            els.copy.textContent = "Copied!";
            setTimeout(() => els.copy.textContent = "Copy", 1200);
          }
        });
        els.shareQrCopy.addEventListener("click", async () => {
          const copied = await copyShareLink();
          if (copied) {
            els.shareQrCopy.textContent = "Copied!";
            setTimeout(() => els.shareQrCopy.textContent = "Copy Link", 1200);
          }
        });
        els.shareQrClose.addEventListener("click", () => hideShareQr());
        els.shareQrOverlay.addEventListener("click", (e) => {
          if (e.target === els.shareQrOverlay) hideShareQr();
        });
        els.mute.addEventListener("click", () => toggleMute());
        els.resume.addEventListener("click", () => togglePause());
        els.pauseMenu.addEventListener("click", () => resetToMenu());
        els.connMenu.addEventListener("click", () => resetToMenu());
        els.connRetry.addEventListener("click", () => {
          els.connMsg.textContent = "Reconnecting\u2026";
          els.connRetry.classList.add("hidden");
          window.Net.tryReconnect().then((ok) => {
            if (ok) {
              if (window.SFX.resume) window.SFX.resume();
              const phase = window.Net.getPhase();
              if (phase === "lobby") {
                window.Net.onStateChange = onLobbyStateChange;
                renderLobbyRoster();
                applyMode("lobby");
              } else {
                applyMode("playing");
              }
            } else {
              els.connMsg.textContent = "Still down.";
              els.connRetry.classList.remove("hidden");
            }
          });
        });
        window.Input.onPause = () => {
          if (mode !== "menu") togglePause();
        };
        window.Input.onMute = () => toggleMute();
        els.menuSettingsBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          showSettings();
        });
        els.pauseSettings.addEventListener("click", () => {
          window.SFX.uiClick();
          showSettings();
        });
        els.settingsCloseBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          hideSettings();
        });
        els.settingsCloseBtn2.addEventListener("click", () => {
          window.SFX.uiClick();
          hideSettings();
        });
        els.settingsScreen.addEventListener("click", (e) => {
          if (e.target === els.settingsScreen) hideSettings();
        });
        els.quickPlayBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          startGame("PUBLIC");
        });
        els.privateRoomBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          startGame(genCode());
        });
        els.customizeRandomize.addEventListener("click", () => {
          window.SFX.uiClick();
          updateSelectedLoadout(randomizeLoadout(), "Random loadout armed.");
        });
        els.customizeReset.addEventListener("click", () => {
          window.SFX.uiClick();
          updateSelectedLoadout(DEFAULT_LOADOUT, "Loadout reset to deck default.");
        });
        const volMasterEl = document.getElementById("set-vol-master");
        const volSfxEl = document.getElementById("set-vol-sfx");
        const volMusicEl = document.getElementById("set-vol-music");
        if (volMasterEl) {
          volMasterEl.addEventListener("input", () => {
            window.SFX.setMaster(parseFloat(volMasterEl.value));
          });
        }
        if (volSfxEl) {
          volSfxEl.addEventListener("input", () => {
            window.SFX.setSfx(parseFloat(volSfxEl.value));
          });
        }
        if (volMusicEl) {
          volMusicEl.addEventListener("input", () => {
            window.SFX.setMusic(parseFloat(volMusicEl.value));
          });
        }
        function applyQualityChoice(value) {
          if (value === "auto") {
            window.Quality._auto = true;
            try {
              localStorage.removeItem("smashcart.quality");
            } catch {
            }
          } else {
            window.Quality.set(value, true);
          }
        }
        const qualitySelect = document.getElementById("set-quality");
        if (qualitySelect && qualitySelect.tagName === "SELECT") {
          qualitySelect.addEventListener("change", () => {
            window.SFX.uiClick();
            applyQualityChoice(qualitySelect.value);
          });
        } else {
          document.querySelectorAll('input[name="set-quality"]').forEach((r) => {
            r.addEventListener("change", () => {
              if (r.checked) {
                window.SFX.uiClick();
                applyQualityChoice(r.value);
              }
            });
          });
        }
        const invertPitchEl = document.getElementById("set-invert-pitch");
        const invertSteerEl = document.getElementById("set-invert-steer");
        if (invertPitchEl) {
          invertPitchEl.addEventListener("change", () => {
            window.Input.invertPitch = invertPitchEl.checked;
            try {
              localStorage.setItem("smashcart.invertPitch", invertPitchEl.checked ? "1" : "0");
            } catch {
            }
          });
        }
        if (invertSteerEl) {
          invertSteerEl.addEventListener("change", () => {
            window.Input.invertSteer = invertSteerEl.checked;
            try {
              localStorage.setItem("smashcart.invertSteer", invertSteerEl.checked ? "1" : "0");
            } catch {
            }
          });
        }
        document.querySelectorAll('input[name="difficulty"]').forEach((r) => {
          r.checked = r.value === botDifficulty;
        });
        document.querySelectorAll('input[name="difficulty"]').forEach((r) => {
          r.addEventListener("change", () => {
            if (!r.checked) return;
            const val = r.value;
            botDifficulty = val;
            try {
              localStorage.setItem("smashcart.difficulty", val);
            } catch {
            }
            window.Net?.sendHostSettings?.({ botDifficulty: val });
          });
        });
        try {
          const saved = localStorage.getItem("smashcart.controls");
          if (saved === "joystick" || saved === "tilt" || saved === "dpad") {
            window.Input.controlScheme = saved;
          }
        } catch {
        }
        const schemeRadios = document.querySelectorAll('input[name="ctrl-scheme"]');
        schemeRadios.forEach((r) => {
          r.addEventListener("change", () => {
            if (!r.checked) return;
            const scheme = r.value;
            window.SFX.uiClick();
            if (scheme === "tilt") {
              window.Input.attachTilt();
              const DevOri = DeviceOrientationEvent;
              if (typeof DevOri.requestPermission !== "function") {
                window.Input.setControlScheme("tilt");
                applyControlSchemeUI("tilt");
              }
            } else {
              window.Input.setControlScheme(scheme);
              applyControlSchemeUI(scheme);
            }
          });
        });
        window.Input.onSchemeChange = (scheme, msg) => {
          applyControlSchemeUI(scheme);
          schemeRadios.forEach((r) => {
            r.checked = r.value === scheme;
          });
          const tiltMsg = document.getElementById("tilt-status-msg");
          if (tiltMsg) {
            if (msg) {
              tiltMsg.textContent = msg;
              tiltMsg.classList.remove("hidden");
              setTimeout(() => tiltMsg.classList.add("hidden"), 4e3);
            } else {
              tiltMsg.classList.add("hidden");
            }
          }
        };
        applyControlSchemeUI(window.Input.controlScheme);
        els.scanOpenBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          openScanner();
        });
        els.scanCloseBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          closeScanner();
        });
        els.scanOverlay.addEventListener("click", (e) => {
          if (e.target === els.scanOverlay) closeScanner();
        });
        els.joinCodeInput.addEventListener("input", () => {
          const cur = els.joinCodeInput.value;
          if (cur.length <= 6 && !/[:/.]/.test(cur)) {
            const upper = cur.toUpperCase().replace(/[^A-Z0-9]/g, "");
            if (cur !== upper) {
              const sel = els.joinCodeInput.selectionStart ?? upper.length;
              els.joinCodeInput.value = upper;
              els.joinCodeInput.setSelectionRange(sel, sel);
            }
          }
        });
        function resolveJoinInput() {
          const raw = els.joinCodeInput.value.trim();
          if (!raw) return null;
          try {
            const url = new URL(raw);
            const p2p = url.searchParams.get("p2p");
            if (p2p) return p2p.trim().toUpperCase().slice(0, 6);
            const room = url.searchParams.get("room");
            if (room) return room.trim().toUpperCase().slice(0, 6);
            const code = url.searchParams.get("code");
            if (code) return code.trim().toUpperCase().slice(0, 6);
          } catch {
          }
          return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || null;
        }
        els.joinCodeSubmit.addEventListener("click", () => {
          const code = resolveJoinInput();
          if (!code) return;
          window.SFX.uiClick();
          startGame(code, null);
        });
        els.joinCodeInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const code = resolveJoinInput();
            if (!code) return;
            window.SFX.uiClick();
            startGame(code, null);
          }
        });
        els.interLeave.addEventListener("click", () => {
          window.SFX.uiClick();
          resetToMenu();
        });
        els.lobbyLeaveBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          window.Net.onStateChange = null;
          resetToMenu();
        });
        els.lobbyReadyBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          window.Net.sendReady();
        });
        els.lobbyStartBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          window.Net.sendHostStart();
        });
        els.lobbyRoomName.addEventListener("input", () => {
          if (_settingsDebounce !== null) clearTimeout(_settingsDebounce);
          _settingsDebounce = setTimeout(() => {
            _settingsDebounce = null;
            window.Net.sendHostSettings({ roomName: els.lobbyRoomName.value });
          }, 400);
        });
        els.lobbyRoundLength.addEventListener("change", () => {
          const v = parseInt(els.lobbyRoundLength.value, 10);
          if (Number.isFinite(v)) window.Net.sendHostSettings({ roundLength: v });
        });
        els.lobbyBotsCheck.addEventListener("change", () => {
          window.Net.sendHostSettings({ botsInRoom: els.lobbyBotsCheck.checked, botDifficulty });
        });
        els.lobbyMode.addEventListener("change", () => {
          window.Net.sendHostSettings({ mode: els.lobbyMode.value });
        });
        document.addEventListener("visibilitychange", () => {
          if (document.hidden) {
            if (window.Net.state) window.Net.sendInput(0, 0, false, false);
            if (window.SFX.suspend) window.SFX.suspend();
            closeScanner();
            hideShareQr();
          } else if (mode === "playing" && window.SFX.resume) {
            window.SFX.resume();
          }
        });
        window.addEventListener("orientationchange", updateRotateOverlay);
        window.addEventListener("resize", updateRotateOverlay);
        try {
          const portraitMq = window.matchMedia("(orientation: portrait)");
          const mqHandler = () => updateRotateOverlay();
          if (portraitMq.addEventListener) portraitMq.addEventListener("change", mqHandler);
          else if (portraitMq.addListener) portraitMq.addListener(mqHandler);
        } catch {
        }
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            if (scannerOpen) {
              closeScanner();
              return;
            }
            if (!els.shareQrOverlay.classList.contains("hidden")) {
              hideShareQr();
              return;
            }
            if (settingsOpen) {
              hideSettings();
              return;
            }
            if (mode === "menu" && navStack.length > 1) {
              navBack();
              return;
            }
          }
        });
        els.bootOverlay.classList.add("fade-out");
        setTimeout(() => els.bootOverlay.classList.add("hidden"), 450);
        const _offlineAnswerParam = new URLSearchParams(location.search).get("offline-answer");
        if (_offlineAnswerParam) {
          (async () => {
            if (!_isP2PSession) {
              _colyseusNet = window.Net;
            }
            const transport = new WebRtcTransport();
            window.Net = transport;
            _isP2PSession = true;
            transport.onKill = onKill;
            transport.onPickup = onPickup;
            transport.onDisconnect = onP2PDisconnect;
            els.p2pOfflineSection.classList.remove("hidden");
            try {
              await transport.startOfflineQrAnswer(_offlineAnswerParam, els.p2pOfflineCanvas);
              setStatus("Scan the QR with the host's phone, or paste the text to the host.");
            } catch (e) {
              setStatus("Offline QR guest error: " + (e && e.message ? e.message : e));
            }
          })();
        }
        requestAnimationFrame((t) => {
          last = t;
          loop(t);
        });
      }
      window.addEventListener("DOMContentLoaded", init);
      window.addEventListener("error", (e) => {
        if (mode !== "menu" && mode !== "lobby" && mode !== "playing" && mode !== "paused") {
          showFatal(e.message || "An unexpected error occurred.");
        }
      });
      window.addEventListener("unhandledrejection", (e) => {
        if (mode !== "menu" && mode !== "lobby" && mode !== "playing" && mode !== "paused") {
          const msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
          showFatal(msg || "An unexpected error occurred.");
        }
      });
    }
  });
  require_main();
})();
