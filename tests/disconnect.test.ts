// tests/disconnect.test.ts
// Disconnect behavior: mid-session drops remove the player and inform
// survivors; leader drops promote the earliest remaining human.

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import * as C from "../src/shared/constants";
import {
  joinClient,
  makeClient,
  makeRoom,
  teardownRoom,
  tickOnce,
  eventCount,
  lastMsg,
  snapOf,
} from "./helpers";
import type { FakeSocket } from "./helpers";
import type { RoomHost } from "../src/server/RoomHost";

describe("disconnects", () => {
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

  it("mid-session close removes the player and notifies survivors", () => {
    const c1 = joinClient(rh!, "Alpha");
    const c2 = joinClient(rh!, "Bravo");

    // Both joins produced roster-change broadcasts.
    const baseline = eventCount(c1, "roster-change");
    expect(baseline).toBe(2);

    c2.emitClose();
    tickOnce(rh!);

    const snap = snapOf(c1)!;
    const ids = snap.players.map(([id]) => id);
    expect(ids).not.toContain(session(c2));
    expect(ids).toContain(session(c1));
    expect(eventCount(c1, "roster-change")).toBe(baseline + 1);
  });

  it("leader close promotes the earliest remaining human to hostId", () => {
    const c1 = joinClient(rh!, "Leader");
    const c2 = joinClient(rh!, "Second");
    const c3 = joinClient(rh!, "Third");

    tickOnce(rh!); // land a state frame so the pre-close hostId is readable
    expect(session(c1)).toBe(snapOf(c1)!.hostId);

    const rostersC2 = eventCount(c2, "roster-change");
    c1.emitClose();
    tickOnce(rh!);

    const snapForC2 = snapOf(c2)!;
    expect(snapForC2.hostId).toBe(session(c2));
    const ids = snapForC2.players.map(([id]) => id);
    expect(ids).not.toContain(session(c1));
    expect(ids).toContain(session(c3));
    expect(eventCount(c2, "roster-change")).toBe(rostersC2 + 1);

    // Authority actually moved: the promoted host can start the match.
    c2.message({ type: "host-start" });
    tickOnce(rh!);
    expect(snapOf(c2)!.phase).toBe("playing");
    expect(snapOf(c3)!.phase).toBe("playing");
  });

  it("drops a silent peer and resets the room once nobody is left", () => {
    const a = joinClient(rh!, "Host");
    a.message({ type: "host-settings", settings: { roomName: "Stale", roundLength: 300 } });
    a.message({ type: "host-start" });
    tickOnce(rh!);
    expect(rh!.roomInfo().phase).toBe("playing");
    expect(rh!.roomInfo().name).toBe("Stale");

    // No frames, no protocol pongs — a phone that left the Wi-Fi.
    vi.advanceTimersByTime(15_000);

    expect(a.closed).toBe(true);
    expect(a.pings).toBeGreaterThan(0);
    expect(rh!.roomInfo().humans).toBe(0);
    expect(rh!.roomInfo().phase).toBe("lobby");
    expect(rh!.roomInfo().name).toBe("SmashCart");

    const next = joinClient(rh!, "Next");
    tickOnce(rh!);
    expect(snapOf(next)!.phase).toBe("lobby");
    expect(snapOf(next)!.roomName).toBe("");
    expect(lastMsg(next, "welcome")!.room.roundLength).toBe(C.ROUND_SECONDS);
  });

  it("keeps a peer that answers pings and drops only the silent one", () => {
    const host = joinClient(rh!, "Host");
    const guest = joinClient(rh!, "Guest");
    host.autoPong = true;
    host.message({ type: "host-start" });
    tickOnce(rh!);

    vi.advanceTimersByTime(20_000);

    expect(host.closed).toBe(false);
    expect(host.pings).toBeGreaterThan(0);
    expect(guest.closed).toBe(true);
    expect(rh!.roomInfo().humans).toBe(1);
    expect(rh!.roomInfo().phase).toBe("playing");

    tickOnce(rh!);
    const ids = snapOf(host)!.players.map(([id]) => id);
    expect(ids).toContain(session(host));
    expect(ids).not.toContain(session(guest));
  });

  it("treats inbound messages as liveness when pongs never arrive", () => {
    const a = joinClient(rh!, "Host");
    a.message({ type: "host-start" });
    tickOnce(rh!);

    vi.advanceTimersByTime(10_000);
    expect(a.closed).toBe(false);
    a.message({ type: "input", input: { seq: 1, turn: 0, climb: 0, boost: true, fire: true } });

    vi.advanceTimersByTime(10_000);
    expect(a.closed).toBe(false);
    expect(rh!.roomInfo().humans).toBe(1);

    // One more silent window past the timeout, with margin for tick alignment.
    vi.advanceTimersByTime(6_000);
    expect(a.closed).toBe(true);
    expect(rh!.roomInfo().humans).toBe(0);
    expect(rh!.roomInfo().phase).toBe("lobby");
  });

  it("pre-join socket close is a no-op for joined players", () => {
    const c1 = joinClient(rh!, "Alpha");
    const ghost = makeClient(rh!); // attached but never joined

    const baseline = eventCount(c1, "roster-change");
    ghost.emitClose();
    tickOnce(rh!);

    expect(eventCount(c1, "roster-change")).toBe(baseline);
    expect(snapOf(c1)).not.toBeNull();
    expect(snapOf(c1)!.players.map(([id]) => id)).toEqual([session(c1)]);
  });
});
