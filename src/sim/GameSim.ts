// Framework-agnostic authoritative simulation for SmashCart.
// No Colyseus, no Node.js, no leaderboard, no Sentry.
// Imports ONLY from src/shared/* and src/sim/types.

import * as C from "../shared/constants";
import { resolveLandmarkCollisions } from "../shared/flight";
import * as S from "../shared/sphere";
import type {
  BotBrain,
  GameSimOpts,
  Input,
  JoinOpts,
  SimBullet,
  SimEvent,
  SimPickup,
  SimPlayer,
  SimStateSnapshot,
} from "./types";

// ---------------------------------------------------------------------------
// Local helpers (verbatim from ArenaRoom)
// ---------------------------------------------------------------------------

const ZERO_INPUT: Input = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };
const TAU = Math.PI * 2;

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
// GameSim
// ---------------------------------------------------------------------------

export class GameSim {
  // Simulation state — plain Maps of plain objects.
  readonly players = new Map<string, SimPlayer>();
  readonly bullets = new Map<string, SimBullet>();
  readonly pickups = new Map<string, SimPickup>();

  // Side-channel Maps (verbatim from ArenaRoom private fields).
  private inputs = new Map<string, Input>();
  private lastShot = new Map<string, number>();
  private respawnAt = new Map<string, number>();
  private bots = new Map<string, BotBrain>();
  private bulletLife = new Map<string, number>();
  private powerUntil = new Map<string, number>();
  private shield = new Map<string, number>();
  private invulnUntil = new Map<string, number>();

  // Scalar sim state.
  now = 0;
  private bulletSeq = 0;
  private botSeq = 0;
  private pickupSeq = 0;
  private pickupAt = 0;
  lobbyElapsed = 0;
  phase: string;
  timeLeft: number;
  hostId = "";
  roundLength: number;
  roomName: string;
  botsInRoom: boolean;
  mode: string;
  teamScore0: number;
  teamScore1: number;
  readonly botsEnabled: boolean;
  readonly isPublic: boolean;

  private readonly onEvent: (e: SimEvent) => void;

