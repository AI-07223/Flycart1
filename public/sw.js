// SmashCart service worker — cache-first precache shell.
// The CACHE name below is GENERATED: scripts/build-client.mjs hashes the shipped
// bundles, index.html, the manifest and the CSS, and rewrites this line on every
// build. Do not hand-edit it — a stale name serves the previous client forever.
const CACHE = "smashcart-3f164e1cd6f4";

// Exactly what index.html loads plus the audio files fetched at runtime.
// net-ws.js is intentionally NOT precached: net-ws.ts is bundled into
// js/main.js by build-client.mjs and never loaded as its own script.
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/css/style.css",
  "/css/arcade-menu.css",
  "/js/main.js",
  "/js/constants.js",
  "/js/sphere.js",
  "/js/input.js",
  "/js/render3d.js",
  "/js/audio.js",
  "/js/assets.js",
  "/js/quality.js",
  "/js/qr.js",
  "/vendor/three.core.min.js",
  "/vendor/three.module.min.js",
  "/assets/audio/engine.wav",
  "/assets/audio/explosion.wav",
  "/assets/audio/fire.wav",
  "/assets/audio/hit.wav",
  "/assets/audio/kill.wav",
  "/assets/audio/music.wav",
  "/assets/audio/ui.wav",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    // allSettled-style: one missing/404 asset must not kill the whole install.
    const results = await Promise.allSettled(
      PRECACHE.map((url) => caches.open(CACHE).then((c) => c.add(url)))
    );
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length) {
      console.warn("[sw] precache partial:", failed.length, "of", PRECACHE.length, "failed");
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Never touch non-GET, cross-origin, or anything that isn't plain http(s) fetch
  // (WebSocket handshakes come through as requests with different types).
  if (req.method !== "GET") return;
  try {
    if (new URL(req.url).origin !== self.location.origin) return;
  } catch {
    return;
  }
  if (!req.url.startsWith("http")) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;

    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      // Navigation fallback to cached app shell.
      if (req.mode === "navigate") {
        const shell = await cache.match("/");
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
