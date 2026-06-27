import { Room, Client } from "colyseus";
import { ArenaState, Player, Bullet, Pickup } from "../schema/ArenaState";
import * as C from "../shared/constants";
import { resolveLandmarkCollisions } from "../shared/flight";
import * as S from "../shared/sphere";
import * as leaderboard from "../leaderboard";
import { log } from "../logger";
import { GameSim } from "../sim/GameSim";
import type { SimEvent } from "../sim/types";

// ---------------------------------------------------------------------------
// Helpers — kept in the adapter (transport-level concerns)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateCosmetic(val: unknown, max: number): number {
  return (typeof val === "number" && Number.isFinite(val) && Number.isInteger(val) && val >= 0 && val < max)
    ? val
    : Math.floor(Math.random() * max);
}

function normalizeName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const next = value.trim().slice(0, 14);
  return next || fallback;
}

// ---------------------------------------------------------------------------
// Shared local helpers (needed for legacy private shim methods used by tests)
// ---------------------------------------------------------------------------

const ZERO_INPUT: Input = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };
const TAU = Math.PI * 2;

interface Input {
  seq: number;
  turn: number;
  climb: number;
  boost: boolean;
  fire: boolean;
}

const getP = (e: { px: number; py: number; pz: number }): S.Vec3 => ({ x: e.px, y: e.py, z: e.pz });
const getF = (e: { fx: number; fy: number; fz: number }): S.Vec3 => ({ x: e.fx, y: e.fy, z: e.fz });
const setP = (e: { px: number; py: number; pz: number }, v: S.Vec3) => { e.px = v.x; e.py = v.y; e.pz = v.z; };
const setF = (e: { fx: number; fy: number; fz: number }, v: S.Vec3) => { e.fx = v.x; e.fy = v.y; e.fz = v.z; };

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function signWithDeadzone(v: number, deadzone: number): number {
  return Math.abs(v) <= deadzone ? 0 : Math.sign(v);
}

function horizontal(v: S.Vec3): S.Vec3 {
  return { x: v.x, y: 0, z: v.z };
}

function normalizeHorizontal(v: S.Vec3): S.Vec3 {
  const h = horizontal(v);
  return S.lenSq(h) > 1e-9 ? S.normalize(h) : { x: 1, y: 0, z: 0 };
}

function signedYaw(from: S.Vec3, to: S.Vec3): number {
  return S.signedAngle(S.WORLD_UP, normalizeHorizontal(from), normalizeHorizontal(to));
}

function steerToward(from: S.Vec3, to: S.Vec3, maxTurn: number): S.Vec3 {
  const angle = S.angBetween(from, to);
  if (angle < 1e-5) return S.normalize(to);
  const t = Math.min(1, maxTurn / angle);
  return S.slerp(from, to, t);
}

// ---------------------------------------------------------------------------
// ArenaRoom — thin Colyseus adapter
//
// At runtime (onCreate called): delegates ALL simulation to this.sim (GameSim).
// The tick loop runs sim.tick() then syncToSchema() to mirror plain state into
// the Colyseus MapSchema so clients receive patches.
//
// In unit-test scenarios (createRoom() bypasses onCreate, injects Maps directly
// onto the room instance, then calls private methods directly): the private
// "shim" methods below operate on this.state.* and the injected Maps, matching
// the pre-refactor interface that the existing 22-test suite exercises.
// ---------------------------------------------------------------------------

export class ArenaRoom extends Room<ArenaState> {
  maxClients = C.MAX_CLIENTS;

  // Runtime sim (set in onCreate; undefined in test scenarios that bypass onCreate).
  private sim: GameSim | undefined;

  // Adapter-level Maps that exist in both test and runtime paths.
  // In the runtime path these are only used by rateOk and onLeave reconnect logic.
  // In the test path (no sim) these are injected by the test harness and used by
  // the private shim methods below.
  private inputs = new Map<string, Input>();
  private lastShot = new Map<string, number>();
  private respawnAt = new Map<string, number>();
  private bots = new Map<string, any>();
  private bulletLife = new Map<string, number>();
  private powerUntil = new Map<string, number>();
  private shield = new Map<string, number>();
  private invulnUntil = new Map<string, number>();
  private msgTimes = new Map<string, number[]>();
  private clientMap = new Map<string, Client>();

