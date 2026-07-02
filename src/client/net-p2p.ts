// WebRTC peer-to-peer transport for SmashCart.
// Implements ITransport (same shape as Net in net.ts) so main.ts / render3d.js
// work unchanged when window.Net is swapped to this object.
//
// Star topology: the HOST runs GameSim locally and is authoritative.
// GUESTs connect to the host via RTCPeerConnection.  Signaling uses a
// lightweight JSON-over-WebSocket broker at (origin)/signal.
//
// P2P room codes are prefixed 'P-' (6 chars after the prefix).
// Offline QR handshake: host encodes SDP offer as base64url → QR; guest
// encodes answer → QR; host sets answer.  No signaling server needed.

import type { ITransport, TransportState } from "./transport";
import { GameSim } from "../sim/GameSim";
import type { SimEvent } from "../sim/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DT_MAX          = 0.05;          // host fixed-step cap (s)
const STATE_HZ        = 30;            // host → guest state broadcast rate
const INPUT_HZ        = 25;            // guest → host input rate
const SNAP_BUFFER_MS  = 1400;
const MAX_EXTRAP_MS   = 120;
const SNAP_DISTANCE   = 140;
const MAX_GUESTS      = 19;           // host + 19 guests = 20-player rooms
const ICE_SERVER      = "stun:stun.l.google.com:19302";
const STUN_ICE: RTCIceServer[] = [{ urls: ICE_SERVER }];
const DC_OPEN_TIMEOUT = 2000;          // ms — iOS DataChannel open watchdog

// ---------------------------------------------------------------------------
// Shared helpers — mirrored from net.ts so guests get the same prediction
// ---------------------------------------------------------------------------

interface Vec3 { x: number; y: number; z: number; }

interface SnapshotPlayer {
  p: Vec3; f: Vec3;
  alive: boolean; speed: number;
  turn: number; climb: number; seq: number;
}

interface Snapshot { t: number; players: Record<string, SnapshotPlayer>; }

interface LocalPose {
  active: boolean; p: Vec3; f: Vec3; speed: number; seq: number;
  turn: number; climb: number; boost: boolean; fire: boolean;
  alive: boolean; ackSeq: number;
}

// ---------------------------------------------------------------------------
// StableMap — a Map whose object reference never changes so render3d.js
// cannot hold a stale reference.  Keys/values are mutated in-place.
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
// GuestTransportState — implements TransportState backed by StableMaps so the
// render loop always sees the same Map object references.
// ---------------------------------------------------------------------------

class GuestTransportState implements TransportState {
  players = new StableMap<string, any>();
  bullets = new StableMap<string, any>();
  pickups = new StableMap<string, any>();
  phase    = "lobby";
  timeLeft  = 0;
  hostId   = "";
  roomName  = "";
  roundLength = 150;
  botsInRoom  = false;
  mode     = "ffa";
  teamScore0  = 0;
  teamScore1  = 0;
  botDifficulty = "medium";
  // Carried from the host's snapshot so a migration-elected new host can
  // reconstruct its GameSim with the same botsEnabled/isPublic semantics.
  botsEnabled = false;
  isPublic    = false;
}

// ---------------------------------------------------------------------------
// HostTransportState — thin wrapper so TransportState is backed by GameSim's
// own Maps (which are real ES6 Maps and satisfy MapLike).
// ---------------------------------------------------------------------------

class HostTransportState implements TransportState {
  constructor(private sim: GameSim) {}
  get players(): Map<string, any>  { return this.sim.players as Map<string, any>; }
  get bullets(): Map<string, any>  { return this.sim.bullets as Map<string, any>; }
  get pickups(): Map<string, any>  { return this.sim.pickups as Map<string, any>; }
  get phase():    string            { return this.sim.phase; }
  get timeLeft(): number            { return this.sim.timeLeft; }
  get hostId():   string            { return this.sim.hostId; }
  get roomName(): string            { return this.sim.roomName; }
  get roundLength(): number         { return this.sim.roundLength; }
  get botsInRoom(): boolean         { return this.sim.botsInRoom; }
  get mode(): string                { return this.sim.mode; }
  get teamScore0(): number          { return this.sim.teamScore0; }
  get teamScore1(): number          { return this.sim.teamScore1; }
  get botDifficulty(): string       { return this.sim.botDifficulty; }
}

// ---------------------------------------------------------------------------
// Signaling client
// ---------------------------------------------------------------------------

type SignalMsg =
  | { type: "host";           room: string; name?: string; hostName?: string }
  | { type: "join";           room: string; peerId: string }
  | { type: "peer-joined";    peerId: string }
  | { type: "hosted";         room: string; peers?: string[] }
  | { type: "host-migrating"; room: string; nextHost: string }
  | { type: "host-arrived";   room: string }
  | { type: "host-left";      room: string }
  | { type: "offer";  room: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; room: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice";    room: string; to: string; candidate: RTCIceCandidateInit };

class SignalSocket {
  private ws: WebSocket | null = null;
  private queue: SignalMsg[] = [];
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  onMessage: ((msg: SignalMsg) => void) | null = null;
  onClose: (() => void) | null = null;

  /** Set before open() to include room display name and host call sign in the host registration. */
  hostRoomName?: string;
  hostCallSign?: string;

  open(room: string, role: "host" | "join", peerId?: string): Promise<void> {
    // Close any existing socket before re-opening (migration re-connect path)
    this._stopKeepalive();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.close(); } catch {}
    }
    return new Promise((resolve, reject) => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const url   = `${proto}://${location.host}/signal`;
      const ws    = new WebSocket(url);
      this.ws     = ws;

      ws.onopen = () => {
        if (role === "host") {
          const hostMsg: SignalMsg = { type: "host", room };
          if (this.hostRoomName !== undefined) (hostMsg as any).name = this.hostRoomName;
          if (this.hostCallSign !== undefined) (hostMsg as any).hostName = this.hostCallSign;
          this.send(hostMsg);
          // Keepalive: the broker prunes rooms idle > 30s (ROOM_TTL_MS) and a
          // continuous host otherwise sends nothing after registering, which
          // made rooms vanish from the directory (and blocked late joins).
          // Any message with a valid room code touches the room's TTL.
          this._startKeepalive(room);
        } else {
          this.send({ type: "join", room, peerId: peerId! });
        }
        // Flush queued messages that arrived before open
        for (const m of this.queue) this._rawSend(m);
        this.queue = [];
        resolve();
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as SignalMsg;
          if (this.onMessage) this.onMessage(msg);
        } catch {}
      };

      ws.onerror   = () => reject(new Error("Signal WS error"));
      ws.onclose   = () => { this._stopKeepalive(); if (this.onClose) this.onClose(); };
    });
  }

  send(msg: SignalMsg): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.queue.push(msg);
      return;
    }
    this._rawSend(msg);
  }

  private _rawSend(msg: SignalMsg): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close(): void {
    this._stopKeepalive();
    if (this.ws) { try { this.ws.close(); } catch {} this.ws = null; }
  }

  private _startKeepalive(room: string): void {
    this._stopKeepalive();
    this.keepaliveTimer = setInterval(() => {
      this._rawSend({ type: "ping", room } as unknown as SignalMsg);
    }, 12_000);
  }

  private _stopKeepalive(): void {
    if (this.keepaliveTimer !== null) { clearInterval(this.keepaliveTimer); this.keepaliveTimer = null; }
  }
}

