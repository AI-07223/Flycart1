// Thin wrapper around the Colyseus client: connection, room join, input send,
// and a snapshot ring buffer used for client-side interpolation of remote planes.
(function () {
  const BUFFER_MS = 1500;
  const lerp = (a, b, t) => a + (b - a) * t;
  const shortAngle = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; return a + d * t; };

  const Net = {
    client: null,
    room: null,
    sessionId: null,
    lastSent: { turn: 0, boost: false, fire: false },
    snaps: [],
    onKill: null,
    onPickup: null,

    endpoint() {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      return `${proto}://${location.host}`;
    },

    // code: "PUBLIC" for Quick Play, or a share code for a private room.
    async connect(name, code) {
      this.client = new Colyseus.Client(this.endpoint());
      this.room = await this.client.joinOrCreate("arena", { name, code });
      this.sessionId = this.room.sessionId;
      this.snaps = [];
      this.room.onMessage("kill", (msg) => { if (this.onKill) this.onKill(msg); });
      this.room.onMessage("pickup", (msg) => { if (this.onPickup) this.onPickup(msg); });
      this.room.onStateChange(() => this._snap());
      return this.room;
    },

    // Record a positional snapshot per server patch (timestamped on the client clock).
    _snap() {
      if (!this.room || !this.room.state) return;
      const players = {};
      this.room.state.players.forEach((p, id) => {
        players[id] = { x: p.x, y: p.y, angle: p.angle, alive: p.alive };
      });
      const t = performance.now();
      this.snaps.push({ t, players });
      const cut = t - BUFFER_MS;
      while (this.snaps.length > 2 && this.snaps[0].t < cut) this.snaps.shift();
    },

    // Interpolated remote poses at renderTime (ms): { id: {x, y, angle, alive} }.
    sample(renderTime) {
      const s = this.snaps, out = {};
      if (!s.length) return out;
      const latest = s[s.length - 1];
      if (s.length === 1 || renderTime >= latest.t) {
        for (const id in latest.players) out[id] = { ...latest.players[id] };
        return out;
      }
      let bi = 0;
      while (bi < s.length && s[bi].t < renderTime) bi++;
      if (bi === 0) { for (const id in s[0].players) out[id] = { ...s[0].players[id] }; return out; }
      const a = s[bi - 1], b = s[bi];
      const span = b.t - a.t, t = span > 0 ? (renderTime - a.t) / span : 0;
      for (const id in b.players) {
        const pb = b.players[id], pa = a.players[id] || pb;
        out[id] = { x: lerp(pa.x, pb.x, t), y: lerp(pa.y, pb.y, t), angle: shortAngle(pa.angle, pb.angle, t), alive: pb.alive };
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
      if (this.room) { try { this.room.leave(); } catch (e) {} this.room = null; }
      this.snaps = [];
    },
  };

  window.Net = Net;
})();
