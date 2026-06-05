// Orchestration: screens, connection, game loop, HUD.
(function () {
  const $ = (id) => document.getElementById(id);
  const G = window.GAME;

  const els = {
    canvas: $("game"),
    hud: $("hud"), score: $("hud-score"), time: $("hud-time"), leaderboard: $("leaderboard"),
    health: $("healthbar"), healthfill: $("healthfill"), respawn: $("respawn"),
    start: $("start-screen"), name: $("name-input"),
    quick: $("quickplay-btn"), friends: $("friends-btn"), status: $("status"),
    pause: $("pause-screen"), resume: $("resume-btn"),
    mute: $("mute-btn"),
    share: $("share-bar"), shareLink: $("share-link"), copy: $("copy-btn"),
    inter: $("intermission"), finalBoard: $("final-board"), interTime: $("inter-time"),
  };

  let mode = "menu"; // menu | playing | paused
  let last = 0;
  let engineStarted = false;

  function genCode() {
    const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  }

  function roomFromUrl() {
    const p = new URLSearchParams(location.search);
    const r = p.get("room");
    return r ? r.toUpperCase().slice(0, 6) : null;
  }

  async function startGame(code) {
    window.SFX.unlock();
    const name = (els.name.value || "Pilot").slice(0, 14);
    els.status.textContent = "Connecting…";
    els.quick.disabled = els.friends.disabled = true;
    try {
      await window.Net.connect(name, code);
    } catch (e) {
      els.status.textContent = "Could not connect: " + (e && e.message ? e.message : e);
      els.quick.disabled = els.friends.disabled = false;
      return;
    }

    els.start.classList.add("hidden");
    els.hud.classList.remove("hidden");
    els.health.classList.remove("hidden");

    if (code !== "PUBLIC") {
      const url = location.origin + location.pathname + "?room=" + code;
      history.replaceState(null, "", "?room=" + code);
      els.shareLink.value = url;
      els.share.classList.remove("hidden");
    }

    if (!engineStarted) { window.SFX.startEngine(); engineStarted = true; }
    mode = "playing";
  }

  // ---------- game loop ----------
  function loop(ts) {
    requestAnimationFrame(loop);
    let dt = (ts - last) / 1000;
    last = ts;
    if (!isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);

    const room = window.Net.room;
    if (mode === "playing" && room && room.state) {
      const state = room.state;
      const myId = window.Net.sessionId;

      const inp = window.Input.get();
      window.Net.sendInput(inp.turn, inp.boost, inp.fire);

      window.Renderer.sync(state, dt, myId);
      window.Renderer.draw(state, myId);
      updateHud(state, myId);

      const me = state.players.get(myId);
      if (me && engineStarted) {
        const sp = me.boosting ? 1 : 0.55;
        window.SFX.setEngine(sp, me.boosting);
      }
    } else if (room && room.state) {
      // Paused: still draw the frozen scene.
      window.Renderer.draw(room.state, window.Net.sessionId);
    }
  }

  function updateHud(state, myId) {
    const me = state.players.get(myId);
    els.score.textContent = me ? me.score : 0;
    els.time.textContent = Math.ceil(state.timeLeft);

    // Health + respawn notice.
    if (me) {
      els.healthfill.style.width = Math.max(0, (me.hp / G.MAX_HP) * 100) + "%";
      els.respawn.classList.toggle("hidden", me.alive);
    }

    // Leaderboard: top 5 by score.
    const list = [];
    state.players.forEach((p, id) => list.push({ id, name: p.name, score: p.score, bot: p.bot }));
    list.sort((a, b) => b.score - a.score);
    els.leaderboard.innerHTML = list.slice(0, 5).map((p, i) =>
      `<div class="lb-row ${p.id === myId ? "me" : ""}"><span><span class="rank">${i + 1}.</span> ${escapeHtml(p.name)}${p.bot ? " 🤖" : ""}</span><span>${p.score}</span></div>`
    ).join("");

    // Intermission scoreboard.
    if (state.phase === "intermission") {
      els.inter.classList.remove("hidden");
      els.interTime.textContent = Math.ceil(state.timeLeft);
      els.finalBoard.innerHTML = list.slice(0, 6).map((p, i) =>
        `<li class="${p.id === myId ? "me" : ""}"><span>${i + 1}. ${escapeHtml(p.name)}${p.bot ? " 🤖" : ""}</span><span>${p.score}</span></li>`
      ).join("");
    } else {
      els.inter.classList.add("hidden");
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- wiring ----------
  function init() {
    window.Renderer.init(els.canvas);
    window.Input.attach();
    window.Assets.load();

    const urlCode = roomFromUrl();
    if (urlCode) {
      els.status.textContent = "Joining room " + urlCode;
      els.quick.textContent = "JOIN ROOM " + urlCode;
    }

    els.quick.addEventListener("click", () => { window.SFX.uiClick(); startGame(urlCode || "PUBLIC"); });
    els.friends.addEventListener("click", () => { window.SFX.uiClick(); startGame(genCode()); });

    els.name.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); startGame(urlCode || "PUBLIC"); }
    });

    els.copy.addEventListener("click", () => {
      els.shareLink.select();
      navigator.clipboard && navigator.clipboard.writeText(els.shareLink.value);
      els.copy.textContent = "Copied!";
      setTimeout(() => (els.copy.textContent = "Copy"), 1500);
    });

    els.mute.addEventListener("click", () => toggleMute());
    els.resume.addEventListener("click", () => togglePause());

    window.Input.onPause = () => { if (mode !== "menu") togglePause(); };
    window.Input.onMute = () => toggleMute();

    requestAnimationFrame((t) => { last = t; loop(t); });
  }

  function togglePause() {
    if (mode === "playing") { mode = "paused"; els.pause.classList.remove("hidden"); window.SFX.setEngine(0, false); }
    else if (mode === "paused") { mode = "playing"; els.pause.classList.add("hidden"); }
  }

  function toggleMute() {
    const m = window.SFX.toggleMute();
    els.mute.textContent = m ? "🔇" : "🔊";
  }

  window.addEventListener("DOMContentLoaded", init);
})();
