// menu.ts -- SmashCart screen router (home / join / hangar / settings / lobby)
// plus the in-game pause overlay. All menu markup is generated here; index.html
// only provides one empty host div (#arcade-start-screen).
//
// This module owns DOM structure, navigation transitions, and the local pilot
// profile (localStorage "smashcart-profile" v2). Networking stays in main.ts,
// which reacts through the MenuHandlers callbacks passed to mountScreens().
//
// Visual language: dark aviation-HUD theme, cyan primary / warm amber secondary,
// inline-SVG icons only (no emoji), transform/opacity-only transitions.

import {
  ACCENT_OPTIONS,
  AIRFRAME_OPTIONS,
  DEFAULT_LOADOUT,
  LEGACY_LOADOUT_KEYS,
  LOADOUT_STORAGE_KEY,
  LIVERY_OPTIONS,
  PAINT_OPTIONS,
  TRAIL_OPTIONS,
  cloneLoadout,
  loadoutFromLegacy,
  parseLoadoutStore,
  sameLoadout,
  type CosmeticLoadout,
  type CosmeticOption,
} from "../shared/loadout";

// --- Public API --------------------------------------------------------------

export const MENU_HOST_ID = "arcade-start-screen";

export type ScreenId = "home" | "join" | "hangar" | "settings" | "lobby";

export interface HostSettingsPatch {
  roundLength?: number;
  roomName?: string;
  botsInRoom?: boolean;
  botDifficulty?: string;
}

export interface LobbyRosterRow {
  id: string;
  name: string;
  ready: boolean;
  bot: boolean;
  color: number;
}

export interface LobbyViewData {
  roomName: string;
  roundLength: number;
  botsInRoom: boolean;
  botDifficulty: string;
  leaderId: string;
  myId: string | null;
  roster: LobbyRosterRow[];
}

export interface MenuHandlers {
  /** HOME > PLAY -- become leader of a fresh room. */
  onCreate(): void;
  /** JOIN > manual address / mDNS hit. Argument is host[:port], no scheme. */
  onJoinHost(host: string): void;
  /** LOBBY > leader pressed PLAY (start match). */
  onLobbyStart(): void;
  /** LOBBY > anyone toggled their own READY. */
  onLobbyReady(): void;
  /** LOBBY > leader long-pressed a player card. */
  onLobbyKick(targetId: string): void;
  /** LOBBY > leader changed a setting (already debounced where needed). */
  onLobbySettings(patch: HostSettingsPatch): void;
  /** LOBBY > LEAVE pressed. */
  onLobbyLeave(): void;
  /** PAUSE > Resume. */
  onPauseResume(): void;
  /** PAUSE > Leave Match (server keeps running for everyone else). */
  onPauseLeave(): void;
}

export interface Profile {
  name: string;
  cosmetics: CosmeticLoadout;
  audio?: { master?: number; music?: number; sfx?: number };
}

// --- Inline SVG icons (no emoji anywhere in menu chrome) ---------------------

