import { resolveLandmarkCollisions } from "../shared/flight";
import type { ITransport, TransportState } from "./transport";

// Thin Colyseus wrapper with flat-world local prediction and bounded remote interpolation.
// Net implements ITransport — the Colyseus path. WebRTC transports will implement ITransport too.

const BUFFER_MS = 1400;
const MAX_EXTRAP_MS = 120;
const SEND_HEARTBEAT_MS = 100;
const SNAP_DISTANCE = 140;

interface Vec3 { x: number; y: number; z: number; }

interface SnapshotPlayer {
  p: Vec3;
  f: Vec3;
  alive: boolean;
  speed: number;
  turn: number;
  climb: number;
  seq: number;
}

interface Snapshot {
  t: number;
  players: Record<string, SnapshotPlayer>;
}

interface LocalPose {
  active: boolean;
  p: Vec3;
  f: Vec3;
  speed: number;
  seq: number;
  turn: number;
  climb: number;
  boost: boolean;
  fire: boolean;
  alive: boolean;
  ackSeq: number;
}

const Net = {
  client: null as any | null,
  room: null as any | null,
  sessionId: null as string | null,
  serverOrigin: null as string | null,
  lastSent: { seq: 0, turn: 0, climb: 0, boost: false, fire: false },
  snaps: [] as Snapshot[],
  onKill: null as ((msg: any) => void) | null,
  onPickup: null as ((msg: any) => void) | null,
  onDisconnect: null as ((info: any) => void) | null,
  onStateChange: null as (() => void) | null,
  reconnectToken: null as string | null,
  _leaving: false,
  _lastSendAt: 0,
  localPose: {
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
    ackSeq: 0,
  } as LocalPose,

  /** ITransport: expose room.state through the abstracted TransportState type. */
  get state(): TransportState | null {
    return (this.room && this.room.state) ? this.room.state : null;
  },

  endpoint(origin: string | null = this.serverOrigin): string {
    if (origin) {
      const url = new URL(origin);
      if (url.protocol === "http:") url.protocol = "ws:";
      if (url.protocol === "https:") url.protocol = "wss:";
      return url.origin;
    }
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}`;
  },

  async connect(name: string, code: string, cosmetics: { color: number; bodyShape: number; accent: number; trail: number; livery: number }, serverOrigin: string | null = null): Promise<any> {
    this.serverOrigin = serverOrigin;
    this.client = new (window as any).Colyseus.Client(this.endpoint(serverOrigin));
    const room = await this.client.joinOrCreate("arena", {
      name,
      code,
      skin: cosmetics.color,
      bodyShape: cosmetics.bodyShape,
      accent: cosmetics.accent,
      trail: cosmetics.trail,
      livery: cosmetics.livery,
    });
    this._wire(room);
    return room;
  },

  _wire(room: any): void {
    this.room = room;
    this.sessionId = room.sessionId;
    this.reconnectToken = room.reconnectionToken;
    this.snaps = [];
    this._leaving = false;
    this.localPose.active = false;
    this.lastSent = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };
    room.onMessage("kill", (msg: any) => { if (this.onKill) this.onKill(msg); });
    room.onMessage("pickup", (msg: any) => { if (this.onPickup) this.onPickup(msg); });
    room.onStateChange(() => { this._snap(); if (this.onStateChange) this.onStateChange(); });
    room.onError((code: any, message: any) => { if (!this._leaving && this.onDisconnect) this.onDisconnect({ type: "error", code, message }); });
    room.onLeave((code: any) => { if (!this._leaving && this.onDisconnect) this.onDisconnect({ type: "leave", code }); });
  },

  async tryReconnect(): Promise<boolean> {
    if (!this.client || !this.reconnectToken) return false;
    try {
      this._wire(await this.client.reconnect(this.reconnectToken));
      return true;
    } catch {
      return false;
    }
  },

  _authoritativeSelf(): any | null {
    if (!this.state || !this.sessionId) return null;
    return this.state.players.get(this.sessionId) || null;
  },

  _setLocalFromAuth(me: any): void {
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
  },

  /** Build a snapshot record from an abstract TransportState and push it into the buffer. */
  _snapFromState(ts: TransportState): void {
    const players: Record<string, SnapshotPlayer> = {};
    ts.players.forEach((p: any, id: string) => {
      players[id] = {
        p: { x: p.px, y: p.py, z: p.pz },
        f: { x: p.fx, y: p.fy, z: p.fz },
        alive: !!p.alive,
        speed: p.speed || 0,
        turn: p.turn || 0,
        climb: p.climb || 0,
        seq: p.seq || 0,
      };
    });
    const t = performance.now();
    this.snaps.push({ t, players });
    // Sort by timestamp — harmless for Colyseus ordered delivery; required for
    // WebRTC out-of-order packets in future slices.
    this.snaps.sort((a, b) => a.t - b.t);
    const cut = t - BUFFER_MS;
    while (this.snaps.length > 2 && this.snaps[0].t < cut) this.snaps.shift();

    const me = this._authoritativeSelf();
    if (!me) return;
    if (!this.localPose.active || !me.alive) {
      this._setLocalFromAuth(me);
      return;
    }

    const Sp = (window as any).Sphere;
    const authPos = { x: me.px, y: me.py, z: me.pz };
    const authFwd = { x: me.fx, y: me.fy, z: me.fz };
    const err = Sp.distance(this.localPose.p, authPos);
    if (err > SNAP_DISTANCE) {
      this._setLocalFromAuth(me);
      return;
    }

    this.localPose.p = Sp.lerpVec(this.localPose.p, authPos, 0.22);
    this.localPose.f = Sp.normalize(Sp.lerpVec(this.localPose.f, authFwd, 0.28));
    this.localPose.speed = me.speed || this.localPose.speed;
    this.localPose.seq = Math.max(this.localPose.seq, me.seq || 0);
    this.localPose.ackSeq = me.seq || this.localPose.ackSeq;
    this.localPose.alive = !!me.alive;
  },

  _snap(): void {
    if (this.state) this._snapFromState(this.state);
  },

  stepLocal(dt: number): void {
    const me = this._authoritativeSelf();
    if (!me) return;
    if (!this.localPose.active) this._setLocalFromAuth(me);
    if (!this.localPose.alive || !me.alive) {
      this._setLocalFromAuth(me);
      return;
    }

    const Sp = (window as any).Sphere;
    const G = window.GAME;
    const input = this.lastSent;
    const angles = Sp.yawPitchFromForward(this.localPose.f);
    const yaw = angles.yaw + input.turn * G.TURN_RATE * dt;
    const pitch = Sp.clamp(angles.pitch + input.climb * G.PITCH_RATE * dt, -G.PITCH_MAX, G.PITCH_MAX);
    let fwd = Sp.yawPitchForward(yaw, pitch);

    let targetSpeed = input.boost ? G.BOOST_SPEED : G.CRUISE_SPEED;
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
        z: Sp.lerp(fwd.z, home.z, edgeT * 0.25),
      });
    }

    let next = Sp.advance(pos, fwd, this.localPose.speed * dt).p;
    const collision = resolveLandmarkCollisions(next, fwd, G.LANDMARKS, G.PLANE_RADIUS);
    next = collision.pos;
    fwd = collision.fwd;
    next.x = Sp.clamp(next.x, -G.MAP_HALF, G.MAP_HALF);
    next.z = Sp.clamp(next.z, -G.MAP_HALF, G.MAP_HALF);
    next.y = Sp.clamp(next.y, G.MIN_ALT, G.MAX_ALT);
    if (next.y <= G.MIN_ALT + 0.01 && fwd.y < 0) fwd = Sp.withPitch(fwd, 0.02);
    if (next.y >= G.MAX_ALT - 0.01 && fwd.y > 0) fwd = Sp.withPitch(fwd, -0.02);

    const authPos = { x: me.px, y: me.py, z: me.pz };
    const authFwd = { x: me.fx, y: me.fy, z: me.fz };
    const err = Sp.distance(next, authPos);
    if (err > SNAP_DISTANCE) {
      next = authPos;
      fwd = authFwd;
      this.localPose.speed = me.speed || this.localPose.speed;
    } else {
      next = Sp.lerpVec(next, authPos, Math.min(0.12, dt * 3.5));
      fwd = Sp.normalize(Sp.lerpVec(fwd, authFwd, Math.min(0.18, dt * 4.5)));
    }

    this.localPose.p = next;
    this.localPose.f = fwd;
    this.localPose.turn = input.turn;
    this.localPose.climb = input.climb;
    this.localPose.boost = input.boost;
    this.localPose.fire = input.fire;
    this.localPose.seq = input.seq;
  },

  sample(renderTime: number): Record<string, SnapshotPlayer> {
    const Sp = (window as any).Sphere;
    const snaps = this.snaps;
    const out: Record<string, SnapshotPlayer> = {};
    if (!snaps.length) return out;

    const clone = (p: SnapshotPlayer): SnapshotPlayer => ({
      p: { ...p.p },
      f: { ...p.f },
      alive: p.alive,
      speed: p.speed,
      turn: p.turn,
      climb: p.climb,
      seq: p.seq,
    });

    const blend = (a: SnapshotPlayer, b: SnapshotPlayer, t: number): SnapshotPlayer => ({
      p: Sp.lerpVec(a.p, b.p, t),
      f: Sp.normalize(Sp.lerpVec(a.f, b.f, t)),
      alive: b.alive,
      speed: Sp.lerp(a.speed, b.speed, t),
      turn: Sp.lerp(a.turn, b.turn, t),
      climb: Sp.lerp(a.climb, b.climb, t),
      seq: b.seq,
    });

    const latest = snaps[snaps.length - 1];
    if (renderTime >= latest.t) {
      if (snaps.length < 2) {
        for (const id in latest.players) out[id] = clone(latest.players[id]);
        return out;
      }
      const prev = snaps[snaps.length - 2];
      const span = latest.t - prev.t || 1;
      const extraMs = Math.min(renderTime - latest.t, MAX_EXTRAP_MS);
      const k = extraMs / span;
      for (const id in latest.players) {
        const b = latest.players[id];
        const a = prev.players[id] || b;
        const blended = blend(a, b, 1 + k);
        blended.p = Sp.add(b.p, Sp.scale(Sp.sub(b.p, a.p), k));
        blended.f = Sp.normalize(Sp.lerpVec(a.f, b.f, 1 + k));
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
    const span = b.t - a.t || 1;
    const t = (renderTime - a.t) / span;
    for (const id in b.players) {
      const bp = b.players[id];
      const ap = a.players[id] || bp;
      out[id] = blend(ap, bp, t);
    }
    return out;
  },

  sendInput(turn: number, climb: number, boost: boolean, fire: boolean): void {
    if (!this.room) return;
    const now = performance.now();
    const last = this.lastSent;
    const changed = Math.abs(turn - last.turn) >= 0.03 || Math.abs(climb - last.climb) >= 0.03 || boost !== last.boost || fire !== last.fire;
    if (!changed && now - this._lastSendAt < SEND_HEARTBEAT_MS) return;
    this.lastSent = { seq: last.seq + 1, turn, climb, boost, fire };
    this._lastSendAt = now;
    this.room.send("input", this.lastSent);
  },

  setName(name: string): void {
    if (this.room) this.room.send("setName", name);
  },

  // ── Lobby helpers (Slice 6) ──────────────────────────────────────────────

  /** Toggle own ready state. Server authoritative — drives UI via onStateChange. */
  sendReady(): void {
    if (this.room) this.room.send("setReady");
  },

  /** Host-only: force-start the match. No-op if not host. */
  sendHostStart(): void {
    if (this.room) this.room.send("hostStart");
  },

  /** Host-only: kick a player by their sessionId. */
  sendHostKick(targetId: string): void {
    if (this.room) this.room.send("hostKick", { targetId });
  },

  /** Host-only: update room settings (roundLength, roomName, botsInRoom, and/or mode). */
  sendHostSettings(s: { roundLength?: number; roomName?: string; botsInRoom?: boolean; mode?: string; botDifficulty?: string }): void {
    if (this.room) this.room.send("hostSettings", s);
  },

  /** Current room phase ('lobby' | 'playing' | 'intermission'), or null if not connected. */
  getPhase(): string | null {
    return (this.room && this.room.state) ? (this.room.state.phase || null) : null;
  },

  /** hostId from server state, or null. */
  getHostId(): string | null {
    return (this.room && this.room.state) ? (this.room.state.hostId || null) : null;
  },

  /**
   * Snapshot of all players for lobby roster rendering.
   * Returns an array of plain objects so callers don't hold live MapSchema refs.
   */
  getRosterSnapshot(): Array<{ id: string; name: string; ready: boolean; bot: boolean; score: number; color: number }> {
    if (!this.room || !this.room.state || !this.room.state.players) return [];
    const out: Array<{ id: string; name: string; ready: boolean; bot: boolean; score: number; color: number }> = [];
    this.room.state.players.forEach((p: any, id: string) => {
      out.push({
        id,
        name: p.name || "Pilot",
        ready: !!p.ready,
        bot: !!p.bot,
        score: p.score || 0,
        color: p.skin || 0,
      });
    });
    return out;
  },

  leave(): void {
    this._leaving = true;
    if (this.room) {
      try { this.room.leave(); } catch {}
      this.room = null;
    }
    this.snaps = [];
    this.localPose.active = false;
  },
};

(window as any).Net = Net;
