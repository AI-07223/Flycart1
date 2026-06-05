// Canvas renderer: camera, parallax sky/ocean, sprite planes, bullets,
// particles, screen shake, hit-stop, minimap. Smooths networked entities.
(function () {
  const G = window.GAME;
  const SKIN_COLORS = ["#ff5d5d", "#5dff8f", "#5db4ff", "#c98bff", "#ffd95d"];

  function lerpAngle(a, b, t) {
    let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a + d * t;
  }

  const Renderer = {
    canvas: null,
    ctx: null,
    cam: { x: G.ARENA_WIDTH / 2, y: G.ARENA_HEIGHT / 2 },
    views: new Map(), // id -> {x,y,angle,smokeT}
    particles: [],
    clouds: [],
    seenBullets: new Set(),
    prev: new Map(), // id -> {hp, alive}
    shake: 0,
    hitstop: 0,
    time: 0,

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.resize();
      window.addEventListener("resize", () => this.resize());
      // Parallax cloud field (world coords, wraps across a padded area).
      const W = G.ARENA_WIDTH + 1200, H = G.ARENA_HEIGHT + 1200;
      for (let i = 0; i < 38; i++) {
        this.clouds.push({
          x: Math.random() * W - 600,
          y: Math.random() * H - 600,
          r: 40 + Math.random() * 90,
          p: 0.45 + Math.random() * 0.35, // parallax depth
          a: 0.05 + Math.random() * 0.08,
        });
      }
    },

    resize() {
      const wrap = this.canvas.parentElement;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.vw = w; this.vh = h;
    },

    addParticle(p) { this.particles.push(p); },

    burst(x, y, color, n, opts) {
      opts = opts || {};
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (opts.speed || 120) * (0.4 + Math.random());
        this.particles.push({
          x, y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: opts.life || 0.5, max: opts.life || 0.5,
          r: opts.r || 4, color, drag: opts.drag || 2.5,
          glow: opts.glow,
        });
      }
    },

    // Reconcile smoothed views & detect events (deaths, hits, new shots).
    sync(state, dt, myId) {
      // Players: ease views toward authoritative state.
      for (const [id, p] of state.players) {
        let v = this.views.get(id);
        if (!v) { v = { x: p.x, y: p.y, angle: p.angle, smokeT: 0 }; this.views.set(id, v); }
        const k = id === myId ? Math.min(1, dt * 18) : Math.min(1, dt * 12);
        if (p.alive) {
          v.x += (p.x - v.x) * k;
          v.y += (p.y - v.y) * k;
          v.angle = lerpAngle(v.angle, p.angle, k);
        } else {
          v.x = p.x; v.y = p.y;
        }

        // Event detection via diff.
        const pr = this.prev.get(id) || { hp: p.hp, alive: p.alive };
        if (p.alive && pr.alive && p.hp < pr.hp) {
          this.burst(v.x, v.y, "#fff2a8", 5, { speed: 110, life: 0.3, r: 3 });
          if (this.nearCam(v)) window.SFX.hit();
        }
        if (pr.alive && !p.alive) {
          this.burst(v.x, v.y, "#ff7a3c", 26, { speed: 260, life: 0.7, r: 5, glow: true });
          this.burst(v.x, v.y, "#ffd95d", 14, { speed: 180, life: 0.5, r: 3, glow: true });
          if (this.nearCam(v)) { window.SFX.explosion(); this.shake = Math.min(18, this.shake + (id === myId ? 16 : 9)); this.hitstop = 0.05; }
        }
        if (!pr.alive && p.alive) {
          this.burst(v.x, v.y, "#9fe8ff", 16, { speed: 200, life: 0.5, r: 4, glow: true });
        }
        this.prev.set(id, { hp: p.hp, alive: p.alive });

        // Smoke trail behind moving planes.
        if (p.alive) {
          v.smokeT -= dt;
          if (v.smokeT <= 0) {
            v.smokeT = p.boosting ? 0.02 : 0.05;
            const bx = v.x - Math.cos(v.angle) * G.PLANE_RADIUS;
            const by = v.y - Math.sin(v.angle) * G.PLANE_RADIUS;
            this.particles.push({
              x: bx, y: by, vx: 0, vy: 0,
              life: p.boosting ? 0.5 : 0.35, max: 0.5,
              r: p.boosting ? 7 : 4,
              color: p.boosting ? "#ffcaa0" : "#cfd8e6",
              drag: 0.5, smoke: true,
            });
          }
        }
      }
      // Drop views for players that left.
      for (const id of this.views.keys()) if (!state.players.has(id)) { this.views.delete(id); this.prev.delete(id); }

      // Bullets: muzzle flash + shot sound on first sight.
      const now = new Set();
      for (const [bid, b] of state.bullets) {
        now.add(bid);
        if (!this.seenBullets.has(bid)) {
          this.burst(b.x, b.y, "#fff0b0", 3, { speed: 90, life: 0.18, r: 2.5 });
          if (this.nearCamXY(b.x, b.y)) window.SFX.shoot();
        }
      }
      this.seenBullets = now;

      // Camera follows my view (or arena center).
      const me = this.views.get(myId);
      const tx = me ? me.x : G.ARENA_WIDTH / 2;
      const ty = me ? me.y : G.ARENA_HEIGHT / 2;
      this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 6);
      this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 6);

      // Update particles.
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const q = this.particles[i];
        q.life -= dt;
        if (q.life <= 0) { this.particles.splice(i, 1); continue; }
        q.x += q.vx * dt; q.y += q.vy * dt;
        const f = Math.exp(-q.drag * dt);
        q.vx *= f; q.vy *= f;
        if (q.smoke) q.r += dt * 14;
      }

      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 40);
    },

    nearCam(v) { return this.nearCamXY(v.x, v.y); },
    nearCamXY(x, y) {
      return Math.abs(x - this.cam.x) < this.vw && Math.abs(y - this.cam.y) < this.vh;
    },

    worldToScreen(x, y) {
      let sx = this.shake ? (Math.random() - 0.5) * this.shake : 0;
      let sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
      return [x - this.cam.x + this.vw / 2 + sx, y - this.cam.y + this.vh / 2 + sy];
    },

    draw(state, myId) {
      const ctx = this.ctx;
      this.time += 0.016;
      ctx.clearRect(0, 0, this.vw, this.vh);

      this.drawOcean(ctx);
      this.drawArenaBounds(ctx);
      this.drawClouds(ctx);
      this.drawParticles(ctx, false);
      this.drawBullets(ctx, state);
      this.drawPlanes(ctx, state, myId);
      this.drawParticles(ctx, true); // glow particles on top
      this.drawMinimap(ctx, state, myId);
    },

    drawOcean(ctx) {
      const g = ctx.createLinearGradient(0, 0, 0, this.vh);
      g.addColorStop(0, "#16384f");
      g.addColorStop(1, "#0d2738");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.vw, this.vh);

      // Scrolling wave glints in world space for a sense of motion.
      ctx.strokeStyle = "rgba(120,180,210,0.10)";
      ctx.lineWidth = 2;
      const spacing = 90;
      const ox = -((this.cam.x) % spacing);
      const oy = -((this.cam.y) % spacing);
      ctx.beginPath();
      for (let x = ox; x < this.vw; x += spacing) {
        for (let y = oy; y < this.vh; y += spacing) {
          const ph = this.time * 1.5 + (x + y) * 0.02;
          const len = 6 + Math.sin(ph) * 4;
          ctx.moveTo(x, y);
          ctx.lineTo(x + len, y);
        }
      }
      ctx.stroke();
    },

    drawArenaBounds(ctx) {
      const [x0, y0] = this.worldToScreen(0, 0);
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 6;
      ctx.setLineDash([18, 14]);
      ctx.strokeRect(x0, y0, G.ARENA_WIDTH, G.ARENA_HEIGHT);
      ctx.restore();
    },

    drawClouds(ctx) {
      ctx.save();
      for (const c of this.clouds) {
        const sx = c.x - this.cam.x * c.p + this.vw / 2;
        const sy = c.y - this.cam.y * c.p + this.vh / 2;
        if (sx < -200 || sx > this.vw + 200 || sy < -200 || sy > this.vh + 200) continue;
        const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, c.r);
        grd.addColorStop(0, `rgba(255,255,255,${c.a})`);
        grd.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(sx, sy, c.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    drawBullets(ctx, state) {
      ctx.save();
      for (const [, b] of state.bullets) {
        const [sx, sy] = this.worldToScreen(b.x, b.y);
        const tx = sx - Math.cos(b.angle) * 14;
        const ty = sy - Math.sin(b.angle) * 14;
        ctx.strokeStyle = "rgba(255,236,150,0.9)";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#ffec96";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawPlanes(ctx, state, myId) {
      for (const [id, p] of state.players) {
        const v = this.views.get(id);
        if (!v || !p.alive) continue;
        const [sx, sy] = this.worldToScreen(v.x, v.y);
        const color = SKIN_COLORS[p.skin % SKIN_COLORS.length];

        ctx.save();
        ctx.translate(sx, sy);

        // Boost flame.
        if (p.boosting) {
          ctx.save();
          ctx.rotate(v.angle);
          const fl = 14 + Math.sin(this.time * 40) * 5;
          const fg = ctx.createLinearGradient(-G.PLANE_RADIUS, 0, -G.PLANE_RADIUS - fl, 0);
          fg.addColorStop(0, "rgba(255,210,120,0.9)");
          fg.addColorStop(1, "rgba(255,80,40,0)");
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.moveTo(-G.PLANE_RADIUS, -6);
          ctx.lineTo(-G.PLANE_RADIUS - fl, 0);
          ctx.lineTo(-G.PLANE_RADIUS, 6);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // Local player highlight ring.
        if (id === myId) {
          ctx.beginPath();
          ctx.arc(0, 0, G.PLANE_RADIUS + 8, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,0.5)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Sprite (rotate to heading; sprites point up so add offset).
        const img = window.Assets.planeFor(p.skin);
        ctx.rotate(v.angle + G.SPRITE_ROT_OFFSET);
        const size = G.PLANE_RADIUS * 2.6;
        if (img) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
        } else {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(0, -size / 2);
          ctx.lineTo(size / 2, size / 2);
          ctx.lineTo(-size / 2, size / 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // Name + health bar (screen-aligned, above plane).
        ctx.save();
        ctx.translate(sx, sy - G.PLANE_RADIUS - 18);
        ctx.font = "bold 12px 'Trebuchet MS', sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = id === myId ? "#ffd95d" : "#e6edf7";
        ctx.fillText(p.name, 0, -6);
        const bw = 38, hp = Math.max(0, p.hp) / G.MAX_HP;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(-bw / 2, 0, bw, 5);
        ctx.fillStyle = hp > 0.5 ? "#4dff88" : hp > 0.25 ? "#ffcb05" : "#ff4d4d";
        ctx.fillRect(-bw / 2, 0, bw * hp, 5);
        ctx.restore();
      }
    },

    drawParticles(ctx, glowPass) {
      ctx.save();
      for (const q of this.particles) {
        if (!!q.glow !== glowPass) continue;
        const t = q.life / q.max;
        ctx.globalAlpha = Math.max(0, q.smoke ? t * 0.5 : t);
        if (q.glow) ctx.globalCompositeOperation = "lighter";
        const [sx, sy] = this.worldToScreen(q.x, q.y);
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.arc(sx, sy, q.r * (q.smoke ? 1 : 0.6 + t * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    drawMinimap(ctx, state, myId) {
      const w = 150, h = w * (G.ARENA_HEIGHT / G.ARENA_WIDTH);
      const x = this.vw - w - 16, y = this.vh - h - 16;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "rgba(10,16,26,0.7)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.strokeRect(x, y, w, h);
      for (const [id, p] of state.players) {
        if (!p.alive) continue;
        const px = x + (p.x / G.ARENA_WIDTH) * w;
        const py = y + (p.y / G.ARENA_HEIGHT) * h;
        ctx.fillStyle = id === myId ? "#ffd95d" : p.bot ? "#ff7a7a" : "#7ab8ff";
        ctx.beginPath();
        ctx.arc(px, py, id === myId ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  };

  window.Renderer = Renderer;
})();