const svg = (inner: string, viewBox = "0 0 24 24"): string =>
  `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;

const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72c0 .83.92 1.33 1.62.89l10.8-6.86a1.05 1.05 0 0 0 0-1.78L9.62 4.25A1.05 1.05 0 0 0 8 5.14z"/></svg>',
  join: svg('<path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.4"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.3-1.3"/>'),
  plane: svg('<path d="M17.8 19.2 16 11l3.5-3.5a2.12 2.12 0 0 0-3-3L13 8 4.8 6.2a.5.5 0 0 0-.5.81L8 10l-2.5 2.5-2.4-.5a.5.5 0 0 0-.55.77L4.5 15l2.23 2.95c.22.29.66.24.77-.09l.5-2.4L10.5 13l3 3.7a.5.5 0 0 0 .8-.06z"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  exit: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'),
  wifi: svg('<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/>'),
  refresh: svg('<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>'),
  pause: svg('<path d="M8 5v14M16 5v14"/>'),
  flag: svg('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>'),
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 11-13h-7l1-7z"/></svg>',
};

// --- Profile persistence (smashcart-profile v2 + legacy mirrors) -------------

const PROFILE_KEY = "smashcart-profile";
const NAME_KEY = "smashcart.name";

interface StoredProfile {
  v: 2;
  name?: string;
  cosmetics?: Partial<{ skin: number; bodyShape: number; accent: number; trail: number; livery: number }>;
  audio?: { master?: number; music?: number; sfx?: number };
}

function clampIdx(v: unknown, count: number, fallback: number): number {
  const n = typeof v === "number" ? Math.trunc(v) : NaN;
  return Number.isFinite(n) && n >= 0 && n < count ? n : fallback;
}

// Cosmetics resolution order: v2 profile -> legacy loadout store -> legacy flat
// keys -> defaults. All paths clamp indices against the option tables.
function sanitizeProfile(raw: StoredProfile | null): Profile {
  let cosmetics = cloneLoadout(DEFAULT_LOADOUT);
  let sawLegacy = false;
  try {
    const saved = parseLoadoutStore(localStorage.getItem(LOADOUT_STORAGE_KEY));
    if (saved) { cosmetics = cloneLoadout(saved.active); sawLegacy = true; }
  } catch {}
  if (!sawLegacy) {
    try {
      cosmetics = loadoutFromLegacy({
        skin: localStorage.getItem(LEGACY_LOADOUT_KEYS.skin),
        color: localStorage.getItem(LEGACY_LOADOUT_KEYS.color),
        bodyShape: localStorage.getItem(LEGACY_LOADOUT_KEYS.bodyShape),
        accent: localStorage.getItem(LEGACY_LOADOUT_KEYS.accent),
        trail: localStorage.getItem(LEGACY_LOADOUT_KEYS.trail),
        livery: localStorage.getItem(LEGACY_LOADOUT_KEYS.livery),
      });
    } catch {}
  }

  const c = raw?.cosmetics;
  if (c) {
    cosmetics.color = clampIdx(c.skin, PAINT_OPTIONS.length, cosmetics.color);
    cosmetics.bodyShape = clampIdx(c.bodyShape, AIRFRAME_OPTIONS.length, cosmetics.bodyShape);
    cosmetics.accent = clampIdx(c.accent, ACCENT_OPTIONS.length, cosmetics.accent);
    cosmetics.trail = clampIdx(c.trail, TRAIL_OPTIONS.length, cosmetics.trail);
    cosmetics.livery = clampIdx(c.livery, LIVERY_OPTIONS.length, cosmetics.livery);
  }

  let name = "";
  try { name = String(raw?.name ?? "").slice(0, 14); } catch {}
  if (!name) { try { name = localStorage.getItem(NAME_KEY)?.slice(0, 14) ?? ""; } catch {} }

  const audio = raw?.audio;
  return {
    name,
    cosmetics,
    audio: audio ? {
      master: typeof audio.master === "number" ? audio.master : undefined,
      music: typeof audio.music === "number" ? audio.music : undefined,
      sfx: typeof audio.sfx === "number" ? audio.sfx : undefined,
    } : undefined,
  };
}

let profile: Profile = {
  name: "",
  cosmetics: cloneLoadout(DEFAULT_LOADOUT),
};

function readProfile(): void {
  let raw: StoredProfile | null = null;
  try {
    const text = localStorage.getItem(PROFILE_KEY);
    if (text) raw = JSON.parse(text) as StoredProfile;
  } catch { raw = null; }
  try {
    profile = sanitizeProfile(raw);
  } catch {
    profile = { name: "", cosmetics: cloneLoadout(DEFAULT_LOADOUT) };
  }
}

/** Commit profile to localStorage (v2 key + legacy mirrors for older builds). */
export function saveProfile(next?: Partial<Profile>): void {
  if (next?.name !== undefined) profile.name = next.name;
  if (next?.cosmetics) profile.cosmetics = cloneLoadout(next.cosmetics);
  if (next?.audio) profile.audio = { ...profile.audio, ...next.audio };
  try {
    const out: StoredProfile = {
      v: 2,
      name: profile.name,
      cosmetics: {
        skin: profile.cosmetics.color,
        bodyShape: profile.cosmetics.bodyShape,
        accent: profile.cosmetics.accent,
        trail: profile.cosmetics.trail,
        livery: profile.cosmetics.livery,
      },
      audio: profile.audio,
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(out));
    localStorage.setItem(NAME_KEY, profile.name);
    localStorage.setItem(LEGACY_LOADOUT_KEYS.color, String(profile.cosmetics.color));
    localStorage.setItem(LEGACY_LOADOUT_KEYS.bodyShape, String(profile.cosmetics.bodyShape));
    localStorage.setItem(LEGACY_LOADOUT_KEYS.accent, String(profile.cosmetics.accent));
    localStorage.setItem(LEGACY_LOADOUT_KEYS.trail, String(profile.cosmetics.trail));
    localStorage.setItem(LEGACY_LOADOUT_KEYS.livery, String(profile.cosmetics.livery));
  } catch {}
}

/** Live cosmetics -- the hangar draft while editing, otherwise the saved set. */
export function getCosmetics(): CosmeticLoadout {
  return hangarDraft ? hangarDraft : profile.cosmetics;
}

export function getProfile(): Profile {
  return profile;
}

/** Current pilot name (profile first, legacy key fallback). */
export function getPilotName(): string {
  if (profile.name) return profile.name;
  try { return localStorage.getItem(NAME_KEY)?.slice(0, 14) ?? ""; } catch { return ""; }
}

// --- Module state ------------------------------------------------------------

type NavDir = "forward" | "back";

let root: HTMLElement | null = null;
let router: HTMLElement | null = null;
let handlers: MenuHandlers | null = null;
let stack: ScreenId[] = ["home"];
const screens = new Map<ScreenId, HTMLElement>();
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

let busy = false;
let hangarDraft: CosmeticLoadout | null = null;
let lobbySignature = "";
let settingsDebounce: number | null = null;
let probeToken = 0;
let pressTimer: number | null = null;

const buzz = (ms: number): void => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch {} };

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// --- Markup builders ---------------------------------------------------------

function topbar(title: string, opts?: { actions?: string }): string {
  return `
    <header class="sc-topbar">
      <button type="button" class="sc-btn sc-btn--ghost sc-back" data-nav-back aria-label="Back">${ICON.back}<span>Back</span></button>
      <h2 class="sc-topbar-title">${escapeHtml(title)}</h2>
      <div class="sc-topbar-actions">${opts?.actions ?? ""}</div>
    </header>`;
}

function screenShell(id: ScreenId, cls: string, inner: string): string {
  return `<section class="sc-screen ${cls}" data-screen="${id}" id="sc-screen-${id}">${inner}</section>`;
}

function homeMarkup(): string {
  return screenShell("home", "sc-screen--home", `
    <button type="button" class="sc-gear" data-nav-go="settings" aria-label="Settings">${ICON.gear}</button>
    <div class="sc-home-center">
      <div class="sc-title-block">
        <div class="sc-title-jet" aria-hidden="true">${ICON.plane}</div>
        <h1 class="sc-wordmark"><span>SMASH</span><em>CART</em></h1>
        <p class="sc-tagline">Local Wi-Fi dogfights - no servers - no waiting</p>
      </div>

      <label class="sc-field sc-home-name">
        <span class="sc-field-label">Pilot name</span>
        <input id="sc-home-name-input" class="sc-input" maxlength="14" placeholder="ACE" autocomplete="off" spellcheck="false" aria-label="Pilot name" />
      </label>

      <div class="sc-home-actions">
        <button type="button" class="sc-btn sc-btn--primary sc-btn--mega" id="sc-home-play" data-nav-go="__create__">${ICON.play}<span>PLAY</span></button>
        <div class="sc-home-row">
          <button type="button" class="sc-btn sc-btn--ghost" data-nav-go="join">${ICON.join}<span>JOIN</span></button>
          <button type="button" class="sc-btn sc-btn--ghost" data-nav-go="hangar">${ICON.plane}<span>HANGAR</span></button>
        </div>
      </div>

      <p id="sc-home-status" class="sc-status" aria-live="polite"></p>
    </div>
    <footer class="sc-home-foot">
      <span>${ICON.wifi}</span><span>Same Wi-Fi as your friends -- one player hosts, everyone else joins.</span>
    </footer>
  `);
}

function joinMarkup(): string {
  return screenShell("join", "sc-screen--join", `
    ${topbar("Join Room")}
    <div class="sc-body sc-join-body">
      <section class="sc-panel" id="sc-join-probe">
        <div class="sc-probe-line">
          <span class="sc-probe-dot" aria-hidden="true"></span>
          <p id="sc-join-probe-status" class="sc-probe-status">Scanning network<span class="sc-ellipsis"></span></p>
        </div>
        <button type="button" class="sc-btn sc-btn--amber sc-btn--wide sc-hidden" id="sc-join-found">
          ${ICON.bolt}<span>HOST FOUND -- TAP TO JOIN</span>
        </button>
        <button type="button" class="sc-btn sc-btn--ghost sc-btn--slim" id="sc-join-rescan">${ICON.refresh}<span>Search again</span></button>
      </section>

      <div class="sc-divider" data-label="or enter address"></div>

      <section class="sc-panel">
        <label class="sc-field">
          <span class="sc-field-label">Host address</span>
          <input id="sc-join-address" class="sc-input sc-input--mono" value="" placeholder="http://192.168.1.42:2567" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="url" aria-label="Host address" />
        </label>
        <button type="button" class="sc-btn sc-btn--primary sc-btn--wide" id="sc-join-submit">${ICON.play}<span>JOIN</span></button>
      </section>

      <p class="sc-note">${ICON.wifi}<span>Ask the host for their lobby QR -- point your phone camera at it, or type the address they see on screen.</span></p>
      <p id="sc-join-status" class="sc-status" aria-live="polite"></p>
    </div>
  `);
}

function hangarMarkup(): string {
  const tabs: Array<[string, string]> = [
    ["paint", "PAINT"],
    ["frame", "FRAME"],
    ["accent", "ACCENT"],
    ["livery", "LIVERY"],
    ["trail", "TRAIL"],
  ];
  return screenShell("hangar", "sc-screen--hangar", `
    ${topbar("Hangar", { actions: `
      <button type="button" class="sc-btn sc-btn--primary sc-btn--slim" id="sc-hangar-save">${ICON.check}<span>SAVE</span></button>
    ` })}
    <div class="sc-hangar-stage" aria-hidden="true"></div>
    <nav class="sc-hangar-tabs" role="tablist" aria-label="Customization">
      ${tabs.map(([id, label], i) => `
        <button type="button" class="sc-tab${i === 0 ? " is-active" : ""}" role="tab" aria-selected="${i === 0}" data-hangar-tab="${id}">${label}</button>
      `).join("")}
    </nav>
    <div class="sc-hangar-sheet">
      <div class="sc-hangar-panel is-active" data-hangar-panel="paint">
        <div class="sc-swatch-grid" id="sc-opt-paint"></div>
      </div>
      <div class="sc-hangar-panel" data-hangar-panel="frame">
        <div class="sc-card-grid" id="sc-opt-frame"></div>
      </div>
      <div class="sc-hangar-panel" data-hangar-panel="accent">
        <div class="sc-swatch-grid" id="sc-opt-accent"></div>
      </div>
      <div class="sc-hangar-panel" data-hangar-panel="livery">
        <div class="sc-card-grid" id="sc-opt-livery"></div>
      </div>
      <div class="sc-hangar-panel" data-hangar-panel="trail">
        <div class="sc-swatch-grid" id="sc-opt-trail"></div>
      </div>
    </div>
  `);
}

function settingsMarkup(): string {
  return screenShell("settings", "sc-screen--settings", `
    ${topbar("Settings")}
    <div class="sc-body sc-settings-body">
      <section class="sc-panel">
        <h3 class="sc-section-head">Audio</h3>
        <label class="sc-set-row"><span>Master</span><input type="range" id="sc-vol-master" min="0" max="1" step="0.01" value="1" /></label>
        <label class="sc-set-row"><span>SFX</span><input type="range" id="sc-vol-sfx" min="0" max="1" step="0.01" value="1" /></label>
        <label class="sc-set-row"><span>Music</span><input type="range" id="sc-vol-music" min="0" max="1" step="0.01" value="0.5" /></label>
        <button type="button" class="sc-btn sc-btn--ghost sc-btn--slim" id="sc-mute-toggle"><span>MUTE ALL</span></button>
      </section>

      <section class="sc-panel">
        <h3 class="sc-section-head">Graphics</h3>
        <div class="sc-segmented" role="radiogroup" aria-label="Graphics quality" id="sc-quality-group">
          <button type="button" data-q="low">LOW</button>
          <button type="button" data-q="med">MED</button>
          <button type="button" data-q="high">HIGH</button>
          <button type="button" data-q="auto" class="is-on">AUTO</button>
        </div>
      </section>

      <section class="sc-panel">
        <h3 class="sc-section-head">Pilot</h3>
        <label class="sc-field">
          <span class="sc-field-label">Call sign</span>
          <input id="sc-set-name" class="sc-input" maxlength="14" placeholder="ACE" autocomplete="off" spellcheck="false" />
        </label>
      </section>

      <section class="sc-panel sc-touch-only">
        <h3 class="sc-section-head">Controls</h3>
        <div class="sc-segmented" role="radiogroup" aria-label="Touch control scheme" id="sc-scheme-group">
          <button type="button" data-scheme="dpad">D-PAD</button>
          <button type="button" data-scheme="joystick">STICK</button>
          <button type="button" data-scheme="tilt">TILT</button>
        </div>
        <label class="sc-set-row sc-check-row"><span>Invert pitch</span><input type="checkbox" id="sc-inv-pitch" /></label>
        <label class="sc-set-row sc-check-row"><span>Invert steer</span><input type="checkbox" id="sc-inv-steer" /></label>
      </section>
    </div>
  `);
}

function lobbyMarkup(): string {
  return screenShell("lobby", "sc-screen--lobby", `
    ${topbar("Lobby", { actions: `
      <button type="button" class="sc-btn sc-btn--danger sc-btn--slim" id="sc-lobby-leave">${ICON.exit}<span>LEAVE</span></button>
    ` })}
    <div class="sc-body sc-lobby-body">

      <section class="sc-panel sc-lobby-qr-panel">
        <p class="sc-field-label">ROOM</p>
        <h2 id="sc-lobby-room-name-view" class="sc-lobby-roomname">Private Room</h2>
        <input id="sc-lobby-room-name-edit" class="sc-input" maxlength="20" placeholder="Name this room..." autocomplete="off" aria-label="Room name" />
        <div class="sc-qr-frame">
          <canvas id="sc-lobby-qr" width="0" height="0" aria-label="Join QR code"></canvas>
        </div>
        <p class="sc-note sc-note--tight">${ICON.wifi}<span>Friends: join the same Wi-Fi, then scan this.</span></p>
        <p id="sc-lobby-url" class="sc-lobby-url mono"></p>
      </section>

      <section class="sc-lobby-right">
        <section class="sc-panel sc-lobby-settings-panel" id="sc-lobby-leader-settings">
          <h3 class="sc-section-head">Room settings</h3>
          <label class="sc-set-row">
            <span>Round</span>
            <select id="sc-lobby-round" class="sc-select">
              <option value="60">1:00</option>
              <option value="90">1:30</option>
              <option value="120">2:00</option>
              <option value="150">2:30</option>
              <option value="180">3:00</option>
              <option value="240">4:00</option>
              <option value="300">5:00</option>
            </select>
          </label>
          <label class="sc-set-row sc-check-row">
            <span>Bots fill seats</span>
            <input type="checkbox" id="sc-lobby-bots" />
          </label>
          <div class="sc-segmented sc-segmented--small" id="sc-lobby-difficulty" role="radiogroup" aria-label="Bot difficulty">
            <button type="button" data-diff="easy">EASY</button>
            <button type="button" data-diff="medium">MED</button>
            <button type="button" data-diff="high">HIGH</button>
          </div>
        </section>
        <section class="sc-panel sc-hidden" id="sc-lobby-settings-view">
          <p id="sc-lobby-settings-chips" class="sc-chip-row"></p>
        </section>

        <section class="sc-panel sc-lobby-roster-panel">
          <h3 class="sc-section-head">Pilots <span id="sc-lobby-count" class="sc-count-chip">1</span></h3>
          <div id="sc-lobby-roster" class="sc-roster"></div>
          <p class="sc-hint" id="sc-lobby-kick-hint">Hold a pilot's card to kick them.</p>
        </section>
      </section>
    </div>

    <div class="sc-lobby-actions">
      <button type="button" class="sc-btn sc-btn--ghost" id="sc-lobby-ready">${ICON.check}<span>READY</span></button>
      <button type="button" class="sc-btn sc-btn--primary sc-btn--mega" id="sc-lobby-play">${ICON.play}<span>PLAY</span></button>
    </div>
    <p class="sc-hint sc-lobby-autohint">Starts automatically when every pilot is ready.</p>
  `);
}

function pauseMarkup(): string {
  return `
    <div id="sc-pause" class="sc-pause sc-hidden" role="dialog" aria-modal="true" aria-label="Paused">
      <div class="sc-pause-card">
        <div class="sc-pause-icon" aria-hidden="true">${ICON.pause}</div>
        <h2>PAUSED</h2>
        <div class="sc-pause-actions">
          <button type="button" class="sc-btn sc-btn--primary sc-btn--wide" id="sc-pause-resume">${ICON.play}<span>RESUME</span></button>
          <button type="button" class="sc-btn sc-btn--danger sc-btn--wide" id="sc-pause-leave">${ICON.exit}<span>LEAVE MATCH</span></button>
        </div>
        <p class="sc-hint">Leaving keeps the match running for everyone else.</p>
      </div>
    </div>`;
}

// --- Mount -------------------------------------------------------------------

export function mountScreens(hostEl: HTMLElement, h: MenuHandlers): void {
  root = hostEl;
  handlers = h;
  readProfile();

  root.innerHTML = `
    <div class="sc-root">
      <div class="sc-router" id="sc-router">
        ${homeMarkup()}
        ${joinMarkup()}
        ${hangarMarkup()}
        ${settingsMarkup()}
        ${lobbyMarkup()}
      </div>
      ${pauseMarkup()}
    </div>`;
  root.classList.remove("hidden");
  document.body.classList.add("sc-menu-open");

  router = $("sc-router");
  router.querySelectorAll<HTMLElement>(".sc-screen").forEach((el) => {
    const id = el.dataset.screen as ScreenId;
    screens.set(id, el);
  });

  wireNav();
  wireHome();
  wireJoin();
  wireHangar();
  wireSettings();
  wireLobby();
  wirePause();

  showScreen("home");
  reflectProfileIntoUI();
  applyStoredAudioPrefs();
}

function reflectProfileIntoUI(): void {
  const nameInput = $("sc-home-name-input") as HTMLInputElement | null;
  if (nameInput) nameInput.value = profile.name;
  const setName = $("sc-set-name") as HTMLInputElement | null;
  if (setName) setName.value = profile.name;
}

function applyStoredAudioPrefs(): void {
  const a = profile.audio;
  if (!a) return;
  try {
    if (typeof a.master === "number") window.SFX.setMaster(a.master);
    if (typeof a.sfx === "number") window.SFX.setSfx(a.sfx);
    if (typeof a.music === "number") window.SFX.setMusic(a.music);
  } catch {}
}

// --- Navigation --------------------------------------------------------------

export function currentScreenId(): ScreenId {
  return stack[stack.length - 1] || "home";
}

const TRANSITION_MS = 340;

export function showScreen(id: ScreenId, dir: NavDir = "forward"): void {
  if (!router) return;
  if (currentScreenId() === id && screens.get(id)?.classList.contains("is-active")) return;

  stopProbe();
  const prevId = currentScreenId();
  const prevEl = screens.get(prevId);
  const nextEl = screens.get(id);
  if (!nextEl) return;

  if (id === "hangar") beginHangarDraft();
  if (id === "settings") populateSettingsUI();
  if (id === "join") startProbe();

  stack.push(id);

  if (prevEl && prevEl !== nextEl && prevEl.classList.contains("is-active")) {
    prevEl.classList.add(dir === "back" ? "anim-back-out" : "anim-fwd-out");
    prevEl.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      prevEl.classList.remove("is-active", "anim-fwd-out", "anim-back-out");
    }, TRANSITION_MS);
  }

  nextEl.classList.remove("anim-fwd-in", "anim-back-in", "anim-fwd-out", "anim-back-out");
  void nextEl.offsetWidth;
  nextEl.classList.add("is-active", dir === "back" ? "anim-back-in" : "anim-fwd-in");
  nextEl.removeAttribute("aria-hidden");

  if (stack[stack.length - 1] !== id) stack.push(id);

  const scroller = nextEl.querySelector(".sc-body") as HTMLElement | null;
  if (scroller) scroller.scrollTop = 0;
}

export function navBack(): void {
  if (stack.length <= 1) return;
  const leaving = currentScreenId();
  if (leaving === "hangar") cancelHangarDraft();
  stack.pop();
  showScreen(stack[stack.length - 1] || "home", "back");
}

export function resetToHome(): void {
  cancelHangarDraft();
  stack = ["home"];
  for (const [, el] of screens) el.classList.remove("is-active", "anim-fwd-in", "anim-back-in", "anim-fwd-out", "anim-back-out");
  showScreen("home", "back");
  hidePause();
}

/** Deep-link support: "#hangar" etc. seeds Home underneath so Back works. */
export function applyInitialHash(): void {
  const hash = location.hash.replace(/^#/, "").toLowerCase() as ScreenId;
  const valid: ScreenId[] = ["join", "hangar", "settings"];
  if (valid.includes(hash)) {
    stack = ["home"];
    showScreen(hash);
  }
}

function wireNav(): void {
  root!.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const go = target.closest<HTMLElement>("[data-nav-go]");
    if (go) {
      const dest = go.dataset.navGo!;
      uiTap();
      if (dest === "__create__") { handlers?.onCreate(); return; }
      showScreen(dest as ScreenId);
      return;
    }
    if (target.closest("[data-nav-back]")) { uiTap(); navBack(); }
  });
}

function uiTap(): void {
  buzz(8);
  try { window.SFX.unlock(); } catch {}
  try { window.SFX.uiClick(); } catch {}
}

// --- Busy / status -----------------------------------------------------------

export function setBusy(b: boolean): void {
  busy = b;
  for (const id of ["sc-home-play", "sc-join-submit", "sc-join-found"]) {
    const el = $(id) as HTMLButtonElement | null;
    if (el) el.disabled = b;
  }
  document.body.classList.toggle("sc-busy", b);
}

export function setStatus(text: string, screen: "home" | "join" = "home"): void {
  const el = $(screen === "home" ? "sc-home-status" : "sc-join-status");
  if (el) el.textContent = text;
}

// --- HOME --------------------------------------------------------------------

function wireHome(): void {
  const nameInput = $("sc-home-name-input") as HTMLInputElement;
  const commit = () => {
    const clean = nameInput.value.trim().slice(0, 14);
    nameInput.value = clean;
    saveProfile({ name: clean });
  };
  nameInput.addEventListener("change", commit);
  nameInput.addEventListener("blur", commit);
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      nameInput.blur();
    }
  });
}

// --- JOIN (mDNS probe + manual address) --------------------------------------

const MDNS_HOST = "smashcart.local";
const PROBE_TIMEOUT_MS = 3000;

function mdnsOrigin(): string {
  const port = location.port || "2567";
  return `${MDNS_HOST}:${port}`;
}

function probeReachable(origin: string, token: number): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(false), PROBE_TIMEOUT_MS);
    const img = new Image();
    img.onload = () => { window.clearTimeout(timer); finish(true); };
    img.onerror = () => { window.clearTimeout(timer); finish(false); };
    img.src = `http://${origin}/icons/icon.svg?t=${Date.now()}-${token}`;
  });
}