// ---------------------------------------------------------------------------
// DataChannel helpers
// ---------------------------------------------------------------------------

interface PeerChannels {
  pc:     RTCPeerConnection;
  state:  RTCDataChannel | null;   // host→guest: ordered, maxRetransmits:0
  inputs: RTCDataChannel | null;   // guest→host: unordered, maxRetransmits:0
  events: RTCDataChannel | null;   // reliable both-ways
}

function makePeerConnection(iceServers: RTCIceServer[]): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers });
}

// Open an ordered-reliable fallback for the inputs channel if the unordered
// channel fails to open within DC_OPEN_TIMEOUT ms (iOS Safari quirk).
function watchInputChannelFallback(
  pc: RTCPeerConnection,
  onFallback: (dc: RTCDataChannel) => void
): RTCDataChannel {
  const dc = pc.createDataChannel("inputs", {
    ordered: false,
    maxRetransmits: 0,
  });
  dc.binaryType = "arraybuffer";

  let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
    if (dc.readyState !== "open") {
      // Create ordered fallback
      const fallback = pc.createDataChannel("inputs-fallback", { ordered: true });
      fallback.binaryType = "arraybuffer";
      fallback.onopen = () => onFallback(fallback);
    }
  }, DC_OPEN_TIMEOUT);

  dc.onopen = () => { if (timer !== null) { clearTimeout(timer); timer = null; } };
  return dc;
}

// ---------------------------------------------------------------------------
// Offline QR helpers
// ---------------------------------------------------------------------------

async function compressB64(text: string): Promise<string> {
  try {
    const enc  = new TextEncoder().encode(text);
    const cs   = new (window as any).CompressionStream("deflate-raw");
    const w    = cs.writable.getWriter();
    const r    = cs.readable.getReader();
    w.write(enc);
    w.close();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await r.read();
      if (done) break;
      chunks.push(value);
    }
    const buf  = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
    let offset = 0;
    for (const c of chunks) { buf.set(c, offset); offset += c.length; }
    // base64url encode
    let b64 = btoa(String.fromCharCode(...buf));
    b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    return b64;
  } catch {
    // CompressionStream not available — return raw base64url of the text
    let b64 = btoa(unescape(encodeURIComponent(text)));
    b64 = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    return b64;
  }
}

async function decompressB64(b64url: string): Promise<string> {
  try {
    // Re-pad
    let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const bin  = atob(b64);
    const buf  = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);

    try {
      const ds   = new (window as any).DecompressionStream("deflate-raw");
      const w    = ds.writable.getWriter();
      const r    = ds.readable.getReader();
      w.write(buf);
      w.close();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await r.read();
        if (done) break;
        chunks.push(value);
      }
      const total = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
      let offset  = 0;
      for (const c of chunks) { total.set(c, offset); offset += c.length; }
      return new TextDecoder().decode(total);
    } catch {
      // Treat as raw base64url text
      return decodeURIComponent(escape(atob(b64)));
    }
  } catch {
    return b64url;
  }
}

// Strip non-private-range candidates from an SDP string so the QR payload is
// small (LAN-only candidates stay, mDNS candidates are filtered out).
function filterSdpToLocal(sdp: string): string {
  return sdp.split("\n").filter((line) => {
    if (!line.startsWith("a=candidate:")) return true;
    // Keep private-range IPv4: 10.x, 172.16-31.x, 192.168.x
    if (/\b10\.\d+\.\d+\.\d+\b/.test(line))   return true;
    if (/\b172\.(1[6-9]|2\d|3[01])\.\d+\.\d+\b/.test(line)) return true;
    if (/\b192\.168\.\d+\.\d+\b/.test(line))  return true;
    // Keep IPv6 link-local (fe80::)
    if (/\bfe80::/i.test(line))                return true;
    // Keep loopback for single-device testing
    if (/\b127\.0\.0\.1\b/.test(line))         return true;
    return false;
  }).join("\n");
}

// ---------------------------------------------------------------------------
// WebRtcTransport — implements ITransport
// ---------------------------------------------------------------------------

export class WebRtcTransport implements ITransport {
  // ITransport fields
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
  private _isHost  = false;
  private _room    = "";
  private _signal: SignalSocket | null = null;

