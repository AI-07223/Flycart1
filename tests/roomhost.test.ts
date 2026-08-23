// tests/roomhost.test.ts
// RoomHost protocol behavior: join validation, welcome, leader actions,
// rate limiting, and malformed-payload hardening. Deterministic via fake
// timers (the tick interval only advances when a test drives it).

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import * as C from "../src/shared/constants";
import {
  FakeSocket,
  makeClient,
  joinClient,
  makeRoom,
  teardownRoom,
  tickOnce,
  msgs,
  lastMsg,
  eventCount,
  snapOf,
} from "./helpers";

import type { RoomHost } from "../src/server/RoomHost";

describe("RoomHost", () => {
  let rh: RoomHost | null = null;

  beforeEach(() => {
    rh = makeRoom();
  });

  afterEach(() => {
    teardownRoom(rh);
    rh = null;
  });

  function session(sock: FakeSocket): string {
    const w = lastMsg(sock, "welcome");
    if (!w) throw new Error("no welcome received");
    return w.sessionId as string;
  }

  function startMatch(leader: FakeSocket): void {
    leader.message({ type: "host-start" });
    tickOnce(rh!);
    expect(snapOf(leader)?.phase).toBe("playing");
  }

  it("sanitizes join names and randomizes invalid cosmetics", () => {
    const c = joinClient(rh!, "                ", {
      skin: -5,
      bodyShape: 99,
      accent: 1.5,
      trail: "x",
      livery: -1,
    });
    expect(lastMsg(c, "welcome")).toBeTruthy();

    const long = joinClient(rh!, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");

    tickOnce(rh!);
    const p = snapOf(c)!.players.find(([id]) => id === session(c))![1];
    expect(p.name).toBe("Pilot");
    expect(p.skin).toBeGreaterThanOrEqual(0);
    expect(p.skin).toBeLessThan(C.COLOR_COUNT);
    expect(p.bodyShape).toBeGreaterThanOrEqual(0);
    expect(p.bodyShape).toBeLessThan(C.BODY_SHAPE_COUNT);
    expect(p.accent).toBeGreaterThanOrEqual(0);
    expect(p.accent).toBeLessThan(C.ACCENT_COUNT);
    expect(p.trail).toBeGreaterThanOrEqual(0);
    expect(p.trail).toBeLessThan(C.TRAIL_COUNT);
    expect(p.livery).toBeGreaterThanOrEqual(0);
    expect(p.livery).toBeLessThan(C.LIVERY_COUNT);

    const plong = snapOf(long)!.players.find(([id]) => id === session(long))![1];
    expect(plong.name).toHaveLength(14);
    expect(plong.name).toBe("ABCDEFGHIJKLMNOP".slice(0, 14));
  });

  it("sends a correct welcome: sessionId, leaderId = first joiner, room meta", () => {
    const c1 = joinClient(rh!, "Alpha");
    const c2 = joinClient(rh!, "Bravo");

    const w1 = lastMsg(c1, "welcome")!;
    const w2 = lastMsg(c2, "welcome")!;
    expect(typeof w1.sessionId).toBe("string");
    expect(w1.leaderId).toBe(w1.sessionId);
    expect(w2.leaderId).toBe(w1.sessionId);
    expect(w2.sessionId).not.toBe(w1.sessionId);

    expect(w1.room).toEqual({
      name: "",
      roundLength: C.ROUND_SECONDS,
      botsInRoom: true,
      botDifficulty: C.DEFAULT_BOT_DIFFICULTY,
    });
  });

  it("drops oversized and malformed frames without crashing", () => {
    const c = joinClient(rh!, "Probe");
    const before = c.sent.length;

    // >4KB frame — rejected on size before parse.
    c.raw(Buffer.alloc(5000, 0x7b));
    expect(lastMsg(c, "error")).toMatchObject({ code: "bad-message" });
    expect(c.closed).toBe(false);

    // Unparseable JSON.
    c.raw(Buffer.from("{definitely not json"));
    expect(lastMsg(c, "error")).toMatchObject({ code: "bad-message" });

    // Valid JSON but not an object.
    c.message([1, 2, 3]);
    expect(lastMsg(c, "error")).toMatchObject({ code: "bad-message" });

    // Unknown message type after join.
    c.message({ type: "bogus", x: 1 });
    expect(lastMsg(c, "error")).toMatchObject({ code: "bad-message" });

    // Still connected and serving: ping works.
    c.message({ type: "ping", t: 42 });
    expect(lastMsg(c, "pong")).toEqual({ type: "pong", t: 42 });
    expect(c.closed).toBe(false);
    expect(c.sent.length).toBeGreaterThan(before);

    // Non-join traffic before joining is rejected but the socket survives;
    // a later valid join still succeeds.
    const late = makeClient(rh!);
    late.message({ type: "input", input: { seq: 1, turn: 0, climb: 0, boost: false, fire: false } });
    expect(lastMsg(late, "error")).toMatchObject({ code: "bad-message" });
    late.message({ type: "join", name: "LateJoiner", cosmetics: {} });
    expect(lastMsg(late, "welcome")).toBeTruthy();
  });

  it("closes pre-join sockets after the join timeout", () => {
    const sock = makeClient(rh!);
    vi.advanceTimersByTime(5000);
    expect(lastMsg(sock, "error")).toMatchObject({ code: "bad-message", message: "join timeout" });
    expect(sock.closed).toBe(true);
  });

  it("rejects joins beyond MAX_CLIENTS humans with room-full", () => {
    const clients: FakeSocket[] = [];
    for (let i = 0; i < C.MAX_CLIENTS; i++) clients.push(joinClient(rh!, `P${i}`));

    const overflow = joinClient(rh!, "Overflow");
    expect(lastMsg(overflow, "error")).toMatchObject({ code: "room-full" });
    expect(overflow.closed).toBe(true);

    tickOnce(rh!);
    const snap = snapOf(clients[0]);
    expect(snap!.players.filter(([, p]) => !p.bot)).toHaveLength(C.MAX_CLIENTS);
  });

  it("reflects ready toggles in snapshots", () => {
    const c = joinClient(rh!, "Solo");

    c.message({ type: "ready" });
    tickOnce(rh!);
    let me = snapOf(c)!.players.find(([id]) => id === session(c))![1];
    expect(me.ready).toBe(true);
    expect(eventCount(c, "roster-change")).toBeGreaterThan(0);

    c.message({ type: "ready" });
    tickOnce(rh!);
    me = snapOf(c)!.players.find(([id]) => id === session(c))![1];
    expect(me.ready).toBe(false);
    // Single human never auto-starts.
    expect(snapOf(c)!.phase).toBe("lobby");
  });

  it("rejects host-start from non-leaders and lets the leader start", () => {
    const c1 = joinClient(rh!, "Leader");
    const c2 = joinClient(rh!, "Other");

    c2.message({ type: "host-start" });
    expect(lastMsg(c2, "error")).toMatchObject({ code: "not-leader" });
    tickOnce(rh!);
    expect(snapOf(c1)!.phase).toBe("lobby");

    c1.message({ type: "host-start" });
    tickOnce(rh!);
    expect(snapOf(c1)!.phase).toBe("playing");
    expect(snapOf(c2)!.phase).toBe("playing");
  });

  it("kicks the target, notifies them, and removes them from the room", () => {
    const c1 = joinClient(rh!, "Leader");
    const c2 = joinClient(rh!, "Victim");
    const c3 = joinClient(rh!, "Bystander");

    // Non-leader kick attempt is refused.
    c2.message({ type: "host-kick", targetId: session(c3) });
    expect(lastMsg(c2, "error")).toMatchObject({ code: "not-leader" });
    expect(c3.closed).toBe(false);

    const rostersBefore = eventCount(c1, "roster-change");
    c1.message({ type: "host-kick", targetId: session(c2) });

    expect(lastMsg(c2, "event")).toMatchObject({ event: { type: "kicked" } });
    expect(c2.closed).toBe(true);

    tickOnce(rh!);
    const ids = snapOf(c1)!.players.map(([id]) => id);
    expect(ids).not.toContain(session(c2));
    expect(ids).toContain(session(c1));
    expect(eventCount(c1, "roster-change")).toBe(rostersBefore + 1);

    // The kicked connection's close handler must NOT emit a second
    // roster-change (player was already removed by hostKick).
    c2.emitClose();
    expect(eventCount(c1, "roster-change")).toBe(rostersBefore + 1);
  });

  it("applies leader settings with clamping; bots-off sticks", () => {
    const c1 = joinClient(rh!, "Leader");
    const c2 = joinClient(rh!, "Other");

    c2.message({ type: "host-settings", settings: { roomName: "Hax" } });
    expect(lastMsg(c2, "error")).toMatchObject({ code: "not-leader" });

    c1.message({
      type: "host-settings",
      settings: { roundLength: 9999, roomName: "  My Room!  " },
    });
    tickOnce(rh!);
    let snap = snapOf(c1)!;
    expect(snap.roundLength).toBe(300);
    expect(snap.roomName).toBe("My Room!");

    c1.message({ type: "host-settings", settings: { roundLength: 10, botsInRoom: false } });
    tickOnce(rh!);
    snap = snapOf(c1)!;
    expect(snap.roundLength).toBe(60);
    expect(snap.botsInRoom).toBe(false);

    // host-start shares the 2/s host-message budget with settings — slide
    // the window before starting, as a real client would.
    vi.advanceTimersByTime(1001);

    // Bots must stay absent once the match starts with bots disabled.
    startMatch(c1);
    tickOnce(rh!);
    tickOnce(rh!);
    snap = snapOf(c1)!;
    expect(snap.players.some(([, p]) => p.bot)).toBe(false);
    expect(snap.botDifficulty).toBe(C.DEFAULT_BOT_DIFFICULTY);
  });

  it("rate-limits inputs without crashing and recovers after the window slides", () => {
    const c = joinClient(rh!, "Flyer");
    startMatch(c);
    const sid = session(c);

    for (let seq = 1; seq <= C.INPUT_RATE_MAX; seq++) {
      c.message({ type: "input", input: { seq, turn: 0, climb: 0, boost: false, fire: false } });
    }
    // Excess frame inside the same window is dropped silently.
    c.message({ type: "input", input: { seq: C.INPUT_RATE_MAX + 1, turn: 0, climb: 0, boost: false, fire: false } });
    expect(c.closed).toBe(false);

    tickOnce(rh!);
    expect(snapOf(c)!.players.find(([id]) => id === sid)![1].seq).toBe(C.INPUT_RATE_MAX);

    // Window slides; fresh input applies.
    vi.advanceTimersByTime(1001);
    c.message({ type: "input", input: { seq: C.INPUT_RATE_MAX + 2, turn: 1, climb: 0, boost: false, fire: false } });
    tickOnce(rh!);
    expect(snapOf(c)!.players.find(([id]) => id === sid)![1].seq).toBe(C.INPUT_RATE_MAX + 2);
  });

  it("keeps valid fields of partially malformed input patches", () => {
    const c = joinClient(rh!, "Flyer");
    startMatch(c);
    const sid = session(c);

    c.message({ type: "input", input: { seq: "bad", turn: 0.75, climb: "bad", boost: true, fire: false } });
    tickOnce(rh!);
    let me = snapOf(c)!.players.find(([id]) => id === sid)![1];
    expect(me.seq).toBe(0);
    expect(me.turn).toBeCloseTo(0.75, 5);
    expect(me.climb).toBe(0);
    expect(me.boosting).toBe(true);

    c.message({ type: "input", input: { seq: 1, turn: 1, climb: 1, boost: true, fire: false } });
    tickOnce(rh!);
    me = snapOf(c)!.players.find(([id]) => id === sid)![1];
    expect(me.seq).toBeGreaterThanOrEqual(1);
    expect(me.turn).toBeGreaterThan(0.9);
    expect(me.climb).toBeGreaterThan(0.9);
    expect(me.boosting).toBe(true);
  });

  it("malformed floods from one client do not affect other connections", () => {
    const c1 = joinClient(rh!, "Healthy");
    const c2 = joinClient(rh!, "Noisy");

    // Four strikes: errors, still connected.
    for (let i = 0; i < 4; i++) c2.raw(Buffer.from("garbage"));
    expect(msgs(c2).filter((m) => m.type === "error")).toHaveLength(4);
    expect(c2.closed).toBe(false);

    // Healthy client unaffected: state flows, ping works.
    tickOnce(rh!);
    expect(snapOf(c1)).not.toBeNull();
    c1.message({ type: "ping", t: 7 });
    expect(lastMsg(c1, "pong")).toEqual({ type: "pong", t: 7 });

    // Fifth strike closes only the offender.
    c2.raw(Buffer.from("garbage"));
    expect(c2.closed).toBe(true);

    const statesBefore = c1.sent.length;
    tickOnce(rh!);
    expect(c1.sent.length).toBe(statesBefore + 1);
    expect(JSON.parse(c1.sent[c1.sent.length - 1]).type).toBe("state");
  });

  it("echoes ping t values verbatim", () => {
    const c = joinClient(rh!, "Pinger");
    c.message({ type: "ping", t: 123.45 });
    expect(lastMsg(c, "pong")).toEqual({ type: "pong", t: 123.45 });

    c.message({ type: "ping", t: "junk" });
    expect(lastMsg(c, "pong")).toEqual({ type: "pong", t: 0 });
  });
});

