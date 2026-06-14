// Orchestration: screens, connection, game loop, HUD.

const dollar = (id: string) => document.getElementById(id)!;
const G = window.GAME;
const buzz = (ms: number): void => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_e) { /* noop */ } };

const els = {
  canvas: dollar("game") as HTMLCanvasElement,
  hud: dollar("hud"), score: dollar("hud-score"), time: dollar("hud-time"), leaderboard: dollar("leaderboard"),
  health: dollar("healthbar"), healthfill: dollar("healthfill"), respawn: dollar("respawn"),
  start: dollar("start-screen"), name: dollar("name-input") as HTMLInputElement,
  quick: dollar("quickplay-btn") as HTMLButtonElement, friends: dollar("friends-btn") as HTMLButtonElement, status: dollar("status"),
  pause: dollar("pause-screen"), resume: dollar("resume-btn"),
  mute: dollar("mute-btn"),
  share: dollar("share-bar"), shareLink: dollar("share-link") as HTMLInputElement, copy: dollar("copy-btn"),
  inter: dollar("intermission"), finalBoard: dollar("final-board"), interTime: dollar("inter-time"),
  killfeed: dollar("killfeed"),
  touch: dollar("touch-controls"), steerPad: dollar("steer-pad"),
  left: dollar("left-btn"), right: dollar("right-btn"), boost: dollar("boost-btn"), fire: dollar("fire-btn"),
  recenter: dollar("recenter-btn"), stick: dollar("thumbstick"),
  gyroOpt: dollar("gyro-opt"), gyroCheck: dollar("gyro-check") as HTMLInputElement, kbdControls: dollar("kbd-controls"),
  touchHint: dollar("touch-controls-hint"), planeSwatches: dollar("plane-swatches"),
  winnerLine: dollar("winner-line"), yourPlace: dollar("your-place"), lbList: dollar("lb-list"),
  botsOpt: dollar("bots-opt"), botsCheck: dollar("bots-check") as HTMLInputElement,
  steerRow: dollar("steer-row"), steerSeg: dollar("steer-seg"), invertCheck: dollar("invert-check") as HTMLInputElement,
  sensRow: dollar("sens-row"), sensRange: dollar("sens-range") as HTMLInputElement,
  vignette: dollar("vignette"), rotate: dollar("rotate-overlay"),
  settingsBtn: dollar("settings-btn"), settingsPanel: dollar("settings-panel"),
  qSeg: dollar("quality-seg"), volMaster: dollar("vol-master") as HTMLInputElement, volMusic: dollar("vol-music") as HTMLInputElement, volSfx: dollar("vol-sfx") as HTMLInputElement,
  settingsClose: dollar("settings-close"), callout: dollar("callout"),
  powerChip: dollar("power-chip"),
  connLost: dollar("conn-lost"), connMsg: dollar("conn-msg"), connRetry: dollar("conn-retry"), connMenu: dollar("conn-menu"),
};

let prevPhase = "playing";
let prevHp = 100;
let streak = 0, lastKill = 0, lastFireSnd = 0;
let _powerType = "", _powerStart = 0;

let mode: "menu" | "playing" | "paused" | "lost" = "menu"; // menu | playing | paused
let menuSection: string = "main"; // immersive menu sub-state
let last = 0;
let engineStarted = false;

// Plane skins (mirror render3d's SKINS) + the player's persisted choice.
const SKINS = [0xff6b6b, 0x49c0ff, 0x8be34a, 0xffd24a, 0xc07bff];
let selectedSkin = 0;
try { const s = parseInt(localStorage.getItem("smashcart.skin"), 10); if (Number.isInteger(s) && s >= 0 && s < SKINS.length) selectedSkin = s; } catch (_e) { /* noop */ }

