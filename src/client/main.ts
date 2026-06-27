// Orchestration: menu, HUD, connection, and render loop for the flat-world reboot.
import { WebRtcTransport } from "./host-sim";

const dollar = (id: string) => document.getElementById(id)!;
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
  start: dollar("start-screen"),
  name: dollar("name-input") as HTMLInputElement,
  quick: dollar("quickplay-btn") as HTMLButtonElement,
  friends: dollar("friends-btn") as HTMLButtonElement,
  lanServer: dollar("lan-server-input") as HTMLInputElement,
  lanQuick: dollar("lan-quick-btn") as HTMLButtonElement,
  lanFriends: dollar("lan-friends-btn") as HTMLButtonElement,
  lanHint: dollar("lan-hint"),
  serverBadge: dollar("menu-server-badge"),
  roomChip: dollar("room-code-chip"),
  orientationNote: dollar("orientation-note"),
  friendsNote: dollar("friends-note"),
  status: dollar("status"),
  mute: dollar("mute-btn") as HTMLButtonElement,
  pause: dollar("pause-screen"),
  resume: dollar("resume-btn") as HTMLButtonElement,
  pauseMenu: dollar("pause-menu-btn") as HTMLButtonElement,
  pauseSettings: dollar("pause-settings-btn") as HTMLButtonElement,
  share: dollar("share-bar"),
  shareLink: dollar("share-link") as HTMLInputElement,
  qrBtn: dollar("qr-btn") as HTMLButtonElement,
  copy: dollar("copy-btn") as HTMLButtonElement,
  shareQrOverlay: dollar("share-qr-overlay"),
  shareQrCanvas: dollar("share-qr-canvas") as HTMLCanvasElement,
  shareQrRoom: dollar("share-qr-room"),
  shareQrCode: dollar("share-qr-code"),
  shareQrNote: dollar("share-qr-note"),
  shareQrLink: dollar("share-qr-link") as HTMLInputElement,
  shareQrCopy: dollar("share-qr-copy") as HTMLButtonElement,
  shareQrClose: dollar("share-qr-close") as HTMLButtonElement,
  scanOverlay: dollar("scan-overlay"),
  scanVideo: dollar("scan-video") as HTMLVideoElement,
  scanCanvas: dollar("scan-canvas") as HTMLCanvasElement,
  scanStatus: dollar("scan-status"),
  scanCloseBtn: dollar("scan-close-btn") as HTMLButtonElement,
  scanOpenBtn: dollar("scan-open-btn") as HTMLButtonElement,
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
  connRetry: dollar("conn-retry") as HTMLButtonElement,
  connMenu: dollar("conn-menu") as HTMLButtonElement,
  bots: dollar("bots-check") as HTMLInputElement,
  countdown: dollar("countdown"),
  interLeave: dollar("intermission-leave") as HTMLButtonElement,
  // P2P additions
  p2pHostBtn: dollar("p2p-host-btn") as HTMLButtonElement,
  p2pOfflineBtn: dollar("p2p-offline-btn") as HTMLButtonElement,
  p2pOfflineCanvas: dollar("p2p-offline-canvas") as HTMLCanvasElement,
  p2pAnswerInput: dollar("p2p-answer-input") as HTMLInputElement,
  p2pAnswerSubmit: dollar("p2p-answer-submit") as HTMLButtonElement,
  p2pOfflineSection: dollar("p2p-offline-section"),
  hostLeftOverlay: dollar("host-left-overlay"),
  hostLeftMenuBtn: dollar("host-left-menu-btn") as HTMLButtonElement,
  p2pMigratingOverlay: dollar("p2p-migrating-overlay"),
  // Slice 1 additions
  bootOverlay: dollar("boot-overlay"),
  fatalOverlay: dollar("fatal-overlay"),
  fatalMsg: dollar("fatal-msg"),
  lobbyScreen: dollar("lobby-screen"),
  lobbyTitle: dollar("lobby-title"),
  lobbySettings: dollar("lobby-settings"),
  lobbyRoomName: dollar("lobby-room-name") as HTMLInputElement,
  lobbyRoundLength: dollar("lobby-round-length") as HTMLSelectElement,
  lobbyBotsCheck: dollar("lobby-bots-check") as HTMLInputElement,
  lobbyMode: dollar("lobby-mode") as HTMLSelectElement,
  hudTeamScore: dollar("hud-team-score"),
  hudTeamBlue: dollar("hud-team-blue"),
  hudTeamRed: dollar("hud-team-red"),
  hudTScore0: dollar("hud-tscore0"),
  hudTScore1: dollar("hud-tscore1"),
  lobbyRoster: dollar("lobby-roster"),
  lobbyReadyBtn: dollar("lobby-ready-btn") as HTMLButtonElement,
  lobbyStartBtn: dollar("lobby-start-btn") as HTMLButtonElement,
  lobbyLeaveBtn: dollar("lobby-leave-btn") as HTMLButtonElement,
  settingsScreen: dollar("settings-screen"),
  settingsCloseBtn: dollar("settings-close-btn") as HTMLButtonElement,
  settingsCloseBtn2: dollar("settings-close-btn2") as HTMLButtonElement,
  menuSettingsBtn: dollar("menu-settings-btn") as HTMLButtonElement,
  joinCodeModal: dollar("join-code-modal"),
  joinCodeInput: dollar("join-code-input") as HTMLInputElement,
  joinCodeSubmit: dollar("join-code-submit") as HTMLButtonElement,
  joinCodeCancel: dollar("join-code-cancel") as HTMLButtonElement,
  joinCodeOpenBtn: dollar("join-code-open-btn") as HTMLButtonElement,
  menuLeaderboard: dollar("menu-leaderboard"),
  hangarOverlay: dollar("hangar-overlay"),
  hangarBtn: dollar("hangar-btn") as HTMLButtonElement,
  hangarCloseBtn: dollar("hangar-close-btn") as HTMLButtonElement,
  hangarDone: dollar("hangar-done") as HTMLButtonElement,
};

let mode: "menu" | "lobby" | "playing" | "paused" | "lost" | "error" = "menu";
let settingsOpen = false;
let joinCodeOpen = false;
let hangarOpen = false;
let last = 0;
let prevPhase = "playing";
let prevHp = G.MAX_HP;
let streak = 0;
let lastKill = 0;
let lastFireSnd = 0;
let engineStarted = false;
let botsEnabled = true;
let selectedCosmetics: { color: number; bodyShape: number; accent: number; trail: number; livery: number } = { color: 0, bodyShape: 0, accent: 0, trail: 0, livery: 0 };
let inviteRoom: string | null = null;
let inviteServer: string | null = null;
let activeShareUrl: string | null = null;
// Respawn countdown tracking
let deathTime: number = -1;
let wasAlive: boolean = true;
// OOB warning throttle
let oobShownUntil: number = 0;
// Boost bar fill level [0..1], client-side only
let boostLevel: number = 0;
// Round-start countdown
let countdownActive = false;
// Slice 6: tracks the code + origin for the active private lobby
let currentLobbyCode: string | null = null;
let currentLobbyServer: string | null = null;
// Host settings debounce timer
let _settingsDebounce: ReturnType<typeof setTimeout> | null = null;
// P2P: reference to the original Colyseus Net so we can restore it on leave
let _colyseusNet: any = null;
// Whether the current session is P2P (host or guest)
let _isP2PSession = false;
// Scanner state
let scannerOpen = false;
let scanRafId: number | null = null;

const SKINS = [0xff6b6b, 0x49c0ff, 0x8be34a, 0xffd24a, 0xc07bff];

// COLORS hex list — must match COLORS array in render3d.js (12 entries, indices 0-11)
const COLORS_HEX = [
  "#ff6b6b", // 0 Scarlet
  "#49c0ff", // 1 Cobalt
  "#8be34a", // 2 Olive
  "#ffd24a", // 3 Sunburst
  "#c07bff", // 4 Violet
  "#ff9f43", // 5 Ember
  "#00d2d3", // 6 Teal
  "#ffeaa7", // 7 Cream
  "#dfe6e9", // 8 Ghost
  "#2d3436", // 9 Stealth
  "#e17055", // 10 Rust
  "#55efc4", // 11 Mint
];

try {
  // One-time migration: if old smashcart.skin exists but smashcart.color does not, copy it over.
  const legacySkin = localStorage.getItem("smashcart.skin");
  if (legacySkin !== null && localStorage.getItem("smashcart.color") === null) {
    const migrated = parseInt(legacySkin, 10);
    if (Number.isInteger(migrated) && migrated >= 0 && migrated < G.COLOR_COUNT) {
      localStorage.setItem("smashcart.color", String(migrated));
      selectedCosmetics.color = migrated;
    }
    localStorage.removeItem("smashcart.skin");
  } else {
    const savedColor = parseInt(localStorage.getItem("smashcart.color") || "", 10);
    if (Number.isInteger(savedColor) && savedColor >= 0 && savedColor < G.COLOR_COUNT) selectedCosmetics.color = savedColor;
  }
} catch {}
try {
  const savedBodyShape = parseInt(localStorage.getItem("smashcart.bodyShape") || "", 10);
  if (Number.isInteger(savedBodyShape) && savedBodyShape >= 0 && savedBodyShape < G.BODY_SHAPE_COUNT) selectedCosmetics.bodyShape = savedBodyShape;
} catch {}
try {
  const savedAccent = parseInt(localStorage.getItem("smashcart.accent") || "", 10);
  if (Number.isInteger(savedAccent) && savedAccent >= 0 && savedAccent < G.ACCENT_COUNT) selectedCosmetics.accent = savedAccent;
} catch {}
try {
  const savedTrail = parseInt(localStorage.getItem("smashcart.trail") || "", 10);
  if (Number.isInteger(savedTrail) && savedTrail >= 0 && savedTrail < G.TRAIL_COUNT) selectedCosmetics.trail = savedTrail;
} catch {}
try {
  const savedLivery = parseInt(localStorage.getItem("smashcart.livery") || "", 10);
  if (Number.isInteger(savedLivery) && savedLivery >= 0 && savedLivery < G.LIVERY_COUNT) selectedCosmetics.livery = savedLivery;
} catch {}
try {
  botsEnabled = localStorage.getItem("smashcart.bots") !== "0";
} catch {}

