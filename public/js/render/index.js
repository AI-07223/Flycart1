// render/index.js — main Renderer class composing all render modules
(function () {
  const G = window.GAME;
  const Q = window.Quality;
  const SP = window.Sphere;
  const Planet = window.RenderPlanet;
  const Effects = window.RenderEffects;
  const Minimap = window.RenderMinimap;

  // shared geometries (cheap to reuse)
  const SPARK_GEO = new THREE.TetrahedronGeometry(1);
  const PUFF_GEO = new THREE.SphereGeometry(1, 8, 8);
  const RING_GEO = new THREE.TorusGeometry(1, 0.16, 8, 28);
  [SPARK_GEO, PUFF_GEO, RING_GEO].forEach((g) => (g.__shared = true));

  // scratch helpers
  const V = (o) => new THREE.Vector3(o.x, o.y, o.z);
  const m4 = new THREE.Matrix4();
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
  const rand = (a, b) => a + Math.random() * (b - a);
  const _seen = new Set(), _bseen = new Set(), _pkseen = new Set();

  // tuning
  const ALT = 16, BULLET_ALT = 13, PICKUP_ALT = 20, PLANE_SCALE = 1.7;
  const VIS_K = 1.5;
  const CAM_BACK = 165, CAM_UP = 96, CAM_LOOKAHEAD = 130, CAM_LERP = 4.5;
  const FOV_BASE = 72, FOV_BOOST = 80;
  const SKY = 0x0b1022;
  const SKINS = [0xff6b6b, 0x49c0ff, 0x8be34a, 0xffd24a, 0xc07bff];
  const INTERP_DELAY = 100;

  function disposeObject(obj) {
    obj.traverse((o) => {
      if (o.geometry && !o.geometry.__shared) o.geometry.dispose();
      if (o.material) Array.isArray(o.material) ? o.material.forEach((m) => m.dispose()) : o.material.dispose();
    });
  }

  let scene, camera, renderer, composer, bloomPass, sun;
  let canvasEl, mm, popupLayer;
  let time = 0, fov = FOV_BASE;
  let decorScale = 1, partScale = 1;
  let curR = G.R_BASE, visR = G.R_BASE * VIS_K;
  let volcano = null, eruptAt = 0, emberAt = 0;
  const camPos = new THREE.Vector3(0, 0, curR * 3);
  const camLook = new THREE.Vector3(0, 0, 0);
  const camUp = new THREE.Vector3(0, 1, 0);
  const predict = { p: { x: 0, y: 1, z: 0 }, f: { x: 1, y: 0, z: 0 }, speed: G.CRUISE_SPEED };
  const worldOf = (dir, alt) => _a.set(dir.x, dir.y, dir.z).multiplyScalar(visR + alt);

  const ef = Effects.create();

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

      this._stars = Planet.buildStars(scene, visR);
      const p = Planet.buildPlanet(scene, visR);
      this._planet = p.planet; this._atmo = p.atmo;
      this._clouds = Planet.buildDecor(scene, SPARK_GEO, PUFF_GEO, decorScale, visR);

      const ob = Planet.buildObstacles(scene, Planet);
      this._mapGroup = ob.mapGroup;
      volcano = ob.volcano;

      mm = Minimap.create(document.getElementById("game-wrap") || document.body);

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

    sync(state, dt, myId) {
      dt = Math.min(dt, 0.05);
      if (this._demo) this._clearDemo();
      Q.sample(dt);
      time += dt;
      ef.hitStop = Math.max(0, ef.hitStop - dt);
      const sdt = ef.hitStop > 0 ? dt * 0.12 : dt;

      const targetR = state.radius || G.R_BASE;
      curR += (targetR - curR) * Math.min(1, dt * 1.5);
      visR = curR * VIS_K;

      const interp = (window.Net && window.Net.sample) ? window.Net.sample(performance.now() - INTERP_DELAY) : {};
      const input = window.Input ? window.Input.get() : { turn: 0, boost: false, fire: false };

      const seen = _seen; seen.clear();
      state.players.forEach((p, id) => {
        seen.add(id);
        let v = this.views.get(id);
        if (!v) { v = this._makeView(id, p); this.views.set(id, v); if (id === myId) this._initPredict(p); }

        const sp = { x: p.px, y: p.py, z: p.pz }, sf = { x: p.fx, y: p.fy, z: p.fz };
        const wasAlive = v.wasAlive;
        if (wasAlive && !p.alive) { Effects.explode(ef, scene, PUFF_GEO, SPARK_GEO, worldOf(v.p, ALT).clone(), v.p, SKINS[p.skin % SKINS.length], partScale); if (id === myId) this.setShake(15); }
        const justSpawned = !wasAlive && p.alive;
        if (justSpawned) { v.p = sp; v.f = sf; if (id === myId) this._initPredict(p); }
        v.wasAlive = p.alive;
        if (id === myId && p.alive && p.hp < v.hp) { this.setShake(7); ef.dip = Math.min(1, ef.dip + 0.7); }
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
            const back = SP.advance(v.p, v.f, -24 / visR).p;
            Effects.puff(ef, scene, PUFF_GEO, worldOf(back, ALT).clone(), p.boosting);
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

      const pkseen = _pkseen; pkseen.clear();
      state.pickups.forEach((pk, key) => {
        pkseen.add(key);
        let m = this.pickups.get(key);
        if (!m) { m = this._makePickup(pk.type); this.pickups.set(key, m); }
        const dir = { x: pk.px, y: pk.py, z: pk.pz };
        m.position.copy(worldOf(dir, PICKUP_ALT + Math.sin(time * 2 + m.userData.ph) * 6));
        m.up.copy(V(dir)); m.lookAt(_b.copy(m.position).add(V(dir)));
        m.rotateY(time * 1.6);
      });
      this.pickups.forEach((m, key) => { if (!pkseen.has(key)) { scene.remove(m); disposeObject(m); this.pickups.delete(key); } });

      this._updateMap(sdt);
      Effects.update(ef, scene, sdt);
      this._updateCamera(myId, sdt);
      ef.dip = Math.max(0, ef.dip - dt * 3);
    },

    draw(state, myId) {
      if (!renderer) return;
      composer.render();
      Minimap.draw(mm, state, myId);
    },

    drawMenu(dt, skin) {
      if (!renderer) return;
      dt = Math.min(dt || 0.016, 0.05);
      time += dt;
      this._ensureDemo(skin);
      const d = this._demo;
      if (d) {
        const adv = SP.advance(d.p, d.f, (G.CRUISE_SPEED / curR) * dt * 0.8);
        d.p = adv.p; d.f = adv.f;
        this._orient(d.mesh, d.p, d.f, ALT, Math.sin(time * 0.6) * 0.25);
        if (d.mesh._prop) d.mesh._prop.rotation.z = time * 42;
        if (time - (d.lastPuff || 0) > 0.14) { d.lastPuff = time; const back = SP.advance(d.p, d.f, -24 / visR).p; Effects.puff(ef, scene, PUFF_GEO, worldOf(back, ALT).clone(), false); }
      }
      this._updateMap(dt);
      Effects.update(ef, scene, dt);
      if (this._takeoff > 0 && d) {
        this._takeoff += dt;
        const k = Math.min(1, dt * 3);
        _a.copy(worldOf(d.p, ALT)).addScaledVector(V(d.f), -150).addScaledVector(V(d.p), 70);
        camPos.lerp(_a, k); camLook.lerp(worldOf(d.p, ALT), k);
        fov += (FOV_BOOST - fov) * k; camera.fov = fov; camera.updateProjectionMatrix();
        camera.up.copy(V(d.p)); camera.position.copy(camPos); camera.lookAt(camLook);
      } else {
        this._updateCamera(null, dt);
      }
      composer.render();
    },

    startTakeoff() { this._takeoff = 0.001; },

    _ensureDemo(skin) {
      const want = (typeof skin === "number" && skin >= 0 && skin < SKINS.length) ? skin : 0;
      if (this._demo && this._demo.skin === want) return;
      if (this._demo) this._clearDemo();
      const mesh = this._makePlane(want);
      scene.add(mesh);
      const p = SP.randomDir();
      this._demo = { mesh, skin: want, p, f: SP.turn(p, SP.anyTangent(p), Math.random() * Math.PI * 2), lastPuff: 0 };
    },

    _clearDemo() {
      if (this._demo) { scene.remove(this._demo.mesh); disposeObject(this._demo.mesh); this._demo = null; }
      this._takeoff = 0;
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

    hitStop(ms) { ef.hitStop = Math.max(ef.hitStop, Math.min(0.09, (ms || 70) / 1000)); },
    setShake(mag) { ef.shakeMag = Math.max(ef.shakeMag, mag); },

    __debug() {
      return {
        radius: Math.round(curR),
        views: this.views.size, bullets: this.bullets.size, particles: ef.particles.length,
        bloom: bloomPass ? bloomPass.enabled : null,
        quality: Q.current, fov: Math.round(fov),
        sceneChildren: scene ? scene.children.length : -1,
        geometries: renderer ? renderer.info.memory.geometries : -1,
        textures: renderer ? renderer.info.memory.textures : -1,
        programs: renderer && renderer.info.programs ? renderer.info.programs.length : -1,
      };
    },

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

    _orient(obj, dir, fwd, alt, bank) {
      obj.position.copy(worldOf(dir, alt));
      const up = _a.set(dir.x, dir.y, dir.z);
      const f = fwd ? _b.set(fwd.x, fwd.y, fwd.z) : _b.copy(up).cross(_c.set(0, 1, 0)).normalize();
      if (f.lengthSq() < 1e-6) f.set(1, 0, 0);
      const back = _c.copy(f).multiplyScalar(-1);
      const right = new THREE.Vector3().crossVectors(up, back).normalize();
      back.crossVectors(right, up).normalize();
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

    _updateMap(dt) {
      if (this._mapGroup) for (const m of this._mapGroup.children) this._orient(m, m.userData.dir, null, 0, m.userData.ring ? 0 : 0);
      if (this._clouds) for (const c of this._clouds) { c.position.copy(worldOf(c.userData.dir, c.userData.alt)); c.up.copy(V(c.userData.dir)); c.lookAt(_b.copy(c.position).add(V(c.userData.dir))); }
      if (!volcano) return;
      const top = worldOf(volcano.dir, volcano.top);
      const nrm = V(volcano.dir);
      if (time > emberAt) {
        emberAt = time + 0.18;
        const n = Math.max(1, Math.round(partScale));
        for (let i = 0; i < n; i++) Effects.spawnAt(ef, scene, SPARK_GEO, 0xff9a3c, top, nrm, { spread: 14, up: rand(40, 80), life: rand(0.7, 1.3), grav: 90, from: rand(1.5, 3), to: 0.4, alpha: 0.9, add: true });
      }
      if (time > eruptAt) {
        eruptAt = time + rand(3.5, 6);
        const n = Math.round(16 * partScale);
        for (let i = 0; i < n; i++) Effects.spawnAt(ef, scene, SPARK_GEO, i % 2 ? 0xffd27a : 0xff5a2a, top, nrm, { spread: 30, up: rand(120, 240), life: rand(0.8, 1.5), grav: 220, from: rand(2.5, 5), to: 0.5, alpha: 1, add: true });
        const sm = Math.round(5 * partScale);
        for (let i = 0; i < sm; i++) Effects.spawnAt(ef, scene, PUFF_GEO, 0x6b5a52, top, nrm, { spread: 16, up: rand(40, 90), life: rand(1, 1.8), grav: -8, from: rand(4, 8), to: rand(20, 32), alpha: 0.35 });
      }
    },

    _updateCamera(myId, dt) {
      const me = this.views.get(myId);
      let wantFov = FOV_BASE;
      if (me && me.alive) {
        const P = V(me.p), F = V(me.f);
        const planeW = P.clone().multiplyScalar(visR + ALT);
        _a.copy(planeW).addScaledVector(F, -CAM_BACK).addScaledVector(P, CAM_UP);
        _b.copy(planeW).addScaledVector(F, CAM_LOOKAHEAD);
        const k = Math.min(1, dt * CAM_LERP);
        camPos.lerp(_a, k); camLook.lerp(_b, k); camUp.lerp(P, Math.min(1, dt * 3)).normalize();
        if (me.boosting) wantFov = FOV_BOOST;
      } else {
        const a = time * 0.08;
        _a.set(Math.cos(a) * visR * 2.4, visR * 1.2, Math.sin(a) * visR * 2.4);
        camPos.lerp(_a, Math.min(1, dt * 1.5)); camLook.lerp(_b.set(0, 0, 0), Math.min(1, dt * 1.5)); camUp.lerp(_c.set(0, 1, 0), Math.min(1, dt * 1.5)).normalize();
      }
      fov += (wantFov - fov) * Math.min(1, dt * 6);
      camera.fov = fov; camera.updateProjectionMatrix();
      camera.up.copy(camUp);
      camera.position.copy(camPos);
      camera.position.addScaledVector(camUp, -ef.dip * 10);
      if (ef.shakeMag > 0.05) {
        camera.position.x += (Math.random() - 0.5) * ef.shakeMag;
        camera.position.y += (Math.random() - 0.5) * ef.shakeMag;
        camera.position.z += (Math.random() - 0.5) * ef.shakeMag;
        ef.shakeMag *= Math.pow(0.0001, dt);
      } else ef.shakeMag = 0;
      camera.lookAt(camLook);
      if (this._planet) { this._planet.scale.setScalar(visR); }
      if (this._atmo) { this._atmo.scale.setScalar(visR * 1.05); }
      if (scene.fog) { scene.fog.near = visR * 2.2; scene.fog.far = visR * 5.5; }
    },
  };

  window.Renderer = R;
})();
