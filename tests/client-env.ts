// tests/client-env.ts
// Browser-shaped globals for the client suites.
//
// src/client/*.ts is written against a browser: the modules publish themselves on
// `window` (window.GAME, window.Sphere, ...) and read those globals lazily inside
// methods. None of net-ws.ts touches the DOM, so it runs in the plain node
// environment once these few globals exist — no jsdom required. The menu suite
// opts into jsdom per-file; this module is written to work under both.
//
// Import this BEFORE any src/client module. ESM evaluates imports in source order,
// and the top-level await below finishes before the importer's other imports run.

const g = globalThis as any;

if (!g.window) g.window = g;
if (!g.location) {
  g.location = { protocol: "http:", host: "localhost:2567", href: "http://localhost:2567/" };
}

// Time is controlled by vitest's fake timers, which fake performance.now() too
// when the suite opts in:
//
//   vi.useFakeTimers({ toFake: [..., "performance"] })
//
// so setTimeout watchdogs and the transport's performance.now() timestamps share
// one clock. Nothing to stub here.

// ---------------------------------------------------------------------------
// FakeWebSocket — a `ws`-shaped socket the test drives from the server side
// ---------------------------------------------------------------------------

export class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  /** Every socket constructed since the last resetSockets(), newest last. */
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readyState: number = FakeWebSocket.CONNECTING;
  /** Raw frames the client sent, in order. */
  sent: string[] = [];
  closeCalls = 0;

  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    if (this.readyState !== FakeWebSocket.OPEN) throw new Error("send on non-open socket");
    this.sent.push(String(data));
  }

  close(): void {
    this.closeCalls++;
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
  }

  // ── test-side triggers ────────────────────────────────────────────────────

  /** Transport-side open: flips readyState and fires onopen (the join frame). */
  serverOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  /** Deliver a frame from the server. Objects are JSON-encoded. */
  serverSend(payload: unknown): void {
    const data = typeof payload === "string" ? payload : JSON.stringify(payload);
    this.onmessage?.({ data });
  }

  /** Drop the connection from the server side. */
  serverClose(): void {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }

  /** Parsed view of everything the client has sent. */
  get frames(): Array<Record<string, any>> {
    return this.sent.map((s) => JSON.parse(s));
  }

  /** Latest sent frame of a given type, or null. */
  lastFrame(type: string): Record<string, any> | null {
    const found = this.frames.filter((f) => f.type === type);
    return found.length ? found[found.length - 1] : null;
  }
}

g.WebSocket = FakeWebSocket;

/** Drop every recorded socket. Call in beforeEach. */
export function resetSockets(): void {
  FakeWebSocket.instances = [];
}

/** The socket the transport most recently constructed. */
export function latestSocket(): FakeWebSocket {
  const s = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  if (!s) throw new Error("no socket was constructed");
  return s;
}

// Populate window.Sphere and window.GAME by loading the real client shims.
// Dynamic imports so the assignments above land first.
await import("../src/client/sphere");
await import("../src/client/constants");
