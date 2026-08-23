// @vitest-environment jsdom
//
// tests/menu.test.ts
// The screen router and the pilot profile — the two pieces of menu.ts that hold
// real state. menu.ts owns module-level state (profile, nav stack, screen map),
// so every test re-imports it through vi.resetModules() for a clean slate.
//
// Only this suite needs a DOM; the rest of the client suites stay on the node
// environment. See tests/client-env.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./client-env";
import {
  DEFAULT_LOADOUT,
  LEGACY_LOADOUT_KEYS,
  LOADOUT_STORAGE_KEY,
  PAINT_OPTIONS,
  AIRFRAME_OPTIONS,
} from "../src/shared/loadout";

type Menu = typeof import("../src/client/menu");

const PROFILE_KEY = "smashcart-profile";
const NAME_KEY = "smashcart.name";

/** The handler bundle mountScreens() calls back into; every entry is a spy. */
function makeHandlers() {
  return {
    onCreate: vi.fn(),
    onJoin: vi.fn(),
    onQuickPlay: vi.fn(),
    onLobbyStart: vi.fn(),
    onLobbyReady: vi.fn(),
    onLobbyKick: vi.fn(),
    onLobbySettings: vi.fn(),
    onLobbyLeave: vi.fn(),
    onPauseResume: vi.fn(),
    onPauseLeave: vi.fn(),
  };
}

/** Stub the browser-global modules menu.ts talks to (all published on window). */
function installGlobals() {
  const w = window as any;
  w.SFX = {
    uiClick: vi.fn(), unlock: vi.fn(), toggleMute: vi.fn(),
    setMaster: vi.fn(), setMusic: vi.fn(), setSfx: vi.fn(),
    vols: { master: 1, music: 0.5, sfx: 0.8 },
  };
  w.Input = {
    controlScheme: "buttons",
    invertPitch: false,
    invertSteer: false,
    setControlScheme: vi.fn(),
    attachTilt: vi.fn(),
    isTouchDevice: () => false,
  };
  w.Renderer = { updateMenuPlane: vi.fn(), setSceneMode: vi.fn(), setHangarOpen: vi.fn() };
  w.Quality = { current: "high", set: vi.fn(), cfg: () => ({ pixelRatio: 1 }) };
  w.QR = { render: vi.fn() };
  w.confirm = vi.fn(() => true);
  // wireHotspotCard probes for a built APK; without this the pill just stays hidden.
  w.fetch = vi.fn(async () => ({ ok: false, status: 404 }));
  if (!navigator.vibrate) Object.defineProperty(navigator, "vibrate", { value: vi.fn(), configurable: true });
}

/** Fresh module instance + mounted DOM. Seed localStorage before calling. */
async function mountMenu(): Promise<{ menu: Menu; handlers: ReturnType<typeof makeHandlers>; host: HTMLElement }> {
  vi.resetModules();
  const menu = (await import("../src/client/menu")) as Menu;
  const host = document.createElement("div");
  host.id = menu.MENU_HOST_ID;
  document.body.appendChild(host);
  const handlers = makeHandlers();
  menu.mountScreens(host, handlers as any);
  return { menu, handlers, host };
}

const activeScreenIds = () =>
  Array.from(document.querySelectorAll<HTMLElement>(".sc-screen.is-active")).map((el) => el.dataset.screen);

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  document.body.innerHTML = "";
  document.body.className = "";
  location.hash = "";
  installGlobals();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------

