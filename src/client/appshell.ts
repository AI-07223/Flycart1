// App-shell helpers: fullscreen, orientation lock, wake lock, SW registration,
// install prompt. No import side effects; menu agent calls these explicitly.

let deferredInstallPrompt: any = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });
}

export function requestAppFullscreen(): boolean {
  let ok = false;
  try {
    const el = document.documentElement as any;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
      ok = true;
    }
  } catch {
    // unsupported or denied — fall through
  }
  try {
    const so: any = (screen as any).orientation;
    if (so && so.lock) {
      so.lock("landscape").catch(() => {});
      ok = true;
    }
  } catch {
    // unsupported — ignore
  }
  return ok;
}

export function exitAppFullscreen(): void {
  try {
    const so: any = (screen as any).orientation;
    if (so && so.unlock) so.unlock();
  } catch {
    // ignore
  }
  try {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch {
    // ignore
  }
}

let wakeLockSentinel: any = null;
let wakeLockWanted = false;

async function acquireWakeLock(): Promise<void> {
  try {
    const wl: any = (navigator as any).wakeLock;
    if (!wl) return;
    wakeLockSentinel = await wl.request("screen");
    wakeLockSentinel.addEventListener?.("release", () => {
      wakeLockSentinel = null;
    });
  } catch {
    wakeLockSentinel = null;
  }
}

export function keepAwake(): void {
  wakeLockWanted = true;
  void acquireWakeLock();
}

export function releaseAwake(): void {
  wakeLockWanted = false;
  try {
    wakeLockSentinel?.release?.();
  } catch {
    // ignore
  }
  wakeLockSentinel = null;
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && wakeLockWanted && !wakeLockSentinel) {
      void acquireWakeLock();
    }
  });
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (!("serviceWorker" in navigator)) return null;
    if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
      return null; // SW requires secure context (or localhost)
    }
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export function isStandalone(): boolean {
  try {
    const standaloneMQ = window.matchMedia?.("(display-mode: standalone)")?.matches;
    return Boolean(standaloneMQ || (navigator as any).standalone);
  } catch {
    return false;
  }
}

export function canInstall(): boolean {
  return deferredInstallPrompt != null;
}

export async function promptInstall(): Promise<boolean> {
  const evt = deferredInstallPrompt;
  if (!evt) return false;
  deferredInstallPrompt = null;
  try {
    await evt.prompt();
    return evt.userChoice?.outcome === "accepted";
  } catch {
    return false;
  }
}
