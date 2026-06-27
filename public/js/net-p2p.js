"use strict";
(() => {
  // src/shared/constants.ts
  var TICK_RATE = 30;
  var TICK_MS = 1e3 / TICK_RATE;
  var CRUISE_SPEED = 92;
  var BOOST_SPEED = 138;
  var ACCEL = 260;
  var TURN_RATE = 1.5;
  var PITCH_RATE = 1.05;
  var PITCH_MAX = 0.5;
  var PLANE_RADIUS = 16;
  var MAX_HP = 100;
  var BULLET_SPEED = 322;
  var BULLET_DAMAGE = 25;
  var BULLET_LIFE = 2.3;
  var BULLET_RADIUS = 4;
  var FIRE_COOLDOWN = 0.34;
  var RESPAWN_DELAY = 2.5;
  var BULLET_HIT_RADIUS = 26;
  var AIM_ASSIST_CONE = 0.35;
  var AIM_ASSIST_RANGE = 700;
  var AIM_ASSIST_TURN = 0.55;
  var ROUND_SECONDS = 150;
  var ROUND_INTERMISSION = 8;
  var MIN_PLAYERS = 4;
  var MAP_HALF = 1800;
  var MAP_EDGE_SOFT = 260;
  var GROUND_Y = 0;
  var MIN_ALT = 18;
  var SPAWN_ALT = 58;
  var MAX_ALT = 320;
  var PICKUP_ALT_MIN = 28;
  var PICKUP_ALT_MAX = 170;
  var PICKUP_FIELD_RADIUS = 1120;
  var SPAWN_REROLL = 14;
  var BOT_NAMES = [
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
  var COLOR_COUNT = 12;
  var ACCENT_COUNT = 7;
  var TRAIL_COUNT = 5;
  var LIVERY_COUNT = 4;
  var SKIN_COUNT = COLOR_COUNT;
  var PICKUP_MAX = 6;
  var PICKUP_INTERVAL = 5.5;
  var PICKUP_RADIUS = 24;
  var POWERUP_DURATION = 10;
  var SHIELD_CHARGES = 3;
  var RAPID_FACTOR = 0.55;
  var SPREAD_ANGLE = 0.12;
  var AFTERBURNER_FACTOR = 1.22;
  var HOMING_TURN = 1.45;
  var POWERUP_TYPES = ["spread", "rapid", "shield", "afterburner", "repair", "homing"];
  var POWERUP_WEIGHTS = {
    spread: 1,
    rapid: 1,
    shield: 1,
    afterburner: 1,
    repair: 0.7,
    homing: 0.55
  };
  var SPAWN_INVULN = 1.2;
  var LOBBY_READY_TIMEOUT = 120;
  var LANDMARKS = [
    { kind: "tower", x: 0, z: 0, radius: 96, height: 170, color: 16747069, cover: true },
    { kind: "mesa", x: -620, z: -340, radius: 90, height: 56, color: 11636066, cover: true },
    { kind: "mesa", x: 720, z: -520, radius: 110, height: 62, color: 11636066, cover: true },
    { kind: "mesa", x: -760, z: 610, radius: 120, height: 60, color: 11636066, cover: true },
    { kind: "spire", x: 660, z: 660, radius: 54, height: 120, color: 9356031, cover: true },
    { kind: "spire", x: -180, z: 860, radius: 48, height: 108, color: 9356031, cover: true },
    { kind: "hangar", x: 940, z: 90, radius: 78, height: 36, color: 8293014, cover: true },
    { kind: "hangar", x: -980, z: 80, radius: 78, height: 36, color: 8293014, cover: true }
  ];

  // src/shared/sphere.ts
  var WORLD_UP = { x: 0, y: 1, z: 0 };
  var vec = (x, y, z) => ({ x, y, z });
  var add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
  var sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
  var scale = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
  var dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  var cross = (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  });
  var lenSq = (a) => dot(a, a);
  var len = (a) => Math.sqrt(lenSq(a));
  var distanceSq = (a, b) => lenSq(sub(a, b));
  var distance = (a, b) => Math.sqrt(distanceSq(a, b));
  var clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  var lerp = (a, b, t) => a + (b - a) * t;
  var lerpVec = (a, b, t) => ({
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t)
  });
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

  // src/sim/GameSim.ts
  var ZERO_INPUT = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };
  var TAU = Math.PI * 2;
  var getP = (e) => ({ x: e.px, y: e.py, z: e.pz });
  var getF = (e) => ({ x: e.fx, y: e.fy, z: e.fz });
  var setP = (e, v) => {
    e.px = v.x;
    e.py = v.y;
    e.pz = v.z;
  };
  var setF = (e, v) => {
    e.fx = v.x;
    e.fy = v.y;
    e.fz = v.z;
  };
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
  var GameSim = class {
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

  // src/client/net-p2p.ts
  var DT_MAX = 0.05;
  var STATE_HZ = 30;
  var INPUT_HZ = 25;
  var SNAP_BUFFER_MS = 1400;
  var MAX_EXTRAP_MS = 120;
  var SNAP_DISTANCE = 140;
  var MAX_GUESTS = 6;
  var ICE_SERVER = "stun:stun.l.google.com:19302";
  var StableMap = class {
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
  var GuestTransportState = class {
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
  var HostTransportState = class {
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
  var SignalSocket = class {
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
  var WebRtcTransport = class {
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
})();
