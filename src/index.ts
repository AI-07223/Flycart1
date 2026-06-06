import http from "http";
import path from "path";
import express from "express";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import crypto from "crypto";
import { ArenaRoom } from "./rooms/ArenaRoom";
import * as leaderboard from "./leaderboard";

const PORT = Number(process.env.PORT) || 2567;
leaderboard.init();

const app = express();
app.use(express.json({ limit: "16kb" }));

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

// Lightweight health check for the VPS / load balancer.
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Read-only global leaderboard (top-N by best round score). Writes happen only inside the
// room at round end from authoritative state — there is intentionally no write endpoint.
let lbCache: { t: number; data: { name: string; score: number }[] } | null = null;
app.get("/leaderboard", (req, res) => {
  const now = Date.now();
  if (!lbCache || now - lbCache.t > 2000) lbCache = { t: now, data: leaderboard.top(50) }; // brief cache vs refresh spam
  const n = Math.max(1, Math.min(50, Number(req.query.n) || 10));
  res.json(lbCache.data.slice(0, n));
});

// Colyseus monitor dashboard — protected with HTTP Basic Auth.
// Credentials come from env (MONITOR_USER / MONITOR_PASS). If no password is
// configured the dashboard is disabled outright rather than left open.
const MONITOR_USER = process.env.MONITOR_USER || "admin";
const MONITOR_PASS = process.env.MONITOR_PASS || "";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function monitorAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!MONITOR_PASS) return res.status(404).end(); // disabled when unconfigured
  const [scheme, encoded] = (req.headers.authorization || "").split(" ");
  if (scheme === "Basic" && encoded) {
    const [user, pass] = Buffer.from(encoded, "base64").toString().split(":");
    if (safeEqual(user || "", MONITOR_USER) && safeEqual(pass || "", MONITOR_PASS)) {
      return next();
    }
  }
  res.set("WWW-Authenticate", 'Basic realm="SmashCart Monitor"');
  return res.status(401).end();
}

app.use("/colyseus", monitorAuth, monitor());

const server = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
});

// One room type. `filterBy(['code'])` groups joinOrCreate() requests by room
// code: Quick Play uses code "PUBLIC", private rooms use a share code.
gameServer.define("arena", ArenaRoom).filterBy(["code"]);

server.listen(PORT, () => {
  console.log(`🛩  SmashCart server listening on http://localhost:${PORT}`);
});