function startProbe(): void {
  const token = ++probeToken;
  const statusEl = $("sc-join-probe-status");
  const foundBtn = $("sc-join-found");
  const rescanBtn = $("sc-join-rescan");
  const probeLine = document.querySelector("#sc-join-probe .sc-probe-line") as HTMLElement | null;
  if (!statusEl || !foundBtn || !rescanBtn) return;

  foundBtn.classList.add("sc-hidden");
  rescanBtn.classList.add("sc-hidden");
  if (probeLine) probeLine.classList.remove("sc-hidden");
  statusEl.innerHTML = 'Scanning network<span class="sc-ellipsis"></span>';

  const origin = mdnsOrigin();
  probeReachable(origin, token).then((ok) => {
    if (token !== probeToken) return;
    if (ok) {
      if (probeLine) probeLine.classList.add("sc-hidden");
      foundBtn.classList.remove("sc-hidden");
      foundBtn.dataset.origin = origin;
    } else {
      statusEl.textContent = "No host answered on smashcart.local.";
      if (probeLine) probeLine.classList.remove("sc-hidden");
      rescanBtn.classList.remove("sc-hidden");
    }
  });
}

function stopProbe(): void {
  probeToken++;
}

function parseAddress(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "http://" + s;
  try {
    const url = new URL(s);
    if (!url.hostname) return null;
    return url.port ? `${url.hostname}:${url.port}` : url.hostname;
  } catch {
    return null;
  }
}

