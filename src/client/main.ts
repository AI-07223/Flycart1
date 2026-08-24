// Orchestration: boot flow, network wiring, HUD, and the render loop for the
// flat-world local-only build. All menu screens (home / join / hangar /
// settings / lobby / pause) live in menu.ts — this file reacts to menu events,
// drives net-ws, and keeps the in-game systems running.
import { WsTransport } from "./net-ws";
import { registerServiceWorker, requestAppFullscreen, exitAppFullscreen, keepAwake, releaseAwake } from "./appshell";
import {
  mountScreens,
  showScreen,
  navBack,
  resetToHome as menuResetToHome,
  currentScreenId,
  applyInitialHash,
  setBusy,
  setStatus,
  renderLobby,
  invalidateLobbyCache,
  setLobbyQr,
  showPause,
  hidePause,
  loadStoredControlPrefs,
  getCosmetics,
  getPilotName,
  MENU_HOST_ID,
  type MenuHandlers,
} from "./menu";

const dollar = (id: string) => document.getElementById(id)!;

// Single transport for the local-only build: one raw WebSocket to the game
// server that serves this page. Assigned to window.Net exactly once at boot.
export const net = new WsTransport();
(window as any).Net = net;

const G = window.GAME;
const buzz = (ms: number): void => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch {} };

const els = {
  canvas: dollar("game") as HTMLCanvasElement,
  hud: dollar("hud"),
  score: dollar("hud-score"),
  time: dollar("hud-time"),
  alt: dollar("hud-alt"),
  speed: dollar("hud-speed"),
  boostFill: dollar("boost-fill"),
  crosshair: dollar("crosshair"),
  oobWarning: dollar("oob-warning"),
  leaderboard: dollar("leaderboard"),
  health: dollar("healthbar"),
  healthfill: dollar("healthfill"),
  respawn: dollar("respawn"),
  start: dollar(MENU_HOST_ID),
  mute: dollar("mute-btn") as HTMLButtonElement,
  inter: dollar("intermission"),
  finalBoard: dollar("final-board"),
  interTime: dollar("inter-time"),
  winnerLine: dollar("winner-line"),
  yourPlace: dollar("your-place"),
  killfeed: dollar("killfeed"),
  callout: dollar("callout"),
  vignette: dollar("vignette"),
  powerChip: dollar("power-chip"),
  touch: dollar("touch-controls"),
  left: dollar("left-btn"),
  right: dollar("right-btn"),
  climb: dollar("climb-btn"),
  dive: dollar("dive-btn"),
  boost: dollar("boost-btn"),
  fire: dollar("fire-btn"),
  rotate: dollar("rotate-overlay"),
  countdown: dollar("countdown"),
  interLeave: dollar("intermission-leave") as HTMLButtonElement,
  ingameMenuBtn: dollar("ingame-menu-btn") as HTMLButtonElement,
  toast: dollar("toast"),
  hudTeamScore: dollar("hud-team-score"),
  hudTeamBlue: dollar("hud-team-blue"),
  hudTeamRed: dollar("hud-team-red"),
  hudTScore0: dollar("hud-tscore0"),
  hudTScore1: dollar("hud-tscore1"),
  bootOverlay: dollar("boot-overlay"),
  fatalOverlay: dollar("fatal-overlay"),
  fatalMsg: dollar("fatal-msg"),
};

type SceneMode = "preflight" | "customize" | "lobby" | "results" | "playing" | "paused";

let mode: "menu" | "lobby" | "playing" | "paused" | "error" = "menu";
let sceneMode: SceneMode = "preflight";
let last = 0;
let prevPhase = "lobby";
let prevHp = G.MAX_HP;
let lastFireSnd = 0;
let wasEmpd = false;
let wasFrozen = false;

// ── Smash-tracking state ─────────────────────────────────────────────────────
const smashTrack = new Map<string, { streak: number; last: number; rapid: number }>();
function getTrack(id: string): { streak: number; last: number; rapid: number } {
  let t = smashTrack.get(id);
  if (!t) { t = { streak: 0, last: 0, rapid: 0 }; smashTrack.set(id, t); }
  return t;
}