// Persisted input inversion flags — loaded into Input after Input is available
function loadInputPrefs(): void {
  try { window.Input.invertPitch = localStorage.getItem("smashcart.invertPitch") === "1"; } catch {}
  try { window.Input.invertSteer = localStorage.getItem("smashcart.invertSteer") === "1"; } catch {}
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function isPrivateHost(hostname: string): boolean {
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

function toPageOrigin(origin: string): string {
  const url = new URL(origin);
  if (url.protocol === "ws:") url.protocol = "http:";
  if (url.protocol === "wss:") url.protocol = "https:";
  return url.origin;
}

function toSocketOrigin(origin: string): string {
  const url = new URL(origin);
  if (url.protocol === "http:") url.protocol = "ws:";
  if (url.protocol === "https:") url.protocol = "wss:";
  return url.origin;
}

function normalizeServerOrigin(raw: string | null | undefined): string | null {
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

function secureMismatch(origin: string): boolean {
  return location.protocol === "https:" && toSocketOrigin(origin).startsWith("ws://");
}

function readInviteFromUrl(): void {
  const params = new URLSearchParams(location.search);
  const room = params.get("room");
  inviteRoom = room ? room.toUpperCase().slice(0, 6) : null;
  inviteServer = normalizeServerOrigin(params.get("server"));

  // P2P invite: ?p2p=P-XXXXXX
  const p2pParam = params.get("p2p");
  if (p2pParam) {
    const p2pCode = p2pParam.trim().toUpperCase().slice(0, 8); // "P-" + 6 chars
    if (p2pCode.startsWith("P-")) {
      // Override inviteRoom with the P2P code so Quick Play routes through P2P
      inviteRoom = p2pCode;
      inviteServer = null;
    }
  }
}

function loadSavedLanOrigin(): string {
  try {
    return localStorage.getItem("smashcart.lanServer") || "";
  } catch {
    return "";
  }
}

function saveLanOrigin(origin: string | null): void {
  try {
    if (origin) localStorage.setItem("smashcart.lanServer", toPageOrigin(origin));
    else localStorage.removeItem("smashcart.lanServer");
  } catch {}
}

function setInviteState(code: string | null, serverOrigin: string | null): void {
  inviteRoom = code;
  inviteServer = code ? serverOrigin : null;
  updateBrowserUrl(code, serverOrigin);
}

function updateBrowserUrl(code: string | null, serverOrigin: string | null): void {
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

function currentLanInputOrigin(): string | null {
  return normalizeServerOrigin(els.lanServer.value);
}

function currentLanConnectOrigin(): string | null {
  return currentLanInputOrigin() || (isPrivateHost(location.hostname) ? location.origin : null);
}

function buildShareUrl(code: string, serverOrigin: string | null): string {
  const base = serverOrigin ? toPageOrigin(serverOrigin) : location.origin;
  const url = new URL(location.pathname, base.endsWith("/") ? base : base + "/");
  url.searchParams.set("room", code);
  return url.toString();
}

function hideShareQr(): void {
  els.shareQrOverlay.classList.add("hidden");
}

async function copyShareLink(): Promise<boolean> {
  const value = activeShareUrl || els.shareLink.value;
  if (!value) return false;
  try { els.shareLink.select(); } catch {}
  try { els.shareQrLink.select(); } catch {}
  try {
    if (navigator.clipboard) await navigator.clipboard.writeText(value);
    else document.execCommand("copy");
    return true;
  } catch {
    return false;
  }
}

function updateShareInvite(code: string, serverOrigin: string | null): void {
  const shareUrl = buildShareUrl(code, serverOrigin);
  const shareHost = new URL(serverOrigin ? toPageOrigin(serverOrigin) : location.origin).host;
  const shareHostname = new URL(shareUrl).hostname;
  activeShareUrl = shareUrl;
  els.shareLink.value = shareUrl;
  els.shareQrLink.value = shareUrl;
  els.shareQrRoom.textContent = `Room ${code}`;
  els.shareQrCode.textContent = code;
  els.shareQrNote.textContent = isPrivateHost(shareHostname)
    ? `Scan on the same hotspot to join ${code} at ${shareHost}.`
    : `Scan to open room ${code} on ${shareHost}.`;
  els.copy.disabled = false;
  els.shareQrCopy.disabled = false;
  try {
    window.QR.render(els.shareQrCanvas, shareUrl, {
      size: window.Input.isTouchDevice() ? 220 : 256,
      errorCorrectionLevel: "M",
    });
    els.qrBtn.disabled = false;
  } catch {
    els.qrBtn.disabled = true;
    els.shareQrNote.textContent = `Copy the link to join ${code} on ${shareHost}.`;
    els.shareQrCanvas.width = 0;
    els.shareQrCanvas.height = 0;
  }
}

function clearShareInvite(): void {
  activeShareUrl = null;
  els.shareLink.value = "";
  els.shareQrLink.value = "";
  els.shareQrRoom.textContent = "Room";
  els.shareQrCode.textContent = "";
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

function showShareQr(): void {
  if (!activeShareUrl || els.qrBtn.disabled) return;
  els.shareQrOverlay.classList.remove("hidden");
}

// ─── LOBBY ROSTER ────────────────────────────────────────────────────────────
function renderLobbyRoster(): void {
  const myId = window.Net.sessionId;
  const hostId = window.Net.getHostId();
  const roster = window.Net.getRosterSnapshot();
  const iAmHost = myId === hostId;

  // Update title: prefer roomName from state, fallback to code label
  const stateName = window.Net.state?.roomName;
  if (stateName) {
    els.lobbyTitle.textContent = stateName;
  } else if (currentLobbyCode) {
    els.lobbyTitle.textContent = `Room ${currentLobbyCode}`;
  }

  // Show/hide and reflect settings panel (host only)
  if (iAmHost) {
    els.lobbySettings.classList.remove("hidden");
    // Reflect server state into inputs only when they are not focused (avoid clobbering typing)
    const serverRoomName = window.Net.state?.roomName ?? "";
    const serverRoundLength = String(window.Net.state?.roundLength ?? 150);
    if (document.activeElement !== els.lobbyRoomName) {
      els.lobbyRoomName.value = serverRoomName;
    }
    if (document.activeElement !== els.lobbyRoundLength) {
      els.lobbyRoundLength.value = serverRoundLength;
    }
    // Reflect botsInRoom from server state (checkbox doesn't need focus-guard — it's a click, not typing)
    const serverBotsInRoom = window.Net.state?.botsInRoom ?? false;
    els.lobbyBotsCheck.checked = serverBotsInRoom;
    // Reflect mode from server state
    const serverMode = window.Net.state?.mode ?? "ffa";
    els.lobbyMode.value = serverMode;
  } else {
    els.lobbySettings.classList.add("hidden");
  }

  if (!roster.length) {
    els.lobbyRoster.innerHTML = '<p class="muted">Waiting for players…</p>';
    return;
  }

  els.lobbyRoster.innerHTML = roster.map((p) => {
    const isMe = p.id === myId;
    const isHost = p.id === hostId;
    const isLocalHost = myId === hostId;

    const hostBadge = isHost
      ? '<span class="lobby-badge lobby-badge--host">HOST</span>'
      : '';
    const botBadge = p.bot
      ? '<span class="lobby-badge lobby-badge--bot">BOT</span>'
      : '';
    const readyMark = !p.bot
      ? `<span class="lobby-ready-mark ${p.ready ? 'is-ready' : ''}">${p.ready ? '✓' : '○'}</span>`
      : '';
    const kickBtn = (isLocalHost && !isMe && !p.bot)
      ? `<button class="lobby-kick-btn secondary" data-target="${escapeHtml(p.id)}" title="Kick">✕</button>`
      : '';
    // Color dot — uses the player's cosmetic color index (p.color), falling back to 0
    const colorHex = COLORS_HEX[typeof p.color === 'number' && p.color >= 0 && p.color < COLORS_HEX.length ? p.color : 0];
    const colorDot = `<span class="lobby-color-dot" style="background:${colorHex}"></span>`;

    return `<div class="lobby-row${isMe ? ' lobby-row--me' : ''}">
  <span class="lobby-row-name">${colorDot}${hostBadge}${botBadge}${escapeHtml(p.name)}</span>
  <span class="lobby-row-right">${readyMark}${kickBtn}</span>
</div>`;
  }).join('');

  // Wire kick buttons (re-attached every render since innerHTML is replaced)
  els.lobbyRoster.querySelectorAll<HTMLButtonElement>('.lobby-kick-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      if (targetId) { window.SFX.uiClick(); window.Net.sendHostKick(targetId); }
    });
  });

  // Update ready button label from server state (not optimistic)
  const me = roster.find((p) => p.id === myId);
  if (me) {
    els.lobbyReadyBtn.textContent = me.ready ? 'Unready' : 'Ready';
    els.lobbyReadyBtn.classList.toggle('active', me.ready);
  }

  // Show/hide start button — host only
  els.lobbyStartBtn.classList.toggle('hidden', !iAmHost);
}

// Transition from lobby to in-game (called when server phase flips to 'playing')
function enterPlayingFromLobby(): void {
  prevPhase = "playing";
  prevHp = G.MAX_HP;
  wasAlive = true;
  deathTime = -1;
  applyMode("playing");
  els.respawn.classList.add("hidden");
  els.inter.classList.add("hidden");
  if (window.Input.isTouchDevice()) { els.touch.classList.remove("hidden"); applyControlSchemeUI(window.Input.controlScheme); }
  if (!engineStarted) {
    window.SFX.startEngine();
    engineStarted = true;
  }
  if (window.SFX.stopMenuAmbient) window.SFX.stopMenuAmbient();
  window.SFX.startMusic();
  runCountdown(); // 3-2-1-GO! on a fresh lobby match start (prevPhase is pre-set, so the loop won't)
}

function setStatus(text = ""): void {
  els.status.textContent = text;
}

function setBusy(busy: boolean): void {
  els.quick.disabled = busy;
  els.friends.disabled = busy;
  els.lanQuick.disabled = busy;
  els.lanFriends.disabled = busy;
}

function updateMenuMeta(preserveStatus = true): void {
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
    els.lanHint.textContent = isPrivateHost(url.hostname)
      ? `LAN target ready: ${url.host}. Share that local address with everyone on the hotspot.`
      : `Custom server selected: ${url.host}. Latency only improves if that server is on the same local network.`;
  } else if (isPrivateHost(location.hostname)) {
    els.lanHint.textContent = `This device is already serving the game locally at ${location.host}. Use the LAN buttons or share this address.`;
  } else {
    els.lanHint.textContent = "For hotspot play, run the game on the host device and enter its local address here.";
  }
}

function primeLanInput(): void {
  const preferred = inviteServer ? toPageOrigin(inviteServer) : loadSavedLanOrigin() || (isPrivateHost(location.hostname) ? location.origin : "");
  els.lanServer.value = preferred;
}

function commitLanInput(): void {
  const normalized = currentLanInputOrigin();
  if (normalized) {
    els.lanServer.value = toPageOrigin(normalized);
    saveLanOrigin(normalized);
  } else if (!els.lanServer.value.trim()) {
    saveLanOrigin(null);
  }
  updateMenuMeta(true);
}

function resolveLanOrigin(): string | null {
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

// ─── STATE MACHINE ───────────────────────────────────────────────────────────
// applyMode() is the single source of truth for which top-level screens are
// visible. Sub-state overlays (settings, join-code, share-qr, intermission,
// rotate) are managed by their own helpers and do NOT change `mode`.
function applyMode(nextMode: typeof mode): void {
  mode = nextMode;

  // Top-level screen visibility
  const isMenu    = mode === "menu";
  const isLobby   = mode === "lobby";
  const isPlaying = mode === "playing" || mode === "paused";
  const isLost    = mode === "lost";
  const isError   = mode === "error";

  els.bootOverlay.classList.add("hidden");           // boot overlay only shown pre-init
  els.start.classList.toggle("hidden", !isMenu);
  els.lobbyScreen.classList.toggle("hidden", !isLobby);
  els.hud.classList.toggle("hidden", !isPlaying);
  els.health.classList.toggle("hidden", !isPlaying);
  els.pause.classList.toggle("hidden", mode !== "paused");
  els.connLost.classList.toggle("hidden", !isLost);
  els.fatalOverlay.classList.toggle("hidden", !isError);
  // Crosshair: visible only when actively playing (not paused)
  els.crosshair.classList.toggle("hidden", mode !== "playing");
  // OOB warning: always off on mode transitions; updateHud re-enables if needed
  if (mode !== "playing") els.oobWarning.classList.add("hidden");
  // P2P host-left overlay: always hide on any mode transition (reset path shows it explicitly)
  els.hostLeftOverlay.classList.add("hidden");
  // P2P migrating overlay: always hide on mode transitions
  els.p2pMigratingOverlay.classList.add("hidden");
}

function showHostLeftOverlay(): void {
  els.hostLeftOverlay.classList.remove("hidden");
}

// ─── FATAL ERROR ─────────────────────────────────────────────────────────────
function showFatal(msg: string): void {
  els.fatalMsg.textContent = msg;
  applyMode("error");
}

// ─── SETTINGS OVERLAY ────────────────────────────────────────────────────────
// Settings is a sub-state: it doesn't change `mode`, it overlays on top.

// Sync all settings controls to current live state so the UI matches reality.
function populateSettingsUI(): void {
  const vols = window.SFX.vols();
  const volMasterEl = document.getElementById("set-vol-master") as HTMLInputElement | null;
  const volSfxEl    = document.getElementById("set-vol-sfx")    as HTMLInputElement | null;
  const volMusicEl  = document.getElementById("set-vol-music")  as HTMLInputElement | null;
  if (volMasterEl) volMasterEl.value = String(vols.master);
  if (volSfxEl)    volSfxEl.value    = String(vols.sfx);
  if (volMusicEl)  volMusicEl.value  = String(vols.music);

  // Quality — #set-quality may be a <select> or a group of <input type="radio">
  const qualityTier = window.Quality._auto ? "auto" : window.Quality.current;
  const qualitySelect = document.getElementById("set-quality") as HTMLSelectElement | null;
  if (qualitySelect && qualitySelect.tagName === "SELECT") {
    qualitySelect.value = qualityTier;
  } else {
    // Radio group
    const radios = document.querySelectorAll<HTMLInputElement>('input[name="set-quality"]');
    radios.forEach((r) => { r.checked = r.value === qualityTier; });
  }

  const invertPitchEl = document.getElementById("set-invert-pitch") as HTMLInputElement | null;
  const invertSteerEl = document.getElementById("set-invert-steer") as HTMLInputElement | null;
  if (invertPitchEl) invertPitchEl.checked = window.Input.invertPitch;
  if (invertSteerEl) invertSteerEl.checked = window.Input.invertSteer;

  // Reflect control scheme
  const schemeRadios = document.querySelectorAll<HTMLInputElement>('input[name="ctrl-scheme"]');
  schemeRadios.forEach((r) => { r.checked = r.value === window.Input.controlScheme; });
}

function showSettings(): void {
  settingsOpen = true;
  populateSettingsUI();
  els.settingsScreen.classList.remove("hidden");
}

function hideSettings(): void {
  settingsOpen = false;
  els.settingsScreen.classList.add("hidden");
}

// ─── JOIN-BY-CODE MODAL ───────────────────────────────────────────────────────
function openJoinCode(): void {
  joinCodeOpen = true;
  els.joinCodeModal.classList.remove("hidden");
  els.joinCodeInput.value = "";
  els.joinCodeInput.focus();
}

function closeJoinCode(): void {
  joinCodeOpen = false;
  els.joinCodeModal.classList.add("hidden");
}

// ─── CAMERA QR SCANNER ────────────────────────────────────────────────────────
function stopScanCamera(): void {
  if (scanRafId !== null) { cancelAnimationFrame(scanRafId); scanRafId = null; }
  const vid = els.scanVideo;
  const s = vid.srcObject as MediaStream | null;
  if (s) { s.getTracks().forEach((t) => t.stop()); vid.srcObject = null; }
}

function extractCodeFromScanResult(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Try to parse as URL first (invite link with ?p2p= / ?room= / ?code=)
  try {
    const url = new URL(trimmed);
    const p2p = url.searchParams.get("p2p");
    if (p2p) return p2p.trim().toUpperCase().slice(0, 6);
    const room = url.searchParams.get("room");
    if (room) return room.trim().toUpperCase().slice(0, 6);
    const code = url.searchParams.get("code");
    if (code) return code.trim().toUpperCase().slice(0, 6);
  } catch { /* not a URL — fall through */ }
  // Bare code: uppercase alphanumeric
  const bare = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return bare || null;
}

function openScanner(): void {
  scannerOpen = true;
  els.scanOverlay.classList.remove("hidden");
  els.scanStatus.textContent = "Starting camera…";

  // Feature-detect: requires secure context + getUserMedia
  if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    els.scanStatus.textContent =
      "Camera needs a secure (HTTPS) connection. On a local Wi-Fi host this isn't available — " +
      "type the code instead, or scan the host's QR with your phone's normal camera app.";
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" }, audio: false })
    .then((stream) => {
      if (!scannerOpen) { stream.getTracks().forEach((t) => t.stop()); return; }
      els.scanVideo.srcObject = stream;
      els.scanStatus.textContent = "Point at a SmashCart QR code…";
      els.scanVideo.play().catch(() => {});

      function tick(): void {
        if (!scannerOpen) return;
        const vid = els.scanVideo;
        if (vid.readyState < vid.HAVE_ENOUGH_DATA) {
          scanRafId = requestAnimationFrame(tick);
          return;
        }
        const w = vid.videoWidth;
        const h = vid.videoHeight;
        if (!w || !h) { scanRafId = requestAnimationFrame(tick); return; }
        const cvs = els.scanCanvas;
        cvs.width = w;
        cvs.height = h;
        const ctx = cvs.getContext("2d")!;
        ctx.drawImage(vid, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const result = (typeof jsQR !== "undefined" ? jsQR : (window as any).jsQR)?.(img.data, w, h);
        if (result && result.data) {
          const code = extractCodeFromScanResult(result.data);
          if (code) {
            els.scanStatus.textContent = "QR detected — joining…";
            stopScanCamera();
            scannerOpen = false;
            els.scanOverlay.classList.add("hidden");
            // Route through the existing join path: set input value and call startGame
            els.joinCodeInput.value = code;
            closeJoinCode();
            window.SFX.uiClick();
            startGame(code, null);
            return;
          }
        }
        scanRafId = requestAnimationFrame(tick);
      }

      scanRafId = requestAnimationFrame(tick);
    })
    .catch((err: DOMException) => {
      let msg = "Camera error. Type the code instead.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Camera permission denied. Allow camera access in your browser settings, or type the code instead.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "No camera found on this device. Type the code instead.";
      } else if (err.name === "NotReadableError") {
        msg = "Camera is in use by another app. Close it and try again, or type the code instead.";
      }
      els.scanStatus.textContent = msg;
    });
}

function closeScanner(): void {
  scannerOpen = false;
  stopScanCamera();
  els.scanOverlay.classList.add("hidden");
}

function fetchLeaderboard(): void {
  fetch("/leaderboard?n=10")
    .then((r) => (r.ok ? r.json() : []))
    .then((rows) => {
      if (!Array.isArray(rows) || !rows.length) {
        els.leaderboard.innerHTML = '<div class="lb-row muted">No scores yet</div>';
        els.menuLeaderboard.innerHTML = '<div class="lb-row muted">No scores yet</div>';
        return;
      }
      const makeRow = (entry: any, i: number) =>
        `<div class="lb-row"><span>${i + 1}. ${escapeHtml(entry.name)}</span><span>${entry.score | 0}</span></div>`;
      els.leaderboard.innerHTML = rows.slice(0, 5).map(makeRow).join("");
      els.menuLeaderboard.innerHTML = rows.slice(0, 10).map(makeRow).join("");
    })
    .catch(() => {
      els.leaderboard.innerHTML = '<div class="lb-row muted">Leaderboard unavailable</div>';
      els.menuLeaderboard.innerHTML = '<div class="lb-row muted">Leaderboard unavailable</div>';
    });
}

// ─── HANGAR OVERLAY ──────────────────────────────────────────────────────────

function showHangar(): void {
  hangarOpen = true;
  els.hangarOverlay.classList.remove("hidden");
  // Tell renderer to switch to hangar showcase framing (zoomed, slower orbit)
  if (window.Renderer && window.Renderer.setHangarOpen) window.Renderer.setHangarOpen(true);
  // Sync live preview immediately to current cosmetics
  if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(selectedCosmetics);
}

function hideHangar(): void {
  hangarOpen = false;
  els.hangarOverlay.classList.add("hidden");
  // Restore normal menu camera framing
  if (window.Renderer && window.Renderer.setHangarOpen) window.Renderer.setHangarOpen(false);
}

function buildHangar(): void {
  // ── TABS ──────────────────────────────────────────────────────────────────
  const tabs = els.hangarOverlay.querySelectorAll<HTMLButtonElement>(".hangar-tab");
  const sections = els.hangarOverlay.querySelectorAll<HTMLElement>(".hangar-section");

  function activateTab(tabName: string): void {
    tabs.forEach((t) => {
      const active = t.dataset.tab === tabName;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    sections.forEach((s) => {
      const active = s.dataset.section === tabName;
      s.classList.toggle("active", active);
      s.classList.toggle("hidden", !active);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      window.SFX.uiClick();
      activateTab(tab.dataset.tab!);
    });
  });

  // ── BODY SHAPE (0-3) ──────────────────────────────────────────────────────
  const shapeLabels = ["Fighter", "Interceptor", "Bomber", "Biplane"];
  shapeLabels.forEach((_, i) => {
    const btn = dollar(`hangar-shape-${i}`);
    btn.classList.toggle("selected", selectedCosmetics.bodyShape === i);
    btn.addEventListener("click", () => {
      selectedCosmetics.bodyShape = i;
      try { localStorage.setItem("smashcart.bodyShape", String(i)); } catch {}
      els.hangarOverlay.querySelectorAll<HTMLButtonElement>(".hangar-shape-btn").forEach((b, j) => b.classList.toggle("selected", j === i));
      window.SFX.uiClick();
      if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(selectedCosmetics);
    });
  });

  // ── COLORS (0-11) ─────────────────────────────────────────────────────────
  COLORS_HEX.forEach((_, i) => {
    const btn = dollar(`hangar-color-${i}`);
    btn.classList.toggle("selected", selectedCosmetics.color === i);
    btn.addEventListener("click", () => {
      selectedCosmetics.color = i;
      try { localStorage.setItem("smashcart.color", String(i)); } catch {}
      els.hangarOverlay.querySelectorAll<HTMLButtonElement>("[id^='hangar-color-']").forEach((b) => {
        const idx = parseInt(b.id.replace("hangar-color-", ""), 10);
        b.classList.toggle("selected", idx === i);
      });
      window.SFX.uiClick();
      if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(selectedCosmetics);
    });
  });

  // ── ACCENT (0-6) ──────────────────────────────────────────────────────────
  const accentCount = 7;
  for (let i = 0; i < accentCount; i++) {
    const btn = dollar(`hangar-accent-${i}`);
    btn.classList.toggle("selected", selectedCosmetics.accent === i);
    btn.addEventListener("click", () => {
      selectedCosmetics.accent = i;
      try { localStorage.setItem("smashcart.accent", String(i)); } catch {}
      els.hangarOverlay.querySelectorAll<HTMLButtonElement>("[id^='hangar-accent-']").forEach((b) => {
        const idx = parseInt(b.id.replace("hangar-accent-", ""), 10);
        b.classList.toggle("selected", idx === i);
      });
      window.SFX.uiClick();
      if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(selectedCosmetics);
    });
  }

  // ── LIVERY (0-3) ──────────────────────────────────────────────────────────
  const liveryLabels = ["Clean", "Stripe", "Two-Tone", "Camo"];
  liveryLabels.forEach((_, i) => {
    const btn = dollar(`hangar-livery-${i}`);
    btn.classList.toggle("selected", selectedCosmetics.livery === i);
    btn.addEventListener("click", () => {
      selectedCosmetics.livery = i;
      try { localStorage.setItem("smashcart.livery", String(i)); } catch {}
      els.hangarOverlay.querySelectorAll<HTMLButtonElement>(".hangar-livery-btn").forEach((b, j) => b.classList.toggle("selected", j === i));
      window.SFX.uiClick();
      if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(selectedCosmetics);
    });
  });

  // ── TRAIL (0-4) ───────────────────────────────────────────────────────────
  const trailCount = 5;
  for (let i = 0; i < trailCount; i++) {
    const btn = dollar(`hangar-trail-${i}`);
    btn.classList.toggle("selected", selectedCosmetics.trail === i);
    btn.addEventListener("click", () => {
      selectedCosmetics.trail = i;
      try { localStorage.setItem("smashcart.trail", String(i)); } catch {}
      els.hangarOverlay.querySelectorAll<HTMLButtonElement>("[id^='hangar-trail-']").forEach((b) => {
        const idx = parseInt(b.id.replace("hangar-trail-", ""), 10);
        b.classList.toggle("selected", idx === i);
      });
      window.SFX.uiClick();
      if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(selectedCosmetics);
    });
  }
}

// ─── PUBLIC QUICK-PLAY (unchanged path) ──────────────────────────────────────
async function startGame(code: string, serverOrigin: string | null = null): Promise<void> {
  let roomCode = code;
  if (roomCode === "PUBLIC" && !botsEnabled) roomCode = "NOBOTS";

  // P2P guest join: codes starting with "P-" go through the WebRTC path
  if (roomCode.startsWith("P-")) {
    return joinP2PAsGuest(roomCode);
  }

  // Only PUBLIC and NOBOTS go through the instant-playing path.
  // Private codes (anything else) go through the lobby.
  if (roomCode !== "PUBLIC" && roomCode !== "NOBOTS") {
    return joinLobby(roomCode, serverOrigin);
  }

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
  setStatus("Connecting…");
  setBusy(true);

  try {
    await window.Net.connect(name, roomCode, selectedCosmetics, serverOrigin);
  } catch (e: any) {
    setStatus("Could not connect: " + (e && e.message ? e.message : e));
    setBusy(false);
    return;
  }

  prevPhase = "playing";
  prevHp = G.MAX_HP;
  wasAlive = true;
  deathTime = -1;
  applyMode("playing");
  els.respawn.classList.add("hidden");
  els.inter.classList.add("hidden");
  setStatus("");
  if (window.Input.isTouchDevice()) { els.touch.classList.remove("hidden"); applyControlSchemeUI(window.Input.controlScheme); }
  if (!engineStarted) {
    window.SFX.startEngine();
    engineStarted = true;
  }
  if (window.SFX.stopMenuAmbient) window.SFX.stopMenuAmbient();
  window.SFX.startMusic();

  // Public rooms have no invite share bar
  setInviteState(null, null);
  clearShareInvite();
  els.share.classList.add("hidden");
}

// ─── PRIVATE LOBBY PATH ───────────────────────────────────────────────────────
// Called for any non-PUBLIC, non-NOBOTS code: creates or joins via Colyseus
// and lands in mode='lobby'. The 3D scene keeps drawing behind the lobby card.
async function joinLobby(code: string, serverOrigin: string | null = null): Promise<void> {
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

  const name = (els.name.value || "Pilot").slice(0, 14);
  setStatus("Connecting…");
  setBusy(true);

  try {
    await window.Net.connect(name, code, selectedCosmetics, serverOrigin);
  } catch (e: any) {
    setStatus("Could not connect: " + (e && e.message ? e.message : e));
    setBusy(false);
    return;
  }

  setStatus("");
  setBusy(false);

  currentLobbyCode = code;
  currentLobbyServer = serverOrigin;

  // Show the invite share bar so the host can share the link immediately
  setInviteState(code, serverOrigin);
  updateShareInvite(code, serverOrigin);
  els.share.classList.remove("hidden");

  // Wire the state-change callback so roster and phase transitions are reactive
  window.Net.onStateChange = onLobbyStateChange;

  // Update lobby title
  els.lobbyTitle.textContent = `Room ${code}`;

  // Initial roster render
  renderLobbyRoster();

  applyMode("lobby");

  // If the server already reports 'playing' by the time we connect (e.g. late
  // join after host force-started), skip straight to playing.
  const phase = window.Net.getPhase();
  if (phase === "playing") {
    window.Net.onStateChange = null;
    enterPlayingFromLobby();
  }
}

// ─── P2P HOST PATH ────────────────────────────────────────────────────────────
async function startP2PHost(): Promise<void> {
  window.SFX.unlock();
  enterImmersive();

  const name   = (els.name.value || "Pilot").slice(0, 14);
  const code   = "P-" + genCode();          // e.g. "P-ABCDEF"

  // Save Colyseus Net before swapping
  if (!_isP2PSession) {
    _colyseusNet = (window as any).Net;
  }

  const transport = new WebRtcTransport();
  (window as any).Net = transport;
  _isP2PSession = true;

  // Wire callbacks
  transport.onKill       = onKill;
  transport.onPickup     = onPickup;
  transport.onDisconnect = onP2PDisconnect;

  setStatus("Starting P2P host…");
  setBusy(true);

  try {
    await (transport as any).startHost(name, code, selectedCosmetics);
  } catch (e: any) {
    setStatus("Could not start P2P host: " + (e && e.message ? e.message : e));
    setBusy(false);
    // Restore Colyseus on failure
    (window as any).Net = _colyseusNet;
    _colyseusNet  = null;
    _isP2PSession = false;
    return;
  }

  setStatus("");
  setBusy(false);

  currentLobbyCode   = code;
  currentLobbyServer = null;

  // Show share overlay with P2P join URL (?p2p=P-XXXXXX)
  const p2pUrl = buildP2PShareUrl(code);
  activeShareUrl = p2pUrl;
  els.shareLink.value         = p2pUrl;
  els.shareQrLink.value       = p2pUrl;
  els.shareQrRoom.textContent = `Room ${code}`;
  els.shareQrCode.textContent = code;
  els.shareQrNote.textContent = `Scan on the same Wi-Fi to join P2P room ${code}.`;
  els.copy.disabled           = false;
  els.shareQrCopy.disabled    = false;
  try {
    window.QR.render(els.shareQrCanvas, p2pUrl, {
      size: window.Input.isTouchDevice() ? 220 : 256,
      errorCorrectionLevel: "M",
    });
    els.qrBtn.disabled = false;
  } catch {
    els.qrBtn.disabled = true;
    els.shareQrCanvas.width = 0;
  }
  els.share.classList.remove("hidden");

  transport.onStateChange = onLobbyStateChange;
  els.lobbyTitle.textContent = `P2P Room ${code}`;
  renderLobbyRoster();
  applyMode("lobby");
}

function buildP2PShareUrl(code: string): string {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set("p2p", code);
  return url.toString();
}

// ─── P2P GUEST PATH ──────────────────────────────────────────────────────────
async function joinP2PAsGuest(code: string): Promise<void> {
  window.SFX.unlock();
  enterImmersive();

  const name = (els.name.value || "Pilot").slice(0, 14);

  // Save Colyseus Net before swapping
  if (!_isP2PSession) {
    _colyseusNet = (window as any).Net;
  }

  const transport = new WebRtcTransport();
  (window as any).Net = transport;
  _isP2PSession = true;

  transport.onKill       = onKill;
  transport.onPickup     = onPickup;
  transport.onDisconnect = onP2PDisconnect;

  setStatus("Connecting via P2P…");
  setBusy(true);

  try {
    await transport.connect(name, code, selectedCosmetics, null);
  } catch (e: any) {
    setStatus("Could not connect (P2P): " + (e && e.message ? e.message : e));
    setBusy(false);
    (window as any).Net = _colyseusNet;
    _colyseusNet  = null;
    _isP2PSession = false;
    return;
  }

  setStatus("");
  setBusy(false);

  currentLobbyCode   = code;
  currentLobbyServer = null;

  // Share bar shows the invite URL (guest can also share it)
  const p2pUrl = buildP2PShareUrl(code);
  activeShareUrl = p2pUrl;
  els.shareLink.value = p2pUrl;
  els.share.classList.remove("hidden");

  transport.onStateChange = onLobbyStateChange;
  els.lobbyTitle.textContent = `P2P Room ${code}`;
  renderLobbyRoster();
  applyMode("lobby");

  const phase = transport.getPhase();
  if (phase === "playing") {
    transport.onStateChange = null;
    enterPlayingFromLobby();
  }
}

// ─── P2P DISCONNECT HANDLER ───────────────────────────────────────────────────
function onP2PDisconnect(info: any): void {
  if (info && info.type === "host-migrating") {
    // A new host is being elected — show the reconnecting overlay and wait.
    if (window.SFX.suspend) window.SFX.suspend();
    els.p2pMigratingOverlay.classList.remove("hidden");
    return;
  }
  if (info && info.type === "migration-complete") {
    // Migration succeeded — hide the overlay and resume.
    els.p2pMigratingOverlay.classList.add("hidden");
    if (window.SFX.resume) window.SFX.resume();
    return;
  }
  if (info && (info.type === "host-left" || info.type === "kicked")) {
    // Show the host-left overlay rather than the generic conn-lost screen.
    // Also ensure the migrating overlay is hidden (covers timeout fallback path).
    els.p2pMigratingOverlay.classList.add("hidden");
    if (window.SFX.suspend) window.SFX.suspend();
    showHostLeftOverlay();
    return;
  }
  // Fall through to generic disconnect for other failures
  onDisconnect(info);
}

// Called every time the Colyseus state changes while in the lobby
function onLobbyStateChange(): void {
  const phase = window.Net.getPhase();

  if (mode === "lobby") {
    renderLobbyRoster();
    if (phase === "playing") {
      // Server flipped to playing — everyone enters the game
      window.Net.onStateChange = null;
      enterPlayingFromLobby();
    }
  } else if (mode === "playing" || mode === "paused") {
    // Already playing — normal state changes are handled by the render loop
    // (updateHud). Nothing extra needed here.
  }
}

function loop(ts: number): void {
  requestAnimationFrame(loop);
  let dt = (ts - last) / 1000;
  last = ts;
  if (!isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 0.05);

  const state = window.Net.state;
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
    // Draw the 3D scene behind the lobby card; no input sent in lobby
    window.Renderer.draw(state, window.Net.sessionId);
  } else if (mode === "menu") {
    window.Renderer.drawMenu(dt, selectedCosmetics);
  } else if (state) {
    window.Renderer.draw(state, window.Net.sessionId);
  }
}

function updateHud(state: any, myId: string): void {
  const me = state.players.get(myId);
  const local = (window.Net as any).localPose;
  els.score.textContent = String(me ? me.score : 0);
  els.time.textContent = String(Math.ceil(state.timeLeft));
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

  // OOB warning: show when within MAP_EDGE_SOFT of MAP_HALF boundary on x or z
  const posX = local && local.active ? local.p.x : me ? me.px : 0;
  const posZ = local && local.active ? local.p.z : me ? me.pz : 0;
  const isOob = Math.abs(posX) > (G.MAP_HALF - G.MAP_EDGE_SOFT) ||
                Math.abs(posZ) > (G.MAP_HALF - G.MAP_EDGE_SOFT);
  const nowSec = performance.now() / 1000;
  if (isOob && me && me.alive) {
    if (nowSec >= oobShownUntil) {
      els.oobWarning.classList.remove("hidden");
      oobShownUntil = nowSec + 2.0; // throttle: don't re-show for 2s after it hides
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

    // Respawn countdown
    if (!me.alive) {
      // Detect alive->dead transition
      if (wasAlive) {
        deathTime = performance.now() / 1000;
        wasAlive = false;
      }
      const elapsed = performance.now() / 1000 - deathTime;
      const remaining = Math.max(0, Math.ceil(G.RESPAWN_DELAY - elapsed));
      els.respawn.textContent = remaining > 0
        ? `Shot down — respawning in ${remaining}…`
        : "Shot down — respawning…";
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

    // Power chip — hide for 'repair' (instantaneous, no timer bar meaningful)
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
  }

  const isTdm = (state.mode === "tdm");

  // TDM team score bar
  if (isTdm) {
    els.hudTeamScore.classList.remove("hidden");
    const ts0 = state.teamScore0 ?? 0;
    const ts1 = state.teamScore1 ?? 0;
    els.hudTScore0.textContent = String(ts0);
    els.hudTScore1.textContent = String(ts1);
    // Highlight the local player's team chip
    const myTeam = me ? (me.team ?? -1) : -1;
    els.hudTeamBlue.classList.toggle("is-my-team", myTeam === 0);
    els.hudTeamRed.classList.toggle("is-my-team", myTeam === 1);
  } else {
    els.hudTeamScore.classList.add("hidden");
  }

  const list: Array<{ id: string; name: string; score: number; bot: boolean; team: number }> = [];
  state.players.forEach((p: any, id: string) => list.push({ id, name: p.name, score: p.score, bot: p.bot, team: p.team ?? -1 }));
  list.sort((a, b) => b.score - a.score);
  els.leaderboard.innerHTML = list.slice(0, 5).map((p, i) => {
    const teamDot = isTdm && p.team >= 0
      ? `<span class="lb-team-dot" style="background:${p.team === 0 ? "#4aa3ff" : "#ff5a5a"}"></span>`
      : "";
    return `<div class="lb-row ${p.id === myId ? "me" : ""}"><span>${teamDot}${i + 1}. ${escapeHtml(p.name)}${p.bot ? " 🤖" : ""}</span><span>${p.score}</span></div>`;
  }).join("");

  // Phase transition detection
  if (state.phase !== prevPhase) {
    if (state.phase === "intermission") {
      window.SFX.explosion();
    } else if (state.phase === "playing") {
      // Transitioning INTO playing — fire the 3-2-1-GO! countdown
      // (SFX.go() is called inside runCountdown on "GO!" step)
      runCountdown();
    } else {
      window.SFX.go();
    }
    prevPhase = state.phase;
  }

  if (state.phase === "intermission") {
    els.inter.classList.remove("hidden");
    els.interTime.textContent = String(Math.ceil(state.timeLeft));
    if (isTdm) {
      const ts0 = state.teamScore0 ?? 0;
      const ts1 = state.teamScore1 ?? 0;
      const myTeam = me ? (me.team ?? -1) : -1;
      const winTeam = ts0 > ts1 ? 0 : ts1 > ts0 ? 1 : -1;
      const winTeamName = winTeam === 0 ? "Blue" : winTeam === 1 ? "Red" : null;
      if (winTeam < 0) {
        els.winnerLine.textContent = "🏆 Draw!";
      } else if (myTeam === winTeam) {
        els.winnerLine.textContent = `🏆 ${winTeamName} team wins! (You're on it!)`;
      } else {
        els.winnerLine.textContent = `🏆 ${winTeamName} team wins!`;
      }
    } else {
      const winner = list[0];
      els.winnerLine.textContent = winner ? (winner.id === myId ? "🏆 You win!" : `🏆 ${winner.name} wins!`) : "";
    }
    els.finalBoard.innerHTML = list.slice(0, 6).map((p, i) => {
      const teamDot = isTdm && p.team >= 0
        ? `<span class="lb-team-dot" style="background:${p.team === 0 ? "#4aa3ff" : "#ff5a5a"}"></span>`
        : "";
      return `<li class="${p.id === myId ? "me" : ""}${i === 0 ? " win" : ""}"><span>${teamDot}${i + 1}. ${escapeHtml(p.name)}${p.bot ? " 🤖" : ""}</span><span>${p.score}</span></li>`;
    }).join("");
    const myRank = list.findIndex((p) => p.id === myId);
    els.yourPlace.textContent = myRank >= 0 ? `You placed ${ordinal(myRank + 1)} of ${list.length}` : "";
  } else {
    els.inter.classList.add("hidden");
  }
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

function streakName(streakSize: number): string {
  return streakSize >= 6 ? "GODLIKE!" : streakSize >= 5 ? "UNSTOPPABLE!" : streakSize >= 4 ? "RAMPAGE!" : streakSize >= 3 ? "TRIPLE HIT!" : "DOUBLE HIT!";
}

function onKill(msg: any): void {
  const myId = window.Net.sessionId;
  const mine = msg.killer === myId;
  const victimIsMe = msg.victim === myId;

  const row = document.createElement("div");
  row.className = "kill-msg" + (mine ? " mine" : "");
  row.innerHTML = `${escapeHtml(mine ? "You" : msg.killerName)} 💥 <span class="vic">${escapeHtml(victimIsMe ? "You" : msg.victimName)}</span>`;
  els.killfeed.appendChild(row);
  setTimeout(() => row.remove(), 3600);
  while (els.killfeed.children.length > 5) els.killfeed.firstChild?.remove();

  window.Renderer.killPopup(msg.killer, mine);
  if (victimIsMe) window.SFX.explosion();
  if (mine) {
    window.SFX.kill();
    window.Renderer.hitStop(80);
    const now = performance.now() / 1000;
    streak = now - lastKill < 3 ? streak + 1 : 1;
    lastKill = now;
    if (streak >= 2) showCallout(streakName(streak));
  }
}

function onPickup(msg: any): void {
  if (!window.Net || msg.by !== window.Net.sessionId) return;
  window.SFX.pickup();
  const info = G.POWERUPS[msg.type];
  showCallout((info ? `${info.icon} ${info.label}` : "POWERUP") + "!");
}

function setupTouchButtons(): void {
  const bind = (el: HTMLElement, key: keyof typeof window.Input.touch) => {
    const set = (value: boolean) => (e: Event) => {
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

  // Joystick setup
  const joystickBase  = document.getElementById("joystick-base")!;
  const joystickThumb = document.getElementById("joystick-thumb")!;
  if (joystickBase && joystickThumb) {
    window.Input.attachJoystick(joystickBase, joystickThumb);
  }

  // Tilt calibrate button
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
  const dpadLeft    = document.getElementById("dpad-left");
  const joystickLeft= document.getElementById("joystick-left");
  const tiltLeft    = document.getElementById("tilt-left");
  if (dpadLeft)     dpadLeft.classList.toggle("hidden", scheme !== "dpad");
  if (joystickLeft) joystickLeft.classList.toggle("hidden", scheme !== "joystick");
  if (tiltLeft)     tiltLeft.classList.toggle("hidden", scheme !== "tilt");
}

function togglePause(): void {
  if (mode === "playing") {
    applyMode("paused");
    window.Net.sendInput(0, 0, false, false);
    window.SFX.setEngine(0, false);
  } else if (mode === "paused") {
    applyMode("playing");
  }
}

function toggleMute(): void {
  const muted = window.SFX.toggleMute();
  els.mute.textContent = muted ? "🔇" : "🔊";
}

function resetToMenu(): void {
  window.Net.onStateChange = null;
  currentLobbyCode = null;
  currentLobbyServer = null;
  // Hide migration overlay if visible (covers the "main menu" path from host-left overlay)
  els.p2pMigratingOverlay.classList.add("hidden");
  try { window.Net.leave(); } catch {}

  // P2P teardown: restore the original Colyseus Net
  if (_isP2PSession && _colyseusNet !== null) {
    (window as any).Net = _colyseusNet;
    _colyseusNet = null;
    _isP2PSession = false;
    // Re-wire callbacks to the restored Colyseus transport
    window.Net.onKill = onKill;
    window.Net.onPickup = onPickup;
    window.Net.onDisconnect = onDisconnect;
  }

  if (window.SFX.stopLoops) window.SFX.stopLoops();
  if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient();
  engineStarted = false;
  // Release orientation lock on return to menu (best-effort)
  try {
    const so = (screen as any).orientation;
    if (so && so.unlock) so.unlock();
  } catch {}
  // Reset respawn / countdown tracking
  wasAlive = true;
  deathTime = -1;
  countdownActive = false;
  boostLevel = 0;
  oobShownUntil = 0;
  els.countdown.classList.remove("pop", "go");
  els.countdown.textContent = "";
  els.time.classList.remove("low");
  applyMode("menu");
  els.touch.classList.add("hidden");
  els.share.classList.add("hidden");
  els.inter.classList.add("hidden");
  els.respawn.classList.add("hidden");
  els.powerChip.classList.add("hidden");
  els.lobbyTitle.textContent = "Private Room";
  els.lobbyRoster.innerHTML = '<p class="muted">Waiting for players…</p>';
  els.lobbySettings.classList.add("hidden");
  els.lobbyRoomName.value = "";
  els.lobbyRoundLength.value = "150";
  els.lobbyBotsCheck.checked = false;
  els.lobbyMode.value = "ffa";
  els.hudTeamScore.classList.add("hidden");
  hideSettings();
  closeJoinCode();
  closeScanner();
  hideShareQr();
  clearShareInvite();
  setBusy(false);
  fetchLeaderboard();
  setStatus("");
  updateMenuMeta(false);
  updateRotateOverlay();
}

function onDisconnect(_info?: any): void {
  if (mode === "menu" || mode === "lost") return;
  if (window.SFX.suspend) window.SFX.suspend();
  els.connMsg.textContent = "Reconnecting…";
  els.connRetry.classList.add("hidden");
  applyMode("lost");
  window.Net.tryReconnect().then((ok) => {
    if (mode !== "lost") return;
    if (ok) {
      if (window.SFX.resume) window.SFX.resume();
      // Land in the correct mode based on current server phase
      const phase = window.Net.getPhase();
      if (phase === "lobby") {
        // Re-wire the state-change callback and return to lobby
        window.Net.onStateChange = onLobbyStateChange;
        renderLobbyRoster();
        applyMode("lobby");
      } else {
        applyMode("playing");
      }
    } else {
      els.connMsg.textContent = "Couldn't reconnect.";
      els.connRetry.classList.remove("hidden");
    }
  });
}

function enterImmersive(): void {
  if (!window.Input.isTouchDevice()) { updateRotateOverlay(); return; }
  // Best-effort fullscreen
  const root = document.documentElement as any;
  const request = root.requestFullscreen || root.webkitRequestFullscreen || root.msRequestFullscreen;
  if (request) {
    try {
      const res = request.call(root);
      if (res && res.catch) res.catch(() => {});
    } catch {}
  }
  // Best-effort landscape lock — iOS Safari lacks this; must fail silently
  try {
    const so = (screen as any).orientation;
    if (so && so.lock) {
      so.lock("landscape").catch(() => {});
    }
  } catch {}
  updateRotateOverlay();
}

function updateRotateOverlay(): void {
  const portrait = window.matchMedia && window.matchMedia("(orientation: portrait)").matches;
  const show = window.Input.isTouchDevice() && portrait && mode !== "menu";
  els.rotate.classList.toggle("show", !!show);
  updateMenuMeta(true);
}

function init(): void {
  readInviteFromUrl();
  primeLanInput();

  window.Renderer.init(els.canvas);
  window.Input.attach();
  loadInputPrefs();
  window.Assets.load();
  window.Net.onKill = onKill;
  window.Net.onPickup = onPickup;
  window.Net.onDisconnect = onDisconnect;

  els.bots.checked = botsEnabled;
  els.bots.addEventListener("change", () => {
    botsEnabled = els.bots.checked;
    try { localStorage.setItem("smashcart.bots", botsEnabled ? "1" : "0"); } catch {}
    window.SFX.uiClick();
  });

  buildHangar();
  fetchLeaderboard();
  setupTouchButtons();
  updateRotateOverlay();
  updateMenuMeta(false);
  clearShareInvite();

  if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient();
  if (window.Input.isTouchDevice()) document.body.classList.add("touch-device");

  // P2P host button
  els.p2pHostBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    startP2PHost();
  });

  // P2P offline QR button — starts host AND renders offer QR in one click
  els.p2pOfflineBtn.addEventListener("click", async () => {
    window.SFX.uiClick();
    // If we don't already have a P2P host running, start one first
    if (!_isP2PSession) {
      await startP2PHost();
    }
    // Reveal the offline QR section
    els.p2pOfflineSection.classList.remove("hidden");
    const transport = (window as any).Net;
    if (typeof transport.startOfflineQrOffer === "function") {
      try {
        await transport.startOfflineQrOffer(els.p2pOfflineCanvas);
      } catch (e: any) {
        setStatus(e && e.message ? e.message : "Offline QR error");
      }
    }
  });

  // P2P offline answer paste/submit — host accepts guest answer QR
  els.p2pAnswerSubmit.addEventListener("click", async () => {
    const val = els.p2pAnswerInput.value.trim();
    if (!val) return;
    window.SFX.uiClick();
    const transport = (window as any).Net;
    if (typeof transport.finishOfflineQrOffer === "function") {
      try {
        await transport.finishOfflineQrOffer(val);
        setStatus("Offline P2P connected!");
      } catch (e: any) {
        setStatus("Offline answer error: " + (e && e.message ? e.message : e));
      }
    }
  });

  // Host-left overlay — main menu button
  els.hostLeftMenuBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    resetToMenu();
  });

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
  // Load persisted call sign
  try {
    const savedName = localStorage.getItem("smashcart.name");
    if (savedName) els.name.value = savedName;
  } catch {}
  // Persist call sign on change and blur
  els.name.addEventListener("change", () => {
    try { localStorage.setItem("smashcart.name", els.name.value); } catch {}
  });
  els.name.addEventListener("blur", () => {
    try { localStorage.setItem("smashcart.name", els.name.value); } catch {}
  });
  els.name.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      try { localStorage.setItem("smashcart.name", els.name.value); } catch {}
      startGame(inviteRoom || "PUBLIC", inviteRoom ? inviteServer : null);
    }
  });
  els.lanServer.addEventListener("input", () => updateMenuMeta(true));
  els.lanServer.addEventListener("blur", () => commitLanInput());
  els.lanServer.addEventListener("keydown", (e: KeyboardEvent) => {
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
      setTimeout(() => (els.copy.textContent = "Copy"), 1200);
    }
  });
  els.shareQrCopy.addEventListener("click", async () => {
    const copied = await copyShareLink();
    if (copied) {
      els.shareQrCopy.textContent = "Copied!";
      setTimeout(() => (els.shareQrCopy.textContent = "Copy Link"), 1200);
    }
  });
  els.shareQrClose.addEventListener("click", () => hideShareQr());
  els.shareQrOverlay.addEventListener("click", (e: MouseEvent) => {
    if (e.target === els.shareQrOverlay) hideShareQr();
  });
  els.mute.addEventListener("click", () => toggleMute());
  els.resume.addEventListener("click", () => togglePause());
  els.pauseMenu.addEventListener("click", () => resetToMenu());
  els.connMenu.addEventListener("click", () => resetToMenu());
  els.connRetry.addEventListener("click", () => {
    els.connMsg.textContent = "Reconnecting…";
    els.connRetry.classList.add("hidden");
    window.Net.tryReconnect().then((ok) => {
      if (ok) {
        if (window.SFX.resume) window.SFX.resume();
        const phase = window.Net.getPhase();
        if (phase === "lobby") {
          window.Net.onStateChange = onLobbyStateChange;
          renderLobbyRoster();
          applyMode("lobby");
        } else {
          applyMode("playing");
        }
      } else {
        els.connMsg.textContent = "Still down.";
        els.connRetry.classList.remove("hidden");
      }
    });
  });

  window.Input.onPause = () => { if (mode !== "menu") togglePause(); };
  window.Input.onMute = () => toggleMute();

  // Settings overlay — menu button
  els.menuSettingsBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    showSettings();
  });
  // Settings overlay — pause button
  els.pauseSettings.addEventListener("click", () => {
    window.SFX.uiClick();
    showSettings();
  });
  // Settings overlay — close buttons
  els.settingsCloseBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    hideSettings();
  });
  els.settingsCloseBtn2.addEventListener("click", () => {
    window.SFX.uiClick();
    hideSettings();
  });
  // Click-outside to close settings
  els.settingsScreen.addEventListener("click", (e: MouseEvent) => {
    if (e.target === els.settingsScreen) hideSettings();
  });

  // ─── HANGAR OVERLAY WIRING ────────────────────────────────────────────────
  els.hangarBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    showHangar();
  });
  els.hangarCloseBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    hideHangar();
  });
  els.hangarDone.addEventListener("click", () => {
    window.SFX.uiClick();
    hideHangar();
  });
  // Click-outside to close hangar
  els.hangarOverlay.addEventListener("click", (e: MouseEvent) => {
    if (e.target === els.hangarOverlay) hideHangar();
  });

  // ─── SETTINGS CONTROLS ───────────────────────────────────────────────────
  // Volume sliders
  const volMasterEl = document.getElementById("set-vol-master") as HTMLInputElement | null;
  const volSfxEl    = document.getElementById("set-vol-sfx")    as HTMLInputElement | null;
  const volMusicEl  = document.getElementById("set-vol-music")  as HTMLInputElement | null;
  if (volMasterEl) {
    volMasterEl.addEventListener("input", () => { window.SFX.setMaster(parseFloat(volMasterEl.value)); });
  }
  if (volSfxEl) {
    volSfxEl.addEventListener("input", () => { window.SFX.setSfx(parseFloat(volSfxEl.value)); });
  }
  if (volMusicEl) {
    volMusicEl.addEventListener("input", () => { window.SFX.setMusic(parseFloat(volMusicEl.value)); });
  }

  // Quality control — supports both <select> and radio group
  function applyQualityChoice(value: string): void {
    if (value === "auto") {
      // Re-enable adaptive sampling: reset the auto flag and let sample() drive it
      window.Quality._auto = true;
      try { localStorage.removeItem("smashcart.quality"); } catch {}
    } else {
      window.Quality.set(value, true); // persists to localStorage as sc_quality
    }
  }
  const qualitySelect = document.getElementById("set-quality") as HTMLSelectElement | null;
  if (qualitySelect && qualitySelect.tagName === "SELECT") {
    qualitySelect.addEventListener("change", () => { window.SFX.uiClick(); applyQualityChoice(qualitySelect.value); });
  } else {
    // Radio group
    document.querySelectorAll<HTMLInputElement>('input[name="set-quality"]').forEach((r) => {
      r.addEventListener("change", () => { if (r.checked) { window.SFX.uiClick(); applyQualityChoice(r.value); } });
    });
  }

  // Invert pitch / steer checkboxes
  const invertPitchEl = document.getElementById("set-invert-pitch") as HTMLInputElement | null;
  const invertSteerEl = document.getElementById("set-invert-steer") as HTMLInputElement | null;
  if (invertPitchEl) {
    invertPitchEl.addEventListener("change", () => {
      window.Input.invertPitch = invertPitchEl.checked;
      try { localStorage.setItem("smashcart.invertPitch", invertPitchEl.checked ? "1" : "0"); } catch {}
    });
  }
  if (invertSteerEl) {
    invertSteerEl.addEventListener("change", () => {
      window.Input.invertSteer = invertSteerEl.checked;
      try { localStorage.setItem("smashcart.invertSteer", invertSteerEl.checked ? "1" : "0"); } catch {}
    });
  }

  // ─── CONTROL SCHEME PICKER ────────────────────────────────────────────────
  // Load persisted scheme
  try {
    const saved = localStorage.getItem("smashcart.controls") as ControlScheme | null;
    if (saved === "joystick" || saved === "tilt" || saved === "dpad") {
      window.Input.controlScheme = saved;
    }
  } catch {}

  // Wire radio buttons
  const schemeRadios = document.querySelectorAll<HTMLInputElement>('input[name="ctrl-scheme"]');
  schemeRadios.forEach((r) => {
    r.addEventListener("change", () => {
      if (!r.checked) return;
      const scheme = r.value as ControlScheme;
      window.SFX.uiClick();
      if (scheme === "tilt") {
        // attachTilt handles iOS permission and potential fallback
        window.Input.attachTilt();
        // Only switch scheme optimistically if non-iOS; iOS waits for permission cb
        const DevOri = DeviceOrientationEvent as any;
        if (typeof DevOri.requestPermission !== "function") {
          window.Input.setControlScheme("tilt");
          applyControlSchemeUI("tilt");
        }
        // (iOS: setControlScheme called after permission granted via onSchemeChange cb)
      } else {
        window.Input.setControlScheme(scheme);
        applyControlSchemeUI(scheme);
      }
    });
  });

  // Handle scheme-change notifications from Input (tilt permission fallbacks, etc.)
  window.Input.onSchemeChange = (scheme: ControlScheme, msg?: string) => {
    applyControlSchemeUI(scheme);
    // Reflect in settings UI
    schemeRadios.forEach((r) => { r.checked = r.value === scheme; });
    // Show status message if provided
    const tiltMsg = document.getElementById("tilt-status-msg");
    if (tiltMsg) {
      if (msg) {
        tiltMsg.textContent = msg;
        tiltMsg.classList.remove("hidden");
        setTimeout(() => tiltMsg.classList.add("hidden"), 4000);
      } else {
        tiltMsg.classList.add("hidden");
      }
    }
  };

  // Apply initial scheme UI
  applyControlSchemeUI(window.Input.controlScheme);

  // Join-by-code modal
  els.joinCodeOpenBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    openJoinCode();
  });
  els.joinCodeCancel.addEventListener("click", () => {
    window.SFX.uiClick();
    closeJoinCode();
  });
  els.scanOpenBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    openScanner();
  });
  els.scanCloseBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    closeScanner();
  });
  els.scanOverlay.addEventListener("click", (e: MouseEvent) => {
    if (e.target === els.scanOverlay) closeScanner();
  });
  // Force uppercase ONLY for short bare codes; leave longer input alone (could be a pasted URL)
  els.joinCodeInput.addEventListener("input", () => {
    const cur = els.joinCodeInput.value;
    // Only auto-uppercase if it looks like a bare code (no URL-like characters)
    if (cur.length <= 6 && !/[:/.]/.test(cur)) {
      const upper = cur.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (cur !== upper) {
        const sel = els.joinCodeInput.selectionStart ?? upper.length;
        els.joinCodeInput.value = upper;
        els.joinCodeInput.setSelectionRange(sel, sel);
      }
    }
  });
  function resolveJoinInput(): string | null {
    const raw = els.joinCodeInput.value.trim();
    if (!raw) return null;
    // Try to extract from pasted invite URL
    try {
      const url = new URL(raw);
      const p2p = url.searchParams.get("p2p");
      if (p2p) return p2p.trim().toUpperCase().slice(0, 6);
      const room = url.searchParams.get("room");
      if (room) return room.trim().toUpperCase().slice(0, 6);
      const code = url.searchParams.get("code");
      if (code) return code.trim().toUpperCase().slice(0, 6);
    } catch { /* not a URL */ }
    // Bare code: uppercase alphanumeric, max 6 chars
    return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || null;
  }
  els.joinCodeSubmit.addEventListener("click", () => {
    const code = resolveJoinInput();
    if (!code) return;
    window.SFX.uiClick();
    closeJoinCode();
    startGame(code, null);
  });
  els.joinCodeInput.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = resolveJoinInput();
      if (!code) return;
      window.SFX.uiClick();
      closeJoinCode();
      startGame(code, null);
    }
  });
  // Click-outside to close join modal
  els.joinCodeModal.addEventListener("click", (e: MouseEvent) => {
    if (e.target === els.joinCodeModal) closeJoinCode();
  });

  // Intermission leave button
  els.interLeave.addEventListener("click", () => {
    window.SFX.uiClick();
    resetToMenu();
  });

  // Lobby buttons (Slice 6)
  els.lobbyLeaveBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    window.Net.onStateChange = null;
    resetToMenu();
  });
  els.lobbyReadyBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    // Drive from server state via onLobbyStateChange, not optimistically
    window.Net.sendReady();
  });
  els.lobbyStartBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    window.Net.sendHostStart();
  });

  // Host settings: room name input (debounced ~400ms)
  els.lobbyRoomName.addEventListener("input", () => {
    if (_settingsDebounce !== null) clearTimeout(_settingsDebounce);
    _settingsDebounce = setTimeout(() => {
      _settingsDebounce = null;
      window.Net.sendHostSettings({ roomName: els.lobbyRoomName.value });
    }, 400);
  });

  // Host settings: round length select (immediate on change)
  els.lobbyRoundLength.addEventListener("change", () => {
    const v = parseInt(els.lobbyRoundLength.value, 10);
    if (Number.isFinite(v)) window.Net.sendHostSettings({ roundLength: v });
  });

  // Host settings: bots toggle (immediate on change)
  els.lobbyBotsCheck.addEventListener("change", () => {
    window.Net.sendHostSettings({ botsInRoom: els.lobbyBotsCheck.checked });
  });

  // Host settings: mode select (immediate on change)
  els.lobbyMode.addEventListener("change", () => {
    window.Net.sendHostSettings({ mode: els.lobbyMode.value });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (window.Net.state) window.Net.sendInput(0, 0, false, false);
      if (window.SFX.suspend) window.SFX.suspend();
      closeScanner();
      hideShareQr();
    } else if (mode === "playing" && window.SFX.resume) {
      window.SFX.resume();
    }
  });
  window.addEventListener("orientationchange", updateRotateOverlay);
  window.addEventListener("resize", updateRotateOverlay);
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (scannerOpen) { closeScanner(); return; }
      if (!els.shareQrOverlay.classList.contains("hidden")) { hideShareQr(); return; }
      if (hangarOpen) { hideHangar(); return; }
      if (settingsOpen) { hideSettings(); return; }
      if (joinCodeOpen) { closeJoinCode(); return; }
    }
  });

  // Fade out the boot overlay now that init is complete
  els.bootOverlay.classList.add("fade-out");
  setTimeout(() => els.bootOverlay.classList.add("hidden"), 450);

  // Check for offline-answer QR param — guest decodes host offer and shows answer QR
  const _offlineAnswerParam = new URLSearchParams(location.search).get("offline-answer");
  if (_offlineAnswerParam) {
    // Guest offline flow: decode offer → create answer → render answer QR in p2pOfflineCanvas
    (async () => {
      // Start a bare guest transport (no signaling)
      if (!_isP2PSession) {
        _colyseusNet = (window as any).Net;
      }
      const transport = new WebRtcTransport();
      (window as any).Net = transport;
      _isP2PSession = true;
      transport.onKill       = onKill;
      transport.onPickup     = onPickup;
      transport.onDisconnect = onP2PDisconnect;
      // Show the offline section and render answer QR
      els.p2pOfflineSection.classList.remove("hidden");
      try {
        await (transport as any).startOfflineQrAnswer(_offlineAnswerParam, els.p2pOfflineCanvas);
        setStatus("Scan the QR with the host's phone, or paste the text to the host.");
      } catch (e: any) {
        setStatus("Offline QR guest error: " + (e && e.message ? e.message : e));
      }
    })();
  }

  requestAnimationFrame((t) => { last = t; loop(t); });
}

window.addEventListener("DOMContentLoaded", init);

// Fatal overlay: surface unrecoverable JS errors to the user.
// The existing inline <script> in index.html already POSTs to /api/errors
// for server-side logging — these listeners add the user-visible layer on top.
window.addEventListener("error", (e: ErrorEvent) => {
  // Only show fatal if the game has started past boot; ignore render/asset
  // warnings that are non-fatal. A simple heuristic: only show if mode is
  // already set (i.e. DOMContentLoaded has fired and init() ran).
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
