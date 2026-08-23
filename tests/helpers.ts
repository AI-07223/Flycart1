// tests/helpers.ts
// Shared test utilities for SmashCart server tests.

import type { IncomingMessage } from "node:http";
import type { WebSocket as WsWebSocket } from "ws";
import { vi } from "vitest";
import * as S from "../src/shared/sphere";
import * as C from "../src/shared/constants";
import { RoomHost } from "../src/server/RoomHost";
import type { SimStateSnapshot } from "../src/sim/types";

/** Epsilon for floating-point comparisons */
export const EPS = 1e-9;

/** Assert two numbers are approximately equal */
export function assertClose(actual: number, expected: number, eps = EPS) {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(`Expected ${expected}, got ${actual} (diff: ${Math.abs(actual - expected)})`);
  }
}

/** Assert two Vec3 are approximately equal */
export function assertVecClose(actual: S.Vec3, expected: S.Vec3, eps = EPS) {
  assertClose(actual.x, expected.x, eps);
  assertClose(actual.y, expected.y, eps);
  assertClose(actual.z, expected.z, eps);
}

/** Assert Vec3 has unit length */
export function assertUnit(v: S.Vec3, eps = EPS) {
  assertClose(S.len(v), 1, eps);
}

/** Deterministic RNG for reproducible tests */
export function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export { S, C };

// ---------------------------------------------------------------------------
// RoomHost test harness
// ---------------------------------------------------------------------------

/** Minimal stand-in for a `ws` WebSocket as consumed by RoomHost.attach(). */
export class FakeSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = FakeSocket.OPEN;
  sent: string[] = [];
  closed = false;
  closeCode: number | undefined;

  private handlers = new Map<string, Array<(...args: unknown[]) => void>>();

  get OPEN(): number { return FakeSocket.OPEN; }

  send(data: unknown): void {
    if (this.readyState !== FakeSocket.OPEN) throw new Error("send on non-open socket");
    this.sent.push(String(data));
  }

  close(code?: number): void {
    if (this.closed) return;
    this.closed = true;
    this.closeCode = code;
    this.readyState = FakeSocket.CLOSED;
  }

  on(event: string, cb: (...args: unknown[]) => void): void {
    const arr = this.handlers.get(event) ?? [];
    arr.push(cb);
    this.handlers.set(event, arr);
  }

  /** Server-side trigger: deliver a text frame (objects are JSON-encoded). */
  message(payload: unknown): void {
    const data = typeof payload === "string"
      ? Buffer.from(payload, "utf8")
      : Buffer.from(JSON.stringify(payload), "utf8");
    this.raw(data);
  }

  /** Server-side trigger: deliver raw bytes (for malformed-frame tests). */
  raw(data: Buffer): void {
    for (const cb of [...(this.handlers.get("message") ?? [])]) cb(data);
  }

  /** No-op: RoomHost registers handlers inside attach(); nothing to fire. */
  open(): void {}

  /** Client-side trigger: simulate the transport dropping the connection. */
  emitClose(): void {
    this.readyState = FakeSocket.CLOSED;
    for (const cb of [...(this.handlers.get("close") ?? [])]) cb();
  }
}

/** Attach a fresh FakeSocket to the host. */
export function makeClient(rh: RoomHost): FakeSocket {
  const sock = new FakeSocket();
  rh.attach(sock as unknown as WsWebSocket, {} as IncomingMessage);
  return sock;
}

/** Attach and complete the join handshake in one step. */
export function joinClient(rh: RoomHost, name?: string, cosmetics?: Record<string, unknown>): FakeSocket {
  const sock = makeClient(rh);
  sock.message({ type: "join", name: name ?? `Pilot${sock.sent.length}`, cosmetics: cosmetics ?? {} });
  return sock;
}

/** All messages a socket has received, parsed. */
export function msgs(sock: FakeSocket): Array<Record<string, any>> {
  return sock.sent.map((s) => JSON.parse(s));
}

/** Latest message of a given type, or null. */
export function lastMsg(sock: FakeSocket, type: string): Record<string, any> | null {
  const found = msgs(sock).filter((m) => m.type === type);
  return found.length ? found[found.length - 1] : null;
}

/** Count of event broadcasts with the given sim/room event type. */
export function eventCount(sock: FakeSocket, eventType: string): number {
  return msgs(sock).filter((m) => m.type === "event" && m.event?.type === eventType).length;
}

/** Latest authoritative snapshot received by this socket, or null. */
export function snapOf(sock: FakeSocket): SimStateSnapshot | null {
  const state = lastMsg(sock, "state");
  return state ? (state.snap as SimStateSnapshot) : null;
}

/**
 * Fresh RoomHost under fake timers + one tick driver. The constructor's
 * setInterval(TICK_MS) never fires until advanced, so tests stay deterministic.
 */
export function makeRoom(): RoomHost {
  vi.useFakeTimers();
  return new RoomHost();
}

/** Advance exactly one server tick; the pending state broadcast lands in sockets. */
export function tickOnce(rh: RoomHost): void {
  vi.advanceTimersByTime(C.TICK_MS);
}

/** Tear down fake timers + host between tests. */
export function teardownRoom(rh: RoomHost | null): void {
  rh?.shutdown();
  vi.useRealTimers();
}
