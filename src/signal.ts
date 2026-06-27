/**
 * src/signal.ts
 *
 * Stateless WebRTC signaling broker for SmashCart local-play.
 *
 * Reachable at ws://<host>/signal — same origin as the game server.
 * Only the ~2 KB SDP/ICE handshake flows through here; gameplay is peer-to-peer.
 *
 * Coexistence with Colyseus
 * ─────────────────────────
 * Colyseus's WebSocketTransport registers a server-level 'upgrade' listener via
 * `ws` when it receives `{ server }`. That listener unconditionally calls
 * wss.handleUpgrade() for every incoming upgrade, regardless of path.
 *
 * To route cleanly, createSignalServer() must be called AFTER gameServer.define()
 * (i.e. after Colyseus has registered its listener). It then:
 *   1. Snapshots all current 'upgrade' listeners (which includes Colyseus's).
 *   2. Removes all of them from the http.Server.
 *   3. Installs a single routing listener that:
 *      - For /signal paths  → delegates to signalWss.handleUpgrade()
 *      - For everything else → calls each original listener in order
 *        (restoring Colyseus's exact behaviour, including for /colyseus paths).
 *
 * This avoids the "handleUpgrade called twice on the same socket" error that
 * would occur if both listeners ran for /signal sockets.
 */

import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { log } from "./logger";

// ─── Limits ──────────────────────────────────────────────────────────────────

const MAX_MSG_BYTES = 16 * 1024;   // 16 KB — SDP is typically < 4 KB
const MAX_ROOMS = 500;
const MAX_GUESTS_PER_ROOM = 8;
const ROOM_TTL_MS = 30_000;        // prune rooms idle for 30 s

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoomState {
  host: WebSocket | null;
  guests: Map<string, WebSocket>;  // peerId → socket
  lastActivity: number;
  /** True while we are mid-migration: host slot is vacant but room is not pruned yet. */
  migrating?: boolean;
}

// ─── In-memory state ─────────────────────────────────────────────────────────

const rooms = new Map<string, RoomState>();

function touchRoom(room: RoomState): void {
  room.lastActivity = Date.now();
}

function getOrCreateRoom(code: string): RoomState | null {
  if (rooms.has(code)) return rooms.get(code)!;
  if (rooms.size >= MAX_ROOMS) return null;
  const r: RoomState = { host: null, guests: new Map(), lastActivity: Date.now() };
  rooms.set(code, r);
  return r;
}

function deleteRoom(code: string): void {
  rooms.delete(code);
  log("info", "signal room pruned", { room: code });
}

/** Prune rooms that have been idle beyond ROOM_TTL_MS. */
function pruneRooms(): void {
  const now = Date.now();
  for (const [code, r] of rooms) {
    if (now - r.lastActivity > ROOM_TTL_MS) {
      r.host?.close(1001, "room expired");
      for (const ws of r.guests.values()) ws.close(1001, "room expired");
      deleteRoom(code);
    }
  }
}

// ─── Message handling ────────────────────────────────────────────────────────

function send(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function handleMessage(ws: WebSocket, rawData: Buffer | string): void {
  const data = typeof rawData === "string" ? rawData : rawData.toString("utf8");
  if (Buffer.byteLength(data) > MAX_MSG_BYTES) {
    ws.close(1009, "message too large");
    return;
  }

  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(data);
  } catch {
    return; // drop malformed JSON silently
  }

  const { type, room: roomCode } = msg;
  if (typeof type !== "string" || typeof roomCode !== "string") return;

  const r = getOrCreateRoom(roomCode);
  if (!r) {
    send(ws, { type: "error", reason: "room limit reached" });
    return;
  }
  touchRoom(r);

  switch (type) {
    case "host": {
      // Register this socket as the host of the room.
      if (r.host && r.host.readyState === WebSocket.OPEN) {
        // Already has a live host — reject.
        send(ws, { type: "error", reason: "room already has a host" });
        return;
      }
      const wasMigrating = !!r.migrating;
      r.host = ws;
      r.migrating = false;
      (ws as any)._signalRole = "host";
      (ws as any)._signalRoom = roomCode;
      // Include current peer list so the new host can proactively offer to everyone.
      const peers = [...r.guests.keys()];
      send(ws, { type: "hosted", room: roomCode, peers });
      if (wasMigrating) {
        // Notify all guests that a new host has arrived.
        for (const [, g] of r.guests) {
          send(g, { type: "host-arrived", room: roomCode });
        }
        log("info", "signal host arrived (migration complete)", { room: roomCode });
      } else {
        log("info", "signal host registered", { room: roomCode });
      }
      break;
    }

    case "join": {
      // Register this socket as a guest and notify the host.
      const peerId = String(msg.peerId || "");
      if (!peerId) return;
      if (r.guests.size >= MAX_GUESTS_PER_ROOM) {
        send(ws, { type: "error", reason: "room full" });
        return;
      }
      r.guests.set(peerId, ws);
      (ws as any)._signalRole = peerId;
      (ws as any)._signalRoom = roomCode;
      send(ws, { type: "joined", room: roomCode, peerId });
      if (r.host && r.host.readyState === WebSocket.OPEN) {
        send(r.host, { type: "peer-joined", peerId, room: roomCode });
      }
      log("info", "signal guest joined", { room: roomCode, peerId });
      break;
    }

    case "offer":
    case "answer": {
      // Relay SDP offer/answer to the named peer (host or a peerId).
      const to = String(msg.to || "");
      const sdp = msg.sdp;
      if (!to || sdp === undefined) return;
      const target = to === "host" ? r.host : (r.guests.get(to) ?? null);
      if (target && target.readyState === WebSocket.OPEN) {
        const from = (ws as any)._signalRole ?? "unknown";
        send(target, { type, room: roomCode, from, sdp });
      }
      break;
    }

    case "ice": {
      // Relay ICE candidate to the named peer.
      const to = String(msg.to || "");
      const candidate = msg.candidate;
      if (!to || candidate === undefined) return;
      const target = to === "host" ? r.host : (r.guests.get(to) ?? null);
      if (target && target.readyState === WebSocket.OPEN) {
        const from = (ws as any)._signalRole ?? "unknown";
        send(target, { type: "ice", room: roomCode, from, candidate });
      }
      break;
    }

    default:
      // Unknown message type — drop silently.
      break;
  }
}

