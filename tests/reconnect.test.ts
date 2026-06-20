import http from "node:http";
import express from "express";
import { describe, it, expect } from "vitest";
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

describe("ArenaRoom reconnect recovery", () => {
  it("keeps the session usable after an unconsented disconnect", async () => {
    const harness = await createHarness();

    try {
      const client = new ColyseusClient(harness.endpoint);
      const room = await client.joinOrCreate("arena", { name: "Probe", code: "NOBOTS", skin: 0 });

      await waitFor("initial player state", () => room.state?.players?.get?.(room.sessionId));
      const token = room.reconnectionToken;
      expect(token).toBeTruthy();

      const left = new Promise<number>((resolve) => room.onLeave((code) => resolve(code)));
      room.connection.transport.close();
      expect(await left).toBe(1005);
      await sleep(250);

      const recovered = await client.reconnect(token);
      expect(recovered.sessionId).toBe(room.sessionId);

      await waitFor("reconnected player state", () => recovered.state?.players?.get?.(recovered.sessionId));

      recovered.send("input", { seq: 1, turn: 1, climb: 1, boost: true, fire: false });

      const me = await waitFor("post-reconnect input acknowledgement", () => {
        const player = recovered.state?.players?.get?.(recovered.sessionId);
        if (!player) return null;
        return player.seq >= 1 && player.turn > 0 && player.climb > 0 && player.boosting ? player : null;
      });

      expect(me.alive).toBe(true);
      expect(me.seq).toBeGreaterThanOrEqual(1);
      expect(me.turn).toBeGreaterThan(0);
      expect(me.climb).toBeGreaterThan(0);
      expect(me.boosting).toBe(true);

      recovered.leave();
    } finally {
      await harness.gameServer.gracefullyShutdown(false);
      await new Promise<void>((resolve) => harness.server.close(() => resolve()));
    }
  });
});
