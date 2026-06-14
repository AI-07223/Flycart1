// render/minimap.js — 2D radar minimap overlay
(function () {
  const G = window.GAME;
  const SP = window.Sphere;
  const TAU = Math.PI * 2;

  window.RenderMinimap = {
    create(parent) {
      const canvas = document.createElement("canvas");
      canvas.id = "minimap";
      canvas.width = 120; canvas.height = 120;
      (parent || document.body).appendChild(canvas);
      return { canvas, ctx: canvas.getContext("2d") };
    },

    draw(mm, state, myId) {
      if (!mm || !mm.ctx) return;
      const mmctx = mm.ctx, minimap = mm.canvas;
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
      let threat = false;
      state.players.forEach((p, id) => {
        if (!p.alive) return;
        const dir = SP.vec(p.px, p.py, p.pz);
        if (id !== myId && SP.angBetween(myP, dir) < 0.6) threat = true;
        plot(dir, (x, y) => { const m = id === myId; mmctx.fillStyle = m ? "#fff" : (p.bot ? "#ff8a8a" : "#7fd0ff"); mmctx.beginPath(); mmctx.arc(x, y, m ? 3 : 2, 0, TAU); mmctx.fill(); });
      });
      minimap.style.opacity = threat ? "0.95" : "0.5";
      mmctx.fillStyle = "#fff"; mmctx.beginPath(); mmctx.moveTo(cx, cy - 5); mmctx.lineTo(cx - 3, cy + 3); mmctx.lineTo(cx + 3, cy + 3); mmctx.closePath(); mmctx.fill();
    },
  };
})();