/**
 * Run host-election from the current guest list.
 * Returns the elected peerId (lowest sorted) or null if no guests remain.
 */
function electNextHost(r: RoomState): string | null {
  if (r.guests.size === 0) return null;
  const sorted = [...r.guests.keys()].sort();
  return sorted[0];
}

/** Clean up when a socket closes, removing it from whichever room it was in. */
function handleClose(ws: WebSocket): void {
  const roomCode: string | undefined = (ws as any)._signalRoom;
  const role: string | undefined = (ws as any)._signalRole;
  if (!roomCode || !role) return;

  const r = rooms.get(roomCode);
  if (!r) return;

  if (role === "host") {
    r.host = null;
    const nextHost = electNextHost(r);
    if (nextHost) {
      // Begin broker-side migration: keep room alive, tell everyone who the new host will be.
      r.migrating = true;
      for (const [, g] of r.guests) {
        send(g, { type: "host-migrating", room: roomCode, nextHost });
      }
      log("info", "signal host migrating", { room: roomCode, nextHost });
    } else {
      // No guests — room is truly over.
      deleteRoom(roomCode);
    }
  } else {
    // A guest socket closed.
    r.guests.delete(role);

    if (r.migrating) {
      // Re-run election from remaining guests in case the elected guest also dropped.
      const nextHost = electNextHost(r);
      if (nextHost) {
        for (const [, g] of r.guests) {
          send(g, { type: "host-migrating", room: roomCode, nextHost });
        }
        log("info", "signal re-elected during migration", { room: roomCode, nextHost });
      } else {
        // Nobody left — end match.
        deleteRoom(roomCode);
        return;
      }
    } else {
      // Normal guest leave — notify current host.
      if (r.host && r.host.readyState === WebSocket.OPEN) {
        send(r.host, { type: "peer-left", peerId: role, room: roomCode });
      }
    }
  }

  // If room is now empty, prune it immediately.
  if (!r.host && r.guests.size === 0) {
    deleteRoom(roomCode);
  } else {
    touchRoom(r);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates the signal WebSocketServer and splices it into the http.Server's
 * upgrade chain AFTER Colyseus has already registered its own upgrade listener.
 *
 * Safe coexistence guarantee: only one listener ever calls handleUpgrade()
 * per socket. /signal sockets go to signalWss; all others go to the original
 * Colyseus listener chain unchanged.
 */
export function createSignalServer(server: http.Server): void {
  const signalWss = new WebSocketServer({ noServer: true });

  signalWss.on("connection", (ws) => {
    ws.on("message", (data) => {
      handleMessage(ws, data as Buffer | string);
    });
    ws.on("close", () => handleClose(ws));
    ws.on("error", (err) => {
      log("warn", "signal ws error", { error: (err as Error).message });
    });
  });

  // --- Upgrade routing ---
  //
  // Snapshot the current set of 'upgrade' listeners (Colyseus registered its
  // own when `new WebSocketTransport({ server })` was called). Then replace
  // all of them with a single routing listener so no socket is ever passed to
  // two handlers.

  const existingListeners = server.listeners("upgrade") as (
    (req: http.IncomingMessage, socket: any, head: Buffer) => void
  )[];

  server.removeAllListeners("upgrade");

  server.on(
    "upgrade",
    (req: http.IncomingMessage, socket: any, head: Buffer) => {
      const url = req.url ?? "";
      const pathname = url.split("?")[0];

      if (pathname === "/signal") {
        // Signal path — this WSS owns the socket.
        signalWss.handleUpgrade(req, socket, head, (ws) => {
          signalWss.emit("connection", ws, req);
        });
      } else {
        // Everything else (Colyseus game rooms, /colyseus monitor, etc.) —
        // call the original listeners in their original order.
        for (const listener of existingListeners) {
          listener.call(server, req, socket, head);
        }
      }
    }
  );

  // Prune stale rooms every 30 s.
  const pruneTimer = setInterval(pruneRooms, ROOM_TTL_MS);
  pruneTimer.unref(); // don't keep process alive for this alone

  log("info", "signal server ready", { path: "/signal" });
}
