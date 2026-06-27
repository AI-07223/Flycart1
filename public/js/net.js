"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/shared/sphere.ts
  function normalize(a) {
    const l = len(a);
    return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 1, y: 0, z: 0 };
  }
  var dot, lenSq, len, lerp;
  var init_sphere = __esm({
    "src/shared/sphere.ts"() {
      "use strict";
      dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
      lenSq = (a) => dot(a, a);
      len = (a) => Math.sqrt(lenSq(a));
      lerp = (a, b, t) => a + (b - a) * t;
    }
  });

  // src/shared/flight.ts
  function resolveLandmarkCollisions(pos, fwd, landmarks, radius) {
    let nextPos = { ...pos };
    let nextFwd = normalize(fwd);
    let collided = false;
    for (const landmark of landmarks) {
      const dx = nextPos.x - landmark.x;
      const dz = nextPos.z - landmark.z;
      const rr = landmark.radius + radius;
      if (dx * dx + dz * dz > rr * rr) continue;
      const floor = landmark.height + radius;
      if (nextPos.y > floor) continue;
      const out = normalize({ x: dx || 1, y: 0, z: dz || 0 });
      nextPos = {
        x: landmark.x + out.x * rr,
        y: Math.max(nextPos.y, floor),
        z: landmark.z + out.z * rr
      };
      nextFwd = normalize({
        x: lerp(nextFwd.x, out.x, 0.35),
        y: Math.max(0.08, nextFwd.y),
        z: lerp(nextFwd.z, out.z, 0.35)
      });
      collided = true;
    }
    return { pos: nextPos, fwd: nextFwd, collided };
  }
  var init_flight = __esm({
    "src/shared/flight.ts"() {
      "use strict";
      init_sphere();
    }
  });

  // src/client/net.ts
  var require_net = __commonJS({
    "src/client/net.ts"() {
      init_flight();
      var BUFFER_MS = 1400;
      var MAX_EXTRAP_MS = 120;
      var SEND_HEARTBEAT_MS = 100;
      var SNAP_DISTANCE = 140;
      var Net = {
        client: null,
        room: null,
        sessionId: null,
        serverOrigin: null,
        lastSent: { seq: 0, turn: 0, climb: 0, boost: false, fire: false },
        snaps: [],
        onKill: null,
        onPickup: null,
        onDisconnect: null,
        reconnectToken: null,
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
          ackSeq: 0
        },
        endpoint(origin = this.serverOrigin) {
          if (origin) {
            const url = new URL(origin);
            if (url.protocol === "http:") url.protocol = "ws:";
            if (url.protocol === "https:") url.protocol = "wss:";
            return url.origin;
          }
          const proto = location.protocol === "https:" ? "wss" : "ws";
          return `${proto}://${location.host}`;
        },
        async connect(name, code, skin, serverOrigin = null) {
          this.serverOrigin = serverOrigin;
          this.client = new window.Colyseus.Client(this.endpoint(serverOrigin));
          const room = await this.client.joinOrCreate("arena", { name, code, skin });
          this._wire(room);
          return room;
        },
        _wire(room) {
          this.room = room;
          this.sessionId = room.sessionId;
          this.reconnectToken = room.reconnectionToken;
          this.snaps = [];
          this._leaving = false;
          this.localPose.active = false;
          this.lastSent = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };
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
        async tryReconnect() {
          if (!this.client || !this.reconnectToken) return false;
          try {
            this._wire(await this.client.reconnect(this.reconnectToken));
            return true;
          } catch {
            return false;
          }
        },
        _authoritativeSelf() {
          if (!this.room || !this.room.state || !this.sessionId) return null;
          return this.room.state.players.get(this.sessionId) || null;
        },
        _setLocalFromAuth(me) {
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
        _snap() {
          if (!this.room || !this.room.state) return;
          const players = {};
          this.room.state.players.forEach((p, id) => {
            players[id] = {
              p: { x: p.px, y: p.py, z: p.pz },
              f: { x: p.fx, y: p.fy, z: p.fz },
              alive: !!p.alive,
              speed: p.speed || 0,
              turn: p.turn || 0,
              climb: p.climb || 0,
              seq: p.seq || 0
            };
          });
          const t = performance.now();
          this.snaps.push({ t, players });
          const cut = t - BUFFER_MS;
          while (this.snaps.length > 2 && this.snaps[0].t < cut) this.snaps.shift();
          const me = this._authoritativeSelf();
          if (!me) return;
          if (!this.localPose.active || !me.alive) {
            this._setLocalFromAuth(me);
            return;
          }
          const Sp = window.Sphere;
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
        stepLocal(dt) {
          const me = this._authoritativeSelf();
          if (!me) return;
          if (!this.localPose.active) this._setLocalFromAuth(me);
          if (!this.localPose.alive || !me.alive) {
            this._setLocalFromAuth(me);
            return;
          }
          const Sp = window.Sphere;
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
              z: Sp.lerp(fwd.z, home.z, edgeT * 0.25)
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
        sample(renderTime) {
          const Sp = window.Sphere;
          const snaps = this.snaps;
          const out = {};
          if (!snaps.length) return out;
          const clone = (p) => ({
            p: { ...p.p },
            f: { ...p.f },
            alive: p.alive,
            speed: p.speed,
            turn: p.turn,
            climb: p.climb,
            seq: p.seq
          });
          const blend = (a2, b2, t2) => ({
            p: Sp.lerpVec(a2.p, b2.p, t2),
            f: Sp.normalize(Sp.lerpVec(a2.f, b2.f, t2)),
            alive: b2.alive,
            speed: Sp.lerp(a2.speed, b2.speed, t2),
            turn: Sp.lerp(a2.turn, b2.turn, t2),
            climb: Sp.lerp(a2.climb, b2.climb, t2),
            seq: b2.seq
          });
          const latest = snaps[snaps.length - 1];
          if (renderTime >= latest.t) {
            if (snaps.length < 2) {
              for (const id in latest.players) out[id] = clone(latest.players[id]);
              return out;
            }
            const prev = snaps[snaps.length - 2];
            const span2 = latest.t - prev.t || 1;
            const extraMs = Math.min(renderTime - latest.t, MAX_EXTRAP_MS);
            const k = extraMs / span2;
            for (const id in latest.players) {
              const b2 = latest.players[id];
              const a2 = prev.players[id] || b2;
              const blended = blend(a2, b2, 1 + k);
              blended.p = Sp.add(b2.p, Sp.scale(Sp.sub(b2.p, a2.p), k));
              blended.f = Sp.normalize(Sp.lerpVec(a2.f, b2.f, 1 + k));
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
        sendInput(turn, climb, boost, fire) {
          if (!this.room) return;
          const now = performance.now();
          const last = this.lastSent;
          const changed = Math.abs(turn - last.turn) >= 0.03 || Math.abs(climb - last.climb) >= 0.03 || boost !== last.boost || fire !== last.fire;
          if (!changed && now - this._lastSendAt < SEND_HEARTBEAT_MS) return;
          this.lastSent = { seq: last.seq + 1, turn, climb, boost, fire };
          this._lastSendAt = now;
          this.room.send("input", this.lastSent);
        },
        setName(name) {
          if (this.room) this.room.send("setName", name);
        },
        leave() {
          this._leaving = true;
          if (this.room) {
            try {
              this.room.leave();
            } catch {
            }
            this.room = null;
          }
          this.snaps = [];
          this.localPose.active = false;
        }
      };
      window.Net = Net;
    }
  });
  require_net();
})();
