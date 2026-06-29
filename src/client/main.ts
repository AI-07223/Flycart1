// Orchestration: menu, HUD, connection, and render loop for the flat-world reboot.
import { WebRtcTransport } from "./host-sim";
import { ARCADE_MENU_HOST_ID, ARCADE_MENU_SCREEN_CLASS, arcadeScreenId, mountArcadeMenu } from "./arcadeMenu";
import {
  ACCENT_OPTIONS,
  AIRFRAME_OPTIONS,
  DEFAULT_LOADOUT,
  LEGACY_LOADOUT_KEYS,
  LOADOUT_STORAGE_KEY,
  LIVERY_OPTIONS,
  PAINT_OPTIONS,
  PRESET_SLOTS,
  TRAIL_OPTIONS,
  cloneLoadout,
  createDefaultLoadoutStore,
  getLoadoutDetailRows,
  getLoadoutSummary,
  loadoutFromLegacy,
  parseLoadoutStore,
  randomizeLoadout,
  sameLoadout,
  type CosmeticLoadout,
  type CosmeticOption,
  type LoadoutStore,
} from "../shared/loadout";

const dollar = (id: string) => document.getElementById(id)!;
const menuRoot = mountArcadeMenu() || dollar("start-screen");
const useArcadeMenu = menuRoot.id === ARCADE_MENU_HOST_ID;
const menuDollar = (...ids: string[]) => {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  throw new Error(`Missing DOM element: ${ids.join(", ")}`);
};
const menuScreenSelector = useArcadeMenu ? `.${ARCADE_MENU_SCREEN_CLASS}` : ".menu-screen";
const menuNavSelector = useArcadeMenu ? "[data-arcade-nav]" : "[data-nav]";
const menuBackSelector = useArcadeMenu ? "[data-arcade-back]" : "[data-back]";
const menuScreenElementId = (id: string) => useArcadeMenu ? arcadeScreenId(id) : `screen-${id}`;
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
  start: menuRoot,
  name: menuDollar("arcade-name-input", "name-input") as HTMLInputElement,
  lanServer: menuDollar("arcade-lan-server-input", "lan-server-input") as HTMLInputElement,
  lanQuick: menuDollar("arcade-lan-quick-btn", "lan-quick-btn") as HTMLButtonElement,
  lanFriends: menuDollar("arcade-lan-friends-btn", "lan-friends-btn") as HTMLButtonElement,
  lanHint: menuDollar("arcade-lan-hint", "lan-hint"),
  serverBadge: menuDollar("arcade-menu-server-badge", "menu-server-badge"),
  roomChip: menuDollar("arcade-room-code-chip", "room-code-chip"),
  orientationNote: menuDollar("arcade-orientation-note", "orientation-note"),
  friendsNote: menuDollar("arcade-friends-note", "friends-note"),
  status: menuDollar("arcade-status", "status"),
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
  scanOpenBtn: menuDollar("arcade-scan-open-btn", "scan-open-btn") as HTMLButtonElement,
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
  bots: menuDollar("arcade-bots-check", "bots-check") as HTMLInputElement,
  countdown: dollar("countdown"),
  interLeave: dollar("intermission-leave") as HTMLButtonElement,
  p2pOfflineBtn: menuDollar("arcade-p2p-offline-btn", "p2p-offline-btn") as HTMLButtonElement,
  p2pOfflineCanvas: menuDollar("arcade-p2p-offline-canvas", "p2p-offline-canvas") as HTMLCanvasElement,
  p2pAnswerInput: menuDollar("arcade-p2p-answer-input", "p2p-answer-input") as HTMLInputElement,
  p2pAnswerSubmit: menuDollar("arcade-p2p-answer-submit", "p2p-answer-submit") as HTMLButtonElement,
  p2pOfflineSection: menuDollar("arcade-p2p-offline-section", "p2p-offline-section"),
  hostLeftOverlay: dollar("host-left-overlay"),
  hostLeftMenuBtn: dollar("host-left-menu-btn") as HTMLButtonElement,
  p2pMigratingOverlay: dollar("p2p-migrating-overlay"),
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
  menuSettingsBtn: menuDollar("arcade-menu-settings-btn", "menu-settings-btn") as HTMLButtonElement,
  joinCodeInput: menuDollar("arcade-join-code-input", "join-code-input") as HTMLInputElement,
  joinCodeSubmit: menuDollar("arcade-join-code-submit", "join-code-submit") as HTMLButtonElement,
  menuLeaderboard: menuDollar("arcade-menu-leaderboard", "menu-leaderboard"),
  lobbyRoomChip: dollar("lobby-room-chip"),
  lobbyModeChip: dollar("lobby-mode-chip"),
  lobbyPlaneSummary: dollar("lobby-plane-summary"),
  customizeOpenBtn: menuDollar("arcade-customize-open-btn", "customize-open-btn") as HTMLButtonElement,
  selectedPlaneName: menuDollar("arcade-selected-plane-name", "selected-plane-name"),
  selectedPlaneSummary: menuDollar("arcade-selected-plane-summary", "selected-plane-summary"),
  selectedPlaneChips: menuDollar("arcade-selected-plane-chips", "selected-plane-chips"),
  quickPlayBtn: menuDollar("arcade-quick-play-btn", "quick-play-btn") as HTMLButtonElement,
  privateRoomBtn: menuDollar("arcade-private-room-btn", "private-room-btn") as HTMLButtonElement,
  playLoadoutSummary: menuDollar("arcade-play-loadout-summary", "play-loadout-summary"),
  localLoadoutSummary: menuDollar("arcade-local-loadout-summary", "local-loadout-summary"),
  customizeSummaryName: menuDollar("arcade-customize-summary-name", "customize-summary-name"),
  customizeSummaryText: menuDollar("arcade-customize-summary-text", "customize-summary-text"),
  customizeSummaryGrid: menuDollar("arcade-customize-summary-grid", "customize-summary-grid"),
  customizeFeedback: menuDollar("arcade-customize-feedback", "customize-feedback"),
  presetGrid: menuDollar("arcade-preset-grid", "preset-grid"),
  customizeAirframe: menuDollar("arcade-customize-airframe", "customize-airframe"),
  customizePaint: menuDollar("arcade-customize-paint", "customize-paint"),
  customizeAccent: menuDollar("arcade-customize-accent", "customize-accent"),
  customizeLivery: menuDollar("arcade-customize-livery", "customize-livery"),
  customizeTrail: menuDollar("arcade-customize-trail", "customize-trail"),
  customizeRandomize: menuDollar("arcade-customize-randomize", "customize-randomize") as HTMLButtonElement,
  customizeReset: menuDollar("arcade-customize-reset", "customize-reset") as HTMLButtonElement,
  customizeDone: menuDollar("arcade-customize-done", "customize-done") as HTMLButtonElement,
  ingameMenuBtn: dollar("ingame-menu-btn") as HTMLButtonElement,
  pauseInviteBtn: dollar("pause-invite-btn") as HTMLButtonElement,
  localRoomName: menuDollar("arcade-local-room-name", "local-room-name") as HTMLInputElement,
  localCreateBtn: menuDollar("arcade-local-create-btn", "local-create-btn") as HTMLButtonElement,
  localScanBtn: menuDollar("arcade-local-scan-btn", "local-scan-btn") as HTMLButtonElement,
  localRoomList: menuDollar("arcade-local-room-list", "local-room-list"),
  toast: dollar("toast"),
  respawnBy: dollar("respawn-by"),
  respawnCount: dollar("respawn-count"),
};

