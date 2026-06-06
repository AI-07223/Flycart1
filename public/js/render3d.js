// 3D renderer (Three.js, ESM) — arcade-cute. Drop-in for the game loop.
// Server stays 2D-authoritative (position + heading); we present it as a toy
// island arena with rounded low-poly planes, soft/blob shadows, bloom, poofy
// explosions, a speed-sensing chase camera, hit-stop, and quality scaling.
//
// window.Renderer API: init(canvas) · sync(state,dt,myId) · draw(state,myId)
//   · views (Map) · killPopup(id,mine) · hitStop(ms) · setShake(mag) · __debug()
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

(function () {
  const G = window.GAME;
  const Q = window.Quality;
  const TAU = Math.PI * 2;
  const cx = G.ARENA_WIDTH / 2, cz = G.ARENA_HEIGHT / 2;

  // ---- tuning (rendering only) ----
  const ALT = 64, GROUND_Y = 0, PLANE_SCALE = 1.7;
  const CAM_BACK = 130, CAM_UP = 60, CAM_LOOKAHEAD = 120, CAM_LERP = 4.2;
  const FOV_BASE = 62, FOV_BOOST = 73;
  const SKY = 0x9fd4ff;
  const SKINS = [0xff6b6b, 0x49c0ff, 0x8be34a, 0xffd24a, 0xc07bff];

  // shared geometries (cheap to reuse)
  const SPARK_GEO = new THREE.TetrahedronGeometry(1);
  const PUFF_GEO = new THREE.SphereGeometry(1, 8, 8);
  const RING_GEO = new THREE.TorusGeometry(1, 0.16, 8, 28);
  const BLOB_GEO = new THREE.CircleGeometry(1, 20);
  [SPARK_GEO, PUFF_GEO, RING_GEO, BLOB_GEO].forEach((g) => (g.__shared = true)); // never dispose these

  const _t = new THREE.Vector3();
  const fX = (a) => Math.cos(a), fZ = (a) => Math.sin(a);
  const shortest = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const rand = (a, b) => a + Math.random() * (b - a);
  const _seen = new Set(), _bseen = new Set(), _pkseen = new Set(); // reused each frame (no per-frame Set alloc)

  // Free GPU resources for an object and its children. scene.remove() alone LEAKS geometry + material.
  function disposeObject(obj) {
    obj.traverse((o) => {
      if (o.geometry && !o.geometry.__shared) o.geometry.dispose();
      if (o.material) Array.isArray(o.material) ? o.material.forEach((m) => m.dispose()) : o.material.dispose();
    });
  }

  let scene, camera, renderer, composer, bloomPass, sun;
  let canvasEl, minimap, mmctx, popupLayer;
  let time = 0, shakeMag = 0, hitStop = 0, fov = FOV_BASE, dip = 0;
  let decorScale = 1, partScale = 1;
  const camPos = new THREE.Vector3(cx, 1200, cz + 1400);
  const camLook = new THREE.Vector3(cx, 0, cz);
  const particles = [];
  const INTERP_DELAY = 100; // ms render delay for remote snapshot interpolation
  const predict = { x: 0, z: 0, angle: 0, speed: 0 }; // local-plane client prediction

  const R = {
    views: new Map(),
    bullets: new Map(),
    pickups: new Map(),

    init(canvas) {
      canvasEl = canvas;
      const cfg = Q.cfg();
      decorScale = cfg.decor; partScale = cfg.particles;

      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.pixelRatio));
      renderer.toneMapping = THREE.NoToneMapping; // keep arcade colors vivid
      renderer.shadowMap.enabled = cfg.shadows === "map";
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(SKY);
      scene.fog = new THREE.Fog(SKY, 1300, 3400);

      camera = new THREE.PerspectiveCamera(FOV_BASE, window.innerWidth / window.innerHeight, 1, 9000);
      camera.position.copy(camPos);

      // lights
      scene.add(new THREE.HemisphereLight(0xcdebff, 0x4a6b3a, 1.0));
      sun = new THREE.DirectionalLight(0xfff4da, 1.25);
      sun.position.set(cx - 300, 760, cz - 220);
      sun.castShadow = cfg.shadows === "map";
      sun.shadow.mapSize.set(cfg.shadowMap || 1024, cfg.shadowMap || 1024);
      const sc = sun.shadow.camera;
      sc.left = -520; sc.right = 520; sc.top = 520; sc.bottom = -520; sc.near = 60; sc.far = 1800;
      sc.updateProjectionMatrix();
      scene.add(sun);
      scene.add(sun.target);

      // post-processing
      const w = window.innerWidth, h = window.innerHeight;
      composer = new EffectComposer(renderer);
      composer.setSize(w, h);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.62, 0.5, 0.82);
      bloomPass.enabled = cfg.bloom;
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());

      this._buildIsland();
      this._buildBoundary();
      this._buildDecor();

      minimap = document.createElement("canvas");
      minimap.id = "minimap";
      minimap.width = 150; minimap.height = Math.round(150 * (G.ARENA_HEIGHT / G.ARENA_WIDTH));
      (document.getElementById("game-wrap") || document.body).appendChild(minimap);
      mmctx = minimap.getContext("2d");

      popupLayer = document.createElement("div");
      popupLayer.id = "popup-layer";
      (document.getElementById("game-wrap") || document.body).appendChild(popupLayer);

      Q.onChange((c) => this._applyQuality(c));
      window.addEventListener("resize", () => this.resize());
      this.resize();
    },

    _applyQuality(cfg) {
      decorScale = cfg.decor; partScale = cfg.particles;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.pixelRatio));
      if (composer) composer.setPixelRatio(renderer.getPixelRatio());
      if (bloomPass) bloomPass.enabled = cfg.bloom;
      const useMap = cfg.shadows === "map";
      renderer.shadowMap.enabled = useMap;
      renderer.shadowMap.needsUpdate = true;
      if (sun) {
        sun.castShadow = useMap;
        if (useMap && cfg.shadowMap) {
          sun.shadow.mapSize.set(cfg.shadowMap, cfg.shadowMap);
          if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
        }
      }
      this.views.forEach((v) => { if (v.blob) v.blob.visible = !useMap; });
    },

    resize() {
      if (!renderer) return;
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      if (composer) composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },

    // ---------- per-frame ----------
    sync(state, dt, myId) {
      dt = Math.min(dt, 0.05);
      Q.sample(dt);
      time += dt;
      hitStop = Math.max(0, hitStop - dt);
      const sdt = hitStop > 0 ? dt * 0.12 : dt; // hit-stop slows camera + fx only

      const interp = (window.Net && window.Net.sample) ? window.Net.sample(performance.now() - INTERP_DELAY) : {};
      const input = window.Input ? window.Input.get() : { turn: 0, boost: false, fire: false };

      const seen = _seen; seen.clear();
      state.players.forEach((p, id) => {
        seen.add(id);
        let v = this.views.get(id);
        if (!v) { v = this._makeView(id, p); this.views.set(id, v); if (id === myId) this._initPredict(p); }

        const wasAlive = v.wasAlive;
        if (wasAlive && !p.alive) {
          this._explode(v.cx, v.cz, SKINS[p.skin % SKINS.length]);
          if (id === myId) this.setShake(15);
        }
        const justSpawned = !wasAlive && p.alive;
        if (justSpawned) { v.cx = p.x; v.cz = p.y; v.cAngle = p.angle; if (id === myId) this._initPredict(p); }
        v.wasAlive = p.alive;
        if (id === myId && p.alive && p.hp < v.hp) { this.setShake(7); dip = Math.min(1, dip + 0.7); }
        v.hp = p.hp; v.alive = p.alive; v.boosting = p.boosting;

        if (id === myId) {
          // Client-side prediction for instant control, eased toward authoritative state.
          if (p.alive) {
            this._stepPredict(dt, input, p.power);
            const ex = p.x - predict.x, ez = p.y - predict.z;
            if (Math.hypot(ex, ez) > 140) { predict.x = p.x; predict.z = p.y; predict.angle = p.angle; }
            else { const rk = Math.min(1, dt * 2.5); predict.x += ex * rk; predict.z += ez * rk; predict.angle += shortest(p.angle - predict.angle) * rk; }
            v.cx = predict.x; v.cz = predict.z; v.cAngle = predict.angle;
            v.bankTarget = Math.max(-0.7, Math.min(0.7, -(input.turn || 0) * 0.7));
          } else { v.cx = p.x; v.cz = p.y; v.cAngle = p.angle; v.bankTarget = 0; }
        } else {
          // Remote: time-based snapshot interpolation (falls back to raw state).
          const ip = interp[id];
          if (ip && p.alive && !justSpawned) {
            v.bankTarget = Math.max(-0.7, Math.min(0.7, -shortest(ip.angle - v.cAngle) * 4));
            v.cx = ip.x; v.cz = ip.y; v.cAngle = ip.angle;
          } else { v.cx = p.x; v.cz = p.y; v.cAngle = p.angle; v.bankTarget = 0; }
        }
        v.bank += (v.bankTarget - v.bank) * Math.min(1, dt * 9);

        this._placePlane(v, p);

        if (p.power === "shield" && p.alive) {
          if (!v.shield) { v.shield = this._makeShield(); scene.add(v.shield); }
          v.shield.visible = true; v.shield.position.set(v.cx, ALT, v.cz);
        } else if (v.shield) { v.shield.visible = false; }

        if (p.alive) {
          const rate = p.boosting ? 0.03 : 0.13;
          if (time - v.lastPuff > rate) {
            v.lastPuff = time;
            this._puff(v.cx - fX(v.cAngle) * 24, v.cz - fZ(v.cAngle) * 24, p.boosting);
          }
        }
      });
      this.views.forEach((v, id) => {
        if (!seen.has(id)) {
          scene.remove(v.mesh); disposeObject(v.mesh);
          if (v.blob) { scene.remove(v.blob); disposeObject(v.blob); }
          if (v.shield) { scene.remove(v.shield); disposeObject(v.shield); }
          this.views.delete(id);
        }
      });

      // Bullets: straight bullets extrapolate along heading; homing bullets curve server-side, so
      // snap those to the authoritative position each frame (no wrong straight-line ghost trail).
      const bseen = _bseen; bseen.clear();
      state.bullets.forEach((b, key) => {
        bseen.add(key);
        let m = this.bullets.get(key);
        if (!m) { m = this._makeBullet(b.homing); m.userData = { x: b.x, z: b.y, sx: b.x, sz: b.y, angle: b.angle, homing: b.homing }; this.bullets.set(key, m); }
        const u = m.userData;
        if (u.homing) { u.x = b.x; u.z = b.y; u.angle = b.angle; }
        else if (b.x !== u.sx || b.y !== u.sz) { u.x = b.x; u.z = b.y; u.sx = b.x; u.sz = b.y; u.angle = b.angle; }
        else { u.x += fX(u.angle) * G.BULLET_SPEED * dt; u.z += fZ(u.angle) * G.BULLET_SPEED * dt; }
        m.position.set(u.x, ALT, u.z);
        _t.set(u.x + fX(u.angle), ALT, u.z + fZ(u.angle));
        m.lookAt(_t);
      });
      this.bullets.forEach((m, key) => {
        if (!bseen.has(key)) { scene.remove(m); disposeObject(m); this.bullets.delete(key); }
      });

      // Pickups (floating powerup orbs).
      const pkseen = _pkseen; pkseen.clear();
      state.pickups.forEach((pk, key) => {
        pkseen.add(key);
        let m = this.pickups.get(key);
        if (!m) { m = this._makePickup(pk.type); this.pickups.set(key, m); }
        m.position.set(pk.x, ALT + Math.sin(time * 2 + m.userData.ph) * 7, pk.y);
        m.rotation.y += dt * 1.6;
      });
      this.pickups.forEach((m, key) => { if (!pkseen.has(key)) { scene.remove(m); disposeObject(m); this.pickups.delete(key); } });

      this._updateParticles(sdt);
      this._updateCamera(myId, sdt);
      dip = Math.max(0, dip - dt * 3);
    },

    draw(state, myId) {
      if (!renderer) return;
      composer.render();
      this._drawMinimap(state, myId);
    },

    killPopup(id, mine) {
      const v = this.views.get(id);
      if (!v || !popupLayer) return;
      _t.set(v.cx, ALT + 26, v.cz).project(camera);
      if (_t.z > 1) return;
      const el = document.createElement("div");
      el.className = "popup3d" + (mine ? " mine" : "");
      el.textContent = mine ? "+1 SMASH!" : "+1";
      el.style.left = (_t.x * 0.5 + 0.5) * window.innerWidth + "px";
      el.style.top = (-_t.y * 0.5 + 0.5) * window.innerHeight + "px";
      popupLayer.appendChild(el);
      requestAnimationFrame(() => el.classList.add("go"));
      setTimeout(() => el.remove(), 1200);
    },

    hitStop(ms) { hitStop = Math.max(hitStop, Math.min(0.09, (ms || 70) / 1000)); },
    setShake(mag) { shakeMag = Math.max(shakeMag, mag); },

    __debug() {
      return {
        sceneChildren: scene ? scene.children.length : -1,
        views: this.views.size, bullets: this.bullets.size, particles: particles.length,
        bloom: bloomPass ? bloomPass.enabled : null,
        shadows: renderer ? renderer.shadowMap.enabled : null,
        quality: Q.current, fov: Math.round(fov),
        cam: camera ? camera.position.toArray().map((n) => Math.round(n)) : null,
        predict: [Math.round(predict.x), Math.round(predict.z)],
        geometries: renderer ? renderer.info.memory.geometries : -1,
        textures: renderer ? renderer.info.memory.textures : -1,
        programs: renderer && renderer.info.programs ? renderer.info.programs.length : -1,
      };
    },

    // ---- local-plane prediction (mirrors the server stepPlane) ----
    _initPredict(p) { predict.x = p.x; predict.z = p.y; predict.angle = p.angle; predict.speed = G.CRUISE_SPEED; },

    _deflect(angle, inward) { const diff = ((inward - angle + Math.PI) % (Math.PI * 2)) - Math.PI; return angle + diff * 0.35; },

    _stepPredict(dt, input, power) {
      predict.angle += (input.turn || 0) * G.TURN_RATE * dt;
      let target = input.boost ? G.BOOST_SPEED : G.CRUISE_SPEED;
      if (power === "afterburner") target *= (G.AFTERBURNER_FACTOR || 1); // match server so prediction doesn't rubber-band
      const before = predict.speed;
      predict.speed += Math.sign(target - before) * G.ACCEL * dt;
      if ((target - predict.speed) * (target - before) < 0) predict.speed = target;
      predict.x += Math.cos(predict.angle) * predict.speed * dt;
      predict.z += Math.sin(predict.angle) * predict.speed * dt;
      const m = G.WALL_MARGIN + G.PLANE_RADIUS;
      if (predict.x < m) { predict.x = m; predict.angle = this._deflect(predict.angle, 0); }
      if (predict.x > G.ARENA_WIDTH - m) { predict.x = G.ARENA_WIDTH - m; predict.angle = this._deflect(predict.angle, Math.PI); }
      if (predict.z < m) { predict.z = m; predict.angle = this._deflect(predict.angle, Math.PI / 2); }
      if (predict.z > G.ARENA_HEIGHT - m) { predict.z = G.ARENA_HEIGHT - m; predict.angle = this._deflect(predict.angle, -Math.PI / 2); }
    },

    // ===================== build =====================
    _buildIsland() {
      // water (large, below) — gentle stylized blue
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(G.ARENA_WIDTH * 3, G.ARENA_HEIGHT * 3),
        new THREE.MeshStandardMaterial({ color: 0x3aa6e0, roughness: 0.3, metalness: 0.1 })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(cx, GROUND_Y - 6, cz);
      water.receiveShadow = false;
      scene.add(water);
      this._water = water;

      // grass island (the play field)
      const c = document.createElement("canvas"); c.width = c.height = 256;
      const g = c.getContext("2d");
      g.fillStyle = "#5bbf4a"; g.fillRect(0, 0, 256, 256);
      g.fillStyle = "rgba(255,255,255,0.06)";
      for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
      g.strokeStyle = "rgba(20,90,30,0.18)"; g.lineWidth = 2;
      for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(G.ARENA_WIDTH / 300, G.ARENA_HEIGHT / 300);
      tex.anisotropy = 4;
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(G.ARENA_WIDTH + 80, G.ARENA_HEIGHT + 80),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(cx, GROUND_Y, cz);
      ground.receiveShadow = true;
      scene.add(ground);
    },

    _buildBoundary() {
      const mat = new THREE.MeshBasicMaterial({ color: 0x6fe0ff, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false });
      const h = ALT * 2.2;
      const walls = [
        [G.ARENA_WIDTH, 0, cx, h / 2, 0], [G.ARENA_WIDTH, 0, cx, h / 2, G.ARENA_HEIGHT],
        [G.ARENA_HEIGHT, Math.PI / 2, 0, h / 2, cz], [G.ARENA_HEIGHT, Math.PI / 2, G.ARENA_WIDTH, h / 2, cz],
      ];
      for (const [len, ry, x, y, z] of walls) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), mat);
        m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
      }
      const rim = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(G.ARENA_WIDTH, h, G.ARENA_HEIGHT)),
        new THREE.LineBasicMaterial({ color: 0x9becff, transparent: true, opacity: 0.55 })
      );
      rim.position.set(cx, h / 2, cz); scene.add(rim);
    },

    _buildDecor() {
      // clouds
      const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, transparent: true, opacity: 0.92 });
      const nClouds = Math.round(16 * decorScale);
      for (let i = 0; i < nClouds; i++) {
        const grp = new THREE.Group();
        const lobes = 3 + (i % 3);
        for (let j = 0; j < lobes; j++) {
          const s = rand(45, 95);
          const m = new THREE.Mesh(PUFF_GEO, cloudMat);
          m.scale.set(s * 1.4, s, s);
          m.position.set((j - lobes / 2) * 70, rand(-10, 14), rand(-30, 30));
          grp.add(m);
        }
        grp.position.set(rand(-400, G.ARENA_WIDTH + 400), rand(420, 760), rand(-400, G.ARENA_HEIGHT + 400));
        scene.add(grp);
      }
      // hot-air balloons
      const nB = Math.round(5 * decorScale);
      for (let i = 0; i < nB; i++) {
        const grp = new THREE.Group();
        const col = SKINS[i % SKINS.length];
        const balloon = new THREE.Mesh(new THREE.SphereGeometry(34, 14, 12), new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, flatShading: true }));
        balloon.scale.set(1, 1.2, 1);
        const basket = new THREE.Mesh(new THREE.BoxGeometry(14, 12, 14), new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.9 }));
        basket.position.y = -46;
        grp.add(balloon); grp.add(basket);
        grp.position.set(rand(100, G.ARENA_WIDTH - 100), rand(220, 380), rand(100, G.ARENA_HEIGHT - 100));
        scene.add(grp);
      }
      // a blimp
      if (decorScale > 0.5) {
        const blimp = new THREE.Group();
        const body = new THREE.Mesh(new THREE.SphereGeometry(40, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff8c42, roughness: 0.5, flatShading: true }));
        body.scale.set(2.6, 1, 1);
        const fin = new THREE.Mesh(new THREE.BoxGeometry(22, 18, 3), new THREE.MeshStandardMaterial({ color: 0xffd24a, roughness: 0.6 }));
        fin.position.set(95, 0, 0);
        blimp.add(body); blimp.add(fin);
        blimp.position.set(cx, 560, cz - 600);
        scene.add(blimp); this._blimp = blimp;
      }
    },

    // ===================== entities =====================
    _makeView(id, p) {
      const mesh = this._makePlane(p.skin);
      scene.add(mesh);
      const blob = new THREE.Mesh(BLOB_GEO, new THREE.MeshBasicMaterial({ color: 0x12331c, transparent: true, opacity: 0.28, depthWrite: false }));
      blob.rotation.x = -Math.PI / 2;
      blob.scale.setScalar(26 * PLANE_SCALE * 0.6);
      blob.visible = Q.cfg().shadows !== "map";
      scene.add(blob);
      return {
        mesh, blob, cx: p.x, cz: p.y, cAngle: p.angle, bank: 0, bankTarget: 0,
        hp: p.hp, alive: p.alive, wasAlive: p.alive, boosting: false,
        phase: (id.charCodeAt(0) || 1) % 7, lastPuff: 0,
      };
    },

    _makePlane(skin) {
      const color = SKINS[skin % SKINS.length];
      const g = new THREE.Group();
      const body = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.6, metalness: 0.05 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, flatShading: true, roughness: 0.6 });
      const glass = new THREE.MeshStandardMaterial({ color: 0x123a5a, flatShading: true, roughness: 0.25, metalness: 0.1 });

      const fus = new THREE.Mesh(new THREE.CapsuleGeometry(4.2, 20, 4, 10), body);
      fus.rotation.x = Math.PI / 2; fus.castShadow = true; g.add(fus);

      const nose = new THREE.Mesh(new THREE.SphereGeometry(4.2, 12, 10), dark);
      nose.scale.set(1, 1, 1.5); nose.position.z = -13; nose.castShadow = true; g.add(nose);

      const wing = new THREE.Mesh(new THREE.CapsuleGeometry(2.1, 40, 4, 8), body);
      wing.rotation.z = Math.PI / 2; wing.scale.set(1, 1, 2.1); wing.position.z = 2; wing.castShadow = true; g.add(wing);

      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 16, 4, 6), body);
      tail.rotation.z = Math.PI / 2; tail.scale.set(1, 1, 1.7); tail.position.z = 15; tail.castShadow = true; g.add(tail);

      const fin = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 8, 4, 6), body);
      fin.position.set(0, 4, 15); fin.castShadow = true; g.add(fin);

      const canopy = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 10), glass);
      canopy.scale.set(1, 0.7, 1.5); canopy.position.set(0, 3.3, -1); g.add(canopy);

      const prop = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 18, 3, 6), dark);
      prop.rotation.z = Math.PI / 2; prop.position.z = -22; g.add(prop);
      g._prop = prop;

      g.scale.setScalar(PLANE_SCALE);
      return g;
    },

    _placePlane(v, p) {
      const g = v.mesh;
      g.visible = p.alive;
      const bob = Math.sin(time * 2 + v.phase) * 1.7;
      g.position.set(v.cx, ALT + bob, v.cz);
      _t.set(v.cx + fX(v.cAngle), ALT + bob, v.cz + fZ(v.cAngle));
      g.lookAt(_t);
      g.rotateZ(v.bank);
      if (g._prop) g._prop.rotation.z = time * 42;
      if (v.blob) { v.blob.visible = p.alive && Q.cfg().shadows !== "map"; v.blob.position.set(v.cx, GROUND_Y + 0.8, v.cz); }
    },

    _makeBullet(homing) {
      const core = homing ? 0xd7a8ff : 0xfff1a8, tcol = homing ? 0xc07bff : 0xffae3b;
      const grp = new THREE.Group();
      grp.add(new THREE.Mesh(new THREE.SphereGeometry(homing ? 3.6 : 3, 8, 8), new THREE.MeshBasicMaterial({ color: core })));
      const tracer = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.2, 16, 6), new THREE.MeshBasicMaterial({ color: tcol, transparent: true, opacity: 0.8 }));
      tracer.rotation.x = Math.PI / 2; tracer.position.z = 8; grp.add(tracer);
      scene.add(grp);
      return grp;
    },

    _makePickup(type) {
      const info = (G.POWERUPS && G.POWERUPS[type]) || { color: 0xffffff };
      const grp = new THREE.Group();
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(15, 0), new THREE.MeshStandardMaterial({ color: info.color, emissive: info.color, emissiveIntensity: 0.6, flatShading: true, roughness: 0.4 }));
      grp.add(gem);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(20, 1.6, 8, 24), new THREE.MeshBasicMaterial({ color: info.color, transparent: true, opacity: 0.7 }));
      ring.rotation.x = Math.PI / 2; grp.add(ring);
      grp.userData = { ph: Math.random() * 6 };
      scene.add(grp);
      return grp;
    },

    _makeShield() {
      return new THREE.Mesh(
        new THREE.SphereGeometry(38, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0x49c0ff, transparent: true, opacity: 0.18, depthWrite: false })
      );
    },

    // ---- particles ----
    _spawn(geo, color, x, y, z, o) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o.alpha ?? 1, depthWrite: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending }));
      m.position.set(x, y, z); m.scale.setScalar(o.from ?? 1);
      if (o.flat) m.rotation.x = -Math.PI / 2;
      scene.add(m);
      particles.push({ mesh: m, vel: o.vel, life: o.life, maxLife: o.life, gravity: o.gravity ?? 0, spin: o.spin ?? 0, alpha: o.alpha ?? 1, from: o.from ?? 1, to: o.to ?? o.from ?? 1 });
    },

    _explode(x, z, color) {
      this._spawn(RING_GEO, 0xffffff, x, ALT, z, { vel: new THREE.Vector3(), life: 0.5, from: 4, to: 64, alpha: 0.9, add: true, flat: true });
      this._spawn(PUFF_GEO, 0xffe6a8, x, ALT, z, { vel: new THREE.Vector3(0, 6, 0), life: 0.26, from: 6, to: 36, alpha: 0.95, add: true });
      const n = Math.round(16 * partScale);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(-0.3, 0.3), sp = rand(90, 230);
        this._spawn(SPARK_GEO, i % 2 ? 0xffd27a : color, x, ALT, z, {
          vel: new THREE.Vector3(Math.cos(a) * sp, rand(60, 200), Math.sin(a) * sp),
          life: rand(0.5, 0.85), gravity: 240, spin: 9, from: rand(3, 6), to: 0.5, alpha: 1, add: true,
        });
      }
      const m = Math.round(7 * partScale);
      for (let i = 0; i < m; i++) {
        const a = rand(0, TAU), sp = rand(20, 70);
        this._spawn(PUFF_GEO, 0x9aa6b2, x, ALT, z, {
          vel: new THREE.Vector3(Math.cos(a) * sp, rand(20, 60), Math.sin(a) * sp),
          life: rand(0.5, 0.9), gravity: -12, from: rand(3, 6), to: rand(14, 20), alpha: 0.4,
        });
      }
    },

    _puff(x, z, boosting) {
      this._spawn(PUFF_GEO, boosting ? 0xff9a3c : 0x9aa6b2, x, ALT, z, {
        vel: new THREE.Vector3(0, boosting ? 6 : 12, 0),
        life: boosting ? 0.35 : 0.6, from: boosting ? 5 : 3, to: boosting ? 13 : 16,
        alpha: boosting ? 0.75 : 0.32, gravity: -10, add: !!boosting,
      });
    },

    _updateParticles(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { scene.remove(p.mesh); p.mesh.material.dispose(); particles.splice(i, 1); continue; }
        p.vel.y -= p.gravity * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        const k = p.life / p.maxLife;
        p.mesh.scale.setScalar(p.to + (p.from - p.to) * k);
        p.mesh.material.opacity = p.alpha * k;
        if (p.spin) { p.mesh.rotation.x += p.spin * dt; p.mesh.rotation.y += p.spin * 0.7 * dt; }
      }
    },

    _updateCamera(myId, dt) {
      const me = this.views.get(myId);
      let dx, dy, dz, lx, ly, lz, wantFov = FOV_BASE;
      if (me) {
        const ax = fX(me.cAngle), az = fZ(me.cAngle);
        dx = me.cx - ax * CAM_BACK; dy = ALT + CAM_UP; dz = me.cz - az * CAM_BACK;
        lx = me.cx + ax * CAM_LOOKAHEAD; ly = ALT; lz = me.cz + az * CAM_LOOKAHEAD;
        if (me.boosting && me.alive) wantFov = FOV_BOOST;
        // crisp local shadows: follow the player
        if (sun && renderer.shadowMap.enabled) {
          sun.position.set(me.cx - 300, 760, me.cz - 220);
          sun.target.position.set(me.cx, 0, me.cz); sun.target.updateMatrixWorld();
        }
      } else { dx = cx; dy = 1300; dz = cz + 1500; lx = cx; ly = 0; lz = cz; }

      const k = Math.min(1, dt * CAM_LERP);
      camPos.x += (dx - camPos.x) * k; camPos.y += (dy - camPos.y) * k; camPos.z += (dz - camPos.z) * k;
      camLook.x += (lx - camLook.x) * k; camLook.y += (ly - camLook.y) * k; camLook.z += (lz - camLook.z) * k;

      fov += (wantFov - fov) * Math.min(1, dt * 6);
      camera.fov = fov; camera.updateProjectionMatrix();

      camera.position.copy(camPos);
      camera.position.y -= dip * 10; // dip down on hit
      if (shakeMag > 0.05) {
        camera.position.x += (Math.random() - 0.5) * shakeMag;
        camera.position.y += (Math.random() - 0.5) * shakeMag;
        camera.position.z += (Math.random() - 0.5) * shakeMag;
        shakeMag *= Math.pow(0.0001, dt);
      } else shakeMag = 0;
      camera.lookAt(camLook);

      if (this._blimp) this._blimp.position.x = cx + Math.sin(time * 0.05) * 700;
      if (this._water) this._water.material.color.setHSL(0.55, 0.7, 0.5 + Math.sin(time * 0.6) * 0.03);
    },

    _drawMinimap(state, myId) {
      if (!mmctx) return;
      const w = minimap.width, h = minimap.height;
      mmctx.clearRect(0, 0, w, h);
      mmctx.fillStyle = "rgba(10,24,14,0.6)"; mmctx.fillRect(0, 0, w, h);
      mmctx.strokeStyle = "rgba(150,236,180,0.5)"; mmctx.strokeRect(0.5, 0.5, w - 1, h - 1);
      const sx = w / G.ARENA_WIDTH, sy = h / G.ARENA_HEIGHT;
      state.players.forEach((p, id) => {
        if (!p.alive) return;
        const me = id === myId;
        mmctx.fillStyle = me ? "#fff" : (p.bot ? "#ff8a8a" : "#7fd0ff");
        mmctx.beginPath(); mmctx.arc(p.x * sx, p.y * sy, me ? 3 : 2, 0, TAU); mmctx.fill();
      });
    },
  };

  window.Renderer = R;
})();
