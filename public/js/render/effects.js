// render/effects.js — particles, explosions, puffs
(function () {
  const rand = (a, b) => a + Math.random() * (b - a);

  window.RenderEffects = {
    create() {
      return {
        particles: [],
        hitStop: 0,
        shakeMag: 0,
        dip: 0,
      };
    },

    spawn(state, scene, geo, color, x, y, z, o) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o.alpha ?? 1, depthWrite: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending }));
      m.position.set(x, y, z); m.scale.setScalar(o.from ?? 1);
      scene.add(m);
      state.particles.push({ mesh: m, vel: o.vel, life: o.life, maxLife: o.life, gravity: o.gravity ?? 0, grav3: o.grav3 || null, spin: o.spin ?? 0, alpha: o.alpha ?? 1, from: o.from ?? 1, to: o.to ?? o.from ?? 1 });
    },

    spawnAt(state, scene, geo, color, pos, normal, o) {
      const vel = new THREE.Vector3(rand(-o.spread, o.spread), rand(-o.spread, o.spread), rand(-o.spread, o.spread)).addScaledVector(normal, o.up);
      this.spawn(state, scene, geo, color, pos.x, pos.y, pos.z, { vel, life: o.life, gravity: 0, grav3: normal.clone().multiplyScalar(-(o.grav || 0)), spin: o.spin ?? 6, from: o.from, to: o.to, alpha: o.alpha, add: o.add });
    },

    explode(state, scene, PUFF_GEO, SPARK_GEO, pos, normal, color, partScale) {
      const nrm = new THREE.Vector3(normal.x, normal.y, normal.z);
      this.spawnAt(state, scene, PUFF_GEO, 0xffe6a8, pos, nrm, { spread: 8, up: 8, life: 0.26, grav: 0, from: 6, to: 36, alpha: 0.95, add: true });
      const n = Math.round(16 * partScale);
      for (let i = 0; i < n; i++) this.spawnAt(state, scene, SPARK_GEO, i % 2 ? 0xffd27a : color, pos, nrm, { spread: 180, up: rand(40, 160), life: rand(0.5, 0.85), grav: 240, from: rand(3, 6), to: 0.5, alpha: 1, add: true });
      const m = Math.round(7 * partScale);
      for (let i = 0; i < m; i++) this.spawnAt(state, scene, PUFF_GEO, 0x9aa6b2, pos, nrm, { spread: 50, up: rand(20, 60), life: rand(0.5, 0.9), grav: -12, from: rand(3, 6), to: rand(14, 20), alpha: 0.4 });
    },

    puff(state, scene, PUFF_GEO, pos, boosting) {
      this.spawn(state, scene, PUFF_GEO, boosting ? 0xff9a3c : 0x9aa6b2, pos.x, pos.y, pos.z, { vel: new THREE.Vector3(0, 0, 0), life: boosting ? 0.35 : 0.6, from: boosting ? 5 : 3, to: boosting ? 13 : 16, alpha: boosting ? 0.75 : 0.32, add: !!boosting });
    },

    update(state, scene, dt) {
      const particles = state.particles;
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
  };
})();
