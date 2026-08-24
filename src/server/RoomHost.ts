// src/server/RoomHost.ts
// Local-only plain-WebSocket room host. The server IS the room: one GameSim
// instance driven by a fixed-tick interval, snapshots broadcast to every open
// socket at TICK_RATE. All gameplay authority lives in GameSim — this class is
// transport glue (join handshake, validation, rate limiting, leader checks,
// event fan-out), ported from the former Colyseus ArenaRoom adapter.

import crypto from "crypto";
import type { IncomingMessage } from "http";
import type { RawData, WebSocket } from "ws";
import * as C from "../shared/constants";
import type {
  Cosmetics,
  ErrorMsg,
  S2CMessage,
  WelcomeMsg,
} from "../shared/protocol";
import { log } from "../logger";
import { GameSim } from "../sim/GameSim";
import type { JoinOpts, SimEvent } from "../sim/types";

const FIXED_DT = 1 / C.TICK_RATE;
const JOIN_TIMEOUT_MS = 5000;
const MAX_FRAME_BYTES = 4096;
const BAD_MESSAGE_LIMIT = 5;

interface Conn {
  id: string;
  ws: WebSocket;
  /** False until a valid "join" arrives; pre-join sockets get 5s. */
  joined: boolean;
  strikes: number;
  joinTimer: NodeJS.Timeout | null;
}

// ---------------------------------------------------------------------------
// Helpers — ported verbatim from ArenaRoom (transport-level validation)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateCosmetic(val: unknown, max: number): number {
  return (typeof val === "number" && Number.isFinite(val) && Number.isInteger(val) && val >= 0 && val < max)
    ? val
    : Math.floor(Math.random() * max);
}

function normalizeName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const next = value.trim().slice(0, 14);
  return next || fallback;
}

export class RoomHost {
  private sim: GameSim;
  private readonly conns = new Map<string, Conn>();
  private readonly msgTimes = new Map<string, number[]>();
  private readonly tickInterval: NodeJS.Timeout;

  constructor() {
    this.sim = this.freshSim();
    this.tickInterval = setInterval(() => this.tick(), C.TICK_MS);
  }

  /** Local room behaves like the old private room: lobby phase, host controls
   *  enabled, bots maintained by the sim once the match starts. */
  private freshSim(): GameSim {
    return new GameSim({
      botsEnabled: true,
      isPublic: false,
      onEvent: (e) => this.handleSimEvent(e),
    });
  }

  /** True while at least one joined human is connected. */
  private hasHumans(): boolean {
    for (const conn of this.conns.values()) if (conn.joined) return true;
    return false;
  }

  // -------------------------------------------------------------------------
  // Connection lifecycle
  // -------------------------------------------------------------------------

  attach(ws: WebSocket, _req: IncomingMessage): void {
    const conn: Conn = {
      id: crypto.randomUUID(),
      ws,
      joined: false,
      strikes: 0,
      joinTimer: null,
    };
    this.conns.set(conn.id, conn);

    conn.joinTimer = setTimeout(() => {
      if (!conn.joined) {
        this.sendTo(conn, this.error("bad-message", "join timeout"));
        ws.close();
      }
    }, JOIN_TIMEOUT_MS);

    ws.on("message", (data: RawData) => this.onMessage(conn, data));
    ws.on("close", () => this.handleClose(conn));
    ws.on("error", () => {
      /* close event follows; nothing to do here */
    });
  }

  shutdown(): void {
    clearInterval(this.tickInterval);
    for (const conn of this.conns.values()) {
      if (conn.joinTimer) clearTimeout(conn.joinTimer);
      try {
        conn.ws.close(1001, "server shutting down");
      } catch {}
    }
    this.conns.clear();
    this.msgTimes.clear();
  }

  roomInfo(): { name: string; count: number; humans: number; phase: string } {
    let humans = 0;
    for (const conn of this.conns.values()) if (conn.joined) humans++;
    return {
      name: this.sim.roomName || "SmashCart",
      count: this.sim.players.size,
      humans,
      phase: this.sim.phase,
    };
  }

  // -------------------------------------------------------------------------
  // Inbound messages
  // -------------------------------------------------------------------------

