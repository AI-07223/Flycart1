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
  var TICK_RATE, TICK_MS, CRUISE_SPEED, BOOST_SPEED, ACCEL, TURN_RATE, PITCH_RATE, PITCH_MAX, PLANE_RADIUS, MAX_HP, BULLET_SPEED, BULLET_DAMAGE, BULLET_LIFE, BULLET_RADIUS, FIRE_COOLDOWN, RESPAWN_DELAY, ROUND_SECONDS, ROUND_INTERMISSION, MIN_PLAYERS, MAP_HALF, MAP_EDGE_SOFT, GROUND_Y, MIN_ALT, SPAWN_ALT, MAX_ALT, PICKUP_ALT_MIN, PICKUP_ALT_MAX, PICKUP_FIELD_RADIUS, SPAWN_REROLL, BOT_NAMES, COLOR_COUNT, ACCENT_COUNT, TRAIL_COUNT, LIVERY_COUNT, SKIN_COUNT, PICKUP_MAX, PICKUP_INTERVAL, PICKUP_RADIUS, POWERUP_DURATION, SHIELD_CHARGES, RAPID_FACTOR, SPREAD_ANGLE, AFTERBURNER_FACTOR, HOMING_TURN, POWERUP_TYPES, POWERUP_WEIGHTS, SPAWN_INVULN, LOBBY_READY_TIMEOUT, LANDMARKS;
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
      BULLET_SPEED = 215;
      BULLET_DAMAGE = 25;
      BULLET_LIFE = 2.1;
      BULLET_RADIUS = 4;
      FIRE_COOLDOWN = 0.34;
      RESPAWN_DELAY = 2.5;
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
      PICKUP_MAX = 6;
      PICKUP_INTERVAL = 5.5;
      PICKUP_RADIUS = 24;
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
          if (this.isPublic) {
            this.phase = "playing";
            this.timeLeft = ROUND_SECONDS;
          } else {
            this.phase = "lobby";
            this.timeLeft = 0;
            this.lobbyElapsed = 0;
          }
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
            livery: opts.livery
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
            botsInRoom: this.botsInRoom
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
            botsInRoom: this.botsInRoom
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
                const hitDist = PLANE_RADIUS + BULLET_RADIUS;
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
          if (killer && killerId !== victimId) killer.score += 1;
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
            livery: Math.floor(Math.random() * LIVERY_COUNT)
          };
          this.spawn(id, p);
          this.players.set(id, p);
          this.inputs.set(id, { ...ZERO_INPUT });
          this.bots.set(id, { targetId: null, retargetAt: 0, wanderYaw: rand(-1, 1) });
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
            brain.retargetAt = this.now + rand(0.6, 1.2);
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
            const leadTime = distance(myPos, targetPos) / Math.max(BULLET_SPEED, 1) * 0.8;
            const leadPos = add(targetPos, scale(getF(target), target.speed * leadTime));
            desired = normalize(sub(leadPos, myPos));
            if (me.hp < 35 && distance(myPos, targetPos) < 340) {
              desired = normalize(add(sub(myPos, targetPos), scale(normalizeHorizontal({ x: -myPos.x, y: 0, z: -myPos.z }), 0.6)));
              boost = true;
            }
            const aim = Math.abs(signedYaw(myFwd, desired));
            const altDelta = targetPos.y - myPos.y;
            fire = aim < 0.15 && Math.abs(altDelta) < 70 && distance(myPos, targetPos) < 560;
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
  var DT_MAX, STATE_HZ, INPUT_HZ, SNAP_BUFFER_MS, MAX_EXTRAP_MS, SNAP_DISTANCE, MAX_GUESTS, ICE_SERVER, StableMap, GuestTransportState, HostTransportState, SignalSocket, WebRtcTransport;
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
      };
      SignalSocket = class {
        constructor() {
          this.ws = null;
          this.queue = [];
          this.onMessage = null;
          this.onClose = null;
        }
        open(room, role, peerId) {
          return new Promise((resolve, reject) => {
            const proto = location.protocol === "https:" ? "wss" : "ws";
            const url = `${proto}://${location.host}/signal`;
            const ws = new WebSocket(url);
            this.ws = ws;
            ws.onopen = () => {
              if (role === "host") {
                this.send({ type: "host", room });
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
         * `name` = player name, `code` = P- room code (with prefix),
         * `cosmetics` = selected cosmetics.
         * Returns immediately (no async needed; signaling is fire-and-forget).
         */
        async startHost(name, code, cosmetics) {
          this._isHost = true;
          this._room = code;
          this.sessionId = "host";
          const sim = new GameSim({
            botsEnabled: false,
            isPublic: false,
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
          const sig = this._signal;
          if (msg.type === "peer-joined") {
            const peerId = msg.peerId;
            if (this._peers.size >= MAX_GUESTS) return;
            const pc = makePeerConnection([{ urls: ICE_SERVER }]);
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
              if (!this._sim.players.has(peerId)) {
                this._sim.addPlayer(peerId, {
                  name: msg.name || "Pilot",
                  skin: msg.skin || 0,
                  bodyShape: msg.bodyShape || 0,
                  accent: msg.accent || 0,
                  trail: msg.trail || 0,
                  livery: msg.livery || 0
                });
                const peer = this._peers.get(peerId);
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
                botsInRoom: typeof msg.botsInRoom === "boolean" ? msg.botsInRoom : void 0
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
          const sig = new SignalSocket();
          this._signal = sig;
          const pc = makePeerConnection([{ urls: ICE_SERVER }]);
          this._guestPc = pc;
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
              if (this.onDisconnect) this.onDisconnect({ type: "leave", code: 1001 });
            }
          };
          sig.onMessage = async (msg) => {
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
            }
          };
          await sig.open(code, "join", peerId);
          await new Promise((resolve, reject) => {
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
          if (this._guestEventCh?.readyState === "open") {
            this._guestEventCh.send(JSON.stringify({
              type: "join",
              name,
              skin: cosmetics.color,
              bodyShape: cosmetics.bodyShape,
              accent: cosmetics.accent,
              trail: cosmetics.trail,
              livery: cosmetics.livery
            }));
          }
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
            gs.players.mergeFrom(snap.players);
            gs.bullets.mergeFrom(snap.bullets);
            gs.pickups.mergeFrom(snap.pickups);
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

  // src/client/main.ts
  var require_main = __commonJS({
    "src/client/main.ts"() {
      init_host_sim();
      var dollar = (id) => document.getElementById(id);
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
        start: dollar("start-screen"),
        name: dollar("name-input"),
        quick: dollar("quickplay-btn"),
        friends: dollar("friends-btn"),
        lanServer: dollar("lan-server-input"),
        lanQuick: dollar("lan-quick-btn"),
        lanFriends: dollar("lan-friends-btn"),
        lanHint: dollar("lan-hint"),
        serverBadge: dollar("menu-server-badge"),
        roomChip: dollar("room-code-chip"),
        orientationNote: dollar("orientation-note"),
        friendsNote: dollar("friends-note"),
        status: dollar("status"),
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
        scanOpenBtn: dollar("scan-open-btn"),
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
        bots: dollar("bots-check"),
        countdown: dollar("countdown"),
        interLeave: dollar("intermission-leave"),
        // P2P additions
        p2pHostBtn: dollar("p2p-host-btn"),
        p2pOfflineBtn: dollar("p2p-offline-btn"),
        p2pOfflineCanvas: dollar("p2p-offline-canvas"),
        p2pAnswerInput: dollar("p2p-answer-input"),
        p2pAnswerSubmit: dollar("p2p-answer-submit"),
        p2pOfflineSection: dollar("p2p-offline-section"),
        hostLeftOverlay: dollar("host-left-overlay"),
        hostLeftMenuBtn: dollar("host-left-menu-btn"),
        // Slice 1 additions
        bootOverlay: dollar("boot-overlay"),
        fatalOverlay: dollar("fatal-overlay"),
        fatalMsg: dollar("fatal-msg"),
        lobbyScreen: dollar("lobby-screen"),
        lobbyTitle: dollar("lobby-title"),
        lobbySettings: dollar("lobby-settings"),
        lobbyRoomName: dollar("lobby-room-name"),
        lobbyRoundLength: dollar("lobby-round-length"),
        lobbyBotsCheck: dollar("lobby-bots-check"),
        lobbyRoster: dollar("lobby-roster"),
        lobbyReadyBtn: dollar("lobby-ready-btn"),
        lobbyStartBtn: dollar("lobby-start-btn"),
        lobbyLeaveBtn: dollar("lobby-leave-btn"),
        settingsScreen: dollar("settings-screen"),
        settingsCloseBtn: dollar("settings-close-btn"),
        settingsCloseBtn2: dollar("settings-close-btn2"),
        menuSettingsBtn: dollar("menu-settings-btn"),
        joinCodeModal: dollar("join-code-modal"),
        joinCodeInput: dollar("join-code-input"),
        joinCodeSubmit: dollar("join-code-submit"),
        joinCodeCancel: dollar("join-code-cancel"),
        joinCodeOpenBtn: dollar("join-code-open-btn"),
        menuLeaderboard: dollar("menu-leaderboard"),
        hangarOverlay: dollar("hangar-overlay"),
        hangarBtn: dollar("hangar-btn"),
        hangarCloseBtn: dollar("hangar-close-btn"),
        hangarDone: dollar("hangar-done")
      };
      var mode = "menu";
      var settingsOpen = false;
      var joinCodeOpen = false;
      var hangarOpen = false;
      var last = 0;
      var prevPhase = "playing";
      var prevHp = G.MAX_HP;
      var streak = 0;
      var lastKill = 0;
      var lastFireSnd = 0;
      var engineStarted = false;
      var botsEnabled = true;
      var selectedCosmetics = { color: 0, bodyShape: 0, accent: 0, trail: 0, livery: 0 };
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
      var COLORS_HEX = [
        "#ff6b6b",
        // 0 Scarlet
        "#49c0ff",
        // 1 Cobalt
        "#8be34a",
        // 2 Olive
        "#ffd24a",
        // 3 Sunburst
        "#c07bff",
        // 4 Violet
        "#ff9f43",
        // 5 Ember
        "#00d2d3",
        // 6 Teal
        "#ffeaa7",
        // 7 Cream
        "#dfe6e9",
        // 8 Ghost
        "#2d3436",
        // 9 Stealth
        "#e17055",
        // 10 Rust
        "#55efc4"
        // 11 Mint
      ];
      try {
        const legacySkin = localStorage.getItem("smashcart.skin");
        if (legacySkin !== null && localStorage.getItem("smashcart.color") === null) {
          const migrated = parseInt(legacySkin, 10);
          if (Number.isInteger(migrated) && migrated >= 0 && migrated < G.COLOR_COUNT) {
            localStorage.setItem("smashcart.color", String(migrated));
            selectedCosmetics.color = migrated;
          }
          localStorage.removeItem("smashcart.skin");
        } else {
          const savedColor = parseInt(localStorage.getItem("smashcart.color") || "", 10);
          if (Number.isInteger(savedColor) && savedColor >= 0 && savedColor < G.COLOR_COUNT) selectedCosmetics.color = savedColor;
        }
      } catch {
      }
      try {
        const savedBodyShape = parseInt(localStorage.getItem("smashcart.bodyShape") || "", 10);
        if (Number.isInteger(savedBodyShape) && savedBodyShape >= 0 && savedBodyShape < G.BODY_SHAPE_COUNT) selectedCosmetics.bodyShape = savedBodyShape;
      } catch {
      }
      try {
        const savedAccent = parseInt(localStorage.getItem("smashcart.accent") || "", 10);
        if (Number.isInteger(savedAccent) && savedAccent >= 0 && savedAccent < G.ACCENT_COUNT) selectedCosmetics.accent = savedAccent;
      } catch {
      }
      try {
        const savedTrail = parseInt(localStorage.getItem("smashcart.trail") || "", 10);
        if (Number.isInteger(savedTrail) && savedTrail >= 0 && savedTrail < G.TRAIL_COUNT) selectedCosmetics.trail = savedTrail;
      } catch {
      }
      try {
        const savedLivery = parseInt(localStorage.getItem("smashcart.livery") || "", 10);
        if (Number.isInteger(savedLivery) && savedLivery >= 0 && savedLivery < G.LIVERY_COUNT) selectedCosmetics.livery = savedLivery;
      } catch {
      }
      try {
        botsEnabled = localStorage.getItem("smashcart.bots") !== "0";
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
        if (window.Input.isTouchDevice()) els.touch.classList.remove("hidden");
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
        els.quick.disabled = busy;
        els.friends.disabled = busy;
        els.lanQuick.disabled = busy;
        els.lanFriends.disabled = busy;
      }
      function updateMenuMeta(preserveStatus = true) {
        const lanOrigin = currentLanConnectOrigin();
        els.serverBadge.textContent = lanOrigin ? `LAN ${new URL(toPageOrigin(lanOrigin)).host}` : "Internet lobby";
        const portrait = !!(window.matchMedia && window.matchMedia("(orientation: portrait)").matches);
        if (!window.Input.isTouchDevice()) {
          els.orientationNote.textContent = "Keyboard flight: A/D steer, W/S climb, Shift boost, Space fire.";
        } else if (portrait) {
          els.orientationNote.textContent = "Portrait is fine for setup. Rotate to landscape before you launch.";
        } else {
          els.orientationNote.textContent = "Landscape ready. Touch controls appear after launch.";
        }
        if (inviteRoom) {
          els.quick.textContent = `JOIN ${inviteRoom}`;
          els.roomChip.textContent = `Invite ${inviteRoom}`;
          const inviteHost = inviteServer ? new URL(toPageOrigin(inviteServer)).host : location.host;
          els.friendsNote.textContent = `Invite ready for room ${inviteRoom} on ${inviteHost}. Quick Play joins it directly.`;
          if (!preserveStatus || !els.status.textContent) setStatus(`Invite ready: room ${inviteRoom}`);
        } else {
          els.quick.textContent = "PLAY PUBLIC";
          els.roomChip.textContent = lanOrigin ? "LAN ready" : "Public";
          els.friendsNote.textContent = "Room codes stay on the same server that created them.";
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
      function openJoinCode() {
        joinCodeOpen = true;
        els.joinCodeModal.classList.remove("hidden");
        els.joinCodeInput.value = "";
        els.joinCodeInput.focus();
      }
      function closeJoinCode() {
        joinCodeOpen = false;
        els.joinCodeModal.classList.add("hidden");
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
      function showHangar() {
        hangarOpen = true;
        els.hangarOverlay.classList.remove("hidden");
        if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(selectedCosmetics);
      }
      function hideHangar() {
        hangarOpen = false;
        els.hangarOverlay.classList.add("hidden");
      }
      function buildHangar() {
        const tabs = els.hangarOverlay.querySelectorAll(".hangar-tab");
        const sections = els.hangarOverlay.querySelectorAll(".hangar-section");
        function activateTab(tabName) {
          tabs.forEach((t) => {
            const active = t.dataset.tab === tabName;
            t.classList.toggle("active", active);
            t.setAttribute("aria-selected", active ? "true" : "false");
          });
          sections.forEach((s) => {
            const active = s.dataset.section === tabName;
            s.classList.toggle("active", active);
            s.classList.toggle("hidden", !active);
          });
        }
        tabs.forEach((tab) => {
          tab.addEventListener("click", () => {
            window.SFX.uiClick();
            activateTab(tab.dataset.tab);
          });
        });
        const shapeLabels = ["Fighter", "Interceptor", "Bomber", "Biplane"];
        shapeLabels.forEach((_, i) => {
          const btn = dollar(`hangar-shape-${i}`);
          btn.classList.toggle("selected", selectedCosmetics.bodyShape === i);
          btn.addEventListener("click", () => {
            selectedCosmetics.bodyShape = i;
            try {
              localStorage.setItem("smashcart.bodyShape", String(i));
            } catch {
            }
            els.hangarOverlay.querySelectorAll(".hangar-shape-btn").forEach((b, j) => b.classList.toggle("selected", j === i));
            window.SFX.uiClick();
            if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(selectedCosmetics);
          });
        });
        COLORS_HEX.forEach((_, i) => {
          const btn = dollar(`hangar-color-${i}`);
          btn.classList.toggle("selected", selectedCosmetics.color === i);
          btn.addEventListener("click", () => {
            selectedCosmetics.color = i;
            try {
              localStorage.setItem("smashcart.color", String(i));
            } catch {
            }
            els.hangarOverlay.querySelectorAll("[id^='hangar-color-']").forEach((b) => {
              const idx = parseInt(b.id.replace("hangar-color-", ""), 10);
              b.classList.toggle("selected", idx === i);
            });
            window.SFX.uiClick();
            if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(selectedCosmetics);
          });
        });
        const accentCount = 7;
        for (let i = 0; i < accentCount; i++) {
          const btn = dollar(`hangar-accent-${i}`);
          btn.classList.toggle("selected", selectedCosmetics.accent === i);
          btn.addEventListener("click", () => {
            selectedCosmetics.accent = i;
            try {
              localStorage.setItem("smashcart.accent", String(i));
            } catch {
            }
            els.hangarOverlay.querySelectorAll("[id^='hangar-accent-']").forEach((b) => {
              const idx = parseInt(b.id.replace("hangar-accent-", ""), 10);
              b.classList.toggle("selected", idx === i);
            });
            window.SFX.uiClick();
            if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(selectedCosmetics);
          });
        }
        const liveryLabels = ["Clean", "Stripe", "Two-Tone", "Camo"];
        liveryLabels.forEach((_, i) => {
          const btn = dollar(`hangar-livery-${i}`);
          btn.classList.toggle("selected", selectedCosmetics.livery === i);
          btn.addEventListener("click", () => {
            selectedCosmetics.livery = i;
            try {
              localStorage.setItem("smashcart.livery", String(i));
            } catch {
            }
            els.hangarOverlay.querySelectorAll(".hangar-livery-btn").forEach((b, j) => b.classList.toggle("selected", j === i));
            window.SFX.uiClick();
            if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(selectedCosmetics);
          });
        });
        const trailCount = 5;
        for (let i = 0; i < trailCount; i++) {
          const btn = dollar(`hangar-trail-${i}`);
          btn.classList.toggle("selected", selectedCosmetics.trail === i);
          btn.addEventListener("click", () => {
            selectedCosmetics.trail = i;
            try {
              localStorage.setItem("smashcart.trail", String(i));
            } catch {
            }
            els.hangarOverlay.querySelectorAll("[id^='hangar-trail-']").forEach((b) => {
              const idx = parseInt(b.id.replace("hangar-trail-", ""), 10);
              b.classList.toggle("selected", idx === i);
            });
            window.SFX.uiClick();
            if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(selectedCosmetics);
          });
        }
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
        if (window.Input.isTouchDevice()) els.touch.classList.remove("hidden");
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
        applyMode("lobby");
      }
      function buildP2PShareUrl(code) {
        const url = new URL(location.pathname, location.origin);
        url.searchParams.set("p2p", code);
        return url.toString();
      }
      async function joinP2PAsGuest(code) {
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
        els.lobbyTitle.textContent = `P2P Room ${code}`;
        renderLobbyRoster();
        applyMode("lobby");
        const phase = transport.getPhase();
        if (phase === "playing") {
          transport.onStateChange = null;
          enterPlayingFromLobby();
        }
      }
      function onP2PDisconnect(info) {
        if (info && (info.type === "host-left" || info.type === "kicked")) {
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
        els.time.textContent = String(Math.ceil(state.timeLeft));
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
        const list = [];
        state.players.forEach((p, id) => list.push({ id, name: p.name, score: p.score, bot: p.bot }));
        list.sort((a, b) => b.score - a.score);
        els.leaderboard.innerHTML = list.slice(0, 5).map(
          (p, i) => `<div class="lb-row ${p.id === myId ? "me" : ""}"><span>${i + 1}. ${escapeHtml(p.name)}${p.bot ? " \u{1F916}" : ""}</span><span>${p.score}</span></div>`
        ).join("");
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
          els.interTime.textContent = String(Math.ceil(state.timeLeft));
          const winner = list[0];
          els.winnerLine.textContent = winner ? winner.id === myId ? "\u{1F3C6} You win!" : `\u{1F3C6} ${winner.name} wins!` : "";
          els.finalBoard.innerHTML = list.slice(0, 6).map(
            (p, i) => `<li class="${p.id === myId ? "me" : ""}${i === 0 ? " win" : ""}"><span>${i + 1}. ${escapeHtml(p.name)}${p.bot ? " \u{1F916}" : ""}</span><span>${p.score}</span></li>`
          ).join("");
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
          const set = (value) => (e) => {
            e.preventDefault();
            window.Input.touch[key] = value;
            el.classList.toggle("pressed", value);
            if (value) buzz(8);
          };
          el.addEventListener("pointerdown", set(true));
          el.addEventListener("pointerup", set(false));
          el.addEventListener("pointercancel", set(false));
          el.addEventListener("pointerleave", set(false));
        };
        bind(els.left, "left");
        bind(els.right, "right");
        bind(els.climb, "climb");
        bind(els.dive, "dive");
        bind(els.boost, "boost");
        bind(els.fire, "fire");
      }
      function togglePause() {
        if (mode === "playing") {
          applyMode("paused");
          window.Net.sendInput(0, 0, false, false);
          window.SFX.setEngine(0, false);
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
        hideSettings();
        closeJoinCode();
        closeScanner();
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
        updateRotateOverlay();
      }
      function updateRotateOverlay() {
        const portrait = window.matchMedia && window.matchMedia("(orientation: portrait)").matches;
        const show = window.Input.isTouchDevice() && portrait && mode !== "menu";
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
        buildHangar();
        fetchLeaderboard();
        setupTouchButtons();
        updateRotateOverlay();
        updateMenuMeta(false);
        clearShareInvite();
        if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient();
        if (window.Input.isTouchDevice()) document.body.classList.add("touch-device");
        els.p2pHostBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          startP2PHost();
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
        els.quick.addEventListener("click", () => {
          window.SFX.uiClick();
          startGame(inviteRoom || "PUBLIC", inviteRoom ? inviteServer : null);
        });
        els.friends.addEventListener("click", () => {
          window.SFX.uiClick();
          startGame(genCode());
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
            startGame(inviteRoom || "PUBLIC", inviteRoom ? inviteServer : null);
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
        els.hangarBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          showHangar();
        });
        els.hangarCloseBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          hideHangar();
        });
        els.hangarDone.addEventListener("click", () => {
          window.SFX.uiClick();
          hideHangar();
        });
        els.hangarOverlay.addEventListener("click", (e) => {
          if (e.target === els.hangarOverlay) hideHangar();
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
        els.joinCodeOpenBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          openJoinCode();
        });
        els.joinCodeCancel.addEventListener("click", () => {
          window.SFX.uiClick();
          closeJoinCode();
        });
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
          closeJoinCode();
          startGame(code, null);
        });
        els.joinCodeInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const code = resolveJoinInput();
            if (!code) return;
            window.SFX.uiClick();
            closeJoinCode();
            startGame(code, null);
          }
        });
        els.joinCodeModal.addEventListener("click", (e) => {
          if (e.target === els.joinCodeModal) closeJoinCode();
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
          window.Net.sendHostSettings({ botsInRoom: els.lobbyBotsCheck.checked });
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
            if (hangarOpen) {
              hideHangar();
              return;
            }
            if (settingsOpen) {
              hideSettings();
              return;
            }
            if (joinCodeOpen) {
              closeJoinCode();
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
