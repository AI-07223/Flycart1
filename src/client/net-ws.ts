// Single raw-WebSocket transport for SmashCart local-only mode.
// Implements ITransport (same shape the Colyseus Net and WebRtc transports had)
// so main.ts / render3d.ts work unchanged with window.Net pointing at this.
//
// Wire format: JSON text frames per src/shared/protocol.ts. The page is always
// served BY the game server, so the socket URL is just ws(s)://location.host/ws.
//
// Client-side netcode (snapshot buffer + interpolation, local prediction with
// ack reconciliation) is ported verbatim from the proven WebRTC guest path.

import type { ITransport, TransportState } from "./transport";
import { resolveLandmarkCollisions } from "../shared/flight";
import type { C2SMessage, HostSettings, S2CMessage } from "../shared/protocol";
import type { SimStateSnapshot } from "../sim/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INPUT_HZ        = 25;    // client → server input rate (latest-input-wins server-side)
const SNAP_BUFFER_MS  = 1400;  // retention window for the interpolation buffer
const MAX_EXTRAP_MS   = 120;   // extrapolation cap past the newest snapshot
const SNAP_DISTANCE   = 140;   // hard-correction distance for prediction
const WELCOME_TIMEOUT_MS = 10000;

const INPUT_INTERVAL_MS = 1000 / INPUT_HZ;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

interface Vec3 { x: number; y: number; z: number; }

interface SnapshotPlayer {
  p: Vec3; f: Vec3;
  alive: boolean; speed: number;
  turn: number; climb: number; seq: number;
}

interface Snapshot { t: number; players: Record<string, SnapshotPlayer>; }

interface InputState { seq: number; turn: number; climb: number; boost: boolean; fire: boolean; }

interface LocalPose {
  active: boolean; p: Vec3; f: Vec3; speed: number; seq: number;
  turn: number; climb: number; boost: boolean; fire: boolean;
  alive: boolean; ackSeq: number;
}

// ---------------------------------------------------------------------------
// StableMap — a Map whose object reference never changes so render3d.ts
// cannot hold a stale reference. Keys/values are mutated in-place.
// ---------------------------------------------------------------------------

class StableMap<K, V extends object> {
  private _m = new Map<K, V>();

  get size(): number { return this._m.size; }
  get(k: K): V | undefined { return this._m.get(k); }
  forEach(cb: (v: V, k: K) => void): void { this._m.forEach(cb); }

  /** Merge an array of [key, value] entries into this map in-place. */
  mergeFrom(entries: Array<[K, V]>): void {
    const seen = new Set<K>();
    for (const [k, v] of entries) {
      seen.add(k);
      const existing = this._m.get(k);
      if (existing) {
        Object.assign(existing, v);
      } else {
        this._m.set(k, Object.assign({} as V, v));
      }
    }
    for (const k of this._m.keys()) {
      if (!seen.has(k)) this._m.delete(k);
    }
  }
}

// ---------------------------------------------------------------------------
// WsTransportState — implements TransportState backed by StableMaps so the
// render loop always sees the same Map object references across snapshots.
// ---------------------------------------------------------------------------

class WsTransportState implements TransportState {
  players = new StableMap<string, any>();
  bullets = new StableMap<string, any>();
  pickups = new StableMap<string, any>();
  phase       = "lobby";
  timeLeft    = 0;
  hostId      = "";
  roomName    = "";
  roundLength = 150;
  botsInRoom  = false;
  mode        = "ffa";
  teamScore0  = 0;
  teamScore1  = 0;
  botDifficulty = "medium";
}

// ---------------------------------------------------------------------------
// WsTransport — implements ITransport
// ---------------------------------------------------------------------------

export class WsTransport implements ITransport {
  sessionId: string | null = null;
  localPose: LocalPose = {
    active: false,
    p: { x: 0, y: 0, z: 0 },
    f: { x: 1, y: 0, z: 0 },
    speed: 0, seq: 0, turn: 0, climb: 0,
    boost: false, fire: false, alive: false, ackSeq: 0,
  };