  // HOST-only
  private _sim:         GameSim | null       = null;
  private _hostState:   HostTransportState | null = null;
  // Room settings this peer started as host with — carried across host migration
  // so a re-elected host preserves the original bots/continuous semantics.
  private _botsEnabled: boolean = false;
  private _continuous:  boolean = false;
  private _peers        = new Map<string, PeerChannels>();
  private _rafId:       number | null = null;
  private _lastTick     = 0;
  private _stateAccum   = 0;
  private _lastSent     = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };

  // GUEST-only
  private _guestState:  GuestTransportState | null = null;
  private _guestPc:     RTCPeerConnection | null = null;
  private _guestInputCh: RTCDataChannel | null = null;
  private _guestEventCh: RTCDataChannel | null = null;
  private _snaps:       Snapshot[] = [];
  private _lastSentAt:  number = 0;

  // Migration state (guest and elected-new-host paths)
  private _peerId:          string = "";
  private _savedName:       string = "";
  private _savedCosmetics:  { color: number; bodyShape: number; accent: number; trail: number; livery: number } = { color: 0, bodyShape: 0, accent: 0, trail: 0, livery: 0 };
  private _migrationState:  "none" | "electing" | "guest-wait" = "none";
  private _migrationTimeout: ReturnType<typeof setTimeout> | null = null;
  // When true, the next guest state message should fire migration-complete
  private _awaitingPostMigrationState: boolean = false;
  // Offline QR flag — migration is no-op for offline sessions (no broker socket)
  private _isOfflineQr:     boolean = false;

  // ── Shared ─────────────────────────────────────────────────────────────────

  get state(): TransportState | null {
    if (this._isHost) return this._hostState;
    return this._guestState;
  }

  getPhase():  string | null { return this.state?.phase  ?? null; }
  getHostId(): string | null { return this.state?.hostId ?? null; }

  getRosterSnapshot(): Array<{ id: string; name: string; ready: boolean; bot: boolean; score: number; color: number }> {
    const s = this.state;
    if (!s) return [];
    const out: Array<{ id: string; name: string; ready: boolean; bot: boolean; score: number; color: number }> = [];
    s.players.forEach((p: any, id: string) => {
      out.push({
        id,
        name:  p.name  || "Pilot",
        ready: !!p.ready,
        bot:   !!p.bot,
        score: p.score || 0,
        color: p.skin  || 0,
      });
    });
    return out;
  }

  leave(): void {
    this._stopHostLoop();
    this._teardownPeers();
    if (this._signal) { this._signal.close(); this._signal = null; }
    if (this._guestPc)    { try { this._guestPc.close();    } catch {} this._guestPc = null; }
    this._sim       = null;
    this._hostState = null;
    this._guestState = null;
    this._snaps     = [];
    this.localPose.active = false;
    this.sessionId  = null;
  }

  tryReconnect(): Promise<boolean> {
    // P2P has no reconnect path — return false so main.ts shows the "couldn't reconnect" message
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
  async startHost(
    name: string,
    code: string,
    cosmetics: { color: number; bodyShape: number; accent: number; trail: number; livery: number },
    opts?: { roomName?: string; continuous?: boolean; bots?: boolean },
  ): Promise<void> {
    this._isHost  = true;
    this._room    = code;
    this.sessionId = "host";

    const continuous = opts?.continuous ?? false;
    const roomName   = opts?.roomName   ?? code;
    const botsEnabled = !!opts?.bots;

    // Remember for host-migration (this peer may later re-host after election).
    this._botsEnabled = botsEnabled;
    this._continuous  = continuous;

    const sim = new GameSim({
      botsEnabled,
      // Continuous local rooms start in playing/ffa state immediately (same as isPublic).
      isPublic: continuous,
      onEvent: (e) => this._onSimEvent(e),
    });
    this._sim = sim;
    this._hostState = new HostTransportState(sim);

    // Add self as first player — becomes host automatically (hostId === "host")
    sim.addPlayer("host", {
      name,
      skin:      cosmetics.color,
      bodyShape: cosmetics.bodyShape,
      accent:    cosmetics.accent,
      trail:     cosmetics.trail,
      livery:    cosmetics.livery,
    });

    // Wire signaling — carry room display name and host call sign to broker
    const sig = new SignalSocket();
    sig.hostRoomName = roomName;
    sig.hostCallSign = name;
    this._signal = sig;
    sig.onMessage = (msg) => this._onSignalHost(msg);
    sig.onClose   = () => {/* signaling dropped — peers already connected via DC */};

    try {
      await sig.open(code, "host");
    } catch {
      // Signaling server unavailable; offline QR path still works
    }

    this._startHostLoop();

    // Trigger initial state change so the lobby UI renders
    if (this.onStateChange) this.onStateChange();
  }

  /**
   * List rooms visible from this client's network by querying the broker's
   * `{type:"list"}` message. Returns an empty array on any error or timeout.
   * This is a static method so callers can use `WebRtcTransport.listRooms()`
   * without needing an instance.
   */
  static listRooms(): Promise<Array<{ code: string; name: string; hostName: string; count: number }>> {
    return new Promise((resolve) => {
      let settled = false;
      const done = (rooms: Array<{ code: string; name: string; hostName: string; count: number }>) => {
        if (settled) return;
        settled = true;
        try { ws.close(); } catch {}
        resolve(rooms);
      };

      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws    = new WebSocket(`${proto}://${location.host}/signal`);

      const timer = setTimeout(() => done([]), 6000);

      ws.onopen = () => {
        try { ws.send(JSON.stringify({ type: "list" })); } catch { done([]); }
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "rooms") {
            clearTimeout(timer);
            done(Array.isArray(msg.rooms) ? msg.rooms : []);
          }
        } catch { /* ignore non-JSON */ }
      };

      ws.onerror = () => { clearTimeout(timer); done([]); };
      ws.onclose = () => { clearTimeout(timer); done([]); };
    });
  }

  private _onSimEvent(e: SimEvent): void {
    if (e.type === "kill") {
      if (this.onKill) this.onKill({ killer: e.killer, victim: e.victim, killerName: e.killerName, victimName: e.victimName });
      this._broadcastEvent({ type: "kill", killer: e.killer, victim: e.victim, killerName: e.killerName, victimName: e.victimName });
    } else if (e.type === "pickup") {
      if (this.onPickup) this.onPickup({ by: e.by, type: e.pickupType });
      this._broadcastEvent({ type: "pickup", by: e.by, pickupType: e.pickupType });
    } else if (e.type === "roundEnd") {
      this._broadcastEvent({ type: "roundEnd", scores: e.scores });
    }
    // Phase changes / roster are conveyed via state snapshots
    if (this.onStateChange) this.onStateChange();
  }

  private _startHostLoop(): void {
    this._lastTick  = performance.now();
    this._stateAccum = 0;
    const interval = 1000 / STATE_HZ;

    const tick = (now: number): void => {
      this._rafId = requestAnimationFrame(tick);

      if (document.hidden) return; // paused; no tick

      let dtMs = now - this._lastTick;
      this._lastTick = now;
      if (dtMs <= 0 || !isFinite(dtMs)) dtMs = 16;

      let dt = dtMs / 1000;
      // Drain fixed-step accumulator
      while (dt > 0) {
        const step = Math.min(dt, DT_MAX);
        this._sim!.tick(step);
        dt -= step;
      }

      // State broadcast at ~30 Hz
      this._stateAccum += dtMs;
      if (this._stateAccum >= interval) {
        this._stateAccum -= interval;
        this._broadcastState();
        if (this.onStateChange) this.onStateChange();
      }
    };
    this._rafId = requestAnimationFrame(tick);
  }

  private _stopHostLoop(): void {
    if (this._rafId !== null) { cancelAnimationFrame(this._rafId); this._rafId = null; }
  }

  private _broadcastState(): void {
    if (!this._sim || !this._peers.size) return;
    const snap = this._sim.snapshot();
    const payload = JSON.stringify({ type: "state", snap });
    for (const [, peer] of this._peers) {
      if (peer.state && peer.state.readyState === "open") {
        try { peer.state.send(payload); } catch {}
      }
    }
  }

  private _broadcastEvent(evt: object): void {
    const payload = JSON.stringify({ type: "event", event: evt });
    for (const [, peer] of this._peers) {
      if (peer.events && peer.events.readyState === "open") {
        try { peer.events.send(payload); } catch {}
      }
    }
  }

  private async _onSignalHost(msg: any): Promise<void> {
    if (!this._sim) return; // guard: sim must exist for all host-side processing
    const sig = this._signal!;

    if (msg.type === "peer-joined") {
      const peerId: string = msg.peerId;
      if (this._peers.size >= MAX_GUESTS) return;

      const pc = makePeerConnection(STUN_ICE);
      const stateCh  = pc.createDataChannel("state",  { ordered: true,  maxRetransmits: 0 });
      const inputsCh = pc.createDataChannel("inputs", { ordered: false, maxRetransmits: 0 });
      const eventsCh = pc.createDataChannel("events", { ordered: true });
      stateCh.binaryType  = "arraybuffer";
      inputsCh.binaryType = "arraybuffer";
      eventsCh.binaryType = "arraybuffer";

      const channels: PeerChannels = { pc, state: stateCh, inputs: inputsCh, events: eventsCh };
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
      sig.send({ type: "offer", room: this._room, to: peerId, sdp: pc.localDescription!.toJSON() });
    }

    if (msg.type === "answer" && msg.to === "host") {
      const peer = this._peers.get(msg.from || msg.peerId);
      // answer comes with from field or we track by room context
      // Find the peer whose PC is in "have-local-offer" state
      for (const [, p] of this._peers) {
        if (p.pc.signalingState === "have-local-offer") {
          await p.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          break;
        }
      }
      void peer;
    }

    if (msg.type === "ice" && msg.to === "host") {
      // Try all pending peers
      for (const [, p] of this._peers) {
        try {
          await p.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        } catch {}
      }
    }
  }

  private _onGuestInput(peerId: string, data: string | ArrayBuffer): void {
    if (!this._sim) return;
    try {
      const text = typeof data === "string" ? data : new TextDecoder().decode(data);
      const msg  = JSON.parse(text);
      if (msg.type === "input") {
        this._sim.applyInput(peerId, msg.input);
      }
    } catch {}
  }

  private _onGuestControl(peerId: string, data: string | ArrayBuffer): void {
    if (!this._sim) return;
    try {
      const text = typeof data === "string" ? data : new TextDecoder().decode(data);
      const msg  = JSON.parse(text);

      if (msg.type === "join") {
        // Guest sent join metadata (name + cosmetics).
        // If this is a migration re-join, the player is already in the sim — just
        // resend the session assignment without calling addPlayer again.
        const peer = this._peers.get(peerId);
        if (this._sim.players.has(peerId)) {
          // Migration re-join: just resend session id
          if (peer?.events?.readyState === "open") {
            peer.events.send(JSON.stringify({ type: "session", sessionId: peerId }));
          }
        } else {
          this._sim.addPlayer(peerId, {
            name:      msg.name      || "Pilot",
            skin:      msg.skin      || 0,
            bodyShape: msg.bodyShape || 0,
            accent:    msg.accent    || 0,
            trail:     msg.trail     || 0,
            livery:    msg.livery    || 0,
          });
          // Send the guest their assigned peerId and current roster via the events channel
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
        // Broadcast kick event so the kicked guest sees it
        this._broadcastEvent({ type: "kicked", targetId: msg.targetId });
        if (this.onStateChange) this.onStateChange();
      } else if (msg.type === "hostSettings") {
        this._sim.setHostSettings(peerId, {
          roundLength: typeof msg.roundLength === "number" ? msg.roundLength : undefined,
          roomName: typeof msg.roomName === "string" ? msg.roomName : undefined,
          botsInRoom: typeof msg.botsInRoom === "boolean" ? msg.botsInRoom : undefined,
          mode: typeof msg.mode === "string" ? msg.mode : undefined,
          botDifficulty: typeof msg.botDifficulty === "string" ? msg.botDifficulty : undefined,
        });
        if (this.onStateChange) this.onStateChange();
      }
    } catch {}
  }

  private _removePeer(peerId: string): void {
    const peer = this._peers.get(peerId);
    if (!peer) return;
    try { peer.pc.close(); } catch {}
    this._peers.delete(peerId);
    if (this._sim) this._sim.removePlayer(peerId);
    this._broadcastEvent({ type: "roster-change" });
    if (this.onStateChange) this.onStateChange();
  }

  private _teardownPeers(): void {
    // Broadcast host-left before closing
    try { this._broadcastEvent({ type: "host-left" }); } catch {}
    for (const [, peer] of this._peers) {
      try { peer.pc.close(); } catch {}
    }
    this._peers.clear();
  }

  // ── GUEST MODE ─────────────────────────────────────────────────────────────

  async connect(
    name: string,
    code: string,
    cosmetics: { color: number; bodyShape: number; accent: number; trail: number; livery: number },
    _serverOrigin?: string | null
  ): Promise<void> {
    this._isHost     = false;
    this._room       = code;
    this._guestState = new GuestTransportState();
    // sessionId is assigned by the host via "session" event
    this.sessionId   = null;

    const peerId = "g-" + Math.random().toString(36).slice(2, 10);

    // Save for migration re-use
    this._peerId         = peerId;
    this._savedName      = name;
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

    // Wait for data channels to open (up to 15s)
    await this._waitForGuestChannels();

    // Announce self to host
    this._sendGuestJoin();
  }

  /** Wire the standard guest-side PC event handlers. */
  private _wireGuestPc(
    pc: RTCPeerConnection,
    peerId: string,
    code: string,
    sig: SignalSocket,
  ): void {
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
        this._guestInputCh = ch; // iOS fallback
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected" ||
        pc.connectionState === "closed"
      ) {
        // DC-death debounce: wait 400ms to let a broker 'host-migrating' arrive first.
        // If migration is already underway, suppress this disconnect entirely.
        if (this._migrationState !== "none") return;
        setTimeout(() => {
          // Re-check after 400ms — migration may have started in the meantime.
          if (this._migrationState !== "none") return;
          if (this.onDisconnect) this.onDisconnect({ type: "leave", code: 1001 });
        }, 400);
      }
    };
  }

  /** Route guest-side signaling messages, including migration control messages. */
  private async _onSignalGuest(
    msg: SignalMsg,
    peerId: string,
    code: string,
    sig: SignalSocket,
    pc: RTCPeerConnection,
  ): Promise<void> {
    if (msg.type === "offer" && (msg as any).to === peerId) {
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sig.send({ type: "answer", room: code, to: "host", sdp: pc.localDescription!.toJSON() });
    } else if (msg.type === "ice" && (msg as any).to === peerId) {
      try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
    } else if (msg.type === "host-migrating") {
      // Offline QR sessions have no broker — guard just in case.
      if (this._isOfflineQr) return;
      const migMsg = msg as { type: "host-migrating"; room: string; nextHost: string };
      if (migMsg.nextHost === this._peerId) {
        this._startMigrationAsElected();
      } else {
        this._startMigrationAsGuest();
      }
    } else if (msg.type === "host-arrived") {
      if (this._migrationState === "guest-wait") {
        // New host is ready — reconnect the guest WebRTC path.
        this._reconnectGuestToNewHost();
      }
    } else if (msg.type === "host-left") {
      // No migration possible — end match.
      if (this._migrationState !== "none") {
        // Clear any pending timeout
        if (this._migrationTimeout !== null) { clearTimeout(this._migrationTimeout); this._migrationTimeout = null; }
      }
      if (this.onDisconnect) this.onDisconnect({ type: "host-left" });
    }
  }

  /** Wait for both guest data channels to open (up to 15 s). */
  private _waitForGuestChannels(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("P2P connection timeout")), 15000);
      const check = (): void => {
        if (
          this._guestInputCh?.readyState === "open" &&
          this._guestEventCh?.readyState === "open"
        ) {
          clearTimeout(timeout);
          resolve();
        }
      };
      // The ondatachannel callback sets these; poll until they appear
      const poll = setInterval(() => {
        if (this._guestInputCh && this._guestEventCh) {
          this._guestInputCh.onopen  = check;
          this._guestEventCh.onopen  = check;
          clearInterval(poll);
          check();
        }
      }, 100);
    });
  }

  /** Send the initial join announcement to the host over the events channel. */
  private _sendGuestJoin(): void {
    if (this._guestEventCh?.readyState === "open") {
      this._guestEventCh.send(JSON.stringify({
        type:      "join",
        name:      this._savedName,
        skin:      this._savedCosmetics.color,
        bodyShape: this._savedCosmetics.bodyShape,
        accent:    this._savedCosmetics.accent,
        trail:     this._savedCosmetics.trail,
        livery:    this._savedCosmetics.livery,
      }));
    }
  }

  // ── MIGRATION STATE MACHINE ───────────────────────────────────────────────────

  /**
   * Build a SimStateSnapshot from the current guest state (used as the seed
   * for the new host's GameSim when this guest is elected as the new host).
   */
  private _buildMigrationSnapshot(): import("../sim/types").SimStateSnapshot {
    const gs = this._guestState!;
    const players: Array<[string, any]> = [];
    gs.players.forEach((v, k) => players.push([k, { ...v }]));
    const bullets: Array<[string, any]> = [];
    gs.bullets.forEach((v, k) => bullets.push([k, { ...v }]));
    const pickups: Array<[string, any]> = [];
    gs.pickups.forEach((v, k) => pickups.push([k, { ...v }]));

    return {
      players,
      bullets,
      pickups,
      phase:       gs.phase,
      timeLeft:    gs.timeLeft,
      hostId:      this._peerId,   // this guest becomes the new host
      roundLength: gs.roundLength,
      roomName:    gs.roomName,
      botsInRoom:  gs.botsInRoom,
      mode:        gs.mode,
      teamScore0:  gs.teamScore0,
      teamScore1:  gs.teamScore1,
      botDifficulty: gs.botDifficulty,
      botsEnabled: gs.botsEnabled,
      isPublic:    gs.isPublic,
    };
  }

  /**
   * Called when this guest has been elected as the new host.
   * Tears down the guest WebRTC path, claims the host slot on the broker,
   * and starts a new GameSim seeded from the last known state.
   */
  private _startMigrationAsElected(): void {
    if (this._migrationState !== "none") return;
    this._migrationState = "electing";

    // Snapshot last known state BEFORE closing the guest connection.
    const snap = this._buildMigrationSnapshot();

    // Close old guest PC (no longer needed)
    if (this._guestPc) {
      try { this._guestPc.close(); } catch {}
      this._guestPc    = null;
      this._guestInputCh = null;
      this._guestEventCh = null;
    }

    const room = this._room;
    const peerId = this._peerId;
    const sig = this._signal ?? new SignalSocket();
    this._signal = sig;

    // Explicitly carry room name/call sign into the re-registration instead of
    // relying on the broker's keep-if-absent fallback.
    if (snap.roomName) sig.hostRoomName = snap.roomName;
    if (this._savedName) sig.hostCallSign = this._savedName;

    // Re-open signaling as host (handles already-open socket by closing+re-opening)
    sig.open(room, "host").then(() => {
      // Wait for 'hosted' reply which now carries a peers list
      const origOnMessage = sig.onMessage;
      sig.onMessage = (msg) => {
        if (msg.type === "hosted") {
          sig.onMessage = origOnMessage;
          this._onElectedHosted(msg as any, snap, peerId);
        } else if (msg.type === "peer-joined") {
          // Also handle peer-joined while setting up (normal host path)
          if (origOnMessage) origOnMessage(msg);
        }
      };
    }).catch(() => {
      // Signaling failed — fall back gracefully by telling main.ts host-left
      this._migrationState = "none";
      if (this.onDisconnect) this.onDisconnect({ type: "host-left" });
    });
  }

  /** After broker confirms hosted, set up the new GameSim and host loop. */
  private _onElectedHosted(
    hostedMsg: { type: "hosted"; room: string; peers?: string[] },
    snap: import("../sim/types").SimStateSnapshot,
    peerId: string,
  ): void {
    // Create new sim seeded from the migrated snapshot — preserve the
    // original room's bots/continuous semantics instead of hardcoding them off.
    const sim = new GameSim({
      botsEnabled: snap.botsEnabled ?? false,
      isPublic: snap.isPublic ?? false,
      onEvent: (e) => this._onSimEvent(e),
      initialState: snap,
    });
    // Ensure the sim knows this guest's peerId is now the host
    sim.hostId = peerId;

    this._isHost    = true;
    this._sim       = sim;
    this._hostState = new HostTransportState(sim);
    // Keep sessionId === peerId so the render loop finds our player
    this.sessionId  = peerId;

    // Wire host signaling for future peer-joins
    const sig = this._signal!;
    sig.onMessage = (msg) => this._onSignalHost(msg);

    // Start the host simulation loop
    this._startHostLoop();

    // Proactively offer to all guests that were already in the room
    const existingPeers = hostedMsg.peers ?? [];
    for (const gPeerId of existingPeers) {
      if (gPeerId !== peerId) {
        // Trigger the same flow as peer-joined
        this._onSignalHost({ type: "peer-joined", peerId: gPeerId } as any);
      }
    }

    this._migrationState = "none";

    // Notify main.ts that migration is complete — hide the overlay
    if (this.onStateChange) this.onStateChange();
    if (this.onDisconnect) this.onDisconnect({ type: "migration-complete" });
  }

  /**
   * Called when another guest was elected host. Show the "reconnecting" overlay
   * and wait for 'host-arrived' from the broker, then re-establish WebRTC.
   */
  private _startMigrationAsGuest(): void {
    if (this._migrationState !== "none") return;
    this._migrationState = "guest-wait";

    // Tell main.ts to show the migrating overlay
    if (this.onDisconnect) this.onDisconnect({ type: "host-migrating" });

    // Close the old guest PC — the connection to the old host is dead
    if (this._guestPc) {
      try { this._guestPc.close(); } catch {}
      this._guestPc    = null;
      this._guestInputCh = null;
      this._guestEventCh = null;
    }

    // 5 s timeout: if no new host arrives, treat as host-left
    this._migrationTimeout = setTimeout(() => {
      if (this._migrationState !== "guest-wait") return;
      this._migrationState = "none";
      if (this.onDisconnect) this.onDisconnect({ type: "host-left" });
    }, 5000);

    // _reconnectGuestToNewHost() will be called when 'host-arrived' arrives
    // via _onSignalGuest → msg.type === "host-arrived"
  }

  /**
   * Guest reconnect: called when broker sends 'host-arrived'.
   * Creates a fresh WebRTC peer connection to the new host.
   */
  private _reconnectGuestToNewHost(): void {
    if (this._migrationTimeout !== null) {
      clearTimeout(this._migrationTimeout);
      this._migrationTimeout = null;
    }

    const room    = this._room;
    const peerId  = this._peerId;
    const sig     = this._signal!;

    const pc = makePeerConnection(STUN_ICE);
    this._guestPc      = pc;
    this._guestInputCh = null;
    this._guestEventCh = null;

    this._wireGuestPc(pc, peerId, room, sig);

    // Re-wire signaling messages on the existing socket for the reconnect phase
    sig.onMessage = async (msg) => {
      if (msg.type === "offer" && (msg as any).to === peerId) {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sig.send({ type: "answer", room, to: "host", sdp: pc.localDescription!.toJSON() });
      } else if (msg.type === "ice" && (msg as any).to === peerId) {
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
      } else if (msg.type === "host-migrating") {
        // Another migration while we're reconnecting — reset and restart
        if (this._isOfflineQr) return;
        const migMsg = msg as { type: "host-migrating"; room: string; nextHost: string };
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

    // Tell broker we're (re-)joining so the new host gets a peer-joined notification
    sig.send({ type: "join", room, peerId });

    // Set the flag so the first state message from the new host triggers migration-complete
    this._awaitingPostMigrationState = true;

    // Wait for channels to open, then announce ourselves to the new host
    this._waitForGuestChannels().then(() => {
      this._sendGuestJoin();
    }).catch(() => {
      // Channel open timed out — fall back to host-left
      this._migrationState = "none";
      this._awaitingPostMigrationState = false;
      if (this.onDisconnect) this.onDisconnect({ type: "host-left" });
    });
  }

  private _onGuestStateMsg(data: string | ArrayBuffer): void {
    try {
      const text   = typeof data === "string" ? data : new TextDecoder().decode(data);
      const parsed = JSON.parse(text);
      if (parsed.type !== "state") return;
      const snap   = parsed.snap;
      const gs     = this._guestState!;

      gs.phase      = snap.phase;
      gs.timeLeft   = snap.timeLeft;
      gs.hostId     = snap.hostId;
      gs.roomName   = snap.roomName   ?? "";
      gs.roundLength = snap.roundLength ?? 150;
      gs.botsInRoom  = snap.botsInRoom  ?? false;
      gs.mode        = snap.mode        ?? "ffa";
      gs.botDifficulty = snap.botDifficulty ?? "medium";
      gs.teamScore0  = snap.teamScore0  ?? 0;
      gs.teamScore1  = snap.teamScore1  ?? 0;
      gs.botsEnabled = snap.botsEnabled ?? false;
      gs.isPublic    = snap.isPublic    ?? false;
      gs.players.mergeFrom(snap.players as Array<[string, any]>);
      gs.bullets.mergeFrom(snap.bullets as Array<[string, any]>);
      gs.pickups.mergeFrom(snap.pickups as Array<[string, any]>);

      // First state message after a guest migration: clear waiting state and notify main.ts
      if (this._awaitingPostMigrationState) {
        this._awaitingPostMigrationState = false;
        this._migrationState = "none";
        if (this.onDisconnect) this.onDisconnect({ type: "migration-complete" });
      }

      // Push snapshot for prediction
      this._snapFromState(gs);
      if (this.onStateChange) this.onStateChange();
    } catch {}
  }

  private _onGuestEventMsg(data: string | ArrayBuffer): void {
    try {
      const text   = typeof data === "string" ? data : new TextDecoder().decode(data);
      const parsed = JSON.parse(text);
      if (parsed.type !== "event") {
        // Session assignment
        if (parsed.type === "session") {
          this.sessionId = parsed.sessionId;
        }
        return;
      }
      const evt = parsed.event;
      if (evt.type === "kill"   && this.onKill)    this.onKill(evt);
      if (evt.type === "pickup" && this.onPickup)  this.onPickup({ by: evt.by, type: evt.pickupType });
      if (evt.type === "host-left") {
        if (this.onDisconnect) this.onDisconnect({ type: "host-left" });
      }
      if (evt.type === "kicked" && evt.targetId === this.sessionId) {
        if (this.onDisconnect) this.onDisconnect({ type: "kicked" });
      }
    } catch {}
  }

  // ── INPUT ──────────────────────────────────────────────────────────────────

  sendInput(turn: number, climb: number, boost: boolean, fire: boolean): void {
    if (this._isHost) {
      // Host writes directly to sim
      if (!this._sim) return;
      const last = this._lastSent;
      const changed = Math.abs(turn - last.turn) >= 0.03 ||
                      Math.abs(climb - last.climb) >= 0.03 ||
                      boost !== last.boost || fire !== last.fire;
      const now = performance.now();
      if (!changed && now - this._lastSentAt < 1000 / INPUT_HZ) return;
      const seq = last.seq + 1;
      this._lastSent = { seq, turn, climb, boost, fire };
      this._lastSentAt = now;
      this._sim.applyInput("host", { seq, turn, climb, boost, fire });
    } else {
      // Guest sends to host
      if (!this._guestInputCh || this._guestInputCh.readyState !== "open") return;
      const now  = performance.now();
      const last = this._lastSent;
      const changed = Math.abs(turn - last.turn) >= 0.03 ||
                      Math.abs(climb - last.climb) >= 0.03 ||
                      boost !== last.boost || fire !== last.fire;
      if (!changed && now - this._lastSentAt < 1000 / INPUT_HZ) return;
      const seq = last.seq + 1;
      this._lastSent = { seq, turn, climb, boost, fire };
      this._lastSentAt = now;
      try {
        this._guestInputCh.send(JSON.stringify({ type: "input", input: { seq, turn, climb, boost, fire } }));
      } catch {}
    }
  }

  // ── LOBBY CONTROL ──────────────────────────────────────────────────────────

  sendReady(): void {
    if (this._isHost) {
      if (this._sim) { this._sim.setReady("host"); if (this.onStateChange) this.onStateChange(); }
    } else {
      this._sendControl({ type: "ready" });
    }
  }

  sendHostStart(): void {
    if (this._isHost) {
      if (this._sim) { this._sim.hostStart("host"); if (this.onStateChange) this.onStateChange(); }
    } else {
      this._sendControl({ type: "hostStart" });
    }
  }

  sendHostKick(targetId: string): void {
    if (this._isHost) {
      if (this._sim) { this._sim.hostKick("host", targetId); if (this.onStateChange) this.onStateChange(); }
    } else {
      this._sendControl({ type: "hostKick", targetId });
    }
  }

  sendHostSettings(s: { roundLength?: number; roomName?: string; botsInRoom?: boolean; mode?: string; botDifficulty?: string }): void {
    if (this._isHost) {
      if (this._sim) { this._sim.setHostSettings("host", s); if (this.onStateChange) this.onStateChange(); }
    } else {
      this._sendControl({ type: "hostSettings", ...s });
    }
  }

  private _sendControl(msg: object): void {
    if (!this._guestEventCh || this._guestEventCh.readyState !== "open") return;
    try { this._guestEventCh.send(JSON.stringify(msg)); } catch {}
  }

  // ── PREDICTION (verbatim from net.ts, adapted for P2P) ──────────────────

  private _authoritativeSelf(): any | null {
    const s = this.state;
    if (!s || !this.sessionId) return null;
    return s.players.get(this.sessionId) || null;
  }

  private _setLocalFromAuth(me: any): void {
    this.localPose.active = true;
    this.localPose.p      = { x: me.px, y: me.py, z: me.pz };
    this.localPose.f      = { x: me.fx, y: me.fy, z: me.fz };
    this.localPose.speed  = me.speed || window.GAME.CRUISE_SPEED;
    this.localPose.seq    = me.seq   || 0;
    this.localPose.turn   = me.turn  || 0;
    this.localPose.climb  = me.climb || 0;
    this.localPose.boost  = !!me.boosting;
    this.localPose.fire   = false;
    this.localPose.alive  = !!me.alive;
    this.localPose.ackSeq = me.seq   || 0;
  }

  private _snapFromState(ts: TransportState): void {
    const players: Record<string, SnapshotPlayer> = {};
    ts.players.forEach((p: any, id: string) => {
      players[id] = {
        p: { x: p.px, y: p.py, z: p.pz },
        f: { x: p.fx, y: p.fy, z: p.fz },
        alive: !!p.alive,
        speed: p.speed || 0,
        turn:  p.turn  || 0,
        climb: p.climb || 0,
        seq:   p.seq   || 0,
      };
    });
    const t = performance.now();
    this._snaps.push({ t, players });
    this._snaps.sort((a, b) => a.t - b.t);
    const cut = t - SNAP_BUFFER_MS;
    while (this._snaps.length > 2 && this._snaps[0].t < cut) this._snaps.shift();

    const me = this._authoritativeSelf();
    if (!me) return;
    if (!this.localPose.active || !me.alive) { this._setLocalFromAuth(me); return; }

    const Sp   = (window as any).Sphere;
    const auth = { x: me.px, y: me.py, z: me.pz };
    const authF = { x: me.fx, y: me.fy, z: me.fz };
    const err  = Sp.distance(this.localPose.p, auth);
    if (err > SNAP_DISTANCE) { this._setLocalFromAuth(me); return; }

    this.localPose.p     = Sp.lerpVec(this.localPose.p, auth,  0.22);
    this.localPose.f     = Sp.normalize(Sp.lerpVec(this.localPose.f, authF, 0.28));
    this.localPose.speed = me.speed || this.localPose.speed;
    this.localPose.seq   = Math.max(this.localPose.seq, me.seq || 0);
    this.localPose.ackSeq = me.seq || this.localPose.ackSeq;
    this.localPose.alive  = !!me.alive;
  }

  stepLocal(dt: number): void {
    if (this._isHost) {
      // Host localPose tracks the host's own sim player directly
      const me = this._sim?.players.get("host");
      if (!me) return;
      this.localPose.active = true;
      this.localPose.p      = { x: me.px, y: me.py, z: me.pz };
      this.localPose.f      = { x: me.fx, y: me.fy, z: me.fz };
      this.localPose.speed  = me.speed;
      this.localPose.alive  = me.alive;
      return;
    }

    // Guest prediction — identical to net.ts stepLocal
    const me = this._authoritativeSelf();
    if (!me) return;
    if (!this.localPose.active) { this._setLocalFromAuth(me); }
    if (!this.localPose.alive || !me.alive) { this._setLocalFromAuth(me); return; }

    const Sp  = (window as any).Sphere;
    const G   = window.GAME;
    const inp = this._lastSent;

    const angles = Sp.yawPitchFromForward(this.localPose.f);
    const yaw    = angles.yaw   + inp.turn  * G.TURN_RATE  * dt;
    const pitch  = Sp.clamp(angles.pitch + inp.climb * G.PITCH_RATE * dt, -G.PITCH_MAX, G.PITCH_MAX);
    let fwd      = Sp.yawPitchForward(yaw, pitch);

    let targetSpeed = inp.boost ? G.BOOST_SPEED : G.CRUISE_SPEED;
    if (me.power === "afterburner") targetSpeed *= G.AFTERBURNER_FACTOR;
    const delta = targetSpeed - this.localPose.speed;
    const step  = Math.sign(delta) * G.ACCEL * dt;
    this.localPose.speed = Math.abs(step) >= Math.abs(delta) ? targetSpeed : this.localPose.speed + step;

    const pos  = this.localPose.p;
    const edge = Math.max(Math.abs(pos.x), Math.abs(pos.z));
    if (edge > G.MAP_HALF - G.MAP_EDGE_SOFT) {
      const edgeT = Sp.clamp((edge - (G.MAP_HALF - G.MAP_EDGE_SOFT)) / G.MAP_EDGE_SOFT, 0, 1);
      const home  = Sp.normalize({ x: -pos.x || 1, y: 0, z: -pos.z });
      fwd = Sp.normalize({
        x: Sp.lerp(fwd.x, home.x, edgeT * 0.25),
        y: fwd.y * (1 - edgeT * 0.2),
        z: Sp.lerp(fwd.z, home.z, edgeT * 0.25),
      });
    }

    let next = Sp.advance(pos, fwd, this.localPose.speed * dt).p;
    next.x = Sp.clamp(next.x, -G.MAP_HALF, G.MAP_HALF);
    next.z = Sp.clamp(next.z, -G.MAP_HALF, G.MAP_HALF);
    next.y = Sp.clamp(next.y, G.MIN_ALT,   G.MAX_ALT);
    if (next.y <= G.MIN_ALT + 0.01 && fwd.y < 0) fwd = Sp.withPitch(fwd, 0.02);
    if (next.y >= G.MAX_ALT - 0.01 && fwd.y > 0) fwd = Sp.withPitch(fwd, -0.02);

    const auth = { x: me.px, y: me.py, z: me.pz };
    const authF = { x: me.fx, y: me.fy, z: me.fz };
    const err   = Sp.distance(next, auth);
    if (err > SNAP_DISTANCE) {
      next = auth; fwd = authF;
      this.localPose.speed = me.speed || this.localPose.speed;
    } else {
      next = Sp.lerpVec(next, auth,  Math.min(0.12, dt * 3.5));
      fwd  = Sp.normalize(Sp.lerpVec(fwd,  authF, Math.min(0.18, dt * 4.5)));
    }

    this.localPose.p     = next;
    this.localPose.f     = fwd;
    this.localPose.turn  = inp.turn;
    this.localPose.climb = inp.climb;
    this.localPose.boost = inp.boost;
    this.localPose.fire  = inp.fire;
    this.localPose.seq   = inp.seq;
  }

  sample(renderTime: number): Record<string, SnapshotPlayer> {
    const Sp    = (window as any).Sphere;
    const snaps = this._snaps;
    const out: Record<string, SnapshotPlayer> = {};
    if (!snaps.length) return out;

    const clone = (p: SnapshotPlayer): SnapshotPlayer => ({
      p: { ...p.p }, f: { ...p.f },
      alive: p.alive, speed: p.speed, turn: p.turn, climb: p.climb, seq: p.seq,
    });

    const blend = (a: SnapshotPlayer, b: SnapshotPlayer, t: number): SnapshotPlayer => ({
      p:     Sp.lerpVec(a.p, b.p, t),
      f:     Sp.normalize(Sp.lerpVec(a.f, b.f, t)),
      alive: b.alive,
      speed: Sp.lerp(a.speed, b.speed, t),
      turn:  Sp.lerp(a.turn,  b.turn,  t),
      climb: Sp.lerp(a.climb, b.climb, t),
      seq:   b.seq,
    });

    const latest = snaps[snaps.length - 1];
    if (renderTime >= latest.t) {
      if (snaps.length < 2) {
        for (const id in latest.players) out[id] = clone(latest.players[id]);
        return out;
      }
      const prev = snaps[snaps.length - 2];
      const span = latest.t - prev.t || 1;
      const k    = Math.min(renderTime - latest.t, MAX_EXTRAP_MS) / span;
      for (const id in latest.players) {
        const b = latest.players[id];
        const a = prev.players[id] || b;
        const blended = blend(a, b, 1 + k);
        blended.p = Sp.add(b.p, Sp.scale(Sp.sub(b.p, a.p), k));
        blended.f = Sp.normalize(Sp.lerpVec(a.f, b.f, 1 + k));
        out[id]   = blended;
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
  async startOfflineQrOffer(canvas: HTMLCanvasElement): Promise<string> {
    // Mark as offline: migration handlers are no-ops in offline-QR sessions.
    this._isOfflineQr = true;
    const pc = makePeerConnection([]);
    this._guestPc = pc; // reuse field to close later

    const stateCh  = pc.createDataChannel("state",  { ordered: true, maxRetransmits: 0 });
    const inputsCh = pc.createDataChannel("inputs", { ordered: false, maxRetransmits: 0 });
    const eventsCh = pc.createDataChannel("events", { ordered: true });
    stateCh.binaryType  = "arraybuffer";
    inputsCh.binaryType = "arraybuffer";
    eventsCh.binaryType = "arraybuffer";

    // Wire DC listeners identically to the online path
    inputsCh.onmessage = (ev) => this._onGuestInput("offline-guest", ev.data);
    eventsCh.onmessage = (ev) => this._onGuestControl("offline-guest", ev.data);

    const channels: PeerChannels = { pc, state: stateCh, inputs: inputsCh, events: eventsCh };
    this._peers.set("offline-guest", channels);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering
    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === "complete") { resolve(); return; }
      pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === "complete") resolve(); };
      setTimeout(resolve, 5000); // safety timeout
    });

    const sdpLocal  = filterSdpToLocal(pc.localDescription!.sdp);
    const payload   = JSON.stringify({ type: "offer", sdp: { type: "offer", sdp: sdpLocal } });
    const encoded   = await compressB64(payload);

    if (encoded.length > 2400) {
      throw new Error("too many network interfaces — use code instead");
    }

    const joinUrl = `${location.origin}${location.pathname}?offline-answer=${encoded}`;
    window.QR.render(canvas, joinUrl, {
      size: window.Input.isTouchDevice() ? 220 : 256,
      errorCorrectionLevel: "M",
    });

    return encoded;
  }

  /**
   * Guest: decode offer QR payload, create answer, encode answer, render QR.
   */
  async startOfflineQrAnswer(encoded: string, answerCanvas: HTMLCanvasElement): Promise<void> {
    // Offline QR guest path: migration is not available (no broker socket).
    this._isOfflineQr = true;
    const payload = await decompressB64(encoded);
    const { sdp: offerSdp } = JSON.parse(payload);

    const pc = makePeerConnection([]);
    this._guestPc = pc;

    pc.ondatachannel = (ev) => {
      const ch = ev.channel;
      ch.binaryType = "arraybuffer";
      if (ch.label === "state")   ch.onmessage = (e) => this._onGuestStateMsg(e.data);
      if (ch.label === "events")  { this._guestEventCh = ch; ch.onmessage = (e) => this._onGuestEventMsg(e.data); }
      if (ch.label === "inputs" || ch.label === "inputs-fallback") this._guestInputCh = ch;
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await new Promise<void>((resolve) => {
      if (pc.iceGatheringState === "complete") { resolve(); return; }
      pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === "complete") resolve(); };
      setTimeout(resolve, 5000);
    });

    const sdpLocal  = filterSdpToLocal(pc.localDescription!.sdp);
    const answerPayload = JSON.stringify({ type: "answer", sdp: { type: "answer", sdp: sdpLocal } });
    const answerEncoded = await compressB64(answerPayload);

    if (answerEncoded.length > 2400) throw new Error("too many network interfaces — use code instead");

    window.QR.render(answerCanvas, answerEncoded, {
      size: window.Input.isTouchDevice() ? 220 : 256,
      errorCorrectionLevel: "M",
    });
  }

  /**
   * Host: accept offline QR answer (pasted/scanned base64url string).
   */
  async finishOfflineQrOffer(answerEncoded: string): Promise<void> {
    const payload = await decompressB64(answerEncoded);
    const { sdp: answerSdp } = JSON.parse(payload);
    const peer = this._peers.get("offline-guest");
    if (!peer) throw new Error("No pending offline offer");
    await peer.pc.setRemoteDescription(new RTCSessionDescription(answerSdp));
  }
}

// Module also exports helpers so main.ts can access the offline QR methods
// without type-casting window.Net.
export type { PeerChannels };
export { compressB64, decompressB64 };