// Persisted options: bots on/off, steering mode (arrows|tilt).
let botsEnabled = true;
try { botsEnabled = localStorage.getItem("smashcart.bots") !== "0"; } catch (_e) { /* noop */ }
let steerMode = "arrows";
try { const m = localStorage.getItem("smashcart.steer"); if (m === "tilt" || m === "arrows" || m === "stick") steerMode = m; } catch (_e) { /* noop */ }

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
      try { localStorage.setItem("smashcart.skin", String(i)); } catch (_e) { /* noop */ }
      els.planeSwatches.querySelectorAll(".plane-swatch").forEach((el, j) => el.classList.toggle("selected", j === i));
      window.SFX.uiClick();
    });
    els.planeSwatches.appendChild(b);
  });
}

// Build plane swatches for the hangar menu panel
function buildMenuSwatches() {
  const container = document.getElementById("menu-swatches");
  if (!container) return;
  container.innerHTML = "";
  SKINS.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "swatch" + (i === selectedSkin ? " on" : "");
    b.style.background = "#" + c.toString(16).padStart(6, "0");
    b.title = "Plane " + (i + 1);
    b.addEventListener("click", () => {
      selectedSkin = i;
      try { localStorage.setItem("smashcart.skin", String(i)); } catch (_e) { /* noop */ }
      container.querySelectorAll(".swatch").forEach((el, j) => el.classList.toggle("on", j === i));
      // Also update the original swatch picker
      if (els.planeSwatches) els.planeSwatches.querySelectorAll(".plane-swatch").forEach((el, j) => el.classList.toggle("selected", j === i));
      window.SFX.uiClick();
    });
    container.appendChild(b);
  });
}

// Fetch leaderboard for the tower menu panel
function fetchMenuLeaderboard() {
  const list = document.getElementById("menu-lb");
  if (!list) return;
  fetch("/leaderboard?n=10")
    .then((r) => (r.ok ? r.json() : []))
    .then((rows) => {
      if (!Array.isArray(rows) || !rows.length) { list.innerHTML = '<p class="muted">No scores yet — be the first!</p>'; return; }
      list.innerHTML = rows.map((e: any, i: number) =>
        `<div class="lb-row"><span>${i + 1}. ${escapeHtml(e.name)}</span><span>${e.score | 0}</span></div>`
      ).join("");
    })
    .catch(() => { list.innerHTML = '<p class="muted">Leaderboard unavailable</p>'; });
}

// Immersive menu: navigate to a section (main / hangar / tower / control / comms / howto).
function setMenuSection(sec: string) {
  menuSection = sec;

  // Hide ALL menu panels first, then show the active one.
  document.querySelectorAll(".menu-panel").forEach((el) => el.classList.add("hidden"));
  const active = document.getElementById("menu-" + sec);
  if (active) active.classList.remove("hidden");

  // Control section also opens the settings panel.
  if (sec === "control") els.settingsPanel.classList.remove("hidden");
  else els.settingsPanel.classList.add("hidden");

  // Tell the 3D renderer.
  if (window.Renderer && (window.Renderer as any).setMenuSection) (window.Renderer as any).setMenuSection(sec);
  window.SFX.uiClick();
}

// Return to the main menu section from any sub-section.
function menuBack() {
  setMenuSection("main");
}

// Expose for render3d.js to call when a 3D structure is clicked.
(window as any)._menuNav = (sec: string) => setMenuSection(sec);

function genCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

function roomFromUrl() {
  const p = new URLSearchParams(location.search);
  const r = p.get("room");
  return r ? r.toUpperCase().slice(0, 6) : null;
}