function wireJoin(): void {
  const addressInput = $("sc-join-address") as HTMLInputElement;
  addressInput.value = "http://192.168.";
  addressInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); submitJoin(); }
  });

  const submitBtn = $("sc-join-submit");
  submitBtn?.addEventListener("click", submitJoin);

  const foundBtn = $("sc-join-found");
  foundBtn?.addEventListener("click", () => {
    uiTap();
    const origin = (foundBtn as HTMLElement).dataset.origin;
    if (origin && handlers) handlers.onJoinHost(origin);
  });

  $("sc-join-rescan")?.addEventListener("click", () => { uiTap(); startProbe(); });

  function submitJoin(): void {
    if (busy) return;
    const host = parseAddress(addressInput.value);
    if (!host) {
      setStatus("That doesn't look like an address -- try http://192.168.x.x:2567", "join");
      return;
    }
    uiTap();
    setStatus(`Joining ${host}...`, "join");
    handlers?.onJoinHost(host);
  }
}

// --- HANGAR ------------------------------------------------------------------

function beginHangarDraft(): void {
  hangarDraft = cloneLoadout(profile.cosmetics);
  renderHangarOptions();
}

function cancelHangarDraft(): void {
  if (hangarDraft && !sameLoadout(hangarDraft, profile.cosmetics)) {
    try {
      if (window.Renderer && window.Renderer.updateMenuPlane) {
        window.Renderer.updateMenuPlane(profile.cosmetics);
      }
    } catch {}
  }
  hangarDraft = null;
}

