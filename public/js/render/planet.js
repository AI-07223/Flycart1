// render/planet.js — terrain, obstacles, skybox, water, clouds
(function () {
  const G = window.GAME;
  const SP = window.Sphere;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);

  window.RenderPlanet = {
    buildStars(scene, visR) {
      const n = 600, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const d = SP.randomDir(); const r = 16000; pos[i*3]=d.x*r; pos[i*3+1]=d.y*r; pos[i*3+2]=d.z*r; }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbcd2ff, size: 60, sizeAttenuation: true }));
      scene.add(stars); return stars;
    },

    buildPlanet(scene, visR) {
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
      planet.receiveShadow = true; scene.add(planet);

      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(1.05, 32, 24),
        new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false })
      );
      scene.add(atmo);
      return { planet, atmo };
    },

    buildDecor(scene, SP_GEO, PUFF_GEO, decorScale, visR) {
      const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.9 });
      const n = Math.round(14 * decorScale);
      const clouds = [];
      for (let i = 0; i < n; i++) {
        const grp = new THREE.Group();
        const lobes = 3 + (i % 3);
        for (let j = 0; j < lobes; j++) { const s = rand(28, 60); const m = new THREE.Mesh(PUFF_GEO, cloudMat); m.scale.set(s*1.4, s, s); m.position.set((j-lobes/2)*46, rand(-8, 10), rand(-20, 20)); grp.add(m); }
        const dir = SP.randomDir(); grp.userData = { dir, alt: rand(120, 220) };
        scene.add(grp); clouds.push(grp);
      }
      return clouds;
    },

    buildObstacles(scene, helpers) {
      const list = G.OBSTACLES || [];
      const mapGroup = new THREE.Group();
      if (!list.length) { scene.add(mapGroup); return { mapGroup, volcano: null }; }
      const ROCK = 0x8d857a, ROCK_D = 0x6f675d, STONE = 0x9a958c;
      let volcano = null;
      for (const o of list) {
        let mesh;
        if (o.landmark === "volcano" || o.kind === "tower") mesh = helpers._lmVolcano(o);
        else if (o.landmark === "lighthouse") mesh = helpers._lmLighthouse(o);
        else if (o.landmark === "shipwreck") mesh = helpers._lmShipwreck(o);
        else if (o.landmark === "forest") mesh = helpers._lmForest(o);
        else if (o.kind === "spire") mesh = helpers._obSpire(o, ROCK, ROCK_D);
        else if (o.kind === "arch") mesh = helpers._obArch(o, STONE);
        else if (o.kind === "ring") mesh = helpers._obRing(o);
        else mesh = helpers._obRock(o, ROCK);
        if (mesh) { mesh.userData.dir = o.dir; mapGroup.add(mesh); }
      }
      scene.add(mapGroup);
      // find volcano for eruption
      for (const m of mapGroup.children) if (m.userData.volcanoTop != null) volcano = { dir: m.userData.dir, top: m.userData.volcanoTop };
      return { mapGroup, volcano };
    },

    // Obstacle builders
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
  };
})();
