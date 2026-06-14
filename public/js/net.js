"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/client/net.ts
  var require_net = __commonJS({
    "src/client/net.ts"() {
      var BUFFER_MS = 1500;
      var MAX_EXTRAP = 80;
      var Net = {
        client: null,
        room: null,
        sessionId: null,
        lastSent: { turn: 0, boost: false, fire: false },
        snaps: [],
        onKill: null,
        onPickup: null,
        onDisconnect: null,
        reconnectToken: null,
        _leaving: false,
        endpoint() {
          const proto = location.protocol === "https:" ? "wss" : "ws";
          return `${proto}://${location.host}`;
        },
        // code: "PUBLIC" for Quick Play, or a share code for a private room.
        async connect(name, code, skin) {
          this.client = new window.Colyseus.Client(this.endpoint());
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
          room.onMessage("kill", (msg) => {
            if (this.onKill) this.onKill(msg);
          });
          room.onMessage("pickup", (msg) => {
            if (this.onPickup) this.onPickup(msg);
          });
          room.onStateChange(() => this._snap());
          room.onError((code, message) => {
            if (!this._leaving && this.onDisconnect) this.onDisconnect({ type: "error", code, message });
          });
          room.onLeave((code) => {
            if (!this._leaving && this.onDisconnect) this.onDisconnect({ type: "leave", code });
          });
        },
        // Best-effort reconnect within the server's allowReconnection window.
        async tryReconnect() {
          if (!this.client || !this.reconnectToken) return false;
          try {
            this._wire(await this.client.reconnect(this.reconnectToken));
            return true;
          } catch (_e) {
            return false;
          }
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
          const s = this.snaps;
          const out = {};
          const Sp = window.Sphere;
          if (!s.length) return out;
          const clone = (o) => ({ p: { ...o.p }, f: { ...o.f }, alive: o.alive });
          const blend = (a2, b2, t2) => {
            const p = Sp.slerp(a2.p, b2.p, t2);
            return { p, f: Sp.tangentize(p, Sp.slerp(a2.f, b2.f, t2)), alive: b2.alive };
          };
          const latest = s[s.length - 1];
          if (renderTime >= latest.t) {
            if (s.length < 2) {
              for (const id in latest.players) out[id] = clone(latest.players[id]);
              return out;
            }
            const prev = s[s.length - 2];
            const span2 = latest.t - prev.t;
            const k = span2 > 0 ? Math.min(renderTime - latest.t, MAX_EXTRAP) / span2 : 0;
            for (const id in latest.players) {
              const b2 = latest.players[id];
              const a2 = prev.players[id] || b2;
              out[id] = blend(a2, b2, 1 + k);
            }
            return out;
          }
          let bi = 0;
          while (bi < s.length && s[bi].t < renderTime) bi++;
          if (bi === 0) {
            for (const id in s[0].players) out[id] = clone(s[0].players[id]);
            return out;
          }
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
          if (this.room) {
            try {
              this.room.leave();
            } catch (_e) {
            }
            this.room = null;
          }
          this.snaps = [];
        }
      };
      window.Net = Net;
    }
  });
  require_net();
})();
