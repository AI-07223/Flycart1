import * as THREE from "three";

(function () {
  const G = window.GAME;
  const Q = window.Quality;
  const SP = window.Sphere;
  const COLORS = [
    0xff6b6b, 0x49c0ff, 0x8be34a, 0xffd24a, 0xc07bff, 0xff9f43,
    0x00d2d3, 0xffeaa7, 0xdfe6e9, 0x2d3436, 0xe17055, 0x55efc4,
  ];
  const ACCENT_COLORS = [0x273244, 0xffffff, 0x000000, 0xffd24a, 0xff6b6b, 0x49c0ff, 0x8be34a];
  const TRAIL_COLORS = [0xffffff, 0xff9f43, 0x49c0ff, 0xc07bff, 0x8be34a];
  console.assert(COLORS.length === 12 && ACCENT_COLORS.length === 7 && TRAIL_COLORS.length === 5, "cosmetics array length mismatch");

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
  let nameLabelsLayer;
  // Pooled Map<sessionId, HTMLDivElement> for player name labels
  const nameLabelPool = new Map();
  // Single reticle div for the local-player lead indicator
  let leadReticle = null;
  let time = 0;
  let hitStop = 0;
  let takeoff = 0;
  let canvasEl;
  let ground;
  let grid;
  let boundary;
  let landscapeRoot;
  let groundTexture = null;
  let skyDome = null;
  let cloudSprites = [];
  let menuDemo = null;
  let sceneMode = "preflight";
  let particles = [];
  // Hangar turntable (customize mode): fixed stage point the demo plane hovers/spins at,
  // and a soft ground disc reused across rebuilds. stageBlend eases the cut when entering
  // customize from the preflight orbit so the camera doesn't snap.
  let stageShadow = null;
  let stageBlend = 0;
  const STAGE_POS = { x: 0, y: 92, z: -40 };
  // 3/4 hero angle ~27u out: close enough that the plane fills ~35-40% of frame width,
  // offset up+right so we look slightly down at it; look target sits a touch below the
  // plane so it lands in the upper-middle of the frame (~40% from top), clear of the
  // bottom-42% customize sheet.
  const STAGE_CAM_POS = new THREE.Vector3(STAGE_POS.x + 14.9, STAGE_POS.y + 11.4, STAGE_POS.z + 19.5);
  const STAGE_CAM_LOOK = new THREE.Vector3(STAGE_POS.x, STAGE_POS.y - 5, STAGE_POS.z);

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

  // ---- Shared geometries for plane detailing (module-level, reused across every plane instance) ----
  const canopyGeo = new THREE.SphereGeometry(2.6, 10, 8);
  const cowlGeo = new THREE.CylinderGeometry(2.2, 3.0, 4.5, 8);
  const intakeGeo = new THREE.TorusGeometry(2.0, 0.45, 6, 12);
  const propDiscGeo = new THREE.CircleGeometry(7.5, 16);
  const propBladeGeo = new THREE.BoxGeometry(0.4, 13, 0.6);
  const nozzleGeo = new THREE.CylinderGeometry(1.6, 2.1, 3.2, 8);
  const nozzleGlowGeo = new THREE.CircleGeometry(1.7, 10);
  const wingtipGeo = new THREE.ConeGeometry(0.9, 4, 6);
  const wingtipFinGeo = new THREE.BoxGeometry(0.6, 3.2, 2.6);
  const boostFlameGeo = new THREE.ConeGeometry(2.4, 9, 8);

  // makePlane(cosmetic): accepts {color,bodyShape,accent,trail,livery}
  // or a bare number (backward compat: treated as {color:n, ...defaults})
  function makePlane(cosmetic) {
    if (typeof cosmetic === "number") {
      cosmetic = { color: cosmetic, bodyShape: 0, accent: 0, trail: 0, livery: 0 };
    }
    const { color = 0, bodyShape = 0, accent = 0, trail = 0, livery = 0 } = cosmetic;

    const primaryHex = COLORS[color % 12];
    const accentHex = ACCENT_COLORS[accent % 7];
    const trailHex = TRAIL_COLORS[trail % 5];

    const bodyMat = new THREE.MeshStandardMaterial({ color: primaryHex, flatShading: true, roughness: 0.65 });
    const accentMat = new THREE.MeshStandardMaterial({ color: accentHex, flatShading: true, roughness: 0.65 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x273244, flatShading: true, roughness: 0.8 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x123a5a, flatShading: true, roughness: 0.25, metalness: 0.15 });

    const group = new THREE.Group();

    // ---- Body shapes ----
    let fuselage, wings, wingsUpper, wingsLower, tail, fin, noseMesh;

    if (bodyShape === 1) {
      // Interceptor: slim capsule, narrow swept wings, cone nose
      fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(2.8, 22, 4, 8), bodyMat);
      fuselage.name = "fuselage";
      fuselage.rotation.x = Math.PI / 2;
      fuselage.castShadow = true;
      group.add(fuselage);

      noseMesh = new THREE.Mesh(new THREE.ConeGeometry(2.8, 12, 8), darkMat);
      noseMesh.rotation.x = Math.PI / 2;
      noseMesh.position.z = -16;
      group.add(noseMesh);

      wings = new THREE.Mesh(new THREE.BoxGeometry(20, 1.0, 4), bodyMat);
      wings.name = "wings";
      wings.rotation.y = (5 * Math.PI) / 180;
      wings.position.z = 1;
      wings.castShadow = true;
      group.add(wings);

      // Swept-back needle wingtips
      for (const sx of [10, -10]) {
        const tip = new THREE.Mesh(wingtipGeo, darkMat);
        tip.rotation.z = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
        tip.position.set(sx, 0, 3.4);
        group.add(tip);
      }

      tail = new THREE.Mesh(new THREE.BoxGeometry(8, 1, 3.5), bodyMat);
      tail.name = "tail";
      tail.position.z = 12;
      group.add(tail);

      fin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 5.0, 3.5), bodyMat);
      fin.name = "fin";
      fin.position.set(0, 3, 12);
      group.add(fin);

    } else if (bodyShape === 2) {
      // Bomber: chunky capsule, wide wings, two nacelles
      fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(5.0, 16, 4, 8), bodyMat);
      fuselage.name = "fuselage";
      fuselage.rotation.x = Math.PI / 2;
      fuselage.castShadow = true;
      group.add(fuselage);

      noseMesh = new THREE.Mesh(new THREE.ConeGeometry(3.4, 9, 8), darkMat);
      noseMesh.rotation.x = Math.PI / 2;
      noseMesh.position.z = -13;
      group.add(noseMesh);

      wings = new THREE.Mesh(new THREE.BoxGeometry(30, 2.0, 7), bodyMat);
      wings.name = "wings";
      wings.position.z = 1;
      wings.castShadow = true;
      group.add(wings);

      // Nacelles under wings at x=±8
      const nacelleGeo = new THREE.CylinderGeometry(1.4, 1.4, 6, 8);
      const nacelle1 = new THREE.Mesh(nacelleGeo, darkMat);
      nacelle1.rotation.x = Math.PI / 2;
      nacelle1.position.set(8, -2, 1);
      nacelle1.castShadow = true;
      group.add(nacelle1);
      const nacelle2 = new THREE.Mesh(nacelleGeo, darkMat);
      nacelle2.rotation.x = Math.PI / 2;
      nacelle2.position.set(-8, -2, 1);
      nacelle2.castShadow = true;
      group.add(nacelle2);

      // Blunt boxy wingtips (chunky bomber silhouette)
      for (const sx of [15, -15]) {
        const tip = new THREE.Mesh(wingtipFinGeo, darkMat);
        tip.position.set(sx, 0.5, 1);
        group.add(tip);
      }

      tail = new THREE.Mesh(new THREE.BoxGeometry(12, 1.5, 5), bodyMat);
      tail.name = "tail";
      tail.position.z = 10;
      group.add(tail);

      fin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.5, 5), bodyMat);
      fin.name = "fin";
      fin.position.set(0, 4, 10);
      group.add(fin);

    } else if (bodyShape === 3) {
      // Biplane: fuselage capsule, two wing pairs, four strut cylinders
      fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(3.6, 18, 4, 8), bodyMat);
      fuselage.name = "fuselage";
      fuselage.rotation.x = Math.PI / 2;
      fuselage.castShadow = true;
      group.add(fuselage);

      noseMesh = new THREE.Mesh(new THREE.ConeGeometry(3.4, 9, 8), darkMat);
      noseMesh.rotation.x = Math.PI / 2;
      noseMesh.position.z = -13;
      group.add(noseMesh);

      // Upper wing pair
      wingsUpper = new THREE.Mesh(new THREE.BoxGeometry(24, 1.0, 4.5), bodyMat);
      wingsUpper.name = "wings_upper";
      wingsUpper.position.set(0, 3, 1);
      wingsUpper.castShadow = true;
      group.add(wingsUpper);

      // Lower wing pair
      wingsLower = new THREE.Mesh(new THREE.BoxGeometry(22, 1.0, 4), bodyMat);
      wingsLower.name = "wings_lower";
      wingsLower.position.set(0, -3, 1);
      wingsLower.castShadow = true;
      group.add(wingsLower);

      // Four thin strut cylinders at x=±6
      const strutGeo = new THREE.CylinderGeometry(0.4, 0.4, 6, 5);
      const strutMat = darkMat;
      for (const sx of [6, -6]) {
        const s1 = new THREE.Mesh(strutGeo, strutMat);
        s1.position.set(sx, 0, 0);
        group.add(s1);
        const s2 = new THREE.Mesh(strutGeo, strutMat);
        s2.position.set(sx, 0, 3);
        group.add(s2);
      }

      // Rounded wingtip caps on the upper wing pair
      for (const sx of [12, -12]) {
        const tip = new THREE.Mesh(wingtipGeo, darkMat);
        tip.rotation.z = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
        tip.position.set(sx, 3, 1);
        group.add(tip);
      }

      tail = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 4), bodyMat);
      tail.name = "tail";
      tail.position.z = 10;
      group.add(tail);

      fin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.5, 4), bodyMat);
      fin.name = "fin";
      fin.position.set(0, 3, 10);
      group.add(fin);

    } else {
      // bodyShape === 0: Fighter (original default geometry)
      fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(3.6, 18, 4, 8), bodyMat);
      fuselage.name = "fuselage";
      fuselage.rotation.x = Math.PI / 2;
      fuselage.castShadow = true;
      group.add(fuselage);

      noseMesh = new THREE.Mesh(new THREE.ConeGeometry(3.4, 9, 8), darkMat);
      noseMesh.rotation.x = Math.PI / 2;
      noseMesh.position.z = -13;
      group.add(noseMesh);

      wings = new THREE.Mesh(new THREE.BoxGeometry(24, 1.2, 5), bodyMat);
      wings.name = "wings";
      wings.position.z = 1;
      wings.castShadow = true;
      group.add(wings);

      // Swept wingtip fins (fighter silhouette)
      for (const sx of [12, -12]) {
        const tip = new THREE.Mesh(wingtipFinGeo, darkMat);
        tip.position.set(sx, 0.6, 2);
        group.add(tip);
      }

      tail = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 4), bodyMat);
      tail.name = "tail";
      tail.position.z = 10;
      group.add(tail);

      fin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.5, 4), bodyMat);
      fin.name = "fin";
      fin.position.set(0, 3, 10);
      group.add(fin);
    }

    // ---- Shared parts: tinted canopy bubble, engine cowl/intake ----
    const canopy = new THREE.Mesh(canopyGeo, glassMat);
    canopy.scale.set(1, 0.7, 1.4);
    canopy.position.set(0, 2.5, -2);
    group.add(canopy);

    // Engine cowl: a stubby cylinder hugging the nose, plus an intake ring —
    // reads as "chunky toy engine" up close, cheap at a distance.
    const cowl = new THREE.Mesh(cowlGeo, darkMat);
    cowl.rotation.x = Math.PI / 2;
    cowl.position.z = -9;
    group.add(cowl);
    const intake = new THREE.Mesh(intakeGeo, darkMat);
    intake.position.z = -11;
    group.add(intake);

    // ---- Nose accessory: spinning prop disc (biplane/fighter) or jet nozzle glow (interceptor/bomber) ----
    const usesProp = bodyShape === 0 || bodyShape === 3;
    let prop = null;
    let nozzleGlow = null;
    if (usesProp) {
      // Two thin blades (cross) that spin fast, plus a translucent disc that
      // fades in as spin speed increases (drawn additively so it reads as a blur, not a solid wall).
      prop = new THREE.Group();
      const bladeA = new THREE.Mesh(propBladeGeo, darkMat);
      const bladeB = new THREE.Mesh(propBladeGeo, darkMat);
      bladeB.rotation.z = Math.PI / 2;
      prop.add(bladeA, bladeB);
      const discMat = new THREE.MeshBasicMaterial({ color: 0x1a1f26, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const disc = new THREE.Mesh(propDiscGeo, discMat);
      prop.add(disc);
      prop.userData.disc = disc;
      prop.position.z = -17;
      group.add(prop);
      group.userData.prop = prop;
    } else {
      // Jet nozzle: dark cone stub + pulsing additive glow disc at the tail end.
      const nozzle = new THREE.Mesh(nozzleGeo, darkMat);
      nozzle.rotation.x = Math.PI / 2;
      const nozzleZ = bodyShape === 1 ? 15.5 : 13.5;
      nozzle.position.z = nozzleZ;
      group.add(nozzle);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xff9f43, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
      nozzleGlow = new THREE.Mesh(nozzleGlowGeo, glowMat);
      nozzleGlow.position.z = nozzleZ + 1.7;
      nozzleGlow.rotation.x = Math.PI / 2;
      group.add(nozzleGlow);
      group.userData.nozzleGlow = nozzleGlow;
    }

    // ---- Livery: assign bodyMat / accentMat to named parts + overlays ----
    // Collect the wing mesh(es) for livery use
    const wingMeshes = [];
    if (wings) wingMeshes.push(wings);
    if (wingsUpper) wingMeshes.push(wingsUpper);
    if (wingsLower) wingMeshes.push(wingsLower);

    if (livery === 0) {
      // Clean: fuselage=primary, wings=accent (two-tone default)
      // fuselage already has bodyMat
      wingMeshes.forEach((m) => (m.material = accentMat));
      // tail and fin keep bodyMat
    } else if (livery === 1) {
      // Stripe: all primary + thin accent stripe box along top of fuselage
      // Leave everything as bodyMat (already set)
      const stripeBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 1.2, 16),
        accentMat
      );
      stripeBox.name = "livery_stripe";
      stripeBox.position.set(0, 3.8, 0);
      group.add(stripeBox);
    } else if (livery === 2) {
      // Two-Tone: wings+tail+fin=accent, fuselage=primary
      wingMeshes.forEach((m) => (m.material = accentMat));
      if (tail) tail.material = accentMat;
      if (fin) fin.material = accentMat;
    } else if (livery === 3) {
      // Camo: fuselage=primary + 3 small accent patch boxes along it
      const patchPositions = [-5, 0, 6];
      patchPositions.forEach((pz) => {
        const patch = new THREE.Mesh(
          new THREE.BoxGeometry(3.5, 3.5, 3.5),
          accentMat
        );
        patch.name = "livery_camo_patch";
        patch.position.set((Math.random() - 0.5) * 2, 2.5, pz);
        group.add(patch);
      });
    }

    // ---- Exhaust cone at rear ----
    const exhaustMat = new THREE.MeshBasicMaterial({
      color: trailHex,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const exhaust = new THREE.Mesh(new THREE.ConeGeometry(1.8, 5, 8), exhaustMat);
    exhaust.rotation.x = -Math.PI / 2; // point backward (+Z direction)
    // Position at the rear of the fuselage; adjust slightly per shape
    const exhaustZ = bodyShape === 1 ? 14 : bodyShape === 2 ? 12 : 12;
    exhaust.position.set(0, 0, exhaustZ);
    exhaust.name = "exhaust";
    group.add(exhaust);
    group.userData.exhaust = exhaust;

    group.userData.currentBodyShape = bodyShape;
    group.scale.setScalar(1.35);
    return group;
  }

  function makeShield() {
    return new THREE.Mesh(
      new THREE.SphereGeometry(24, 14, 12),
      new THREE.MeshBasicMaterial({ color: 0x49c0ff, transparent: true, opacity: 0.14, depthWrite: false })
    );
  }

  // ---- Shared geometries/materials for new powerup visuals (module-level, reused every frame) ----
  const starAuraGeo = new THREE.SphereGeometry(26, 12, 10);
  const freezeOverlayGeo = new THREE.SphereGeometry(21, 10, 8);
  const empRingGeo = new THREE.TorusGeometry(22, 1.6, 8, 24);
  const mineBodyGeo = new THREE.SphereGeometry(6, 8, 8);
  const mineSpikeGeo = new THREE.ConeGeometry(1.4, 5, 6);
  const mineBlinkGeo = new THREE.SphereGeometry(2.2, 6, 6);

  function makeStarAura() {
    return new THREE.Mesh(
      starAuraGeo,
      new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending })
    );
  }

  function makeFreezeOverlay() {
    return new THREE.Mesh(
      freezeOverlayGeo,
      new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.35, depthWrite: false })
    );
  }

  function makeEmpRing() {
    const ring = new THREE.Mesh(
      empRingGeo,
      new THREE.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, opacity: 0.55, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    return ring;
  }

  function makeMine() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x232b33, roughness: 0.6, metalness: 0.3 });
    const body = new THREE.Mesh(mineBodyGeo, bodyMat);
    group.add(body);
    for (let i = 0; i < 4; i++) {
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0x2c343d, roughness: 0.6, metalness: 0.3 });
      const spike = new THREE.Mesh(mineSpikeGeo, spikeMat);
      const a = (i / 4) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 5.5, Math.sin(a) * 5.5, 0);
      spike.rotation.z = a + Math.PI / 2;
      group.add(spike);
    }
    const blinkMat = new THREE.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 1 });
    const blink = new THREE.Mesh(mineBlinkGeo, blinkMat);
    blink.position.set(0, 0, 6.2);
    group.add(blink);
    group.userData.blinkMat = blinkMat;
    group.userData.phase = Math.random() * Math.PI * 2;
    scene.add(group);
    return group;
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

  // animatePlaneNose(mesh, speedRatio): spins the prop disc (fading in as a blur at
  // speed) or pulses the jet nozzle glow. speedRatio is 0..1-ish (current/boost speed).
  function animatePlaneNose(mesh, speedRatio) {
    const prop = mesh.userData.prop;
    if (prop) {
      prop.rotation.z = time * 38;
      const disc = prop.userData.disc;
      if (disc) disc.material.opacity = Math.min(0.5, 0.15 + speedRatio * 0.35);
    }
    const glow = mesh.userData.nozzleGlow;
    if (glow) {
      const pulse = 0.55 + 0.25 * Math.sin(time * 16) + speedRatio * 0.3;
      glow.material.opacity = Math.min(1, Math.max(0.25, pulse));
      glow.scale.setScalar(0.8 + speedRatio * 0.9);
    }
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
    orientPlane(obj, { p, f }, 0);
  }

  // Shared geo for confetti-shaped particles (small flat chip — cheap, distinct from spark spheres)
  const confettiGeo = new THREE.BoxGeometry(1.6, 1.6, 0.3);
  const sparkParticleGeo = new THREE.SphereGeometry(1.2, 8, 8);
  const CONFETTI_COLORS = [0xffd700, 0xff6b6b, 0x49c0ff, 0x8be34a, 0xffffff, 0xc07bff];

  // addParticle(pos, color, opts?): opts lets callers tune spread/gravity/life/shape
  // without duplicating this whole function (used by explosions, hit sparks, confetti).
  function addParticle(pos, color, opts) {
    const o = opts || {};
    const geo = o.shape === "confetti" ? confettiGeo : sparkParticleGeo;
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    mesh.position.copy(pos);
    scene.add(mesh);
    const spread = o.spread != null ? o.spread : 36;
    const upMin = o.upMin != null ? o.upMin : 12;
    const upSpread = o.upSpread != null ? o.upSpread : 26;
    particles.push({
      mesh,
      vel: new THREE.Vector3((Math.random() - 0.5) * spread, Math.random() * upSpread + upMin, (Math.random() - 0.5) * spread),
      life: o.life != null ? o.life : 0.5 + Math.random() * 0.35,
      maxLife: o.maxLife != null ? o.maxLife : 0.85,
      gravity: o.gravity != null ? o.gravity : 42,
      spin: o.shape === "confetti" ? (Math.random() - 0.5) * 10 : 0,
    });
  }

  function explodeAt(pos, color, count) {
    const n = count || 14;
    for (let i = 0; i < n; i++) addParticle(pos, color);
    if (Q && Q.current !== "low") addShockwave(pos, color);
  }

  // ---- Shockwave rings: expanding additive torus that fades, layered under explosion particles ----
  let shockwaves = [];
  const shockwaveGeo = new THREE.RingGeometry(0.85, 1, 20);

  function addShockwave(pos, color) {
    const mesh = new THREE.Mesh(
      shockwaveGeo,
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(pos);
    mesh.position.y += 1;
    mesh.scale.setScalar(2);
    scene.add(mesh);
    shockwaves.push({ mesh, life: 0.5, maxLife: 0.5 });
  }

  // ---- Muzzle flash: brief additive cone at a plane's nose when it fires ----
  let muzzleFlashes = [];
  const muzzleFlashGeo = new THREE.ConeGeometry(1.6, 6, 8);

  function addMuzzleFlash(planeMesh, color) {
    const mesh = new THREE.Mesh(
      muzzleFlashGeo,
      new THREE.MeshBasicMaterial({ color: color || 0xffe27a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(0, 0, -20.5);
    planeMesh.add(mesh);
    muzzleFlashes.push({ mesh, life: 0.09, maxLife: 0.09 });
  }

  // ---- Kill celebration: short confetti/star burst from the killer's tail (SmashKarts-style) ----
  function celebrate(planeMesh) {
    if (!planeMesh || !planeMesh.visible) return;
    const tailLocal = new THREE.Vector3(0, 0, 18);
    const tailWorld = planeMesh.localToWorld(tailLocal.clone());
    const n = 16;
    for (let i = 0; i < n; i++) {
      const color = CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0];
      addParticle(tailWorld, color, {
        shape: "confetti",
        spread: 50,
        upMin: 20,
        upSpread: 34,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        gravity: 30,
      });
    }
  }

  function worldToScreen(pos) {
    const p = pos.clone().project(camera);
    return {
      x: (p.x * 0.5 + 0.5) * window.innerWidth,
      y: (-p.y * 0.5 + 0.5) * window.innerHeight,
      visible: p.z > -1 && p.z < 1,
    };
  }

  function makeGroundTile(width, depth, color, y, x, z, rotY = 0, opacity = 1) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshStandardMaterial({ color, roughness: 1, transparent: opacity < 0.999, opacity })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.y = rotY;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    return mesh;
  }

  function addStrip(parent, x1, z1, x2, z2, width, color, y, opacity = 1) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.max(1, Math.hypot(dx, dz));
    const mesh = makeGroundTile(width, length, color, y, (x1 + x2) / 2, (z1 + z2) / 2, Math.atan2(dx, dz), opacity);
    parent.add(mesh);
    return mesh;
  }

  function addPlaced(parent, object, x, y, z, rotY = 0) {
    object.position.set(x, y, z);
    object.rotation.y = rotY;
    parent.add(object);
    return object;
  }

  function makeRockField(count, spread, color, scale = 1) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.98 });
    for (let i = 0; i < count; i++) {
      const radius = (9 + (i % 4) * 4) * scale;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(radius, 0), mat);
      const angle = (i / Math.max(1, count)) * Math.PI * 2 + (i % 2) * 0.33;
      const dist = spread * (0.28 + ((i * 37) % 100) / 100 * 0.72);
      rock.position.set(Math.cos(angle) * dist, radius * 0.72, Math.sin(angle) * dist);
      rock.rotation.set(i * 0.31, i * 0.44, i * 0.18);
      rock.castShadow = true;
      rock.receiveShadow = true;
      group.add(rock);
    }
    return group;
  }

  function makeScrubField(count, spread, color = 0x56794a, scale = 1) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 });
    for (let i = 0; i < count; i++) {
      const bush = new THREE.Mesh(new THREE.ConeGeometry((5 + (i % 3) * 2) * scale, (14 + (i % 4) * 3) * scale, 5), mat);
      const angle = (i / Math.max(1, count)) * Math.PI * 2 + i * 0.17;
      const dist = spread * (0.25 + ((i * 19) % 100) / 100 * 0.75);
      bush.position.set(Math.cos(angle) * dist, bush.geometry.parameters.height * 0.45, Math.sin(angle) * dist);
      bush.rotation.y = angle * 0.7;
      bush.castShadow = true;
      bush.receiveShadow = true;
      group.add(bush);
    }
    return group;
  }

  function makeOutpost(scale = 1) {
    const group = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0x6e7882, flatShading: true, roughness: 0.9 });
    const roof = new THREE.MeshStandardMaterial({ color: 0x404852, flatShading: true, roughness: 0.86 });
    const accent = new THREE.MeshStandardMaterial({ color: 0xffd36e, emissive: 0x624314, flatShading: true, roughness: 0.5 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(64 * scale, 18 * scale, 42 * scale), steel);
    base.position.y = 9 * scale;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(74 * scale, 4 * scale, 50 * scale), roof);
    canopy.position.y = 21 * scale;
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    group.add(canopy);

    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(4 * scale, 5 * scale, 18 * scale, 6), accent);
    beacon.position.set(24 * scale, 30 * scale, -12 * scale);
    beacon.castShadow = true;
    group.add(beacon);

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(16 * scale, 19 * scale, 3 * scale, 10), steel);
    pad.position.set(-32 * scale, 1.6 * scale, 0);
    pad.receiveShadow = true;
    group.add(pad);

    return group;
  }

  function buildLandmark(landmark, parent) {
    const group = new THREE.Group();
    const apron = new THREE.Mesh(
      new THREE.CylinderGeometry(landmark.radius * 1.08, landmark.radius * 1.22, 8, 18),
      new THREE.MeshStandardMaterial({ color: landmark.kind === "hangar" ? 0x66707a : 0x7b6a55, flatShading: true, roughness: 0.96 })
    );
    apron.position.y = 4;
    apron.receiveShadow = true;
    group.add(apron);

    if (landmark.kind === "tower") {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(18, 28, landmark.height, 12), new THREE.MeshStandardMaterial({ color: landmark.color, flatShading: true, roughness: 0.85 }));
      tower.position.y = landmark.height / 2;
      tower.castShadow = true;
      tower.receiveShadow = true;
      group.add(tower);

      // Slim emissive cap segment near the top — reads as a lit tower deck at a distance
      const towerCap = new THREE.Mesh(
        new THREE.CylinderGeometry(19, 19.6, landmark.height * 0.06, 12),
        new THREE.MeshStandardMaterial({ color: 0xffe7a8, emissive: 0xaa7a2a, emissiveIntensity: 0.55, flatShading: true, roughness: 0.6 })
      );
      towerCap.position.y = landmark.height * 0.92;
      group.add(towerCap);

      const collar = new THREE.Mesh(new THREE.TorusGeometry(36, 4, 8, 24), new THREE.MeshStandardMaterial({ color: 0x3e4650, flatShading: true, roughness: 0.9 }));
      collar.rotation.x = Math.PI / 2;
      collar.position.y = landmark.height * 0.58;
      group.add(collar);

      for (let i = 0; i < 4; i++) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(6, landmark.height * 0.55, 6), new THREE.MeshStandardMaterial({ color: 0x5b4a3f, flatShading: true, roughness: 0.95 }));
        const angle = (i / 4) * Math.PI * 2;
        brace.position.set(Math.cos(angle) * 34, landmark.height * 0.28, Math.sin(angle) * 34);
        brace.rotation.z = Math.cos(angle) * 0.18;
        brace.rotation.x = Math.sin(angle) * 0.12;
        brace.castShadow = true;
        group.add(brace);
      }

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(7, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffe7a8 }));
      beacon.position.y = landmark.height + 6;
      group.add(beacon);
    } else if (landmark.kind === "mesa") {
      // Warm the mesa body slightly toward terracotta/ochre for a sun-baked look
      const mesaColor = new THREE.Color(landmark.color).lerp(new THREE.Color(0xc97a4a), 0.22).getHex();
      const mesa = new THREE.Mesh(new THREE.CylinderGeometry(landmark.radius * 0.72, landmark.radius, landmark.height, 10), new THREE.MeshStandardMaterial({ color: mesaColor, flatShading: true, roughness: 1 }));
      mesa.position.y = landmark.height / 2;
      mesa.castShadow = true;
      mesa.receiveShadow = true;
      group.add(mesa);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(landmark.radius * 0.68, landmark.radius * 0.74, 8, 10), new THREE.MeshStandardMaterial({ color: 0xdcb37e, flatShading: true, roughness: 0.92 }));
      cap.position.y = landmark.height + 4;
      cap.receiveShadow = true;
      group.add(cap);

      group.add(makeRockField(8, landmark.radius * 0.9, 0x8c6f51, 0.9));
    } else if (landmark.kind === "spire") {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(landmark.radius, landmark.height, 8), new THREE.MeshStandardMaterial({ color: landmark.color, flatShading: true, roughness: 0.7 }));
      spire.position.y = landmark.height / 2;
      spire.castShadow = true;
      spire.receiveShadow = true;
      group.add(spire);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(landmark.radius * 0.7, 2.4, 8, 24), new THREE.MeshStandardMaterial({ color: 0x375f87, flatShading: true, roughness: 0.82 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = landmark.height * 0.42;
      group.add(ring);

      const beacon = new THREE.Mesh(new THREE.SphereGeometry(4.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xcde6ff }));
      beacon.position.y = landmark.height + 3;
      group.add(beacon);
    } else {
      const base = new THREE.Mesh(new THREE.BoxGeometry(landmark.radius * 1.8, landmark.height, landmark.radius * 1.2), new THREE.MeshStandardMaterial({ color: landmark.color, flatShading: true, roughness: 0.95 }));
      base.position.y = landmark.height / 2;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(landmark.radius * 1.95, 4, landmark.radius * 1.32), new THREE.MeshStandardMaterial({ color: 0x424851, flatShading: true, roughness: 0.86 }));
      roof.position.y = landmark.height + 2;
      roof.castShadow = true;
      group.add(roof);

      addPlaced(group, makeOutpost(0.42), landmark.radius * 0.85, 0, -landmark.radius * 0.25, 0.4);
      addPlaced(group, makeOutpost(0.34), -landmark.radius * 0.95, 0, landmark.radius * 0.2, -0.2);
    }

    group.position.set(landmark.x, 0, landmark.z);
    parent.add(group);
  }

  // ---- Procedural canvas textures: ground checker/grid fade + sky gradient ----
  // Generated once at init and reused (no per-frame allocation, no external files).
  function makeGroundTexture() {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    // Base two-tone subtle checker
    const cell = size / 16;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const dark = (x + y) % 2 === 0;
        ctx.fillStyle = dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    // Soft radial fade from center (bright) to edge (slightly darker), matches arena scale
    const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.62);
    grad.addColorStop(0, "rgba(255,255,255,0.06)");
    grad.addColorStop(1, "rgba(0,0,0,0.10)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 1);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeSkyTexture(topHex, bottomHex) {
    const w = 2;
    const h = 256;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    const top = new THREE.Color(topHex);
    const bottom = new THREE.Color(bottomHex);
    grad.addColorStop(0, `#${top.getHexString()}`);
    grad.addColorStop(1, `#${bottom.getHexString()}`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Low, flat hill/dune silhouettes ringing the map edge — cheap fog-friendly backdrop.
  function makeHillRing(mapHalf) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x5f7a63, flatShading: true, roughness: 1, fog: true });
    const hillGeo = new THREE.ConeGeometry(1, 1, 7); // unit cone, scaled per-hill
    const count = 22;
    const ringR = mapHalf * 1.55;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (i % 2) * 0.12;
      const w = 220 + (i % 5) * 60;
      const hgt = 90 + (i % 4) * 46;
      const hill = new THREE.Mesh(hillGeo, mat);
      hill.scale.set(w, hgt, w);
      hill.position.set(Math.cos(a) * ringR, hgt * 0.5 - 30, Math.sin(a) * ringR);
      group.add(hill);
    }
    return group;
  }

  function buildLandscape() {
    if (landscapeRoot) {
      scene.remove(landscapeRoot);
      disposeObject(landscapeRoot);
      landscapeRoot = null;
    }

    landscapeRoot = new THREE.Group();
    landscapeRoot.name = "landscape";
    scene.add(landscapeRoot);

    ground = makeGroundTile(G.MAP_HALF * 2.8, G.MAP_HALF * 2.8, 0x688e5f, -0.06, 0, 0, 0);
    // Overlay the procedural checker/fade texture on the base tile (kept as a second
    // material layer so the flat-color fallback below stays intact if texture gen fails).
    if (!groundTexture) groundTexture = makeGroundTexture();
    if (groundTexture) {
      ground.material.map = groundTexture;
      ground.material.needsUpdate = true;
    }
    landscapeRoot.add(ground);

    // Distant hill/dune silhouette ring at the map edge
    if (Q && Q.current !== "low") {
      landscapeRoot.add(makeHillRing(G.MAP_HALF));
    }

    landscapeRoot.add(makeGroundTile(G.MAP_HALF * 2.25, G.MAP_HALF * 2.25, 0x729c68, 0.01, 0, 0, 0, 0.96));
    landscapeRoot.add(makeGroundTile(G.MAP_HALF * 2.05, G.MAP_HALF * 1.4, 0x7ea56c, 0.03, -120, 120, -0.12, 0.72));
    landscapeRoot.add(makeGroundTile(1380, 640, 0x83926b, 0.06, -420, -820, 0.44, 0.88));
    landscapeRoot.add(makeGroundTile(1100, 520, 0x5f7d53, 0.05, 980, 700, -0.24, 0.62));
    landscapeRoot.add(makeGroundTile(920, 440, 0x8d8b63, 0.05, -980, 840, -0.18, 0.55));
    landscapeRoot.add(makeGroundTile(660, 300, 0x7a8a58, 0.05, 720, -980, 0.58, 0.54));

    grid = new THREE.GridHelper(G.MAP_HALF * 2, 48, 0xe3f0ff, 0x436b45);
    grid.position.y = 0.22;
    grid.material.opacity = 0.11;
    grid.material.transparent = true;
    landscapeRoot.add(grid);

    const edgeShape = new THREE.Shape();
    edgeShape.moveTo(-G.MAP_HALF, -G.MAP_HALF);
    edgeShape.lineTo(G.MAP_HALF, -G.MAP_HALF);
    edgeShape.lineTo(G.MAP_HALF, G.MAP_HALF);
    edgeShape.lineTo(-G.MAP_HALF, G.MAP_HALF);
    edgeShape.lineTo(-G.MAP_HALF, -G.MAP_HALF);
    const points = edgeShape.getPoints();
    const borderGeo = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p.x, 1, p.y)));
    boundary = new THREE.Line(borderGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 }));
    landscapeRoot.add(boundary);

    addStrip(landscapeRoot, -1120, 86, 1120, 86, 220, 0x5e6661, 0.34, 0.98);
    addStrip(landscapeRoot, -1120, 86, 1120, 86, 28, 0xc7c7b8, 0.36, 0.96);
    addStrip(landscapeRoot, -1120, 32, 1120, 32, 10, 0x8e998f, 0.37, 0.78);
    addStrip(landscapeRoot, -820, -520, 940, 620, 34, 0x515a54, 0.3, 0.8);
    addStrip(landscapeRoot, -940, 80, -640, -260, 26, 0x59615b, 0.31, 0.72);
    addStrip(landscapeRoot, 940, 80, 720, -460, 26, 0x59615b, 0.31, 0.72);
    addStrip(landscapeRoot, 0, 0, -180, 860, 24, 0x60645a, 0.28, 0.64);
    addStrip(landscapeRoot, 0, 0, 660, 660, 24, 0x60645a, 0.28, 0.64);

    addPlaced(landscapeRoot, makeOutpost(1), -1180, 0, -280, 0.2);
    addPlaced(landscapeRoot, makeOutpost(0.9), 1200, 0, 420, -0.42);
    addPlaced(landscapeRoot, makeOutpost(0.78), -1260, 0, 1120, 1.1);
    addPlaced(landscapeRoot, makeOutpost(0.82), 1180, 0, -980, -0.95);

    addPlaced(landscapeRoot, makeRockField(10, 130, 0x876b4d, 1), -1290, 0, -980, 0.2);
    addPlaced(landscapeRoot, makeRockField(9, 120, 0x8b6f50, 0.92), 1280, 0, 930, -0.2);
    addPlaced(landscapeRoot, makeRockField(8, 110, 0x7d6549, 0.88), -260, 0, -1180, 0.7);
    addPlaced(landscapeRoot, makeRockField(8, 100, 0x826a4d, 0.8), 940, 0, -1080, -0.5);

    addPlaced(landscapeRoot, makeScrubField(18, 240, 0x56794a, 1), -980, 0, 980, 0.15);
    addPlaced(landscapeRoot, makeScrubField(16, 210, 0x4e7444, 0.92), 860, 0, 860, -0.25);
    addPlaced(landscapeRoot, makeScrubField(14, 190, 0x537647, 0.84), 1110, 0, -880, 0.45);
    addPlaced(landscapeRoot, makeScrubField(14, 180, 0x4b6d41, 0.78), -1110, 0, -760, -0.35);

    for (let i = -3; i <= 3; i++) {
      const postNorth = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 48, 6), new THREE.MeshStandardMaterial({ color: 0x626d74, flatShading: true, roughness: 0.96 }));
      postNorth.position.set(i * 420, 24, -G.MAP_HALF + 70);
      postNorth.castShadow = true;
      landscapeRoot.add(postNorth);

      const postSouth = postNorth.clone();
      postSouth.position.z = G.MAP_HALF - 70;
      landscapeRoot.add(postSouth);
    }

    G.LANDMARKS.forEach((landmark) => buildLandmark(landmark, landscapeRoot));
  }

  // ---- Sky: gradient dome + low sun disc + drifting flat cloud sprites ----
  const SKY_TOP = 0x2f7fe0;
  const SKY_BOTTOM = 0xbfe3ff;
  const cloudGeo = new THREE.PlaneGeometry(1, 1);

  function buildSky() {
    if (skyDome) {
      scene.remove(skyDome);
      disposeObject(skyDome);
      skyDome = null;
    }
    cloudSprites.forEach((c) => scene.remove(c.mesh));
    cloudSprites = [];

    const skyTex = makeSkyTexture(SKY_TOP, SKY_BOTTOM);
    const domeGeo = new THREE.SphereGeometry(4600, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const domeMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false });
    skyDome = new THREE.Mesh(domeGeo, domeMat);
    skyDome.renderOrder = -10;
    scene.add(skyDome);

    // Low sun disc — a simple additive circle sitting near the horizon
    const sunGeo = new THREE.CircleGeometry(220, 20);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.85, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const sunDisc = new THREE.Mesh(sunGeo, sunMat);
    sunDisc.position.set(1600, 700, -2600);
    sunDisc.lookAt(0, 700, 0);
    sunDisc.renderOrder = -9;
    skyDome.add(sunDisc);

    // Flat cloud sprites: skip entirely on low quality (perf-gated per spec)
    if (Q && Q.current === "low") return;
    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, fog: false, side: THREE.DoubleSide });
    const cloudCount = 6;
    for (let i = 0; i < cloudCount; i++) {
      const mesh = new THREE.Mesh(cloudGeo, cloudMat);
      const w = 380 + (i % 3) * 140;
      const hgt = w * 0.38;
      mesh.scale.set(w, hgt, 1);
      const a = (i / cloudCount) * Math.PI * 2 + i * 0.7;
      const dist = 2600 + (i % 3) * 300;
      mesh.position.set(Math.cos(a) * dist, 560 + (i % 4) * 90, Math.sin(a) * dist);
      mesh.lookAt(0, mesh.position.y, 0);
      mesh.renderOrder = -8;
      scene.add(mesh);
      cloudSprites.push({ mesh, angle: a, dist, speed: 0.003 + (i % 3) * 0.0015, y: mesh.position.y });
    }
  }

  function updateSky(step) {
    if (!cloudSprites.length) return;
    for (const c of cloudSprites) {
      c.angle += step * c.speed;
      c.mesh.position.set(Math.cos(c.angle) * c.dist, c.y, Math.sin(c.angle) * c.dist);
      c.mesh.lookAt(0, c.y, 0);
    }
  }

  function clearMenuDemo() {
    if (!menuDemo) return;
    scene.remove(menuDemo);
    disposeObject(menuDemo);
    menuDemo = null;
  }

  // getStageShadow(): lazily builds a cheap soft ground disc under the hangar turntable
  // stage point. Reused across mode switches and plane rebuilds — no per-frame allocation.
  function getStageShadow() {
    if (stageShadow) return stageShadow;
    const geo = new THREE.CircleGeometry(30, 24);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false });
    stageShadow = new THREE.Mesh(geo, mat);
    stageShadow.rotation.x = -Math.PI / 2;
    stageShadow.renderOrder = -1;
    stageShadow.visible = false;
    scene.add(stageShadow);
    return stageShadow;
  }

  function applySceneModeChrome() {
    const showCombatChrome = sceneMode === "playing";
    if (minimap) minimap.style.display = showCombatChrome ? "block" : "none";
    if (popupLayer) popupLayer.style.display = showCombatChrome ? "block" : "none";
    if (nameLabelsLayer) nameLabelsLayer.style.display = showCombatChrome ? "block" : "none";
    if (leadReticle && !showCombatChrome) leadReticle.style.display = "none";
    if (!showCombatChrome) {
      for (const [, div] of nameLabelPool) div.style.display = "none";
      if (mmctx && minimap) mmctx.clearRect(0, 0, minimap.width, minimap.height);
    }
  }

  const Renderer = {
    init(canvas) {
      canvasEl = canvas;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      scene = new THREE.Scene();
      // Fog tuned to the sky's horizon (bottom) tone so distant geometry blends into the dome
      // instead of fading into a mismatched flat color.
      scene.background = new THREE.Color(SKY_BOTTOM);
      scene.fog = new THREE.Fog(SKY_BOTTOM, 900, 5000);
      camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10000);
      camera.position.copy(camPos);

      const hemi = new THREE.HemisphereLight(0xd9efff, 0x3f4b36, 1.0);
      scene.add(hemi);
      const sun = new THREE.DirectionalLight(0xfff4d6, 1.3);
      sun.position.set(600, 900, 500);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      scene.add(sun);

      buildLandscape();
      buildSky();

      minimap = document.createElement("canvas");
      minimap.id = "minimap";
      minimap.width = 140;
      minimap.height = 140;
      (document.getElementById("game-wrap") || document.body).appendChild(minimap);
      mmctx = minimap.getContext("2d");

      popupLayer = document.createElement("div");
      popupLayer.id = "popup-layer";
      (document.getElementById("game-wrap") || document.body).appendChild(popupLayer);

      nameLabelsLayer = document.createElement("div");
      nameLabelsLayer.id = "name-labels";
      (document.getElementById("game-wrap") || document.body).appendChild(nameLabelsLayer);

      // Lead reticle — a single pooled div projected to world space each frame.
      leadReticle = document.createElement("div");
      leadReticle.id = "lead-reticle";
      // Subtle ring: 20×20px, accent colour, no pointer events.
      leadReticle.style.cssText = [
        "position:absolute",
        "width:20px",
        "height:20px",
        "border:2px solid rgba(255,210,74,0.72)",
        "border-radius:50%",
        "transform:translate(-50%,-50%)",
        "pointer-events:none",
        "display:none",
        "box-shadow:0 0 4px rgba(255,210,74,0.45)",
        "z-index:20",
      ].join(";");
      (document.getElementById("game-wrap") || document.body).appendChild(leadReticle);

      applyQuality();
      Q && Q.onChange && Q.onChange(() => {
        applyQuality();
        buildSky(); // re-gate clouds when quality tier crosses into/out of "low"
      });
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
      updateSky(step);

      const samples = window.Net.sample ? window.Net.sample(performance.now() - 100) : {};
      const local = window.Net.localPose;
      const seen = new Set();

      // Constant used for exhaust scale animation (fall back if BOOST_SPEED absent)
      const boostSpeed = (G && G.BOOST_SPEED) ? G.BOOST_SPEED : 280;

      state.players.forEach((p, id) => {
        seen.add(id);
        let view = stateMaps.views.get(id);
        if (!view) {
          view = {
            mesh: makePlane({ color: p.skin || 0, bodyShape: p.bodyShape || 0, accent: p.accent || 0, trail: p.trail || 0, livery: p.livery || 0 }),
            shield: null,
            starAura: null,
            freezeOverlay: null,
            empRing: null,
            bank: 0,
            wasAlive: !!p.alive,
            wasHp: p.hp != null ? p.hp : 100,
            pose: null,
            boostFlame: null,
          };
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

        if (view.wasAlive && !pose.alive) explodeAt(new THREE.Vector3(pose.p.x, pose.p.y, pose.p.z), COLORS[(p.skin || 0) % 12]);
        view.wasAlive = pose.alive;
        view.pose = pose;
        view.bank += ((pose.turn || 0) * -0.65 - view.bank) * Math.min(1, step * 10);
        view.mesh.visible = !!pose.alive;
        if (pose.alive) {
          orientPlane(view.mesh, pose, view.bank);
          const speedRatio = Math.min(1, (pose.speed || 0) / boostSpeed);
          animatePlaneNose(view.mesh, speedRatio);

          // Animate exhaust
          const exhaust = view.mesh.userData.exhaust;
          if (exhaust) {
            exhaust.material.opacity = 0.35 + 0.4 * (0.7 + 0.3 * Math.sin(time * 14 + id.charCodeAt(0)));
            exhaust.scale.set(1, 0.6 + speedRatio * 1.4, 1);
          }

          // Boost afterburner: a pulsing flame cone stretching back from the exhaust while boosting
          if (p.boosting) {
            if (!view.boostFlame) {
              view.boostFlame = new THREE.Mesh(
                boostFlameGeo,
                new THREE.MeshBasicMaterial({ color: 0x6fd0ff, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending })
              );
              view.boostFlame.rotation.x = -Math.PI / 2;
              view.boostFlame.position.z = exhaust ? exhaust.position.z + 3 : 14;
              view.mesh.add(view.boostFlame);
            }
            view.boostFlame.visible = true;
            const flamePulse = 1 + 0.35 * Math.sin(time * 30 + id.charCodeAt(0));
            view.boostFlame.scale.set(flamePulse, flamePulse, 1.1 + 0.5 * Math.sin(time * 24));
          } else if (view.boostFlame) {
            view.boostFlame.visible = false;
          }
        }

        // Hit sparks: small yellow burst when hp drops (skip on spawn/undefined-transition)
        const curHp = p.hp != null ? p.hp : 100;
        if (pose.alive && view.wasHp != null && curHp < view.wasHp - 0.01) {
          addParticle(new THREE.Vector3(pose.p.x, pose.p.y, pose.p.z), 0xffe066, { spread: 26, upMin: 6, upSpread: 16, life: 0.28, maxLife: 0.28, gravity: 20 });
          addParticle(new THREE.Vector3(pose.p.x, pose.p.y, pose.p.z), 0xffe066, { spread: 26, upMin: 6, upSpread: 16, life: 0.28, maxLife: 0.28, gravity: 20 });
          addParticle(new THREE.Vector3(pose.p.x, pose.p.y, pose.p.z), 0xffffff, { spread: 20, upMin: 4, upSpread: 12, life: 0.22, maxLife: 0.22, gravity: 20 });
        }
        view.wasHp = curHp;

        // Hide exhaust when dead
        const exhaust = view.mesh.userData.exhaust;
        if (exhaust) exhaust.visible = !!pose.alive;

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

        // STAR: golden pulsing invulnerability aura
        if (p.power === "star" && pose.alive) {
          if (!view.starAura) {
            view.starAura = makeStarAura();
            scene.add(view.starAura);
          }
          view.starAura.visible = true;
          view.starAura.position.set(pose.p.x, pose.p.y, pose.p.z);
          const pulse = 1 + 0.12 * Math.sin(time * 8);
          view.starAura.scale.setScalar(pulse);
        } else if (view.starAura) {
          view.starAura.visible = false;
        }

        // FREEZE (victim): ice-blue overlay while frozen
        if ((p.frozenLeft || 0) > 0 && pose.alive) {
          if (!view.freezeOverlay) {
            view.freezeOverlay = makeFreezeOverlay();
            scene.add(view.freezeOverlay);
          }
          view.freezeOverlay.visible = true;
          view.freezeOverlay.position.set(pose.p.x, pose.p.y, pose.p.z);
        } else if (view.freezeOverlay) {
          view.freezeOverlay.visible = false;
        }

        // EMP (victim): rotating cyan ring, opacity pulsing
        if ((p.empLeft || 0) > 0 && pose.alive) {
          if (!view.empRing) {
            view.empRing = makeEmpRing();
            scene.add(view.empRing);
          }
          view.empRing.visible = true;
          view.empRing.position.set(pose.p.x, pose.p.y, pose.p.z);
          view.empRing.rotation.z += step * 2.4;
          view.empRing.material.opacity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(time * 10));
        } else if (view.empRing) {
          view.empRing.visible = false;
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
        if (view.starAura) {
          scene.remove(view.starAura);
          disposeObject(view.starAura);
        }
        if (view.freezeOverlay) {
          scene.remove(view.freezeOverlay);
          disposeObject(view.freezeOverlay);
        }
        if (view.empRing) {
          scene.remove(view.empRing);
          disposeObject(view.empRing);
        }
        stateMaps.views.delete(id);
      }

      const bulletSeen = new Set();
      state.bullets.forEach((b, key) => {
        bulletSeen.add(key);
        let mesh = stateMaps.bullets.get(key);
        const authP = { x: b.px, y: b.py, z: b.pz };
        const authF = { x: b.fx, y: b.fy, z: b.fz };
        const isMine = (b.kind || "") === "mine";
        if (!mesh) {
          mesh = isMine ? makeMine() : makeBullet(b.homing);
          mesh.userData.pose = { p: authP, f: authF, ax: b.px, ay: b.py, az: b.pz };
          mesh.userData.isMine = isMine;
          stateMaps.bullets.set(key, mesh);

          // Muzzle flash: a newly-appeared (non-mine) bullet means its owner just fired.
          if (!isMine && b.owner) {
            const ownerView = stateMaps.views.get(b.owner);
            if (ownerView && ownerView.mesh && ownerView.mesh.visible) {
              addMuzzleFlash(ownerView.mesh, b.homing ? 0xc07bff : 0xffd86b);
            }
          }
        }
        const pose = mesh.userData.pose;
        if (isMine) {
          // Mines are stationary — just sit at the authoritative position, no interpolation needed.
          pose.p = authP;
          mesh.position.set(authP.x, authP.y, authP.z);
          if (mesh.userData.blinkMat) {
            const blinkT = 0.5 + 0.5 * Math.sin(time * 9 + mesh.userData.phase);
            mesh.userData.blinkMat.opacity = 0.25 + blinkT * 0.75;
          }
        } else {
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
        }
      });
      for (const [key, mesh] of stateMaps.bullets) {
        if (bulletSeen.has(key)) continue;
        if (mesh.userData.isMine) {
          const lastP = mesh.userData.pose.p;
          explodeAt(new THREE.Vector3(lastP.x, lastP.y, lastP.z), 0xff9f43, 22);
        }
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
        part.vel.y -= rawDt * part.gravity;
        part.mesh.position.addScaledVector(part.vel, rawDt);
        if (part.spin) part.mesh.rotation.z += part.spin * rawDt;
        part.mesh.material.opacity = Math.max(0, part.life / part.maxLife);
        part.mesh.scale.setScalar(0.6 + (part.life / part.maxLife) * 1.4);
      }

      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.life -= rawDt;
        if (sw.life <= 0) {
          scene.remove(sw.mesh);
          disposeObject(sw.mesh);
          shockwaves.splice(i, 1);
          continue;
        }
        const t = 1 - sw.life / sw.maxLife;
        sw.mesh.scale.setScalar(2 + t * 34);
        sw.mesh.material.opacity = 0.55 * (1 - t);
      }

      for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
        const mf = muzzleFlashes[i];
        mf.life -= rawDt;
        if (mf.life <= 0) {
          if (mf.mesh.parent) mf.mesh.parent.remove(mf.mesh);
          disposeObject(mf.mesh);
          muzzleFlashes.splice(i, 1);
          continue;
        }
        mf.mesh.material.opacity = 0.9 * (mf.life / mf.maxLife);
      }
    },

    draw(state, myId) {
      applySceneModeChrome();
      this._updateCamera(myId);
      renderer.render(scene, camera);
      if (sceneMode === "playing") {
        this._drawMinimap(state, myId);
        this._updateNameLabels(state, myId);
        this._updateLeadReticle(state, myId);
      }
    },

    // drawMenu(dt, cosmetic): cosmetic can be {color,bodyShape,accent,trail,livery} or bare number
    drawMenu(dt, cosmetic) {
      const menuStep = Math.min(dt || 0.016, 0.05);
      time += menuStep;
      updateSky(menuStep);
      for (const [, view] of stateMaps.views) {
        view.mesh.visible = false;
        if (view.shield) view.shield.visible = false;
        if (view.starAura) view.starAura.visible = false;
        if (view.freezeOverlay) view.freezeOverlay.visible = false;
        if (view.empRing) view.empRing.visible = false;
      }
      // Hide all name labels during menu
      for (const [, div] of nameLabelPool) div.style.display = "none";
      for (const [, bullet] of stateMaps.bullets) bullet.visible = false;
      for (const [, pickup] of stateMaps.pickups) pickup.visible = false;

      if (leadReticle) leadReticle.style.display = "none";
      if (!menuDemo) {
        menuDemo = makePlane(cosmetic);
        scene.add(menuDemo);
      }

      applySceneModeChrome();
      const isCustomize = sceneMode === "customize";
      // Blend factor eases the hard cut when entering/leaving the hangar stage: ramps
      // 0->1 over ~350ms so the camera/plane glide into the turntable pose instead of
      // snapping there on the frame sceneMode flips.
      const blendTarget = isCustomize ? 1 : 0;
      const blendRate = menuStep / 0.35;
      stageBlend = stageBlend + Math.sign(blendTarget - stageBlend) * Math.min(Math.abs(blendTarget - stageBlend), blendRate);

      let pos, fwd, bank, desired, look;

      if (isCustomize || stageBlend > 0) {
        // --- Hangar turntable: fixed stage point, spins in place, gentle hover bob ---
        const yaw = time * 0.45;
        pos = { x: STAGE_POS.x, y: STAGE_POS.y + Math.sin(time * 0.9) * 4, z: STAGE_POS.z };
        fwd = { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) };
        bank = 0;

        const stageDesired = STAGE_CAM_POS;
        const stageLook = STAGE_CAM_LOOK;

        if (stageBlend >= 1) {
          desired = stageDesired;
          look = stageLook;
        } else {
          // Blend from wherever the orbit camera currently sits into the stage pose.
          desired = camPos.clone().lerp(stageDesired, stageBlend);
          look = camLook.clone().lerp(stageLook, stageBlend);
        }
      } else {
        // --- Preflight menu: orbiting flyby, camera trailing behind ---
        const radius = 300;
        const rotSpeed = 0.14;
        const bobAmp = 10;
        const angle = time * rotSpeed;
        pos = { x: Math.cos(angle) * radius, y: 85 + Math.sin(time * 0.8) * bobAmp, z: Math.sin(angle) * radius };
        fwd = SP.normalize({ x: -Math.sin(angle), y: Math.cos(time * 0.8) * 0.08, z: Math.cos(angle) });
        bank = Math.sin(time * 1.3) * 0.22;

        const camPullBack = 118;
        const camUp = 44;
        const camLookAhead = 148;
        const lateralShift = 72;
        const right = new THREE.Vector3(-fwd.z, 0, fwd.x).normalize();
        desired = new THREE.Vector3(
          pos.x - fwd.x * camPullBack + right.x * lateralShift,
          pos.y + camUp,
          pos.z - fwd.z * camPullBack + right.z * lateralShift
        );
        look = new THREE.Vector3(pos.x + fwd.x * camLookAhead, pos.y + 8, pos.z + fwd.z * camLookAhead);
      }

      orientPlane(menuDemo, { p: pos, f: fwd }, bank);
      animatePlaneNose(menuDemo, 0.4 + 0.2 * Math.sin(time * 0.6));

      // Animate menu exhaust (gentle idle pulse)
      const exhaust = menuDemo.userData.exhaust;
      if (exhaust) {
        exhaust.material.opacity = 0.4 + 0.15 * Math.sin(time * 10);
        exhaust.scale.set(1, 0.8 + 0.2 * Math.sin(time * 6), 1);
        exhaust.visible = true;
      }

      // Stage ground disc: only visible once the camera has (mostly) settled into the
      // hangar pose, faded in with stageBlend so it doesn't pop during the transition.
      const shadow = getStageShadow();
      shadow.position.set(STAGE_POS.x, 0.5, STAGE_POS.z);
      shadow.visible = stageBlend > 0.05;
      shadow.material.opacity = 0.32 * stageBlend;

      const lerpSpeed = isCustomize ? 0.10 : 0.065;
      camPos.lerp(desired, lerpSpeed);
      camLook.lerp(look, lerpSpeed + 0.02);
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      renderer.render(scene, camera);
      if (mmctx) mmctx.clearRect(0, 0, minimap.width, minimap.height);
    },

    // updateMenuPlane(cosmetic): live-update hangar preview
    // Rebuilds only on shape change; otherwise recolors in-place by mesh .name
    updateMenuPlane(cosmetic) {
      if (typeof cosmetic === "number") {
        cosmetic = { color: cosmetic, bodyShape: 0, accent: 0, trail: 0, livery: 0 };
      }
      const { color = 0, bodyShape = 0, accent = 0, trail = 0 } = cosmetic;
      const primaryHex = COLORS[color % 12];
      const accentHex = ACCENT_COLORS[accent % 7];
      const trailHex = TRAIL_COLORS[trail % 5];

      // Rebuild on shape change (geometry changes)
      if (!menuDemo || menuDemo.userData.currentBodyShape !== bodyShape) {
        if (menuDemo) {
          scene.remove(menuDemo);
          disposeObject(menuDemo);
        }
        menuDemo = makePlane(cosmetic);
        scene.add(menuDemo);
        return;
      }

      // In-place recolor: traverse and update by .name
      menuDemo.traverse((child) => {
        if (!child.isMesh) return;
        const mat = child.material;
        if (!mat) return;

        const n = child.name;

        // Exhaust gets trail color
        if (n === "exhaust") {
          mat.color.setHex(trailHex);
          return;
        }

        // Livery overlay meshes always use accentMat color
        if (n === "livery_stripe" || n === "livery_camo_patch") {
          mat.color.setHex(accentHex);
          return;
        }

        // Named structural parts: apply per livery rules
        const livery = cosmetic.livery || 0;
        if (livery === 0) {
          // Clean: fuselage=primary, wings=accent, tail+fin=primary
          if (n === "fuselage" || n === "tail" || n === "fin") mat.color.setHex(primaryHex);
          else if (n === "wings" || n === "wings_upper" || n === "wings_lower") mat.color.setHex(accentHex);
        } else if (livery === 1) {
          // Stripe: everything primary
          if (n === "fuselage" || n === "wings" || n === "wings_upper" || n === "wings_lower" || n === "tail" || n === "fin") {
            mat.color.setHex(primaryHex);
          }
        } else if (livery === 2) {
          // Two-Tone: wings+tail+fin=accent, fuselage=primary
          if (n === "fuselage") mat.color.setHex(primaryHex);
          else if (n === "wings" || n === "wings_upper" || n === "wings_lower" || n === "tail" || n === "fin") mat.color.setHex(accentHex);
        } else if (livery === 3) {
          // Camo: fuselage=primary, patches handled above
          if (n === "fuselage" || n === "wings" || n === "wings_upper" || n === "wings_lower" || n === "tail" || n === "fin") {
            mat.color.setHex(primaryHex);
          }
        }
      });

      // Update stored bodyShape in case cosmetic object drifted
      menuDemo.userData.currentBodyShape = bodyShape;
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

    _updateNameLabels(state, myId) {
      if (!nameLabelsLayer || !camera) return;

      const seenIds = new Set();
      // TDM team colors (hex strings, matching TEAM_COLORS in constants.ts)
      const TEAM_BG = ["rgba(74,163,255,0.30)", "rgba(255,90,90,0.30)"];
      const TEAM_BORDER = ["rgba(74,163,255,0.75)", "rgba(255,90,90,0.75)"];
      const isTdm = (state.mode === "tdm");

      state.players.forEach((p, id) => {
        // Skip local player's own label (less visual clutter)
        if (id === myId) return;

        const view = stateMaps.views.get(id);
        if (!view || !view.mesh) return;

        seenIds.add(id);

        // Get or create the label div
        let div = nameLabelPool.get(id);
        if (!div) {
          div = document.createElement("div");
          div.className = "name-label";
          nameLabelsLayer.appendChild(div);
          nameLabelPool.set(id, div);
        }

        // Hide label for dead players
        if (!p.alive) {
          div.style.display = "none";
          return;
        }

        // Project a point slightly above the plane mesh
        // Use a point ~22 world-units above the mesh position
        const labelPos = view.mesh.position.clone();
        labelPos.y += 22;
        const screen = worldToScreen(labelPos);

        if (!screen.visible) {
          div.style.display = "none";
          return;
        }

        div.style.display = "";
        div.style.left = screen.x + "px";
        div.style.top = screen.y + "px";
        // Update name text only when it changes
        const name = p.name || ("P" + id.slice(0, 4));
        if (div.textContent !== name) div.textContent = name;

        // TDM: tint label background by team color for instant friend/foe read
        const team = (p.team !== undefined && p.team !== null) ? p.team : -1;
        if (isTdm && team >= 0 && team <= 1) {
          div.style.background = TEAM_BG[team];
          div.style.boxShadow = `0 0 0 1px ${TEAM_BORDER[team]}`;
        } else {
          div.style.background = "";
          div.style.boxShadow = "";
        }
      });

      // Remove labels for players who left
      for (const [id, div] of nameLabelPool) {
        if (!seenIds.has(id)) {
          div.remove();
          nameLabelPool.delete(id);
        }
      }
    },

    _updateLeadReticle(state, myId) {
      if (!leadReticle || !camera) return;

      // Hide when no local player or local player is dead.
      const me = state.players.get(myId);
      if (!me || !me.alive) { leadReticle.style.display = "none"; return; }

      // Use the interpolated local pose when available (same as _updateCamera).
      const myPose = (window.Net && window.Net.localPose && window.Net.localPose.active)
        ? window.Net.localPose
        : { p: { x: me.px, y: me.py, z: me.pz }, f: { x: me.fx, y: me.fy, z: me.fz } };

      const myPos = myPose.p;
      const myFwd = myPose.f;

      // Bullet speed — prefer the constant exposed on window.GAME, fall back to
      // the value baked in at the time this renderer was written (322).
      const bulletSpeed = (G && G.BULLET_SPEED) ? G.BULLET_SPEED : 322;

      // Find the nearest alive enemy who is in front of the local player
      // (dot(myFwd, toEnemy) > 0) and closest overall.
      let nearestEnemy = null;
      let nearestDist = Infinity;

      state.players.forEach((p, id) => {
        if (id === myId || !p.alive) return;
        const dx = p.px - myPos.x;
        const dy = p.py - myPos.y;
        const dz = p.pz - myPos.z;
        // Dot product — only consider enemies roughly in front.
        const dot = dx * myFwd.x + dy * myFwd.y + dz * myFwd.z;
        if (dot <= 0) return;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = p;
        }
      });

      if (!nearestEnemy) { leadReticle.style.display = "none"; return; }

      // Compute lead point: where the target will be when the bullet arrives.
      // leadTime = distance / bulletSpeed (simple linear approximation).
      const leadTime = nearestDist / Math.max(bulletSpeed, 1);
      // Use reported speed + forward vector as a velocity estimate.
      const eSpeed = nearestEnemy.speed || 0;
      const leadX = nearestEnemy.px + nearestEnemy.fx * eSpeed * leadTime;
      const leadY = nearestEnemy.py + nearestEnemy.fy * eSpeed * leadTime;
      const leadZ = nearestEnemy.pz + nearestEnemy.fz * eSpeed * leadTime;

      const leadVec = new THREE.Vector3(leadX, leadY, leadZ);
      const screen = worldToScreen(leadVec);

      if (!screen.visible) { leadReticle.style.display = "none"; return; }

      leadReticle.style.display = "";
      leadReticle.style.left = screen.x + "px";
      leadReticle.style.top  = screen.y + "px";

      // Tint the crosshair element if the lead point is close to screen centre.
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const screenDist = Math.hypot(screen.x - cx, screen.y - cy);
      const crosshairEl = document.getElementById("crosshair");
      if (crosshairEl) {
        crosshairEl.style.borderColor = screenDist < 60 ? "rgba(255,210,74,0.95)" : "";
      }
    },

    killPopup(killerId, mine) {
      const view = stateMaps.views.get(killerId);
      // Streak celebration: confetti burst from the killer's tail, gated off on low quality.
      if (view && view.mesh && view.mesh.visible && Q && Q.current !== "low") celebrate(view.mesh);

      if (!popupLayer) return;
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

    setSceneMode(mode) {
      sceneMode = mode || "preflight";
      applySceneModeChrome();
    },

    setHangarOpen(open) {
      sceneMode = open ? "customize" : "preflight";
      applySceneModeChrome();
    },
  };

  window.Renderer = Renderer;
})();



