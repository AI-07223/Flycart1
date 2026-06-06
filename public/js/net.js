// Thin wrapper around the Colyseus client: connection, room join, input send,
// and a snapshot ring buffer used for client-side interpolation of remote planes.
(function () {
  const BUFFER_MS = 1500;
  const MAX_EXTRAP = 80; // ms of bounded remote extrapolation past the newest snapshot
  const lerp = (a, b, t) => a + (b - a) * t;
  const shortDelta = (a, b) => ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  const shortAngle = (a, b, t) => a + shortDelta(a, b) * t;

  const Net = {
    client: null,
    room: null,
    sessionId: null,
    lastSent: { turn: 0, boost: false, fire: false },
    snaps: [],
    onKill: null,
    onPickup: null,
    onDisconnect: null,   // (info) => {} — fired on an UNEXPECTED room leave/error
    reconnectToken: null,
    _leaving: false,

    endpoint() {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      return `${proto}://${location.host}`;
    },

    // code: "PUBLIC" for Quick Play, or a share code for a private room.
    async connect(name, code, skin) {
      this.client = new Colyseus.Client(this.endpoint());
      const room = await this.client.joinOrCreate("arena", { name, code, skin });
      this._wire(room);
      return room;
    },

    // Attach handlers to a (freshly joined or reconnected) room.
    _wire(room) {
      this.room = room;
      this.sessionId = room.sessionId;
      this.reconnectToken = room.reconnectionToken;
      this.snaps = [];
      this._leaving = false;
      room.onMessage("kill", (msg) => { if (this.onKill) this.onKill(msg); });
      room.onMessage("pickup", (msg) => { if (this.onPickup) this.onPickup(msg); });
      room.onStateChange(() => this._snap());
      room.onError((code, message) => { if (!this._leaving && this.onDisconnect) this.onDisconnect({ type: "error", code, message }); });
      room.onLeave((code) => { if (!this._leaving && this.onDisconnect) this.onDisconnect({ type: "leave", code }); });
    },

    // Best-effort reconnect within the server's allowReconnection window.
    async tryReconnect() {
      if (!this.client || !this.reconnectToken) return false;
      try { this._wire(await this.client.reconnect(this.reconnectToken)); return true; }
      catch (e) { return false; }
    },

    // Record a positional snapshot per server patch (timestamped on the client clock).
    _snap() {
      if (!this.room || !this.room.state) return;
      const players = {};
      this.room.state.players.forEach((p, id) => {
        players[id] = { p: { x: p.px, y: p.py, z: p.pz }, f: { x: p.fx, y: p.fy, z: p.fz }, alive: p.alive };
      });
      const t = performance.now();
      this.snaps.push({ t, players });
      const cut = t - BUFFER_MS;
      while (this.snaps.length > 2 && this.snaps[0].t < cut) this.snaps.shift();
    },

    // Interpolated remote poses at renderTime (ms): { id: { p:{x,y,z}, f:{x,y,z}, alive } }.
    // Positions slerp along the surface; forward slerps then re-tangentizes (no chord-cutting).
    sample(renderTime) {
      const s = this.snaps, out = {}, Sp = window.Sphere;
      if (!s.length) return out;
      const clone = (o) => ({ p: { ...o.p }, f: { ...o.f }, alive: o.alive });
      const blend = (a, b, t) => { const p = Sp.slerp(a.p, b.p, t); return { p, f: Sp.tangentize(p, Sp.slerp(a.f, b.f, t)), alive: b.alive }; };
      const latest = s[s.length - 1];
      if (renderTime >= latest.t) {
        // Past the newest snapshot → bounded slerp extrapolation (t>1) along recent motion.
        if (s.length < 2) { for (const id in latest.players) out[id] = clone(latest.players[id]); return out; }
        const prev = s[s.length - 2], span = latest.t - prev.t;
        const k = span > 0 ? Math.min(renderTime - latest.t, MAX_EXTRAP) / span : 0;
        for (const id in latest.players) {
          const b = latest.players[id], a = prev.players[id] || b;
          out[id] = blend(a, b, 1 + k);
        }
        return out;
      }
      let bi = 0;
      while (bi < s.length && s[bi].t < renderTime) bi++;
      if (bi === 0) { for (const id in s[0].players) out[id] = clone(s[0].players[id]); return out; }
      const a = s[bi - 1], b = s[bi];
      const span = b.t - a.t, t = span > 0 ? (renderTime - a.t) / span : 0;
      for (const id in b.players) {
        const pb = b.players[id], pa = a.players[id] || pb;
        out[id] = blend(pa, pb, t);
      }
      return out;
    },

    // Send input only when it changes meaningfully (analog turn for gyro).
    sendInput(turn, boost, fire) {
      if (!this.room) return;
      const l = this.lastSent;
      if (Math.abs(turn - l.turn) < 0.04 && boost === l.boost && fire === l.fire) return;
      this.lastSent = { turn, boost, fire };
      this.room.send("input", { turn, boost, fire });
    },

    setName(name) {
      if (this.room) this.room.send("setName", name);
    },

    leave() {
      this._leaving = true;
      if (this.room) { try { this.room.leave(); } catch (e) {} this.room = null; }
      this.snaps = [];
    },
  };

  window.Net = Net;
})();
