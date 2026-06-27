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
        lanServer: dollar("lan-server-input"),
        lanQuick: dollar("lan-quick-btn"),
        lanFriends: dollar("lan-friends-btn"),
        lanHint: dollar("lan-hint"),
        serverBadge: dollar("menu-server-badge"),
        roomChip: dollar("room-code-chip"),
        orientationNote: dollar("orientation-note"),
        friendsNote: dollar("friends-note"),
        status: dollar("status"),
        mute: dollar("mute-btn"),
        pause: dollar("pause-screen"),
        resume: dollar("resume-btn"),
        pauseMenu: dollar("pause-menu-btn"),
        share: dollar("share-bar"),
        shareLink: dollar("share-link"),
        qrBtn: dollar("qr-btn"),
        copy: dollar("copy-btn"),
        shareQrOverlay: dollar("share-qr-overlay"),
        shareQrCanvas: dollar("share-qr-canvas"),
        shareQrRoom: dollar("share-qr-room"),
        shareQrNote: dollar("share-qr-note"),
        shareQrLink: dollar("share-qr-link"),
        shareQrCopy: dollar("share-qr-copy"),
        shareQrClose: dollar("share-qr-close"),
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
      var inviteRoom = null;
      var inviteServer = null;
      var activeShareUrl = null;
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
      function isPrivateHost(hostname) {
        const host = String(hostname || "").toLowerCase();
        if (!host) return false;
        if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
        if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
        const parts = host.split(".");
        if (parts.length === 4 && parts[0] === "172") {
          const second = Number(parts[1]);
          if (second >= 16 && second <= 31) return true;
        }
        return false;
      }
      function toPageOrigin(origin) {
        const url = new URL(origin);
        if (url.protocol === "ws:") url.protocol = "http:";
        if (url.protocol === "wss:") url.protocol = "https:";
        return url.origin;
      }
      function toSocketOrigin(origin) {
        const url = new URL(origin);
        if (url.protocol === "http:") url.protocol = "ws:";
        if (url.protocol === "https:") url.protocol = "wss:";
        return url.origin;
      }
      function normalizeServerOrigin(raw) {
        const trimmed = String(raw || "").trim();
        if (!trimmed) return null;
        let candidate = trimmed;
        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) candidate = `http://${candidate}`;
        try {
          const url = new URL(candidate);
          if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) return null;
          if (!url.hostname) return null;
          url.username = "";
          url.password = "";
          url.pathname = "";
          url.search = "";
          url.hash = "";
          if (!url.port && (url.protocol === "http:" || url.protocol === "ws:")) url.port = location.port || "2567";
          return url.origin;
        } catch {
          return null;
        }
      }
      function secureMismatch(origin) {
        return location.protocol === "https:" && toSocketOrigin(origin).startsWith("ws://");
      }
      function readInviteFromUrl() {
        const params = new URLSearchParams(location.search);
        const room = params.get("room");
        inviteRoom = room ? room.toUpperCase().slice(0, 6) : null;
        inviteServer = normalizeServerOrigin(params.get("server"));
      }
      function loadSavedLanOrigin() {
        try {
          return localStorage.getItem("smashcart.lanServer") || "";
        } catch {
          return "";
        }
      }
      function saveLanOrigin(origin) {
        try {
          if (origin) localStorage.setItem("smashcart.lanServer", toPageOrigin(origin));
          else localStorage.removeItem("smashcart.lanServer");
        } catch {
        }
      }
      function setInviteState(code, serverOrigin) {
        inviteRoom = code;
        inviteServer = code ? serverOrigin : null;
        updateBrowserUrl(code, serverOrigin);
      }
      function updateBrowserUrl(code, serverOrigin) {
        const url = new URL(location.href);
        url.searchParams.delete("room");
        url.searchParams.delete("server");
        if (code) {
          url.searchParams.set("room", code);
          if (serverOrigin && toPageOrigin(serverOrigin) !== location.origin) url.searchParams.set("server", toPageOrigin(serverOrigin));
        }
        const search = url.searchParams.toString();
        history.replaceState(null, "", url.pathname + (search ? `?${search}` : ""));
      }
      function currentLanInputOrigin() {
        return normalizeServerOrigin(els.lanServer.value);
      }
      function currentLanConnectOrigin() {
        return currentLanInputOrigin() || (isPrivateHost(location.hostname) ? location.origin : null);
      }
      function buildShareUrl(code, serverOrigin) {
        const base = serverOrigin ? toPageOrigin(serverOrigin) : location.origin;
        const url = new URL(location.pathname, base.endsWith("/") ? base : base + "/");
        url.searchParams.set("room", code);
        return url.toString();
      }
      function hideShareQr() {
        els.shareQrOverlay.classList.add("hidden");
      }
      async function copyShareLink() {
        const value = activeShareUrl || els.shareLink.value;
        if (!value) return false;
        try {
          els.shareLink.select();
        } catch {
        }
        try {
          els.shareQrLink.select();
        } catch {
        }
        try {
          if (navigator.clipboard) await navigator.clipboard.writeText(value);
          else document.execCommand("copy");
          return true;
        } catch {
          return false;
        }
      }
      function updateShareInvite(code, serverOrigin) {
        const shareUrl = buildShareUrl(code, serverOrigin);
        const shareHost = new URL(serverOrigin ? toPageOrigin(serverOrigin) : location.origin).host;
        const shareHostname = new URL(shareUrl).hostname;
        activeShareUrl = shareUrl;
        els.shareLink.value = shareUrl;
        els.shareQrLink.value = shareUrl;
        els.shareQrRoom.textContent = `Room ${code}`;
        els.shareQrNote.textContent = isPrivateHost(shareHostname) ? `Scan on the same hotspot to join ${code} at ${shareHost}.` : `Scan to open room ${code} on ${shareHost}.`;
        els.copy.disabled = false;
        els.shareQrCopy.disabled = false;
        try {
          window.QR.render(els.shareQrCanvas, shareUrl, {
            size: window.Input.isTouchDevice() ? 220 : 256,
            errorCorrectionLevel: "M"
          });
          els.qrBtn.disabled = false;
        } catch {
          els.qrBtn.disabled = true;
          els.shareQrNote.textContent = `Copy the link to join ${code} on ${shareHost}.`;
          els.shareQrCanvas.width = 0;
          els.shareQrCanvas.height = 0;
        }
      }
      function clearShareInvite() {
        activeShareUrl = null;
        els.shareLink.value = "";
        els.shareQrLink.value = "";
        els.shareQrRoom.textContent = "Room";
        els.shareQrNote.textContent = "Scan to join this room.";
        els.shareQrCanvas.width = 0;
        els.shareQrCanvas.height = 0;
        els.copy.disabled = true;
        els.shareQrCopy.disabled = true;
        els.qrBtn.disabled = true;
        els.copy.textContent = "Copy";
        els.shareQrCopy.textContent = "Copy Link";
        hideShareQr();
      }
      function showShareQr() {
        if (!activeShareUrl || els.qrBtn.disabled) return;
        els.shareQrOverlay.classList.remove("hidden");
      }
      function setStatus(text = "") {
        els.status.textContent = text;
      }
      function setBusy(busy) {
        els.quick.disabled = busy;
        els.friends.disabled = busy;
        els.lanQuick.disabled = busy;
        els.lanFriends.disabled = busy;
      }
      function updateMenuMeta(preserveStatus = true) {
        const lanOrigin = currentLanConnectOrigin();
        els.serverBadge.textContent = lanOrigin ? `LAN ${new URL(toPageOrigin(lanOrigin)).host}` : "Internet lobby";
        const portrait = !!(window.matchMedia && window.matchMedia("(orientation: portrait)").matches);
        if (!window.Input.isTouchDevice()) {
          els.orientationNote.textContent = "Keyboard flight: A/D steer, W/S climb, Shift boost, Space fire.";
        } else if (portrait) {
          els.orientationNote.textContent = "Portrait is fine for setup. Rotate to landscape before you launch.";
        } else {
          els.orientationNote.textContent = "Landscape ready. Touch controls appear after launch.";
        }
        if (inviteRoom) {
          els.quick.textContent = `JOIN ${inviteRoom}`;
          els.roomChip.textContent = `Invite ${inviteRoom}`;
          const inviteHost = inviteServer ? new URL(toPageOrigin(inviteServer)).host : location.host;
          els.friendsNote.textContent = `Invite ready for room ${inviteRoom} on ${inviteHost}. Quick Play joins it directly.`;
          if (!preserveStatus || !els.status.textContent) setStatus(`Invite ready: room ${inviteRoom}`);
        } else {
          els.quick.textContent = "PLAY PUBLIC";
          els.roomChip.textContent = lanOrigin ? "LAN ready" : "Public";
          els.friendsNote.textContent = "Room codes stay on the same server that created them.";
          if (!preserveStatus) setStatus("");
        }
        const typed = els.lanServer.value.trim();
        const lanInput = currentLanInputOrigin();
        if (typed && !lanInput) {
          els.lanHint.textContent = "Enter a valid server address like 192.168.1.10:2567 or http://192.168.1.10:2567.";
        } else if (lanInput && secureMismatch(lanInput)) {
          els.lanHint.textContent = "This page is HTTPS. Insecure LAN servers will be blocked here. Open the game from the hotspot host address instead.";
        } else if (lanInput) {
          const url = new URL(toPageOrigin(lanInput));
          els.lanHint.textContent = isPrivateHost(url.hostname) ? `LAN target ready: ${url.host}. Share that local address with everyone on the hotspot.` : `Custom server selected: ${url.host}. Latency only improves if that server is on the same local network.`;
        } else if (isPrivateHost(location.hostname)) {
          els.lanHint.textContent = `This device is already serving the game locally at ${location.host}. Use the LAN buttons or share this address.`;
        } else {
          els.lanHint.textContent = "For hotspot play, run the game on the host device and enter its local address here.";
        }
      }
      function primeLanInput() {
        const preferred = inviteServer ? toPageOrigin(inviteServer) : loadSavedLanOrigin() || (isPrivateHost(location.hostname) ? location.origin : "");
        els.lanServer.value = preferred;
      }
      function commitLanInput() {
        const normalized = currentLanInputOrigin();
        if (normalized) {
          els.lanServer.value = toPageOrigin(normalized);
          saveLanOrigin(normalized);
        } else if (!els.lanServer.value.trim()) {
          saveLanOrigin(null);
        }
        updateMenuMeta(true);
      }
      function resolveLanOrigin() {
        const raw = els.lanServer.value.trim();
        const normalized = currentLanInputOrigin();
        if (raw && !normalized) {
          setStatus("Enter a valid hotspot address, for example 192.168.1.10:2567.");
          return null;
        }
        const origin = normalized || (isPrivateHost(location.hostname) ? location.origin : null);
        if (!origin) {
          setStatus("Enter the hotspot host address first, for example 192.168.1.10:2567.");
          return null;
        }
        if (secureMismatch(origin)) {
          setStatus("This HTTPS page cannot connect to that insecure LAN server. Open the game from the hotspot host address instead.");
          return null;
        }
        els.lanServer.value = toPageOrigin(origin);
        saveLanOrigin(origin);
        return origin;
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
      async function startGame(code, serverOrigin = null) {
        let roomCode = code;
        if (roomCode === "PUBLIC" && !botsEnabled) roomCode = "NOBOTS";
        if (serverOrigin) {
          const normalized = normalizeServerOrigin(serverOrigin);
          if (!normalized) {
            setStatus("The selected server address is not valid.");
            return;
          }
          if (secureMismatch(normalized)) {
            setStatus("This HTTPS page cannot connect to that insecure LAN server. Open the game from the hotspot host address instead.");
            return;
          }
          serverOrigin = normalized;
          saveLanOrigin(serverOrigin);
          els.lanServer.value = toPageOrigin(serverOrigin);
        }
        window.SFX.unlock();
        enterImmersive();
        window.Renderer.startTakeoff && window.Renderer.startTakeoff();
        const name = (els.name.value || "Pilot").slice(0, 14);
        setStatus("Connecting\u2026");
        setBusy(true);
        try {
          await window.Net.connect(name, roomCode, selectedSkin, serverOrigin);
        } catch (e) {
          setStatus("Could not connect: " + (e && e.message ? e.message : e));
          setBusy(false);
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
        setStatus("");
        if (window.Input.isTouchDevice()) els.touch.classList.remove("hidden");
        if (!engineStarted) {
          window.SFX.startEngine();
          engineStarted = true;
        }
        if (window.SFX.stopMenuAmbient) window.SFX.stopMenuAmbient();
        window.SFX.startMusic();
        if (roomCode !== "PUBLIC" && roomCode !== "NOBOTS") {
          setInviteState(roomCode, serverOrigin);
          updateShareInvite(roomCode, serverOrigin);
          els.share.classList.remove("hidden");
        } else {
          setInviteState(null, null);
          clearShareInvite();
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
        clearShareInvite();
        setBusy(false);
        fetchLeaderboard();
        setStatus("");
        updateMenuMeta(false);
        updateRotateOverlay();
      }
      function onDisconnect() {
        if (mode === "menu" || mode === "lost") return;
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
        updateMenuMeta(true);
      }
      function init() {
        readInviteFromUrl();
        primeLanInput();
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
        updateMenuMeta(false);
        clearShareInvite();
        if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient();
        if (window.Input.isTouchDevice()) document.body.classList.add("touch-device");
        els.quick.addEventListener("click", () => {
          window.SFX.uiClick();
          startGame(inviteRoom || "PUBLIC", inviteRoom ? inviteServer : null);
        });
        els.friends.addEventListener("click", () => {
          window.SFX.uiClick();
          startGame(genCode());
        });
        els.lanQuick.addEventListener("click", () => {
          window.SFX.uiClick();
          const origin = resolveLanOrigin();
          if (origin) startGame("PUBLIC", origin);
        });
        els.lanFriends.addEventListener("click", () => {
          window.SFX.uiClick();
          const origin = resolveLanOrigin();
          if (origin) startGame(genCode(), origin);
        });
        els.name.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            startGame(inviteRoom || "PUBLIC", inviteRoom ? inviteServer : null);
          }
        });
        els.lanServer.addEventListener("input", () => updateMenuMeta(true));
        els.lanServer.addEventListener("blur", () => commitLanInput());
        els.lanServer.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitLanInput();
            const origin = resolveLanOrigin();
            if (origin) startGame(inviteRoom || "PUBLIC", origin);
          }
        });
        els.qrBtn.addEventListener("click", () => {
          window.SFX.uiClick();
          showShareQr();
        });
        els.copy.addEventListener("click", async () => {
          const copied = await copyShareLink();
          if (copied) {
            els.copy.textContent = "Copied!";
            setTimeout(() => els.copy.textContent = "Copy", 1200);
          }
        });
        els.shareQrCopy.addEventListener("click", async () => {
          const copied = await copyShareLink();
          if (copied) {
            els.shareQrCopy.textContent = "Copied!";
            setTimeout(() => els.shareQrCopy.textContent = "Copy Link", 1200);
          }
        });
        els.shareQrClose.addEventListener("click", () => hideShareQr());
        els.shareQrOverlay.addEventListener("click", (e) => {
          if (e.target === els.shareQrOverlay) hideShareQr();
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
            hideShareQr();
          } else if (mode === "playing" && window.SFX.resume) {
            window.SFX.resume();
          }
        });
        window.addEventListener("orientationchange", updateRotateOverlay);
        window.addEventListener("resize", updateRotateOverlay);
        document.addEventListener("keydown", (e) => {
          if (e.key === "Escape" && !els.shareQrOverlay.classList.contains("hidden")) hideShareQr();
        });
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