function commitHangar(save: boolean): void {
  if (hangarDraft && save) {
    saveProfile({ cosmetics: cloneLoadout(hangarDraft) });
  }
  hangarDraft = null;
}

function renderHangarOptions(): void {
  const draft = hangarDraft || profile.cosmetics;

  const swatch = (targetId: string, key: "color" | "accent" | "trail", options: CosmeticOption[]): void => {
    const target = $(targetId);
    if (!target) return;
    target.innerHTML = options.map((o) => `
      <button type="button" class="sc-swatch${draft[key] === o.value ? " is-selected" : ""}"
              data-key="${key}" data-value="${o.value}" style="--swatch:${o.swatch || "#fff"}"
              aria-label="${escapeHtml(o.label)}">
        <span class="sc-swatch-core"></span>
        <span class="sc-swatch-label">${escapeHtml(o.label)}</span>
      </button>`).join("");
    target.querySelectorAll<HTMLButtonElement>(".sc-swatch").forEach((btn) => {
      btn.addEventListener("click", () => {
        uiTap();
        pickOption(btn.dataset.key as keyof CosmeticLoadout, Number(btn.dataset.value));
      });
    });
  };

  const cards = (targetId: string, key: "bodyShape" | "livery", options: CosmeticOption[]): void => {
    const target = $(targetId);
    if (!target) return;
    target.innerHTML = options.map((o) => `
      <button type="button" class="sc-opt-card${draft[key] === o.value ? " is-selected" : ""}"
              data-key="${key}" data-value="${o.value}">
        <strong>${escapeHtml(o.label)}</strong>
        <span>${escapeHtml(o.note)}</span>
      </button>`).join("");
    target.querySelectorAll<HTMLButtonElement>(".sc-opt-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        uiTap();
        pickOption(btn.dataset.key as keyof CosmeticLoadout, Number(btn.dataset.value));
      });
    });
  };

  swatch("sc-opt-paint", "color", PAINT_OPTIONS);
  swatch("sc-opt-accent", "accent", ACCENT_OPTIONS);
  swatch("sc-opt-trail", "trail", TRAIL_OPTIONS);
  cards("sc-opt-frame", "bodyShape", AIRFRAME_OPTIONS);
  cards("sc-opt-livery", "livery", LIVERY_OPTIONS);
}

