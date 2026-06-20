import http from "node:http";
import express from "express";
import { describe, expect, it } from "vitest";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Client as ColyseusClient } from "colyseus.js";
import { ArenaRoom } from "../src/rooms/ArenaRoom";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor<T>(label: string, fn: () => T | null | undefined | false, timeoutMs = 4000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = fn();
    if (value) return value;
    await sleep(25);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function createHarness(): Promise<{ server: http.Server; gameServer: Server; endpoint: string }> {
  const app = express();
  const server = http.createServer(app);
  const gameServer = new Server({
    transport: new WebSocketTransport({ server }),
    gracefullyShutdown: false,
    greet: false,
  });

  gameServer.define("arena", ArenaRoom).filterBy(["code"]);

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Failed to acquire test server address");

  return {
    server,
    gameServer,
    endpoint: `ws://127.0.0.1:${address.port}`,
  };
}

describe("ArenaRoom runtime hardening", () => {
  it("ignores malformed input payloads without dropping the room", async () => {
    const harness = await createHarness();

    try {
      const client = new ColyseusClient(harness.endpoint);
      const room = await client.joinOrCreate("arena", { name: "Probe", code: "NOBOTS", skin: 0 });

      const me = await waitFor("initial player state", () => room.state?.players?.get?.(room.sessionId));
      const baseSeq = me.seq;

      room.send("input", null as any);
      room.send("input", { seq: "bad", turn: 0.75, climb: "bad", boost: true, fire: false } as any);

      const partial = await waitFor("partial malformed update state", () => {
        const player = room.state?.players?.get?.(room.sessionId);
        if (!player) return null;
        return player.seq === baseSeq && player.turn > 0.7 && player.boosting ? player : null;
      });

      expect(partial.climb).toBe(0);

      room.send("input", { seq: baseSeq + 1, turn: 1, climb: 1, boost: true, fire: false });

      const updated = await waitFor("post-malformed recovery state", () => {
        const player = room.state?.players?.get?.(room.sessionId);
        if (!player) return null;
        return player.seq >= baseSeq + 1 && player.turn > 0.7 && player.climb > 0.7 && player.boosting ? player : null;
      });

      expect(updated.alive).toBe(true);
      expect(updated.seq).toBeGreaterThanOrEqual(baseSeq + 1);
      expect(updated.turn).toBeGreaterThan(0.7);
      expect(updated.climb).toBeGreaterThan(0.7);
      expect(updated.boosting).toBe(true);

      room.leave();
    } finally {
      await harness.gameServer.gracefullyShutdown(false);
      await new Promise<void>((resolve) => harness.server.close(() => resolve()));
    }
  });

  it("falls back to Pilot when a join name is malformed", async () => {
    const harness = await createHarness();

    try {
      const client = new ColyseusClient(harness.endpoint);
      const room = await client.joinOrCreate("arena", { name: { invalid: true }, code: "NOBOTS", skin: 0 } as any);

      const me = await waitFor("joined player state", () => room.state?.players?.get?.(room.sessionId));

      expect(me.name).toBe("Pilot");

      room.leave();
    } finally {
      await harness.gameServer.gracefullyShutdown(false);
      await new Promise<void>((resolve) => harness.server.close(() => resolve()));
    }
  });
});