type SceneMode = "preflight" | "customize" | "lobby" | "results" | "playing" | "paused";

let mode: "menu" | "lobby" | "playing" | "paused" | "lost" | "error" = "menu";
let sceneMode: SceneMode = "preflight";
let settingsOpen = false;
let joinCodeOpen = false;
let last = 0;
let prevPhase = "playing";
let prevHp = G.MAX_HP;
let lastFireSnd = 0;

// ── Smash-tracking state (replaces old streak/lastKill) ──────────────────
const smashTrack = new Map<string, { streak: number; last: number; rapid: number }>();
function getTrack(id: string): { streak: number; last: number; rapid: number } {
  let t = smashTrack.get(id);
  if (!t) { t = { streak: 0, last: 0, rapid: 0 }; smashTrack.set(id, t); }
  return t;
}

// Last killer name — used by the kill/death card
let lastKiller = "";

// Leader-change tracking
let prevLeader = "";
let engineStarted = false;
let botsEnabled = true;
let botDifficulty: "easy" | "medium" | "high" = "medium";
let inviteRoom: string | null = null;
let inviteServer: string | null = null;
let activeShareUrl: string | null = null;
let deathTime: number = -1;
let wasAlive: boolean = true;
let oobShownUntil: number = 0;
let boostLevel: number = 0;
let countdownActive = false;
let currentLobbyCode: string | null = null;
let currentLobbyServer: string | null = null;
let _settingsDebounce: ReturnType<typeof setTimeout> | null = null;
let _colyseusNet: any = null;
let _isP2PSession = false;
let scannerOpen = false;
let scanRafId: number | null = null;
let _localScanInterval: ReturnType<typeof setInterval> | null = null;
let presetFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;

const COLORS_HEX = PAINT_OPTIONS.map((option) => option.swatch || "#ffffff");

function readLegacyLoadout(): CosmeticLoadout {
  return loadoutFromLegacy({
    skin: localStorage.getItem(LEGACY_LOADOUT_KEYS.skin),
    color: localStorage.getItem(LEGACY_LOADOUT_KEYS.color),
    bodyShape: localStorage.getItem(LEGACY_LOADOUT_KEYS.bodyShape),
    accent: localStorage.getItem(LEGACY_LOADOUT_KEYS.accent),
    trail: localStorage.getItem(LEGACY_LOADOUT_KEYS.trail),
    livery: localStorage.getItem(LEGACY_LOADOUT_KEYS.livery),
  });
}

function loadPersistedLoadoutStore(): LoadoutStore {
  try {
    const saved = parseLoadoutStore(localStorage.getItem(LOADOUT_STORAGE_KEY));
    if (saved) return saved;
  } catch {}
  const store = createDefaultLoadoutStore();
  try {
    store.active = readLegacyLoadout();
  } catch {
    store.active = cloneLoadout(DEFAULT_LOADOUT);
  }
  return store;
}

let loadoutStore: LoadoutStore = loadPersistedLoadoutStore();
let selectedCosmetics: CosmeticLoadout = cloneLoadout(loadoutStore.active);
loadoutStore.active = selectedCosmetics;

