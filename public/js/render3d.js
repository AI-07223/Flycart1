// 3D renderer (Three.js, ESM) — GLOBE ARENA. The world is a toy planet; planes fly on its surface
// and wrap around it (no walls). Server is authoritative in spherical space (unit-vector positions +
// tangent forward); we present it as a globe with a surface-following chase camera.
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
  const SP = window.Sphere;
  const TAU = Math.PI * 2;

  // ---- tuning (rendering only) ----
  const ALT = 16, BULLET_ALT = 13, PICKUP_ALT = 20, PLANE_SCALE = 1.7;
  const CAM_BACK = 150, CAM_UP = 78, CAM_LOOKAHEAD = 120, CAM_LERP = 4.5;
  const FOV_BASE = 64, FOV_BOOST = 75;
  const SKY = 0x0b1022;
  const SKINS = [0xff6b6b, 0x49c0ff, 0x8be34a, 0xffd24a, 0xc07bff];

  // shared geometries (cheap to reuse) — never disposed
  const SPARK_GEO = new THREE.TetrahedronGeometry(1);
  const PUFF_GEO = new THREE.SphereGeometry(1, 8, 8);
  const RING_GEO = new THREE.TorusGeometry(1, 0.16, 8, 28);
  [SPARK_GEO, PUFF_GEO, RING_GEO].forEach((g) => (g.__shared = true));

  // scratch + helpers
  const V = (o) => new THREE.Vector3(o.x, o.y, o.z);
  const m4 = new THREE.Matrix4();
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
  const rand = (a, b) => a + Math.random() * (b - a);
  const _seen = new Set(), _bseen = new Set(), _pkseen = new Set();

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
  let curR = G.R_BASE;          // eased render radius (toward state.radius)
  let volcano = null, eruptAt = 0, emberAt = 0;
  const camPos = new THREE.Vector3(0, 0, curR * 3);
  const camLook = new THREE.Vector3(0, 0, 0);
  const camUp = new THREE.Vector3(0, 1, 0);
  const particles = [];
  const INTERP_DELAY = 100;
  // local-plane prediction: p (dir), f (forward tangent), speed
  const predict = { p: { x: 0, y: 1, z: 0 }, f: { x: 1, y: 0, z: 0 }, speed: G.CRUISE_SPEED };

  // world position of a surface direction at altitude `alt` (uses the eased radius)
  const worldOf = (dir, alt) => _a.set(dir.x, dir.y, dir.z).multiplyScalar(curR + alt);

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
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.shadowMap.enabled = cfg.shadows === "map";
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      scene = new THREE.Scene();
      scene.background = new THREE.Color(SKY);
      scene.fog = new THREE.Fog(SKY, curR * 2.4, curR * 5.5);

      camera = new THREE.PerspectiveCamera(FOV_BASE, window.innerWidth / window.innerHeight, 1, 40000);
      camera.position.copy(camPos);

      scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x404a5a, 1.0));
      sun = new THREE.DirectionalLight(0xfff4da, 1.3);
      sun.position.set(1, 0.7, 0.6).multiplyScalar(3000);
      scene.add(sun);

      const w = window.innerWidth, h = window.innerHeight;
      composer = new EffectComposer(renderer);
      composer.setSize(w, h);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.6, 0.5, 0.82);
      bloomPass.enabled = cfg.bloom;
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());

      this._buildStars();
      this._buildPlanet();
      this._buildObstacles();
      this._buildDecor();

      minimap = document.createElement("canvas");
      minimap.id = "minimap";
      minimap.width = 150; minimap.height = 150;
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
      renderer.shadowMap.enabled = cfg.shadows === "map";
      renderer.shadowMap.needsUpdate = true;
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
      const sdt = hitStop > 0 ? dt * 0.12 : dt;

      // ease the rendered planet radius toward the authoritative (per-round) value
      const targetR = state.radius || G.R_BASE;
      curR += (targetR - curR) * Math.min(1, dt * 1.5);

      const interp = (window.Net && window.Net.sample) ? window.Net.sample(performance.now() - INTERP_DELAY) : {};
      const input = window.Input ? window.Input.get() : { turn: 0, boost: false, fire: false };

      const seen = _seen; seen.clear();
      state.players.forEach((p, id) => {
        seen.add(id);
        let v = this.views.get(id);
        if (!v) { v = this._makeView(id, p); this.views.set(id, v); if (id === myId) this._initPredict(p); }

        const sp = { x: p.px, y: p.py, z: p.pz }, sf = { x: p.fx, y: p.fy, z: p.fz };
        const wasAlive = v.wasAlive;
        if (wasAlive && !p.alive) { this._explode(worldOf(v.p, ALT).clone(), v.p, SKINS[p.skin % SKINS.length]); if (id === myId) this.setShake(15); }
        const justSpawned = !wasAlive && p.alive;
        if (justSpawned) { v.p = sp; v.f = sf; if (id === myId) this._initPredict(p); }
        v.wasAlive = p.alive;
        if (id === myId && p.alive && p.hp < v.hp) { this.setShake(7); dip = Math.min(1, dip + 0.7); }
        v.hp = p.hp; v.alive = p.alive; v.boosting = p.boosting;

        const prevF = v.f;
        if (id === myId) {
          if (p.alive) {
            this._stepPredict(dt, input, p.power);
            const err = SP.angBetween(predict.p, sp);
            if (err > 0.2) { predict.p = sp; predict.f = sf; }
            else { const rk = Math.min(1, dt * 2.5); predict.p = SP.slerp(predict.p, sp, rk); predict.f = SP.tangentize(predict.p, SP.slerp(predict.f, sf, rk)); }
            v.p = predict.p; v.f = predict.f;
            v.bankTarget = Math.max(-0.7, Math.min(0.7, -(input.turn || 0) * 0.7));
          } else { v.p = sp; v.f = sf; v.bankTarget = 0; }
        } else {
          const ip = interp[id];
          if (ip && p.alive && !justSpawned) {
            v.p = ip.p; v.f = ip.f;
            v.bankTarget = Math.max(-0.7, Math.min(0.7, -SP.signedAngle(v.p, prevF, ip.f) * 7));
          } else { v.p = sp; v.f = sf; v.bankTarget = 0; }
        }
        v.bank += (v.bankTarget - v.bank) * Math.min(1, dt * 9);

        this._placePlane(v, p);

        if (p.power === "shield" && p.alive) {
          if (!v.shield) { v.shield = this._makeShield(); scene.add(v.shield); }
          v.shield.visible = true; v.shield.position.copy(worldOf(v.p, ALT));
        } else if (v.shield) { v.shield.visible = false; }

        if (p.alive) {
          const rate = p.boosting ? 0.03 : 0.13;
          if (time - v.lastPuff > rate) {
            v.lastPuff = time;
            const back = SP.advance(v.p, v.f, -24 / curR).p; // just behind the tail on the surface
            this._puff(worldOf(back, ALT).clone(), p.boosting);
          }
        }
      });
      this.views.forEach((v, id) => {
        if (!seen.has(id)) {
          scene.remove(v.mesh); disposeObject(v.mesh);
          if (v.shield) { scene.remove(v.shield); disposeObject(v.shield); }
          this.views.delete(id);
        }
      });

      // bullets (server positions; slight forward extrapolation between patches)
      const bseen = _bseen; bseen.clear();
      state.bullets.forEach((b, key) => {
        bseen.add(key);
        let m = this.bullets.get(key);
        const sp = { x: b.px, y: b.py, z: b.pz }, sf = { x: b.fx, y: b.fy, z: b.fz };
        if (!m) { m = this._makeBullet(b.homing); m.userData = { p: sp, f: sf, sx: b.px, sy: b.py, sz: b.pz, homing: b.homing }; this.bullets.set(key, m); }
        const u = m.userData;
        if (u.homing || b.px !== u.sx || b.py !== u.sy || b.pz !== u.sz) { u.p = sp; u.f = sf; u.sx = b.px; u.sy = b.py; u.sz = b.pz; }
        else { const adv = SP.advance(u.p, u.f, (G.BULLET_SPEED / curR) * dt); u.p = adv.p; u.f = adv.f; }
        this._orient(m, u.p, u.f, BULLET_ALT, 0);
      });
      this.bullets.forEach((m, key) => { if (!bseen.has(key)) { scene.remove(m); disposeObject(m); this.bullets.delete(key); } });

      // pickups
      const pkseen = _pkseen; pkseen.clear();
      state.pickups.forEach((pk, key) => {
        pkseen.add(key);
        let m = this.pickups.get(key);
        if (!m) { m = this._makePickup(pk.type); this.pickups.set(key, m); }
        const dir = { x: pk.px, y: pk.py, z: pk.pz };
        m.position.copy(worldOf(dir, PICKUP_ALT + Math.sin(time * 2 + m.userData.ph) * 6));
        m.up.copy(V(dir)); m.lookAt(_b.copy(m.position).add(V(dir))); // keep upright on the surface
        m.rotateY(time * 1.6);
      });
      this.pickups.forEach((m, key) => { if (!pkseen.has(key)) { scene.remove(m); disposeObject(m); this.pickups.delete(key); } });

      this._updateMap(sdt);
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
      _c.copy(worldOf(v.p, ALT + 30)).project(camera);
      if (_c.z > 1) return;
      const el = document.createElement("div");
      el.className = "popup3d" + (mine ? " mine" : "");
      el.textContent = mine ? "+1 SMASH!" : "+1";
      el.style.left = (_c.x * 0.5 + 0.5) * window.innerWidth + "px";
      el.style.top = (-_c.y * 0.5 + 0.5) * window.innerHeight + "px";
      popupLayer.appendChild(el);
      requestAnimationFrame(() => el.classList.add("go"));
      setTimeout(() => el.remove(), 1200);
    },

    hitStop(ms) { hitStop = Math.max(hitStop, Math.min(0.09, (ms || 70) / 1000)); },
    setShake(mag) { shakeMag = Math.max(shakeMag, mag); },

    __debug() {
      return {
        radius: Math.round(curR),
        views: this.views.size, bullets: this.bullets.size, particles: particles.length,
        bloom: bloomPass ? bloomPass.enabled : null,
        quality: Q.current, fov: Math.round(fov),
        sceneChildren: scene ? scene.children.length : -1,
        geometries: renderer ? renderer.info.memory.geometries : -1,
        textures: renderer ? renderer.info.memory.textures : -1,
        programs: renderer && renderer.info.programs ? renderer.info.programs.length : -1,
      };
    },

    // ---- local-plane prediction (mirrors the server stepPlane on the sphere) ----
    _initPredict(p) { predict.p = { x: p.px, y: p.py, z: p.pz }; predict.f = { x: p.fx, y: p.fy, z: p.fz }; predict.speed = G.CRUISE_SPEED; },

    _stepPredict(dt, input, power) {
      predict.f = SP.turn(predict.p, predict.f, (input.turn || 0) * G.TURN_RATE * dt);
      let target = input.boost ? G.BOOST_SPEED : G.CRUISE_SPEED;
      if (power === "afterburner") target *= (G.AFTERBURNER_FACTOR || 1);
      const before = predict.speed;
      predict.speed += Math.sign(target - before) * G.ACCEL * dt;
      if ((target - predict.speed) * (target - before) < 0) predict.speed = target;
      const adv = SP.advance(predict.p, predict.f, (predict.speed / curR) * dt);
      predict.p = adv.p; predict.f = adv.f;
      // solid-obstacle deflect (mirror server) — render/feel only, never hp
      const planeAng = G.PLANE_RADIUS / curR;
      for (let i = 0; i < G.OBSTACLES.length; i++) {
        const o = G.OBSTACLES[i]; if (!G.OBSTACLE_BEHAVIOR[o.kind].solid) continue;
        const sep = SP.angBetween(predict.p, o.dir), rr = o.angRadius + planeAng;
        if (sep < rr) {
          predict.p = sep > 1e-4 ? SP.slerp(o.dir, predict.p, rr / sep) : SP.advance(o.dir, SP.anyTangent(o.dir), rr).p;
          const outward = SP.tangentize(predict.p, SP.sub(predict.p, o.dir));
          predict.f = SP.turn(predict.p, predict.f, SP.signedAngle(predict.p, predict.f, outward) * 0.35);
        }
      }
    },

    // ===================== build =====================
    _buildStars() {
      const n = 600, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const d = SP.randomDir ? null : null; const x = rand(-1, 1), y = rand(-1, 1), z = rand(-1, 1); const l = Math.hypot(x, y, z) || 1; const r = 16000; pos[i*3]=x/l*r; pos[i*3+1]=y/l*r; pos[i*3+2]=z/l*r; }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbcd2ff, size: 60, sizeAttenuation: true }));
      scene.add(stars); this._stars = stars;
    },

    _buildPlanet() {
      // grass texture (canvas) wrapped over the sphere
      const c = document.createElement("canvas"); c.width = 512; c.height = 256;
      const g = c.getContext("2d");
      g.fillStyle = "#5bbf4a"; g.fillRect(0, 0, 512, 256);
      g.fillStyle = "rgba(40,120,55,0.55)";
      for (let i = 0; i < 60; i++) { const x = Math.random()*512, y = Math.random()*256, r = rand(14, 46); g.beginPath(); g.ellipse(x, y, r, r*0.7, 0, 0, TAU); g.fill(); }
      g.fillStyle = "rgba(255,255,255,0.05)";
      for (let i = 0; i < 200; i++) g.fillRect(Math.random()*512, Math.random()*256, 2, 2);
      const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 48),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 })
      );
      planet.receiveShadow = true; scene.add(planet); this._planet = planet;

      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(1.05, 32, 24),
        new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false })
      );
      scene.add(atmo); this._atmo = atmo;
    },

    _buildDecor() {
      // a few clouds orbiting above the surface
      const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9 });
      const n = Math.round(14 * decorScale);
      this._clouds = [];
      for (let i = 0; i < n; i++) {
        const grp = new THREE.Group();
        const lobes = 3 + (i % 3);
        for (let j = 0; j < lobes; j++) { const s = rand(28, 60); const m = new THREE.Mesh(PUFF_GEO, cloudMat); m.scale.set(s*1.4, s, s); m.position.set((j-lobes/2)*46, rand(-8, 10), rand(-20, 20)); grp.add(m); }
        const dir = SP.randomDir(); grp.userData = { dir, alt: rand(120, 220) };
        scene.add(grp); this._clouds.push(grp);
      }
    },

    // ---- arena map content on the sphere (obstacles / landmarks / hotspot) ----
    _buildObstacles() {
      const list = G.OBSTACLES || [];
      this._mapGroup = new THREE.Group();
      if (!list.length) { scene.add(this._mapGroup); return; }
      const ROCK = 0x8d857a, ROCK_D = 0x6f675d, STONE = 0x9a958c;
      for (const o of list) {
        let mesh;
        if (o.landmark === "volcano" || o.kind === "tower") mesh = this._lmVolcano(o);
        else if (o.landmark === "lighthouse") mesh = this._lmLighthouse(o);
        else if (o.landmark === "shipwreck") mesh = this._lmShipwreck(o);
        else if (o.landmark === "forest") mesh = this._lmForest(o);
        else if (o.kind === "spire") mesh = this._obSpire(o, ROCK, ROCK_D);
        else if (o.kind === "arch") mesh = this._obArch(o, STONE);
        else if (o.kind === "ring") mesh = this._obRing(o);
        else mesh = this._obRock(o, ROCK);
        if (mesh) { mesh.userData.dir = o.dir; this._mapGroup.add(mesh); }
      }
      scene.add(this._mapGroup);
    },

    // place a static surface object: base on the surface, local +Y = outward normal
    _seat(group, dir, baseAlt) {
      group.userData.dir = dir; group.userData.alt = baseAlt || 0;
    },
    _obSpire(o, col, dark) {
      const g = new THREE.Group(), h = o.height, r = h * 0.45;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), new THREE.MeshStandardMaterial({ color: col, flatShading: true, roughness: 1 }));
      cone.position.y = h / 2; cone.castShadow = true; g.add(cone);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, h * 0.3, 7), new THREE.MeshStandardMaterial({ color: dark, flatShading: true, roughness: 1 }));
      cap.position.y = h * 0.92; g.add(cap); return g;
    },
    _obRock(o, col) {
      const g = new THREE.Group(), h = o.height;
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(h * 0.6, 0), new THREE.MeshStandardMaterial({ color: col, flatShading: true, roughness: 1 }));
      rock.scale.y = 0.7; rock.position.y = h * 0.42; rock.castShadow = true; g.add(rock); return g;
    },
    _obArch(o, col) {
      const g = new THREE.Group(), h = o.height;
      const torus = new THREE.Mesh(new THREE.TorusGeometry(h * 0.5, h * 0.1, 8, 18), new THREE.MeshStandardMaterial({ color: col, flatShading: true, roughness: 1 }));
      torus.position.y = h * 0.5; torus.castShadow = true; g.add(torus); return g;
    },
    _obRing(o) {
      const g = new THREE.Group(), h = o.height, col = 0x6fe0ff;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(h * 0.55, h * 0.06, 8, 24), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.85, roughness: 0.4, transparent: true, opacity: 0.85 }));
      ring.position.y = h * 0.7; g.add(ring); g.userData.ring = true; return g;
    },
    _lmVolcano(o) {
      const g = new THREE.Group(), h = o.height, r = h * 0.5;
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r, h, 16), new THREE.MeshStandardMaterial({ color: 0x4b3f3a, flatShading: true, roughness: 1 }));
      cone.position.y = h / 2; cone.castShadow = true; g.add(cone);
      const crater = new THREE.Mesh(new THREE.CircleGeometry(r * 0.42, 16), new THREE.MeshBasicMaterial({ color: 0xff7b2e }));
      crater.rotation.x = -Math.PI / 2; crater.position.y = h + 0.5; g.add(crater);
      const glow = new THREE.PointLight(0xff6a2a, 0.9, h * 6, 2); glow.position.y = h + 10; g.add(glow);
      g.userData.volcanoTop = h + 6;
      return g;
    },
    _lmLighthouse(o) {
      const g = new THREE.Group(), h = o.height, r = h * 0.28;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r, h, 12), new THREE.MeshStandardMaterial({ color: 0xf4f4f4, flatShading: true, roughness: 0.85 }));
      tower.position.y = h / 2; tower.castShadow = true; g.add(tower);
      for (let i = 0; i < 2; i++) { const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.66, r * 0.72, h * 0.12, 12), new THREE.MeshStandardMaterial({ color: 0xe2452f, roughness: 0.85 })); band.position.y = h * (0.35 + i * 0.32); g.add(band); }
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff2a8 })); lantern.position.y = h + r * 0.2; g.add(lantern);
      return g;
    },
    _lmShipwreck(o) {
      const g = new THREE.Group(), h = Math.max(o.height, 70);
      const hull = new THREE.Mesh(new THREE.BoxGeometry(h * 1.1, h * 0.5, h * 0.55), new THREE.MeshStandardMaterial({ color: 0x6b4a2b, flatShading: true, roughness: 1 }));
      hull.position.y = h * 0.3; hull.rotation.z = 0.2; hull.castShadow = true; g.add(hull);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.04, h * 0.04, h * 1.1, 6), new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 1 })); mast.position.set(h*0.08, h*0.7, 0); mast.rotation.z = 0.16; g.add(mast);
      return g;
    },
    _lmForest(o) {
      const g = new THREE.Group(), h = o.height;
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f9d4a, flatShading: true, roughness: 1 });
      for (let i = 0; i < 6; i++) { const a = (i/6)*TAU, rr = rand(h*0.2, h*0.7), tx = Math.cos(a)*rr, tz = Math.sin(a)*rr, th = rand(h*0.7, h*1.1); const tr = new THREE.Mesh(new THREE.CylinderGeometry(th*0.06, th*0.08, th*0.5, 6), trunkMat); tr.position.set(tx, th*0.25, tz); g.add(tr); const lf = new THREE.Mesh(new THREE.ConeGeometry(th*0.32, th*0.7, 7), leafMat); lf.position.set(tx, th*0.7, tz); lf.castShadow = true; g.add(lf); }
      return g;
    },

    _updateMap(dt) {
      // seat all static surface meshes on the (possibly resized) planet, oriented to the normal
      if (this._mapGroup) for (const m of this._mapGroup.children) this._orient(m, m.userData.dir, null, 0, m.userData.ring ? 0 : 0);
      if (this._clouds) for (const c of this._clouds) { c.position.copy(worldOf(c.userData.dir, c.userData.alt)); c.up.copy(V(c.userData.dir)); c.lookAt(_b.copy(c.position).add(V(c.userData.dir))); }
      // volcano eruption (purely visual; emits/reads no state)
      if (!volcano && this._mapGroup) for (const m of this._mapGroup.children) if (m.userData.volcanoTop != null) volcano = { dir: m.userData.dir, top: m.userData.volcanoTop };
      if (!volcano) return;
      const top = worldOf(volcano.dir, volcano.top);
      const nrm = V(volcano.dir);
      if (time > emberAt) {
        emberAt = time + 0.18;
        const n = Math.max(1, Math.round(partScale));
        for (let i = 0; i < n; i++) this._spawnAt(SPARK_GEO, 0xff9a3c, top, nrm, { spread: 14, up: rand(40, 80), life: rand(0.7, 1.3), grav: 90, from: rand(1.5, 3), to: 0.4, alpha: 0.9, add: true });
      }
      if (time > eruptAt) {
        eruptAt = time + rand(3.5, 6);
        const n = Math.round(16 * partScale);
        for (let i = 0; i < n; i++) this._spawnAt(SPARK_GEO, i % 2 ? 0xffd27a : 0xff5a2a, top, nrm, { spread: 30, up: rand(120, 240), life: rand(0.8, 1.5), grav: 220, from: rand(2.5, 5), to: 0.5, alpha: 1, add: true });
        const sm = Math.round(5 * partScale);
        for (let i = 0; i < sm; i++) this._spawnAt(PUFF_GEO, 0x6b5a52, top, nrm, { spread: 16, up: rand(40, 90), life: rand(1, 1.8), grav: -8, from: rand(4, 8), to: rand(20, 32), alpha: 0.35 });
      }
    },

    _disposeMap() { if (this._mapGroup) { scene.remove(this._mapGroup); disposeObject(this._mapGroup); this._mapGroup = null; } volcano = null; },

    // ===================== entities =====================
    _makeView(id, p) {
      const mesh = this._makePlane(p.skin);
      scene.add(mesh);
      return { mesh, p: { x: p.px, y: p.py, z: p.pz }, f: { x: p.fx, y: p.fy, z: p.fz }, bank: 0, bankTarget: 0, hp: p.hp, alive: p.alive, wasAlive: p.alive, boosting: false, phase: (id.charCodeAt(0) || 1) % 7, lastPuff: 0 };
    },

    _makePlane(skin) {
      const color = SKINS[skin % SKINS.length];
      const g = new THREE.Group();
      const body = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.6, metalness: 0.05 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, flatShading: true, roughness: 0.6 });
      const glass = new THREE.MeshStandardMaterial({ color: 0x123a5a, flatShading: true, roughness: 0.25, metalness: 0.1 });
      const fus = new THREE.Mesh(new THREE.CapsuleGeometry(4.2, 20, 4, 10), body); fus.rotation.x = Math.PI / 2; fus.castShadow = true; g.add(fus);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(4.2, 12, 10), dark); nose.scale.set(1, 1, 1.5); nose.position.z = -13; g.add(nose);
      const wing = new THREE.Mesh(new THREE.CapsuleGeometry(2.1, 40, 4, 8), body); wing.rotation.z = Math.PI / 2; wing.scale.set(1, 1, 2.1); wing.position.z = 2; wing.castShadow = true; g.add(wing);
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 16, 4, 6), body); tail.rotation.z = Math.PI / 2; tail.scale.set(1, 1, 1.7); tail.position.z = 15; g.add(tail);
      const fin = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 8, 4, 6), body); fin.position.set(0, 4, 15); g.add(fin);
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 10), glass); canopy.scale.set(1, 0.7, 1.5); canopy.position.set(0, 3.3, -1); g.add(canopy);
      const prop = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 18, 3, 6), dark); prop.rotation.z = Math.PI / 2; prop.position.z = -22; g.add(prop); g._prop = prop;
      g.scale.setScalar(PLANE_SCALE);
      return g;
    },

    // Orient `obj` on the surface: position = dir·(R+alt); local +Y = normal (dir); if `fwd` given,
    // local -Z (nose) = fwd; apply `bank` roll about the nose. If fwd null, keep an arbitrary heading.
    _orient(obj, dir, fwd, alt, bank) {
      obj.position.copy(worldOf(dir, alt));
      const up = _a.set(dir.x, dir.y, dir.z);
      const f = fwd ? _b.set(fwd.x, fwd.y, fwd.z) : _b.copy(up).cross(_c.set(0, 1, 0)).normalize();
      if (f.lengthSq() < 1e-6) f.set(1, 0, 0);
      const back = _c.copy(f).multiplyScalar(-1);            // local +Z → -forward
      const right = new THREE.Vector3().crossVectors(up, back).normalize();
      back.crossVectors(right, up).normalize();              // re-orthogonalize
      m4.makeBasis(right, up, back);
      obj.quaternion.setFromRotationMatrix(m4);
      if (bank) obj.rotateZ(bank);
    },

    _placePlane(v, p) {
      const g = v.mesh;
      g.visible = p.alive;
      const bob = Math.sin(time * 2 + v.phase) * 1.5;
      this._orient(g, v.p, v.f, ALT + bob, v.bank);
      if (g._prop) g._prop.rotation.z = time * 42;
    },

    _makeBullet(homing) {
      const core = homing ? 0xd7a8ff : 0xfff1a8, tcol = homing ? 0xc07bff : 0xffae3b;
      const grp = new THREE.Group();
      grp.add(new THREE.Mesh(new THREE.SphereGeometry(homing ? 3.6 : 3, 8, 8), new THREE.MeshBasicMaterial({ color: core })));
      const tracer = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.2, 16, 6), new THREE.MeshBasicMaterial({ color: tcol, transparent: true, opacity: 0.8 }));
      tracer.rotation.x = Math.PI / 2; tracer.position.z = 8; grp.add(tracer);
      scene.add(grp); return grp;
    },

    _makePickup(type) {
      const info = (G.POWERUPS && G.POWERUPS[type]) || { color: 0xffffff };
      const grp = new THREE.Group();
      grp.add(new THREE.Mesh(new THREE.OctahedronGeometry(15, 0), new THREE.MeshStandardMaterial({ color: info.color, emissive: info.color, emissiveIntensity: 0.6, flatShading: true, roughness: 0.4 })));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(20, 1.6, 8, 24), new THREE.MeshBasicMaterial({ color: info.color, transparent: true, opacity: 0.7 }));
      ring.rotation.x = Math.PI / 2; grp.add(ring);
      grp.userData = { ph: Math.random() * 6 };
      scene.add(grp); return grp;
    },

    _makeShield() {
      return new THREE.Mesh(new THREE.SphereGeometry(38, 16, 12), new THREE.MeshBasicMaterial({ color: 0x49c0ff, transparent: true, opacity: 0.18, depthWrite: false }));
    },

    // ---- particles ----
    _spawn(geo, color, x, y, z, o) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o.alpha ?? 1, depthWrite: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending }));
      m.position.set(x, y, z); m.scale.setScalar(o.from ?? 1);
      scene.add(m);
      particles.push({ mesh: m, vel: o.vel, life: o.life, maxLife: o.life, gravity: o.gravity ?? 0, grav3: o.grav3 || null, spin: o.spin ?? 0, alpha: o.alpha ?? 1, from: o.from ?? 1, to: o.to ?? o.from ?? 1 });
    },

    // spawn at a world point, velocity = up·(normal) + random spread, gravity pulls along -normal
    _spawnAt(geo, color, pos, normal, o) {
      const vel = new THREE.Vector3(rand(-o.spread, o.spread), rand(-o.spread, o.spread), rand(-o.spread, o.spread)).addScaledVector(normal, o.up);
      this._spawn(geo, color, pos.x, pos.y, pos.z, { vel, life: o.life, gravity: 0, grav3: normal.clone().multiplyScalar(-(o.grav || 0)), spin: o.spin ?? 6, from: o.from, to: o.to, alpha: o.alpha, add: o.add });
    },

    _explode(pos, normal, color) {
      const nrm = V(normal);
      this._spawnAt(PUFF_GEO, 0xffe6a8, pos, nrm, { spread: 8, up: 8, life: 0.26, grav: 0, from: 6, to: 36, alpha: 0.95, add: true });
      const n = Math.round(16 * partScale);
      for (let i = 0; i < n; i++) this._spawnAt(SPARK_GEO, i % 2 ? 0xffd27a : color, pos, nrm, { spread: 180, up: rand(40, 160), life: rand(0.5, 0.85), grav: 240, from: rand(3, 6), to: 0.5, alpha: 1, add: true });
      const m = Math.round(7 * partScale);
      for (let i = 0; i < m; i++) this._spawnAt(PUFF_GEO, 0x9aa6b2, pos, nrm, { spread: 50, up: rand(20, 60), life: rand(0.5, 0.9), grav: -12, from: rand(3, 6), to: rand(14, 20), alpha: 0.4 });
    },

    _puff(pos, boosting) {
      this._spawn(PUFF_GEO, boosting ? 0xff9a3c : 0x9aa6b2, pos.x, pos.y, pos.z, { vel: new THREE.Vector3(0, 0, 0), life: boosting ? 0.35 : 0.6, from: boosting ? 5 : 3, to: boosting ? 13 : 16, alpha: boosting ? 0.75 : 0.32, add: !!boosting });
    },

    _updateParticles(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { scene.remove(p.mesh); p.mesh.material.dispose(); particles.splice(i, 1); continue; }
        if (p.grav3) p.vel.addScaledVector(p.grav3, dt); else p.vel.y -= p.gravity * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        const k = p.life / p.maxLife;
        p.mesh.scale.setScalar(p.to + (p.from - p.to) * k);
        p.mesh.material.opacity = p.alpha * k;
        if (p.spin) { p.mesh.rotation.x += p.spin * dt; p.mesh.rotation.y += p.spin * 0.7 * dt; }
      }
    },

    _updateCamera(myId, dt) {
      const me = this.views.get(myId);
      let wantFov = FOV_BASE;
      if (me && me.alive) {
        const P = V(me.p), F = V(me.f);
        const planeW = P.clone().multiplyScalar(curR + ALT);
        // behind along -forward, up along the surface normal
        _a.copy(planeW).addScaledVector(F, -CAM_BACK).addScaledVector(P, CAM_UP);
        _b.copy(planeW).addScaledVector(F, CAM_LOOKAHEAD);
        const k = Math.min(1, dt * CAM_LERP);
        camPos.lerp(_a, k); camLook.lerp(_b, k); camUp.lerp(P, Math.min(1, dt * 3)).normalize();
        if (me.boosting) wantFov = FOV_BOOST;
      } else {
        // idle orbit around the planet
        const a = time * 0.08;
        _a.set(Math.cos(a) * curR * 2.4, curR * 1.2, Math.sin(a) * curR * 2.4);
        camPos.lerp(_a, Math.min(1, dt * 1.5)); camLook.lerp(_b.set(0, 0, 0), Math.min(1, dt * 1.5)); camUp.lerp(_c.set(0, 1, 0), Math.min(1, dt * 1.5)).normalize();
      }
      fov += (wantFov - fov) * Math.min(1, dt * 6);
      camera.fov = fov; camera.updateProjectionMatrix();
      camera.up.copy(camUp);
      camera.position.copy(camPos);
      camera.position.addScaledVector(camUp, -dip * 10);
      if (shakeMag > 0.05) {
        camera.position.x += (Math.random() - 0.5) * shakeMag;
        camera.position.y += (Math.random() - 0.5) * shakeMag;
        camera.position.z += (Math.random() - 0.5) * shakeMag;
        shakeMag *= Math.pow(0.0001, dt);
      } else shakeMag = 0;
      camera.lookAt(camLook);
      if (this._planet) { this._planet.scale.setScalar(curR); }
      if (this._atmo) { this._atmo.scale.setScalar(curR * 1.05); }
      if (scene.fog) { scene.fog.near = curR * 2.2; scene.fog.far = curR * 5.5; }
    },

    // player-centric radar: bearing relative to my heading (forward = up), radius = angular distance
    _drawMinimap(state, myId) {
      if (!mmctx) return;
      const w = minimap.width, h = minimap.height, cx = w / 2, cy = h / 2, rad = w / 2 - 6;
      mmctx.clearRect(0, 0, w, h);
      mmctx.fillStyle = "rgba(10,18,34,0.62)"; mmctx.beginPath(); mmctx.arc(cx, cy, rad + 4, 0, TAU); mmctx.fill();
      mmctx.strokeStyle = "rgba(150,200,236,0.5)"; mmctx.beginPath(); mmctx.arc(cx, cy, rad + 4, 0, TAU); mmctx.stroke();
      const me = state.players.get(myId);
      let myP = me ? SP.vec(me.px, me.py, me.pz) : SP.vec(0, 0, 1);
      let myF = me ? SP.tangentize(myP, SP.vec(me.fx, me.fy, me.fz)) : SP.vec(1, 0, 0);
      const plot = (dir, fn) => {
        const ang = SP.angBetween(myP, dir); if (ang < 1e-3) { fn(cx, cy); return; }
        const bearing = SP.signedAngle(myP, myF, SP.tangentize(myP, SP.sub(dir, myP)));
        const rr = Math.min(1, ang / Math.PI) * rad;
        fn(cx + Math.sin(bearing) * rr, cy - Math.cos(bearing) * rr);
      };
      // obstacles + hotspot
      (G.OBSTACLES || []).forEach((o) => plot(o.dir, (x, y) => {
        const beh = (G.OBSTACLE_BEHAVIOR || {})[o.kind] || {};
        if (o.landmark === "volcano" || o.kind === "tower") { mmctx.fillStyle = "#ff7b2e"; mmctx.beginPath(); mmctx.arc(x, y, 3, 0, TAU); mmctx.fill(); }
        else if (beh.solid) { mmctx.fillStyle = o.landmark ? "rgba(222,212,150,0.9)" : "rgba(160,150,140,0.8)"; mmctx.beginPath(); mmctx.arc(x, y, 2.4, 0, TAU); mmctx.fill(); }
        else { mmctx.strokeStyle = "rgba(111,224,255,0.85)"; mmctx.beginPath(); mmctx.arc(x, y, 2.4, 0, TAU); mmctx.stroke(); }
      }));
      state.players.forEach((p, id) => {
        if (!p.alive) return;
        plot(SP.vec(p.px, p.py, p.pz), (x, y) => { const m = id === myId; mmctx.fillStyle = m ? "#fff" : (p.bot ? "#ff8a8a" : "#7fd0ff"); mmctx.beginPath(); mmctx.arc(x, y, m ? 3 : 2, 0, TAU); mmctx.fill(); });
      });
      // own heading marker (always up/centre)
      mmctx.fillStyle = "#fff"; mmctx.beginPath(); mmctx.moveTo(cx, cy - 5); mmctx.lineTo(cx - 3, cy + 3); mmctx.lineTo(cx + 3, cy + 3); mmctx.closePath(); mmctx.fill();
    },
  };

  window.Renderer = R;
})();