function pickOption(key: keyof CosmeticLoadout, value: number): void {
  if (!hangarDraft) return;
  const next = cloneLoadout(hangarDraft);
  (next as unknown as Record<string, number>)[key] = value;
  hangarDraft = next;
  renderHangarOptions();
  try {
    if (window.Renderer && window.Renderer.updateMenuPlane) window.Renderer.updateMenuPlane(hangarDraft);
  } catch {}
}

function wireHangar(): void {
  root!.querySelectorAll<HTMLElement>("[data-hangar-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      uiTap();
      const target = tab.dataset.hangarTab!;
      root!.querySelectorAll<HTMLElement>("[data-hangar-tab]").forEach((t) => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      root!.querySelectorAll<HTMLElement>("[data-hangar-panel]").forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.hangarPanel === target);
      });
    });
  });

  $("sc-hangar-save")?.addEventListener("click", () => {
    commitHangar(true);
    uiTap();
    const saveBtn = $("sc-hangar-save");
    if (saveBtn) {
      saveBtn.classList.add("did-save");
      window.setTimeout(() => saveBtn.classList.remove("did-save"), 900);
    }
    // Keep editing seamlessly; the draft continues from the saved state.
    beginHangarDraft();
  });
}

// --- SETTINGS ----------------------------------------------------------------

function populateSettingsUI(): void {
  try {
    const vols = window.SFX.vols();
    const master = $("sc-vol-master") as HTMLInputElement | null;
    const sfx = $("sc-vol-sfx") as HTMLInputElement | null;
    const music = $("sc-vol-music") as HTMLInputElement | null;
    if (master) master.value = String(vols.master);
    if (sfx) sfx.value = String(vols.sfx);
    if (music) music.value = String(vols.music);
    const muteBtn = $("sc-mute-toggle");
    if (muteBtn) muteBtn.classList.toggle("is-on", !!vols.muted);
  } catch {}

  try {
    const tier = window.Quality._auto ? "auto" : window.Quality.current;
    document.querySelectorAll<HTMLButtonElement>("#sc-quality-group button").forEach((b) => {
      b.classList.toggle("is-on", b.dataset.q === tier);
    });
  } catch {}

  const nameEl = $("sc-set-name") as HTMLInputElement | null;
  if (nameEl && document.activeElement !== nameEl) nameEl.value = profile.name;

  try {
    document.querySelectorAll<HTMLButtonElement>("#sc-scheme-group button").forEach((b) => {
      b.classList.toggle("is-on", b.dataset.scheme === window.Input.controlScheme);
    });
  } catch {}
  const invP = $("sc-inv-pitch") as HTMLInputElement | null;
  const invS = $("sc-inv-steer") as HTMLInputElement | null;
  if (invP) invP.checked = !!window.Input.invertPitch;
  if (invS) invS.checked = !!window.Input.invertSteer;
}