function persistLoadoutStore(): void {
  try {
    localStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify(loadoutStore));
    localStorage.setItem(LEGACY_LOADOUT_KEYS.color, String(selectedCosmetics.color));
    localStorage.setItem(LEGACY_LOADOUT_KEYS.bodyShape, String(selectedCosmetics.bodyShape));
    localStorage.setItem(LEGACY_LOADOUT_KEYS.accent, String(selectedCosmetics.accent));
    localStorage.setItem(LEGACY_LOADOUT_KEYS.trail, String(selectedCosmetics.trail));
    localStorage.setItem(LEGACY_LOADOUT_KEYS.livery, String(selectedCosmetics.livery));
  } catch {}
}

try {
  botsEnabled = localStorage.getItem("smashcart.bots") !== "0";
} catch {}
try {
  const savedDiff = localStorage.getItem("smashcart.difficulty");
  if (savedDiff === "easy" || savedDiff === "medium" || savedDiff === "high") {
    botDifficulty = savedDiff;
  }
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

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.ceil(totalSeconds || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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

function updateLobbyMeta(): void {
  const state = window.Net.state;
  const modeLabel = state?.mode === "tdm" ? "Team Deathmatch" : "Free-for-all";
  const roundLength = typeof state?.roundLength === "number" ? state.roundLength : 150;
  const roomLabel = currentLobbyCode ? `Code ${currentLobbyCode}` : (_isP2PSession ? "Wi-Fi live" : "Private room");
  els.lobbyRoomChip.textContent = roomLabel;
  els.lobbyModeChip.textContent = `${modeLabel} · ${formatClock(roundLength)}`;
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
  updateLobbyMeta();

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
  [els.lanQuick, els.lanFriends, els.localCreateBtn, els.localScanBtn, els.quickPlayBtn, els.privateRoomBtn, els.joinCodeSubmit].forEach((button) => {
    button.disabled = busy;
  });
}

function updateMenuMeta(preserveStatus = true): void {
  const lanOrigin = currentLanConnectOrigin();
  els.serverBadge.textContent = lanOrigin ? `LAN ${new URL(toPageOrigin(lanOrigin)).host}` : "Local play";

  const portrait = !!(window.matchMedia && window.matchMedia("(orientation: portrait)").matches);
  if (!window.Input.isTouchDevice()) {
    els.orientationNote.textContent = "Keyboard flight: A/D steer, W/S climb, Shift boost, Space fire.";
  } else if (portrait) {
    els.orientationNote.textContent = "Portrait is fine for setup. Rotate to landscape before you launch.";
  } else {
    els.orientationNote.textContent = "Landscape ready. Touch controls appear after launch.";
  }

  if (inviteRoom) {
    els.roomChip.textContent = `Invite ${inviteRoom}`;
    els.roomChip.dataset.state = "invite";
    const inviteHost = inviteServer ? new URL(toPageOrigin(inviteServer)).host : location.host;
    if (els.friendsNote) els.friendsNote.textContent = `Invite ready for room ${inviteRoom} on ${inviteHost}. Open Join / Scan to connect.`;
    if (!preserveStatus || !els.status.textContent) setStatus(`Invite ready: room ${inviteRoom}`);
  } else {
    els.roomChip.textContent = lanOrigin ? "LAN ready" : "Deck local";
    els.roomChip.dataset.state = lanOrigin ? "lan" : "local";
    if (els.friendsNote) els.friendsNote.textContent = "";
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

// ─── MENU SCREEN ROUTER ──────────────────────────────────────────────────────
// Operates ONLY over the active menu shell, whether arcade or legacy fallback.
// Does NOT disturb mode/applyMode — those control top-level screen visibility.
const MENU_SCREENS = ["home", "play", "join", "lan", "leaders", "customize"] as const;
let navStack: string[] = ["home"];

function currentMenuScreen(): string {
  return navStack[navStack.length - 1] || "home";
}

function deriveSceneMode(state: any = window.Net?.state): SceneMode {
  if (mode === "menu") return currentMenuScreen() === "customize" ? "customize" : "preflight";
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

function navShow(id: string): void {
  document.body.dataset.menuScreen = id;
  menuRoot.querySelectorAll<HTMLElement>(menuScreenSelector).forEach((screen) =>
    screen.classList.toggle("active", screen.id === menuScreenElementId(id)));
  menuRoot.scrollTop = 0;
  const menuShell = menuRoot.firstElementChild;
  if (menuShell instanceof HTMLElement) menuShell.scrollTop = 0;
  if (id === "lan") startLocalScanWithAutoRefresh();
  else stopLocalScanInterval();
  syncSceneMode(window.Net?.state);
}
function navGo(id: string): void {
  if (navStack[navStack.length - 1] === id) return;
  navStack.push(id);
  navShow(id);
}
function navBack(): void {
  if (navStack.length > 1) { navStack.pop(); navShow(navStack[navStack.length - 1]); }
}
function navReset(): void { navStack = ["home"]; navShow("home"); }

// ─── STATE MACHINE ───────────────────────────────────────────────────────────
// applyMode() is the single source of truth for which top-level screens are
// visible. Sub-state overlays (settings, join-code, share-qr, intermission,
// rotate) are managed by their own helpers and do NOT change `mode`.
function applyMode(nextMode: typeof mode): void {
  mode = nextMode;

  const isMenu    = mode === "menu";
  const isLobby   = mode === "lobby";
  const isPlaying = mode === "playing" || mode === "paused";
  const isLost    = mode === "lost";
  const isError   = mode === "error";

  els.bootOverlay.classList.add("hidden");
  els.start.classList.toggle("hidden", !isMenu);
  els.lobbyScreen.classList.toggle("hidden", !isLobby);
  els.hud.classList.toggle("hidden", !isPlaying);
  els.health.classList.toggle("hidden", !isPlaying);
  els.pause.classList.toggle("hidden", mode !== "paused");
  els.connLost.classList.toggle("hidden", !isLost);
  els.fatalOverlay.classList.toggle("hidden", !isError);
  els.crosshair.classList.toggle("hidden", mode !== "playing");
  if (mode !== "playing") els.oobWarning.classList.add("hidden");
  els.hostLeftOverlay.classList.add("hidden");
  els.p2pMigratingOverlay.classList.add("hidden");
  if (mode !== "lobby") els.share.classList.add("hidden");
  if (!isMenu) stopLocalScanInterval();
  syncSceneMode(window.Net?.state);
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

  // Reflect bot difficulty — prefer live room value, fall back to local pref
  const liveDiff = (window.Net?.state as any)?.botDifficulty;
  const activeDiff: string = (liveDiff === "easy" || liveDiff === "medium" || liveDiff === "high")
    ? liveDiff
    : botDifficulty;
  document.querySelectorAll<HTMLInputElement>('input[name="difficulty"]').forEach((r) => {
    r.checked = r.value === activeDiff;
  });
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

// ─── JOIN-BY-CODE MODAL (now a screen, not a modal — these become no-ops) ────
function openJoinCode(): void {
  // #join-code-modal removed; join is now #screen-join inside the nav router.
  // Kept to avoid breaking any remaining call sites; navGo("join") is the new entry point.
  joinCodeOpen = false;
}

function closeJoinCode(): void {
  // No-op: modal no longer exists. navBack() handles back-navigation from the join screen.
  joinCodeOpen = false;
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

// ─── LOADOUT UI ──────────────────────────────────────────────────────────────

function setCustomizeFeedback(text: string, sticky = false): void {
  els.customizeFeedback.textContent = text;
  if (presetFeedbackTimeout !== null) {
    clearTimeout(presetFeedbackTimeout);
    presetFeedbackTimeout = null;
  }
  if (!sticky) {
    presetFeedbackTimeout = setTimeout(() => {
      presetFeedbackTimeout = null;
      els.customizeFeedback.textContent = "Cosmetics are visual only. No effect on flight or damage.";
    }, 2200);
  }
}

function findActivePresetIndex(): number {
  return loadoutStore.presets.findIndex((preset) => sameLoadout(preset, selectedCosmetics));
}

function renderChipStrip(target: HTMLElement, rows: Array<{ label: string; value: string }>): void {
  target.innerHTML = rows.map((row) =>
    `<span class="summary-chip"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></span>`
  ).join("");
}

function renderSummaryGrid(rows: Array<{ label: string; value: string }>): void {
  els.customizeSummaryGrid.innerHTML = rows.map((row) =>
    `<div class="summary-grid-row"><span>${escapeHtml(row.label)}</span><strong>${escapeHtml(row.value)}</strong></div>`
  ).join("");
}

function updateSelectedLoadout(next: CosmeticLoadout, feedback?: string): void {
  selectedCosmetics = cloneLoadout(next);
  loadoutStore.active = selectedCosmetics;
  persistLoadoutStore();
  renderLoadoutUI();
  if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(selectedCosmetics);
  if (feedback) setCustomizeFeedback(feedback);
}

function updateLoadoutField<K extends keyof CosmeticLoadout>(key: K, value: CosmeticLoadout[K]): void {
  const next = cloneLoadout(selectedCosmetics);
  next[key] = value;
  updateSelectedLoadout(next);
}

function renderPresetGrid(): void {
  const activePreset = findActivePresetIndex();
  els.presetGrid.innerHTML = PRESET_SLOTS.map((slot) => {
    const preset = loadoutStore.presets[slot.index] || cloneLoadout(DEFAULT_LOADOUT);
    const summary = getLoadoutSummary(preset);
    const isActive = activePreset === slot.index;
    const swatches = [
      PAINT_OPTIONS[preset.color]?.swatch || "#ffffff",
      ACCENT_OPTIONS[preset.accent]?.swatch || "#ffffff",
      TRAIL_OPTIONS[preset.trail]?.swatch || "#ffffff",
    ];
    return `
      <article class="preset-card${isActive ? " is-active" : ""}">
        <div class="preset-card-head">
          <div>
            <p class="preset-label">${escapeHtml(slot.label)}</p>
            <h4>${escapeHtml(summary.title)}</h4>
          </div>
          <span class="preset-state">${isActive ? "Armed" : "Stored"}</span>
        </div>
        <p class="preset-copy">${escapeHtml(summary.subtitle)}</p>
        <div class="preset-swatch-row">${swatches.map((swatch) => `<span class="preset-swatch" style="--swatch:${swatch}"></span>`).join("")}</div>
        <div class="preset-actions">
          <button class="preset-apply-btn" data-slot="${slot.index}">APPLY</button>
          <button class="preset-save-btn secondary" data-slot="${slot.index}">SAVE</button>
        </div>
      </article>`;
  }).join("");

  els.presetGrid.querySelectorAll<HTMLButtonElement>(".preset-apply-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const slot = Number.parseInt(button.dataset.slot || "", 10);
      if (!Number.isFinite(slot) || !loadoutStore.presets[slot]) return;
      window.SFX.uiClick();
      updateSelectedLoadout(loadoutStore.presets[slot], `${PRESET_SLOTS[slot].label} armed.`);
    });
  });

  els.presetGrid.querySelectorAll<HTMLButtonElement>(".preset-save-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const slot = Number.parseInt(button.dataset.slot || "", 10);
      if (!Number.isFinite(slot) || !loadoutStore.presets[slot]) return;
      loadoutStore.presets[slot] = cloneLoadout(selectedCosmetics);
      persistLoadoutStore();
      renderLoadoutUI();
      window.SFX.uiClick();
      setCustomizeFeedback(`${PRESET_SLOTS[slot].label} saved.`);
    });
  });
}

function renderOptionGroup<K extends keyof CosmeticLoadout>(
  target: HTMLElement,
  key: K,
  options: CosmeticOption[],
  variant: "cards" | "swatches",
): void {
  target.innerHTML = options.map((option) => {
    const selected = selectedCosmetics[key] === option.value;
    if (variant === "swatches") {
      return `
        <button class="option-btn option-btn--swatch${selected ? " is-selected" : ""}" data-key="${key}" data-value="${option.value}" style="--swatch:${option.swatch || "#ffffff"}">
          <span class="option-swatch"></span>
          <span class="option-copy">
            <strong>${escapeHtml(option.label)}</strong>
            <span>${escapeHtml(option.note)}</span>
          </span>
        </button>`;
    }
    return `
      <button class="option-btn option-btn--card${selected ? " is-selected" : ""}" data-key="${key}" data-value="${option.value}">
        <strong>${escapeHtml(option.label)}</strong>
        <span>${escapeHtml(option.note)}</span>
      </button>`;
  }).join("");

  target.querySelectorAll<HTMLButtonElement>(".option-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const value = Number.parseInt(button.dataset.value || "", 10);
      if (!Number.isFinite(value)) return;
      window.SFX.uiClick();
      updateLoadoutField(key, value as CosmeticLoadout[K]);
    });
  });
}

