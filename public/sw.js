// SmashCart service worker — cache-first precache shell.
// BUMP "smashcart-v1" whenever any bundle in public/js/ or precached assets change.
const CACHE = "smashcart-v1";

const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/css/style.css",
  "/css/arcade-menu.css",
  "/js/main.js",
  "/js/constants.js",
  "/js/sphere.js",
  "/js/net.js",
  "/js/input.js",
  "/js/render3d.js",
  "/js/audio.js",
  "/js/assets.js",
  "/js/quality.js",
  "/js/qr.js",
  "/vendor/three.core.min.js",
  "/vendor/three.module.min.js",
  "/vendor/colyseus.js",
  "/vendor/jsqr.min.js",
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