function wireSettings(): void {
  const bindVol = (id: string, setter: (v: number) => void, slot: "master" | "sfx" | "music"): void => {
    const el = $(id) as HTMLInputElement | null;
    el?.addEventListener("input", () => {
      const v = parseFloat(el.value);
      if (!Number.isFinite(v)) return;
      try { setter(v); } catch {}
      saveProfile({ audio: { [slot]: v } });
    });
  };
  bindVol("sc-vol-master", (v) => window.SFX.setMaster(v), "master");
  bindVol("sc-vol-sfx", (v) => window.SFX.setSfx(v), "sfx");
  bindVol("sc-vol-music", (v) => window.SFX.setMusic(v), "music");

  $("sc-mute-toggle")?.addEventListener("click", () => {
    uiTap();
    const muted = window.SFX.toggleMute();
    $("sc-mute-toggle")?.classList.toggle("is-on", muted);
  });

  const applyQuality = (q: string): void => {
    try {
      if (q === "auto") {
        window.Quality._auto = true;
        try { localStorage.removeItem("sc_quality"); } catch {}
      } else {
        window.Quality.set(q, true);
      }
    } catch {}
    document.querySelectorAll<HTMLButtonElement>("#sc-quality-group button").forEach((b) => {
      b.classList.toggle("is-on", b.dataset.q === q);
    });
  };
  document.querySelectorAll<HTMLButtonElement>("#sc-quality-group button").forEach((b) => {
    b.addEventListener("click", () => { uiTap(); applyQuality(b.dataset.q!); });
  });

  const nameEl = $("sc-set-name") as HTMLInputElement;
  const commitName = () => {
    const clean = nameEl.value.trim().slice(0, 14);
    nameEl.value = clean;
    saveProfile({ name: clean });
    const homeName = $("sc-home-name-input") as HTMLInputElement | null;
    if (homeName) homeName.value = clean;
  };
  nameEl.addEventListener("change", commitName);
  nameEl.addEventListener("blur", commitName);

  document.querySelectorAll<HTMLButtonElement>("#sc-scheme-group button").forEach((b) => {
    b.addEventListener("click", () => {
      uiTap();
      const scheme = b.dataset.scheme as ControlScheme;
      persistControlScheme(scheme);
      if (scheme === "tilt") {
        window.Input.attachTilt();
        const DevOri = DeviceOrientationEvent as any;
        if (typeof DevOri.requestPermission !== "function") {
          window.Input.setControlScheme("tilt");
        }
      } else {
        window.Input.setControlScheme(scheme);
      }
      document.querySelectorAll<HTMLButtonElement>("#sc-scheme-group button").forEach((x) => {
        x.classList.toggle("is-on", x === b);
      });
    });
  });

  const invP = $("sc-inv-pitch") as HTMLInputElement;
  invP?.addEventListener("change", () => {
    window.Input.invertPitch = invP.checked;
    try { localStorage.setItem("smashcart.invertPitch", invP.checked ? "1" : "0"); } catch {}
  });
  const invS = $("sc-inv-steer") as HTMLInputElement;
  invS?.addEventListener("change", () => {
    window.Input.invertSteer = invS.checked;
    try { localStorage.setItem("smashcart.invertSteer", invS.checked ? "1" : "0"); } catch {}
  });
}

// --- LOBBY -------------------------------------------------------------------

export function setLobbyQr(joinUrl: string): void {
  const canvas = $("sc-lobby-qr") as HTMLCanvasElement | null;
  if (!canvas) return;
  try {
    window.QR.render(canvas, joinUrl, { size: 220, margin: 2, errorCorrectionLevel: "M" });
  } catch {
    canvas.width = 0;
    canvas.height = 0;
  }
  const urlEl = $("sc-lobby-url");
  if (urlEl) urlEl.textContent = joinUrl;
}