function renderLoadoutUI(): void {
  const summary = getLoadoutSummary(selectedCosmetics);
  const rows = getLoadoutDetailRows(selectedCosmetics);
  els.selectedPlaneName.textContent = summary.title;
  els.selectedPlaneSummary.textContent = summary.subtitle;
  els.playLoadoutSummary.textContent = `${summary.title} · ${rows.map((row) => row.value).join(" · ")}`;
  els.localLoadoutSummary.textContent = `${summary.title} · ${rows.map((row) => row.value).join(" · ")}`;
  els.lobbyPlaneSummary.textContent = `${summary.title} · ${rows.map((row) => row.value).join(" · ")}`;
  els.customizeSummaryName.textContent = summary.title;
  els.customizeSummaryText.textContent = summary.subtitle;
  renderChipStrip(els.selectedPlaneChips, rows);
  renderSummaryGrid(rows);
  renderPresetGrid();
  renderOptionGroup(els.customizeAirframe, "bodyShape", AIRFRAME_OPTIONS, "cards");
  renderOptionGroup(els.customizePaint, "color", PAINT_OPTIONS, "swatches");
  renderOptionGroup(els.customizeAccent, "accent", ACCENT_OPTIONS, "swatches");
  renderOptionGroup(els.customizeLivery, "livery", LIVERY_OPTIONS, "cards");
  renderOptionGroup(els.customizeTrail, "trail", TRAIL_OPTIONS, "swatches");
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

  // Send persisted difficulty so the room starts at the host's chosen tier
  window.Net?.sendHostSettings?.({ botDifficulty });

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
  // Send persisted difficulty so the P2P room starts at the host's chosen tier
  window.Net?.sendHostSettings?.({ botDifficulty });
  applyMode("lobby");
}