describe("profile persistence", () => {
  it("starts from the default loadout and an empty name", async () => {
    const { menu } = await mountMenu();

    expect(menu.getProfile().name).toBe("");
    expect(menu.getCosmetics()).toEqual(DEFAULT_LOADOUT);
  });

  it("round-trips through localStorage as a v2 record plus legacy mirrors", async () => {
    const { menu } = await mountMenu();

    menu.saveProfile({ name: "Maverick", cosmetics: { color: 3, bodyShape: 2, accent: 1, trail: 4, livery: 1 } });

    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY)!);
    expect(stored.v).toBe(2);
    expect(stored.name).toBe("Maverick");
    // The wire and the v2 record call the primary colour "skin".
    expect(stored.cosmetics).toEqual({ skin: 3, bodyShape: 2, accent: 1, trail: 4, livery: 1 });
    // Legacy mirrors keep older builds working.
    expect(localStorage.getItem(NAME_KEY)).toBe("Maverick");
    expect(localStorage.getItem(LEGACY_LOADOUT_KEYS.color)).toBe("3");
    expect(localStorage.getItem(LEGACY_LOADOUT_KEYS.bodyShape)).toBe("2");

    const reloaded = await mountMenu();
    expect(reloaded.menu.getProfile().name).toBe("Maverick");
    expect(reloaded.menu.getCosmetics()).toMatchObject({ color: 3, bodyShape: 2, accent: 1, trail: 4, livery: 1 });
  });

  it("clamps out-of-range and non-numeric cosmetic indices back to the defaults", async () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
      v: 2,
      name: "Ghost",
      cosmetics: { skin: 999, bodyShape: -1, accent: "two", trail: null, livery: 1.5 },
    }));

    const { menu } = await mountMenu();
    const c = menu.getCosmetics();

    expect(c.color).toBeGreaterThanOrEqual(0);
    expect(c.color).toBeLessThan(PAINT_OPTIONS.length);
    expect(c.bodyShape).toBeGreaterThanOrEqual(0);
    expect(c.bodyShape).toBeLessThan(AIRFRAME_OPTIONS.length);
    // 1.5 truncates to a valid index rather than being rejected outright.
    expect(Number.isInteger(c.livery)).toBe(true);
  });

  it("truncates an over-long pilot name to 14 characters", async () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ v: 2, name: "A".repeat(40) }));

    const { menu } = await mountMenu();

    expect(menu.getProfile().name).toHaveLength(14);
  });

  it("migrates a legacy loadout store when no v2 cosmetics exist", async () => {
    localStorage.setItem(LOADOUT_STORAGE_KEY, JSON.stringify({
      active: { color: 2, bodyShape: 1, accent: 3, trail: 2, livery: 0 },
      presets: [],
    }));

    const { menu } = await mountMenu();

    expect(menu.getCosmetics()).toMatchObject({ color: 2, bodyShape: 1, accent: 3, trail: 2, livery: 0 });
  });

  it("falls back to the legacy flat keys when there is no loadout store", async () => {
    localStorage.setItem(LEGACY_LOADOUT_KEYS.color, "4");
    localStorage.setItem(LEGACY_LOADOUT_KEYS.bodyShape, "3");

    const { menu } = await mountMenu();

    expect(menu.getCosmetics().color).toBe(4);
    expect(menu.getCosmetics().bodyShape).toBe(3);
  });

  it("recovers from corrupt stored JSON instead of throwing", async () => {
    localStorage.setItem(PROFILE_KEY, "{not json at all");

    const { menu } = await mountMenu();

    expect(menu.getProfile().name).toBe("");
    expect(menu.getCosmetics()).toEqual(DEFAULT_LOADOUT);
  });

  it("reads the pilot name from the legacy key when the v2 record has none", async () => {
    localStorage.setItem(NAME_KEY, "LegacyPilot");

    const { menu } = await mountMenu();

    expect(menu.getPilotName()).toBe("LegacyPilot");
  });
});

// ---------------------------------------------------------------------------

describe("screen router", () => {
  it("mounts every screen and opens on home", async () => {
    const { menu } = await mountMenu();

    const ids = Array.from(document.querySelectorAll<HTMLElement>(".sc-screen")).map((el) => el.dataset.screen);
    expect(ids).toEqual(expect.arrayContaining(["home", "join", "hangar", "settings", "lobby"]));
    expect(menu.currentScreenId()).toBe("home");
    expect(activeScreenIds()).toContain("home");
    expect(document.body.classList.contains("sc-menu-open")).toBe(true);
  });

  it("activates the destination on showScreen", async () => {
    const { menu } = await mountMenu();

    menu.showScreen("settings");
    vi.advanceTimersByTime(400); // let the outgoing transition finish

    expect(menu.currentScreenId()).toBe("settings");
    expect(activeScreenIds()).toEqual(["settings"]);
  });

  it("pops the stack on navBack and stops at home", async () => {
    const { menu } = await mountMenu();

    menu.showScreen("settings");
    menu.showScreen("hangar");
    vi.advanceTimersByTime(400);
    expect(menu.currentScreenId()).toBe("hangar");

    menu.navBack();
    vi.advanceTimersByTime(400);
    expect(menu.currentScreenId()).toBe("settings");

    menu.navBack();
    vi.advanceTimersByTime(400);
    expect(menu.currentScreenId()).toBe("home");

    // Already at the root: further backs are a no-op, never an empty stack.
    menu.navBack();
    expect(menu.currentScreenId()).toBe("home");
  });

  it("goes back immediately, before the outgoing transition has finished", async () => {
    const { menu } = await mountMenu();

    menu.showScreen("settings");
    // No timer advance: home still carries is-active while it animates away.
    menu.navBack();
    vi.advanceTimersByTime(400);

    expect(menu.currentScreenId()).toBe("home");
    expect(activeScreenIds()).toEqual(["home"]);
  });

  it("does not re-enter a screen that is already on display", async () => {
    const { menu } = await mountMenu();

    menu.showScreen("settings");
    vi.advanceTimersByTime(400);
    menu.showScreen("settings"); // repeat taps on the same nav control
    menu.showScreen("settings");
    vi.advanceTimersByTime(400);

    expect(menu.currentScreenId()).toBe("settings");
    menu.navBack();
    vi.advanceTimersByTime(400);
    expect(menu.currentScreenId()).toBe("home");
  });

  it("collapses any depth back to home on resetToHome", async () => {
    const { menu } = await mountMenu();

    menu.showScreen("settings");
    menu.showScreen("hangar");
    menu.showScreen("join");
    vi.advanceTimersByTime(400);

    menu.resetToHome();
    vi.advanceTimersByTime(400);

    expect(menu.currentScreenId()).toBe("home");
    expect(activeScreenIds()).toEqual(["home"]);
    // The stack is truly reset, not just visually — one back does nothing.
    menu.navBack();
    expect(menu.currentScreenId()).toBe("home");
  });

  it("deep-links from the location hash with home seeded underneath", async () => {
    location.hash = "#hangar";
    const { menu } = await mountMenu();

    menu.applyInitialHash();
    vi.advanceTimersByTime(400);
    expect(menu.currentScreenId()).toBe("hangar");

    // Back must land on home rather than an empty stack.
    menu.navBack();
    vi.advanceTimersByTime(400);
    expect(menu.currentScreenId()).toBe("home");
  });

  it("ignores hashes that are not navigable screens", async () => {
    location.hash = "#lobby"; // real screen, but not a valid deep-link target
    const { menu } = await mountMenu();
    menu.applyInitialHash();
    expect(menu.currentScreenId()).toBe("home");

    location.hash = "#nonsense";
    menu.applyInitialHash();
    expect(menu.currentScreenId()).toBe("home");
  });

  it("navigates from data-nav-go clicks and routes __create__ to the handler", async () => {
    const { menu, handlers } = await mountMenu();

    const toHangar = document.querySelector<HTMLElement>('[data-nav-go="hangar"]');
    expect(toHangar, "expected a hangar nav control in the home markup").toBeTruthy();
    toHangar!.click();
    vi.advanceTimersByTime(400);
    expect(menu.currentScreenId()).toBe("hangar");

    menu.resetToHome();
    vi.advanceTimersByTime(400);

    const create = document.querySelector<HTMLElement>('[data-nav-go="__create__"]');
    expect(create, "expected a create control in the home markup").toBeTruthy();
    create!.click();
    expect(handlers.onCreate).toHaveBeenCalledTimes(1);
    // __create__ is a handler hop, not a screen change.
    expect(menu.currentScreenId()).toBe("home");
  });

  it("walks back out of a screen entered by a nav-back control", async () => {
    const { menu } = await mountMenu();

    menu.showScreen("settings");
    vi.advanceTimersByTime(400);

    const back = document
      .querySelector<HTMLElement>('[data-screen="settings"] [data-nav-back]');
    expect(back, "expected a back control on the settings screen").toBeTruthy();
    back!.click();
    vi.advanceTimersByTime(400);

    expect(menu.currentScreenId()).toBe("home");
  });
});