let lastKiller = "";
let prevLeader = "";
let engineStarted = false;
let deathTime: number = -1;
let wasAlive = true;
let oobShownUntil = 0;
let boostLevel = 0;
let countdownActive = false;

const ICON_SND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
const ICON_SND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6"/><path d="m17 9 6 6"/></svg>';

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.ceil(totalSeconds || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// ─── SCENE MODE SYNC ─────────────────────────────────────────────────────────

function deriveSceneMode(state: any = window.Net?.state): SceneMode {
  if (mode === "menu") return currentScreenId() === "hangar" ? "customize" : "preflight";
  if (mode === "lobby") return "lobby";
  if (mode === "paused") return "paused";
  if (mode === "playing") return state && state.phase === "intermission" ? "results" : "playing";
  return "preflight";
}

function syncSceneMode(state: any = window.Net?.state): void {
  const next = deriveSceneMode(state);
  if (sceneMode === next && document.body.dataset.sceneMode === next) return;
  sceneMode = next;
  document.body.dataset.sceneMode = next;
  if (window.Renderer && window.Renderer.setSceneMode) window.Renderer.setSceneMode(next);
}

// ─── TOP-LEVEL MODE SWITCH ───────────────────────────────────────────────────
// applyMode() is the single source of truth for which top-level layers are
// visible. Menu screens inside #arcade-start-screen are managed by menu.ts.

function applyMode(nextMode: typeof mode): void {
  mode = nextMode;

  // The menu host carries the pause overlay too, so it stays visible while
  // paused — only the router (menu screens) is hidden behind the overlay.
  const inFlight = mode === "playing" || mode === "paused";
  const showHost = mode !== "playing" && mode !== "error";
  els.bootOverlay.classList.add("hidden");
  els.start.classList.toggle("hidden", !showHost);
  els.start.classList.toggle("sc-paused-host", mode === "paused");
  document.body.classList.toggle("sc-menu-open", showHost);
  els.hud.classList.toggle("hidden", !inFlight);
  els.health.classList.toggle("hidden", !inFlight);
  els.crosshair.classList.toggle("hidden", mode !== "playing");
  els.fatalOverlay.classList.toggle("hidden", mode !== "error");
  if (mode !== "playing") {
    els.oobWarning.classList.add("hidden");
    els.respawn.classList.add("hidden");
    els.powerChip.classList.add("hidden");
  }
  if (!inFlight) els.touch.classList.add("hidden");
  syncSceneMode(window.Net?.state);
}

function showFatal(msg: string): void {
  els.fatalMsg.textContent = msg;
  applyMode("error");
}

// ─── CONNECT FLOWS ───────────────────────────────────────────────────────────
// Create and join are the same operation against a single-room server:
// one WebSocket to whoever served this page. `serverOrigin` is only non-null
// when joining via the join screen (smashcart.local hit or manual address).

async function connectAndEnterLobby(serverOrigin: string | null): Promise<void> {
  window.SFX.unlock();

  let name = getPilotName().trim().slice(0, 14);
  if (!name) name = "Pilot";

  net.onKill = onKill;
  net.onPickup = onPickup;
  net.onDisconnect = onDisconnect;
  net.onStateChange = onNetStateChange;

  setBusy(true);
  setStatus(serverOrigin ? `Connecting to ${serverOrigin}…` : "Opening room…", serverOrigin ? "join" : "home");

  try {
    await net.connect(name, "local", getCosmetics(), serverOrigin);
  } catch (e: any) {
    setBusy(false);
    setStatus("Could not connect: " + (e && e.message ? e.message : e), serverOrigin ? "join" : "home");
    return;
  }

  setBusy(false);
  setStatus("", serverOrigin ? "join" : "home");

  // The room may already be mid-match (late join). Land accordingly.
  const phase = net.getPhase();
  if (phase === "playing") {
    enterPlayingFromNet();
    return;
  }
  enterLobby();
}

function enterLobby(): void {
  invalidateLobbyCache();
  renderLobbyFromNet();
  drawLobbyQr();
  applyMode("lobby");
  showScreen("lobby");
}

function drawLobbyQr(): void {
  let url = location.origin + location.pathname;
  try {
    const u = new URL(location.href);
    u.hash = "";
    url = u.toString();
  } catch {}
  setLobbyQr(url);
}

function renderLobbyFromNet(): void {
  const state = window.Net.state;
  if (!state) return;
  renderLobby({
    roomName: state.roomName || "",
    roundLength: typeof state.roundLength === "number" ? state.roundLength : 150,
    botsInRoom: !!state.botsInRoom,
    botDifficulty: state.botDifficulty || "medium",
    leaderId: state.hostId || "",
    myId: window.Net.sessionId,
    roster: window.Net.getRosterSnapshot(),
  });
}

// ─── LOBBY → PLAYING TRANSITION ──────────────────────────────────────────────

function resetCombatTrackers(): void {
  prevPhase = "playing";
  prevHp = G.MAX_HP;
  wasAlive = true;
  deathTime = -1;
  wasEmpd = false;
  wasFrozen = false;
  smashTrack.clear();
  lastKiller = "";
  prevLeader = "";
  boostLevel = 0;
  oobShownUntil = 0;
}

function enterImmersive(): void {
  requestAppFullscreen();
  keepAwake();
}

function exitImmersive(): void {
  releaseAwake();
  exitAppFullscreen();
}

function enterPlayingFromNet(): void {
  resetCombatTrackers();
  applyMode("playing");
  enterImmersive();
  if (window.Input.isTouchDevice()) {
    els.touch.classList.remove("hidden");
    applyControlSchemeUI(window.Input.controlScheme);
  }
  if (!engineStarted) {
    window.SFX.startEngine();
    engineStarted = true;
  }
  if (window.SFX.stopMenuAmbient) window.SFX.stopMenuAmbient();
  window.SFX.startMusic();
  runCountdown();
}

function togglePause(): void {
  if (mode === "playing") {
    applyMode("paused");
    showPause();
    window.Net.sendInput(0, 0, false, false);
    window.SFX.setEngine(0, false);
  } else if (mode === "paused") {
    hidePause();
    applyMode("playing");
  }
}

/** Leave Match (pause) or Leave (lobby) or intermission Main Menu. */
function leaveMatch(reason?: string): void {
  hidePause();
  window.Net.onStateChange = null;
  try { window.Net.leave(); } catch {}
  resetToHome(reason);
}

/** Full teardown back to HOME. Safe to call from any mode. */
function resetToHome(statusMsg?: string): void {
  hidePause();
  exitImmersive();
  if (window.SFX.stopLoops) window.SFX.stopLoops();
  if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient();
  engineStarted = false;

  // Reset gameplay HUD state.
  wasAlive = true;
  deathTime = -1;
  lastKiller = "";
  prevLeader = "";
  smashTrack.clear();
  countdownActive = false;
  boostLevel = 0;
  oobShownUntil = 0;
  els.countdown.classList.remove("pop", "go");
  els.countdown.textContent = "";
  els.time.classList.remove("low");
  els.inter.classList.add("hidden");
  els.respawn.classList.add("hidden");
  els.powerChip.classList.add("hidden");
  els.hudTeamScore.classList.add("hidden");

  prevPhase = "lobby";
  applyMode("menu");
  menuResetToHome();
  if (statusMsg) setStatus(statusMsg, "home");
  updateRotateOverlay();
}

function onDisconnect(info?: any): void {
  if (mode === "error" || mode === "menu") return;
  const kicked = !!(info && (info.type === "kicked" || info.reason === "kicked"));
  const msg = kicked
    ? "You were kicked by the room leader."
    : "Disconnected from the room.";
  leaveMatch(msg);
  pushToast(msg, "leader");
}

// ─── NET STATE STREAM ────────────────────────────────────────────────────────

function onNetStateChange(): void {
  if (mode !== "lobby") return;
  renderLobbyFromNet();
  const phase = window.Net.getPhase();
  if (phase === "playing") {
    // Leader pressed PLAY (or auto-start fired) — everyone enters the match.
    enterPlayingFromNet();
  }
}

// ─── RENDER LOOP ─────────────────────────────────────────────────────────────

function loop(ts: number): void {
  requestAnimationFrame(loop);
  let dt = (ts - last) / 1000;
  last = ts;
  if (!isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 0.05);

  const state = window.Net.state;
  syncSceneMode(state);
  if (mode === "playing" && state) {
    const myId = window.Net.sessionId;
    const input = window.Input.get();
    window.Net.sendInput(input.turn, input.climb, input.boost, input.fire);
    window.Net.stepLocal(dt);
    // Adaptive quality watchdog — only runs when tier is 'auto' (Quality._auto)
    window.Quality.sample(dt);

    window.Renderer.sync(state, dt, myId);
    window.Renderer.draw(state, myId);
    updateHud(state, myId);

    const me = state.players.get(myId);
    if (me && engineStarted) {
      window.SFX.setEngine(me.boosting ? 1 : 0.5, !!me.boosting);
      const fireCd = G.FIRE_COOLDOWN * (me.power === "rapid" ? G.RAPID_FACTOR : 1);
      if (me.alive && input.fire && ts / 1000 - lastFireSnd > fireCd) {
        window.SFX.fire();
        lastFireSnd = ts / 1000;
      }
    }
  } else if (mode === "lobby" && state) {
    // Draw the live arena behind the lobby card; no input is sent.
    window.Renderer.draw(state, window.Net.sessionId);
  } else if (mode === "menu") {
    window.Renderer.drawMenu(dt, getCosmetics());
  } else if (state) {
    window.Renderer.draw(state, window.Net.sessionId);
  }
}

function updateHud(state: any, myId: string): void {
  const me = state.players.get(myId);
  const local = (window.Net as any).localPose;
  els.score.textContent = String(me ? me.score : 0);
  els.time.textContent = formatClock(state.timeLeft);
  const altitude = local && local.active ? local.p.y : me ? me.py : 0;
  const speed = local && local.active ? local.speed : me ? me.speed : 0;
  els.alt.textContent = String(Math.round(altitude));
  els.speed.textContent = String(Math.round(speed));

  // Boost indicator: read current frame's boost input state
  const inputNow = window.Input.get();
  const isBoosting = inputNow.boost;
  const boostTarget = isBoosting ? 1.0 : 0.0;
  // Fast charge, slower drain for visual feedback
  boostLevel += (boostTarget - boostLevel) * (isBoosting ? 0.18 : 0.08);
  boostLevel = Math.max(0, Math.min(1, boostLevel));
  els.boostFill.style.width = (boostLevel * 100).toFixed(1) + "%";

  // OOB warning: near map edge on x or z
  const posX = local && local.active ? local.p.x : me ? me.px : 0;
  const posZ = local && local.active ? local.p.z : me ? me.pz : 0;
  const isOob = Math.abs(posX) > (G.MAP_HALF - G.MAP_EDGE_SOFT) ||
                Math.abs(posZ) > (G.MAP_HALF - G.MAP_EDGE_SOFT);
  const nowSec = performance.now() / 1000;
  if (isOob && me && me.alive) {
    if (nowSec >= oobShownUntil) {
      els.oobWarning.classList.remove("hidden");
      oobShownUntil = nowSec + 2.0;
    }
  } else {
    els.oobWarning.classList.add("hidden");
    oobShownUntil = 0;
  }

  // Low-time warning: pulse red when <= 10s remain during playing phase
  const isLowTime = state.phase === "playing" && state.timeLeft <= 10;
  els.time.classList.toggle("low", isLowTime);

  if (me) {
    els.healthfill.style.width = Math.max(0, (me.hp / G.MAX_HP) * 100) + "%";

    // Respawn countdown (kill/death card)
    if (!me.alive) {
      if (wasAlive) {
        deathTime = performance.now() / 1000;
        wasAlive = false;
      }
      const elapsed = performance.now() / 1000 - deathTime;
      const remaining = Math.max(0, Math.ceil(G.RESPAWN_DELAY - elapsed));
      const respawnBy = document.getElementById("respawn-by");
      const respawnCount = document.getElementById("respawn-count");
      if (respawnBy) respawnBy.textContent = lastKiller ? ("by " + lastKiller) : "";
      if (respawnCount) respawnCount.textContent = remaining > 0 ? ("Respawning in " + remaining + "…") : "Respawning…";
      els.respawn.classList.remove("hidden");
    } else {
      wasAlive = true;
      els.respawn.classList.add("hidden");
    }

    if (me.alive && me.hp < prevHp) {
      els.vignette.classList.add("hit");
      setTimeout(() => els.vignette.classList.remove("hit"), 120);
      window.SFX.hit();
    }
    els.vignette.classList.toggle("low", me.alive && me.hp > 0 && me.hp < 30);
    prevHp = me.hp;

    // Power chip — hidden for 'repair' (instantaneous)
    if (me.power && me.power !== "repair") {
      const info = G.POWERUPS[me.power] || { label: me.power, icon: "★", color: 0xffffff };
      const left = typeof me.powerLeft === "number" ? me.powerLeft : G.POWERUP_DURATION;
      const pct = Math.max(0, Math.min(100, (left / G.POWERUP_DURATION) * 100));
      const hex = "#" + info.color.toString(16).padStart(6, "0");
      els.powerChip.classList.remove("hidden");
      els.powerChip.innerHTML = `<span class="pc-label">${escapeHtml(info.icon)} ${escapeHtml(info.label)}</span><span class="pc-bar"><span class="pc-fill" style="width:${pct}%;background:${hex}"></span></span>`;
    } else {
      els.powerChip.classList.add("hidden");
    }

    // EMP / Freeze callouts — rising-edge only
    const empLeft = (me as any).empLeft || 0;
    const frozenLeft = (me as any).frozenLeft || 0;
    if (empLeft > 0 && !wasEmpd) showCallout("EMP'D — guns offline");
    wasEmpd = empLeft > 0;
    if (frozenLeft > 0 && !wasFrozen) showCallout("FROZEN");
    wasFrozen = frozenLeft > 0;
  }

  const isTdm = (state.mode === "tdm");

  // TDM team score bar
  if (isTdm) {
    els.hudTeamScore.classList.remove("hidden");
    const ts0 = state.teamScore0 ?? 0;
    const ts1 = state.teamScore1 ?? 0;
    els.hudTScore0.textContent = String(ts0);
    els.hudTScore1.textContent = String(ts1);
    const myTeam = me ? (me.team ?? -1) : -1;
    els.hudTeamBlue.classList.toggle("is-my-team", myTeam === 0);
    els.hudTeamRed.classList.toggle("is-my-team", myTeam === 1);
  } else {
    els.hudTeamScore.classList.add("hidden");
  }

  const list: Array<{ id: string; name: string; score: number; bot: boolean; team: number }> = [];
  state.players.forEach((p: any, id: string) => list.push({ id, name: p.name, score: p.score, bot: p.bot, team: p.team ?? -1 }));
  list.sort((a, b) => b.score - a.score);
  const top5 = list.slice(0, 5);
  els.leaderboard.innerHTML =
    `<div class="lb-header">SMASHES</div>` +
    top5.map((p, i) => {
      const teamDot = isTdm && p.team >= 0
        ? `<span class="lb-team-dot" style="background:${p.team === 0 ? "#4aa3ff" : "#ff5a5a"}"></span>`
        : "";
      return `<div class="lb-row ${p.id === myId ? "me" : ""}"><span>${teamDot}${i + 1}. ${escapeHtml(p.name)}${p.bot ? " BOT" : ""}</span><span>${p.score}</span></div>`;
    }).join("");

  // Leader-change toast
  if (list.length >= 2 && list.filter(p => p.score > 0).length >= 2) {
    const leaderId = list[0].id;
    if (prevLeader !== "" && prevLeader !== leaderId) {
      pushToast(list[0].name + " takes the lead!", "leader");
    }
    prevLeader = leaderId;
  }

  // Phase transition detection
  if (state.phase !== prevPhase) {
    if (state.phase === "intermission") {
      window.SFX.explosion();
    } else if (state.phase === "playing") {
      runCountdown();
    } else {
      window.SFX.go();
    }
    prevPhase = state.phase;
  }

  if (state.phase === "intermission") {
    els.inter.classList.remove("hidden");
    els.interTime.textContent = formatClock(state.timeLeft);
    if (isTdm) {
      const ts0 = state.teamScore0 ?? 0;
      const ts1 = state.teamScore1 ?? 0;
      const myTeam = me ? (me.team ?? -1) : -1;
      const winTeam = ts0 > ts1 ? 0 : ts1 > ts0 ? 1 : -1;
      const winTeamName = winTeam === 0 ? "Blue" : winTeam === 1 ? "Red" : null;
      if (winTeam < 0) {
        els.winnerLine.textContent = "Draw!";
      } else if (myTeam === winTeam) {
        els.winnerLine.textContent = `${winTeamName} team wins! (You're on it!)`;
      } else {
        els.winnerLine.textContent = `${winTeamName} team wins!`;
      }
    } else {
      const winner = list[0];
      els.winnerLine.textContent = winner ? (winner.id === myId ? "You win!" : `${winner.name} wins!`) : "";
    }
    els.finalBoard.innerHTML = list.slice(0, 6).map((p, i) => {
      const teamDot = isTdm && p.team >= 0
        ? `<span class="lb-team-dot" style="background:${p.team === 0 ? "#4aa3ff" : "#ff5a5a"}"></span>`
        : "";
      return `<li class="${p.id === myId ? "me" : ""}${i === 0 ? " win" : ""}"><span>${teamDot}${i + 1}. ${escapeHtml(p.name)}${p.bot ? " BOT" : ""}</span><span>${p.score}</span></li>`;
    }).join("");
    const myRank = list.findIndex((p) => p.id === myId);
    els.yourPlace.textContent = myRank >= 0 ? `You placed ${ordinal(myRank + 1)} of ${list.length}` : "";
  } else {
    els.inter.classList.add("hidden");
  }
}

// ── Toasts / callouts / countdown ────────────────────────────────────────────

function pushToast(text: string, kind: "streak" | "multi" | "leader"): void {
  while (els.toast.children.length >= 3) {
    els.toast.firstChild?.remove();
  }
  const item = document.createElement("div");
  item.className = `toast-item toast--${kind}`;
  item.textContent = text;
  els.toast.appendChild(item);
  void item.offsetWidth;
  item.classList.add("show");
  setTimeout(() => {
    item.classList.remove("show");
    setTimeout(() => item.remove(), 200);
  }, 2600);
}

function showCallout(text: string): void {
  els.callout.textContent = text;
  els.callout.classList.remove("show");
  void els.callout.offsetWidth;
  els.callout.classList.add("show");
}

function runCountdown(): void {
  if (countdownActive) return;
  countdownActive = true;
  const steps = ["3", "2", "1", "GO!"];
  let i = 0;
  function showStep(): void {
    if (i >= steps.length) {
      countdownActive = false;
      els.countdown.classList.remove("pop", "go");
      els.countdown.textContent = "";
      return;
    }
    const label = steps[i];
    const isGo = label === "GO!";
    els.countdown.textContent = label;
    els.countdown.classList.toggle("go", isGo);
    els.countdown.classList.remove("pop");
    void els.countdown.offsetWidth;
    els.countdown.classList.add("pop");
    if (isGo) {
      try { window.SFX.go(); } catch {}
    } else {
      try { window.SFX.uiClick && window.SFX.uiClick(); } catch {}
    }
    i++;
    setTimeout(showStep, isGo ? 900 : 850);
  }
  showStep();
}

// ─── COMBAT EVENTS ───────────────────────────────────────────────────────────

function onKill(msg: any): void {
  const myId = window.Net.sessionId;
  const mine = msg.killer === myId;
  const victimIsMe = msg.victim === myId;

  const row = document.createElement("div");
  row.className = "kill-msg" + (mine ? " mine" : "");
  row.innerHTML = `${escapeHtml(mine ? "You" : msg.killerName)} <span class="kf-verb">smashed</span> <span class="vic">${escapeHtml(victimIsMe ? "You" : msg.victimName)}</span>`;
  els.killfeed.appendChild(row);
  setTimeout(() => row.remove(), 3600);
  while (els.killfeed.children.length > 5) els.killfeed.firstChild?.remove();

  window.Renderer.killPopup(msg.killer, mine);
  if (victimIsMe) {
    window.SFX.explosion();
    lastKiller = (msg.killer && msg.killer !== msg.victim && msg.killerName) ? msg.killerName : "";
  }
  if (mine) {
    window.SFX.kill();
    window.Renderer.hitStop(80);
  }

  const tv = getTrack(msg.victim);
  tv.streak = 0;
  tv.rapid = 0;

  if (msg.killer && msg.killer !== msg.victim) {
    const t = getTrack(msg.killer);
    const now = performance.now() / 1000;
    t.rapid = (now - t.last < 3.0) ? t.rapid + 1 : 1;
    t.last = now;
    t.streak += 1;

    let toastText = "";
    let toastKind: "multi" | "streak" = "multi";

    if (t.rapid >= 2) {
      const multiLabel = t.rapid >= 4 ? "MULTI MEGA SMASH"
        : t.rapid === 3 ? "MULTI SMASH"
        : "DOUBLE SMASH";
      toastText = mine ? `${multiLabel}!` : `${msg.killerName} — ${multiLabel}`;
      toastKind = "multi";
    } else {
      const streakTiers: Array<[number, string]> = [
        [3, "SMASH STREAK"],
        [5, "SMASHTACULAR STREAK"],
        [7, "SMASHOSAURUS STREAK"],
        [10, "SMASHLVANIA STREAK"],
        [15, "MONSTER SMASH STREAK"],
        [20, "SMASH POTATO BURGER STREAK"],
      ];
      const tier = streakTiers.find(([n]) => t.streak === n);
      if (tier) {
        toastText = mine ? `${tier[1]}!` : `${msg.killerName} — ${tier[1]}`;
        toastKind = "streak";
      }
    }

    if (toastText) pushToast(toastText, toastKind);
  }
}

function onPickup(msg: any): void {
  if (!window.Net) return;
  const isSelf = msg.by === window.Net.sessionId;

  if (msg.type === "star") {
    if (isSelf) {
      pushToast("YOU HAVE THE STAR!", "multi");
    } else {
      const name = window.Net.state?.players?.get(msg.by)?.name;
      pushToast(`${name || "Someone"} grabbed the STAR!`, "multi");
    }
  }

  if (!isSelf) return;
  window.SFX.pickup();
  const info = G.POWERUPS[msg.type];
  showCallout((info ? `${info.icon} ${info.label}` : "POWERUP") + "!");
}

// ─── TOUCH CONTROLS ──────────────────────────────────────────────────────────

function setupTouchButtons(): void {
  const bind = (el: HTMLElement, key: keyof typeof window.Input.touch) => {
    let pid = -1;
    const down = (e: PointerEvent) => {
      e.preventDefault();
      pid = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch {}
      window.Input.touch[key] = true;
      el.classList.add("pressed");
      buzz(8);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      pid = -1;
      window.Input.touch[key] = false;
      el.classList.remove("pressed");
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };
  bind(els.left, "left");
  bind(els.right, "right");
  bind(els.climb, "climb");
  bind(els.dive, "dive");
  bind(els.boost, "boost");
  bind(els.fire, "fire");

  const joystickBase = document.getElementById("joystick-base")!;
  const joystickThumb = document.getElementById("joystick-thumb")!;
  if (joystickBase && joystickThumb) {
    window.Input.attachJoystick(joystickBase, joystickThumb);
  }

  const tiltCalBtn = document.getElementById("tilt-cal-btn");
  if (tiltCalBtn) {
    tiltCalBtn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      window.Input.calibrateTilt();
      buzz(20);
      tiltCalBtn.classList.add("pressed");
      setTimeout(() => tiltCalBtn.classList.remove("pressed"), 120);
    });
  }
}