function buildP2PShareUrl(code: string): string {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set("p2p", code);
  return url.toString();
}

// ─── LOCAL WI-FI ROOM NAME PREFILL ───────────────────────────────────────────
const LOCAL_ROOM_ADJECTIVES = ["Ace", "Bolt", "Cobalt", "Dusk", "Echo", "Flare", "Ghost", "Hyper", "Iron", "Jade", "Keen", "Laser", "Mach", "Nova", "Orbit", "Pixel", "Quick", "Red", "Solar", "Turbo", "Ultra", "Venom", "Wild", "Xenon", "Zero"];
const LOCAL_ROOM_NOUNS      = ["Arena", "Base", "Circuit", "Dome", "Engine", "Field", "Grid", "Haven", "Isle", "Junction", "Lair", "Mesa", "Nexus", "Orbit", "Peak", "Range", "Sector", "Tower", "Vault", "Wing", "Zone"];

function randomLocalRoomName(): string {
  const adj  = LOCAL_ROOM_ADJECTIVES[Math.floor(Math.random() * LOCAL_ROOM_ADJECTIVES.length)];
  const noun = LOCAL_ROOM_NOUNS[Math.floor(Math.random() * LOCAL_ROOM_NOUNS.length)];
  return `${adj} ${noun}`;
}

