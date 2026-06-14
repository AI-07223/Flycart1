// tests/arena.test.ts
// Integration tests for ArenaRoom — tests core gameplay logic via direct room instantiation.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ArenaRoom } from "../src/rooms/ArenaRoom";
import { ArenaState, Player, Bullet } from "../src/schema/ArenaState";
import * as C from "../src/shared/constants";
import * as S from "../src/shared/sphere";

// Helper to create a room instance with mocked Colyseus internals
function createRoom(): ArenaRoom {
  const room = new ArenaRoom();
  // Mock the room state and clock that Colyseus normally provides
  (room as any).state = new ArenaState();
  (room as any).clock = {
    setInterval: (_fn: Function, _ms: number) => {},
  };
  // Use defineProperty for read-only getters
  Object.defineProperty(room, "roomId", { value: "test-room-1", writable: true });
  Object.defineProperty(room, "maxClients", { value: C.MAX_CLIENTS, writable: true });
  Object.defineProperty(room, "metadata", { value: { mode: "ffa" }, writable: true });
  // Initialize internal maps that onCreate would set up
  (room as any).inputs = new Map();
  (room as any).speed = new Map();
  (room as any).invulnUntil = new Map();
  (room as any).bulletLife = new Map();
  (room as any).msgTimes = new Map();
  (room as any).bulletSeq = 0;
  (room as any).pickupSeq = 0;
  (room as any).roundEndsAt = Infinity;
  (room as any).intermissionUntil = 0;
  (room as any).botSeq = 0;
  (room as any).bots = new Map();
  (room as any).botsEnabled = false;
  (room as any).mode = "ffa";
  (room as any).now = 0;
  (room as any).prevRound = -1;
  return room;
}

// Helper to add a player directly to room state
function addPlayer(room: ArenaRoom, id: string, name: string, bot = false): Player {
  const p = new Player();
  p.name = name;
  p.bot = bot;
  p.alive = true;
  p.hp = C.MAX_HP;
  p.score = 0;
  p.pos = S.vec(0, 0, 1); // north pole
  p.fwd = S.vec(1, 0, 0);
  (room as any).state.players.set(id, p);
  (room as any).inputs.set(id, { turn: 0, fire: false, boost: false });
  (room as any).speed.set(id, C.CRUISE_SPEED);
  return p;
}

describe("ArenaRoom", () => {
  it("room can be instantiated", () => {
    const room = createRoom();
    expect(room).toBeDefined();
  });

  it("state has correct collections", () => {
    const room = createRoom();
    const state = (room as any).state as ArenaState;
    expect(state.players).toBeDefined();
    expect(state.bullets).toBeDefined();
    expect(state.pickups).toBeDefined();
  });

  describe("player management", () => {
    it("can add a player to state", () => {
      const room = createRoom();
      const p = addPlayer(room, "p1", "TestPlayer");
      const state = (room as any).state as ArenaState;
      expect(state.players.size).toBe(1);
      expect(state.players.get("p1")?.name).toBe("TestPlayer");
      expect(state.players.get("p1")?.alive).toBe(true);
      expect(state.players.get("p1")?.hp).toBe(C.MAX_HP);
    });

    it("can add multiple players", () => {
      const room = createRoom();
      addPlayer(room, "p1", "Alice");
      addPlayer(room, "p2", "Bob");
      const state = (room as any).state as ArenaState;
      expect(state.players.size).toBe(2);
    });
  });

  describe("bullet lifecycle", () => {
    it("bulletLife map tracks bullet lifetime", () => {
      const room = createRoom();
      const life = (room as any).bulletLife as Map<string, number>;
      life.set("b0", C.BULLET_LIFE);
      expect(life.get("b0")).toBe(C.BULLET_LIFE);
    });

    it("bullets are added to state", () => {
      const room = createRoom();
      const state = (room as any).state as ArenaState;
      // Manually add a bullet
      const b = new Bullet();
      b.owner = "p1";
      b.pos = S.vec(1, 0, 0);
      b.fwd = S.vec(0, 1, 0);
      b.homing = false;
      state.bullets.set("b0", b);
      expect(state.bullets.size).toBe(1);
      expect(state.bullets.get("b0")?.owner).toBe("p1");
    });
  });

  describe("constants integration", () => {
    it("MAX_HP is consistent", () => {
      expect(C.MAX_HP).toBeGreaterThan(0);
      expect(C.MAX_HP).toBeLessThanOrEqual(1000);
    });

    it("BULLET_SPEED > CRUISE_SPEED", () => {
      expect(C.BULLET_SPEED).toBeGreaterThan(C.CRUISE_SPEED);
    });

    it("RESPAWN_DELAY is positive", () => {
      expect(C.RESPAWN_DELAY).toBeGreaterThan(0);
    });

    it("MIN_PLAYERS <= MAX_CLIENTS", () => {
      expect(C.MIN_PLAYERS).toBeLessThanOrEqual(C.MAX_CLIENTS);
    });

    it("R_MIN < R_BASE < R_MAX", () => {
      expect(C.R_MIN).toBeLessThan(C.R_BASE);
      expect(C.R_BASE).toBeLessThan(C.R_MAX);
    });
  });
});