  private onMessage(conn: Conn, data: RawData): void {
    // RawData is Buffer | ArrayBuffer | Buffer[] — normalize for the size check.
    const buf = Buffer.isBuffer(data)
      ? data
      : Array.isArray(data)
        ? Buffer.concat(data)
        : Buffer.from(new Uint8Array(data));
    if (buf.length > MAX_FRAME_BYTES) {
      this.badMessage(conn);
      return;
    }

    let msg: unknown;
    try {
      msg = JSON.parse(buf.toString("utf8"));
    } catch {
      this.badMessage(conn);
      return;
    }
    if (!isRecord(msg)) {
      this.badMessage(conn);
      return;
    }

    if (!conn.joined) {
      if ((msg as { type?: string }).type === "join") {
        if (conn.joinTimer) clearTimeout(conn.joinTimer);
        this.handleJoin(conn, msg as Record<string, unknown>);
      } else {
        this.badMessage(conn);
      }
      return;
    }

    switch (msg.type) {
      case "input":
        if (this.rateOk(conn.id, "input", C.INPUT_RATE_MAX)) {
          this.sim.applyInput(conn.id, msg.input);
        }
        break;
      case "ready":
        if (this.rateOk(conn.id, "ready", C.READY_RATE_MAX)) {
          this.sim.setReady(conn.id);
          this.broadcastRosterChange();
        }
        break;
      case "host-start":
        if (!this.rateOk(conn.id, "host", C.HOST_MSG_RATE_MAX)) break;
        if (this.sim.hostId !== conn.id) {
          this.sendTo(conn, this.error("not-leader", "only the leader can start"));
          break;
        }
        this.sim.hostStart(conn.id);
        break;
      case "host-kick":
        this.handleKick(conn, msg.targetId);
        break;
      case "host-settings":
        this.handleSettings(conn, msg.settings);
        break;
      case "ping":
        this.sendTo(conn, { type: "pong", t: typeof msg.t === "number" ? msg.t : 0 });
        break;
      default:
        this.badMessage(conn);
        break;
    }
  }

  private handleJoin(conn: Conn, msg: Record<string, unknown>): void {
    // Cap counts humans only — bots are sim-managed padding.
    let humans = 0;
    for (const other of this.conns.values()) if (other.joined) humans++;
    if (humans >= C.MAX_CLIENTS) {
      this.sendTo(conn, this.error("room-full", "room is full"));
      conn.ws.close();
      this.conns.delete(conn.id);
      return;
    }

    const cosmetics = (msg.cosmetics ?? {}) as Partial<Cosmetics>;
    const opts: JoinOpts = {
      name: normalizeName(msg.name, "Pilot"),
      skin: validateCosmetic(cosmetics.skin, C.COLOR_COUNT),
      bodyShape: validateCosmetic(cosmetics.bodyShape, C.BODY_SHAPE_COUNT),
      accent: validateCosmetic(cosmetics.accent, C.ACCENT_COUNT),
      trail: validateCosmetic(cosmetics.trail, C.TRAIL_COUNT),
      livery: validateCosmetic(cosmetics.livery, C.LIVERY_COUNT),
    };

    this.sim.addPlayer(conn.id, opts);
    conn.joined = true;

    const welcome: WelcomeMsg = {
      type: "welcome",
      sessionId: conn.id,
      leaderId: this.sim.hostId,
      room: {
        name: this.sim.roomName,
        roundLength: this.sim.roundLength,
        botsInRoom: this.sim.botsInRoom,
        botDifficulty: this.sim.botDifficulty,
      },
    };
    this.sendTo(conn, welcome);
    this.broadcastRosterChange();
  }

  private handleKick(conn: Conn, targetId: unknown): void {
    if (!this.rateOk(conn.id, "kick", C.HOST_KICK_RATE_MAX)) return;
    if (this.sim.hostId !== conn.id) {
      this.sendTo(conn, this.error("not-leader", "only the leader can kick"));
      return;
    }
    if (typeof targetId !== "string") return;
    const kicked = this.sim.hostKick(conn.id, targetId);
    if (!kicked) return;
    const target = this.conns.get(kicked);
    if (target) {
      this.sendTo(target, { type: "event", event: { type: "kicked" } });
      target.ws.close();
      // handleClose sees the player already removed from the sim and skips
      // the second removePlayer/roster broadcast.
    }
    this.broadcastRosterChange();
  }