  onKill:        ((msg: any) => void) | null = null;
  onPickup:      ((msg: any) => void) | null = null;
  onDisconnect:  ((info: any) => void) | null = null;
  onStateChange: (() => void) | null = null;

  // Internal
  private _ws: WebSocket | null = null;
  private _st: WsTransportState | null = null;
  private _snaps: Snapshot[] = [];
  private _lastSent: InputState = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };
  private _lastSentAt = 0;
  private _leaderId = "";
  private _leaving = false;

  // Saved join args for tryReconnect (single immediate attempt — LAN latency ~ms)
  private _savedName = "";
  private _savedCode = "";
  private _savedCosmetics: { color: number; bodyShape: number; accent: number; trail: number; livery: number } =
    { color: 0, bodyShape: 0, accent: 0, trail: 0, livery: 0 };
  private _savedServerOrigin: string | null = null;

  // Pending connect() settlement
  private _welcomeWait: { resolve: (w: any) => void; reject: (e: any) => void } | null = null;

  // ── ITransport ──────────────────────────────────────────────────────────────

  get state(): TransportState | null {
    return this._st;
  }

  async connect(
    name: string,
    code: string,
    cosmetics: { color: number; bodyShape: number; accent: number; trail: number; livery: number },
    serverOrigin?: string | null
  ): Promise<any> {
    this._savedName = name;
    this._savedCode = code;
    this._savedCosmetics = { ...cosmetics };
    this._savedServerOrigin = serverOrigin ?? null;
    this._leaving = false;

    // Fresh session: reset buffers/prediction
    this._st = new WsTransportState();
    this.sessionId = null;
    this.snaps_clear();
    this.localPose.active = false;
    this._lastSent = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };
    this._lastSentAt = 0;

    if (this._ws) { try { this._ws.close(); } catch {} this._ws = null; }

    const proto = location.protocol === "https:" ? "wss" : "ws";
    const origin = serverOrigin || location.host;
    const ws = new WebSocket(`${proto}://${origin}/ws`);
    this._ws = ws;

    const welcome = new Promise<any>((resolve, reject) => {
      const waiter = { resolve, reject };
      this._welcomeWait = waiter;
      // Watchdog: reject if the welcome hasn't arrived in time
      setTimeout(() => {
        if (this._welcomeWait === waiter) {
          this._welcomeWait = null;
          reject(new Error("Join timed out"));
          try { ws.close(); } catch {}
        }
      }, WELCOME_TIMEOUT_MS);
    });

    ws.onopen = () => {
      // Wire cosmetics use legacy key `color`; the protocol calls it `skin`.
      this._send({
        type: "join",
        name,
        cosmetics: {
          skin: cosmetics.color,
          bodyShape: cosmetics.bodyShape,
          accent: cosmetics.accent,
          trail: cosmetics.trail,
          livery: cosmetics.livery,
        },
      });
    };

    ws.onmessage = (ev) => { this._onMessage(ev.data); };
    ws.onclose = () => { this._onSocketClose(); };
    ws.onerror = () => { /* onclose always follows */ };

    return welcome;
  }

  leave(): void {
    this._leaving = true;
    if (this._welcomeWait) { this._welcomeWait = null; }
    if (this._ws) { try { this._ws.close(); } catch {} this._ws = null; }
    this._st = null;
    this.snaps_clear();
    this.localPose.active = false;
    this.sessionId = null;
  }

  async tryReconnect(): Promise<boolean> {
    if (!this._savedName) return false;
    // Single immediate reconnect attempt — LAN latency is ~ms, no backoff machinery.
    try {
      await this.connect(this._savedName, this._savedCode, this._savedCosmetics, this._savedServerOrigin);
      return true;
    } catch {
      return false;
    }
  }

  // ── LOBBY CONTROL ───────────────────────────────────────────────────────────

  sendReady(): void {
    this._send({ type: "ready" });
  }

  sendHostStart(): void {
    this._send({ type: "host-start" });
  }

  sendHostKick(targetId: string): void {
    this._send({ type: "host-kick", targetId });
  }

  sendHostSettings(s: { roundLength?: number; roomName?: string; botsInRoom?: boolean; mode?: string; botDifficulty?: string }): void {
    // ponytail: protocol HostSettings has no `mode` — dropped until the server grows it.
    const wire: HostSettings = {};
    if (typeof s.roundLength === "number") wire.roundLength = s.roundLength;
    if (typeof s.roomName === "string") wire.roomName = s.roomName;
    if (typeof s.botsInRoom === "boolean") wire.botsInRoom = s.botsInRoom;
    if (typeof s.botDifficulty === "string") wire.botDifficulty = s.botDifficulty as HostSettings["botDifficulty"];
    this._send({ type: "host-settings", settings: wire });
  }

  getPhase(): string | null {
    return this._st ? (this._st.phase || null) : null;
  }

  getHostId(): string | null {
    return this._st ? (this._st.hostId || this._leaderId || null) : null;
  }

  /**
   * Roster rows for lobby rendering — same field shape consumers use today
   * (renderLobbyRoster reads id/name/ready/bot/score/color).
   */
  getRosterSnapshot(): Array<{ id: string; name: string; ready: boolean; bot: boolean; score: number; color: number }> {
    const st = this._st;
    if (!st) return [];
    const out: Array<{ id: string; name: string; ready: boolean; bot: boolean; score: number; color: number }> = [];
    st.players.forEach((p: any, id: string) => {
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
  }

  // ── INPUT ───────────────────────────────────────────────────────────────────

  sendInput(turn: number, climb: number, boost: boolean, fire: boolean): void {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
    const now = performance.now();
    // Coalesce to ~25 Hz: within the window just drop the sample; the next call
    // (≤1 frame later at 60 fps) carries the freshest input state anyway.
    if (now - this._lastSentAt < INPUT_INTERVAL_MS) return;
    const seq = this._lastSent.seq + 1;
    this._lastSent = { seq, turn, climb, boost, fire };
    this._lastSentAt = now;
    this._send({ type: "input", input: { seq, turn, climb, boost, fire } });
  }

  // ── SOCKET PLUMBING ─────────────────────────────────────────────────────────

  private _send(msg: C2SMessage): void {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
    try { this._ws.send(JSON.stringify(msg)); } catch {}
  }

  private _onMessage(data: string | ArrayBuffer): void {
    let msg: S2CMessage;
    try {
      const text = typeof data === "string" ? data : new TextDecoder().decode(data);
      msg = JSON.parse(text);
    } catch {
      return;
    }

    if (msg.type === "welcome") {
      const st = this._st;
      if (!st) return;
      this.sessionId = msg.sessionId;
      this._leaderId = msg.leaderId;
      st.hostId = msg.leaderId;
      st.roomName = msg.room?.name ?? "";
      st.roundLength = msg.room?.roundLength ?? 150;
      st.botsInRoom = msg.room?.botsInRoom ?? false;
      st.botDifficulty = msg.room?.botDifficulty ?? "medium";
      const waiter = this._welcomeWait;
      this._welcomeWait = null;
      if (waiter) waiter.resolve(msg);
      if (this.onStateChange) this.onStateChange();
      return;
    }

    if (msg.type === "state") {
      this._applySnapshot(msg.snap as SimStateSnapshot);
      return;
    }

    if (msg.type === "event") {
      this._onEvent(msg.event);
      return;
    }

    if (msg.type === "error") {
      const waiter = this._welcomeWait;
      if (waiter) {
        this._welcomeWait = null;
        waiter.reject(new Error(msg.message || msg.code));
        return;
      }
      if (!this._leaving && this.onDisconnect) {
        this.onDisconnect({ type: "error", code: msg.code, message: msg.message });
      }
      return;
    }

    // "pong" — latency display is optional and unused today
  }

  private _onEvent(evt: any): void {
    if (evt.type === "kill") {
      // Raw kill event already matches the consumer shape:
      // { killer, victim, killerName, victimName } (see onKill in main.ts).
      if (this.onKill) this.onKill(evt);
    } else if (evt.type === "pickup") {
      if (this.onPickup) this.onPickup({ by: evt.by, type: evt.pickupType });
    } else if (evt.type === "roster-change") {
      // Roster rows are rebuilt from the next/last snapshot; just poke the UI.
      if (this.onStateChange) this.onStateChange();
    } else if (evt.type === "kicked") {
      if (this.onDisconnect) this.onDisconnect({ type: "kicked", reason: "kicked" });
      this._leaving = true;
      if (this._ws) { try { this._ws.close(); } catch {} this._ws = null; }
    }
    // roundEnd: intentionally not forwarded — the intermission UI is driven by
    // the phase flip to "intermission" in snapshots (same as the P2P guest path).
  }

  private _onSocketClose(): void {
    this._ws = null;
    if (this._leaving) return;
    const waiter = this._welcomeWait;
    if (waiter) {
      this._welcomeWait = null;
      waiter.reject(new Error("Connection closed before welcome"));
      return;
    }
    if (this.onDisconnect) this.onDisconnect({ type: "closed", reason: "closed" });
  }

  private snaps_clear(): void {
    this._snaps = [];
  }

  // ── SNAPSHOT HANDLING ───────────────────────────────────────────────────────

  private _applySnapshot(snap: SimStateSnapshot): void {
    const st = this._st;
    if (!st) return;

    st.phase = snap.phase;
    st.timeLeft = snap.timeLeft;
    st.hostId = snap.hostId;
    if (snap.hostId && snap.hostId !== this._leaderId) this._leaderId = snap.hostId;
    st.roomName = snap.roomName ?? "";
    st.roundLength = snap.roundLength ?? 150;
    st.botsInRoom = snap.botsInRoom ?? false;
    st.mode = snap.mode ?? "ffa";
    st.teamScore0 = snap.teamScore0 ?? 0;
    st.teamScore1 = snap.teamScore1 ?? 0;
    st.botDifficulty = snap.botDifficulty ?? "medium";

    // Merge full player records (meta AND position fields) — HUD/roster read
    // meta here; interpolation positions come exclusively from the snap buffer
    // below, so stale px/py in these maps is harmless fallback data only.
    st.players.mergeFrom(snap.players as Array<[string, any]>);
    st.bullets.mergeFrom(snap.bullets as Array<[string, any]>);
    st.pickups.mergeFrom(snap.pickups as Array<[string, any]>);

    this._snapFromSnapshot(snap);
    if (this.onStateChange) this.onStateChange();
  }

  private _authoritativeSelf(): any | null {
    const st = this._st;
    if (!st || !this.sessionId) return null;
    return st.players.get(this.sessionId) || null;
  }

  private _setLocalFromAuth(me: any): void {
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

  /** Push a wire snapshot into the interpolation buffer, then reconcile prediction. */
  private _snapFromSnapshot(snap: SimStateSnapshot): void {
    const players: Record<string, SnapshotPlayer> = {};
    let me: any = null;
    for (const [id, p] of snap.players) {
      players[id] = {
        p: { x: p.px, y: p.py, z: p.pz },
        f: { x: p.fx, y: p.fy, z: p.fz },
        alive: !!p.alive,
        speed: p.speed || 0,
        turn: p.turn || 0,
        climb: p.climb || 0,
        seq: p.seq || 0,
      };
      if (id === this.sessionId) me = p;
    }
    const t = performance.now();
    this._snaps.push({ t, players });
    this._snaps.sort((a, b) => a.t - b.t);
    const cut = t - SNAP_BUFFER_MS;
    while (this._snaps.length > 2 && this._snaps[0].t < cut) this._snaps.shift();

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
  }

  // ── PREDICTION (ported from net.ts — includes landmark collisions) ──────────

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
    const input = this._lastSent;
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
  }

  // ── INTERPOLATION (verbatim from the proven guest path) ─────────────────────

  sample(renderTime: number): Record<string, SnapshotPlayer> {
    const Sp = (window as any).Sphere;
    const snaps = this._snaps;
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
  }
}

declare global {
  interface Window {
    Net: WsTransport;
  }
}

export { WsTransport as default };

export type { Snapshot, SnapshotPlayer, Vec3, LocalPose, InputState, WsTransportState };
