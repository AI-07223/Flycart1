import { Room, Client } from "colyseus";
import { ArenaState, Player, Bullet, Pickup } from "../schema/ArenaState";
import * as C from "../shared/constants";
import { resolveLandmarkCollisions } from "../shared/flight";
import * as S from "../shared/sphere";
import * as leaderboard from "../leaderboard";
import { log } from "../logger";

interface Input {
  seq: number;
  turn: number;
  climb: number;
  boost: boolean;
  fire: boolean;
}

interface BotBrain {
  targetId: string | null;
  retargetAt: number;
  wanderYaw: number;
}

const ZERO_INPUT: Input = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };
const TAU = Math.PI * 2;

const getP = (e: { px: number; py: number; pz: number }): S.Vec3 => ({ x: e.px, y: e.py, z: e.pz });
const getF = (e: { fx: number; fy: number; fz: number }): S.Vec3 => ({ x: e.fx, y: e.fy, z: e.fz });
const setP = (e: { px: number; py: number; pz: number }, v: S.Vec3) => { e.px = v.x; e.py = v.y; e.pz = v.z; };
const setF = (e: { fx: number; fy: number; fz: number }, v: S.Vec3) => { e.fx = v.x; e.fy = v.y; e.fz = v.z; };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const next = value.trim().slice(0, 14);
  return next || fallback;
}

function applyInputPatch(current: Input, data: unknown): Input | null {
  if (!isRecord(data)) return null;
  const next = { ...current };
  const seq = typeof data.seq === "number" && Number.isFinite(data.seq) ? Math.floor(data.seq) : current.seq;
  if (seq < current.seq) return null;
  next.seq = seq;
  if (typeof data.turn === "number" && Number.isFinite(data.turn)) next.turn = S.clamp(data.turn, -1, 1);
  if (typeof data.climb === "number" && Number.isFinite(data.climb)) next.climb = S.clamp(data.climb, -1, 1);
  if (typeof data.boost === "boolean") next.boost = data.boost;
  if (typeof data.fire === "boolean") next.fire = data.fire;
  return next;
}

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

