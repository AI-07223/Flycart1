import http from "http";
import path from "path";
import express from "express";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { ArenaRoom } from "./rooms/ArenaRoom";

const PORT = Number(process.env.PORT) || 2567;

const app = express();
app.use(express.json());

// Serve the static client.
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// Lightweight health check for the VPS / load balancer.
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Colyseus dev dashboard (handy while building; lock down in prod).
app.use("/colyseus", monitor());

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