function applyControlSchemeUI(scheme: ControlScheme): void {
  const dpadLeft = document.getElementById("dpad-left");
  const joystickLeft = document.getElementById("joystick-left");
  const tiltLeft = document.getElementById("tilt-left");
  if (dpadLeft) dpadLeft.classList.toggle("hidden", scheme !== "dpad");
  if (joystickLeft) joystickLeft.classList.toggle("hidden", scheme !== "joystick");
  if (tiltLeft) tiltLeft.classList.toggle("hidden", scheme !== "tilt");
}

function toggleMute(): void {
  const muted = window.SFX.toggleMute();
  els.mute.innerHTML = muted ? ICON_SND_OFF : ICON_SND_ON;
}

// ─── ROTATE OVERLAY ──────────────────────────────────────────────────────────

function updateRotateOverlay(): void {
  const portrait = window.matchMedia && window.matchMedia("(orientation: portrait)").matches;
  const show = window.Input.isTouchDevice() && portrait && (mode === "menu" || mode === "lobby" || mode === "playing" || mode === "paused");
  els.rotate.classList.toggle("show", !!show);
}

// ─── BOOT ────────────────────────────────────────────────────────────────────

const handlers: MenuHandlers = {
  onCreate: () => { void connectAndEnterLobby(null); },
  onJoinHost: (host) => { void connectAndEnterLobby(host); },
  onLobbyStart: () => { window.Net.sendHostStart(); },
  onLobbyReady: () => { window.Net.sendReady(); },
  onLobbyKick: (targetId) => { window.Net.sendHostKick(targetId); },
  onLobbySettings: (patch) => { window.Net.sendHostSettings(patch); },
  onLobbyLeave: () => { leaveMatch(); },
  onPauseResume: () => { togglePause(); },
  onPauseLeave: () => { leaveMatch("Left the match."); },
};

