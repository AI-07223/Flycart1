// Thin wrapper around the Colyseus client: connection, room join, input send,
// and a snapshot ring buffer used for client-side interpolation of remote planes.

const BUFFER_MS = 1500;
const MAX_EXTRAP = 80; // ms of bounded remote extrapolation past the newest snapshot

interface Vec3 { x: number; y: number; z: number; }

interface SnapshotPlayer {
  p: Vec3;
  f: Vec3;
  alive: boolean;
}

interface Snapshot {
  t: number;
  players: Record<string, SnapshotPlayer>;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const shortDelta = (a: number, b: number): number => ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
const _shortAngle = (a: number, b: number, t: number): number => a + shortDelta(a, b) * t;

const Net = {
  client: null as any | null,
  room: null as any | null,
  sessionId: null as string | null,
  lastSent: { turn: 0, boost: false, fire: false },
  snaps: [] as Snapshot[],
  onKill: null as ((msg: any) => void) | null,
  onPickup: null as ((msg: any) => void) | null,
  onDisconnect: null as ((info: any) => void) | null,
  reconnectToken: null as string | null,
  _leaving: false,

  endpoint(): string {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}`;
  },

  // code: "PUBLIC" for Quick Play, or a share code for a private room.
  async connect(name: string, code: string, skin: number): Promise<any> {
    this.client = new (window as any).Colyseus.Client(this.endpoint());
    const room = await this.client.joinOrCreate("arena", { name, code, skin });
    this._wire(room);
    return room;
  },

  // Attach handlers to a (freshly joined or reconnected) room.
  _wire(room: any): void {
    this.room = room;
    this.sessionId = room.sessionId;
    this.reconnectToken = room.reconnectionToken;
    this.snaps = [];
    this._leaving = false;
    room.onMessage("kill", (msg: any) => { if (this.onKill) this.onKill(msg); });
    room.onMessage("pickup", (msg: any) => { if (this.onPickup) this.onPickup(msg); });
    room.onStateChange(() => this._snap());
    room.onError((code: any, message: any) => { if (!this._leaving && this.onDisconnect) this.onDisconnect({ type: "error", code, message }); });
    room.onLeave((code: any) => { if (!this._leaving && this.onDisconnect) this.onDisconnect({ type: "leave", code }); });
  },

  // Best-effort reconnect within the server's allowReconnection window.
  async tryReconnect(): Promise<boolean> {
    if (!this.client || !this.reconnectToken) return false;
    try { this._wire(await this.client.reconnect(this.reconnectToken)); return true; }
    catch (_e) { return false; }
  },

  // Record a positional snapshot per server patch (timestamped on the client clock).
  _snap(): void {
    if (!this.room || !this.room.state) return;
    const players: Record<string, SnapshotPlayer> = {};
    this.room.state.players.forEach((p: any, id: string) => {
      players[id] = { p: { x: p.px, y: p.py, z: p.pz }, f: { x: p.fx, y: p.fy, z: p.fz }, alive: p.alive };
    });
    const t = performance.now();
    this.snaps.push({ t, players });
    const cut = t - BUFFER_MS;
    while (this.snaps.length > 2 && this.snaps[0].t < cut) this.snaps.shift();
  },

  // Interpolated remote poses at renderTime (ms): { id: { p:{x,y,z}, f:{x,y,z}, alive } }.
  // Positions slerp along the surface; forward slerps then re-tangentizes (no chord-cutting).
  sample(renderTime: number): Record<string, SnapshotPlayer> {
    const s = this.snaps;
    const out: Record<string, SnapshotPlayer> = {};
    const Sp = (window as any).Sphere;
    if (!s.length) return out;
    const clone = (o: SnapshotPlayer): SnapshotPlayer => ({ p: { ...o.p }, f: { ...o.f }, alive: o.alive });
    const blend = (a: SnapshotPlayer, b: SnapshotPlayer, t: number): SnapshotPlayer => {
      const p = Sp.slerp(a.p, b.p, t);
      return { p, f: Sp.tangentize(p, Sp.slerp(a.f, b.f, t)), alive: b.alive };
    };
    const latest = s[s.length - 1];
    if (renderTime >= latest.t) {
      // Past the newest snapshot → bounded slerp extrapolation (t>1) along recent motion.
      if (s.length < 2) { for (const id in latest.players) out[id] = clone(latest.players[id]); return out; }
      const prev = s[s.length - 2];
      const span = latest.t - prev.t;
      const k = span > 0 ? Math.min(renderTime - latest.t, MAX_EXTRAP) / span : 0;
      for (const id in latest.players) {
        const b = latest.players[id];
        const a = prev.players[id] || b;
        out[id] = blend(a, b, 1 + k);
      }
      return out;
    }
    let bi = 0;
    while (bi < s.length && s[bi].t < renderTime) bi++;
    if (bi === 0) { for (const id in s[0].players) out[id] = clone(s[0].players[id]); return out; }
    const a = s[bi - 1];
    const b = s[bi];
    const span = b.t - a.t;
    const t = span > 0 ? (renderTime - a.t) / span : 0;
    for (const id in b.players) {
      const pb = b.players[id];
      const pa = a.players[id] || pb;
      out[id] = blend(pa, pb, t);
    }
    return out;
  },

  // Send input only when it changes meaningfully (analog turn for gyro).
  sendInput(turn: number, boost: boolean, fire: boolean): void {
    if (!this.room) return;
    const l = this.lastSent;
    if (Math.abs(turn - l.turn) < 0.04 && boost === l.boost && fire === l.fire) return;
    this.lastSent = { turn, boost, fire };
    this.room.send("input", { turn, boost, fire });
  },

  setName(name: string): void {
    if (this.room) this.room.send("setName", name);
  },

  leave(): void {
    this._leaving = true;
    if (this.room) { try { this.room.leave(); } catch (_e) { /* ignore */ } this.room = null; }
    this.snaps = [];
  },
};

(window as any).Net = Net;