  constructor(opts: GameSimOpts) {
    this.botsEnabled = opts.botsEnabled;
    this.isPublic = opts.isPublic;
    this.onEvent = opts.onEvent;
    this.roundLength = C.ROUND_SECONDS;
    this.roomName = "";
    this.botsInRoom = opts.botsEnabled;
    this.mode = "ffa";
    this.teamScore0 = 0;
    this.teamScore1 = 0;

    if (this.isPublic) {
      this.phase = "playing";
      this.timeLeft = C.ROUND_SECONDS;
    } else {
      this.phase = "lobby";
      this.timeLeft = 0;
      this.lobbyElapsed = 0;
    }

    // Host migration: restore state from a prior host's snapshot.
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
  private _restoreFromSnapshot(snap: SimStateSnapshot): void {
    // Scalars
    this.phase        = snap.phase        ?? this.phase;
    this.timeLeft     = snap.timeLeft     ?? this.timeLeft;
    this.hostId       = snap.hostId       ?? this.hostId;
    this.roundLength  = snap.roundLength  ?? this.roundLength;
    this.roomName     = snap.roomName     ?? this.roomName;
    this.botsInRoom   = snap.botsInRoom   ?? this.botsInRoom;
    this.mode         = snap.mode         ?? this.mode;
    this.teamScore0   = snap.teamScore0   ?? this.teamScore0;
    this.teamScore1   = snap.teamScore1   ?? this.teamScore1;

    // Players — restore without calling addPlayer (which would overwrite stats)
    this.players.clear();
    this.inputs.clear();
    const ZERO: Input = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };
    if (Array.isArray(snap.players)) {
      for (const [id, p] of snap.players) {
        this.players.set(id, { ...p });
        // Zero input with the player's last known seq so applyInputPatch won't reject future inputs
        this.inputs.set(id, { ...ZERO, seq: p.seq ?? 0 });
      }
    }

    // Pickups
    this.pickups.clear();
    if (Array.isArray(snap.pickups)) {
      for (const [id, pk] of snap.pickups) {
        this.pickups.set(id, { ...pk });
      }
    }

    // Bullets: skip (in-flight loss is acceptable per design spec)
    this.bullets.clear();
    this.bulletLife.clear();

    // Ensure bulletSeq won't collide with any future bullets
    this.bulletSeq = 0;

    // Reset sim clock; host loop starts fresh from 0
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
  addPlayer(id: string, opts: JoinOpts): SimPlayer {
    const p: SimPlayer = {
      name: opts.name,
      px: 0, py: C.SPAWN_ALT, pz: 0,
      fx: 1, fy: 0, fz: 0,
      seq: 0,
      speed: 0,
      turn: 0,
      climb: 0,
      hp: C.MAX_HP,
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
      team: -1,
    };

    if (this.isPublic) {
      this.spawn(id, p);
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
  removePlayer(id: string): string {
    // Host reassignment: if the leaving player was host, find the next human.
    if (id === this.hostId) {
      let nextHost = "";
      for (const [pid, p] of this.players) {
        if (pid !== id && !p.bot) { nextHost = pid; break; }
      }
      this.hostId = nextHost;
    }

    this.players.delete(id);
    this.inputs.delete(id);
    this.lastShot.delete(id);
    this.respawnAt.delete(id);
    this.bots.delete(id);
    // Remove all bullets owned by this player.
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
  applyInput(id: string, data: unknown): void {
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
  zeroInput(id: string): void {
    const cur = this.inputs.get(id);
    if (!cur) return;
    this.inputs.set(id, { ...ZERO_INPUT, seq: cur.seq });
  }

  setPlayerName(id: string, name: string): void {
    const p = this.players.get(id);
    if (p) p.name = name;
  }

  setReady(id: string): void {
    const p = this.players.get(id);
    if (!p || p.bot) return;
    p.ready = !p.ready;
    this.checkAutoStart();
  }

  hostStart(callerId: string): void {
    if (callerId !== this.hostId) return;
    if (this.phase !== "lobby") return;
    this.startMatch();
  }

  /**
   * Update host-controlled room settings (round length, room name, and/or bots).
   * Silently ignores calls from non-hosts.
   */
  setHostSettings(callerId: string, s: { roundLength?: number; roomName?: string; botsInRoom?: boolean; mode?: string }): void {
    if (callerId !== this.hostId) return;
    if (typeof s.roundLength === "number" && Number.isFinite(s.roundLength)) {
      this.roundLength = Math.max(60, Math.min(300, Math.round(s.roundLength)));
    }
    if (typeof s.roomName === "string") {
      this.roomName = s.roomName.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 20);
    }
    if (typeof s.botsInRoom === "boolean" && !this.isPublic) {
      this.botsInRoom = s.botsInRoom;
      // Apply immediately: if turned off, remove any existing bots now
      if (!this.botsInRoom) {
        for (const id of [...this.bots.keys()]) this.removePlayer(id);
      }
      // If turned on, maintainBots() will add bots on the next tick
    }
    if (typeof s.mode === "string" && (s.mode === "ffa" || s.mode === "tdm")) {
      this.mode = s.mode;
    }
  }

  /**
   * Validates and removes the target player from the sim.
   * Returns the targetId to kick at the transport layer, or null if invalid.
   * The actual client.leave() call stays in ArenaRoom.
   */
  hostKick(callerId: string, targetId: string): string | null {
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
  tick(dt: number): void {
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
  getState(): {
    players: ReadonlyMap<string, SimPlayer>;
    bullets: ReadonlyMap<string, SimBullet>;
    pickups: ReadonlyMap<string, SimPickup>;
    phase: string;
    timeLeft: number;
    hostId: string;
    roundLength: number;
    roomName: string;
    botsInRoom: boolean;
    mode: string;
    teamScore0: number;
    teamScore1: number;
  } {
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
    };
  }

  /**
   * Deep plain-object copy of all state — suitable for P2P snapshot transmission.
   */
  snapshot(): SimStateSnapshot {
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
    };
  }

  // ---------------------------------------------------------------------------
  // Internal simulation methods (moved verbatim from ArenaRoom, substitutions applied)
  // ---------------------------------------------------------------------------

  private updateTimer(dt: number): void {
    if (this.phase === "lobby") {
      // Count human players only.
      let humanCount = 0;
      for (const [, p] of this.players) if (!p.bot) humanCount++;
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

    if (this.phase === "playing") {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.timeLeft <= 0) {
        // Emit roundEnd event — ArenaRoom handles leaderboard.record().
        const scores = Array.from(this.players.values())
          .filter((p) => !p.bot && p.score > 0)
          .map((p) => ({ name: p.name, score: p.score }));
        this.onEvent({ type: "roundEnd", scores });
        this.phase = "intermission";
        this.timeLeft = C.ROUND_INTERMISSION;
      }
      return;
    }

    // Intermission countdown.
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.timeLeft > 0) return;

    if (this.isPublic) {
      // Public rooms: auto-restart into playing.
      for (const [id, p] of this.players) {
        p.score = 0;
        this.spawn(id, p);
      }
      this.phase = "playing";
      this.timeLeft = C.ROUND_SECONDS;
    } else {
      // Private rooms: return to lobby so players can ready up again.
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

  private stepPlane(id: string, p: SimPlayer, dt: number, playing: boolean): void {
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

  private tryFire(id: string, p: SimPlayer): void {
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

  spawnBullet(owner: string, pos: S.Vec3, fwd: S.Vec3, homing: boolean): void {
    const b: SimBullet = {
      px: 0, py: 0, pz: 0,
      fx: 1, fy: 0, fz: 0,
      owner,
      homing,
    };
    const start = S.add(pos, S.scale(S.normalize(fwd), C.PLANE_RADIUS + 10));
    setP(b, start);
    setF(b, S.normalize(fwd));
    const key = `b${this.bulletSeq++}`;
    this.bulletLife.set(key, C.BULLET_LIFE);
    this.bullets.set(key, b);
  }

  private stepBullets(dt: number, playing: boolean): void {
    for (const [key, b] of this.bullets) {
      const life = (this.bulletLife.get(key) ?? C.BULLET_LIFE) - dt;
      if (life <= 0) {
        this.bullets.delete(key);
        this.bulletLife.delete(key);
        continue;
      }
      this.bulletLife.set(key, life);

      let pos = getP(b);
      let fwd = S.normalize(getF(b));

      if (b.homing) {
        // Full homing powerup: strong turn rate, no cone restriction.
        const target = this.closestTarget(b.owner, pos);
        if (target) {
          const desired = S.normalize(S.sub(getP(target.player), pos));
          fwd = steerToward(fwd, desired, C.HOMING_TURN * dt);
        }
      } else {
        // Aim-assist: mild magnetism for human-owned bullets only.
        const ownerPlayer = this.players.get(b.owner);
        if (ownerPlayer && !ownerPlayer.bot) {
          // Find the nearest alive enemy within AIM_ASSIST_RANGE whose bearing
          // from the bullet's current forward is within AIM_ASSIST_CONE.
          let bestAssistDist = Infinity;
          let assistTarget: SimPlayer | null = null;
          for (const [pid, p] of this.players) {
            if (!p.alive || pid === b.owner) continue;
            const toTarget = S.sub(getP(p), pos);
            const dist = S.len(toTarget);
            if (dist > C.AIM_ASSIST_RANGE) continue;
            // Angle between bullet forward and direction to target.
            const angle = S.angBetween(fwd, S.normalize(toTarget));
            if (angle > C.AIM_ASSIST_CONE) continue;
            if (dist < bestAssistDist) {
              bestAssistDist = dist;
              assistTarget = p;
            }
          }
          if (assistTarget) {
            const desired = S.normalize(S.sub(getP(assistTarget), pos));
            fwd = steerToward(fwd, desired, C.AIM_ASSIST_TURN * dt);
          }
        }
      }

      const prev = pos;
      pos = S.advance(pos, fwd, C.BULLET_SPEED * dt).p;

      let bestT = Infinity;
      let victim: SimPlayer | null = null;
      let victimId = "";
      let blocked = false;

      if (playing) {
        for (const [pid, p] of this.players) {
          if (!p.alive || pid === b.owner) continue;
          const targetPos = getP(p);
          // BULLET_HIT_RADIUS (larger, forgiving) for player hits only.
          // Landmark/cover collision still uses its own radius below.
          const hitDist = C.BULLET_HIT_RADIUS + C.BULLET_RADIUS;
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
        this.bullets.delete(key);
        this.bulletLife.delete(key);
        continue;
      }

      if (Math.abs(pos.x) > C.MAP_HALF || Math.abs(pos.z) > C.MAP_HALF || pos.y < C.GROUND_Y || pos.y > C.MAX_ALT + 40) {
        this.bullets.delete(key);
        this.bulletLife.delete(key);
        continue;
      }

      setP(b, pos);
      setF(b, fwd);
    }
  }

  private damage(p: SimPlayer, victimId: string, killerId: string): void {
    // TDM friendly-fire gate: bullets do NOT damage teammates.
    if (this.mode === "tdm") {
      const killer = this.players.get(killerId);
      if (killer && killer.team >= 0 && p.team >= 0 && killer.team === p.team) return;
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

    p.hp -= C.BULLET_DAMAGE;
    if (p.hp > 0) return;

    p.hp = 0;
    p.alive = false;
    p.boosting = false;
    p.turn = 0;
    p.climb = 0;
    this.clearPower(victimId, p);
    this.respawnAt.set(victimId, this.now + C.RESPAWN_DELAY);

    const killer = this.players.get(killerId);
    if (killer && killerId !== victimId) {
      killer.score += 1;
      // TDM: also increment the killer's team score (only for kills between different teams).
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
      victimName: p.name,
    });
  }

  private maintainPickups(): void {
    if (this.pickups.size >= C.PICKUP_MAX || this.now < this.pickupAt) return;
    this.pickupAt = this.now + C.PICKUP_INTERVAL;
    const pk: SimPickup = {
      type: this.weightedPowerup(),
      px: 0, py: 0, pz: 0,
    };
    setP(pk, this.pickPickupPosition());
    this.pickups.set(`pk${this.pickupSeq++}`, pk);
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

  private collectPickups(): void {
    for (const [key, pk] of this.pickups) {
      const pkPos = getP(pk);
      for (const [pid, p] of this.players) {
        if (!p.alive) continue;
        if (S.distance(pkPos, getP(p)) > C.PICKUP_RADIUS + C.PLANE_RADIUS) continue;
        if (pk.type === "repair" && p.hp >= C.MAX_HP) continue;
        this.applyPowerup(pid, p, pk.type);
        this.pickups.delete(key);
        this.onEvent({ type: "pickup", by: pid, pickupType: pk.type });
        break;
      }
    }
  }

  private applyPowerup(id: string, p: SimPlayer, type: string): void {
    if (type === "repair") { p.hp = C.MAX_HP; return; }
    this.shield.delete(id);
    p.power = type;
    p.powerLeft = C.POWERUP_DURATION;
    this.powerUntil.set(id, this.now + C.POWERUP_DURATION);
    if (type === "shield") this.shield.set(id, C.SHIELD_CHARGES);
  }

  private clearPower(id: string, p?: SimPlayer): void {
    this.powerUntil.delete(id);
    this.shield.delete(id);
    if (p) { p.power = ""; p.powerLeft = 0; }
  }

  private expirePowers(): void {
    for (const [id, until] of this.powerUntil) {
      const p = this.players.get(id);
      if (!p) { this.powerUntil.delete(id); continue; }
      if (this.now >= until) this.clearPower(id, p);
      else p.powerLeft = Math.max(0, until - this.now);
    }
  }

  spawn(id: string, p: SimPlayer): void {
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
      for (const [, other] of this.players) {
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

  private startMatch(): void {
    this.phase = "playing";
    this.timeLeft = this.roundLength;
    this.lobbyElapsed = 0;
    this.teamScore0 = 0;
    this.teamScore1 = 0;

    if (this.mode === "tdm") {
      // Assign balanced teams: alternate assignment sorted by insertion order.
      let teamIdx = 0;
      for (const [, p] of this.players) {
        p.team = teamIdx % C.TEAM_COUNT;
        teamIdx++;
      }
    }

    for (const [id, p] of this.players) {
      p.score = 0;
      p.ready = false;
      this.spawn(id, p);
    }
  }

  private checkAutoStart(): void {
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

  private maintainBots(): void {
    // Public rooms: use botsEnabled (original behavior, unaffected by botsInRoom toggle).
    // Private rooms: gate on botsInRoom (the host toggle).
    const shouldMaintain = this.isPublic ? this.botsEnabled : (this.botsEnabled && this.botsInRoom);

    if (!shouldMaintain) {
      for (const id of [...this.bots.keys()]) this.removePlayer(id);
      return;
    }

    const total = this.players.size;
    if (total < C.MIN_PLAYERS) {
      this.addBot();
      return;
    }

    if (this.bots.size > 0 && total > C.MIN_PLAYERS) {
      const firstBot = this.bots.keys().next().value as string | undefined;
      if (firstBot) this.removePlayer(firstBot);
    }
  }

  private addBot(): void {
    const id = `bot_${this.botSeq++}`;
    const p: SimPlayer = {
      name: C.BOT_NAMES[Math.floor(Math.random() * C.BOT_NAMES.length)],
      px: 0, py: 0, pz: 0,
      fx: 1, fy: 0, fz: 0,
      seq: 0,
      speed: 0,
      turn: 0,
      climb: 0,
      hp: C.MAX_HP,
      score: 0,
      skin: Math.floor(Math.random() * C.SKIN_COUNT),
      alive: true,
      bot: true,
      boosting: false,
      power: "",
      powerLeft: 0,
      ready: false,
      bodyShape: Math.floor(Math.random() * 2), // capped [0,1] to protect mobile draw calls
      accent: Math.floor(Math.random() * C.ACCENT_COUNT),
      trail: Math.floor(Math.random() * C.TRAIL_COUNT),
      livery: Math.floor(Math.random() * C.LIVERY_COUNT),
      team: -1,
    };
    // If a TDM match is already in progress, assign to the smaller team.
    if (this.mode === "tdm" && this.phase === "playing") {
      let t0 = 0; let t1 = 0;
      for (const [, pl] of this.players) { if (pl.team === 0) t0++; else if (pl.team === 1) t1++; }
      p.team = t0 <= t1 ? 0 : 1;
    }
    this.spawn(id, p);
    this.players.set(id, p);
    this.inputs.set(id, { ...ZERO_INPUT });
    this.bots.set(id, { targetId: null, retargetAt: 0, wanderYaw: rand(-1, 1) });
  }

  private thinkBot(id: string, brain: BotBrain): void {
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
    const target = brain.targetId ? this.players.get(brain.targetId) : undefined;
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
    for (const [pid, p] of this.players) {
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

  private bestPickupForBot(me: SimPlayer): S.Vec3 | null {
    let best: S.Vec3 | null = null;
    let bestScore = -Infinity;
    for (const [, pickup] of this.pickups) {
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

  private closestTarget(owner: string, pos: S.Vec3): { id: string; player: SimPlayer } | null {
    let best: { id: string; player: SimPlayer } | null = null;
    let bestDist = Infinity;
    for (const [id, p] of this.players) {
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

// ---------------------------------------------------------------------------
// applyInputPatch — kept here (not in types.ts) since it's sim logic.
// ArenaRoom calls sim.applyInput() which delegates here.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
