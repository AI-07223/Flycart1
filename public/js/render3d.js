// 3D renderer (Three.js, ESM). Drop-in replacement for the old Canvas2D render.js.
// The Colyseus server stays 2D-authoritative: it sends each plane's world
// position (x, y) and heading (angle). We map that onto a horizontal 3D arena
// (server x -> world X, server y -> world Z) at a fixed flight altitude, render
// low-poly planes with banking, a chase camera, tracer fire and particle FX.
//
// Exposes window.Renderer with the same surface main.js expects:
//   init(canvas) · sync(state, dt, myId) · draw(state, myId) · views (Map)
//   killPopup(id, mine) · setShake(mag)
import * as THREE from "three";

(function () {
  const G = window.GAME;
  const cx = G.ARENA_WIDTH / 2;
  const cz = G.ARENA_HEIGHT / 2;

  // ---- visual tuning (rendering only; gameplay stays in shared constants) ----
  const ALT = 64;             // flight altitude (world Y of every plane)
  const GROUND_Y = 0;
  const PLANE_SCALE = 1.6;    // base unit ~ matches PLANE_RADIUS feel
  const CAM_BACK = 132;       // chase camera distance behind plane
  const CAM_UP = 58;          // chase camera height above plane
  const CAM_LOOKAHEAD = 120;  // look-at point ahead of the plane
  const CAM_LERP = 4.2;       // camera follow smoothing
  const BANK_SIGN = 1;        // flip if planes bank the wrong way
  const SKINS = [0xff5d5d, 0x53b4ff, 0x8bff6b, 0xffd95d, 0xc98bff];

  // Geometries shared across particles (cheap to reuse).
  const SHARD_GEO = new THREE.BoxGeometry(1, 1, 1);
  const PUFF_GEO = new THREE.SphereGeometry(1, 8, 8);

  const _t = new THREE.Vector3();
  const forwardX = (a) => Math.cos(a);
  const forwardZ = (a) => Math.sin(a);
  const shortest = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  let scene, camera, renderer, canvasEl;
  let sun;
  let minimap, mmctx;
  let popupLayer;
  let time = 0;
  let DT = 0;
  let shakeMag = 0;
  const camPos = new THREE.Vector3(cx, 1200, cz + 1400);
  const camLook = new THREE.Vector3(cx, 0, cz);

  const particles = []; // {mesh, vel, life, maxLife, gravity, spin, alpha, grow, from, to}

  const R = {
    views: new Map(),   // id -> view {mesh, cx, cz, cAngle, bank, ...}
    bullets: new Map(), // key -> mesh

    init(canvas) {
      canvasEl = canvas;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight, false);

      scene = new THREE.Scene();
      const sky = 0x8ec9ff;
      scene.background = new THREE.Color(sky);
      scene.fog = new THREE.Fog(sky, 1100, 3200);

      camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 1, 8000);
      camera.position.copy(camPos);

      // Lights: soft sky/ground fill + a warm sun.
      scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x2c3a26, 0.95));
      sun = new THREE.DirectionalLight(0xfff2d6, 1.15);
      sun.position.set(cx - 600, 1400, cz - 400);
      scene.add(sun);

      this._buildGround();
      this._buildBoundary();
      this._buildClouds();

      // Minimap (2D overlay).
      minimap = document.createElement("canvas");
      minimap.id = "minimap";
      minimap.width = 150; minimap.height = Math.round(150 * (G.ARENA_HEIGHT / G.ARENA_WIDTH));
      (document.getElementById("game-wrap") || document.body).appendChild(minimap);
      mmctx = minimap.getContext("2d");

      // Floating popup layer (kill "+1 SMASH!").
      popupLayer = document.createElement("div");
      popupLayer.id = "popup-layer";
      (document.getElementById("game-wrap") || document.body).appendChild(popupLayer);

      window.addEventListener("resize", () => this.resize());
      this.resize();
    },

    resize() {
      if (!renderer) return;
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },

    // ---------- per-frame state sync (build/update meshes from server state) ----------
    sync(state, dt, myId) {
      DT = dt = Math.min(dt, 0.05);
      time += dt;

      // Planes
      const seen = new Set();
      state.players.forEach((p, id) => {
        seen.add(id);
        let v = this.views.get(id);
        if (!v) { v = this._makeView(id, p); this.views.set(id, v); }

        // death -> explosion
        if (v.wasAlive && !p.alive) {
          this._explode(v.cx, v.cz, SKINS[p.skin % SKINS.length]);
          if (id === myId) this.setShake(14);
        }
        // respawn -> snap to avoid a long glide across the map
        if (!v.wasAlive && p.alive) { v.cx = p.x; v.cz = p.y; v.cAngle = p.angle; }
        v.wasAlive = p.alive;

        // local damage feedback
        if (id === myId && p.alive && p.hp < v.hp) this.setShake(6);
        v.hp = p.hp; v.alive = p.alive; v.skin = p.skin; v.bot = p.bot;

        // smooth toward server target
        const me = id === myId;
        const k = Math.min(1, dt * (me ? 20 : 12));
        v.cx += (p.x - v.cx) * k;
        v.cz += (p.y - v.cz) * k;
        const lead = shortest(p.angle - v.cAngle);
        v.cAngle += lead * Math.min(1, dt * (me ? 22 : 13));

        // bank into the turn
        v.bankTarget = Math.max(-0.7, Math.min(0.7, BANK_SIGN * -lead * 4));
        v.bank += (v.bankTarget - v.bank) * Math.min(1, dt * 9);

        this._placePlane(v, p);

        // engine smoke / boost flame trail
        if (p.alive) {
          const rate = p.boosting ? 0.03 : 0.12;
          if (time - v.lastPuff > rate) {
            v.lastPuff = time;
            const bx = v.cx - forwardX(v.cAngle) * 22;
            const bz = v.cz - forwardZ(v.cAngle) * 22;
            this._puff(bx, bz, p.boosting);
          }
        }
      });
      // drop departed players
      this.views.forEach((v, id) => {
        if (!seen.has(id)) { scene.remove(v.mesh); this.views.delete(id); }
      });

      // Bullets
      const bseen = new Set();
      state.bullets.forEach((b, key) => {
        bseen.add(key);
        let m = this.bullets.get(key);
        if (!m) { m = this._makeBullet(); this.bullets.set(key, m); }
        m.position.set(b.x, ALT, b.y);
        _t.set(b.x + forwardX(b.angle), ALT, b.y + forwardZ(b.angle));
        m.lookAt(_t);
      });
      this.bullets.forEach((m, key) => {
        if (!bseen.has(key)) { scene.remove(m); this.bullets.delete(key); }
      });

      this._updateParticles(dt);
      this._updateCamera(myId, dt);
    },

    // ---------- draw ----------
    draw(state, myId) {
      if (!renderer) return;
      renderer.render(scene, camera);
      this._drawMinimap(state, myId);
    },

    // ---------- kill popup (project a 3D plane pos to screen, float + fade) ----------
    killPopup(id, mine) {
      const v = this.views.get(id);
      if (!v || !popupLayer) return;
      _t.set(v.cx, ALT + 24, v.cz).project(camera);
      if (_t.z > 1) return; // behind camera
      const x = (_t.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-_t.y * 0.5 + 0.5) * window.innerHeight;
      const el = document.createElement("div");
      el.className = "popup3d" + (mine ? " mine" : "");
      el.textContent = mine ? "+1 SMASH!" : "+1";
      el.style.left = x + "px";
      el.style.top = y + "px";
      popupLayer.appendChild(el);
      requestAnimationFrame(() => el.classList.add("go"));
      setTimeout(() => el.remove(), 1200);
    },

    setShake(mag) { shakeMag = Math.max(shakeMag, mag); },

    // Tiny introspection hook (headless verification; harmless in prod).
    __debug() {
      return {
        sceneChildren: scene ? scene.children.length : -1,
        views: this.views.size,
        bullets: this.bullets.size,
        particles: particles.length,
        cam: camera ? camera.position.toArray().map((n) => Math.round(n)) : null,
      };
    },

    // ===================== internals =====================

    _buildGround() {
      const c = document.createElement("canvas");
      c.width = c.height = 512;
      const g = c.getContext("2d");
      g.fillStyle = "#24351f"; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = "rgba(150,210,150,0.16)"; g.lineWidth = 2;
      for (let i = 0; i <= 512; i += 64) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke();
        g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(G.ARENA_WIDTH / 260, G.ARENA_HEIGHT / 260);
      tex.anisotropy = 4;
      const mat = new THREE.MeshLambertMaterial({ map: tex });
      const geo = new THREE.PlaneGeometry(G.ARENA_WIDTH * 1.6, G.ARENA_HEIGHT * 1.6);
      const ground = new THREE.Mesh(geo, mat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(cx, GROUND_Y, cz);
      scene.add(ground);
    },

    _buildBoundary() {
      // Translucent neon cage at the arena bounds so edges read in 3D.
      const mat = new THREE.MeshBasicMaterial({
        color: 0x39d0ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide,
        depthWrite: false,
      });
      const h = ALT * 2.2;
      const walls = [
        [G.ARENA_WIDTH, 0, cx, h / 2, 0],
        [G.ARENA_WIDTH, 0, cx, h / 2, G.ARENA_HEIGHT],
        [G.ARENA_HEIGHT, Math.PI / 2, 0, h / 2, cz],
        [G.ARENA_HEIGHT, Math.PI / 2, G.ARENA_WIDTH, h / 2, cz],
      ];
      for (const [len, ry, x, y, z] of walls) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), mat);
        m.position.set(x, y, z);
        m.rotation.y = ry;
        scene.add(m);
      }
      // glowing top rim
      const rim = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(G.ARENA_WIDTH, h, G.ARENA_HEIGHT)),
        new THREE.LineBasicMaterial({ color: 0x6fe0ff, transparent: true, opacity: 0.5 })
      );
      rim.position.set(cx, h / 2, cz);
      scene.add(rim);
    },

    _buildClouds() {
      const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
      for (let i = 0; i < 14; i++) {
        const puff = new THREE.Group();
        const n = 3 + (i % 3);
        for (let j = 0; j < n; j++) {
          const s = 60 + (j * 37 % 80);
          const m = new THREE.Mesh(PUFF_GEO, mat);
          m.scale.setScalar(s);
          m.position.set((j - n / 2) * 70, (j % 2) * 20, (j * 53 % 60));
          puff.add(m);
        }
        // deterministic scatter (no Math.random at module level needed, but fine here)
        puff.position.set(
          (i * 437 % G.ARENA_WIDTH),
          520 + (i * 90 % 260),
          (i * 911 % G.ARENA_HEIGHT)
        );
        scene.add(puff);
      }
    },

    _makeView(id, p) {
      const mesh = this._makePlane(p.skin);
      scene.add(mesh);
      return {
        mesh, cx: p.x, cz: p.y, cAngle: p.angle, bank: 0, bankTarget: 0,
        hp: p.hp, alive: p.alive, wasAlive: p.alive, skin: p.skin, bot: p.bot,
        phase: (id.charCodeAt(0) || 1) % 7, lastPuff: 0,
      };
    },

    // Low-poly plane, nose pointing along -Z (Three's "forward" for lookAt).
    _makePlane(skin) {
      const color = SKINS[skin % SKINS.length];
      const g = new THREE.Group();
      const body = new THREE.MeshLambertMaterial({ color });
      const dark = new THREE.MeshLambertMaterial({ color: 0x222831 });
      const glass = new THREE.MeshLambertMaterial({ color: 0x0b1a2a });

      const fuse = new THREE.Mesh(new THREE.BoxGeometry(7, 6, 30), body);
      g.add(fuse);
      const nose = new THREE.Mesh(new THREE.ConeGeometry(3.5, 12, 8), dark);
      nose.rotation.x = -Math.PI / 2; nose.position.z = -21;
      g.add(nose);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(44, 2, 9), body);
      wing.position.z = 1;
      g.add(wing);
      const tailwing = new THREE.Mesh(new THREE.BoxGeometry(18, 2, 6), body);
      tailwing.position.z = 14;
      g.add(tailwing);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(2, 9, 8), body);
      fin.position.set(0, 5, 14);
      g.add(fin);
      const cockpit = new THREE.Mesh(new THREE.SphereGeometry(3.4, 10, 8), glass);
      cockpit.scale.set(1, 0.8, 1.5); cockpit.position.set(0, 3.4, -2);
      g.add(cockpit);
      // spinning prop disc at the nose
      const prop = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 1.2), dark);
      prop.position.z = -27;
      g.add(prop);
      g._prop = prop;

      g.scale.setScalar(PLANE_SCALE);
      return g;
    },

    _placePlane(v, p) {
      const g = v.mesh;
      g.visible = p.alive;
      const bob = Math.sin(time * 2 + v.phase) * 1.6;
      g.position.set(v.cx, ALT + bob, v.cz);
      _t.set(v.cx + forwardX(v.cAngle), ALT + bob, v.cz + forwardZ(v.cAngle));
      g.lookAt(_t);
      g.rotateZ(v.bank);
      if (g._prop) g._prop.rotation.z = time * 40;
    },

    _makeBullet() {
      const grp = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(3, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfff1a8 })
      );
      grp.add(core);
      const tracer = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 0.2, 16, 6),
        new THREE.MeshBasicMaterial({ color: 0xffae3b, transparent: true, opacity: 0.75 })
      );
      tracer.rotation.x = Math.PI / 2; // align cylinder with -Z
      tracer.position.z = 8;
      grp.add(tracer);
      scene.add(grp);
      return grp;
    },

    // ---- particles ----
    _spawn(geo, color, x, y, z, opts) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opts.alpha ?? 1, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.scale.setScalar(opts.from ?? 1);
      scene.add(m);
      particles.push({
        mesh: m, vel: opts.vel, life: opts.life, maxLife: opts.life,
        gravity: opts.gravity ?? 0, spin: opts.spin ?? 0, alpha: opts.alpha ?? 1,
        from: opts.from ?? 1, to: opts.to ?? opts.from ?? 1,
      });
    },

    _explode(x, z, color) {
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const sp = 80 + (i * 31 % 160);
        const vy = 60 + (i * 17 % 180);
        this._spawn(SHARD_GEO, i % 3 === 0 ? 0xffd27a : color, x, ALT, z, {
          vel: new THREE.Vector3(Math.cos(a) * sp, vy, Math.sin(a) * sp),
          life: 0.55 + (i % 5) * 0.06, gravity: 260, spin: 6,
          from: 4 + (i % 3) * 2, to: 0.5, alpha: 1,
        });
      }
      // flash
      this._spawn(PUFF_GEO, 0xffe6a8, x, ALT, z, {
        vel: new THREE.Vector3(0, 8, 0), life: 0.25, from: 6, to: 34, alpha: 0.9,
      });
    },

    _puff(x, z, boosting) {
      this._spawn(
        PUFF_GEO,
        boosting ? 0xff9a3c : 0x9aa6b2,
        x, ALT, z,
        {
          vel: new THREE.Vector3(0, boosting ? 6 : 12, 0),
          life: boosting ? 0.35 : 0.6,
          from: boosting ? 5 : 3, to: boosting ? 12 : 16,
          alpha: boosting ? 0.7 : 0.35, gravity: -10,
        }
      );
    },

    _updateParticles(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mesh.material.dispose();
          particles.splice(i, 1);
          continue;
        }
        p.vel.y -= p.gravity * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        const k = p.life / p.maxLife;       // 1 -> 0
        const s = p.to + (p.from - p.to) * k;
        p.mesh.scale.setScalar(s);
        p.mesh.material.opacity = p.alpha * k;
        if (p.spin) { p.mesh.rotation.x += p.spin * dt; p.mesh.rotation.y += p.spin * 0.7 * dt; }
      }
    },

    _updateCamera(myId, dt) {
      const me = this.views.get(myId);
      let dx, dy, dz, lx, ly, lz;
      if (me) {
        const fx = forwardX(me.cAngle), fz = forwardZ(me.cAngle);
        dx = me.cx - fx * CAM_BACK; dy = ALT + CAM_UP; dz = me.cz - fz * CAM_BACK;
        lx = me.cx + fx * CAM_LOOKAHEAD; ly = ALT; lz = me.cz + fz * CAM_LOOKAHEAD;
      } else {
        dx = cx; dy = 1300; dz = cz + 1500; lx = cx; ly = 0; lz = cz;
      }
      const k = Math.min(1, dt * CAM_LERP);
      camPos.x += (dx - camPos.x) * k; camPos.y += (dy - camPos.y) * k; camPos.z += (dz - camPos.z) * k;
      camLook.x += (lx - camLook.x) * k; camLook.y += (ly - camLook.y) * k; camLook.z += (lz - camLook.z) * k;

      camera.position.copy(camPos);
      if (shakeMag > 0.05) {
        camera.position.x += (Math.random() - 0.5) * shakeMag;
        camera.position.y += (Math.random() - 0.5) * shakeMag;
        camera.position.z += (Math.random() - 0.5) * shakeMag;
        shakeMag *= Math.pow(0.0001, dt); // fast decay
      } else shakeMag = 0;
      camera.lookAt(camLook);
    },

    _drawMinimap(state, myId) {
      if (!mmctx) return;
      const w = minimap.width, h = minimap.height;
      mmctx.clearRect(0, 0, w, h);
      mmctx.fillStyle = "rgba(10,18,12,0.6)";
      mmctx.fillRect(0, 0, w, h);
      mmctx.strokeStyle = "rgba(120,220,160,0.5)";
      mmctx.strokeRect(0.5, 0.5, w - 1, h - 1);
      const sx = w / G.ARENA_WIDTH, sy = h / G.ARENA_HEIGHT;
      state.players.forEach((p, id) => {
        if (!p.alive) return;
        const me = id === myId;
        mmctx.fillStyle = me ? "#fff" : (p.bot ? "#ff8a8a" : "#7fd0ff");
        const r = me ? 3 : 2;
        mmctx.beginPath();
        mmctx.arc(p.x * sx, p.y * sy, r, 0, Math.PI * 2);
        mmctx.fill();
      });
    },
  };

  window.Renderer = R;
})();
