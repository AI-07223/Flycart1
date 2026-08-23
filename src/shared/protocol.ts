// FROZEN CONTRACT — SmashCart local-only wire protocol.
// JSON text frames over a single raw WebSocket to the room server.
// Both src/server/RoomHost.ts and src/client/net-ws.ts compile against this.
// Changing anything here requires updating both sides in the same commit.

import type { SimStateSnapshot, SimEvent } from "../sim/types";

// ---------------------------------------------------------------------------
// Shared payloads
// ---------------------------------------------------------------------------

export interface Cosmetics {
  skin: number;
  bodyShape: number;
  accent: number;
  trail: number;
  livery: number;
}

export interface InputMsg {
  seq: number;
  turn: number;
  climb: number;
  boost: boolean;
  fire: boolean;
}

export interface HostSettings {
  roundLength?: number;
  roomName?: string;
  botsInRoom?: boolean;
  botDifficulty?: "easy" | "medium" | "high";
}

/** Lobby roster row — derived from SimPlayer, no separate sync path. */
export interface RosterEntry {
  id: string;
  name: string;
  bot: boolean;
  ready: boolean;
  cosmetics: Cosmetics;
}

// ---------------------------------------------------------------------------
// Client → Server
// ---------------------------------------------------------------------------

export type C2SMessage =
  | { type: "join"; name: string; cosmetics: Cosmetics }
  | { type: "input"; input: InputMsg }
  | { type: "ready" }
  | { type: "host-start" }
  | { type: "host-kick"; targetId: string }
  | { type: "host-settings"; settings: HostSettings }
  | { type: "ping"; t: number };

// ---------------------------------------------------------------------------
// Server → Client
// ---------------------------------------------------------------------------

/**
 * Sent once after a valid "join": confirms session and gives the client
 * everything the lobby screen needs before the first 30 Hz state frame.
 * `leaderId` is the room creator (the only player who can start / kick /
 * change settings). If the leader leaves, the server promotes the next
 * human and re-broadcasts state — clients re-read leaderId from snapshots.
 */
export interface WelcomeMsg {
  type: "welcome";
  sessionId: string;
  leaderId: string;
  room: {
    name: string;
    roundLength: number;
    botsInRoom: boolean;
    botDifficulty: string;
  };
}

/** 30 Hz authoritative snapshot — same shape the P2P guest path already consumed. */
export interface StateMsg {
  type: "state";
  snap: SimStateSnapshot;
}

/** Sim events plus adapter-level room events. */
export type ServerEvent = SimEvent | { type: "roster-change" } | { type: "kicked" };

export interface EventMsg {
  type: "event";
  event: ServerEvent;
}

export interface PongMsg {
  type: "pong";
  t: number;
}

export interface ErrorMsg {
  type: "error";
  code: "room-full" | "bad-message" | "rate-limited" | "not-leader" | "already-started";
  message: string;
}

export type S2CMessage = WelcomeMsg | StateMsg | EventMsg | PongMsg | ErrorMsg;

// ---------------------------------------------------------------------------
// Snapshot cadence notes (implementation guidance, not wire data):
// - Server sends full SimStateSnapshot JSON at TICK_RATE (30 Hz). LAN wifi
//   absorbs this for ≤20 players. ponytail: full snapshots; delta-compress
//   only if a real playtest shows jank.
// - Client inputs at ~25 Hz; latest-input-wins on the server (GameSim.applyInput).
// - "ping"/"pong" is optional latency display; server must reply with same t.
// ---------------------------------------------------------------------------
