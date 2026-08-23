// tests/net-ws.test.ts
// The client half of the wire contract: handshake, message routing, input
// coalescing, prediction/reconciliation, and snapshot interpolation.
//
// Runs in the default node environment — net-ws.ts touches no DOM, only
// WebSocket / location / performance / window.GAME / window.Sphere, all of which
// tests/client-env.ts provides. tests/roomhost.test.ts covers the server half.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeWebSocket, latestSocket, resetSockets } from "./client-env";
import { WsTransport } from "../src/client/net-ws";
import * as C from "../src/shared/constants";

// Mirrors of the module-private constants in net-ws.ts. If those change, these
// assertions should be updated deliberately — that is the point of stating them.
const INPUT_INTERVAL_MS = 1000 / 25;
const SNAP_DISTANCE = 140;
const MAX_EXTRAP_MS = 120;
const WELCOME_TIMEOUT_MS = 10000;

/** A wire player record, defaulted to a live plane at the origin facing +X. */
function player(over: Partial<Record<string, any>> = {}) {
  return {
    name: "P", px: 0, py: 100, pz: 0, fx: 1, fy: 0, fz: 0,
    hp: 100, score: 0, alive: true, bot: false, boosting: false,
    speed: C.CRUISE_SPEED, turn: 0, climb: 0, seq: 0,
    skin: 0, bodyShape: 0, accent: 0, trail: 0, livery: 0,
    team: -1, power: "", powerLeft: 0, frozenLeft: 0, empLeft: 0, ready: false,
    ...over,
  };
}

function snapshot(players: Array<[string, any]>, over: Record<string, any> = {}) {
  return {
    players,
    bullets: [] as Array<[string, any]>,
    pickups: [] as Array<[string, any]>,
    phase: "playing",
    timeLeft: 100,
    hostId: "me",
    roundLength: 150,
    roomName: "Room",
    botsInRoom: false,
    mode: "ffa",
    teamScore0: 0,
    teamScore1: 0,
    botDifficulty: "medium",
    ...over,
  };
}

const COSMETICS = { color: 1, bodyShape: 2, accent: 3, trail: 4, livery: 0 };

/** A spawn well clear of every LANDMARK footprint, so prediction tests measure
 *  flight and reconciliation rather than collision push-out. (100, 100, 0) is
 *  inside the central tower's radius + PLANE_RADIUS and gets shoved.) */
const CLEAR_AIR = { px: 100, py: 100, pz: 600 };

/** A transport that has completed the join handshake as session "me". */
async function connected(sessionId = "me") {
  const net = new WsTransport();
  const pending = net.connect("Pilot", "", COSMETICS);
  const sock = latestSocket();
  sock.serverOpen();
  sock.serverSend({ type: "welcome", sessionId, leaderId: sessionId, room: {} });
  await pending;
  return { net, sock };
}

// One clock for everything. Faking "performance" as well as the timers means the
// welcome watchdog (setTimeout) and the transport's own timestamps (performance.now,
// used for input coalescing and snapshot ordering) advance together.
const FAKE_TIMER_OPTS = {
  toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date", "performance"] as any,
};

/** performance.now() at the start of every test — see beforeEach. */
const T0 = 10_000;

const clock = {
  now: () => performance.now(),
  advance: (ms: number) => vi.advanceTimersByTime(ms),
  /** Jump to an absolute performance.now() value. */
  set: (ms: number) => vi.advanceTimersByTime(ms - performance.now()),
};