// ─── LOCAL WI-FI HOST PATH ────────────────────────────────────────────────────
// Like startP2PHost() but starts continuous FFA immediately (no lobby ready-up gate)
// and broadcasts a human-readable room name so guests can pick it from the list.
async function startLocalRoom(): Promise<void> {
  window.SFX.unlock();
  enterImmersive();

  const name     = (els.name.value || "Pilot").slice(0, 14);
  const code     = "P-" + genCode();
  const roomName = (els.localRoomName.value.trim() || els.localRoomName.placeholder || randomLocalRoomName()).slice(0, 20);

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

  setStatus("Starting local room…");
  setBusy(true);

  try {
    await (transport as any).startHost(name, code, selectedCosmetics, { roomName, continuous: true });
  } catch (e: any) {
    setStatus("Could not start local room: " + (e && e.message ? e.message : e));
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

  // Show share bar with P2P join URL
  const p2pUrl = buildP2PShareUrl(code);
  activeShareUrl          = p2pUrl;
  els.shareLink.value     = p2pUrl;
  els.shareQrLink.value   = p2pUrl;
  els.shareQrRoom.textContent = roomName;
  els.shareQrCode.textContent = code;
  els.shareQrNote.textContent = `Scan on the same Wi-Fi to join "${roomName}".`;
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

  // Show the room name prominently in the lobby header so the host can read it out
  els.lobbyTitle.textContent = roomName;

  transport.onStateChange = onLobbyStateChange;
  renderLobbyRoster();
  window.Net?.sendHostSettings?.({ botDifficulty });
  applyMode("lobby");
}

// ─── LOCAL WI-FI SCAN ROOMS ───────────────────────────────────────────────────
function stopLocalScanInterval(): void {
  if (_localScanInterval !== null) {
    clearInterval(_localScanInterval);
    _localScanInterval = null;
  }
}

async function runLocalScan(): Promise<void> {
  els.localRoomList.innerHTML = '<article class="local-state-card"><p class="deck-label">Scanning hotspot</p><h4>Looking for active rooms</h4><p class="muted">Hosts on the same Wi-Fi appear here automatically.</p></article>';
  let rooms: Array<{ code: string; name: string; hostName: string; count: number }> = [];
  try {
    rooms = await WebRtcTransport.listRooms();
  } catch {
    rooms = [];
  }

  if (!rooms.length) {
    els.localRoomList.innerHTML =
      '<article class="local-state-card"><p class="deck-label">No rooms found</p><h4>Nothing is broadcasting yet</h4><p class="muted">Ask the host to tap Create Room on the hotspot device, then scan again.</p></article>' +
      '<button class="local-rescan-btn secondary" id="local-rescan-btn">Re-scan</button>';
    const rescan = document.getElementById("local-rescan-btn");
    if (rescan) rescan.addEventListener("click", () => { window.SFX.uiClick(); runLocalScan(); });
    return;
  }

  els.localRoomList.innerHTML = rooms.map((r) =>
    `<div class="local-room-row" data-room="${escapeHtml(r.code)}" role="button" tabindex="0" aria-label="Join ${escapeHtml(r.name || r.code)}">
      <div class="local-room-row-info">
        <div class="local-room-row-head">
          <span class="local-room-row-name">${escapeHtml(r.name || r.code)}</span>
          <span class="local-room-tag">${r.count} pilot${r.count !== 1 ? "s" : ""}</span>
        </div>
        <span class="local-room-row-meta">Hosted by ${escapeHtml(r.hostName || "Unknown")} · Same hotspot</span>
      </div>
      <button class="local-room-join-btn" data-room="${escapeHtml(r.code)}">Join</button>
    </div>`
  ).join("") + '<button class="local-rescan-btn secondary" id="local-rescan-btn">Re-scan</button>';

  // Wire row taps and join buttons
  els.localRoomList.querySelectorAll<HTMLElement>(".local-room-row").forEach((row) => {
    const joinHandler = () => {
      const roomCode = row.dataset.room;
      if (!roomCode) return;
      const matchedRoom = rooms.find((r) => r.code === roomCode);
      const friendlyName = matchedRoom ? (matchedRoom.name || roomCode) : undefined;
      stopLocalScanInterval();
      window.SFX.uiClick();
      joinP2PAsGuest(roomCode, friendlyName);
    };
    row.addEventListener("click", joinHandler);
    row.addEventListener("keydown", (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); joinHandler(); } });
  });

  // Join buttons inside rows — stop propagation so they don't double-fire
  els.localRoomList.querySelectorAll<HTMLElement>(".local-room-join-btn").forEach((btn) => {
    btn.addEventListener("click", (e: MouseEvent) => {
      e.stopPropagation();
      const roomCode = btn.dataset.room;
      if (!roomCode) return;
      const matchedRoom = rooms.find((r) => r.code === roomCode);
      const friendlyName = matchedRoom ? (matchedRoom.name || roomCode) : undefined;
      stopLocalScanInterval();
      window.SFX.uiClick();
      joinP2PAsGuest(roomCode, friendlyName);
    });
  });

  const rescan = document.getElementById("local-rescan-btn");
  if (rescan) rescan.addEventListener("click", () => { window.SFX.uiClick(); runLocalScan(); });
}