  private handleSettings(conn: Conn, data: unknown): void {
    if (!this.rateOk(conn.id, "host", C.HOST_MSG_RATE_MAX)) return;
    if (this.sim.hostId !== conn.id) {
      this.sendTo(conn, this.error("not-leader", "only the leader can change settings"));
      return;
    }
    if (!isRecord(data)) return;
    // Never forward `mode` — FFA is the only mode on the local server.
    this.sim.setHostSettings(conn.id, {
      roundLength: typeof data.roundLength === "number" ? data.roundLength : undefined,
      roomName: typeof data.roomName === "string" ? data.roomName : undefined,
      botsInRoom: typeof data.botsInRoom === "boolean" ? data.botsInRoom : undefined,
      botDifficulty: typeof data.botDifficulty === "string" ? data.botDifficulty : undefined,
    });
    this.broadcastRosterChange();
  }

  private handleClose(conn: Conn): void {
    if (conn.joinTimer) clearTimeout(conn.joinTimer);
    this.conns.delete(conn.id);
    this.msgTimes.delete(conn.id);
    // Kicked targets were already removed from the sim by hostKick.
    if (!conn.joined || !this.sim.players.has(conn.id)) return;
    // No reconnection window: the frozen wire protocol has no resume message,
    // so a dropped socket leaves the match immediately (deliberate simplification).
    this.sim.removePlayer(conn.id);

    // Last human out closes the room: rebuild the sim so the next joiner gets a
    // fresh lobby with default settings. Without this the room was immortal —
    // phase stayed "playing", bots kept fighting an empty arena, and every later
    // PLAY landed mid-way through a stale match instead of in a lobby.
    // Rebuilding via the constructor IS the reset; a reset() method would have to
    // mirror every sim field forever.
    if (!this.hasHumans()) {
      this.sim = this.freshSim();
      log("info", "room reset", { reason: "last human left" });
      return; // nobody left to notify
    }
    this.broadcastRosterChange();
  }

  // -------------------------------------------------------------------------
  // Tick loop + event fan-out
  // -------------------------------------------------------------------------

  private tick(): void {
    try {
      this.sim.tick(FIXED_DT);
    } catch (e) {
      // Bare intervals crash the process on throw — log and keep serving.
      // (ArenaRoom could rethrow because Colyseus caught per-room.)
      log("error", "update loop error", { error: (e as Error).message });
      return;
    }
    const state: S2CMessage = { type: "state", snap: this.sim.snapshot() };
    this.broadcast(state);
  }

  /**
   * Sim events arrive from inside sim.tick(). Round-end sequencing (intermission
   * countdown, score clear, auto-restart) is handled entirely inside GameSim's
   * updateTimer — the adapter only fans events out. Leaderboard recording was
   * dropped along with the /leaderboard endpoint (local-only server).
   */
  private handleSimEvent(e: SimEvent): void {
    this.broadcast({ type: "event", event: e });
  }

  // -------------------------------------------------------------------------
  // Send helpers + rate limiting (sliding window per message type, ported
  // from ArenaRoom; bucketed by type so e.g. a host-start never eats the
  // input budget — the *_RATE_MAX constants are per-category limits)
  // -------------------------------------------------------------------------

  private rateOk(id: string, bucket: string, max: number): boolean {
    const key = `${id}:${bucket}`;
    const now = Date.now();
    let arr = this.msgTimes.get(key);
    if (!arr) { arr = []; this.msgTimes.set(key, arr); }
    while (arr.length && now - arr[0] > 1000) arr.shift();
    if (arr.length >= max) return false;
    arr.push(now);
    return true;
  }

  private badMessage(conn: Conn): void {
    conn.strikes += 1;
    if (conn.strikes >= BAD_MESSAGE_LIMIT) {
      conn.ws.close();
      return;
    }
    this.sendTo(conn, this.error("bad-message", "malformed message"));
  }

  private error(code: ErrorMsg["code"], message: string): ErrorMsg {
    return { type: "error", code, message };
  }

  private sendTo(conn: Conn, msg: object): void {
    try {
      conn.ws.send(JSON.stringify(msg));
    } catch {
      /* broken socket — close handler cleans up */
    }
  }

  private broadcast(msg: object): void {
    const payload = JSON.stringify(msg);
    for (const conn of this.conns.values()) {
      if (conn.ws.readyState !== conn.ws.OPEN) continue;
      try {
        conn.ws.send(payload);
      } catch {
        /* broken socket — close handler cleans up */
      }
    }
  }

  private broadcastRosterChange(): void {
    this.broadcast({ type: "event", event: { type: "roster-change" } });
  }
}