function init(): void {
  void registerServiceWorker();

  window.Renderer.init(els.canvas);
  window.Input.attach();
  loadStoredControlPrefs();
  window.Assets.load();

  mountScreens(els.start, handlers);
  applyInitialHash();

  window.Net.onKill = onKill;
  window.Net.onPickup = onPickup;
  window.Net.onDisconnect = onDisconnect;
  window.Net.onStateChange = onNetStateChange;

  setupTouchButtons();
  applyControlSchemeUI(window.Input.controlScheme);
  updateRotateOverlay();

  if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient();
  if (window.Input.isTouchDevice()) document.body.classList.add("touch-device");

  els.mute.addEventListener("click", () => toggleMute());
  els.mute.innerHTML = window.SFX.isMuted() ? ICON_SND_OFF : ICON_SND_ON;
  els.ingameMenuBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    togglePause();
  });
  els.interLeave.addEventListener("click", () => {
    window.SFX.uiClick();
    leaveMatch();
  });

  window.Input.onPause = () => { if (mode === "playing" || mode === "paused") togglePause(); };
  window.Input.onMute = () => toggleMute();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (window.Net.state) window.Net.sendInput(0, 0, false, false);
      if (window.SFX.suspend) window.SFX.suspend();
    } else if (mode === "playing" && window.SFX.resume) {
      window.SFX.resume();
    }
  });
  // Renderer.resize was never wired to anything, so the WebGL backing store kept
  // its boot-time size forever. Every phone boots behind the portrait rotate gate,
  // then rotates — leaving the canvas portrait-sized and CSS-stretched across a
  // landscape screen (squashed, cropped 3D). Address-bar show/hide did it too.
  const onViewportChange = (): void => {
    updateRotateOverlay();
    if (window.Renderer && window.Renderer.resize) window.Renderer.resize();
  };
  window.addEventListener("orientationchange", onViewportChange);
  window.addEventListener("resize", onViewportChange);
  try {
    const portraitMq = window.matchMedia("(orientation: portrait)");
    const mqHandler = () => updateRotateOverlay();
    if (portraitMq.addEventListener) portraitMq.addEventListener("change", mqHandler);
    else if ((portraitMq as any).addListener) (portraitMq as any).addListener(mqHandler);
  } catch {}

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (mode === "paused") { togglePause(); return; }
      if (mode === "menu" && currentScreenId() !== "home") { navBack(); return; }
    }
  });

  els.bootOverlay.classList.add("fade-out");
  setTimeout(() => els.bootOverlay.classList.add("hidden"), 450);

  requestAnimationFrame((t) => { last = t; loop(t); });
}

window.addEventListener("DOMContentLoaded", init);

// Fatal overlay: surface unrecoverable JS errors to the user. The inline
// <script> in index.html already POSTs to /api/errors for server-side logging.
window.addEventListener("error", (e: ErrorEvent) => {
  if (mode !== "menu" && mode !== "lobby" && mode !== "playing" && mode !== "paused") {
    showFatal(e.message || "An unexpected error occurred.");
  }
});
window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
  if (mode !== "menu" && mode !== "lobby" && mode !== "playing" && mode !== "paused") {
    const msg = (e.reason && (e.reason as any).message) ? (e.reason as any).message : String(e.reason);
    showFatal(msg || "An unexpected error occurred.");
  }
});
