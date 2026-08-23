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
      const G2 = window.GAME;
      const input = this._lastSent;
      const angles = Sp.yawPitchFromForward(this.localPose.f);
      const yaw = angles.yaw + input.turn * G2.TURN_RATE * dt;
      const pitch = Sp.clamp(angles.pitch + input.climb * G2.PITCH_RATE * dt, -G2.PITCH_MAX, G2.PITCH_MAX);
      let fwd = Sp.yawPitchForward(yaw, pitch);
      let targetSpeed = input.boost ? G2.BOOST_SPEED : G2.CRUISE_SPEED;
      if (me.power === "afterburner") targetSpeed *= G2.AFTERBURNER_FACTOR;
      const delta = targetSpeed - this.localPose.speed;
      const step = Math.sign(delta) * G2.ACCEL * dt;
      this.localPose.speed = Math.abs(step) >= Math.abs(delta) ? targetSpeed : this.localPose.speed + step;
      const pos = this.localPose.p;
      const edge = Math.max(Math.abs(pos.x), Math.abs(pos.z));
      if (edge > G2.MAP_HALF - G2.MAP_EDGE_SOFT) {
        const edgeT = Sp.clamp((edge - (G2.MAP_HALF - G2.MAP_EDGE_SOFT)) / G2.MAP_EDGE_SOFT, 0, 1);
        const home = Sp.normalize({ x: -pos.x || 1, y: 0, z: -pos.z });
        fwd = Sp.normalize({
          x: Sp.lerp(fwd.x, home.x, edgeT * 0.25),
          y: fwd.y * (1 - edgeT * 0.2),
          z: Sp.lerp(fwd.z, home.z, edgeT * 0.25)
        });
      }
      let next = Sp.advance(pos, fwd, this.localPose.speed * dt).p;
      const collision = resolveLandmarkCollisions(next, fwd, G2.LANDMARKS, G2.PLANE_RADIUS);
      next = collision.pos;
      fwd = collision.fwd;
      next.x = Sp.clamp(next.x, -G2.MAP_HALF, G2.MAP_HALF);
      next.z = Sp.clamp(next.z, -G2.MAP_HALF, G2.MAP_HALF);
      next.y = Sp.clamp(next.y, G2.MIN_ALT, G2.MAX_ALT);
      if (next.y <= G2.MIN_ALT + 0.01 && fwd.y < 0) fwd = Sp.withPitch(fwd, 0.02);
      if (next.y >= G2.MAX_ALT - 0.01 && fwd.y > 0) fwd = Sp.withPitch(fwd, -0.02);
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

  // src/client/appshell.ts
  var deferredInstallPrompt = null;
  if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
    });
  }
  function requestAppFullscreen() {
    let ok = false;
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {
        });
        ok = true;
      }
    } catch {
    }
    try {
      const so = screen.orientation;
      if (so && so.lock) {
        so.lock("landscape").catch(() => {
        });
        ok = true;
      }
    } catch {
    }
    return ok;
  }
  function exitAppFullscreen() {
    try {
      const so = screen.orientation;
      if (so && so.unlock) so.unlock();
    } catch {
    }
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {
      });
    } catch {
    }
  }
  var wakeLockSentinel = null;
  var wakeLockWanted = false;
  async function acquireWakeLock() {
    try {
      const wl = navigator.wakeLock;
      if (!wl) return;
      wakeLockSentinel = await wl.request("screen");
      wakeLockSentinel.addEventListener?.("release", () => {
        wakeLockSentinel = null;
      });
    } catch {
      wakeLockSentinel = null;
    }
  }
  function keepAwake() {
    wakeLockWanted = true;
    void acquireWakeLock();
  }
  function releaseAwake() {
    wakeLockWanted = false;
    try {
      wakeLockSentinel?.release?.();
    } catch {
    }
    wakeLockSentinel = null;
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && wakeLockWanted && !wakeLockSentinel) {
        void acquireWakeLock();
      }
    });
  }
  async function registerServiceWorker() {
    try {
      if (!("serviceWorker" in navigator)) return null;
      if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
        return null;
      }
      return await navigator.serviceWorker.register("/sw.js");
    } catch {
      return null;
    }
  }
  function isNativeApp() {
    try {
      const cap = window.Capacitor;
      return Boolean(cap?.isNativePlatform?.());
    } catch {
      return false;
    }
  }
  function hotspotPlugin() {
    try {
      return window.Capacitor?.Plugins?.Hotspot ?? null;
    } catch {
      return null;
    }
  }
  async function startGameHotspot() {
    const plugin = hotspotPlugin();
    if (!plugin) throw new Error("Not available in browser");
    return plugin.start();
  }
  async function stopGameHotspot() {
    try {
      await hotspotPlugin()?.stop();
    } catch {
    }
  }
  async function gameHotspotStatus() {
    const plugin = hotspotPlugin();
    if (!plugin) return { active: false, ssid: null, passphrase: null };
    try {
      return await plugin.status();
    } catch {
      return { active: false, ssid: null, passphrase: null };
    }
  }

  // src/shared/loadout.ts
  var LOADOUT_STORAGE_KEY = "smashcart.loadout.v1";
  var PRESET_SLOT_COUNT = 4;
  var DEFAULT_LOADOUT = {
    color: 0,
    bodyShape: 0,
    accent: 0,
    trail: 0,
    livery: 0
  };
  var LEGACY_LOADOUT_KEYS = {
    skin: "smashcart.skin",
    color: "smashcart.color",
    bodyShape: "smashcart.bodyShape",
    accent: "smashcart.accent",
    trail: "smashcart.trail",
    livery: "smashcart.livery"
  };
  var AIRFRAME_OPTIONS = [
    { value: 0, label: "Fighter", callsign: "Viper", note: "Balanced silhouette with a steady mid-wing stance." },
    { value: 1, label: "Interceptor", callsign: "Razor", note: "Slim nose and swept wings for a fast strike profile." },
    { value: 2, label: "Bomber", callsign: "Mammoth", note: "Broad wings and a heavy center mass with twin nacelles." },
    { value: 3, label: "Biplane", callsign: "Stork", note: "Stacked wings and struts for a vintage dogfight look." }
  ];
  var PAINT_OPTIONS = [
    { value: 0, label: "Scarlet", note: "Classic red launch paint.", swatch: "#ff6b6b" },
    { value: 1, label: "Cobalt", note: "Cold blue squadron finish.", swatch: "#49c0ff" },
    { value: 2, label: "Olive", note: "Field-ready tactical green.", swatch: "#8be34a" },
    { value: 3, label: "Sunburst", note: "High-visibility yellow sweep.", swatch: "#ffd24a" },
    { value: 4, label: "Violet", note: "Arcade purple glow tone.", swatch: "#c07bff" },
    { value: 5, label: "Ember", note: "Hot orange carrier deck flare.", swatch: "#ff9f43" },
    { value: 6, label: "Teal", note: "Sea-glass cyan finish.", swatch: "#00d2d3" },
    { value: 7, label: "Cream", note: "Warm ivory patrol coat.", swatch: "#ffeaa7" },
    { value: 8, label: "Ghost", note: "Pale alloy shell.", swatch: "#dfe6e9" },
    { value: 9, label: "Stealth", note: "Low-light blacked-out finish.", swatch: "#2d3436" },
    { value: 10, label: "Rust", note: "Weathered copper strike paint.", swatch: "#e17055" },
    { value: 11, label: "Mint", note: "Bright coastal mint.", swatch: "#55efc4" }
  ];
  var ACCENT_OPTIONS = [
    { value: 0, label: "Midnight", note: "Dark utility trim.", swatch: "#273244" },
    { value: 1, label: "Signal White", note: "Clean instrument-white contrast.", swatch: "#ffffff" },
    { value: 2, label: "Iron Black", note: "Deep matte shadow line.", swatch: "#000000" },
    { value: 3, label: "Gold", note: "Showcase deck stripe highlight.", swatch: "#ffd24a" },
    { value: 4, label: "Crimson", note: "Red warning-band accent.", swatch: "#ff6b6b" },
    { value: 5, label: "Ice Blue", note: "Cold neon wing edge.", swatch: "#49c0ff" },
    { value: 6, label: "Vector Green", note: "Radar-green trim.", swatch: "#8be34a" }
  ];
  var LIVERY_OPTIONS = [
    { value: 0, label: "Clean", note: "Primary body with crisp wing contrast." },
    { value: 1, label: "Stripe", note: "Single bold centerline stripe." },
    { value: 2, label: "Two-Tone", note: "Split-color wing and tail treatment." },
    { value: 3, label: "Camo", note: "Patchwork accent markers across the shell." }
  ];
  var TRAIL_OPTIONS = [
    { value: 0, label: "White Smoke", note: "Neutral engine exhaust.", swatch: "#ffffff" },
    { value: 1, label: "Afterburner Orange", note: "Hot thrust flare.", swatch: "#ff9f43" },
    { value: 2, label: "Cryo Blue", note: "Cold plasma stream.", swatch: "#49c0ff" },
    { value: 3, label: "Plasma Violet", note: "Electric purple trail.", swatch: "#c07bff" },
    { value: 4, label: "Toxic Green", note: "Acid-green vapor wake.", swatch: "#8be34a" }
  ];
  function toInt(value) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === "string" && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
  function clampIndex(value, count, fallback) {
    const parsed = toInt(value);
    return parsed !== null && parsed >= 0 && parsed < count ? parsed : fallback;
  }
  function cloneLoadout(loadout) {
    return {
      color: loadout.color,
      bodyShape: loadout.bodyShape,
      accent: loadout.accent,
      trail: loadout.trail,
      livery: loadout.livery
    };
  }
  function sameLoadout(a, b) {
    return a.color === b.color && a.bodyShape === b.bodyShape && a.accent === b.accent && a.trail === b.trail && a.livery === b.livery;
  }
  function clampLoadout(loadout) {
    return {
      color: clampIndex(loadout.color, PAINT_OPTIONS.length, DEFAULT_LOADOUT.color),
      bodyShape: clampIndex(loadout.bodyShape, AIRFRAME_OPTIONS.length, DEFAULT_LOADOUT.bodyShape),
      accent: clampIndex(loadout.accent, ACCENT_OPTIONS.length, DEFAULT_LOADOUT.accent),
      trail: clampIndex(loadout.trail, TRAIL_OPTIONS.length, DEFAULT_LOADOUT.trail),
      livery: clampIndex(loadout.livery, LIVERY_OPTIONS.length, DEFAULT_LOADOUT.livery)
    };
  }
  function createDefaultLoadoutStore() {
    return {
      version: 1,
      active: cloneLoadout(DEFAULT_LOADOUT),
      presets: Array.from({ length: PRESET_SLOT_COUNT }, () => cloneLoadout(DEFAULT_LOADOUT))
    };
  }
  function parseLoadoutStore(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      const store = createDefaultLoadoutStore();
      store.active = clampLoadout(parsed.active || {});
      const rawPresets = Array.isArray(parsed.presets) ? parsed.presets : [];
      store.presets = Array.from(
        { length: PRESET_SLOT_COUNT },
        (_, index) => clampLoadout(rawPresets[index] || DEFAULT_LOADOUT)
      );
      return store;
    } catch {
      return null;
    }
  }
  function loadoutFromLegacy(source) {
    const fallbackColor = clampIndex(source.skin, PAINT_OPTIONS.length, DEFAULT_LOADOUT.color);
    return {
      color: clampIndex(source.color, PAINT_OPTIONS.length, fallbackColor),
      bodyShape: clampIndex(source.bodyShape, AIRFRAME_OPTIONS.length, DEFAULT_LOADOUT.bodyShape),
      accent: clampIndex(source.accent, ACCENT_OPTIONS.length, DEFAULT_LOADOUT.accent),
      trail: clampIndex(source.trail, TRAIL_OPTIONS.length, DEFAULT_LOADOUT.trail),
      livery: clampIndex(source.livery, LIVERY_OPTIONS.length, DEFAULT_LOADOUT.livery)
    };
  }

  // src/client/menu.ts
  var MENU_HOST_ID = "arcade-start-screen";
  var svg = (inner, viewBox = "0 0 24 24") => `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
  var ICON = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72c0 .83.92 1.33 1.62.89l10.8-6.86a1.05 1.05 0 0 0 0-1.78L9.62 4.25A1.05 1.05 0 0 0 8 5.14z"/></svg>',
    join: svg('<path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.4"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.3-1.3"/>'),
    plane: svg('<path d="M17.8 19.2 16 11l3.5-3.5a2.12 2.12 0 0 0-3-3L13 8 4.8 6.2a.5.5 0 0 0-.5.81L8 10l-2.5 2.5-2.4-.5a.5.5 0 0 0-.55.77L4.5 15l2.23 2.95c.22.29.66.24.77-.09l.5-2.4L10.5 13l3 3.7a.5.5 0 0 0 .8-.06z"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    back: svg('<path d="M15 18l-6-6 6-6"/>'),
    check: svg('<path d="M20 6 9 17l-5-5"/>'),
    close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    exit: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'),
    wifi: svg('<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/>'),
    refresh: svg('<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>'),
    pause: svg('<path d="M8 5v14M16 5v14"/>'),
    flag: svg('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>'),
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 11-13h-7l1-7z"/></svg>',
    download: svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>')
  };
  var PROFILE_KEY = "smashcart-profile";
  var NAME_KEY = "smashcart.name";
  function clampIdx(v, count, fallback) {
    const n = typeof v === "number" ? Math.trunc(v) : NaN;
    return Number.isFinite(n) && n >= 0 && n < count ? n : fallback;
  }
  function sanitizeProfile(raw) {
    let cosmetics = cloneLoadout(DEFAULT_LOADOUT);
    let sawLegacy = false;
    try {
      const saved = parseLoadoutStore(localStorage.getItem(LOADOUT_STORAGE_KEY));
      if (saved) {
        cosmetics = cloneLoadout(saved.active);
        sawLegacy = true;
      }
    } catch {
    }
    if (!sawLegacy) {
      try {
        cosmetics = loadoutFromLegacy({
          skin: localStorage.getItem(LEGACY_LOADOUT_KEYS.skin),
          color: localStorage.getItem(LEGACY_LOADOUT_KEYS.color),
          bodyShape: localStorage.getItem(LEGACY_LOADOUT_KEYS.bodyShape),
          accent: localStorage.getItem(LEGACY_LOADOUT_KEYS.accent),
          trail: localStorage.getItem(LEGACY_LOADOUT_KEYS.trail),
          livery: localStorage.getItem(LEGACY_LOADOUT_KEYS.livery)
        });
      } catch {
      }
    }
    const c = raw?.cosmetics;
    if (c) {
      cosmetics.color = clampIdx(c.skin, PAINT_OPTIONS.length, cosmetics.color);
      cosmetics.bodyShape = clampIdx(c.bodyShape, AIRFRAME_OPTIONS.length, cosmetics.bodyShape);
      cosmetics.accent = clampIdx(c.accent, ACCENT_OPTIONS.length, cosmetics.accent);
      cosmetics.trail = clampIdx(c.trail, TRAIL_OPTIONS.length, cosmetics.trail);
      cosmetics.livery = clampIdx(c.livery, LIVERY_OPTIONS.length, cosmetics.livery);
    }
    let name = "";
    try {
      name = String(raw?.name ?? "").slice(0, 14);
    } catch {
    }
    if (!name) {
      try {
        name = localStorage.getItem(NAME_KEY)?.slice(0, 14) ?? "";
      } catch {
      }
    }
    const audio = raw?.audio;
    return {
      name,
      cosmetics,
      audio: audio ? {
        master: typeof audio.master === "number" ? audio.master : void 0,
        music: typeof audio.music === "number" ? audio.music : void 0,
        sfx: typeof audio.sfx === "number" ? audio.sfx : void 0
      } : void 0
    };
  }
  var profile = {
    name: "",
    cosmetics: cloneLoadout(DEFAULT_LOADOUT)
  };
  function readProfile() {
    let raw = null;
    try {
      const text = localStorage.getItem(PROFILE_KEY);
      if (text) raw = JSON.parse(text);
    } catch {
      raw = null;
    }
    try {
      profile = sanitizeProfile(raw);
    } catch {
      profile = { name: "", cosmetics: cloneLoadout(DEFAULT_LOADOUT) };
    }
  }
  function saveProfile(next) {
    if (next?.name !== void 0) profile.name = next.name;
    if (next?.cosmetics) profile.cosmetics = cloneLoadout(next.cosmetics);
    if (next?.audio) profile.audio = { ...profile.audio, ...next.audio };
    try {
      const out = {
        v: 2,
        name: profile.name,
        cosmetics: {
          skin: profile.cosmetics.color,
          bodyShape: profile.cosmetics.bodyShape,
          accent: profile.cosmetics.accent,
          trail: profile.cosmetics.trail,
          livery: profile.cosmetics.livery
        },
        audio: profile.audio
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(out));
      localStorage.setItem(NAME_KEY, profile.name);
      localStorage.setItem(LEGACY_LOADOUT_KEYS.color, String(profile.cosmetics.color));
      localStorage.setItem(LEGACY_LOADOUT_KEYS.bodyShape, String(profile.cosmetics.bodyShape));
      localStorage.setItem(LEGACY_LOADOUT_KEYS.accent, String(profile.cosmetics.accent));
      localStorage.setItem(LEGACY_LOADOUT_KEYS.trail, String(profile.cosmetics.trail));
      localStorage.setItem(LEGACY_LOADOUT_KEYS.livery, String(profile.cosmetics.livery));
    } catch {
    }
  }
  function getCosmetics() {
    return hangarDraft ? hangarDraft : profile.cosmetics;
  }
  function getPilotName() {
    if (profile.name) return profile.name;
    try {
      return localStorage.getItem(NAME_KEY)?.slice(0, 14) ?? "";
    } catch {
      return "";
    }
  }
  var root = null;
  var router = null;
  var handlers = null;
  var stack = ["home"];
  var screens = /* @__PURE__ */ new Map();
  var $ = (id) => document.getElementById(id);
  var busy = false;
  var hangarDraft = null;
  var lobbySignature = "";
  var settingsDebounce = null;
  var probeToken = 0;
  var pressTimer = null;
  var buzz = (ms) => {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch {
    }
  };
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function topbar(title, opts) {
    return `
    <header class="sc-topbar">
      <button type="button" class="sc-btn sc-btn--ghost sc-back" data-nav-back aria-label="Back">${ICON.back}<span>Back</span></button>
      <h2 class="sc-topbar-title">${escapeHtml(title)}</h2>
      <div class="sc-topbar-actions">${opts?.actions ?? ""}</div>
    </header>`;
  }
  function screenShell(id, cls, inner) {
    return `<section class="sc-screen ${cls}" data-screen="${id}" id="sc-screen-${id}">${inner}</section>`;
  }
  function homeMarkup() {
    return screenShell("home", "sc-screen--home", `
    <button type="button" class="sc-gear" data-nav-go="settings" aria-label="Settings">${ICON.gear}</button>
    <div class="sc-home-center">
      <div class="sc-title-block">
        <div class="sc-title-jet" aria-hidden="true">${ICON.plane}</div>
        <h1 class="sc-wordmark"><span>SMASH</span><em>CART</em></h1>
        <p class="sc-tagline">Local Wi-Fi dogfights - no servers - no waiting</p>
      </div>

      <label class="sc-field sc-home-name">
        <span class="sc-field-label">Pilot name</span>
        <input id="sc-home-name-input" class="sc-input" maxlength="14" placeholder="ACE" autocomplete="off" spellcheck="false" aria-label="Pilot name" />
      </label>

      <div class="sc-home-actions">
        <button type="button" class="sc-btn sc-btn--primary sc-btn--mega" id="sc-home-play" data-nav-go="__create__">${ICON.play}<span>PLAY</span></button>
        <div class="sc-home-row">
          <button type="button" class="sc-btn sc-btn--ghost" data-nav-go="join">${ICON.join}<span>JOIN</span></button>
          <button type="button" class="sc-btn sc-btn--ghost" data-nav-go="hangar">${ICON.plane}<span>HANGAR</span></button>
        </div>
      </div>
      <p id="sc-home-status" class="sc-status" aria-live="polite"></p>
    </div>

    <section class="sc-panel sc-hotspot-card sc-hidden" id="sc-hotspot-card">
      <div class="sc-panel-header">
        <h3 class="sc-panel-title">Game Wi-Fi</h3>
        <button type="button" class="sc-btn sc-btn--primary sc-btn--slim" id="sc-hotspot-toggle">
          ${ICON.wifi}<span>START</span>
        </button>
      </div>
      <p class="sc-note"><span id="sc-hotspot-hint">Open a local game network from this phone.</span></p>
      <div class="sc-hotspot-creds sc-hidden" id="sc-hotspot-creds">
        <div class="sc-hotspot-row"><span class="sc-field-label">Network</span><code class="sc-input sc-input--mono" id="sc-hotspot-ssid">--</code></div>
        <div class="sc-hotspot-row"><span class="sc-field-label">Password</span><code class="sc-input sc-input--mono" id="sc-hotspot-pass">--</code></div>
      </div>
    </section>

    <footer class="sc-home-foot">
      <span>${ICON.wifi}</span><span id="sc-home-foot-text">Same Wi-Fi as your friends -- one player hosts, everyone else joins.</span>
    </footer>
    <a class="sc-btn sc-btn--ghost sc-apk-pill sc-hidden" id="sc-apk-pill" href="/apk/smashcart.apk" download>
      ${ICON.download}<span>GET THE ANDROID APP</span>
    </a>
  `);
  }
  function joinMarkup() {
    return screenShell("join", "sc-screen--join", `
    ${topbar("Join Room")}
    <div class="sc-body sc-join-body">
      <section class="sc-panel" id="sc-join-probe">
        <div class="sc-probe-line">
          <span class="sc-probe-dot" aria-hidden="true"></span>
          <p id="sc-join-probe-status" class="sc-probe-status">Scanning network<span class="sc-ellipsis"></span></p>
        </div>
        <button type="button" class="sc-btn sc-btn--amber sc-btn--wide sc-hidden" id="sc-join-found">
          ${ICON.bolt}<span>HOST FOUND -- TAP TO JOIN</span>
        </button>
        <button type="button" class="sc-btn sc-btn--ghost sc-btn--slim" id="sc-join-rescan">${ICON.refresh}<span>Search again</span></button>
      </section>

      <div class="sc-divider" data-label="or enter address"></div>

      <section class="sc-panel">
        <label class="sc-field">
          <span class="sc-field-label">Host address</span>
          <input id="sc-join-address" class="sc-input sc-input--mono" value="" placeholder="http://192.168.1.42:2567" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="url" aria-label="Host address" />
        </label>
        <button type="button" class="sc-btn sc-btn--primary sc-btn--wide" id="sc-join-submit">${ICON.play}<span>JOIN</span></button>
      </section>

      <p class="sc-note">${ICON.wifi}<span>Ask the host for their lobby QR -- point your phone camera at it, or type the address they see on screen.</span></p>
      <p id="sc-join-status" class="sc-status" aria-live="polite"></p>
    </div>
  `);
  }
  function hangarMarkup() {
    const tabs = [
      ["paint", "PAINT"],
      ["frame", "FRAME"],
      ["accent", "ACCENT"],
      ["livery", "LIVERY"],
      ["trail", "TRAIL"]
    ];
    return screenShell("hangar", "sc-screen--hangar", `
    ${topbar("Hangar", { actions: `
      <button type="button" class="sc-btn sc-btn--primary sc-btn--slim" id="sc-hangar-save">${ICON.check}<span>SAVE</span></button>
    ` })}
    <div class="sc-hangar-stage" aria-hidden="true"></div>
    <nav class="sc-hangar-tabs" role="tablist" aria-label="Customization">
      ${tabs.map(([id, label], i) => `
        <button type="button" class="sc-tab${i === 0 ? " is-active" : ""}" role="tab" aria-selected="${i === 0}" data-hangar-tab="${id}">${label}</button>
      `).join("")}
    </nav>
    <div class="sc-hangar-sheet">
      <div class="sc-hangar-panel is-active" data-hangar-panel="paint">
        <div class="sc-swatch-grid" id="sc-opt-paint"></div>
      </div>
      <div class="sc-hangar-panel" data-hangar-panel="frame">
        <div class="sc-card-grid" id="sc-opt-frame"></div>
      </div>
      <div class="sc-hangar-panel" data-hangar-panel="accent">
        <div class="sc-swatch-grid" id="sc-opt-accent"></div>
      </div>
      <div class="sc-hangar-panel" data-hangar-panel="livery">
        <div class="sc-card-grid" id="sc-opt-livery"></div>
      </div>
      <div class="sc-hangar-panel" data-hangar-panel="trail">
        <div class="sc-swatch-grid" id="sc-opt-trail"></div>
      </div>
    </div>
  `);
  }
  function settingsMarkup() {
    return screenShell("settings", "sc-screen--settings", `
    ${topbar("Settings")}
    <div class="sc-body sc-settings-body">
      <section class="sc-panel">
        <h3 class="sc-section-head">Audio</h3>
        <label class="sc-set-row"><span>Master</span><input type="range" id="sc-vol-master" min="0" max="1" step="0.01" value="1" /></label>
        <label class="sc-set-row"><span>SFX</span><input type="range" id="sc-vol-sfx" min="0" max="1" step="0.01" value="1" /></label>
        <label class="sc-set-row"><span>Music</span><input type="range" id="sc-vol-music" min="0" max="1" step="0.01" value="0.5" /></label>
        <button type="button" class="sc-btn sc-btn--ghost sc-btn--slim" id="sc-mute-toggle"><span>MUTE ALL</span></button>
      </section>

      <section class="sc-panel">
        <h3 class="sc-section-head">Graphics</h3>
        <div class="sc-segmented" role="radiogroup" aria-label="Graphics quality" id="sc-quality-group">
          <button type="button" data-q="low">LOW</button>
          <button type="button" data-q="med">MED</button>
          <button type="button" data-q="high">HIGH</button>
          <button type="button" data-q="auto" class="is-on">AUTO</button>
        </div>
      </section>

      <section class="sc-panel">
        <h3 class="sc-section-head">Pilot</h3>
        <label class="sc-field">
          <span class="sc-field-label">Call sign</span>
          <input id="sc-set-name" class="sc-input" maxlength="14" placeholder="ACE" autocomplete="off" spellcheck="false" />
        </label>
      </section>

      <section class="sc-panel sc-touch-only">
        <h3 class="sc-section-head">Controls</h3>
        <div class="sc-segmented" role="radiogroup" aria-label="Touch control scheme" id="sc-scheme-group">
          <button type="button" data-scheme="dpad">D-PAD</button>
          <button type="button" data-scheme="joystick">STICK</button>
          <button type="button" data-scheme="tilt">TILT</button>
        </div>
        <label class="sc-set-row sc-check-row"><span>Invert pitch</span><input type="checkbox" id="sc-inv-pitch" /></label>
        <label class="sc-set-row sc-check-row"><span>Invert steer</span><input type="checkbox" id="sc-inv-steer" /></label>
      </section>
    </div>
  `);
  }
  function lobbyMarkup() {
    return screenShell("lobby", "sc-screen--lobby", `
    ${topbar("Lobby", { actions: `
      <button type="button" class="sc-btn sc-btn--danger sc-btn--slim" id="sc-lobby-leave">${ICON.exit}<span>LEAVE</span></button>
    ` })}
    <div class="sc-body sc-lobby-body">

      <section class="sc-panel sc-lobby-qr-panel">
        <p class="sc-field-label">ROOM</p>
        <h2 id="sc-lobby-room-name-view" class="sc-lobby-roomname">Private Room</h2>
        <input id="sc-lobby-room-name-edit" class="sc-input" maxlength="20" placeholder="Name this room..." autocomplete="off" aria-label="Room name" />
        <div class="sc-qr-frame">
          <canvas id="sc-lobby-qr" width="0" height="0" aria-label="Join QR code"></canvas>
        </div>
        <p class="sc-note sc-note--tight">${ICON.wifi}<span>Friends: join the same Wi-Fi, then scan this.</span></p>
        <p id="sc-lobby-url" class="sc-lobby-url mono"></p>
      </section>

      <section class="sc-lobby-right">
        <section class="sc-panel sc-lobby-settings-panel" id="sc-lobby-leader-settings">
          <h3 class="sc-section-head">Room settings</h3>
          <label class="sc-set-row">
            <span>Round</span>
            <select id="sc-lobby-round" class="sc-select">
              <option value="60">1:00</option>
              <option value="90">1:30</option>
              <option value="120">2:00</option>
              <option value="150">2:30</option>
              <option value="180">3:00</option>
              <option value="240">4:00</option>
              <option value="300">5:00</option>
            </select>
          </label>
          <label class="sc-set-row sc-check-row">
            <span>Bots fill seats</span>
            <input type="checkbox" id="sc-lobby-bots" />
          </label>
          <div class="sc-segmented sc-segmented--small" id="sc-lobby-difficulty" role="radiogroup" aria-label="Bot difficulty">
            <button type="button" data-diff="easy">EASY</button>
            <button type="button" data-diff="medium">MED</button>
            <button type="button" data-diff="high">HIGH</button>
          </div>
        </section>
        <section class="sc-panel sc-hidden" id="sc-lobby-settings-view">
          <p id="sc-lobby-settings-chips" class="sc-chip-row"></p>
        </section>

        <section class="sc-panel sc-lobby-roster-panel">
          <h3 class="sc-section-head">Pilots <span id="sc-lobby-count" class="sc-count-chip">1</span></h3>
          <div id="sc-lobby-roster" class="sc-roster"></div>
          <p class="sc-hint" id="sc-lobby-kick-hint">Hold a pilot's card to kick them.</p>
        </section>
      </section>
    </div>

    <div class="sc-lobby-actions">
      <button type="button" class="sc-btn sc-btn--ghost" id="sc-lobby-ready">${ICON.check}<span>READY</span></button>
      <button type="button" class="sc-btn sc-btn--primary sc-btn--mega" id="sc-lobby-play">${ICON.play}<span>PLAY</span></button>
    </div>
    <p class="sc-hint sc-lobby-autohint">Starts automatically when every pilot is ready.</p>
  `);
  }
  function pauseMarkup() {
    return `
    <div id="sc-pause" class="sc-pause sc-hidden" role="dialog" aria-modal="true" aria-label="Paused">
      <div class="sc-pause-card">
        <div class="sc-pause-icon" aria-hidden="true">${ICON.pause}</div>
        <h2>PAUSED</h2>
        <div class="sc-pause-actions">
          <button type="button" class="sc-btn sc-btn--primary sc-btn--wide" id="sc-pause-resume">${ICON.play}<span>RESUME</span></button>
          <button type="button" class="sc-btn sc-btn--danger sc-btn--wide" id="sc-pause-leave">${ICON.exit}<span>LEAVE MATCH</span></button>
        </div>
        <p class="sc-hint">Leaving keeps the match running for everyone else.</p>
      </div>
    </div>`;
  }
  function mountScreens(hostEl, h) {
    root = hostEl;
    handlers = h;
    readProfile();
    root.innerHTML = `
    <div class="sc-root">
      <div class="sc-router" id="sc-router">
        ${homeMarkup()}
        ${joinMarkup()}
        ${hangarMarkup()}
        ${settingsMarkup()}
        ${lobbyMarkup()}
      </div>
      ${pauseMarkup()}
    </div>`;
    root.classList.remove("hidden");
    document.body.classList.add("sc-menu-open");
    router = $("sc-router");
    router.querySelectorAll(".sc-screen").forEach((el) => {
      const id = el.dataset.screen;
      screens.set(id, el);
    });
    wireNav();
    wireHome();
    wireJoin();
    wireHangar();
    wireSettings();
    wireLobby();
    wirePause();
    showScreen("home");
    reflectProfileIntoUI();
    applyStoredAudioPrefs();
  }
  function reflectProfileIntoUI() {
    const nameInput = $("sc-home-name-input");
    if (nameInput) nameInput.value = profile.name;
    const setName = $("sc-set-name");
    if (setName) setName.value = profile.name;
  }
  function applyStoredAudioPrefs() {
    const a = profile.audio;
    if (!a) return;
    try {
      if (typeof a.master === "number") window.SFX.setMaster(a.master);
      if (typeof a.sfx === "number") window.SFX.setSfx(a.sfx);
      if (typeof a.music === "number") window.SFX.setMusic(a.music);
    } catch {
    }
  }
  function currentScreenId() {
    return stack[stack.length - 1] || "home";
  }
  var TRANSITION_MS = 340;
  function showScreen(id, dir = "forward") {
    if (!router) return;
    if (currentScreenId() === id && screens.get(id)?.classList.contains("is-active")) return;
    stopProbe();
    const prevId = currentScreenId();
    const prevEl = screens.get(prevId);
    const nextEl = screens.get(id);
    if (!nextEl) return;
    if (id === "hangar") beginHangarDraft();
    if (id === "settings") populateSettingsUI();
    if (id === "join") startProbe();
    stack.push(id);
    if (prevEl && prevEl !== nextEl && prevEl.classList.contains("is-active")) {
      prevEl.classList.add(dir === "back" ? "anim-back-out" : "anim-fwd-out");
      prevEl.setAttribute("aria-hidden", "true");
      window.setTimeout(() => {
        prevEl.classList.remove("is-active", "anim-fwd-out", "anim-back-out");
      }, TRANSITION_MS);
    }
    nextEl.classList.remove("anim-fwd-in", "anim-back-in", "anim-fwd-out", "anim-back-out");
    void nextEl.offsetWidth;
    nextEl.classList.add("is-active", dir === "back" ? "anim-back-in" : "anim-fwd-in");
    nextEl.removeAttribute("aria-hidden");
    if (stack[stack.length - 1] !== id) stack.push(id);
    const scroller = nextEl.querySelector(".sc-body");
    if (scroller) scroller.scrollTop = 0;
  }
  function navBack() {
    if (stack.length <= 1) return;
    const leaving = currentScreenId();
    if (leaving === "hangar") cancelHangarDraft();
    stack.pop();
    showScreen(stack[stack.length - 1] || "home", "back");
  }
  function resetToHome() {
    cancelHangarDraft();
    stack = ["home"];
    for (const [, el] of screens) el.classList.remove("is-active", "anim-fwd-in", "anim-back-in", "anim-fwd-out", "anim-back-out");
    showScreen("home", "back");
    hidePause();
  }
  function applyInitialHash() {
    const hash = location.hash.replace(/^#/, "").toLowerCase();
    const valid = ["join", "hangar", "settings"];
    if (valid.includes(hash)) {
      stack = ["home"];
      showScreen(hash);
    }
  }
  function wireNav() {
    root.addEventListener("click", (e) => {
      const target = e.target;
      const go = target.closest("[data-nav-go]");
      if (go) {
        const dest = go.dataset.navGo;
        uiTap();
        if (dest === "__create__") {
          handlers?.onCreate();
          return;
        }
        showScreen(dest);
        return;
      }
      if (target.closest("[data-nav-back]")) {
        uiTap();
        navBack();
      }
    });
  }
  function uiTap() {
    buzz(8);
    try {
      window.SFX.unlock();
    } catch {
    }
    try {
      window.SFX.uiClick();
    } catch {
    }
  }
  function setBusy(b) {
    busy = b;
    for (const id of ["sc-home-play", "sc-join-submit", "sc-join-found"]) {
      const el = $(id);
      if (el) el.disabled = b;
    }
    document.body.classList.toggle("sc-busy", b);
  }
  function setStatus(text, screen2 = "home") {
    const el = $(screen2 === "home" ? "sc-home-status" : "sc-join-status");
    if (el) el.textContent = text;
  }
  function wireHome() {
    const nameInput = $("sc-home-name-input");
    const commit = () => {
      const clean = nameInput.value.trim().slice(0, 14);
      nameInput.value = clean;
      saveProfile({ name: clean });
    };
    nameInput.addEventListener("change", commit);
    nameInput.addEventListener("blur", commit);
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
        nameInput.blur();
      }
    });
    wireHotspotCard();
  }
  var hotspotOn = false;
  async function apkAvailable() {
    try {
      const res = await fetch("/apk/smashcart.apk", { method: "HEAD" });
      return res.ok;
    } catch {
      return false;
    }
  }
  function wireHotspotCard() {
    const native = isNativeApp();
    const card = $("sc-hotspot-card");
    const pill = $("sc-apk-pill");
    if (pill && !native) void apkAvailable().then((ok) => pill.classList.toggle("sc-hidden", !ok));
    else if (pill) pill.classList.add("sc-hidden");
    if (!card) return;
    card.classList.toggle("sc-hidden", !native);
    if (!native) return;
    const footText = $("sc-home-foot-text");
    if (footText) footText.textContent = "Start the game Wi-Fi here, then run SmashCart on your PC joined to this network.";
    void reflectHotspotState();
    $("sc-hotspot-toggle")?.addEventListener("click", () => {
      void toggleHotspot();
    });
  }
  async function reflectHotspotState() {
    try {
      const st = await gameHotspotStatus();
      setHotspotUi(st.active ? { ssid: st.ssid, passphrase: st.passphrase } : null);
      hotspotOn = Boolean(st.active);
    } catch {
    }
  }
  async function toggleHotspot() {
    const btn = $("sc-hotspot-toggle");
    const status = $("sc-home-status");
    buzz(12);
    if (hotspotOn) {
      await stopGameHotspot();
      hotspotOn = false;
      setHotspotUi(null);
      if (status) status.textContent = "";
      return;
    }
    if (btn) btn.classList.add("is-busy");
    try {
      const info = await startGameHotspot();
      hotspotOn = true;
      setHotspotUi(info);
      if (status) status.textContent = "Game network live. Friends join this Wi-Fi, you join from your PC's SmashCart.";
    } catch (e) {
      if (status) status.textContent = e?.message || "Could not open the game network.";
    } finally {
      btn?.classList.remove("is-busy");
    }
  }
  function setHotspotUi(info) {
    const creds = $("sc-hotspot-creds");
    const ssidEl = $("sc-hotspot-ssid");
    const passEl = $("sc-hotspot-pass");
    const hint = $("sc-hotspot-hint");
    const btn = $("sc-hotspot-toggle");
    if (!creds || !ssidEl || !passEl || !hint || !btn) return;
    if (!info) {
      creds.classList.add("sc-hidden");
      hint.textContent = "Open a local game network from this phone.";
      const label2 = btn.querySelector("span");
      if (label2) label2.textContent = "START";
      return;
    }
    ssidEl.textContent = info.ssid || "Android Hotspot";
    passEl.textContent = info.passphrase || "(see Android hotspot settings)";
    creds.classList.remove("sc-hidden");
    hint.textContent = "Friends: connect to this network, then open the address your PC shows.";
    const label = btn.querySelector("span");
    if (label) label.textContent = "STOP";
  }
  var MDNS_HOST = "smashcart.local";
  var PROBE_TIMEOUT_MS = 3e3;
  function mdnsOrigin() {
    const port = location.port || "2567";
    return `${MDNS_HOST}:${port}`;
  }
  function probeReachable(origin, token) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        resolve(ok);
      };
      const timer = window.setTimeout(() => finish(false), PROBE_TIMEOUT_MS);
      const img = new Image();
      img.onload = () => {
        window.clearTimeout(timer);
        finish(true);
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        finish(false);
      };
      img.src = `http://${origin}/icons/icon.svg?t=${Date.now()}-${token}`;
    });
  }
  function startProbe() {
    const token = ++probeToken;
    const statusEl = $("sc-join-probe-status");
    const foundBtn = $("sc-join-found");
    const rescanBtn = $("sc-join-rescan");
    const probeLine = document.querySelector("#sc-join-probe .sc-probe-line");
    if (!statusEl || !foundBtn || !rescanBtn) return;
    foundBtn.classList.add("sc-hidden");
    rescanBtn.classList.add("sc-hidden");
    if (probeLine) probeLine.classList.remove("sc-hidden");
    statusEl.innerHTML = 'Scanning network<span class="sc-ellipsis"></span>';
    const origin = mdnsOrigin();
    probeReachable(origin, token).then((ok) => {
      if (token !== probeToken) return;
      if (ok) {
        if (probeLine) probeLine.classList.add("sc-hidden");
        foundBtn.classList.remove("sc-hidden");
        foundBtn.dataset.origin = origin;
      } else {
        statusEl.textContent = "No host answered on smashcart.local.";
        if (probeLine) probeLine.classList.remove("sc-hidden");
        rescanBtn.classList.remove("sc-hidden");
      }
    });
  }
  function stopProbe() {
    probeToken++;
  }
  function parseAddress(raw) {
    let s = raw.trim();
    if (!s) return null;
    if (!/^https?:\/\//i.test(s)) s = "http://" + s;
    try {
      const url = new URL(s);
      if (!url.hostname) return null;
      return url.port ? `${url.hostname}:${url.port}` : url.hostname;
    } catch {
      return null;
    }
  }
  function wireJoin() {
    const addressInput = $("sc-join-address");
    addressInput.value = "http://192.168.";
    addressInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitJoin();
      }
    });
    const submitBtn = $("sc-join-submit");
    submitBtn?.addEventListener("click", submitJoin);
    const foundBtn = $("sc-join-found");
    foundBtn?.addEventListener("click", () => {
      uiTap();
      const origin = foundBtn.dataset.origin;
      if (origin && handlers) handlers.onJoinHost(origin);
    });
    $("sc-join-rescan")?.addEventListener("click", () => {
      uiTap();
      startProbe();
    });
    function submitJoin() {
      if (busy) return;
      const host = parseAddress(addressInput.value);
      if (!host) {
        setStatus("That doesn't look like an address -- try http://192.168.x.x:2567", "join");
        return;
      }
      uiTap();
      setStatus(`Joining ${host}...`, "join");
      handlers?.onJoinHost(host);
    }
  }
  function beginHangarDraft() {
    hangarDraft = cloneLoadout(profile.cosmetics);
    renderHangarOptions();
  }
  function cancelHangarDraft() {
    if (hangarDraft && !sameLoadout(hangarDraft, profile.cosmetics)) {
      try {
        if (window.Renderer && window.Renderer.updateMenuPlane) {
          window.Renderer.updateMenuPlane(profile.cosmetics);
        }
      } catch {
      }
    }
    hangarDraft = null;
  }
  function commitHangar(save) {
    if (hangarDraft && save) {
      saveProfile({ cosmetics: cloneLoadout(hangarDraft) });
    }
    hangarDraft = null;
  }
  function renderHangarOptions() {
    const draft = hangarDraft || profile.cosmetics;
    const swatch = (targetId, key, options) => {
      const target = $(targetId);
      if (!target) return;
      target.innerHTML = options.map((o) => `
      <button type="button" class="sc-swatch${draft[key] === o.value ? " is-selected" : ""}"
              data-key="${key}" data-value="${o.value}" style="--swatch:${o.swatch || "#fff"}"
              aria-label="${escapeHtml(o.label)}">
        <span class="sc-swatch-core"></span>
        <span class="sc-swatch-label">${escapeHtml(o.label)}</span>
      </button>`).join("");
      target.querySelectorAll(".sc-swatch").forEach((btn) => {
        btn.addEventListener("click", () => {
          uiTap();
          pickOption(btn.dataset.key, Number(btn.dataset.value));
        });
      });
    };
    const cards = (targetId, key, options) => {
      const target = $(targetId);
      if (!target) return;
      target.innerHTML = options.map((o) => `
      <button type="button" class="sc-opt-card${draft[key] === o.value ? " is-selected" : ""}"
              data-key="${key}" data-value="${o.value}">
        <strong>${escapeHtml(o.label)}</strong>
        <span>${escapeHtml(o.note)}</span>
      </button>`).join("");
      target.querySelectorAll(".sc-opt-card").forEach((btn) => {
        btn.addEventListener("click", () => {
          uiTap();
          pickOption(btn.dataset.key, Number(btn.dataset.value));
        });
      });
    };
    swatch("sc-opt-paint", "color", PAINT_OPTIONS);
    swatch("sc-opt-accent", "accent", ACCENT_OPTIONS);
    swatch("sc-opt-trail", "trail", TRAIL_OPTIONS);
    cards("sc-opt-frame", "bodyShape", AIRFRAME_OPTIONS);
    cards("sc-opt-livery", "livery", LIVERY_OPTIONS);
  }
  function pickOption(key, value) {
    if (!hangarDraft) return;
    const next = cloneLoadout(hangarDraft);
    next[key] = value;
    hangarDraft = next;
    renderHangarOptions();
    try {
      if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(hangarDraft);
    } catch {
    }
  }
  function wireHangar() {
    root.querySelectorAll("[data-hangar-tab]").forEach((tab) => {
      tab.addEventListener("click", () => {
        uiTap();
        const target = tab.dataset.hangarTab;
        root.querySelectorAll("[data-hangar-tab]").forEach((t) => {
          const active = t === tab;
          t.classList.toggle("is-active", active);
          t.setAttribute("aria-selected", active ? "true" : "false");
        });
        root.querySelectorAll("[data-hangar-panel]").forEach((panel) => {
          panel.classList.toggle("is-active", panel.dataset.hangarPanel === target);
        });
      });
    });
    $("sc-hangar-save")?.addEventListener("click", () => {
      commitHangar(true);
      uiTap();
      const saveBtn = $("sc-hangar-save");
      if (saveBtn) {
        saveBtn.classList.add("did-save");
        window.setTimeout(() => saveBtn.classList.remove("did-save"), 900);
      }
      beginHangarDraft();
    });
  }
  function populateSettingsUI() {
    try {
      const vols = window.SFX.vols();
      const master = $("sc-vol-master");
      const sfx = $("sc-vol-sfx");
      const music = $("sc-vol-music");
      if (master) master.value = String(vols.master);
      if (sfx) sfx.value = String(vols.sfx);
      if (music) music.value = String(vols.music);
      const muteBtn = $("sc-mute-toggle");
      if (muteBtn) muteBtn.classList.toggle("is-on", !!vols.muted);
    } catch {
    }
    try {
      const tier = window.Quality._auto ? "auto" : window.Quality.current;
      document.querySelectorAll("#sc-quality-group button").forEach((b) => {
        b.classList.toggle("is-on", b.dataset.q === tier);
      });
    } catch {
    }
    const nameEl = $("sc-set-name");
    if (nameEl && document.activeElement !== nameEl) nameEl.value = profile.name;
    try {
      document.querySelectorAll("#sc-scheme-group button").forEach((b) => {
        b.classList.toggle("is-on", b.dataset.scheme === window.Input.controlScheme);
      });
    } catch {
    }
    const invP = $("sc-inv-pitch");
    const invS = $("sc-inv-steer");
    if (invP) invP.checked = !!window.Input.invertPitch;
    if (invS) invS.checked = !!window.Input.invertSteer;
  }
  function wireSettings() {
    const bindVol = (id, setter, slot) => {
      const el = $(id);
      el?.addEventListener("input", () => {
        const v = parseFloat(el.value);
        if (!Number.isFinite(v)) return;
        try {
          setter(v);
        } catch {
        }
        saveProfile({ audio: { [slot]: v } });
      });
    };
    bindVol("sc-vol-master", (v) => window.SFX.setMaster(v), "master");
    bindVol("sc-vol-sfx", (v) => window.SFX.setSfx(v), "sfx");
    bindVol("sc-vol-music", (v) => window.SFX.setMusic(v), "music");
    $("sc-mute-toggle")?.addEventListener("click", () => {
      uiTap();
      const muted = window.SFX.toggleMute();
      $("sc-mute-toggle")?.classList.toggle("is-on", muted);
    });
    const applyQuality = (q) => {
      try {
        if (q === "auto") {
          window.Quality._auto = true;
          try {
            localStorage.removeItem("sc_quality");
          } catch {
          }
        } else {
          window.Quality.set(q, true);
        }
      } catch {
      }
      document.querySelectorAll("#sc-quality-group button").forEach((b) => {
        b.classList.toggle("is-on", b.dataset.q === q);
      });
    };
    document.querySelectorAll("#sc-quality-group button").forEach((b) => {
      b.addEventListener("click", () => {
        uiTap();
        applyQuality(b.dataset.q);
      });
    });
    const nameEl = $("sc-set-name");
    const commitName = () => {
      const clean = nameEl.value.trim().slice(0, 14);
      nameEl.value = clean;
      saveProfile({ name: clean });
      const homeName = $("sc-home-name-input");
      if (homeName) homeName.value = clean;
    };
    nameEl.addEventListener("change", commitName);
    nameEl.addEventListener("blur", commitName);
    document.querySelectorAll("#sc-scheme-group button").forEach((b) => {
      b.addEventListener("click", () => {
        uiTap();
        const scheme = b.dataset.scheme;
        persistControlScheme(scheme);
        if (scheme === "tilt") {
          window.Input.attachTilt();
          const DevOri = DeviceOrientationEvent;
          if (typeof DevOri.requestPermission !== "function") {
            window.Input.setControlScheme("tilt");
          }
        } else {
          window.Input.setControlScheme(scheme);
        }
        document.querySelectorAll("#sc-scheme-group button").forEach((x) => {
          x.classList.toggle("is-on", x === b);
        });
      });
    });
    const invP = $("sc-inv-pitch");
    invP?.addEventListener("change", () => {
      window.Input.invertPitch = invP.checked;
      try {
        localStorage.setItem("smashcart.invertPitch", invP.checked ? "1" : "0");
      } catch {
      }
    });
    const invS = $("sc-inv-steer");
    invS?.addEventListener("change", () => {
      window.Input.invertSteer = invS.checked;
      try {
        localStorage.setItem("smashcart.invertSteer", invS.checked ? "1" : "0");
      } catch {
      }
    });
  }
  function setLobbyQr(joinUrl) {
    const canvas = $("sc-lobby-qr");
    if (!canvas) return;
    try {
      window.QR.render(canvas, joinUrl, { size: 220, margin: 2, errorCorrectionLevel: "M" });
    } catch {
      canvas.width = 0;
      canvas.height = 0;
    }
    const urlEl = $("sc-lobby-url");
    if (urlEl) urlEl.textContent = joinUrl;
  }
  function fmtLen(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s ? `${m}:${String(s).padStart(2, "0")}` : `${m}:00`;
  }
  function renderLobby(data) {
    const sig = JSON.stringify(data);
    if (sig === lobbySignature) return;
    lobbySignature = sig;
    const iAmLeader = !!data.myId && data.myId === data.leaderId;
    const viewEl = $("sc-lobby-room-name-view");
    const editEl = $("sc-lobby-room-name-edit");
    if (viewEl) viewEl.textContent = data.roomName || "Private Room";
    if (editEl && document.activeElement !== editEl) editEl.value = data.roomName || "";
    $("sc-lobby-leader-settings")?.classList.toggle("sc-hidden", !iAmLeader);
    $("sc-lobby-settings-view")?.classList.toggle("sc-hidden", iAmLeader);
    $("sc-lobby-play")?.classList.toggle("sc-hidden", !iAmLeader);
    $("sc-lobby-play")?.setAttribute("aria-hidden", iAmLeader ? "false" : "true");
    $("sc-lobby-kick-hint")?.classList.toggle("sc-hidden", !iAmLeader);
    if (iAmLeader) {
      const roundSel = $("sc-lobby-round");
      if (roundSel && document.activeElement !== roundSel) roundSel.value = String(data.roundLength);
      const bots = $("sc-lobby-bots");
      if (bots) bots.checked = !!data.botsInRoom;
      document.querySelectorAll("#sc-lobby-difficulty button").forEach((b) => {
        b.classList.toggle("is-on", b.dataset.diff === data.botDifficulty);
      });
    } else {
      const chips = $("sc-lobby-settings-chips");
      if (chips) {
        chips.innerHTML = `<span class="sc-chip">ROUND ${fmtLen(data.roundLength)}</span><span class="sc-chip">BOTS ${data.botsInRoom ? "ON" : "OFF"}</span><span class="sc-chip">${escapeHtml(String(data.botDifficulty || "medium").toUpperCase())} BOTS</span>`;
      }
    }
    const rosterEl = $("sc-lobby-roster");
    if (rosterEl) {
      const hexOf = (idx) => PAINT_OPTIONS[idx >= 0 && idx < PAINT_OPTIONS.length ? idx : 0]?.swatch || "#fff";
      rosterEl.innerHTML = data.roster.map((p) => {
        const mine = p.id === data.myId;
        const kickable = iAmLeader && !mine && !p.bot;
        const badge = p.id === data.leaderId ? '<span class="sc-badge sc-badge--lead">LEAD</span>' : p.bot ? '<span class="sc-badge sc-badge--bot">BOT</span>' : "";
        return `
        <div class="sc-player${mine ? " is-me" : ""}${kickable ? " is-kickable" : ""}${p.ready ? " is-ready" : ""}" data-id="${escapeHtml(p.id)}"${mine ? ' data-self="1"' : ""}>
          <span class="sc-dot" style="--dot:${hexOf(p.color)}"></span>
          <span class="sc-player-name">${escapeHtml(p.name)}${mine ? '<span class="sc-badge sc-badge--you">YOU</span>' : ""}</span>
          ${badge}
          <span class="sc-tick"${p.ready ? ' aria-label="Ready"' : ' aria-label="Not ready"'}>${ICON.check}</span>
        </div>`;
      }).join("");
      rosterEl.querySelectorAll(".sc-player.is-kickable").forEach((card) => {
        attachHoldToKick(card);
      });
      rosterEl.querySelectorAll('.sc-player[data-self="1"]').forEach((card) => {
        card.addEventListener("click", (e) => {
          if (e.target.closest(".sc-kick")) return;
          uiTap();
          handlers?.onLobbyReady();
        });
      });
    }
    const countEl = $("sc-lobby-count");
    if (countEl) countEl.textContent = String(data.roster.length);
    const me = data.roster.find((p) => p.id === data.myId);
    const readyBtn = $("sc-lobby-ready");
    if (readyBtn && me) {
      readyBtn.classList.toggle("is-on", !!me.ready);
      const label = readyBtn.querySelector("span");
      if (label) label.textContent = me.ready ? "UNREADY" : "READY";
    }
  }
  function attachHoldToKick(card) {
    const clear = () => {
      if (pressTimer !== null) {
        window.clearTimeout(pressTimer);
        pressTimer = null;
      }
      card.classList.remove("is-pressing");
    };
    card.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      card.classList.add("is-pressing");
      pressTimer = window.setTimeout(() => {
        clear();
        const name = card.querySelector(".sc-player-name")?.textContent || "this pilot";
        if (window.confirm(`Kick ${name} from the room?`)) {
          const id = card.dataset.id;
          if (id && handlers) handlers.onLobbyKick(id);
        }
      }, 550);
    });
    card.addEventListener("pointerup", clear);
    card.addEventListener("pointercancel", clear);
    card.addEventListener("pointerleave", clear);
  }
  function wireLobby() {
    $("sc-lobby-ready")?.addEventListener("click", () => {
      uiTap();
      handlers?.onLobbyReady();
    });
    $("sc-lobby-play")?.addEventListener("click", () => {
      uiTap();
      handlers?.onLobbyStart();
    });
    $("sc-lobby-leave")?.addEventListener("click", () => {
      uiTap();
      handlers?.onLobbyLeave();
    });
    const edit = $("sc-lobby-room-name-edit");
    edit?.addEventListener("input", () => {
      if (settingsDebounce !== null) window.clearTimeout(settingsDebounce);
      settingsDebounce = window.setTimeout(() => {
        settingsDebounce = null;
        handlers?.onLobbySettings({ roomName: edit.value });
      }, 300);
    });
    edit?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        edit.blur();
      }
    });
    $("sc-lobby-round")?.addEventListener("change", () => {
      const sel = $("sc-lobby-round");
      const v = parseInt(sel.value, 10);
      if (Number.isFinite(v)) handlers?.onLobbySettings({ roundLength: v });
    });
    $("sc-lobby-bots")?.addEventListener("change", () => {
      const box = $("sc-lobby-bots");
      handlers?.onLobbySettings({ botsInRoom: box.checked });
    });
    document.querySelectorAll("#sc-lobby-difficulty button").forEach((b) => {
      b.addEventListener("click", () => {
        uiTap();
        document.querySelectorAll("#sc-lobby-difficulty button").forEach((x) => {
          x.classList.toggle("is-on", x === b);
        });
        handlers?.onLobbySettings({ botDifficulty: b.dataset.diff });
      });
    });
  }
  function invalidateLobbyCache() {
    lobbySignature = "";
  }
  function showPause() {
    $("sc-pause")?.classList.remove("sc-hidden");
  }
  function hidePause() {
    $("sc-pause")?.classList.add("sc-hidden");
  }
  function wirePause() {
    $("sc-pause-resume")?.addEventListener("click", () => {
      uiTap();
      handlers?.onPauseResume();
    });
    $("sc-pause-leave")?.addEventListener("click", () => {
      uiTap();
      handlers?.onPauseLeave();
    });
  }
  function loadStoredControlPrefs() {
    try {
      window.Input.invertPitch = localStorage.getItem("smashcart.invertPitch") === "1";
    } catch {
    }
    try {
      window.Input.invertSteer = localStorage.getItem("smashcart.invertSteer") === "1";
    } catch {
    }
    try {
      const saved = localStorage.getItem("smashcart.controls");
      if (saved === "joystick" || saved === "tilt" || saved === "dpad") window.Input.controlScheme = saved;
    } catch {
    }
  }
  function persistControlScheme(scheme) {
    try {
      localStorage.setItem("smashcart.controls", scheme);
    } catch {
    }
  }

  // src/client/main.ts
  var dollar = (id) => document.getElementById(id);
  var net = new WsTransport();
  window.Net = net;
  var G = window.GAME;
  var buzz2 = (ms) => {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch {
    }
  };
  var els = {
    canvas: dollar("game"),
    hud: dollar("hud"),
    score: dollar("hud-score"),
    time: dollar("hud-time"),
    alt: dollar("hud-alt"),
    speed: dollar("hud-speed"),
    boostFill: dollar("boost-fill"),
    crosshair: dollar("crosshair"),
    oobWarning: dollar("oob-warning"),
    leaderboard: dollar("leaderboard"),
    health: dollar("healthbar"),
    healthfill: dollar("healthfill"),
    respawn: dollar("respawn"),
    start: dollar(MENU_HOST_ID),
    mute: dollar("mute-btn"),
    inter: dollar("intermission"),
    finalBoard: dollar("final-board"),
    interTime: dollar("inter-time"),
    winnerLine: dollar("winner-line"),
    yourPlace: dollar("your-place"),
    killfeed: dollar("killfeed"),
    callout: dollar("callout"),
    vignette: dollar("vignette"),
    powerChip: dollar("power-chip"),
    touch: dollar("touch-controls"),
    left: dollar("left-btn"),
    right: dollar("right-btn"),
    climb: dollar("climb-btn"),
    dive: dollar("dive-btn"),
    boost: dollar("boost-btn"),
    fire: dollar("fire-btn"),
    rotate: dollar("rotate-overlay"),
    countdown: dollar("countdown"),
    interLeave: dollar("intermission-leave"),
    ingameMenuBtn: dollar("ingame-menu-btn"),
    toast: dollar("toast"),
    hudTeamScore: dollar("hud-team-score"),
    hudTeamBlue: dollar("hud-team-blue"),
    hudTeamRed: dollar("hud-team-red"),
    hudTScore0: dollar("hud-tscore0"),
    hudTScore1: dollar("hud-tscore1"),
    bootOverlay: dollar("boot-overlay"),
    fatalOverlay: dollar("fatal-overlay"),
    fatalMsg: dollar("fatal-msg")
  };
  var mode = "menu";
  var sceneMode = "preflight";
  var last = 0;
  var prevPhase = "lobby";
  var prevHp = G.MAX_HP;
  var lastFireSnd = 0;
  var wasEmpd = false;
  var wasFrozen = false;
  var smashTrack = /* @__PURE__ */ new Map();
  function getTrack(id) {
    let t = smashTrack.get(id);
    if (!t) {
      t = { streak: 0, last: 0, rapid: 0 };
      smashTrack.set(id, t);
    }
    return t;
  }
  var lastKiller = "";
  var prevLeader = "";
  var engineStarted = false;
  var deathTime = -1;
  var wasAlive = true;
  var oobShownUntil = 0;
  var boostLevel = 0;
  var countdownActive = false;
  var ICON_SND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
  var ICON_SND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6"/><path d="m17 9 6 6"/></svg>';
  function escapeHtml2(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function formatClock(totalSeconds) {
    const safe = Math.max(0, Math.ceil(totalSeconds || 0));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
  function deriveSceneMode(state = window.Net?.state) {
    if (mode === "menu") return currentScreenId() === "hangar" ? "customize" : "preflight";
    if (mode === "lobby") return "lobby";
    if (mode === "paused") return "paused";
    if (mode === "playing") return state && state.phase === "intermission" ? "results" : "playing";
    return "preflight";
  }
  function syncSceneMode(state = window.Net?.state) {
    const next = deriveSceneMode(state);
    if (sceneMode === next && document.body.dataset.sceneMode === next) return;
    sceneMode = next;
    document.body.dataset.sceneMode = next;
    if (window.Renderer && window.Renderer.setSceneMode) window.Renderer.setSceneMode(next);
  }
  function applyMode(nextMode) {
    mode = nextMode;
    const inFlight = mode === "playing" || mode === "paused";
    const showHost = mode !== "playing" && mode !== "error";
    els.bootOverlay.classList.add("hidden");
    els.start.classList.toggle("hidden", !showHost);
    els.start.classList.toggle("sc-paused-host", mode === "paused");
    document.body.classList.toggle("sc-menu-open", showHost);
    els.hud.classList.toggle("hidden", !inFlight);
    els.health.classList.toggle("hidden", !inFlight);
    els.crosshair.classList.toggle("hidden", mode !== "playing");
    els.fatalOverlay.classList.toggle("hidden", mode !== "error");
    if (mode !== "playing") {
      els.oobWarning.classList.add("hidden");
      els.respawn.classList.add("hidden");
      els.powerChip.classList.add("hidden");
    }
    if (!inFlight) els.touch.classList.add("hidden");
    syncSceneMode(window.Net?.state);
  }
  function showFatal(msg) {
    els.fatalMsg.textContent = msg;
    applyMode("error");
  }
  async function connectAndEnterLobby(serverOrigin) {
    window.SFX.unlock();
    let name = getPilotName().trim().slice(0, 14);
    if (!name) name = "Pilot";
    net.onKill = onKill;
    net.onPickup = onPickup;
    net.onDisconnect = onDisconnect;
    net.onStateChange = onNetStateChange;
    setBusy(true);
    setStatus(serverOrigin ? `Connecting to ${serverOrigin}\u2026` : "Opening room\u2026", serverOrigin ? "join" : "home");
    try {
      await net.connect(name, "local", getCosmetics(), serverOrigin);
    } catch (e) {
      setBusy(false);
      setStatus("Could not connect: " + (e && e.message ? e.message : e), serverOrigin ? "join" : "home");
      return;
    }
    setBusy(false);
    setStatus("", serverOrigin ? "join" : "home");
    const phase = net.getPhase();
    if (phase === "playing") {
      enterPlayingFromNet();
      return;
    }
    enterLobby();
  }
  function enterLobby() {
    invalidateLobbyCache();
    renderLobbyFromNet();
    drawLobbyQr();
    applyMode("lobby");
    showScreen("lobby");
  }
  function drawLobbyQr() {
    let url = location.origin + location.pathname;
    try {
      const u = new URL(location.href);
      u.hash = "";
      url = u.toString();
    } catch {
    }
    setLobbyQr(url);
  }
  function renderLobbyFromNet() {
    const state = window.Net.state;
    if (!state) return;
    renderLobby({
      roomName: state.roomName || "",
      roundLength: typeof state.roundLength === "number" ? state.roundLength : 150,
      botsInRoom: !!state.botsInRoom,
      botDifficulty: state.botDifficulty || "medium",
      leaderId: state.hostId || "",
      myId: window.Net.sessionId,
      roster: window.Net.getRosterSnapshot()
    });
  }
  function resetCombatTrackers() {
    prevPhase = "playing";
    prevHp = G.MAX_HP;
    wasAlive = true;
    deathTime = -1;
    wasEmpd = false;
    wasFrozen = false;
    smashTrack.clear();
    lastKiller = "";
    prevLeader = "";
    boostLevel = 0;
    oobShownUntil = 0;
  }
  function enterImmersive() {
    requestAppFullscreen();
    keepAwake();
  }
  function exitImmersive() {
    releaseAwake();
    exitAppFullscreen();
  }
  function enterPlayingFromNet() {
    resetCombatTrackers();
    applyMode("playing");
    enterImmersive();
    if (window.Input.isTouchDevice()) {
      els.touch.classList.remove("hidden");
      applyControlSchemeUI(window.Input.controlScheme);
    }
    if (!engineStarted) {
      window.SFX.startEngine();
      engineStarted = true;
    }
    if (window.SFX.stopMenuAmbient) window.SFX.stopMenuAmbient();
    window.SFX.startMusic();
    runCountdown();
  }
  function togglePause() {
    if (mode === "playing") {
      applyMode("paused");
      showPause();
      window.Net.sendInput(0, 0, false, false);
      window.SFX.setEngine(0, false);
    } else if (mode === "paused") {
      hidePause();
      applyMode("playing");
    }
  }
  function leaveMatch(reason) {
    hidePause();
    window.Net.onStateChange = null;
    try {
      window.Net.leave();
    } catch {
    }
    resetToHome2(reason);
  }
  function resetToHome2(statusMsg) {
    hidePause();
    exitImmersive();
    if (window.SFX.stopLoops) window.SFX.stopLoops();
    if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient();
    engineStarted = false;
    wasAlive = true;
    deathTime = -1;
    lastKiller = "";
    prevLeader = "";
    smashTrack.clear();
    countdownActive = false;
    boostLevel = 0;
    oobShownUntil = 0;
    els.countdown.classList.remove("pop", "go");
    els.countdown.textContent = "";
    els.time.classList.remove("low");
    els.inter.classList.add("hidden");
    els.respawn.classList.add("hidden");
    els.powerChip.classList.add("hidden");
    els.hudTeamScore.classList.add("hidden");
    prevPhase = "lobby";
    applyMode("menu");
    resetToHome();
    if (statusMsg) setStatus(statusMsg, "home");
    updateRotateOverlay();
  }
  function onDisconnect(info) {
    if (mode === "error" || mode === "menu") return;
    const kicked = !!(info && (info.type === "kicked" || info.reason === "kicked"));
    const msg = kicked ? "You were kicked by the room leader." : "Disconnected from the room.";
    leaveMatch(msg);
    pushToast(msg, "leader");
  }
  function onNetStateChange() {
    if (mode !== "lobby") return;
    renderLobbyFromNet();
    const phase = window.Net.getPhase();
    if (phase === "playing") {
      enterPlayingFromNet();
    }
  }
  function loop(ts) {
    requestAnimationFrame(loop);
    let dt = (ts - last) / 1e3;
    last = ts;
    if (!isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    const state = window.Net.state;
    syncSceneMode(state);
    if (mode === "playing" && state) {
      const myId = window.Net.sessionId;
      const input = window.Input.get();
      window.Net.sendInput(input.turn, input.climb, input.boost, input.fire);
      window.Net.stepLocal(dt);
      window.Quality.sample(dt);
      window.Renderer.sync(state, dt, myId);
      window.Renderer.draw(state, myId);
      updateHud(state, myId);
      const me = state.players.get(myId);
      if (me && engineStarted) {
        window.SFX.setEngine(me.boosting ? 1 : 0.5, !!me.boosting);
        const fireCd = G.FIRE_COOLDOWN * (me.power === "rapid" ? G.RAPID_FACTOR : 1);
        if (me.alive && input.fire && ts / 1e3 - lastFireSnd > fireCd) {
          window.SFX.fire();
          lastFireSnd = ts / 1e3;
        }
      }
    } else if (mode === "lobby" && state) {
      window.Renderer.draw(state, window.Net.sessionId);
    } else if (mode === "menu") {
      window.Renderer.drawMenu(dt, getCosmetics());
    } else if (state) {
      window.Renderer.draw(state, window.Net.sessionId);
    }
  }
  function updateHud(state, myId) {
    const me = state.players.get(myId);
    const local = window.Net.localPose;
    els.score.textContent = String(me ? me.score : 0);
    els.time.textContent = formatClock(state.timeLeft);
    const altitude = local && local.active ? local.p.y : me ? me.py : 0;
    const speed = local && local.active ? local.speed : me ? me.speed : 0;
    els.alt.textContent = String(Math.round(altitude));
    els.speed.textContent = String(Math.round(speed));
    const inputNow = window.Input.get();
    const isBoosting = inputNow.boost;
    const boostTarget = isBoosting ? 1 : 0;
    boostLevel += (boostTarget - boostLevel) * (isBoosting ? 0.18 : 0.08);
    boostLevel = Math.max(0, Math.min(1, boostLevel));
    els.boostFill.style.width = (boostLevel * 100).toFixed(1) + "%";
    const posX = local && local.active ? local.p.x : me ? me.px : 0;
    const posZ = local && local.active ? local.p.z : me ? me.pz : 0;
    const isOob = Math.abs(posX) > G.MAP_HALF - G.MAP_EDGE_SOFT || Math.abs(posZ) > G.MAP_HALF - G.MAP_EDGE_SOFT;
    const nowSec = performance.now() / 1e3;
    if (isOob && me && me.alive) {
      if (nowSec >= oobShownUntil) {
        els.oobWarning.classList.remove("hidden");
        oobShownUntil = nowSec + 2;
      }
    } else {
      els.oobWarning.classList.add("hidden");
      oobShownUntil = 0;
    }
    const isLowTime = state.phase === "playing" && state.timeLeft <= 10;
    els.time.classList.toggle("low", isLowTime);
    if (me) {
      els.healthfill.style.width = Math.max(0, me.hp / G.MAX_HP * 100) + "%";
      if (!me.alive) {
        if (wasAlive) {
          deathTime = performance.now() / 1e3;
          wasAlive = false;
        }
        const elapsed = performance.now() / 1e3 - deathTime;
        const remaining = Math.max(0, Math.ceil(G.RESPAWN_DELAY - elapsed));
        const respawnBy = document.getElementById("respawn-by");
        const respawnCount = document.getElementById("respawn-count");
        if (respawnBy) respawnBy.textContent = lastKiller ? "by " + lastKiller : "";
        if (respawnCount) respawnCount.textContent = remaining > 0 ? "Respawning in " + remaining + "\u2026" : "Respawning\u2026";
        els.respawn.classList.remove("hidden");
      } else {
        wasAlive = true;
        els.respawn.classList.add("hidden");
      }
      if (me.alive && me.hp < prevHp) {
        els.vignette.classList.add("hit");
        setTimeout(() => els.vignette.classList.remove("hit"), 120);
        window.SFX.hit();
      }
      els.vignette.classList.toggle("low", me.alive && me.hp > 0 && me.hp < 30);
      prevHp = me.hp;
      if (me.power && me.power !== "repair") {
        const info = G.POWERUPS[me.power] || { label: me.power, icon: "\u2605", color: 16777215 };
        const left = typeof me.powerLeft === "number" ? me.powerLeft : G.POWERUP_DURATION;
        const pct = Math.max(0, Math.min(100, left / G.POWERUP_DURATION * 100));
        const hex = "#" + info.color.toString(16).padStart(6, "0");
        els.powerChip.classList.remove("hidden");
        els.powerChip.innerHTML = `<span class="pc-label">${escapeHtml2(info.icon)} ${escapeHtml2(info.label)}</span><span class="pc-bar"><span class="pc-fill" style="width:${pct}%;background:${hex}"></span></span>`;
      } else {
        els.powerChip.classList.add("hidden");
      }
      const empLeft = me.empLeft || 0;
      const frozenLeft = me.frozenLeft || 0;
      if (empLeft > 0 && !wasEmpd) showCallout("EMP'D \u2014 guns offline");
      wasEmpd = empLeft > 0;
      if (frozenLeft > 0 && !wasFrozen) showCallout("FROZEN");
      wasFrozen = frozenLeft > 0;
    }
    const isTdm = state.mode === "tdm";
    if (isTdm) {
      els.hudTeamScore.classList.remove("hidden");
      const ts0 = state.teamScore0 ?? 0;
      const ts1 = state.teamScore1 ?? 0;
      els.hudTScore0.textContent = String(ts0);
      els.hudTScore1.textContent = String(ts1);
      const myTeam = me ? me.team ?? -1 : -1;
      els.hudTeamBlue.classList.toggle("is-my-team", myTeam === 0);
      els.hudTeamRed.classList.toggle("is-my-team", myTeam === 1);
    } else {
      els.hudTeamScore.classList.add("hidden");
    }
    const list = [];
    state.players.forEach((p, id) => list.push({ id, name: p.name, score: p.score, bot: p.bot, team: p.team ?? -1 }));
    list.sort((a, b) => b.score - a.score);
    const top5 = list.slice(0, 5);
    els.leaderboard.innerHTML = `<div class="lb-header">SMASHES</div>` + top5.map((p, i) => {
      const teamDot = isTdm && p.team >= 0 ? `<span class="lb-team-dot" style="background:${p.team === 0 ? "#4aa3ff" : "#ff5a5a"}"></span>` : "";
      return `<div class="lb-row ${p.id === myId ? "me" : ""}"><span>${teamDot}${i + 1}. ${escapeHtml2(p.name)}${p.bot ? " BOT" : ""}</span><span>${p.score}</span></div>`;
    }).join("");
    if (list.length >= 2 && list.filter((p) => p.score > 0).length >= 2) {
      const leaderId = list[0].id;
      if (prevLeader !== "" && prevLeader !== leaderId) {
        pushToast(list[0].name + " takes the lead!", "leader");
      }
      prevLeader = leaderId;
    }
    if (state.phase !== prevPhase) {
      if (state.phase === "intermission") {
        window.SFX.explosion();
      } else if (state.phase === "playing") {
        runCountdown();
      } else {
        window.SFX.go();
      }
      prevPhase = state.phase;
    }
    if (state.phase === "intermission") {
      els.inter.classList.remove("hidden");
      els.interTime.textContent = formatClock(state.timeLeft);
      if (isTdm) {
        const ts0 = state.teamScore0 ?? 0;
        const ts1 = state.teamScore1 ?? 0;
        const myTeam = me ? me.team ?? -1 : -1;
        const winTeam = ts0 > ts1 ? 0 : ts1 > ts0 ? 1 : -1;
        const winTeamName = winTeam === 0 ? "Blue" : winTeam === 1 ? "Red" : null;
        if (winTeam < 0) {
          els.winnerLine.textContent = "Draw!";
        } else if (myTeam === winTeam) {
          els.winnerLine.textContent = `${winTeamName} team wins! (You're on it!)`;
        } else {
          els.winnerLine.textContent = `${winTeamName} team wins!`;
        }
      } else {
        const winner = list[0];
        els.winnerLine.textContent = winner ? winner.id === myId ? "You win!" : `${winner.name} wins!` : "";
      }
      els.finalBoard.innerHTML = list.slice(0, 6).map((p, i) => {
        const teamDot = isTdm && p.team >= 0 ? `<span class="lb-team-dot" style="background:${p.team === 0 ? "#4aa3ff" : "#ff5a5a"}"></span>` : "";
        return `<li class="${p.id === myId ? "me" : ""}${i === 0 ? " win" : ""}"><span>${teamDot}${i + 1}. ${escapeHtml2(p.name)}${p.bot ? " BOT" : ""}</span><span>${p.score}</span></li>`;
      }).join("");
      const myRank = list.findIndex((p) => p.id === myId);
      els.yourPlace.textContent = myRank >= 0 ? `You placed ${ordinal(myRank + 1)} of ${list.length}` : "";
    } else {
      els.inter.classList.add("hidden");
    }
  }
  function pushToast(text, kind) {
    while (els.toast.children.length >= 3) {
      els.toast.firstChild?.remove();
    }
    const item = document.createElement("div");
    item.className = `toast-item toast--${kind}`;
    item.textContent = text;
    els.toast.appendChild(item);
    void item.offsetWidth;
    item.classList.add("show");
    setTimeout(() => {
      item.classList.remove("show");
      setTimeout(() => item.remove(), 200);
    }, 2600);
  }
  function showCallout(text) {
    els.callout.textContent = text;
    els.callout.classList.remove("show");
    void els.callout.offsetWidth;
    els.callout.classList.add("show");
  }
  function runCountdown() {
    if (countdownActive) return;
    countdownActive = true;
    const steps = ["3", "2", "1", "GO!"];
    let i = 0;
    function showStep() {
      if (i >= steps.length) {
        countdownActive = false;
        els.countdown.classList.remove("pop", "go");
        els.countdown.textContent = "";
        return;
      }
      const label = steps[i];
      const isGo = label === "GO!";
      els.countdown.textContent = label;
      els.countdown.classList.toggle("go", isGo);
      els.countdown.classList.remove("pop");
      void els.countdown.offsetWidth;
      els.countdown.classList.add("pop");
      if (isGo) {
        try {
          window.SFX.go();
        } catch {
        }
      } else {
        try {
          window.SFX.uiClick && window.SFX.uiClick();
        } catch {
        }
      }
      i++;
      setTimeout(showStep, isGo ? 900 : 850);
    }
    showStep();
  }
  function onKill(msg) {
    const myId = window.Net.sessionId;
    const mine = msg.killer === myId;
    const victimIsMe = msg.victim === myId;
    const row = document.createElement("div");
    row.className = "kill-msg" + (mine ? " mine" : "");
    row.innerHTML = `${escapeHtml2(mine ? "You" : msg.killerName)} <span class="kf-verb">smashed</span> <span class="vic">${escapeHtml2(victimIsMe ? "You" : msg.victimName)}</span>`;
    els.killfeed.appendChild(row);
    setTimeout(() => row.remove(), 3600);
    while (els.killfeed.children.length > 5) els.killfeed.firstChild?.remove();
    window.Renderer.killPopup(msg.killer, mine);
    if (victimIsMe) {
      window.SFX.explosion();
      lastKiller = msg.killer && msg.killer !== msg.victim && msg.killerName ? msg.killerName : "";
    }
    if (mine) {
      window.SFX.kill();
      window.Renderer.hitStop(80);
    }
    const tv = getTrack(msg.victim);
    tv.streak = 0;
    tv.rapid = 0;
    if (msg.killer && msg.killer !== msg.victim) {
      const t = getTrack(msg.killer);
      const now = performance.now() / 1e3;
      t.rapid = now - t.last < 3 ? t.rapid + 1 : 1;
      t.last = now;
      t.streak += 1;
      let toastText = "";
      let toastKind = "multi";
      if (t.rapid >= 2) {
        const multiLabel = t.rapid >= 4 ? "MULTI MEGA SMASH" : t.rapid === 3 ? "MULTI SMASH" : "DOUBLE SMASH";
        toastText = mine ? `${multiLabel}!` : `${msg.killerName} \u2014 ${multiLabel}`;
        toastKind = "multi";
      } else {
        const streakTiers = [
          [3, "SMASH STREAK"],
          [5, "SMASHTACULAR STREAK"],
          [7, "SMASHOSAURUS STREAK"],
          [10, "SMASHLVANIA STREAK"],
          [15, "MONSTER SMASH STREAK"],
          [20, "SMASH POTATO BURGER STREAK"]
        ];
        const tier = streakTiers.find(([n]) => t.streak === n);
        if (tier) {
          toastText = mine ? `${tier[1]}!` : `${msg.killerName} \u2014 ${tier[1]}`;
          toastKind = "streak";
        }
      }
      if (toastText) pushToast(toastText, toastKind);
    }
  }
  function onPickup(msg) {
    if (!window.Net) return;
    const isSelf = msg.by === window.Net.sessionId;
    if (msg.type === "star") {
      if (isSelf) {
        pushToast("YOU HAVE THE STAR!", "multi");
      } else {
        const name = window.Net.state?.players?.get(msg.by)?.name;
        pushToast(`${name || "Someone"} grabbed the STAR!`, "multi");
      }
    }
    if (!isSelf) return;
    window.SFX.pickup();
    const info = G.POWERUPS[msg.type];
    showCallout((info ? `${info.icon} ${info.label}` : "POWERUP") + "!");
  }
  function setupTouchButtons() {
    const bind = (el, key) => {
      let pid = -1;
      const down = (e) => {
        e.preventDefault();
        pid = e.pointerId;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
        }
        window.Input.touch[key] = true;
        el.classList.add("pressed");
        buzz2(8);
      };
      const up = (e) => {
        if (e.pointerId !== pid) return;
        pid = -1;
        window.Input.touch[key] = false;
        el.classList.remove("pressed");
      };
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    };
    bind(els.left, "left");
    bind(els.right, "right");
    bind(els.climb, "climb");
    bind(els.dive, "dive");
    bind(els.boost, "boost");
    bind(els.fire, "fire");
    const joystickBase = document.getElementById("joystick-base");
    const joystickThumb = document.getElementById("joystick-thumb");
    if (joystickBase && joystickThumb) {
      window.Input.attachJoystick(joystickBase, joystickThumb);
    }
    const tiltCalBtn = document.getElementById("tilt-cal-btn");
    if (tiltCalBtn) {
      tiltCalBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        window.Input.calibrateTilt();
        buzz2(20);
        tiltCalBtn.classList.add("pressed");
        setTimeout(() => tiltCalBtn.classList.remove("pressed"), 120);
      });
    }
  }
  function applyControlSchemeUI(scheme) {
    const dpadLeft = document.getElementById("dpad-left");
    const joystickLeft = document.getElementById("joystick-left");
    const tiltLeft = document.getElementById("tilt-left");
    if (dpadLeft) dpadLeft.classList.toggle("hidden", scheme !== "dpad");
    if (joystickLeft) joystickLeft.classList.toggle("hidden", scheme !== "joystick");
    if (tiltLeft) tiltLeft.classList.toggle("hidden", scheme !== "tilt");
  }
  function toggleMute() {
    const muted = window.SFX.toggleMute();
    els.mute.innerHTML = muted ? ICON_SND_OFF : ICON_SND_ON;
  }
  function updateRotateOverlay() {
    const portrait = window.matchMedia && window.matchMedia("(orientation: portrait)").matches;
    const show = window.Input.isTouchDevice() && portrait && (mode === "menu" || mode === "lobby" || mode === "playing" || mode === "paused");
    els.rotate.classList.toggle("show", !!show);
  }
  var handlers2 = {
    onCreate: () => {
      void connectAndEnterLobby(null);
    },
    onJoinHost: (host) => {
      void connectAndEnterLobby(host);
    },
    onLobbyStart: () => {
      window.Net.sendHostStart();
    },
    onLobbyReady: () => {
      window.Net.sendReady();
    },
    onLobbyKick: (targetId) => {
      window.Net.sendHostKick(targetId);
    },
    onLobbySettings: (patch) => {
      window.Net.sendHostSettings(patch);
    },
    onLobbyLeave: () => {
      leaveMatch();
    },
    onPauseResume: () => {
      togglePause();
    },
    onPauseLeave: () => {
      leaveMatch("Left the match.");
    }
  };
  function init() {
    void registerServiceWorker();
    window.Renderer.init(els.canvas);
    window.Input.attach();
    loadStoredControlPrefs();
    window.Assets.load();
    mountScreens(els.start, handlers2);
    applyInitialHash();
    window.Net.onKill = onKill;
    window.Net.onPickup = onPickup;
    window.Net.onDisconnect = onDisconnect;
    window.Net.onStateChange = onNetStateChange;
    setupTouchButtons();
    applyControlSchemeUI(window.Input.controlScheme);
    updateRotateOverlay();
    if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient();
    if (window.Input.isTouchDevice()) document.body.classList.add("touch-device");
    els.mute.addEventListener("click", () => toggleMute());
    els.mute.innerHTML = window.SFX.isMuted() ? ICON_SND_OFF : ICON_SND_ON;
    els.ingameMenuBtn.addEventListener("click", () => {
      window.SFX.uiClick();
      togglePause();
    });
    els.interLeave.addEventListener("click", () => {
      window.SFX.uiClick();
      leaveMatch();
    });
    window.Input.onPause = () => {
      if (mode === "playing" || mode === "paused") togglePause();
    };
    window.Input.onMute = () => toggleMute();
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (window.Net.state) window.Net.sendInput(0, 0, false, false);
        if (window.SFX.suspend) window.SFX.suspend();
      } else if (mode === "playing" && window.SFX.resume) {
        window.SFX.resume();
      }
    });
    window.addEventListener("orientationchange", updateRotateOverlay);
    window.addEventListener("resize", updateRotateOverlay);
    try {
      const portraitMq = window.matchMedia("(orientation: portrait)");
      const mqHandler = () => updateRotateOverlay();
      if (portraitMq.addEventListener) portraitMq.addEventListener("change", mqHandler);
      else if (portraitMq.addListener) portraitMq.addListener(mqHandler);
    } catch {
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (mode === "paused") {
          togglePause();
          return;
        }
        if (mode === "menu" && currentScreenId() !== "home") {
          navBack();
          return;
        }
      }
    });
    els.bootOverlay.classList.add("fade-out");
    setTimeout(() => els.bootOverlay.classList.add("hidden"), 450);
    requestAnimationFrame((t) => {
      last = t;
      loop(t);
    });
  }
  window.addEventListener("DOMContentLoaded", init);
  window.addEventListener("error", (e) => {
    if (mode !== "menu" && mode !== "lobby" && mode !== "playing" && mode !== "paused") {
      showFatal(e.message || "An unexpected error occurred.");
    }
  });
  window.addEventListener("unhandledrejection", (e) => {
    if (mode !== "menu" && mode !== "lobby" && mode !== "playing" && mode !== "paused") {
      const msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
      showFatal(msg || "An unexpected error occurred.");
    }
  });
})();
