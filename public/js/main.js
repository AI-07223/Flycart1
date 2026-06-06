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
    touchHint: $("touch-controls-hint"), planeSwatches: $("plane-swatches"),
    winnerLine: $("winner-line"), yourPlace: $("your-place"), lbList: $("lb-list"),
    botsOpt: $("bots-opt"), botsCheck: $("bots-check"),
    steerRow: $("steer-row"), steerSeg: $("steer-seg"), invertCheck: $("invert-check"),
    sensRow: $("sens-row"), sensRange: $("sens-range"),
    vignette: $("vignette"), rotate: $("rotate-overlay"),
    settingsBtn: $("settings-btn"), settingsPanel: $("settings-panel"),
    qSeg: $("quality-seg"), volMaster: $("vol-master"), volMusic: $("vol-music"), volSfx: $("vol-sfx"),
    settingsClose: $("settings-close"), callout: $("callout"),
    powerChip: $("power-chip"),
    connLost: $("conn-lost"), connMsg: $("conn-msg"), connRetry: $("conn-retry"), connMenu: $("conn-menu"),
  };

  let prevPhase = "playing";
  let prevHp = 100;
  let streak = 0, lastKill = 0, lastFireSnd = 0;
  let powerType = "", powerStart = 0;

  let mode = "menu"; // menu | playing | paused
  let last = 0;
  let engineStarted = false;

  // Plane skins (mirror render3d's SKINS) + the player's persisted choice.
  const SKINS = [0xff6b6b, 0x49c0ff, 0x8be34a, 0xffd24a, 0xc07bff];
  let selectedSkin = 0;
  try { const s = parseInt(localStorage.getItem("smashcart.skin"), 10); if (Number.isInteger(s) && s >= 0 && s < SKINS.length) selectedSkin = s; } catch (e) {}

  // Persisted options: bots on/off, steering mode (arrows|tilt).
  let botsEnabled = true;
  try { botsEnabled = localStorage.getItem("smashcart.bots") !== "0"; } catch (e) {}
  let steerMode = "arrows";
  try { const m = localStorage.getItem("smashcart.steer"); if (m === "tilt" || m === "arrows") steerMode = m; } catch (e) {}

  // Fetch + render the global leaderboard on the menu; degrade gracefully on error.
  function fetchLeaderboard() {
    if (!els.lbList) return;
    fetch("/leaderboard?n=10")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (!Array.isArray(rows) || !rows.length) { els.lbList.innerHTML = '<li class="muted">No scores yet — be the first!</li>'; return; }
        els.lbList.innerHTML = rows.map((e, i) =>
          `<li><span>${i + 1}. ${escapeHtml(e.name)}</span><span>${e.score | 0}</span></li>`
        ).join("");
      })
      .catch(() => { els.lbList.innerHTML = '<li class="muted">Leaderboard unavailable</li>'; });
  }

  function buildPlanePicker() {
    if (!els.planeSwatches) return;
    els.planeSwatches.innerHTML = "";
    SKINS.forEach((c, i) => {
      const b = document.createElement("button");
      b.className = "plane-swatch" + (i === selectedSkin ? " selected" : "");
      b.style.background = "#" + c.toString(16).padStart(6, "0");
      b.title = "Plane " + (i + 1);
      b.addEventListener("click", () => {
        selectedSkin = i;
        try { localStorage.setItem("smashcart.skin", String(i)); } catch (e) {}
        els.planeSwatches.querySelectorAll(".plane-swatch").forEach((el, j) => el.classList.toggle("selected", j === i));
        window.SFX.uiClick();
      });
      els.planeSwatches.appendChild(b);
    });
  }

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
    if (code === "PUBLIC" && !botsEnabled) code = "NOBOTS"; // bots-off Quick Play → separate no-bots bucket
    window.SFX.unlock();
    enterImmersive(); // fullscreen + landscape lock (must run inside the click gesture)
    const name = (els.name.value || "Pilot").slice(0, 14);
    els.status.textContent = "Connecting…";
    els.quick.disabled = els.friends.disabled = true;
    try {
      await window.Net.connect(name, code, selectedSkin);
    } catch (e) {
      els.status.textContent = "Could not connect: " + (e && e.message ? e.message : e);
      els.quick.disabled = els.friends.disabled = false;
      return;
    }

    els.start.classList.add("hidden");
    els.hud.classList.remove("hidden");
    els.health.classList.remove("hidden");

    // Mobile: activate touch controls and (optionally) gyro steering per the chosen steer mode.
    if (window.Input.isTouchDevice()) {
      els.touch.classList.remove("hidden");
      let gyroOn = false;
      if (steerMode === "tilt") gyroOn = await window.Input.enableGyro();
      if (gyroOn) {
        els.recenter.classList.remove("hidden"); // tilt steers; show recenter
      } else {
        steerMode = "arrows";
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
      // Fire SFX cadence (matches the server cooldown, incl. rapid-fire).
      const fireCd = (G.FIRE_COOLDOWN || 0.22) * (me && me.power === "rapid" ? (G.RAPID_FACTOR || 0.45) : 1);
      if (me && me.alive && inp.fire && ts / 1000 - lastFireSnd > fireCd) {
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

      // Active-powerup chip — driven by the server-authoritative remaining time.
      if (me.power) {
        const info = G.POWERUPS[me.power] || { label: me.power, icon: "★", color: 0xffffff };
        const left = (typeof me.powerLeft === "number") ? me.powerLeft : G.POWERUP_DURATION;
        const pct = Math.max(0, Math.min(100, (left / G.POWERUP_DURATION) * 100));
        const hex = "#" + info.color.toString(16).padStart(6, "0");
        els.powerChip.classList.remove("hidden");
        els.powerChip.innerHTML = `<span class="pc-label">${info.icon} ${escapeHtml(info.label)}</span><span class="pc-bar"><span class="pc-fill" style="width:${pct}%;background:${hex}"></span></span>`;
      } else {
        els.powerChip.classList.add("hidden");
      }
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

    // Intermission scoreboard / round-over results.
    if (state.phase === "intermission") {
      els.inter.classList.remove("hidden");
      els.interTime.textContent = Math.ceil(state.timeLeft);
      const winner = list[0];
      if (els.winnerLine) els.winnerLine.textContent = winner ? (winner.id === myId ? "🏆 You win!" : "🏆 " + winner.name + " wins!") : "";
      els.finalBoard.innerHTML = list.slice(0, 6).map((p, i) =>
        `<li class="${p.id === myId ? "me" : ""}${i === 0 ? " win" : ""}"><span>${i + 1}. ${escapeHtml(p.name)}${p.bot ? " 🤖" : ""}</span><span>${p.score}</span></li>`
      ).join("");
      if (els.yourPlace) {
        const myIdx = list.findIndex((p) => p.id === myId);
        els.yourPlace.textContent = myIdx >= 0 ? `You placed ${ordinal(myIdx + 1)} of ${list.length}` : "";
      }
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

  // Powerup grabbed (server "pickup" event) — feedback only for the local player.
  function onPickup(msg) {
    if (!window.Net || msg.by !== window.Net.sessionId) return;
    window.SFX.pickup();
    const info = G.POWERUPS[msg.type];
    showCallout((info ? info.icon + " " + info.label : "POWERUP") + "!");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // ---------- wiring ----------
  function init() {
    window.Renderer.init(els.canvas);
    window.Input.attach();
    window.Assets.load();

    window.Net.onKill = onKill;
    window.Net.onPickup = onPickup;
    window.Net.onDisconnect = onDisconnect;

    // Show mobile options on touch devices and pick the right How-to-Play block
    // (touch instructions on touch, keyboard on desktop — never blank).
    if (window.Input.isTouchDevice()) {
      els.gyroOpt.classList.remove("hidden");
      els.kbdControls.classList.add("hidden");
      if (els.touchHint) els.touchHint.classList.remove("hidden");
      if (!window.Input.gyro.supported) els.gyroCheck.checked = false;
    }
    buildPlanePicker();
    fetchLeaderboard();
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
    setupControls();

    window.Input.onPause = () => { if (mode !== "menu") togglePause(); };
    window.Input.onMute = () => toggleMute();

    window.addEventListener("orientationchange", updateRotateOverlay);
    window.addEventListener("resize", updateRotateOverlay);
    updateRotateOverlay();

    els.connMenu.addEventListener("click", () => resetToMenu());
    els.connRetry.addEventListener("click", () => {
      els.connMsg.textContent = "Reconnecting…"; els.connRetry.classList.add("hidden");
      window.Net.tryReconnect().then((ok) => {
        if (ok) { els.connLost.classList.add("hidden"); if (window.SFX.resume) window.SFX.resume(); mode = "playing"; }
        else { els.connMsg.textContent = "Still down."; els.connRetry.classList.remove("hidden"); }
      });
    });

    // Park input + quiet audio when the tab is hidden; resume on return.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { if (window.Net.room) window.Net.sendInput(0, false, false); if (window.SFX.suspend) window.SFX.suspend(); }
      else if (mode === "playing" && window.SFX.resume) window.SFX.resume();
    });
    window.addEventListener("pagehide", () => { if (window.Net.room) window.Net.sendInput(0, false, false); });

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
    if (mode === "playing") {
      mode = "paused";
      els.pause.classList.remove("hidden");
      window.SFX.setEngine(0, false);
      if (window.Net.room) window.Net.sendInput(0, false, false); // park input — server keeps flying you, so at least don't steer/fire
    } else if (mode === "paused") {
      mode = "playing"; els.pause.classList.add("hidden");
    }
  }

  function toggleMute() {
    const m = window.SFX.toggleMute();
    els.mute.textContent = m ? "🔇" : "🔊";
  }

  // Clean transition back to the main menu (used on disconnect + manual leave).
  function resetToMenu() {
    try { window.Net.leave(); } catch (e) {}
    if (window.SFX.stopLoops) window.SFX.stopLoops();
    mode = "menu"; engineStarted = false; powerType = ""; prevPhase = "playing"; prevHp = 100; streak = 0; lastFireSnd = 0;
    ["hud", "health", "touch", "steerPad", "recenter", "share", "inter", "pause", "powerChip", "connLost"].forEach((k) => els[k] && els[k].classList.add("hidden"));
    els.quick.disabled = els.friends.disabled = false;
    els.status.textContent = "";
    els.start.classList.remove("hidden");
    fetchLeaderboard(); // refresh standings after a game
    updateRotateOverlay();
  }

  // Unexpected disconnect (redeploy, network blip): try one reconnect, else offer the menu.
  function onDisconnect() {
    if (mode === "menu") return;
    mode = "lost";
    if (window.SFX.suspend) window.SFX.suspend();
    els.connMsg.textContent = "Reconnecting…";
    els.connRetry.classList.add("hidden");
    els.connLost.classList.remove("hidden");
    window.Net.tryReconnect().then((ok) => {
      if (mode !== "lost") return;
      if (ok) { els.connLost.classList.add("hidden"); if (window.SFX.resume) window.SFX.resume(); mode = "playing"; }
      else { els.connMsg.textContent = "Couldn't reconnect."; els.connRetry.classList.remove("hidden"); }
    });
  }

  // Go full-screen + lock landscape (best-effort; ignored where unsupported,
  // e.g. iOS has no orientation lock — the rotate overlay covers that case).
  function enterImmersive() {
    if (!window.Input.isTouchDevice()) { updateRotateOverlay(); return; } // desktop already fills the viewport via CSS
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

  // Bots toggle + in-game control settings (steering mode / invert / sensitivity), all persisted.
  function setupControls() {
    if (!window.Input.gyro.supported && steerMode === "tilt") steerMode = "arrows";

    if (els.botsCheck) {
      els.botsCheck.checked = botsEnabled;
      els.botsCheck.addEventListener("change", () => {
        botsEnabled = els.botsCheck.checked;
        try { localStorage.setItem("smashcart.bots", botsEnabled ? "1" : "0"); } catch (e) {}
        window.SFX.uiClick();
      });
    }

    // Invert steering — applies to every input source, takes effect immediately.
    try { window.Input.invertSteer = localStorage.getItem("smashcart.invert") === "1"; } catch (e) {}
    if (els.invertCheck) {
      els.invertCheck.checked = window.Input.invertSteer;
      els.invertCheck.addEventListener("change", () => {
        window.Input.invertSteer = els.invertCheck.checked;
        try { localStorage.setItem("smashcart.invert", window.Input.invertSteer ? "1" : "0"); } catch (e) {}
        window.SFX.uiClick();
      });
    }

    // Sensitivity (gyro/turn) — live.
    let sens = 100;
    try { const s = parseInt(localStorage.getItem("smashcart.sens"), 10); if (s >= 50 && s <= 200) sens = s; } catch (e) {}
    window.Input.setGyroSensitivity(sens / 100);
    if (els.sensRange) {
      els.sensRange.value = sens;
      els.sensRange.addEventListener("input", () => {
        window.Input.setGyroSensitivity(els.sensRange.value / 100);
        try { localStorage.setItem("smashcart.sens", String(els.sensRange.value)); } catch (e) {}
      });
    }

    // Steering-mode segmented control (touch) + keep the menu gyro checkbox in sync.
    if (els.steerSeg) {
      els.steerSeg.querySelectorAll("button").forEach((b) => {
        b.classList.toggle("active", b.dataset.steer === steerMode);
        b.addEventListener("click", () => { window.SFX.uiClick(); applySteerMode(b.dataset.steer); });
      });
    }
    if (els.gyroCheck) {
      els.gyroCheck.checked = steerMode === "tilt";
      els.gyroCheck.addEventListener("change", () => applySteerMode(els.gyroCheck.checked ? "tilt" : "arrows"));
    }

    // On non-touch devices hide the touch-only rows; invert still applies to keyboard.
    if (!window.Input.isTouchDevice()) {
      if (els.steerRow) els.steerRow.classList.add("hidden");
      if (els.sensRow) els.sensRow.classList.add("hidden");
    }
  }

  // Set steering mode; if changed mid-match on a touch device, switch gyro/arrows live.
  async function applySteerMode(m) {
    steerMode = (m === "tilt") ? "tilt" : "arrows";
    try { localStorage.setItem("smashcart.steer", steerMode); } catch (e) {}
    const reflect = () => {
      if (els.steerSeg) els.steerSeg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.steer === steerMode));
      if (els.gyroCheck) els.gyroCheck.checked = steerMode === "tilt";
    };
    reflect();
    if (mode === "playing" && window.Input.isTouchDevice()) {
      if (steerMode === "tilt") {
        const ok = await window.Input.enableGyro();
        if (ok) { els.recenter.classList.remove("hidden"); els.steerPad.classList.add("hidden"); }
        else { steerMode = "arrows"; reflect(); }
      }
      if (steerMode === "arrows") {
        window.Input.disableGyro();
        els.recenter.classList.add("hidden");
        els.steerPad.classList.remove("hidden");
      }
    }
  }

  function refreshQuality() {
    els.qSeg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.q === window.Quality.current));
  }

  window.addEventListener("DOMContentLoaded", init);
})();
