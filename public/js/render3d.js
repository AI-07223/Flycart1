import * as THREE from "three";

(function () {
  const G = window.GAME;
  const Q = window.Quality;
  const SP = window.Sphere;
  const SKINS = [0xff6b6b, 0x49c0ff, 0x8be34a, 0xffd24a, 0xc07bff];

  const tmpVec = new THREE.Vector3();
  const tmpVec2 = new THREE.Vector3();
  const tmpVec3 = new THREE.Vector3();
  const tmpMat = new THREE.Matrix4();

  let scene;
  let camera;
  let renderer;
  let minimap;
  let mmctx;
  let popupLayer;
  let time = 0;
  let hitStop = 0;
  let takeoff = 0;
  let canvasEl;
  let ground;
  let grid;
  let boundary;
  let menuDemo = null;
  let particles = [];

  const camPos = new THREE.Vector3(0, 90, 160);
  const camLook = new THREE.Vector3(0, 30, 0);

  const stateMaps = {
    views: new Map(),
    bullets: new Map(),
    pickups: new Map(),
  };

  const v3 = (p) => new THREE.Vector3(p.x, p.y, p.z);
  const flat = (p) => ({ x: p.x, y: 0, z: p.z });

  function disposeMaterial(material) {
    if (material && typeof material.dispose === "function") material.dispose();
  }

  function disposeObject(obj) {
    if (!obj) return;
    const geometries = new Set();
    const materials = new Set();
    obj.traverse((child) => {
      if (child.geometry) geometries.add(child.geometry);
      if (Array.isArray(child.material)) child.material.forEach((material) => materials.add(material));
      else if (child.material) materials.add(child.material);
    });
    geometries.forEach((geometry) => geometry.dispose && geometry.dispose());
    materials.forEach((material) => disposeMaterial(material));
  }

  function applyQuality() {
    if (!renderer || !Q || !Q.cfg) return;
    const cfg = Q.cfg();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.pixelRatio || 1.25));
    renderer.shadowMap.enabled = cfg.shadows === "map";
  }

  function makePlane(skin) {
    const group = new THREE.Group();
    const color = SKINS[skin % SKINS.length];
    const bodyMat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.65 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x273244, flatShading: true, roughness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x123a5a, flatShading: true, roughness: 0.25, metalness: 0.15 });

    const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(3.6, 18, 4, 8), bodyMat);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.castShadow = true;
    group.add(fuselage);

    const nose = new THREE.Mesh(new THREE.ConeGeometry(3.4, 9, 8), darkMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -13;
    group.add(nose);

    const wings = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 5), bodyMat);
    wings.position.z = 1;
    wings.castShadow = true;
    group.add(wings);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 4), bodyMat);
    tail.position.z = 10;
    group.add(tail);

    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.5, 4), bodyMat);
    fin.position.set(0, 3, 10);
    group.add(fin);

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 8), glassMat);
    canopy.scale.set(1, 0.7, 1.4);
    canopy.position.set(0, 2.5, -2);
    group.add(canopy);

    const prop = new THREE.Mesh(new THREE.BoxGeometry(0.4, 13, 0.6), darkMat);
    prop.position.z = -17;
    group.add(prop);
    group.userData.prop = prop;
    group.scale.setScalar(1.35);
    return group;
  }

  function makeShield() {
    return new THREE.Mesh(
      new THREE.SphereGeometry(24, 14, 12),
      new THREE.MeshBasicMaterial({ color: 0x49c0ff, transparent: true, opacity: 0.14, depthWrite: false })
    );
  }

  function makeBullet(homing) {
    const group = new THREE.Group();
    const color = homing ? 0xc07bff : 0xffd86b;
    const core = new THREE.Mesh(new THREE.SphereGeometry(homing ? 2.6 : 2.2, 10, 10), new THREE.MeshBasicMaterial({ color }));
    const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.15, 11, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }));
    trail.rotation.x = Math.PI / 2;
    trail.position.z = 5;
    group.add(core);
    group.add(trail);
    scene.add(group);
    return group;
  }

  function makePickup(type) {
    const info = G.POWERUPS[type] || { color: 0xffffff };
    const group = new THREE.Group();
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(7, 0),
      new THREE.MeshStandardMaterial({ color: info.color, emissive: info.color, emissiveIntensity: 0.4, flatShading: true, roughness: 0.35 })
    );
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(11, 0.9, 10, 26),
      new THREE.MeshBasicMaterial({ color: info.color, transparent: true, opacity: 0.6 })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(gem);
    group.add(ring);
    group.userData.phase = Math.random() * Math.PI * 2;
    scene.add(group);
    return group;
  }

  function orientPlane(obj, pose, bank) {
    const pos = tmpVec.set(pose.p.x, pose.p.y, pose.p.z);
    const fwd = tmpVec2.set(pose.f.x, pose.f.y, pose.f.z).normalize();
    let right = tmpVec3.crossVectors(fwd, new THREE.Vector3(0, 1, 0));
    if (right.lengthSq() < 1e-6) right = tmpVec3.set(0, 0, 1);
    right.normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    tmpMat.makeBasis(right, up, fwd.clone().multiplyScalar(-1));
    obj.quaternion.setFromRotationMatrix(tmpMat);
    obj.rotation.z += bank;
    obj.position.copy(pos);
  }

  function orientTrail(obj, p, f) {
    const pose = { p, f };
    orientPlane(obj, pose, 0);
  }

  function addParticle(pos, color) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 8, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    mesh.position.copy(pos);
    scene.add(mesh);
    particles.push({
      mesh,
      vel: new THREE.Vector3((Math.random() - 0.5) * 36, Math.random() * 26 + 12, (Math.random() - 0.5) * 36),
      life: 0.5 + Math.random() * 0.35,
      maxLife: 0.85,
    });
  }

  function explodeAt(pos, color) {
    for (let i = 0; i < 14; i++) addParticle(pos, color);
  }

  function worldToScreen(pos) {
    const p = pos.clone().project(camera);
    return {
      x: (p.x * 0.5 + 0.5) * window.innerWidth,
      y: (-p.y * 0.5 + 0.5) * window.innerHeight,
      visible: p.z > -1 && p.z < 1,
    };
  }

  function buildLandmark(landmark) {
    const group = new THREE.Group();
    if (landmark.kind === "tower") {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(18, 28, landmark.height, 12), new THREE.MeshStandardMaterial({ color: landmark.color, flatShading: true, roughness: 0.85 }));
      tower.position.y = landmark.height / 2;
      tower.castShadow = true;
      group.add(tower);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(7, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffe7a8 }));
      beacon.position.y = landmark.height + 6;
      group.add(beacon);
    } else if (landmark.kind === "mesa") {
      const mesa = new THREE.Mesh(new THREE.CylinderGeometry(landmark.radius * 0.72, landmark.radius, landmark.height, 10), new THREE.MeshStandardMaterial({ color: landmark.color, flatShading: true, roughness: 1 }));
      mesa.position.y = landmark.height / 2;
      mesa.castShadow = true;
      group.add(mesa);
    } else if (landmark.kind === "spire") {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(landmark.radius, landmark.height, 8), new THREE.MeshStandardMaterial({ color: landmark.color, flatShading: true, roughness: 0.7 }));
      spire.position.y = landmark.height / 2;
      spire.castShadow = true;
      group.add(spire);
    } else {
      const base = new THREE.Mesh(new THREE.BoxGeometry(landmark.radius * 1.8, landmark.height, landmark.radius * 1.2), new THREE.MeshStandardMaterial({ color: landmark.color, flatShading: true, roughness: 0.95 }));
      base.position.y = landmark.height / 2;
      base.castShadow = true;
      group.add(base);
    }
    group.position.set(landmark.x, 0, landmark.z);
    scene.add(group);
  }

  function clearMenuDemo() {
    if (!menuDemo) return;
    scene.remove(menuDemo);
    disposeObject(menuDemo);
    menuDemo = null;
  }

  const Renderer = {
    init(canvas) {
      canvasEl = canvas;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x8cc8ff);
      scene.fog = new THREE.Fog(0x8cc8ff, 800, 4200);
      camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10000);
      camera.position.copy(camPos);

      const hemi = new THREE.HemisphereLight(0xd9efff, 0x3f4b36, 1.0);
      scene.add(hemi);
      const sun = new THREE.DirectionalLight(0xfff4d6, 1.3);
      sun.position.set(600, 900, 500);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      scene.add(sun);

      ground = new THREE.Mesh(
        new THREE.PlaneGeometry(G.MAP_HALF * 2.5, G.MAP_HALF * 2.5),
        new THREE.MeshStandardMaterial({ color: 0x6aa36f, roughness: 1 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      grid = new THREE.GridHelper(G.MAP_HALF * 2, 36, 0xffffff, 0x4f7a52);
      grid.position.y = 0.2;
      grid.material.opacity = 0.18;
      grid.material.transparent = true;
      scene.add(grid);

      const edgeShape = new THREE.Shape();
      edgeShape.moveTo(-G.MAP_HALF, -G.MAP_HALF);
      edgeShape.lineTo(G.MAP_HALF, -G.MAP_HALF);
      edgeShape.lineTo(G.MAP_HALF, G.MAP_HALF);
      edgeShape.lineTo(-G.MAP_HALF, G.MAP_HALF);
      edgeShape.lineTo(-G.MAP_HALF, -G.MAP_HALF);
      const points = edgeShape.getPoints();
      const borderGeo = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p.x, 1, p.y)));
      boundary = new THREE.Line(borderGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }));
      scene.add(boundary);

      G.LANDMARKS.forEach((landmark) => buildLandmark(landmark));

      minimap = document.createElement("canvas");
      minimap.id = "minimap";
      minimap.width = 140;
      minimap.height = 140;
      (document.getElementById("game-wrap") || document.body).appendChild(minimap);
      mmctx = minimap.getContext("2d");

      popupLayer = document.createElement("div");
      popupLayer.id = "popup-layer";
      (document.getElementById("game-wrap") || document.body).appendChild(popupLayer);

      applyQuality();
      Q && Q.onChange && Q.onChange(() => applyQuality());
      window.addEventListener("resize", () => this.resize());
      this.resize();
    },

    resize() {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    },

    sync(state, dt, myId) {
      const rawDt = Math.min(dt, 0.05);
      const step = hitStop > 0 ? rawDt * 0.15 : rawDt;
      hitStop = Math.max(0, hitStop - rawDt);
      time += step;
      clearMenuDemo();

      const samples = window.Net.sample ? window.Net.sample(performance.now() - 100) : {};
      const local = window.Net.localPose;
      const seen = new Set();

      state.players.forEach((p, id) => {
        seen.add(id);
        let view = stateMaps.views.get(id);
        if (!view) {
          view = { mesh: makePlane(p.skin), shield: null, bank: 0, wasAlive: !!p.alive, pose: null };
          scene.add(view.mesh);
          stateMaps.views.set(id, view);
        }

        const remote = samples[id] || {
          p: { x: p.px, y: p.py, z: p.pz },
          f: { x: p.fx, y: p.fy, z: p.fz },
          alive: !!p.alive,
          speed: p.speed || 0,
          turn: p.turn || 0,
          climb: p.climb || 0,
          seq: p.seq || 0,
        };
        const pose = id === myId && local && local.active ? {
          p: local.p,
          f: local.f,
          alive: local.alive,
          speed: local.speed,
          turn: local.turn,
          climb: local.climb,
          seq: local.seq,
        } : remote;

        if (view.wasAlive && !pose.alive) explodeAt(new THREE.Vector3(pose.p.x, pose.p.y, pose.p.z), SKINS[p.skin % SKINS.length]);
        view.wasAlive = pose.alive;
        view.pose = pose;
        view.bank += ((pose.turn || 0) * -0.65 - view.bank) * Math.min(1, step * 10);
        view.mesh.visible = !!pose.alive;
        if (pose.alive) {
          orientPlane(view.mesh, pose, view.bank);
          const prop = view.mesh.userData.prop;
          if (prop) prop.rotation.z = time * 38;
        }

        if (p.power === "shield" && pose.alive) {
          if (!view.shield) {
            view.shield = makeShield();
            scene.add(view.shield);
          }
          view.shield.visible = true;
          view.shield.position.set(pose.p.x, pose.p.y, pose.p.z);
        } else if (view.shield) {
          view.shield.visible = false;
        }
      });

      for (const [id, view] of stateMaps.views) {
        if (seen.has(id)) continue;
        scene.remove(view.mesh);
        disposeObject(view.mesh);
        if (view.shield) {
          scene.remove(view.shield);
          disposeObject(view.shield);
        }
        stateMaps.views.delete(id);
      }

      const bulletSeen = new Set();
      state.bullets.forEach((b, key) => {
        bulletSeen.add(key);
        let mesh = stateMaps.bullets.get(key);
        const authP = { x: b.px, y: b.py, z: b.pz };
        const authF = { x: b.fx, y: b.fy, z: b.fz };
        if (!mesh) {
          mesh = makeBullet(b.homing);
          mesh.userData.pose = { p: authP, f: authF, ax: b.px, ay: b.py, az: b.pz };
          stateMaps.bullets.set(key, mesh);
        }
        const pose = mesh.userData.pose;
        if (pose.ax === b.px && pose.ay === b.py && pose.az === b.pz) {
          pose.p = SP.advance(pose.p, pose.f, G.BULLET_SPEED * step * 0.45).p;
        } else {
          pose.p = authP;
          pose.ax = b.px;
          pose.ay = b.py;
          pose.az = b.pz;
        }
        pose.f = authF;
        orientTrail(mesh, pose.p, pose.f);
      });
      for (const [key, mesh] of stateMaps.bullets) {
        if (bulletSeen.has(key)) continue;
        scene.remove(mesh);
        disposeObject(mesh);
        stateMaps.bullets.delete(key);
      }

      const pickupSeen = new Set();
      state.pickups.forEach((pk, key) => {
        pickupSeen.add(key);
        let mesh = stateMaps.pickups.get(key);
        if (!mesh) {
          mesh = makePickup(pk.type);
          stateMaps.pickups.set(key, mesh);
        }
        mesh.position.set(pk.px, pk.py + Math.sin(time * 2 + mesh.userData.phase) * 3, pk.pz);
        mesh.rotation.y += step * 1.4;
      });
      for (const [key, mesh] of stateMaps.pickups) {
        if (pickupSeen.has(key)) continue;
        scene.remove(mesh);
        disposeObject(mesh);
        stateMaps.pickups.delete(key);
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const part = particles[i];
        part.life -= rawDt;
        if (part.life <= 0) {
          scene.remove(part.mesh);
          disposeObject(part.mesh);
          particles.splice(i, 1);
          continue;
        }
        part.vel.y -= rawDt * 42;
        part.mesh.position.addScaledVector(part.vel, rawDt);
        part.mesh.material.opacity = Math.max(0, part.life / part.maxLife);
        part.mesh.scale.setScalar(0.6 + (part.life / part.maxLife) * 1.4);
      }
    },

    draw(state, myId) {
      this._updateCamera(myId);
      renderer.render(scene, camera);
      this._drawMinimap(state, myId);
    },

    drawMenu(dt, skin) {
      time += Math.min(dt || 0.016, 0.05);
      for (const [, view] of stateMaps.views) view.mesh.visible = false;
      for (const [, shield] of stateMaps.views) if (shield && shield.shield) shield.shield.visible = false;
      for (const [, bullet] of stateMaps.bullets) bullet.visible = false;
      for (const [, pickup] of stateMaps.pickups) pickup.visible = false;

      if (!menuDemo) {
        menuDemo = makePlane(skin);
        scene.add(menuDemo);
      }
      const radius = 360;
      const angle = time * 0.18;
      const pos = { x: Math.cos(angle) * radius, y: 95 + Math.sin(time * 0.8) * 12, z: Math.sin(angle) * radius };
      const fwd = SP.normalize({ x: -Math.sin(angle), y: Math.cos(time * 0.8) * 0.08, z: Math.cos(angle) });
      orientPlane(menuDemo, { p: pos, f: fwd }, Math.sin(time * 1.3) * 0.22);
      const prop = menuDemo.userData.prop;
      if (prop) prop.rotation.z = time * 38;

      const desired = new THREE.Vector3(pos.x - fwd.x * 110, pos.y + 42, pos.z - fwd.z * 110);
      const look = new THREE.Vector3(pos.x + fwd.x * 140, pos.y + 8, pos.z + fwd.z * 140);
      camPos.lerp(desired, 0.06);
      camLook.lerp(look, 0.08);
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      renderer.render(scene, camera);
      if (mmctx) mmctx.clearRect(0, 0, minimap.width, minimap.height);
    },

    _updateCamera(myId) {
      const view = stateMaps.views.get(myId);
      if (!view || !view.pose || !view.pose.alive) {
        const orbit = time * 0.09;
        camPos.lerp(new THREE.Vector3(Math.cos(orbit) * 520, 220, Math.sin(orbit) * 520), 0.04);
        camLook.lerp(new THREE.Vector3(0, 40, 0), 0.05);
        camera.position.copy(camPos);
        camera.lookAt(camLook);
        return;
      }

      const pose = view.pose;
      const pos = new THREE.Vector3(pose.p.x, pose.p.y, pose.p.z);
      const fwd = new THREE.Vector3(pose.f.x, pose.f.y, pose.f.z).normalize();
      const flatFwd = new THREE.Vector3(fwd.x, 0, fwd.z);
      if (flatFwd.lengthSq() < 1e-6) flatFwd.set(1, 0, 0);
      flatFwd.normalize();
      const desired = pos.clone().addScaledVector(flatFwd, -120).add(new THREE.Vector3(0, 40, 0)).addScaledVector(fwd, -18 * fwd.y);
      const look = pos.clone().addScaledVector(fwd, 130).add(new THREE.Vector3(0, 10, 0));
      const smooth = takeoff > 0 ? 0.03 : 0.09;
      camPos.lerp(desired, smooth);
      camLook.lerp(look, smooth + 0.02);
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      takeoff = Math.max(0, takeoff - 0.016);
    },

    _drawMinimap(state, myId) {
      if (!mmctx) return;
      const w = minimap.width;
      const h = minimap.height;
      const pad = 10;
      mmctx.clearRect(0, 0, w, h);
      mmctx.fillStyle = "rgba(10, 18, 34, 0.72)";
      mmctx.fillRect(0, 0, w, h);
      mmctx.strokeStyle = "rgba(255,255,255,0.18)";
      mmctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

      const me = state.players.get(myId);
      const myPose = window.Net.localPose && window.Net.localPose.active ? window.Net.localPose : me ? { p: { x: me.px, y: me.py, z: me.pz }, f: { x: me.fx, y: me.fy, z: me.fz } } : null;
      const toMapX = (x) => pad + ((x + G.MAP_HALF) / (G.MAP_HALF * 2)) * (w - pad * 2);
      const toMapY = (z) => pad + ((z + G.MAP_HALF) / (G.MAP_HALF * 2)) * (h - pad * 2);

      G.LANDMARKS.forEach((landmark) => {
        mmctx.fillStyle = landmark.kind === "tower" ? "#f9a25c" : "rgba(255,255,255,0.26)";
        const r = Math.max(2, landmark.radius / (G.MAP_HALF * 2) * (w - pad * 2));
        mmctx.beginPath();
        mmctx.arc(toMapX(landmark.x), toMapY(landmark.z), r, 0, Math.PI * 2);
        mmctx.fill();
      });

      state.pickups.forEach((pk) => {
        mmctx.fillStyle = "#6bff8b";
        mmctx.fillRect(toMapX(pk.px) - 2, toMapY(pk.pz) - 2, 4, 4);
      });

      state.players.forEach((p, id) => {
        if (!p.alive) return;
        const altDelta = myPose ? p.py - myPose.p.y : 0;
        const x = toMapX(p.px);
        const y = toMapY(p.pz);
        if (id === myId && myPose) {
          const f = SP.normalize(flat(myPose.f));
          mmctx.fillStyle = "#ffffff";
          mmctx.beginPath();
          mmctx.moveTo(x + f.x * 5, y + f.z * 5);
          mmctx.lineTo(x - f.z * 4, y + f.x * 4);
          mmctx.lineTo(x + f.z * 4, y - f.x * 4);
          mmctx.closePath();
          mmctx.fill();
          return;
        }
        mmctx.fillStyle = altDelta > 24 ? "#ffb86b" : altDelta < -24 ? "#59c0ff" : (p.bot ? "#ff8a8a" : "#ff5f5f");
        mmctx.beginPath();
        mmctx.arc(x, y, 3, 0, Math.PI * 2);
        mmctx.fill();
      });
    },

    killPopup(killerId, mine) {
      if (!popupLayer) return;
      const view = stateMaps.views.get(killerId);
      if (!view || !view.mesh || !view.mesh.visible) return;
      const screen = worldToScreen(view.mesh.position);
      if (!screen.visible) return;
      const div = document.createElement("div");
      div.className = "popup3d" + (mine ? " mine" : "");
      div.textContent = mine ? "+1" : "HIT";
      div.style.left = `${screen.x}px`;
      div.style.top = `${screen.y}px`;
      popupLayer.appendChild(div);
      requestAnimationFrame(() => div.classList.add("go"));
      setTimeout(() => div.remove(), 1100);
    },

    hitStop(ms) {
      hitStop = Math.max(hitStop, ms / 1000);
    },

    startTakeoff() {
      takeoff = 0.6;
    },

    __debug() {
      const info = renderer && renderer.info ? renderer.info : null;
      const memory = info ? info.memory : null;
      return {
        views: stateMaps.views.size,
        bullets: stateMaps.bullets.size,
        pickups: stateMaps.pickups.size,
        particles: particles.length,
        geometries: memory ? memory.geometries : 0,
        textures: memory ? memory.textures : 0,
        programs: renderer && renderer.info && renderer.info.programs ? renderer.info.programs.length : 0,
      };
    },

    setMenuSection() {},
    showMenu() {},
    hideMenu() {},
  };

  window.Renderer = Renderer;
})();