// ---------------------------------------------------------------------------

describe("lobby controls", () => {
  it("fires ready, start and leave through the handler bundle", async () => {
    const { handlers } = await mountMenu();

    document.getElementById("sc-lobby-ready")!.click();
    document.getElementById("sc-lobby-play")!.click();
    document.getElementById("sc-lobby-leave")!.click();

    expect(handlers.onLobbyReady).toHaveBeenCalledTimes(1);
    expect(handlers.onLobbyStart).toHaveBeenCalledTimes(1);
    expect(handlers.onLobbyLeave).toHaveBeenCalledTimes(1);
  });

  it("debounces room-name edits into a single settings update", async () => {
    const { handlers } = await mountMenu();
    const input = document.getElementById("sc-lobby-room-name-edit") as HTMLInputElement;

    input.value = "A";
    input.dispatchEvent(new Event("input"));
    input.value = "Ar";
    input.dispatchEvent(new Event("input"));
    input.value = "Arena";
    input.dispatchEvent(new Event("input"));

    expect(handlers.onLobbySettings).not.toHaveBeenCalled(); // still inside the debounce
    vi.advanceTimersByTime(400);

    expect(handlers.onLobbySettings).toHaveBeenCalledTimes(1);
    expect(handlers.onLobbySettings).toHaveBeenCalledWith({ roomName: "Arena" });
  });

  it("sends round length and bot toggle changes", async () => {
    const { handlers } = await mountMenu();

    const round = document.getElementById("sc-lobby-round") as HTMLSelectElement;
    round.value = String(round.options[round.options.length - 1].value);
    round.dispatchEvent(new Event("change"));

    const bots = document.getElementById("sc-lobby-bots") as HTMLInputElement;
    bots.checked = false;
    bots.dispatchEvent(new Event("change"));

    expect(handlers.onLobbySettings).toHaveBeenCalledWith({ roundLength: Number(round.value) });
    expect(handlers.onLobbySettings).toHaveBeenCalledWith({ botsInRoom: false });
  });

  it("sends a difficulty change and marks the chosen button", async () => {
    const { handlers } = await mountMenu();
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("#sc-lobby-difficulty button"));
    expect(buttons.length).toBeGreaterThan(1);

    const target = buttons[buttons.length - 1];
    target.click();

    expect(handlers.onLobbySettings).toHaveBeenCalledWith({ botDifficulty: target.dataset.diff });
    expect(target.classList.contains("is-on")).toBe(true);
    expect(buttons.filter((b) => b.classList.contains("is-on"))).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------

describe("busy and status chrome", () => {
  it("reflects setBusy and setStatus into the home screen", async () => {
    const { menu } = await mountMenu();

    menu.setStatus("Connecting…");
    expect(document.body.textContent).toContain("Connecting…");

    expect(() => { menu.setBusy(true); menu.setBusy(false); }).not.toThrow();
  });
});