async function startGame(code) {
  if (code === "PUBLIC" && !botsEnabled) code = "NOBOTS"; // bots-off Quick Play → separate no-bots bucket
  if (window.Renderer.startTakeoff) window.Renderer.startTakeoff(); // cinematic dive into the match
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

  // Hide immersive menu panels
  ["main", "hangar", "tower", "control", "comms", "howto"].forEach((s) => {
    const el = document.getElementById("menu-" + s);
    if (el) { el.classList.add("hidden"); el.style.opacity = "0"; }
  });
  if (window.Renderer && window.Renderer.hideMenu) window.Renderer.hideMenu();
  els.hud.classList.remove("hidden");
  els.health.classList.remove("hidden");

  // Mobile: activate touch controls + the chosen steering mode (arrows / stick / tilt).
  if (window.Input.isTouchDevice()) {
    els.touch.classList.remove("hidden");
    els.steerPad.classList.add("hidden"); els.stick.classList.add("hidden"); els.recenter.classList.add("hidden");
    window.Input.stickActive = (steerMode === "stick");
    if (steerMode === "tilt") {
      const ok = await window.Input.enableGyro();
      if (ok) els.recenter.classList.remove("hidden");
      else { steerMode = "arrows"; window.Input.stickActive = false; els.steerPad.classList.remove("hidden"); }
    } else if (steerMode === "stick") {
      els.stick.classList.remove("hidden");
    } else {
      els.steerPad.classList.remove("hidden");
    }
  }

  if (window.SFX.stopMenuAmbient) window.SFX.stopMenuAmbient();
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
      if (els.fire) { els.fire.classList.remove("recoil"); void els.fire.offsetWidth; els.fire.classList.add("recoil"); } // per-shot recoil
    }
    // State-reactive controls: boost glows while held, fire dims during cooldown + glows on offensive powerup.
    if (els.boost) els.boost.classList.toggle("active", !!(me && me.boosting));
    if (els.fire) {
      els.fire.classList.toggle("cooling", !!(me && me.alive && inp.fire && ts / 1000 - lastFireSnd < fireCd));
      els.fire.classList.toggle("powered", !!(me && me.power && me.power !== "shield" && me.power !== "repair"));
    }
  } else if (mode === "menu") {
    // Living menu: render the orbiting home-base scene (your chosen plane) behind the overlay.
    window.Renderer.drawMenu(dt, selectedSkin);
  } else if (room && room.state) {
    // Paused: still draw the frozen scene.
    window.Renderer.draw(room.state, window.Net.sessionId);
  }
}

