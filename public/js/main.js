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
    killfeed: $("killfeed"),
    touch: $("touch-controls"), steerPad: $("steer-pad"),
    left: $("left-btn"), right: $("right-btn"), boost: $("boost-btn"), fire: $("fire-btn"),
    recenter: $("recenter-btn"),
    gyroOpt: $("gyro-opt"), gyroCheck: $("gyro-check"), kbdControls: $("kbd-controls"),
    vignette: $("vignette"), rotate: $("rotate-overlay"),
    settingsBtn: $("settings-btn"), settingsPanel: $("settings-panel"),
    qSeg: $("quality-seg"), volMaster: $("vol-master"), volMusic: $("vol-music"), volSfx: $("vol-sfx"),
    settingsClose: $("settings-close"), callout: $("callout"),
  };

  let prevPhase = "playing";
  let prevHp = 100;
  let streak = 0, lastKill = 0, lastFireSnd = 0;

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
    enterImmersive(); // fullscreen + landscape lock (must run inside the click gesture)
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

    // Mobile: activate touch controls and (optionally) gyro steering.
    if (window.Input.isTouchDevice()) {
      els.touch.classList.remove("hidden");
      let gyroOn = false;
      if (els.gyroCheck.checked) gyroOn = await window.Input.enableGyro();
      if (gyroOn) {
        els.recenter.classList.remove("hidden"); // tilt steers; show recenter
      } else {
        els.steerPad.classList.remove("hidden"); // fall back to arrows
      }
    }

    window.SFX.startMusic();

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
      // Fire SFX cadence (approximates the server's fire cooldown).
      if (me && me.alive && inp.fire && ts / 1000 - lastFireSnd > 0.22) {
        window.SFX.fire(); lastFireSnd = ts / 1000;
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

      // Damage flash + low-health pulse + hit sound.
      if (me.alive && me.hp < prevHp) {
        els.vignette.classList.add("hit");
        setTimeout(() => els.vignette.classList.remove("hit"), 130);
        window.SFX.hit();
      }
      els.vignette.classList.toggle("low", me.alive && me.hp > 0 && me.hp < 30);
      prevHp = me.hp;
    }

    // Leaderboard: top 5 by score.
    const list = [];
    state.players.forEach((p, id) => list.push({ id, name: p.name, score: p.score, bot: p.bot }));
    list.sort((a, b) => b.score - a.score);
    els.leaderboard.innerHTML = list.slice(0, 5).map((p, i) =>
      `<div class="lb-row ${p.id === myId ? "me" : ""}"><span><span class="rank">${i + 1}.</span> ${escapeHtml(p.name)}${p.bot ? " 🤖" : ""}</span><span>${p.score}</span></div>`
    ).join("");

    // Round phase transitions (sound cues).
    if (state.phase !== prevPhase) {
      if (state.phase === "intermission") window.SFX.explosion();
      else window.SFX.go();
      prevPhase = state.phase;
    }

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

  // ---------- kill feed ----------
  function onKill(msg) {
    const myId = window.Net.sessionId;
    const mine = msg.killer === myId;
    const victimIsMe = msg.victim === myId;

    // Feed line.
    const div = document.createElement("div");
    div.className = "kill-msg" + (mine ? " mine" : "");
    div.innerHTML = `${escapeHtml(mine ? "You" : msg.killerName)} 💥 <span class="vic">${escapeHtml(victimIsMe ? "You" : msg.victimName)}</span>`;
    els.killfeed.appendChild(div);
    setTimeout(() => div.remove(), 3800);
    while (els.killfeed.children.length > 5) els.killfeed.firstChild.remove();

    // "+1" popup + audio + juice.
    window.Renderer.killPopup(msg.killer, mine);
    if (victimIsMe) window.SFX.explosion();
    if (mine) {
      window.SFX.kill();
      window.Renderer.hitStop(80);
      const now = performance.now() / 1000;
      streak = (now - lastKill < 3) ? streak + 1 : 1;
      lastKill = now;
      if (streak >= 2) showCallout(streakName(streak));
    }
  }

  function showCallout(text) {
    els.callout.textContent = text;
    els.callout.classList.remove("show");
    void els.callout.offsetWidth; // restart the animation
    els.callout.classList.add("show");
  }

  function streakName(s) {
    return s >= 6 ? "GODLIKE!" : s >= 5 ? "UNSTOPPABLE!" : s >= 4 ? "RAMPAGE!" : s >= 3 ? "TRIPLE SMASH!" : "DOUBLE SMASH!";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- wiring ----------
  function init() {
    window.Renderer.init(els.canvas);
    window.Input.attach();
    window.Assets.load();

    window.Net.onKill = onKill;

    // Show mobile options on touch devices.
    if (window.Input.isTouchDevice()) {
      els.gyroOpt.classList.remove("hidden");
      els.kbdControls.classList.add("hidden");
      if (!window.Input.gyro.supported) els.gyroCheck.checked = false;
    }
    setupTouchButtons();

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
    setupSettings();

    window.Input.onPause = () => { if (mode !== "menu") togglePause(); };
    window.Input.onMute = () => toggleMute();

    window.addEventListener("orientationchange", updateRotateOverlay);
    window.addEventListener("resize", updateRotateOverlay);
    updateRotateOverlay();

    requestAnimationFrame((t) => { last = t; loop(t); });
  }

  function setupTouchButtons() {
    const hold = (el, on) => {
      const set = (v) => (e) => { e.preventDefault(); on(v); };
      el.addEventListener("pointerdown", set(true));
      el.addEventListener("pointerup", set(false));
      el.addEventListener("pointercancel", set(false));
      el.addEventListener("pointerleave", set(false));
    };
    hold(els.left, (v) => (window.Input.touch.left = v));
    hold(els.right, (v) => (window.Input.touch.right = v));
    hold(els.boost, (v) => (window.Input.touch.boost = v));
    hold(els.fire, (v) => (window.Input.touch.fire = v));
    els.recenter.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      window.Input.recalibrateGyro();
      window.SFX.uiClick();
    });
  }

  function togglePause() {
    if (mode === "playing") { mode = "paused"; els.pause.classList.remove("hidden"); window.SFX.setEngine(0, false); }
    else if (mode === "paused") { mode = "playing"; els.pause.classList.add("hidden"); }
  }

  function toggleMute() {
    const m = window.SFX.toggleMute();
    els.mute.textContent = m ? "🔇" : "🔊";
  }

  // Go full-screen + lock landscape (best-effort; ignored where unsupported,
  // e.g. iOS has no orientation lock — the rotate overlay covers that case).
  function enterImmersive() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) { try { const r = req.call(el); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
    if (screen.orientation && screen.orientation.lock) {
      try { const r = screen.orientation.lock("landscape"); if (r && r.catch) r.catch(() => {}); } catch (e) {}
    }
    updateRotateOverlay();
  }

  function updateRotateOverlay() {
    const portrait = window.matchMedia && window.matchMedia("(orientation: portrait)").matches;
    const show = window.Input.isTouchDevice() && portrait && mode !== "menu";
    els.rotate.classList.toggle("show", !!show);
  }

  function setupSettings() {
    const setOpen = (v) => els.settingsPanel.classList.toggle("hidden", !v);
    els.settingsBtn.addEventListener("click", () => { window.SFX.uiClick(); setOpen(els.settingsPanel.classList.contains("hidden")); });
    els.settingsClose.addEventListener("click", () => { window.SFX.uiClick(); setOpen(false); });

    els.qSeg.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => { window.SFX.uiClick(); window.Quality.set(b.dataset.q, true); refreshQuality(); });
    });
    window.Quality.onChange(refreshQuality);
    refreshQuality();

    const v = window.SFX.vols();
    els.volMaster.value = Math.round(v.master * 100);
    els.volMusic.value = Math.round(v.music * 100);
    els.volSfx.value = Math.round(v.sfx * 100);
    els.volMaster.addEventListener("input", () => window.SFX.setMaster(els.volMaster.value / 100));
    els.volMusic.addEventListener("input", () => window.SFX.setMusic(els.volMusic.value / 100));
    els.volSfx.addEventListener("input", () => window.SFX.setSfx(els.volSfx.value / 100));
  }

  function refreshQuality() {
    els.qSeg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.q === window.Quality.current));
  }

  window.addEventListener("DOMContentLoaded", init);
})();