function startLocalScanWithAutoRefresh(): void {
  runLocalScan();
  stopLocalScanInterval();
  // Auto-refresh every 3s while #screen-lan is the active screen
  _localScanInterval = setInterval(() => {
    const lanScreen = document.getElementById(menuScreenElementId("lan"));
    if (!lanScreen || !lanScreen.classList.contains("active")) {
      stopLocalScanInterval();
      return;
    }
    runLocalScan();
  }, 3000);
}

// ─── P2P GUEST PATH ──────────────────────────────────────────────────────────
async function joinP2PAsGuest(code: string, friendlyName?: string): Promise<void> {
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
  els.lobbyTitle.textContent = friendlyName || `P2P Room ${code}`;
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

    // Respawn countdown (kill/death card)
    if (!me.alive) {
      // Detect alive->dead transition
      if (wasAlive) {
        deathTime = performance.now() / 1000;
        wasAlive = false;
      }
      const elapsed = performance.now() / 1000 - deathTime;
      const remaining = Math.max(0, Math.ceil(G.RESPAWN_DELAY - elapsed));
      els.respawnBy.textContent = lastKiller ? ("by " + lastKiller) : "";
      els.respawnCount.textContent = remaining > 0 ? ("Respawning in " + remaining + "…") : "Respawning…";
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
  const top5 = list.slice(0, 5);
  els.leaderboard.innerHTML =
    `<div class="lb-header">SMASHES</div>` +
    top5.map((p, i) => {
      const teamDot = isTdm && p.team >= 0
        ? `<span class="lb-team-dot" style="background:${p.team === 0 ? "#4aa3ff" : "#ff5a5a"}"></span>`
        : "";
      return `<div class="lb-row ${p.id === myId ? "me" : ""}"><span>${teamDot}${i + 1}. ${escapeHtml(p.name)}${p.bot ? " 🤖" : ""}</span><span>${p.score}</span></div>`;
    }).join("");

  // Leader-change toast (game-wide)
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
    els.interTime.textContent = formatClock(state.timeLeft);
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

// ── Toast / announcement system ─────────────────────────────────────────────
function pushToast(text: string, kind: "streak" | "multi" | "leader"): void {
  // Cap at 3 visible toasts — remove oldest
  while (els.toast.children.length >= 3) {
    els.toast.firstChild?.remove();
  }
  const item = document.createElement("div");
  item.className = `toast-item toast--${kind}`;
  item.textContent = text;
  els.toast.appendChild(item);
  // Force reflow then add .show for CSS transition
  void item.offsetWidth;
  item.classList.add("show");
  // Auto-remove after 2600ms
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

function onKill(msg: any): void {
  const myId = window.Net.sessionId;
  const mine = msg.killer === myId;
  const victimIsMe = msg.victim === myId;

  // ── Kill feed row ─────────────────────────────────────────────────────────
  const row = document.createElement("div");
  row.className = "kill-msg" + (mine ? " mine" : "");
  row.innerHTML = `${escapeHtml(mine ? "You" : msg.killerName)} <span class="kf-verb">smashed</span> <span class="vic">${escapeHtml(victimIsMe ? "You" : msg.victimName)}</span>`;
  els.killfeed.appendChild(row);
  setTimeout(() => row.remove(), 3600);
  while (els.killfeed.children.length > 5) els.killfeed.firstChild?.remove();

  // ── Local kill juice ─────────────────────────────────────────────────────
  window.Renderer.killPopup(msg.killer, mine);
  if (victimIsMe) {
    window.SFX.explosion();
    // Record who killed us for the death card
    lastKiller = (msg.killer && msg.killer !== msg.victim && msg.killerName) ? msg.killerName : "";
  }
  if (mine) {
    window.SFX.kill();
    window.Renderer.hitStop(80);
  }

  // ── Game-wide smash tracking ──────────────────────────────────────────────
  // Victim's streak resets
  const tv = getTrack(msg.victim);
  tv.streak = 0;
  tv.rapid = 0;

  if (msg.killer && msg.killer !== msg.victim) {
    const t = getTrack(msg.killer);
    const now = performance.now() / 1000;
    t.rapid = (now - t.last < 3.0) ? t.rapid + 1 : 1;
    t.last = now;
    t.streak += 1;

    // Determine announcement: MULTI has priority over STREAK
    let toastText = "";
    let toastKind: "multi" | "streak" = "multi";

    if (t.rapid >= 2) {
      // Multi-kill tier
      const multiLabel = t.rapid >= 4 ? "MULTI MEGA SMASH"
        : t.rapid === 3 ? "MULTI SMASH"
        : "DOUBLE SMASH";
      toastText = mine ? `${multiLabel}!` : `${msg.killerName} — ${multiLabel}`;
      toastKind = "multi";
    } else {
      // Streak tier — only announce at these thresholds
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
        const streakLabel = tier[1];
        toastText = mine ? `${streakLabel}!` : `${msg.killerName} — ${streakLabel}`;
        toastKind = "streak";
      }
    }

    if (toastText) pushToast(toastText, toastKind);
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
    // §E: show pause-invite-btn only when there is an active invite URL
    if (activeShareUrl || els.shareLink.value) {
      els.pauseInviteBtn.classList.remove("hidden");
    } else {
      els.pauseInviteBtn.classList.add("hidden");
    }
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
  lastKiller = "";
  prevLeader = "";
  smashTrack.clear();
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
  navReset();
  closeScanner();
  stopLocalScanInterval();
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
  // Block portrait on ALL screens on touch devices — including the menu.
  // This ensures a phone loading in portrait shows the overlay immediately.
  const show = window.Input.isTouchDevice() && portrait;
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

  renderLoadoutUI();
  persistLoadoutStore();
  fetchLeaderboard();
  setupTouchButtons();
  updateRotateOverlay();
  updateMenuMeta(false);
  clearShareInvite();

  if (window.SFX.startMenuAmbient) window.SFX.startMenuAmbient();
  if (window.Input.isTouchDevice()) document.body.classList.add("touch-device");

  // ─── LOCAL WI-FI PREFILL ─────────────────────────────────────────────────
  // Seed the room-name input with a fun random default on every load
  els.localRoomName.placeholder = randomLocalRoomName();
  els.localRoomName.value = "";

  // ─── MENU NAV ROUTER WIRING ───────────────────────────────────────────────
  // Wire nav buttons only inside the active menu shell.
  menuRoot.querySelectorAll<HTMLElement>(menuNavSelector).forEach((el) => {
    el.addEventListener("click", () => {
      const target = useArcadeMenu ? el.dataset.arcadeNav : el.dataset.nav;
      if (!target) return;
      window.SFX.uiClick();
      navGo(target);
    });
  });
  menuRoot.querySelectorAll<HTMLElement>(menuBackSelector).forEach((el) => {
    el.addEventListener("click", () => {
      window.SFX.uiClick();
      navBack();
    });
  });
  // Allow direct QA/deep-link entry to a menu screen via location hash (#customize, #lan, etc.)
  const initialHashScreen = location.hash.replace(/^#/, "").toLowerCase();
  if (MENU_SCREENS.includes(initialHashScreen as (typeof MENU_SCREENS)[number])) {
    navStack = [initialHashScreen];
    navShow(initialHashScreen);
  } else {
    navReset();
  }

  // ─── IN-GAME MENU BUTTON (§E) ─────────────────────────────────────────────
  els.ingameMenuBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    togglePause();
  });

  // ─── PAUSE INVITE BUTTON (§E) ─────────────────────────────────────────────
  els.pauseInviteBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    showShareQr();
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

  // ─── LOCAL WI-FI PARTY WIRING ─────────────────────────────────────────────
  els.localCreateBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    startLocalRoom();
  });
  els.localRoomName.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); window.SFX.uiClick(); startLocalRoom(); }
  });
  els.localScanBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    startLocalScanWithAutoRefresh();
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
      navGo("play");
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

  // ─── LOADOUT QUICK ACTIONS ────────────────────────────────────────────────
  els.quickPlayBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    startGame("PUBLIC");
  });
  els.privateRoomBtn.addEventListener("click", () => {
    window.SFX.uiClick();
    startGame(genCode());
  });
  els.customizeRandomize.addEventListener("click", () => {
    window.SFX.uiClick();
    updateSelectedLoadout(randomizeLoadout(), "Random loadout armed.");
  });
  els.customizeReset.addEventListener("click", () => {
    window.SFX.uiClick();
    updateSelectedLoadout(DEFAULT_LOADOUT, "Loadout reset to deck default.");
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

  // ─── BOT DIFFICULTY PICKER ────────────────────────────────────────────────
  // Reflect persisted value into radios on boot
  document.querySelectorAll<HTMLInputElement>('input[name="difficulty"]').forEach((r) => {
    r.checked = r.value === botDifficulty;
  });
  // Wire change: persist + notify server (guarded — server ignores it for non-hosts)
  document.querySelectorAll<HTMLInputElement>('input[name="difficulty"]').forEach((r) => {
    r.addEventListener("change", () => {
      if (!r.checked) return;
      const val = r.value as "easy" | "medium" | "high";
      botDifficulty = val;
      try { localStorage.setItem("smashcart.difficulty", val); } catch {}
      window.Net?.sendHostSettings?.({ botDifficulty: val });
    });
  });

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

  // Join screen — scan and submit (moved from #join-code-modal to #screen-join)
  // #join-code-open-btn and #join-code-cancel no longer exist; their listeners are removed.
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
    startGame(code, null);
  });
  els.joinCodeInput.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = resolveJoinInput();
      if (!code) return;
      window.SFX.uiClick();
      startGame(code, null);
    }
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

  // Host settings: bots toggle (immediate on change) — also sends difficulty so room starts at chosen tier
  els.lobbyBotsCheck.addEventListener("change", () => {
    window.Net.sendHostSettings({ botsInRoom: els.lobbyBotsCheck.checked, botDifficulty });
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
  // matchMedia change listener catches portrait↔landscape without relying solely on orientationchange
  try {
    const portraitMq = window.matchMedia("(orientation: portrait)");
    const mqHandler = () => updateRotateOverlay();
    if (portraitMq.addEventListener) portraitMq.addEventListener("change", mqHandler);
    else if ((portraitMq as any).addListener) (portraitMq as any).addListener(mqHandler); // Safari <14 fallback
  } catch {}
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (scannerOpen) { closeScanner(); return; }
      if (!els.shareQrOverlay.classList.contains("hidden")) { hideShareQr(); return; }
      if (settingsOpen) { hideSettings(); return; }
      // §C: nav back within menu (modal closes take priority above)
      if (mode === "menu" && navStack.length > 1) { navBack(); return; }
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

