function updateHud(state, myId) {
  const me = state.players.get(myId);
  els.score.textContent = String(me ? me.score : 0);
  els.time.textContent = String(Math.ceil(state.timeLeft));

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
    els.interTime.textContent = String(Math.ceil(state.timeLeft));
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
  // Start menu ambient audio
  try { window.SFX.unlock(); if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient(); } catch (_e) {}

  // Initialize immersive menu to main section
  setMenuSection("main");

  // Quality tier: apply class for CSS3D low-tier fallback
  const applyQualityClass = () => {
    document.body.classList.toggle("quality-low", window.Quality.current === "low");
  };
  window.Quality.onChange(applyQualityClass);
  applyQualityClass();

  const urlCode = roomFromUrl();
  if (urlCode) {
    els.status.textContent = "Joining room " + urlCode;
    els.quick.textContent = "JOIN ROOM " + urlCode;
  }

  els.quick.addEventListener("click", () => { window.SFX.uiClick(); startGame(urlCode || "PUBLIC"); });
  els.friends.addEventListener("click", () => { window.SFX.uiClick(); startGame(genCode()); });

  // Immersive menu: section navigation buttons (.nav-btn[data-section] + .menu-link[data-section])
  const navHandler = (btn: Element) => {
    btn.addEventListener("click", () => {
      const sec = (btn as HTMLElement).dataset.section;
      if (sec) { window.SFX.uiClick(); setMenuSection(sec); }
    });
  };
  document.querySelectorAll(".nav-btn[data-section]").forEach(navHandler);
  document.querySelectorAll(".menu-link[data-section]").forEach(navHandler);

  // Wire CSS3D menu-panel buttons
  const menuQP = document.getElementById("menu-quickplay");
  if (menuQP) menuQP.addEventListener("click", () => { window.SFX.uiClick(); startGame(urlCode || "PUBLIC"); });
  const menuFr = document.getElementById("menu-friends");
  if (menuFr) menuFr.addEventListener("click", () => { window.SFX.uiClick(); startGame(genCode()); });
  const menuName = document.getElementById("menu-name") as HTMLInputElement | null;
  if (menuName) {
    menuName.addEventListener("input", () => { els.name.value = menuName.value; });
    menuName.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); startGame(urlCode || "PUBLIC"); } });
    els.name.addEventListener("input", () => { menuName.value = els.name.value; });
    menuName.value = els.name.value;
  }
  buildMenuSwatches();
  fetchMenuLeaderboard();
  // Quality segment in control panel
  document.querySelectorAll("#menu-quality-seg button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = (btn as HTMLElement).dataset.q;
      if (q) { window.Quality.set(q); window.SFX.uiClick(); }
    });
  });
  // Volume sliders in control panel → mirror to the main settings
  const mVol = document.getElementById("menu-vol") as HTMLInputElement | null;
  const mMusic = document.getElementById("menu-vol-music") as HTMLInputElement | null;
  const mSfx = document.getElementById("menu-vol-sfx") as HTMLInputElement | null;
  if (mVol) mVol.addEventListener("input", () => { els.volMaster.value = mVol.value; els.volMaster.dispatchEvent(new Event("input")); });
  if (mMusic) mMusic.addEventListener("input", () => { els.volMusic.value = mMusic.value; els.volMusic.dispatchEvent(new Event("input")); });
  if (mSfx) mSfx.addEventListener("input", () => { els.volSfx.value = mSfx.value; els.volSfx.dispatchEvent(new Event("input")); });

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
  // Tactile feedback driven from the REAL pressed-state (pointer events), not CSS :active.
  const hold = (el, on) => {
    const set = (v) => (e) => { e.preventDefault(); on(v); el.classList.toggle("pressed", v); if (v) buzz(8); };
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

  // Virtual thumbstick: drag X → analog turn (centre dead-zone, recenters on release).
  if (els.stick) {
    const knob = els.stick.querySelector(".knob") as HTMLElement | null;
    let active = false, cx = 0, half = 1;
    const apply = (clientX) => {
      let dx = Math.max(-1, Math.min(1, (clientX - cx) / half));
      window.Input.touch.stick = Math.abs(dx) < 0.12 ? 0 : dx; // dead-zone
      if (knob) knob.style.transform = `translateX(${dx * half * 0.55}px)`;
    };
    els.stick.addEventListener("pointerdown", (e) => {
      e.preventDefault(); active = true; els.stick.classList.add("pressed"); buzz(8);
      const r = els.stick.getBoundingClientRect(); cx = r.left + r.width / 2; half = r.width / 2;
      apply(e.clientX);
    });
    window.addEventListener("pointermove", (e) => { if (active) apply(e.clientX); });
    const end = () => { if (!active) return; active = false; window.Input.touch.stick = 0; if (knob) knob.style.transform = "translateX(0)"; els.stick.classList.remove("pressed"); };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }
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
  try { window.Net.leave(); } catch (_e) { /* noop */ }
  if (window.SFX.stopLoops) window.SFX.stopLoops();
  if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient();
  mode = "menu"; engineStarted = false;
  window.Input.stickActive = false;
  ["hud", "health", "touch", "steerPad", "stick", "recenter", "share", "inter", "pause", "powerChip", "connLost"].forEach((k) => els[k] && els[k].classList.add("hidden"));
  els.quick.disabled = els.friends.disabled = false;
  els.status.textContent = "";
  // Show immersive menu (reset to main section)
  if (window.Renderer && window.Renderer.showMenu) window.Renderer.showMenu();
  setMenuSection("main");
  // Menu ambient: start music when returning to menu
  if (window.SFX && window.SFX.startMusic) window.SFX.startMusic();
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
  const req = el.requestFullscreen || (el as any).webkitRequestFullscreen || (el as any).msRequestFullscreen;
  if (req) { try { const r = req.call(el); if (r && r.catch) r.catch(() => {}); } catch (_e) { /* noop */ } }
  if (screen.orientation && (screen.orientation as any).lock) {
    try { const r = (screen.orientation as any).lock("landscape"); if (r && r.catch) r.catch(() => {}); } catch (_e) { /* noop */ }
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
  els.volMaster.value = String(Math.round(v.master * 100));
  els.volMusic.value = String(Math.round(v.music * 100));
  els.volSfx.value = String(Math.round(v.sfx * 100));
  els.volMaster.addEventListener("input", () => window.SFX.setMaster(parseInt(els.volMaster.value, 10) / 100));
  els.volMusic.addEventListener("input", () => window.SFX.setMusic(parseInt(els.volMusic.value, 10) / 100));
  els.volSfx.addEventListener("input", () => window.SFX.setSfx(parseInt(els.volSfx.value, 10) / 100));
}

// Bots toggle + in-game control settings (steering mode / invert / sensitivity), all persisted.
function setupControls() {
  if (!window.Input.gyro.supported && steerMode === "tilt") steerMode = "arrows";

  if (els.botsCheck) {
    els.botsCheck.checked = botsEnabled;
    els.botsCheck.addEventListener("change", () => {
      botsEnabled = els.botsCheck.checked;
      try { localStorage.setItem("smashcart.bots", botsEnabled ? "1" : "0"); } catch (_e) { /* noop */ }
      window.SFX.uiClick();
    });
  }

  // Invert steering — applies to every input source, takes effect immediately.
  try { window.Input.invertSteer = localStorage.getItem("smashcart.invert") === "1"; } catch (_e) { /* noop */ }
  if (els.invertCheck) {
    els.invertCheck.checked = window.Input.invertSteer;
    els.invertCheck.addEventListener("change", () => {
      window.Input.invertSteer = els.invertCheck.checked;
      try { localStorage.setItem("smashcart.invert", window.Input.invertSteer ? "1" : "0"); } catch (_e) { /* noop */ }
      window.SFX.uiClick();
    });
  }

  // Sensitivity (gyro/turn) — live.
  let sens = 100;
  try { const s = parseInt(localStorage.getItem("smashcart.sens") || "", 10); if (s >= 50 && s <= 200) sens = s; } catch (_e) { /* noop */ }
  window.Input.setGyroSensitivity(sens / 100);
  if (els.sensRange) {
    els.sensRange.value = String(sens);
    els.sensRange.addEventListener("input", () => {
      window.Input.setGyroSensitivity(parseInt(els.sensRange!.value, 10) / 100);
      try { localStorage.setItem("smashcart.sens", String(els.sensRange.value)); } catch (_e) { /* noop */ }
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
  steerMode = (m === "tilt" || m === "stick") ? m : "arrows";
  try { localStorage.setItem("smashcart.steer", steerMode); } catch (_e) { /* noop */ }
  const reflect = () => {
    if (els.steerSeg) els.steerSeg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.steer === steerMode));
    if (els.gyroCheck) els.gyroCheck.checked = steerMode === "tilt";
  };
  reflect();
  window.Input.stickActive = (steerMode === "stick");
  if (mode === "playing" && window.Input.isTouchDevice()) {
    els.steerPad.classList.add("hidden"); els.stick.classList.add("hidden"); els.recenter.classList.add("hidden");
    if (steerMode === "tilt") {
      const ok = await window.Input.enableGyro();
      if (ok) els.recenter.classList.remove("hidden");
      else { steerMode = "arrows"; window.Input.stickActive = false; reflect(); }
    } else { window.Input.disableGyro(); }
    if (steerMode === "stick") els.stick.classList.remove("hidden");
    if (steerMode === "arrows") els.steerPad.classList.remove("hidden");
  }
}

function refreshQuality() {
  els.qSeg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.q === window.Quality.current));
}

window.addEventListener("DOMContentLoaded", init);