function horizDistSq(a: S.Vec3, b: S.Vec3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function pitchFor(fwd: S.Vec3): number {
  return S.yawPitchFromForward(fwd).pitch;
}

function steerToward(from: S.Vec3, to: S.Vec3, maxTurn: number): S.Vec3 {
  const angle = S.angBetween(from, to);
  if (angle < 1e-5) return S.normalize(to);
  const t = Math.min(1, maxTurn / angle);
  return S.slerp(from, to, t);
}

export class ArenaRoom extends Room<ArenaState> {
  maxClients = C.MAX_CLIENTS;

  private inputs = new Map<string, Input>();
  private lastShot = new Map<string, number>();
  private respawnAt = new Map<string, number>();
  private bots = new Map<string, BotBrain>();
  private bulletLife = new Map<string, number>();
  private powerUntil = new Map<string, number>();
  private shield = new Map<string, number>();
  private invulnUntil = new Map<string, number>();
  private msgTimes = new Map<string, number[]>();
  private clientMap = new Map<string, Client>();

  private now = 0;
  private bulletSeq = 0;
  private botSeq = 0;
  private pickupSeq = 0;
  private pickupAt = 0;
  private botsEnabled = true;
  private lobbyElapsed = 0;
  private isPublic = true;

  onCreate(options: { code?: string } = {}) {
    this.state = new ArenaState();
    const code = options.code || "PUBLIC";
    this.isPublic = code === "PUBLIC" || code === "NOBOTS";
    this.botsEnabled = code !== "NOBOTS";
    this.setMetadata({ code });

    this.state.arenaHalf = C.MAP_HALF;
    this.state.floorY = C.GROUND_Y;
    this.state.ceilingY = C.MAX_ALT;

    if (this.isPublic) {
      this.state.phase = "playing";
      this.state.timeLeft = C.ROUND_SECONDS;
    } else {
      this.state.phase = "lobby";
      this.state.timeLeft = 0;
      this.lobbyElapsed = 0;
    }

    this.onMessage("input", (client, data: unknown) => {
      if (!this.rateOk(client.sessionId, C.INPUT_RATE_MAX)) return;
      const cur = this.inputs.get(client.sessionId) ?? { ...ZERO_INPUT };
      const next = applyInputPatch(cur, data);
      if (!next) return;
      this.inputs.set(client.sessionId, next);
    });

    this.onMessage("setName", (client, name: unknown) => {
      if (!this.rateOk(client.sessionId, C.NAME_RATE_MAX)) return;
      const p = this.state.players.get(client.sessionId);
      if (p) p.name = normalizeName(name, p.name);
    });

    this.onMessage("setReady", (client) => {
      if (this.isPublic) return;
      if (!this.rateOk(client.sessionId, C.READY_RATE_MAX)) return;
      const p = this.state.players.get(client.sessionId);
      if (!p || p.bot) return;
      p.ready = !p.ready;
      this.checkAutoStart();
    });

    this.onMessage("hostStart", (client) => {
      if (this.isPublic) return;
      if (!this.rateOk(client.sessionId, C.HOST_MSG_RATE_MAX)) return;
      if (client.sessionId !== this.state.hostId) return;
      if (this.state.phase !== "lobby") return;
      this.startMatch();
    });

    this.onMessage("hostKick", (client, data: unknown) => {
      if (this.isPublic) return;
      if (!this.rateOk(client.sessionId, C.HOST_KICK_RATE_MAX)) return;
      if (client.sessionId !== this.state.hostId) return;
      if (!isRecord(data)) return;
      const targetId = typeof data.targetId === "string" ? data.targetId : null;
      if (!targetId) return;
      const target = this.state.players.get(targetId);
      if (!target || target.bot) return;
      if (targetId === client.sessionId) return;
      this.clientMap.get(targetId)?.leave(1000);
    });

    this.setPatchRate(33);
    this.setSimulationInterval((dt) => {
      try {
        this.update(Math.min(dt / 1000, C.DT_MAX));
      } catch (e) {
        log("error", "update loop error", { room: this.roomId, error: (e as Error).message });
        try { require("@sentry/node").captureException(e, { tags: { room: this.roomId } }); } catch {}
        throw e;
      }
    });
  }

  onJoin(client: Client, options: { name?: unknown; skin?: unknown } | null = {}) {
    const joinOptions = isRecord(options) ? options : {};
    const p = new Player();
    p.name = normalizeName(joinOptions.name, "Pilot");
    p.skin = typeof joinOptions.skin === "number" && Number.isInteger(joinOptions.skin) && joinOptions.skin >= 0 && joinOptions.skin < C.SKIN_COUNT
      ? joinOptions.skin
      : Math.floor(Math.random() * C.SKIN_COUNT);
    p.bot = false;
    p.ready = false;

    this.clientMap.set(client.sessionId, client);

    if (this.isPublic) {
      this.spawn(client.sessionId, p);
    } else {
      // Lobby: add player in a spectator-like state, not yet in combat.
      p.alive = false;
      p.px = 0;
      p.py = C.SPAWN_ALT;
      p.pz = 0;
      p.fx = 1;
      p.fy = 0;
      p.fz = 0;
      p.speed = 0;
      p.hp = C.MAX_HP;
      // First human joiner becomes host.
      if (this.state.hostId === "") {
        this.state.hostId = client.sessionId;
      }
    }

    this.state.players.set(client.sessionId, p);
    this.inputs.set(client.sessionId, { ...ZERO_INPUT });
  }

  async onLeave(client: Client, consented?: boolean) {
    this.clientMap.delete(client.sessionId);
    if (consented) { this.removePlayer(client.sessionId); return; }
    this.inputs.set(client.sessionId, { ...ZERO_INPUT });
    // In lobby, use a short reconnect window since the slot is less precious.
    const reconnectWindow = (!this.isPublic && this.state.phase === "lobby")
      ? C.LOBBY_RECONNECT_WINDOW
      : C.RECONNECT_WINDOW;
    try {
      await this.allowReconnection(client, reconnectWindow);
      // Restore client reference on successful reconnect.
      this.clientMap.set(client.sessionId, client);
    } catch {
      this.removePlayer(client.sessionId);
    }
  }

  private update(dt: number) {
    this.now += dt;
    const playing = this.state.phase === "playing";

    if (playing) {
      this.maintainBots();
      this.maintainPickups();
    }
    this.updateTimer(dt);

    if (playing) {
      for (const [id, brain] of this.bots) this.thinkBot(id, brain);

      for (const [id, p] of this.state.players) {
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

  private updateTimer(dt: number) {
    if (this.state.phase === "lobby") {
      // Count human players only.
      let humanCount = 0;
      for (const [, p] of this.state.players) if (!p.bot) humanCount++;
      if (humanCount >= 2) {
        this.lobbyElapsed += dt;
        if (this.lobbyElapsed >= C.LOBBY_READY_TIMEOUT) {
          this.startMatch();
        }
      } else {
        // Reset watchdog if not enough players.
        this.lobbyElapsed = 0;
      }
      return;
    }

    if (this.state.phase === "playing") {
      this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
      if (this.state.timeLeft <= 0) {
        for (const [, p] of this.state.players) if (!p.bot && p.score > 0) leaderboard.record(p.name, p.score);
        this.state.phase = "intermission";
        this.state.timeLeft = C.ROUND_INTERMISSION;
      }
      return;
    }

    // Intermission countdown.
    this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
    if (this.state.timeLeft > 0) return;

    if (this.isPublic) {
      // Public rooms: auto-restart into playing.
      for (const [id, p] of this.state.players) {
        p.score = 0;
        this.spawn(id, p);
      }
      this.state.phase = "playing";
      this.state.timeLeft = C.ROUND_SECONDS;
    } else {
      // Private rooms: return to lobby so players can ready up again.
      for (const [, p] of this.state.players) {
        p.score = 0;
        p.ready = false;
        p.alive = false;
      }
      this.lobbyElapsed = 0;
      this.state.phase = "lobby";
      this.state.timeLeft = 0;
    }
  }

  private stepPlane(id: string, p: Player, dt: number, playing: boolean) {
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

  private tryFire(id: string, p: Player) {
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

  private spawnBullet(owner: string, pos: S.Vec3, fwd: S.Vec3, homing: boolean) {
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

  private stepBullets(dt: number, playing: boolean) {
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

  private damage(p: Player, victimId: string, killerId: string) {
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

  private maintainPickups() {
    if (this.state.pickups.size >= C.PICKUP_MAX || this.now < this.pickupAt) return;
    this.pickupAt = this.now + C.PICKUP_INTERVAL;
    const pk = new Pickup();
    pk.type = this.weightedPowerup();
    setP(pk, this.pickPickupPosition());
    this.state.pickups.set(`pk${this.pickupSeq++}`, pk);
  }

  private pickPickupPosition(): S.Vec3 {
    let best = S.vec(0, C.SPAWN_ALT, 0);
    for (let i = 0; i < C.SPAWN_REROLL; i++) {
      const r = Math.pow(Math.random(), 1.35) * C.PICKUP_FIELD_RADIUS;
      const ang = Math.random() * TAU;
      const pos = S.vec(Math.cos(ang) * r, rand(C.PICKUP_ALT_MIN, C.PICKUP_ALT_MAX), Math.sin(ang) * r);
      if (this.insideLandmark(pos, C.PICKUP_RADIUS)) continue;
      best = pos;
      break;
    }
    return best;
  }

  private weightedPowerup(): string {
    let total = 0;
    for (const type of C.POWERUP_TYPES) total += C.POWERUP_WEIGHTS[type] ?? 1;
    let roll = Math.random() * total;
    for (const type of C.POWERUP_TYPES) {
      roll -= C.POWERUP_WEIGHTS[type] ?? 1;
      if (roll <= 0) return type;
    }
    return C.POWERUP_TYPES[0];
  }

  private collectPickups() {
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

  private applyPowerup(id: string, p: Player, type: string) {
    if (type === "repair") { p.hp = C.MAX_HP; return; }
    this.shield.delete(id);
    p.power = type;
    p.powerLeft = C.POWERUP_DURATION;
    this.powerUntil.set(id, this.now + C.POWERUP_DURATION);
    if (type === "shield") this.shield.set(id, C.SHIELD_CHARGES);
  }

  private clearPower(id: string, p?: Player) {
    this.powerUntil.delete(id);
    this.shield.delete(id);
    if (p) { p.power = ""; p.powerLeft = 0; }
  }

  private expirePowers() {
    for (const [id, until] of this.powerUntil) {
      const p = this.state.players.get(id);
      if (!p) { this.powerUntil.delete(id); continue; }
      if (this.now >= until) this.clearPower(id, p);
      else p.powerLeft = Math.max(0, until - this.now);
    }
  }

  private spawn(id: string, p: Player) {
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

  private removePlayer(id: string) {
    // Host reassignment: if the leaving player was host, find the next human.
    if (id === this.state.hostId) {
      let nextHost = "";
      for (const [pid, p] of this.state.players) {
        if (pid !== id && !p.bot) { nextHost = pid; break; }
      }
      this.state.hostId = nextHost;
    }

    this.state.players.delete(id);
    this.clientMap.delete(id);
    this.inputs.delete(id);
    this.lastShot.delete(id);
    this.respawnAt.delete(id);
    this.bots.delete(id);
    this.bulletLife.forEach((_value, key) => {
      const bullet = this.state.bullets.get(key);
      if (bullet && bullet.owner === id) {
        this.state.bullets.delete(key);
        this.bulletLife.delete(key);
      }
    });
    this.powerUntil.delete(id);
    this.shield.delete(id);
    this.invulnUntil.delete(id);
    this.msgTimes.delete(id);
  }

  private startMatch() {
    this.state.phase = "playing";
    this.state.timeLeft = C.ROUND_SECONDS;
    this.lobbyElapsed = 0;
    for (const [id, p] of this.state.players) {
      p.score = 0;
      p.ready = false;
      this.spawn(id, p);
    }
  }

  private checkAutoStart() {
    if (this.state.phase !== "lobby") return;
    let humanCount = 0;
    let readyCount = 0;
    for (const [, p] of this.state.players) {
      if (!p.bot) {
        humanCount++;
        if (p.ready) readyCount++;
      }
    }
    if (humanCount >= 2 && readyCount === humanCount) {
      this.startMatch();
    }
  }

  private maintainBots() {
    if (!this.botsEnabled) {
      for (const id of [...this.bots.keys()]) this.removePlayer(id);
      return;
    }

    const total = this.state.players.size;
    if (total < C.MIN_PLAYERS) {
      this.addBot();
      return;
    }

    if (this.bots.size > 0 && total > C.MIN_PLAYERS) {
      const firstBot = this.bots.keys().next().value as string | undefined;
      if (firstBot) this.removePlayer(firstBot);
    }
  }

  private addBot() {
    const id = `bot_${this.botSeq++}`;
    const p = new Player();
    p.name = C.BOT_NAMES[Math.floor(Math.random() * C.BOT_NAMES.length)];
    p.skin = Math.floor(Math.random() * C.SKIN_COUNT);
    p.bot = true;
    this.spawn(id, p);
    this.state.players.set(id, p);
    this.inputs.set(id, { ...ZERO_INPUT });
    this.bots.set(id, { targetId: null, retargetAt: 0, wanderYaw: rand(-1, 1) });
  }

  private thinkBot(id: string, brain: BotBrain) {
    const me = this.state.players.get(id);
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
    const target = brain.targetId ? this.state.players.get(brain.targetId) : undefined;
    let desired = S.normalize({ x: Math.cos(brain.wanderYaw), y: 0, z: Math.sin(brain.wanderYaw) });
    let fire = false;
    let boost = false;

    const pickup = this.bestPickupForBot(me);
    if (pickup && (!target || me.hp < 45 || me.power === "")) {
      desired = S.normalize(S.sub(pickup, myPos));
    }

    if (target && target.alive) {
      const targetPos = getP(target);
      const leadTime = S.distance(myPos, targetPos) / Math.max(C.BULLET_SPEED, 1) * 0.8;
      const leadPos = S.add(targetPos, S.scale(getF(target), target.speed * leadTime));
      desired = S.normalize(S.sub(leadPos, myPos));
      if (me.hp < 35 && S.distance(myPos, targetPos) < 340) {
        desired = S.normalize(S.add(S.sub(myPos, targetPos), S.scale(normalizeHorizontal({ x: -myPos.x, y: 0, z: -myPos.z }), 0.6)));
        boost = true;
      }
      const aim = Math.abs(signedYaw(myFwd, desired));
      const altDelta = targetPos.y - myPos.y;
      fire = aim < 0.15 && Math.abs(altDelta) < 70 && S.distance(myPos, targetPos) < 560;
      boost = boost || S.distance(myPos, targetPos) > 520;
    } else {
      brain.wanderYaw += rand(-0.25, 0.25);
      desired = S.normalize({ x: Math.cos(brain.wanderYaw), y: signWithDeadzone(C.SPAWN_ALT - myPos.y, 18) * 0.18, z: Math.sin(brain.wanderYaw) });
    }

    const edge = Math.max(Math.abs(myPos.x), Math.abs(myPos.z));
    if (edge > C.MAP_HALF - C.MAP_EDGE_SOFT * 1.1) {
      desired = S.normalize(S.add(desired, S.scale(normalizeHorizontal({ x: -myPos.x, y: 0, z: -myPos.z }), 0.8)));
      boost = true;
    }

    input.turn = signWithDeadzone(signedYaw(myFwd, desired), 0.06);
    input.climb = signWithDeadzone(desired.y, 0.08);
    input.boost = boost;
    input.fire = fire;
    input.seq += 1;
  }

  private pickBotTarget(selfId: string, myPos: S.Vec3): string | null {
    let bestId: string | null = null;
    let bestScore = -Infinity;
    for (const [pid, p] of this.state.players) {
      if (pid === selfId || !p.alive) continue;
      const pos = getP(p);
      const dist = S.distance(myPos, pos);
      const centerBias = 1 - Math.min(1, Math.sqrt(pos.x * pos.x + pos.z * pos.z) / C.MAP_HALF);
      let score = 1 / Math.max(1, dist);
      score += centerBias * 0.004;
      score += (C.MAX_HP - p.hp) * 0.0008;
      if (score > bestScore) { bestScore = score; bestId = pid; }
    }
    return bestId;
  }

  private bestPickupForBot(me: Player): S.Vec3 | null {
    let best: S.Vec3 | null = null;
    let bestScore = -Infinity;
    for (const [, pickup] of this.state.pickups) {
      if (pickup.type === "repair" && me.hp >= C.MAX_HP) continue;
      if (pickup.type === me.power) continue;
      const pos = getP(pickup);
      const dist = S.distance(getP(me), pos);
      if (dist > 500) continue;
      const weight = pickup.type === "shield" && me.hp < 50 ? 4 : pickup.type === "afterburner" ? 2.6 : 1.8;
      const score = weight / Math.max(1, dist);
      if (score > bestScore) { bestScore = score; best = pos; }
    }
    return best;
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

  private rateOk(id: string, max: number): boolean {
    const now = Date.now();
    let arr = this.msgTimes.get(id);
    if (!arr) { arr = []; this.msgTimes.set(id, arr); }
    while (arr.length && now - arr[0] > 1000) arr.shift();
    if (arr.length >= max) return false;
    arr.push(now);
    return true;
  }
}