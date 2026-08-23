"use strict";
(() => {
  // src/shared/sphere.ts
  var dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  var lenSq = (a) => dot(a, a);
  var len = (a) => Math.sqrt(lenSq(a));
  var lerp = (a, b, t) => a + (b - a) * t;
  function normalize(a) {
    const l = len(a);
    return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 1, y: 0, z: 0 };
  }

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

  // src/client/net-ws.ts
  var INPUT_HZ = 25;
  var SNAP_BUFFER_MS = 1400;
  var MAX_EXTRAP_MS = 120;
  var SNAP_DISTANCE = 140;
  var WELCOME_TIMEOUT_MS = 1e4;
  var INPUT_INTERVAL_MS = 1e3 / INPUT_HZ;
  var StableMap = class {
    constructor() {
      this._m = /* @__PURE__ */ new Map();
    }
    get size() {
      return this._m.size;
    }
    get(k) {
      return this._m.get(k);
    }
    forEach(cb) {
      this._m.forEach(cb);
    }
    /** Merge an array of [key, value] entries into this map in-place. */
    mergeFrom(entries) {
      const seen = /* @__PURE__ */ new Set();
      for (const [k, v] of entries) {
        seen.add(k);
        const existing = this._m.get(k);
        if (existing) {
          Object.assign(existing, v);
        } else {
          this._m.set(k, Object.assign({}, v));
        }
      }
      for (const k of this._m.keys()) {
        if (!seen.has(k)) this._m.delete(k);
      }
    }
  };
  var WsTransportState = class {
    constructor() {
      this.players = new StableMap();
      this.bullets = new StableMap();
      this.pickups = new StableMap();
      this.phase = "lobby";
      this.timeLeft = 0;
      this.hostId = "";
      this.roomName = "";
      this.roundLength = 150;
      this.botsInRoom = false;
      this.mode = "ffa";
      this.teamScore0 = 0;
      this.teamScore1 = 0;
      this.botDifficulty = "medium";
    }
  };
  var WsTransport = class {
    constructor() {
      this.sessionId = null;
      this.localPose = {
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
      };
      this.onKill = null;
      this.onPickup = null;
      this.onDisconnect = null;
      this.onStateChange = null;
      // Internal
      this._ws = null;
      this._st = null;
      this._snaps = [];
      this._lastSent = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };
      this._lastSentAt = 0;
      this._leaderId = "";
      this._leaving = false;
      // Saved join args for tryReconnect (single immediate attempt — LAN latency ~ms)
      this._savedName = "";
      this._savedCode = "";
      this._savedCosmetics = { color: 0, bodyShape: 0, accent: 0, trail: 0, livery: 0 };
      this._savedServerOrigin = null;
      // Pending connect() settlement
      this._welcomeWait = null;
    }
    // ── ITransport ──────────────────────────────────────────────────────────────
    get state() {
      return this._st;
    }
    async connect(name, code, cosmetics, serverOrigin) {
      this._savedName = name;
      this._savedCode = code;
      this._savedCosmetics = { ...cosmetics };
      this._savedServerOrigin = serverOrigin ?? null;
      this._leaving = false;
      this._st = new WsTransportState();
      this.sessionId = null;
      this.snaps_clear();
      this.localPose.active = false;
      this._lastSent = { seq: 0, turn: 0, climb: 0, boost: false, fire: false };
      this._lastSentAt = 0;
      if (this._ws) {
        try {
          this._ws.close();
        } catch {
        }
        this._ws = null;
      }
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const origin = serverOrigin || location.host;
      const ws = new WebSocket(`${proto}://${origin}/ws`);
      this._ws = ws;
      const welcome = new Promise((resolve, reject) => {
        const waiter = { resolve, reject };
        this._welcomeWait = waiter;
        setTimeout(() => {
          if (this._welcomeWait === waiter) {
            this._welcomeWait = null;
            reject(new Error("Join timed out"));
            try {
              ws.close();
            } catch {
            }
          }
        }, WELCOME_TIMEOUT_MS);
      });
      ws.onopen = () => {
        this._send({
          type: "join",
          name,
          cosmetics: {
            skin: cosmetics.color,
            bodyShape: cosmetics.bodyShape,
            accent: cosmetics.accent,
            trail: cosmetics.trail,
            livery: cosmetics.livery
          }
        });
      };
      ws.onmessage = (ev) => {
        this._onMessage(ev.data);
      };
      ws.onclose = () => {
        this._onSocketClose();
      };
      ws.onerror = () => {
      };
      return welcome;
    }
    leave() {
      this._leaving = true;
      if (this._welcomeWait) {
        this._welcomeWait = null;
      }
      if (this._ws) {
        try {
          this._ws.close();
        } catch {
        }
        this._ws = null;
      }
      this._st = null;
      this.snaps_clear();
      this.localPose.active = false;
      this.sessionId = null;
    }
    async tryReconnect() {
      if (!this._savedName) return false;
      try {
        await this.connect(this._savedName, this._savedCode, this._savedCosmetics, this._savedServerOrigin);
        return true;
      } catch {
        return false;
      }
    }
    // ── LOBBY CONTROL ───────────────────────────────────────────────────────────
    sendReady() {
      this._send({ type: "ready" });
    }
    sendHostStart() {
      this._send({ type: "host-start" });
    }
    sendHostKick(targetId) {
      this._send({ type: "host-kick", targetId });
    }
    sendHostSettings(s) {
      const wire = {};
      if (typeof s.roundLength === "number") wire.roundLength = s.roundLength;
      if (typeof s.roomName === "string") wire.roomName = s.roomName;
      if (typeof s.botsInRoom === "boolean") wire.botsInRoom = s.botsInRoom;
      if (typeof s.botDifficulty === "string") wire.botDifficulty = s.botDifficulty;
      this._send({ type: "host-settings", settings: wire });
    }
    getPhase() {
      return this._st ? this._st.phase || null : null;
    }
    getHostId() {
      return this._st ? this._st.hostId || this._leaderId || null : null;
    }
    /**
     * Roster rows for lobby rendering — same field shape consumers use today
     * (renderLobbyRoster reads id/name/ready/bot/score/color).
     */
    getRosterSnapshot() {
      const st = this._st;
      if (!st) return [];
      const out = [];
      st.players.forEach((p, id) => {
        out.push({
          id,
          name: p.name || "Pilot",
          ready: !!p.ready,
          bot: !!p.bot,
          score: p.score || 0,
          color: p.skin || 0
        });
      });
      return out;
    }
    // ── INPUT ───────────────────────────────────────────────────────────────────
    sendInput(turn, climb, boost, fire) {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
      const now = performance.now();
      if (now - this._lastSentAt < INPUT_INTERVAL_MS) return;
      const seq = this._lastSent.seq + 1;
      this._lastSent = { seq, turn, climb, boost, fire };
      this._lastSentAt = now;
      this._send({ type: "input", input: { seq, turn, climb, boost, fire } });
    }
    // ── SOCKET PLUMBING ─────────────────────────────────────────────────────────
    _send(msg) {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) return;
      try {
        this._ws.send(JSON.stringify(msg));
      } catch {
      }
    }
    _onMessage(data) {
      let msg;
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
        this._applySnapshot(msg.snap);
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
    }
    _onEvent(evt) {
      if (evt.type === "kill") {
        if (this.onKill) this.onKill(evt);
      } else if (evt.type === "pickup") {
        if (this.onPickup) this.onPickup({ by: evt.by, type: evt.pickupType });
      } else if (evt.type === "roster-change") {
        if (this.onStateChange) this.onStateChange();
      } else if (evt.type === "kicked") {
        if (this.onDisconnect) this.onDisconnect({ type: "kicked", reason: "kicked" });
        this._leaving = true;
        if (this._ws) {
          try {
            this._ws.close();
          } catch {
          }
          this._ws = null;
        }
      }
    }
    _onSocketClose() {
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
    snaps_clear() {
      this._snaps = [];
    }
    // ── SNAPSHOT HANDLING ───────────────────────────────────────────────────────
    _applySnapshot(snap) {
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
      st.players.mergeFrom(snap.players);
      st.bullets.mergeFrom(snap.bullets);
      st.pickups.mergeFrom(snap.pickups);
      this._snapFromSnapshot(snap);
      if (this.onStateChange) this.onStateChange();
    }
    _authoritativeSelf() {
      const st = this._st;
      if (!st || !this.sessionId) return null;
      return st.players.get(this.sessionId) || null;
    }
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
    }
    /** Push a wire snapshot into the interpolation buffer, then reconcile prediction. */
    _snapFromSnapshot(snap) {
      const players = {};
      let me = null;
      for (const [id, p] of snap.players) {
        players[id] = {
          p: { x: p.px, y: p.py, z: p.pz },
          f: { x: p.fx, y: p.fy, z: p.fz },
          alive: !!p.alive,
          speed: p.speed || 0,
          turn: p.turn || 0,
          climb: p.climb || 0,
          seq: p.seq || 0
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
    }
    // ── PREDICTION (ported from net.ts — includes landmark collisions) ──────────
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
    }
    // ── INTERPOLATION (verbatim from the proven guest path) ─────────────────────
    sample(renderTime) {
      const Sp = window.Sphere;
      const snaps = this._snaps;
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
    }
  };
})();