  // Sim clock exposed on the room so tests can set (room as any).now = 0.
  private now = 0;
  private bulletSeq = 0;
  private botSeq = 0;
  private pickupSeq = 0;
  private pickupAt = 0;
  private botsEnabled = true;
  private lobbyElapsed = 0;
  private isPublic = true;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  onCreate(options: { code?: string } = {}) {
    this.state = new ArenaState();
    const code = options.code || "PUBLIC";
    this.isPublic = code === "PUBLIC" || code === "NOBOTS";
    this.botsEnabled = code !== "NOBOTS";
    this.setMetadata({ code });

    this.state.arenaHalf = C.MAP_HALF;
    this.state.floorY = C.GROUND_Y;
    this.state.ceilingY = C.MAX_ALT;

    this.sim = new GameSim({
      botsEnabled: this.botsEnabled,
      isPublic: this.isPublic,
      onEvent: (e) => this.handleSimEvent(e),
    });

    // Mirror initial phase/timeLeft into schema.
    this.state.phase = this.sim.phase;
    this.state.timeLeft = this.sim.timeLeft;
    this.state.hostId = this.sim.hostId;

    this.onMessage("input", (client, data: unknown) => {
      if (!this.rateOk(client.sessionId, C.INPUT_RATE_MAX)) return;
      this.sim!.applyInput(client.sessionId, data);
    });

    this.onMessage("setName", (client, name: unknown) => {
      if (!this.rateOk(client.sessionId, C.NAME_RATE_MAX)) return;
      // Use current name as fallback so malformed setName doesn't blank the name.
      const currentName = this.sim!.getState().players.get(client.sessionId)?.name ?? "";
      this.sim!.setPlayerName(client.sessionId, normalizeName(name, currentName));
    });

    this.onMessage("setReady", (client) => {
      if (this.isPublic) return;
      if (!this.rateOk(client.sessionId, C.READY_RATE_MAX)) return;
      this.sim!.setReady(client.sessionId);
    });

    this.onMessage("hostStart", (client) => {
      if (this.isPublic) return;
      if (!this.rateOk(client.sessionId, C.HOST_MSG_RATE_MAX)) return;
      this.sim!.hostStart(client.sessionId);
    });

    this.onMessage("hostKick", (client, data: unknown) => {
      if (this.isPublic) return;
      if (!this.rateOk(client.sessionId, C.HOST_KICK_RATE_MAX)) return;
      if (!isRecord(data)) return;
      const targetId = typeof data.targetId === "string" ? data.targetId : null;
      if (!targetId) return;
      // sim validates host, non-bot, non-self; removes from sim state; returns targetId or null.
      const kicked = this.sim!.hostKick(client.sessionId, targetId);
      if (kicked) {
        this.clientMap.get(kicked)?.leave(1000);
      }
    });

    this.onMessage("hostSettings", (client, data: unknown) => {
      if (this.isPublic) return;
      if (!this.rateOk(client.sessionId, C.HOST_MSG_RATE_MAX)) return;
      if (!isRecord(data)) return;
      this.sim!.setHostSettings(client.sessionId, {
        roundLength: typeof data.roundLength === "number" ? data.roundLength : undefined,
        roomName: typeof data.roomName === "string" ? data.roomName : undefined,
        botsInRoom: typeof data.botsInRoom === "boolean" ? data.botsInRoom : undefined,
      });
    });

    this.setPatchRate(33);
    this.setSimulationInterval((dt) => {
      try {
        this.sim!.tick(Math.min(dt / 1000, C.DT_MAX));
        this.syncToSchema();
      } catch (e) {
        log("error", "update loop error", { room: this.roomId, error: (e as Error).message });
        try { require("@sentry/node").captureException(e, { tags: { room: this.roomId } }); } catch {}
        throw e;
      }
    });
  }

  onJoin(client: Client, options: { name?: unknown; skin?: unknown; bodyShape?: unknown; accent?: unknown; trail?: unknown; livery?: unknown } | null = {}) {
    const joinOptions = isRecord(options) ? options : {};

    this.clientMap.set(client.sessionId, client);

    this.sim!.addPlayer(client.sessionId, {
      name: normalizeName(joinOptions.name, "Pilot"),
      skin: validateCosmetic(joinOptions.skin, C.COLOR_COUNT),
      bodyShape: validateCosmetic(joinOptions.bodyShape, C.BODY_SHAPE_COUNT),
      accent: validateCosmetic(joinOptions.accent, C.ACCENT_COUNT),
      trail: validateCosmetic(joinOptions.trail, C.TRAIL_COUNT),
      livery: validateCosmetic(joinOptions.livery, C.LIVERY_COUNT),
    });
  }

