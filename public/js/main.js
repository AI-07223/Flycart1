"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/client/main.ts
  var require_main = __commonJS({
    "src/client/main.ts"() {
      var dollar = (id) => document.getElementById(id);
      var G = window.GAME;
      var buzz = (ms) => {
        try {
          if (navigator.vibrate) navigator.vibrate(ms);
        } catch {
        }
      };
      var els = {
        canvas: dollar("game"),
        hud: dollar("hud"),
        score: dollar("hud-score"),
        time: dollar("hud-time"),
        alt: dollar("hud-alt"),
        speed: dollar("hud-speed"),
        leaderboard: dollar("leaderboard"),
        health: dollar("healthbar"),
        healthfill: dollar("healthfill"),
        respawn: dollar("respawn"),
        start: dollar("start-screen"),
        name: dollar("name-input"),
        quick: dollar("quickplay-btn"),
        friends: dollar("friends-btn"),
        status: dollar("status"),
        mute: dollar("mute-btn"),
        pause: dollar("pause-screen"),
        resume: dollar("resume-btn"),
        pauseMenu: dollar("pause-menu-btn"),
        share: dollar("share-bar"),
        shareLink: dollar("share-link"),
        copy: dollar("copy-btn"),
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
        connLost: dollar("conn-lost"),
        connMsg: dollar("conn-msg"),
        connRetry: dollar("conn-retry"),
        connMenu: dollar("conn-menu"),
        bots: dollar("bots-check"),
        planeSwatches: dollar("plane-swatches")
      };
      var mode = "menu";
      var last = 0;
      var prevPhase = "playing";
      var prevHp = G.MAX_HP;
      var streak = 0;
      var lastKill = 0;
      var lastFireSnd = 0;
      var engineStarted = false;
      var botsEnabled = true;
      var selectedSkin = 0;
      var SKINS = [16739179, 4833535, 9167690, 16765514, 12614655];
      try {
        const saved = parseInt(localStorage.getItem("smashcart.skin") || "", 10);
        if (Number.isInteger(saved) && saved >= 0 && saved < SKINS.length) selectedSkin = saved;
      } catch {
      }
      try {
        botsEnabled = localStorage.getItem("smashcart.bots") !== "0";
      } catch {
      }
      function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
      }
      function ordinal(n) {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
      }
      function genCode() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let out = "";
        for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return out;
      }
      function roomFromUrl() {
        const params = new URLSearchParams(location.search);
        const room = params.get("room");
        return room ? room.toUpperCase().slice(0, 6) : null;
      }
      function fetchLeaderboard() {
        fetch("/leaderboard?n=10").then((r) => r.ok ? r.json() : []).then((rows) => {
          if (!Array.isArray(rows) || !rows.length) {
            els.leaderboard.innerHTML = '<div class="lb-row muted">No scores yet</div>';
            return;
          }
          els.leaderboard.innerHTML = rows.slice(0, 5).map(
            (entry, i) => `<div class="lb-row"><span>${i + 1}. ${escapeHtml(entry.name)}</span><span>${entry.score | 0}</span></div>`
          ).join("");
        }).catch(() => {
          els.leaderboard.innerHTML = '<div class="lb-row muted">Leaderboard unavailable</div>';
        });
      }
      function buildPlanePicker() {
        els.planeSwatches.innerHTML = "";
        SKINS.forEach((color, index) => {
          const button = document.createElement("button");
          button.className = "plane-swatch" + (index === selectedSkin ? " selected" : "");
          button.style.background = "#" + color.toString(16).padStart(6, "0");
          button.title = `Plane ${index + 1}`;
          button.addEventListener("click", () => {
            selectedSkin = index;
            try {
              localStorage.setItem("smashcart.skin", String(index));
            } catch {
            }
            els.planeSwatches.querySelectorAll(".plane-swatch").forEach((node, i) => node.classList.toggle("selected", i === index));
            window.SFX.uiClick();
          });
          els.planeSwatches.appendChild(button);
        });
      }
      async function startGame(code) {
        if (code === "PUBLIC" && !botsEnabled) code = "NOBOTS";
        window.SFX.unlock();
        enterImmersive();
        window.Renderer.startTakeoff && window.Renderer.startTakeoff();
        const name = (els.name.value || "Pilot").slice(0, 14);
        els.status.textContent = "Connecting\u2026";
        els.quick.disabled = true;
        els.friends.disabled = true;
        try {
          await window.Net.connect(name, code, selectedSkin);
        } catch (e) {
          els.status.textContent = "Could not connect: " + (e && e.message ? e.message : e);
          els.quick.disabled = false;
          els.friends.disabled = false;
          return;
        }
        mode = "playing";
        prevPhase = "playing";
        prevHp = G.MAX_HP;
        els.start.classList.add("hidden");
        els.hud.classList.remove("hidden");
        els.health.classList.remove("hidden");
        els.respawn.classList.add("hidden");
        els.inter.classList.add("hidden");
        els.connLost.classList.add("hidden");
        els.status.textContent = "";
        if (window.Input.isTouchDevice()) els.touch.classList.remove("hidden");
        if (!engineStarted) {
          window.SFX.startEngine();
          engineStarted = true;
        }
        if (window.SFX.stopMenuAmbient) window.SFX.stopMenuAmbient();
        window.SFX.startMusic();
        if (code !== "PUBLIC" && code !== "NOBOTS") {
          const url = location.origin + location.pathname + "?room=" + code;
          history.replaceState(null, "", "?room=" + code);
          els.shareLink.value = url;
          els.share.classList.remove("hidden");
        } else {
          history.replaceState(null, "", location.pathname);
          els.share.classList.add("hidden");
        }
      }
      function loop(ts) {
        requestAnimationFrame(loop);
        let dt = (ts - last) / 1e3;
        last = ts;
        if (!isFinite(dt) || dt <= 0) return;
        dt = Math.min(dt, 0.05);
        const room = window.Net.room;
        if (mode === "playing" && room && room.state) {
          const state = room.state;
          const myId = window.Net.sessionId;
          const input = window.Input.get();
          window.Net.sendInput(input.turn, input.climb, input.boost, input.fire);
          window.Net.stepLocal && window.Net.stepLocal(dt);
          window.Renderer.sync(state, dt, myId);
          window.Renderer.draw(state, myId);
          updateHud(state, myId);
          const me = state.players.get(myId);
          if (me && engineStarted) {
            window.SFX.setEngine(me.boosting ? 1 : 0.5, !!me.boosting);
            const fireCd = G.FIRE_COOLDOWN * (me.power === "rapid" ? G.RAPID_FACTOR : 1);
            if (me.alive && input.fire && ts / 1e3 - lastFireSnd > fireCd) {
              window.SFX.fire();
              lastFireSnd = ts / 1e3;
            }
          }
        } else if (mode === "menu") {
          window.Renderer.drawMenu(dt, selectedSkin);
        } else if (room && room.state) {
          window.Renderer.draw(room.state, window.Net.sessionId);
        }
      }
      function updateHud(state, myId) {
        const me = state.players.get(myId);
        const local = window.Net.localPose;
        els.score.textContent = String(me ? me.score : 0);
        els.time.textContent = String(Math.ceil(state.timeLeft));
        const altitude = local && local.active ? local.p.y : me ? me.py : 0;
        const speed = local && local.active ? local.speed : me ? me.speed : 0;
        els.alt.textContent = String(Math.round(altitude));
        els.speed.textContent = String(Math.round(speed));
        if (me) {
          els.healthfill.style.width = Math.max(0, me.hp / G.MAX_HP * 100) + "%";
          els.respawn.classList.toggle("hidden", me.alive);
          if (me.alive && me.hp < prevHp) {
            els.vignette.classList.add("hit");
            setTimeout(() => els.vignette.classList.remove("hit"), 120);
            window.SFX.hit();
          }
          els.vignette.classList.toggle("low", me.alive && me.hp > 0 && me.hp < 30);
          prevHp = me.hp;
          if (me.power) {
            const info = G.POWERUPS[me.power] || { label: me.power, icon: "\u2605", color: 16777215 };
            const left = typeof me.powerLeft === "number" ? me.powerLeft : G.POWERUP_DURATION;
            const pct = Math.max(0, Math.min(100, left / G.POWERUP_DURATION * 100));
            const hex = "#" + info.color.toString(16).padStart(6, "0");
            els.powerChip.classList.remove("hidden");
            els.powerChip.innerHTML = `<span class="pc-label">${escapeHtml(info.icon)} ${escapeHtml(info.label)}</span><span class="pc-bar"><span class="pc-fill" style="width:${pct}%;background:${hex}"></span></span>`;
          } else {
            els.powerChip.classList.add("hidden");
          }
        }
        const list = [];
        state.players.forEach((p, id) => list.push({ id, name: p.name, score: p.score, bot: p.bot }));
        list.sort((a, b) => b.score - a.score);
        els.leaderboard.innerHTML = list.slice(0, 5).map(
          (p, i) => `<div class="lb-row ${p.id === myId ? "me" : ""}"><span>${i + 1}. ${escapeHtml(p.name)}${p.bot ? " \u{1F916}" : ""}</span><span>${p.score}</span></div>`
        ).join("");
        if (state.phase !== prevPhase) {
          if (state.phase === "intermission") window.SFX.explosion();
          else window.SFX.go();
          prevPhase = state.phase;
        }
        if (state.phase === "intermission") {
          els.inter.classList.remove("hidden");
          els.interTime.textContent = String(Math.ceil(state.timeLeft));
          const winner = list[0];
          els.winnerLine.textContent = winner ? winner.id === myId ? "\u{1F3C6} You win!" : `\u{1F3C6} ${winner.name} wins!` : "";
          els.finalBoard.innerHTML = list.slice(0, 6).map(
            (p, i) => `<li class="${p.id === myId ? "me" : ""}${i === 0 ? " win" : ""}"><span>${i + 1}. ${escapeHtml(p.name)}${p.bot ? " \u{1F916}" : ""}</span><span>${p.score}</span></li>`
          ).join("");
          const myRank = list.findIndex((p) => p.id === myId);
          els.yourPlace.textContent = myRank >= 0 ? `You placed ${ordinal(myRank + 1)} of ${list.length}` : "";
        } else {
          els.inter.classList.add("hidden");
        }
      }
      function showCallout(text) {
        els.callout.textContent = text;
        els.callout.classList.remove("show");
        void els.callout.offsetWidth;
        els.callout.classList.add("show");
      }
      function streakName(streakSize) {
        return streakSize >= 6 ? "GODLIKE!" : streakSize >= 5 ? "UNSTOPPABLE!" : streakSize >= 4 ? "RAMPAGE!" : streakSize >= 3 ? "TRIPLE HIT!" : "DOUBLE HIT!";
      }
      function onKill(msg) {
        const myId = window.Net.sessionId;
        const mine = msg.killer === myId;
        const victimIsMe = msg.victim === myId;
        const row = document.createElement("div");
        row.className = "kill-msg" + (mine ? " mine" : "");
        row.innerHTML = `${escapeHtml(mine ? "You" : msg.killerName)} \u{1F4A5} <span class="vic">${escapeHtml(victimIsMe ? "You" : msg.victimName)}</span>`;
        els.killfeed.appendChild(row);
        setTimeout(() => row.remove(), 3600);
        while (els.killfeed.children.length > 5) els.killfeed.firstChild?.remove();
        window.Renderer.killPopup(msg.killer, mine);
        if (victimIsMe) window.SFX.explosion();
        if (mine) {
          window.SFX.kill();
          window.Renderer.hitStop(80);
          const now = performance.now() / 1e3;
          streak = now - lastKill < 3 ? streak + 1 : 1;
          lastKill = now;
          if (streak >= 2) showCallout(streakName(streak));
        }
      }
      function onPickup(msg) {
        if (!window.Net || msg.by !== window.Net.sessionId) return;
        window.SFX.pickup();
        const info = G.POWERUPS[msg.type];
        showCallout((info ? `${info.icon} ${info.label}` : "POWERUP") + "!");
      }
      function setupTouchButtons() {
        const bind = (el, key) => {
          const set = (value) => (e) => {
            e.preventDefault();
            window.Input.touch[key] = value;
            el.classList.toggle("pressed", value);
            if (value) buzz(8);
          };
          el.addEventListener("pointerdown", set(true));
          el.addEventListener("pointerup", set(false));
          el.addEventListener("pointercancel", set(false));
          el.addEventListener("pointerleave", set(false));
        };
        bind(els.left, "left");
        bind(els.right, "right");
        bind(els.climb, "climb");
        bind(els.dive, "dive");
        bind(els.boost, "boost");
        bind(els.fire, "fire");
      }
      function togglePause() {
        if (mode === "playing") {
          mode = "paused";
          els.pause.classList.remove("hidden");
          window.Net.sendInput(0, 0, false, false);
          window.SFX.setEngine(0, false);
        } else if (mode === "paused") {
          mode = "playing";
          els.pause.classList.add("hidden");
        }
      }
      function toggleMute() {
        const muted = window.SFX.toggleMute();
        els.mute.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
      }
      function resetToMenu() {
        try {
          window.Net.leave();
        } catch {
        }
        if (window.SFX.stopLoops) window.SFX.stopLoops();
        if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient();
        mode = "menu";
        engineStarted = false;
        els.start.classList.remove("hidden");
        els.hud.classList.add("hidden");
        els.health.classList.add("hidden");
        els.touch.classList.add("hidden");
        els.share.classList.add("hidden");
        els.inter.classList.add("hidden");
        els.pause.classList.add("hidden");
        els.connLost.classList.add("hidden");
        els.respawn.classList.add("hidden");
        els.powerChip.classList.add("hidden");
        els.quick.disabled = false;
        els.friends.disabled = false;
        els.status.textContent = "";
        fetchLeaderboard();
        updateRotateOverlay();
      }
      function onDisconnect() {
        if (mode === "menu") return;
        mode = "lost";
        if (window.SFX.suspend) window.SFX.suspend();
        els.connMsg.textContent = "Reconnecting\u2026";
        els.connRetry.classList.add("hidden");
        els.connLost.classList.remove("hidden");
        window.Net.tryReconnect().then((ok) => {
          if (mode !== "lost") return;
          if (ok) {
            els.connLost.classList.add("hidden");
            if (window.SFX.resume) window.SFX.resume();
            mode = "playing";
          } else {
            els.connMsg.textContent = "Couldn't reconnect.";
            els.connRetry.classList.remove("hidden");
          }
        });
      }
      function enterImmersive() {
        if (!window.Input.isTouchDevice()) {
          updateRotateOverlay();
          return;
        }
        const root = document.documentElement;
        const request = root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen;
        if (request) {
          try {
            const res = request.call(root);
            if (res && res.catch) res.catch(() => {
            });
          } catch {
          }
        }
        updateRotateOverlay();
      }
      function updateRotateOverlay() {
        const portrait = window.matchMedia && window.matchMedia("(orientation: portrait)").matches;
        const show = window.Input.isTouchDevice() && portrait && mode !== "menu";
        els.rotate.classList.toggle("show", !!show);
      }
      function init() {
        window.Renderer.init(els.canvas);
        window.Input.attach();
        window.Assets.load();
        window.Net.onKill = onKill;
        window.Net.onPickup = onPickup;
        window.Net.onDisconnect = onDisconnect;
        els.bots.checked = botsEnabled;
        els.bots.addEventListener("change", () => {
          botsEnabled = els.bots.checked;
          try {
            localStorage.setItem("smashcart.bots", botsEnabled ? "1" : "0");
          } catch {
          }
          window.SFX.uiClick();
        });
        buildPlanePicker();
        fetchLeaderboard();
        setupTouchButtons();
        updateRotateOverlay();
        if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient();
        if (window.Input.isTouchDevice()) document.body.classList.add("touch-device");
        const urlCode = roomFromUrl();
        if (urlCode) {
          els.status.textContent = `Room ${urlCode} ready`;
          els.quick.textContent = `JOIN ${urlCode}`;
        }
        els.quick.addEventListener("click", () => {
          window.SFX.uiClick();
          startGame(urlCode || "PUBLIC");
        });
        els.friends.addEventListener("click", () => {
          window.SFX.uiClick();
          startGame(genCode());
        });
        els.name.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            startGame(urlCode || "PUBLIC");
          }
        });
        els.copy.addEventListener("click", () => {
          els.shareLink.select();
          navigator.clipboard && navigator.clipboard.writeText(els.shareLink.value);
          els.copy.textContent = "Copied!";
          setTimeout(() => els.copy.textContent = "Copy", 1200);
        });
        els.mute.addEventListener("click", () => toggleMute());
        els.resume.addEventListener("click", () => togglePause());
        els.pauseMenu.addEventListener("click", () => resetToMenu());
        els.connMenu.addEventListener("click", () => resetToMenu());
        els.connRetry.addEventListener("click", () => {
          els.connMsg.textContent = "Reconnecting\u2026";
          els.connRetry.classList.add("hidden");
          window.Net.tryReconnect().then((ok) => {
            if (ok) {
              els.connLost.classList.add("hidden");
              if (window.SFX.resume) window.SFX.resume();
              mode = "playing";
            } else {
              els.connMsg.textContent = "Still down.";
              els.connRetry.classList.remove("hidden");
            }
          });
        });
        window.Input.onPause = () => {
          if (mode !== "menu") togglePause();
        };
        window.Input.onMute = () => toggleMute();
        document.addEventListener("visibilitychange", () => {
          if (document.hidden) {
            if (window.Net.room) window.Net.sendInput(0, 0, false, false);
            if (window.SFX.suspend) window.SFX.suspend();
          } else if (mode === "playing" && window.SFX.resume) {
            window.SFX.resume();
          }
        });
        window.addEventListener("orientationchange", updateRotateOverlay);
        window.addEventListener("resize", updateRotateOverlay);
        requestAnimationFrame((t) => {
          last = t;
          loop(t);
        });
      }
      window.addEventListener("DOMContentLoaded", init);
    }
  });
  require_main();
})();