function fmtLen(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}:${String(s).padStart(2, "0")}` : `${m}:00`;
}

/**
 * Re-render lobby from authoritative state. Diffes against the previous render
 * so the 30 Hz snapshot stream doesn't thrash the DOM.
 */
export function renderLobby(data: LobbyViewData): void {
  const sig = JSON.stringify(data);
  if (sig === lobbySignature) return;
  lobbySignature = sig;

  const iAmLeader = !!data.myId && data.myId === data.leaderId;

  // Room name -- never clobber an input the leader is typing in.
  const viewEl = $("sc-lobby-room-name-view");
  const editEl = $("sc-lobby-room-name-edit") as HTMLInputElement | null;
  if (viewEl) viewEl.textContent = data.roomName || "Private Room";
  if (editEl && document.activeElement !== editEl) editEl.value = data.roomName || "";

  // Leader-only controls.
  $("sc-lobby-leader-settings")?.classList.toggle("sc-hidden", !iAmLeader);
  $("sc-lobby-settings-view")?.classList.toggle("sc-hidden", iAmLeader);
  $("sc-lobby-play")?.classList.toggle("sc-hidden", !iAmLeader);
  $("sc-lobby-play")?.setAttribute("aria-hidden", iAmLeader ? "false" : "true");
  $("sc-lobby-kick-hint")?.classList.toggle("sc-hidden", !iAmLeader);

  if (iAmLeader) {
    const roundSel = $("sc-lobby-round") as HTMLSelectElement | null;
    if (roundSel && document.activeElement !== roundSel) roundSel.value = String(data.roundLength);
    const bots = $("sc-lobby-bots") as HTMLInputElement | null;
    if (bots) bots.checked = !!data.botsInRoom;
    document.querySelectorAll<HTMLButtonElement>("#sc-lobby-difficulty button").forEach((b) => {
      b.classList.toggle("is-on", b.dataset.diff === data.botDifficulty);
    });
  } else {
    const chips = $("sc-lobby-settings-chips");
    if (chips) {
      chips.innerHTML =
        `<span class="sc-chip">ROUND ${fmtLen(data.roundLength)}</span>` +
        `<span class="sc-chip">BOTS ${data.botsInRoom ? "ON" : "OFF"}</span>` +
        `<span class="sc-chip">${escapeHtml(String(data.botDifficulty || "medium").toUpperCase())} BOTS</span>`;
    }
  }

  // Roster.
  const rosterEl = $("sc-lobby-roster");
  if (rosterEl) {
    const hexOf = (idx: number): string =>
      PAINT_OPTIONS[idx >= 0 && idx < PAINT_OPTIONS.length ? idx : 0]?.swatch || "#fff";
    rosterEl.innerHTML = data.roster.map((p) => {
      const mine = p.id === data.myId;
      const kickable = iAmLeader && !mine && !p.bot;
      const badge = p.id === data.leaderId
        ? '<span class="sc-badge sc-badge--lead">LEAD</span>'
        : p.bot ? '<span class="sc-badge sc-badge--bot">BOT</span>' : "";
      return `
        <div class="sc-player${mine ? " is-me" : ""}${kickable ? " is-kickable" : ""}${p.ready ? " is-ready" : ""}" data-id="${escapeHtml(p.id)}"${mine ? ' data-self="1"' : ""}>
          <span class="sc-dot" style="--dot:${hexOf(p.color)}"></span>
          <span class="sc-player-name">${escapeHtml(p.name)}${mine ? '<span class="sc-badge sc-badge--you">YOU</span>' : ""}</span>
          ${badge}
          <span class="sc-tick"${p.ready ? ' aria-label="Ready"' : ' aria-label="Not ready"'}>${ICON.check}</span>
        </div>`;
    }).join("");

    rosterEl.querySelectorAll<HTMLElement>(".sc-player.is-kickable").forEach((card) => {
      attachHoldToKick(card);
    });
    rosterEl.querySelectorAll<HTMLElement>('.sc-player[data-self="1"]').forEach((card) => {
      card.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).closest(".sc-kick")) return;
        uiTap();
        handlers?.onLobbyReady();
      });
    });
  }

  const countEl = $("sc-lobby-count");
  if (countEl) countEl.textContent = String(data.roster.length);

  // My ready-state button label.
  const me = data.roster.find((p) => p.id === data.myId);
  const readyBtn = $("sc-lobby-ready");
  if (readyBtn && me) {
    readyBtn.classList.toggle("is-on", !!me.ready);
    const label = readyBtn.querySelector("span");
    if (label) label.textContent = me.ready ? "UNREADY" : "READY";
  }
}

function attachHoldToKick(card: HTMLElement): void {
  const clear = (): void => {
    if (pressTimer !== null) { window.clearTimeout(pressTimer); pressTimer = null; }
    card.classList.remove("is-pressing");
  };
  card.addEventListener("pointerdown", (e) => {
    if ((e as PointerEvent).pointerType === "mouse" && (e as PointerEvent).button !== 0) return;
    card.classList.add("is-pressing");
    pressTimer = window.setTimeout(() => {
      clear();
      const name = card.querySelector(".sc-player-name")?.textContent || "this pilot";
      if (window.confirm(`Kick ${name} from the room?`)) {
        const id = card.dataset.id;
        if (id && handlers) handlers.onLobbyKick(id);
      }
    }, 550);
  });
  card.addEventListener("pointerup", clear);
  card.addEventListener("pointercancel", clear);
  card.addEventListener("pointerleave", clear);
}

function wireLobby(): void {
  $("sc-lobby-ready")?.addEventListener("click", () => { uiTap(); handlers?.onLobbyReady(); });
  $("sc-lobby-play")?.addEventListener("click", () => { uiTap(); handlers?.onLobbyStart(); });
  $("sc-lobby-leave")?.addEventListener("click", () => { uiTap(); handlers?.onLobbyLeave(); });

  const edit = $("sc-lobby-room-name-edit") as HTMLInputElement;
  edit?.addEventListener("input", () => {
    if (settingsDebounce !== null) window.clearTimeout(settingsDebounce);
    settingsDebounce = window.setTimeout(() => {
      settingsDebounce = null;
      handlers?.onLobbySettings({ roomName: edit.value });
    }, 300);
  });
  edit?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); edit.blur(); }
  });

  $("sc-lobby-round")?.addEventListener("change", () => {
    const sel = $("sc-lobby-round") as HTMLSelectElement;
    const v = parseInt(sel.value, 10);
    if (Number.isFinite(v)) handlers?.onLobbySettings({ roundLength: v });
  });

  $("sc-lobby-bots")?.addEventListener("change", () => {
    const box = $("sc-lobby-bots") as HTMLInputElement;
    handlers?.onLobbySettings({ botsInRoom: box.checked });
  });

  document.querySelectorAll<HTMLButtonElement>("#sc-lobby-difficulty button").forEach((b) => {
    b.addEventListener("click", () => {
      uiTap();
      document.querySelectorAll<HTMLButtonElement>("#sc-lobby-difficulty button").forEach((x) => {
        x.classList.toggle("is-on", x === b);
      });
      handlers?.onLobbySettings({ botDifficulty: b.dataset.diff });
    });
  });
}

export function invalidateLobbyCache(): void {
  lobbySignature = "";
}

// --- PAUSE OVERLAY -----------------------------------------------------------

export function showPause(): void {
  $("sc-pause")?.classList.remove("sc-hidden");
}

export function hidePause(): void {
  $("sc-pause")?.classList.add("sc-hidden");
}

function wirePause(): void {
  $("sc-pause-resume")?.addEventListener("click", () => { uiTap(); handlers?.onPauseResume(); });
  $("sc-pause-leave")?.addEventListener("click", () => { uiTap(); handlers?.onPauseLeave(); });
}

// --- Boot-time input pref mirrors (kept beside settings wiring) --------------

export function loadStoredControlPrefs(): void {
  try { window.Input.invertPitch = localStorage.getItem("smashcart.invertPitch") === "1"; } catch {}
  try { window.Input.invertSteer = localStorage.getItem("smashcart.invertSteer") === "1"; } catch {}
  try {
    const saved = localStorage.getItem("smashcart.controls") as ControlScheme | null;
    if (saved === "joystick" || saved === "tilt" || saved === "dpad") window.Input.controlScheme = saved;
  } catch {}
}

export function persistControlScheme(scheme: ControlScheme): void {
  try { localStorage.setItem("smashcart.controls", scheme); } catch {}
}
