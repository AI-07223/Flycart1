import http from "http";
import path from "path";
import express from "express";
import { WebSocketServer } from "ws";
import { Bonjour } from "bonjour-service";
import { RoomHost } from "./server/RoomHost";
import { log } from "./logger";

const PORT = Number(process.env.PORT) || 2567;

const app = express();

// Lightweight security headers (defense-in-depth; no extra dependency).
// X-Frame-Options blocks foreign embeds/clickjacking; nosniff + no-referrer are cheap hardening.
app.use((_req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// Serve the static client.
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// Lightweight health check for the LAN host machine / reverse proxies.
app.get("/healthz", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);

// One room per process — the server IS the room. All game sockets share /ws.
const roomHost = new RoomHost();
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws, req) => roomHost.attach(ws, req));

server.listen(PORT, () => {
  log("info", "server started", { port: PORT });
});

// mDNS advertisement so guests see the room when browsing the LAN. Failure is
// non-fatal — players can always type the printed URL directly.
let bonjour: Bonjour | null = null;
try {
  bonjour = new Bonjour();
  bonjour.publish({ name: "SmashCart", type: "http", port: PORT, txt: { game: "smashcart" } });
} catch (e) {
  bonjour = null;
  log("warn", "mdns publish failed", { error: (e as Error).message });
}

let shuttingDown = false;
function shutdown(): void {
  if (shuttingDown) return;
  shuttingDown = true;
  roomHost.shutdown();
  try {
    if (bonjour) bonjour.unpublishAll(() => bonjour?.destroy());
  } catch {}
  server.close(() => process.exit(0));
  // Force exit if lingering sockets block close().
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