beforeEach(() => {
  vi.useFakeTimers(FAKE_TIMER_OPTS);
  resetSockets();
  // A real browser hands out a document-age performance.now(); starting at 0 would
  // make the very first sendInput look like it landed inside the coalescing window.
  vi.advanceTimersByTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------

describe("connect handshake", () => {
  it("opens ws:// against location.host and sends a join frame with skin-mapped cosmetics", async () => {
    const net = new WsTransport();
    const pending = net.connect("Maverick", "", COSMETICS);
    const sock = latestSocket();

    expect(sock.url).toBe("ws://localhost:2567/ws");
    expect(sock.sent).toHaveLength(0); // nothing before the socket opens

    sock.serverOpen();
    // The wire calls the primary colour "skin"; the client profile calls it "color".
    expect(sock.lastFrame("join")).toEqual({
      type: "join",
      name: "Maverick",
      cosmetics: { skin: 1, bodyShape: 2, accent: 3, trail: 4, livery: 0 },
    });

    sock.serverSend({
      type: "welcome",
      sessionId: "s7",
      leaderId: "s7",
      room: { name: "Hangar 5", roundLength: 90, botsInRoom: true, botDifficulty: "high" },
    });
    const welcome = await pending;

    expect(welcome.sessionId).toBe("s7");
    expect(net.sessionId).toBe("s7");
    expect(net.state).toMatchObject({
      hostId: "s7", roomName: "Hangar 5", roundLength: 90, botsInRoom: true, botDifficulty: "high",
    });
  });

  it("honours an explicit server origin and upgrades to wss on https", async () => {
    const g = globalThis as any;
    const prev = g.location;
    g.location = { protocol: "https:", host: "smashcart.example", href: "https://smashcart.example/" };
    try {
      const net = new WsTransport();
      void net.connect("P", "", COSMETICS, "192.168.1.50:2567");
      expect(latestSocket().url).toBe("wss://192.168.1.50:2567/ws");
    } finally {
      g.location = prev;
    }
  });

  it("falls back to protocol defaults when the room payload is absent", async () => {
    const { net } = await connected("s1");
    expect(net.state).toMatchObject({ roomName: "", roundLength: 150, botsInRoom: false, botDifficulty: "medium" });
  });

  it("rejects when the server answers with an error instead of a welcome", async () => {
    const net = new WsTransport();
    const pending = net.connect("P", "", COSMETICS);
    const sock = latestSocket();
    sock.serverOpen();
    sock.serverSend({ type: "error", code: "room-full", message: "Room is full" });

    await expect(pending).rejects.toThrow("Room is full");
  });

  it("rejects when the socket closes before the welcome arrives", async () => {
    const net = new WsTransport();
    const pending = net.connect("P", "", COSMETICS);
    const sock = latestSocket();
    sock.serverOpen();
    sock.serverClose();

    await expect(pending).rejects.toThrow("Connection closed before welcome");
  });

  it("rejects and closes the socket when the welcome never arrives", async () => {
    const net = new WsTransport();
    const pending = net.connect("P", "", COSMETICS);
    const sock = latestSocket();
    sock.serverOpen();

    vi.advanceTimersByTime(WELCOME_TIMEOUT_MS + 1);

    await expect(pending).rejects.toThrow("Join timed out");
    expect(sock.closeCalls).toBeGreaterThan(0);
  });

  it("leave() tears down state and suppresses the disconnect callback", async () => {
    const { net, sock } = await connected();
    let disconnects = 0;
    net.onDisconnect = () => { disconnects++; };

    net.leave();
    expect(net.state).toBeNull();
    expect(net.sessionId).toBeNull();
    expect(sock.closeCalls).toBeGreaterThan(0);

    sock.serverClose(); // a late close from the transport must stay silent
    expect(disconnects).toBe(0);
  });

  it("reports an unexpected close as a disconnect", async () => {
    const { net, sock } = await connected();
    const seen: any[] = [];
    net.onDisconnect = (info) => { seen.push(info); };

    sock.serverClose();

    expect(seen).toEqual([{ type: "closed", reason: "closed" }]);
  });
});

describe("message routing", () => {
  it("applies a state snapshot into the transport state", async () => {
    const { net, sock } = await connected();
    let changes = 0;
    net.onStateChange = () => { changes++; };

    sock.serverSend({
      type: "state",
      snap: snapshot([["me", player()], ["foe", player({ name: "Foe" })]], {
        phase: "intermission", timeLeft: 7, mode: "tdm", teamScore0: 3, teamScore1: 1, roomName: "Arena",
      }),
    });

    expect(net.state).toMatchObject({
      phase: "intermission", timeLeft: 7, mode: "tdm", teamScore0: 3, teamScore1: 1, roomName: "Arena",
    });
    expect(net.state!.players.size).toBe(2);
    expect(changes).toBe(1);
  });

  it("forwards kill events verbatim and remaps pickup events to the consumer shape", async () => {
    const { net, sock } = await connected();
    const kills: any[] = [];
    const pickups: any[] = [];
    net.onKill = (m) => { kills.push(m); };
    net.onPickup = (m) => { pickups.push(m); };

    sock.serverSend({ type: "event", event: { type: "kill", killer: "me", victim: "foe", killerName: "A", victimName: "B" } });
    sock.serverSend({ type: "event", event: { type: "pickup", by: "me", pickupType: "rapid" } });

    expect(kills).toEqual([{ type: "kill", killer: "me", victim: "foe", killerName: "A", victimName: "B" }]);
    // The wire says pickupType; main.ts reads .type.
    expect(pickups).toEqual([{ by: "me", type: "rapid" }]);
  });

  it("pokes the UI on roster-change without touching state", async () => {
    const { net, sock } = await connected();
    let changes = 0;
    net.onStateChange = () => { changes++; };

    sock.serverSend({ type: "event", event: { type: "roster-change" } });

    expect(changes).toBe(1);
  });

  it("treats a kick as a terminal disconnect and closes the socket", async () => {
    const { net, sock } = await connected();
    const seen: any[] = [];
    net.onDisconnect = (i) => { seen.push(i); };

    sock.serverSend({ type: "event", event: { type: "kicked" } });

    expect(seen).toEqual([{ type: "kicked", reason: "kicked" }]);
    expect(sock.closeCalls).toBeGreaterThan(0);

    // The close that follows must not fire a second disconnect.
    sock.serverClose();
    expect(seen).toHaveLength(1);
  });

  it("surfaces a post-welcome error as a disconnect rather than a rejection", async () => {
    const { net, sock } = await connected();
    const seen: any[] = [];
    net.onDisconnect = (i) => { seen.push(i); };

    sock.serverSend({ type: "error", code: "kicked", message: "Removed by host" });

    expect(seen).toEqual([{ type: "error", code: "kicked", message: "Removed by host" }]);
  });

  it("ignores malformed frames and unknown types without throwing", async () => {
    const { net, sock } = await connected();
    const before = JSON.stringify(net.state);

    expect(() => {
      sock.serverSend("this is not json");
      sock.serverSend("{unterminated");
      sock.serverSend({ type: "pong", t: 5 });
      sock.serverSend({ type: "totally-unknown" });
    }).not.toThrow();

    expect(JSON.stringify(net.state)).toBe(before);
  });
});

describe("input coalescing", () => {
  it("rate-limits to the input interval and numbers frames monotonically", async () => {
    const { net, sock } = await connected();

    net.sendInput(1, 0, false, false);
    expect(sock.lastFrame("input")).toMatchObject({ input: { seq: 1, turn: 1 } });

    // Inside the window: dropped, and the sequence does not advance.
    clock.advance(INPUT_INTERVAL_MS - 1);
    net.sendInput(-1, 1, true, true);
    expect(sock.frames.filter((f) => f.type === "input")).toHaveLength(1);

    // Past the window: the freshest sample goes out as seq 2.
    clock.advance(2);
    net.sendInput(-1, 1, true, true);
    const inputs = sock.frames.filter((f) => f.type === "input");
    expect(inputs).toHaveLength(2);
    expect(inputs[1].input).toEqual({ seq: 2, turn: -1, climb: 1, boost: true, fire: true });
  });

  it("sends nothing once the socket is gone", async () => {
    const { net, sock } = await connected();
    sock.serverClose();

    expect(() => net.sendInput(1, 0, false, false)).not.toThrow();
    expect(sock.frames.filter((f) => f.type === "input")).toHaveLength(0);
  });

  it("routes lobby and host commands over the same socket", async () => {
    const { net, sock } = await connected();

    net.sendReady();
    net.sendHostStart();
    net.sendHostKick("foe");
    net.sendHostSettings({ roundLength: 90, roomName: "Arena", botsInRoom: false, botDifficulty: "high" });

    expect(sock.lastFrame("ready")).toBeTruthy();
    expect(sock.lastFrame("host-start")).toBeTruthy();
    expect(sock.lastFrame("host-kick")).toMatchObject({ targetId: "foe" });
    expect(sock.lastFrame("host-settings")).toEqual({
      type: "host-settings",
      settings: { roundLength: 90, roomName: "Arena", botsInRoom: false, botDifficulty: "high" },
    });
  });

  it("drops `mode` from host settings, matching the server that refuses to forward it", async () => {
    const { net, sock } = await connected();

    net.sendHostSettings({ roundLength: 90, mode: "tdm" });

    // Both ends deliberately block team deathmatch on the local server:
    // protocol HostSettings has no `mode` field, and RoomHost.handleSettings
    // comments "Never forward `mode` — FFA is the only mode on the local server."
    // GameSim still implements TDM (friendly fire, team scores) but nothing can
    // reach it. This test locks the current decision; delete it if TDM is wired up.
    expect(sock.lastFrame("host-settings")!.settings).not.toHaveProperty("mode");
  });

  it("omits settings fields of the wrong type rather than forwarding junk", async () => {
    const { net, sock } = await connected();

    net.sendHostSettings({ roundLength: "90" as any, botsInRoom: "yes" as any, roomName: "Ok" });

    expect(sock.lastFrame("host-settings")!.settings).toEqual({ roomName: "Ok" });
  });
});

describe("prediction and reconciliation", () => {
  /** Connect, then seed one authoritative snapshot placing "me" at (x,0? ,z). */
  async function seeded(over: Record<string, any> = {}) {
    const { net, sock } = await connected();
    sock.serverSend({ type: "state", snap: snapshot([["me", player({ ...CLEAR_AIR, seq: 4, ...over })]]) });
    return { net, sock };
  }

  it("adopts the authoritative pose on the first snapshot", async () => {
    const { net } = await seeded();

    expect(net.localPose.active).toBe(true);
    expect(net.localPose.p).toEqual({ x: CLEAR_AIR.px, y: CLEAR_AIR.py, z: CLEAR_AIR.pz });
    expect(net.localPose.alive).toBe(true);
    expect(net.localPose.ackSeq).toBe(4);
  });

  it("eases toward the server on a small correction instead of teleporting", async () => {
    const { net, sock } = await seeded();
    const drift = 20; // well inside SNAP_DISTANCE

    clock.advance(50);
    sock.serverSend({ type: "state", snap: snapshot([["me", player({ ...CLEAR_AIR, px: CLEAR_AIR.px + drift, seq: 5 })]]) });

    // 22% of the way from the predicted pose to the authoritative one.
    expect(net.localPose.p.x).toBeCloseTo(CLEAR_AIR.px + drift * 0.22, 6);
    expect(net.localPose.p.x).toBeLessThan(CLEAR_AIR.px + drift);
    expect(net.localPose.ackSeq).toBe(5);
  });

  it("hard-snaps when the error exceeds SNAP_DISTANCE", async () => {
    const { net, sock } = await seeded();
    const far = SNAP_DISTANCE + 50;

    clock.advance(50);
    sock.serverSend({ type: "state", snap: snapshot([["me", player({ ...CLEAR_AIR, px: CLEAR_AIR.px + far, seq: 6 })]]) });

    expect(net.localPose.p).toEqual({ x: CLEAR_AIR.px + far, y: CLEAR_AIR.py, z: CLEAR_AIR.pz });
  });

  it("resyncs hard whenever the server says the local plane is dead", async () => {
    const { net, sock } = await seeded();

    clock.advance(50);
    sock.serverSend({ type: "state", snap: snapshot([["me", player({ px: 700, py: 200, pz: -300, alive: false, seq: 9 })]]) });

    expect(net.localPose.alive).toBe(false);
    expect(net.localPose.p).toEqual({ x: 700, y: 200, z: -300 }); // no easing for a corpse
  });

  it("stepLocal advances the local plane along its forward vector", async () => {
    const { net } = await seeded();
    const startX = net.localPose.p.x;

    net.stepLocal(0.1);

    // Facing +X at cruise speed: roughly speed*dt forward, minus the pull toward
    // the (unchanged) authoritative pose.
    expect(net.localPose.p.x).toBeGreaterThan(startX);
    expect(net.localPose.p.x).toBeLessThan(startX + C.CRUISE_SPEED * 0.1);
    expect(net.localPose.speed).toBeCloseTo(C.CRUISE_SPEED, 6);
  });

  it("stepLocal accelerates toward boost speed when the last input held boost", async () => {
    const { net } = await seeded();

    clock.advance(INPUT_INTERVAL_MS + 1);
    net.sendInput(0, 0, true, false);
    for (let i = 0; i < 10; i++) net.stepLocal(0.05);

    expect(net.localPose.boost).toBe(true);
    expect(net.localPose.speed).toBeGreaterThan(C.CRUISE_SPEED);
    expect(net.localPose.speed).toBeLessThanOrEqual(C.BOOST_SPEED);
  });

  it("stepLocal is a no-op when the session has no authoritative record", async () => {
    const { net } = await connected();
    expect(() => net.stepLocal(0.1)).not.toThrow();
    expect(net.localPose.active).toBe(false);
  });

  it("keeps the local plane inside the arena envelope", async () => {
    const { net, sock } = await connected();
    sock.serverSend({
      type: "state",
      snap: snapshot([["me", player({ px: C.MAP_HALF - 5, py: C.MAX_ALT, pz: 0, fx: 1, fy: 1, fz: 0 })]]),
    });

    for (let i = 0; i < 40; i++) net.stepLocal(0.05);

    expect(Math.abs(net.localPose.p.x)).toBeLessThanOrEqual(C.MAP_HALF);
    expect(Math.abs(net.localPose.p.z)).toBeLessThanOrEqual(C.MAP_HALF);
    expect(net.localPose.p.y).toBeLessThanOrEqual(C.MAX_ALT);
    expect(net.localPose.p.y).toBeGreaterThanOrEqual(C.MIN_ALT);
  });
});

describe("snapshot interpolation", () => {
  /** Connect and push snapshots placing "foe" at successive x positions. */
  async function buffered(positions: Array<{ at: number; x: number }>) {
    const { net, sock } = await connected();
    for (const { at, x } of positions) {
      clock.set(at);
      sock.serverSend({ type: "state", snap: snapshot([["foe", player({ px: x })]]) });
    }
    return { net, sock };
  }

  it("returns nothing until a snapshot has arrived", async () => {
    const { net } = await connected();
    expect(net.sample(clock.now())).toEqual({});
  });

  it("clones the only snapshot it has when asked for a later time", async () => {
    const { net } = await buffered([{ at: T0, x: 50 }]);

    const out = net.sample((T0 + 500));

    expect(out.foe.p.x).toBe(50);
    // A copy, not the buffered record: mutating the sample must not corrupt the buffer.
    out.foe.p.x = -1;
    expect(net.sample((T0 + 500)).foe.p.x).toBe(50);
  });

  it("blends linearly between the two bracketing snapshots", async () => {
    const { net } = await buffered([
      { at: T0, x: 0 },
      { at: (T0 + 100), x: 100 },
    ]);

    expect(net.sample(T0).foe.p.x).toBeCloseTo(0, 6);
    expect(net.sample((T0 + 50)).foe.p.x).toBeCloseTo(50, 6);
    expect(net.sample((T0 + 100)).foe.p.x).toBeCloseTo(100, 6);
  });

  it("clamps to the oldest snapshot when asked for a time before the buffer", async () => {
    const { net } = await buffered([
      { at: T0, x: 0 },
      { at: (T0 + 100), x: 100 },
    ]);

    expect(net.sample((T0 - 1000)).foe.p.x).toBeCloseTo(0, 6);
  });

  it("extrapolates past the newest snapshot, capped at MAX_EXTRAP_MS", async () => {
    const { net } = await buffered([
      { at: T0, x: 0 },
      { at: (T0 + 100), x: 100 },
    ]);
    const velocityPerMs = 1; // 100 units over 100 ms

    const shortLead = net.sample((T0 + 150)).foe.p.x;
    expect(shortLead).toBeCloseTo(100 + 50 * velocityPerMs, 6);

    // Beyond the cap the lead stops growing, so a stalled server cannot fling
    // remote planes across the map.
    const atCap = net.sample(T0 + 100 + MAX_EXTRAP_MS).foe.p.x;
    const wayPast = net.sample(T0 + 100 + MAX_EXTRAP_MS * 10).foe.p.x;
    expect(atCap).toBeCloseTo(100 + MAX_EXTRAP_MS * velocityPerMs, 6);
    expect(wayPast).toBeCloseTo(atCap, 6);
  });

  it("keeps forward vectors normalised through blending", async () => {
    const { net, sock } = await connected();
    clock.set(T0);
    sock.serverSend({ type: "state", snap: snapshot([["foe", player({ fx: 1, fy: 0, fz: 0 })]]) });
    clock.set((T0 + 100));
    sock.serverSend({ type: "state", snap: snapshot([["foe", player({ fx: 0, fy: 0, fz: 1 })]]) });

    const f = net.sample((T0 + 50)).foe.f;
    expect(Math.hypot(f.x, f.y, f.z)).toBeCloseTo(1, 6);
  });
});

describe("StableMap identity", () => {
  it("mutates existing records in place so the renderer never holds a stale reference", async () => {
    const { net, sock } = await connected();

    sock.serverSend({ type: "state", snap: snapshot([["foe", player({ px: 10, score: 0 })]]) });
    const first = net.state!.players.get("foe");

    sock.serverSend({ type: "state", snap: snapshot([["foe", player({ px: 40, score: 3 })]]) });
    const second = net.state!.players.get("foe");

    expect(second).toBe(first);           // same object identity
    expect(second.px).toBe(40);           // updated in place
    expect(second.score).toBe(3);
  });

  it("prunes records the server no longer sends", async () => {
    const { net, sock } = await connected();

    sock.serverSend({ type: "state", snap: snapshot([["a", player()], ["b", player()]]) });
    expect(net.state!.players.size).toBe(2);

    sock.serverSend({ type: "state", snap: snapshot([["a", player()]]) });
    expect(net.state!.players.size).toBe(1);
    expect(net.state!.players.get("b")).toBeUndefined();
  });
});

describe("roster projection", () => {
  it("summarises players for the lobby list", async () => {
    const { net, sock } = await connected();
    sock.serverSend({
      type: "state",
      snap: snapshot([
        ["me", player({ name: "Me", ready: true, score: 2, skin: 5 })],
        ["bot1", player({ name: "Iceman", bot: true, score: 1 })],
      ]),
    });

    const roster = net.getRosterSnapshot();

    expect(roster).toHaveLength(2);
    expect(roster.find((r) => r.id === "me")).toMatchObject({ name: "Me", ready: true, score: 2 });
    expect(roster.find((r) => r.id === "bot1")).toMatchObject({ name: "Iceman", bot: true });
  });

  it("reports phase and host id from the latest snapshot", async () => {
    const { net, sock } = await connected();
    sock.serverSend({ type: "state", snap: snapshot([["me", player()]], { phase: "lobby", hostId: "me" }) });

    expect(net.getPhase()).toBe("lobby");
    expect(net.getHostId()).toBe("me");
  });
});

describe("harness invariants", () => {
  it("uses the fake socket, not a real one", () => {
    expect((globalThis as any).WebSocket).toBe(FakeWebSocket);
  });
});