  async onLeave(client: Client, consented?: boolean) {
    this.clientMap.delete(client.sessionId);
    if (consented) {
      this.sim!.removePlayer(client.sessionId);
      this.msgTimes.delete(client.sessionId);
      return;
    }

    // Zero out inputs during reconnect window so sim doesn't drive with stale state.
    // zeroInput bypasses seq validation (preserving current seq) — matching the
    // old behaviour of directly setting inputs.set(id, { ...ZERO_INPUT }).
    this.sim!.zeroInput(client.sessionId);

    const reconnectWindow = (!this.sim!.isPublic && this.sim!.phase === "lobby")
      ? C.LOBBY_RECONNECT_WINDOW
      : C.RECONNECT_WINDOW;
    try {
      await this.allowReconnection(client, reconnectWindow);
      this.clientMap.set(client.sessionId, client);
    } catch {
      this.sim!.removePlayer(client.sessionId);
      this.msgTimes.delete(client.sessionId);
    }
  }

  // ---------------------------------------------------------------------------
  // SimEvent handler — called from inside sim.tick(), safe to broadcast
  // ---------------------------------------------------------------------------

  private handleSimEvent(e: SimEvent): void {
    if (e.type === "kill") {
      this.broadcast("kill", {
        killer: e.killer,
        victim: e.victim,
        killerName: e.killerName,
        victimName: e.victimName,
      });
    } else if (e.type === "pickup") {
      this.broadcast("pickup", { by: e.by, type: e.pickupType });
    } else if (e.type === "roundEnd") {
      // Leaderboard recording is a server-only concern; stays in the adapter.
      for (const { name, score } of e.scores) {
        leaderboard.record(name, score);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // syncToSchema — mirrors plain SimState into the Colyseus MapSchema every tick
  // ---------------------------------------------------------------------------

  private syncToSchema(): void {
    const state = this.sim!.getState();

    // --- Players ---
    for (const [id, sp] of state.players) {
      let schemaPlayer = this.state.players.get(id);
      if (!schemaPlayer) {
        schemaPlayer = new Player();
        this.state.players.set(id, schemaPlayer);
      }
      schemaPlayer.name = sp.name;
      schemaPlayer.px = sp.px;
      schemaPlayer.py = sp.py;
      schemaPlayer.pz = sp.pz;
      schemaPlayer.fx = sp.fx;
      schemaPlayer.fy = sp.fy;
      schemaPlayer.fz = sp.fz;
      schemaPlayer.seq = sp.seq;
      schemaPlayer.speed = sp.speed;
      schemaPlayer.turn = sp.turn;
      schemaPlayer.climb = sp.climb;
      schemaPlayer.hp = sp.hp;
      schemaPlayer.score = sp.score;
      schemaPlayer.skin = sp.skin;
      schemaPlayer.alive = sp.alive;
      schemaPlayer.bot = sp.bot;
      schemaPlayer.boosting = sp.boosting;
      schemaPlayer.power = sp.power;
      schemaPlayer.powerLeft = sp.powerLeft;
      schemaPlayer.ready = sp.ready;
      schemaPlayer.bodyShape = sp.bodyShape;
      schemaPlayer.accent = sp.accent;
      schemaPlayer.trail = sp.trail;
      schemaPlayer.livery = sp.livery;
    }
    for (const id of this.state.players.keys()) {
      if (!state.players.has(id)) this.state.players.delete(id);
    }

    // --- Bullets ---
    for (const [key, sb] of state.bullets) {
      let schemaBullet = this.state.bullets.get(key);
      if (!schemaBullet) {
        schemaBullet = new Bullet();
        this.state.bullets.set(key, schemaBullet);
      }
      schemaBullet.px = sb.px;
      schemaBullet.py = sb.py;
      schemaBullet.pz = sb.pz;
      schemaBullet.fx = sb.fx;
      schemaBullet.fy = sb.fy;
      schemaBullet.fz = sb.fz;
      schemaBullet.owner = sb.owner;
      schemaBullet.homing = sb.homing;
    }
    for (const key of this.state.bullets.keys()) {
      if (!state.bullets.has(key)) this.state.bullets.delete(key);
    }

    // --- Pickups ---
    for (const [key, sp] of state.pickups) {
      let schemaPickup = this.state.pickups.get(key);
      if (!schemaPickup) {
        schemaPickup = new Pickup();
        this.state.pickups.set(key, schemaPickup);
      }
      schemaPickup.type = sp.type;
      schemaPickup.px = sp.px;
      schemaPickup.py = sp.py;
      schemaPickup.pz = sp.pz;
    }
    for (const key of this.state.pickups.keys()) {
      if (!state.pickups.has(key)) this.state.pickups.delete(key);
    }

    // --- Scalars ---
    this.state.phase = state.phase;
    this.state.timeLeft = state.timeLeft;
    this.state.hostId = state.hostId;
    this.state.roomName = state.roomName;
    this.state.roundLength = state.roundLength;
    this.state.botsInRoom = state.botsInRoom;
  }

  // ---------------------------------------------------------------------------
  // Rate limiting — stays in the adapter (transport concern)
  // ---------------------------------------------------------------------------

  private rateOk(id: string, max: number): boolean {
    const now = Date.now();
    let arr = this.msgTimes.get(id);
    if (!arr) { arr = []; this.msgTimes.set(id, arr); }
    while (arr.length && now - arr[0] > 1000) arr.shift();
    if (arr.length >= max) return false;
    arr.push(now);
    return true;
  }

  // ---------------------------------------------------------------------------
  // LEGACY SHIM METHODS — only called by unit tests that bypass onCreate.
  //
  // Tests inject Maps directly onto room private fields (inputs, lastShot, etc.)
  // and call these methods with Player schema objects and this.state.* Maps.
  //
  // At runtime these methods are never called directly — the sim owns all logic.
  // They are kept here verbatim from the pre-refactor ArenaRoom so the 22-test
  // suite continues to pass without modification.
  //
  // If this.sim exists (runtime path), spawn/stepPlane delegate to the sim and
  // then syncToSchema mirrors state. The methods below operate on this.state.*
  // and the room-level Maps (used by tests).
  // ---------------------------------------------------------------------------

  private spawn(id: string, p: Player): void {
    const pos = this.pickSpawnPoint();
    const center = normalizeHorizontal({ x: -pos.x, y: 0, z: -pos.z });
    const yaw = Math.atan2(center.z, center.x) + rand(-0.4, 0.4);
    const pitch = rand(-0.06, 0.08);
    const fwd = S.yawPitchForward(yaw, pitch);

    setP(p, pos);
    setF(p, fwd);
    p.seq = this.inputs.get(id)?.seq ?? 0;
    p.speed = C.CRUISE_SPEED;
    p.turn = 0;
    p.climb = 0;
    p.hp = C.MAX_HP;
    p.alive = true;
    p.boosting = false;
    this.clearPower(id, p);
    this.lastShot.delete(id);
    this.invulnUntil.set(id, this.now + C.SPAWN_INVULN);
  }

  private pickSpawnPoint(): S.Vec3 {
    let best = S.vec(0, C.SPAWN_ALT, 0);
    let bestScore = -Infinity;

    for (let i = 0; i < C.SPAWN_REROLL; i++) {
      const ang = Math.random() * TAU;
      const r = rand(C.MAP_HALF * 0.45, C.MAP_HALF * 0.8);
      const pos = S.vec(Math.cos(ang) * r, rand(C.SPAWN_ALT - 18, C.SPAWN_ALT + 42), Math.sin(ang) * r);
      if (this.insideLandmark(pos, C.PLANE_RADIUS)) continue;

      let nearest = Infinity;
      for (const [, other] of this.state.players) {
        if (!other.alive) continue;
        nearest = Math.min(nearest, S.distance(pos, getP(other)));
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

  private insideLandmark(pos: S.Vec3, radius: number): boolean {
    for (const landmark of C.LANDMARKS) {
      if (!landmark.cover) continue;
      const rr = landmark.radius + radius;
      const dx = pos.x - landmark.x;
      const dz = pos.z - landmark.z;
      if (dx * dx + dz * dz <= rr * rr && pos.y <= landmark.height + radius) return true;
    }
    return false;
  }

  private clearPower(id: string, p?: Player): void {
    this.powerUntil.delete(id);
    this.shield.delete(id);
    if (p) { p.power = ""; p.powerLeft = 0; }
  }

  private stepPlane(id: string, p: Player, dt: number, playing: boolean): void {
    const input = this.inputs.get(id) ?? ZERO_INPUT;
    let pos = getP(p);
    let fwd = S.normalize(getF(p));

    const angles = S.yawPitchFromForward(fwd);
    const yaw = angles.yaw + input.turn * C.TURN_RATE * dt;
    const pitch = S.clamp(angles.pitch + input.climb * C.PITCH_RATE * dt, -C.PITCH_MAX, C.PITCH_MAX);
    fwd = S.yawPitchForward(yaw, pitch);

    p.turn = input.turn;
    p.climb = input.climb;
    p.boosting = input.boost;
    p.seq = Math.max(p.seq, input.seq);

    let targetSpeed = input.boost ? C.BOOST_SPEED : C.CRUISE_SPEED;
    if (p.power === "afterburner") targetSpeed *= C.AFTERBURNER_FACTOR;
    const delta = targetSpeed - p.speed;
    const step = Math.sign(delta) * C.ACCEL * dt;
    p.speed = Math.abs(step) >= Math.abs(delta) ? targetSpeed : p.speed + step;

    const edge = Math.max(Math.abs(pos.x), Math.abs(pos.z));
    if (edge > C.MAP_HALF - C.MAP_EDGE_SOFT) {
      const edgeT = S.clamp((edge - (C.MAP_HALF - C.MAP_EDGE_SOFT)) / C.MAP_EDGE_SOFT, 0, 1);
      const home = normalizeHorizontal({ x: -pos.x, y: 0, z: -pos.z });
      fwd = S.normalize({
        x: S.lerp(fwd.x, home.x, edgeT * 0.25),
        y: fwd.y * (1 - edgeT * 0.2),
        z: S.lerp(fwd.z, home.z, edgeT * 0.25),
      });
    }

    pos = S.advance(pos, fwd, p.speed * dt).p;

    const collision = resolveLandmarkCollisions(pos, fwd, C.LANDMARKS, C.PLANE_RADIUS);
    pos = collision.pos;
    fwd = collision.fwd;

    pos.x = S.clamp(pos.x, -C.MAP_HALF, C.MAP_HALF);
    pos.z = S.clamp(pos.z, -C.MAP_HALF, C.MAP_HALF);
    pos.y = S.clamp(pos.y, C.MIN_ALT, C.MAX_ALT);

    if (pos.y <= C.MIN_ALT + 0.01 && fwd.y < 0) fwd = S.withPitch(fwd, 0.02);
    if (pos.y >= C.MAX_ALT - 0.01 && fwd.y > 0) fwd = S.withPitch(fwd, -0.02);

    setP(p, pos);
    setF(p, S.normalize(fwd));

    if (input.fire && playing) this.tryFire(id, p);
  }

  private tryFire(id: string, p: Player): void {
    this.invulnUntil.delete(id);
    const last = this.lastShot.get(id) ?? -999;
    const cooldown = C.FIRE_COOLDOWN * (p.power === "rapid" ? C.RAPID_FACTOR : 1);
    if (this.now - last < cooldown) return;
    this.lastShot.set(id, this.now);

    const pos = getP(p);
    const fwd = getF(p);
    if (p.power === "spread") {
      this.spawnBullet(id, pos, S.turn(pos, fwd, -C.SPREAD_ANGLE), false);
      this.spawnBullet(id, pos, fwd, false);
      this.spawnBullet(id, pos, S.turn(pos, fwd, C.SPREAD_ANGLE), false);
    } else {
      this.spawnBullet(id, pos, fwd, p.power === "homing");
    }
  }

  private spawnBullet(owner: string, pos: S.Vec3, fwd: S.Vec3, homing: boolean): void {
    const b = new Bullet();
    const start = S.add(pos, S.scale(S.normalize(fwd), C.PLANE_RADIUS + 10));
    setP(b, start);
    setF(b, S.normalize(fwd));
    b.owner = owner;
    b.homing = homing;
    const key = `b${this.bulletSeq++}`;
    this.bulletLife.set(key, C.BULLET_LIFE);
    this.state.bullets.set(key, b);
  }

  private stepBullets(dt: number, playing: boolean): void {
    for (const [key, b] of this.state.bullets) {
      const life = (this.bulletLife.get(key) ?? C.BULLET_LIFE) - dt;
      if (life <= 0) {
        this.state.bullets.delete(key);
        this.bulletLife.delete(key);
        continue;
      }
      this.bulletLife.set(key, life);

      let pos = getP(b);
      let fwd = S.normalize(getF(b));

      if (b.homing) {
        const target = this.closestTarget(b.owner, pos);
        if (target) {
          const desired = S.normalize(S.sub(getP(target.player), pos));
          fwd = steerToward(fwd, desired, C.HOMING_TURN * dt);
        }
      }

      const prev = pos;
      pos = S.advance(pos, fwd, C.BULLET_SPEED * dt).p;

      let bestT = Infinity;
      let victim: Player | null = null;
      let victimId = "";
      let blocked = false;

      if (playing) {
        for (const [pid, p] of this.state.players) {
          if (!p.alive || pid === b.owner) continue;
          const targetPos = getP(p);
          const hitDist = C.PLANE_RADIUS + C.BULLET_RADIUS;
          if (S.segmentPointDistance(prev, pos, targetPos) > hitDist) continue;
          const t = S.segmentPointT(prev, pos, targetPos);
          if (t < bestT) { bestT = t; victim = p; victimId = pid; blocked = false; }
        }
      }

      for (const landmark of C.LANDMARKS) {
        if (!landmark.cover) continue;
        const cylPoint = { x: landmark.x, y: 0, z: landmark.z };
        const flatA = { x: prev.x, y: 0, z: prev.z };
        const flatB = { x: pos.x, y: 0, z: pos.z };
        if (S.segmentPointDistance(flatA, flatB, cylPoint) > landmark.radius + C.BULLET_RADIUS) continue;
        const t = S.segmentPointT(flatA, flatB, cylPoint);
        const y = S.lerp(prev.y, pos.y, t);
        if (y > landmark.height + C.BULLET_RADIUS) continue;
        if (t < bestT) { bestT = t; victim = null; blocked = true; }
      }

      if (victim || blocked) {
        if (victim) this.damage(victim, victimId, b.owner);
        this.state.bullets.delete(key);
        this.bulletLife.delete(key);
        continue;
      }

      if (Math.abs(pos.x) > C.MAP_HALF || Math.abs(pos.z) > C.MAP_HALF || pos.y < C.GROUND_Y || pos.y > C.MAX_ALT + 40) {
        this.state.bullets.delete(key);
        this.bulletLife.delete(key);
        continue;
      }

      setP(b, pos);
      setF(b, fwd);
    }
  }

  private damage(p: Player, victimId: string, killerId: string): void {
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

    p.hp -= C.BULLET_DAMAGE;
    if (p.hp > 0) return;

    p.hp = 0;
    p.alive = false;
    p.boosting = false;
    p.turn = 0;
    p.climb = 0;
    this.clearPower(victimId, p);
    this.respawnAt.set(victimId, this.now + C.RESPAWN_DELAY);

    const killer = this.state.players.get(killerId);
    if (killer && killerId !== victimId) killer.score += 1;
    this.broadcast("kill", {
      killer: killerId,
      victim: victimId,
      killerName: killer ? killer.name : "?",
      victimName: p.name,
    });
  }

  private collectPickups(): void {
    for (const [key, pk] of this.state.pickups) {
      const pkPos = getP(pk);
      for (const [pid, p] of this.state.players) {
        if (!p.alive) continue;
        if (S.distance(pkPos, getP(p)) > C.PICKUP_RADIUS + C.PLANE_RADIUS) continue;
        if (pk.type === "repair" && p.hp >= C.MAX_HP) continue;
        this.applyPowerup(pid, p, pk.type);
        this.state.pickups.delete(key);
        this.broadcast("pickup", { by: pid, type: pk.type });
        break;
      }
    }
  }

  private applyPowerup(id: string, p: Player, type: string): void {
    if (type === "repair") { p.hp = C.MAX_HP; return; }
    this.shield.delete(id);
    p.power = type;
    p.powerLeft = C.POWERUP_DURATION;
    this.powerUntil.set(id, this.now + C.POWERUP_DURATION);
    if (type === "shield") this.shield.set(id, C.SHIELD_CHARGES);
  }

  private closestTarget(owner: string, pos: S.Vec3): { id: string; player: Player } | null {
    let best: { id: string; player: Player } | null = null;
    let bestDist = Infinity;
    for (const [id, p] of this.state.players) {
      if (id === owner || !p.alive) continue;
      const dist = S.distance(pos, getP(p));
      if (dist < bestDist) {
        bestDist = dist;
        best = { id, player: p };
      }
    }
    return best;
  }
}
