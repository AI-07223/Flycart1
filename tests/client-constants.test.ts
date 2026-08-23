// tests/client-constants.test.ts
// window.GAME is the client's view of the shared tuning constants. The HUD and the
// pickup callout look powerups up in GAME.POWERUPS, so a powerup that exists in the
// sim but not in that table degrades silently: the HUD prints the raw id with a
// generic star and the callout falls back to "POWERUP!".

import { describe, expect, it } from "vitest";
import "./client-env";
import * as C from "../src/shared/constants";

const GAME = (globalThis as any).window.GAME as {
  POWERUPS: Record<string, { label: string; color: number; icon: string }>;
  [k: string]: any;
};

describe("window.GAME.POWERUPS", () => {
  it("has display metadata for every powerup the sim can hand out", () => {
    const missing = C.POWERUP_TYPES.filter((t) => !(t in GAME.POWERUPS));
    expect(missing).toEqual([]);
  });

  it("gives every entry a label, an icon and a colour", () => {
    for (const type of C.POWERUP_TYPES) {
      const meta = GAME.POWERUPS[type];
      expect(meta, `missing metadata for "${type}"`).toBeTruthy();
      expect(typeof meta.label).toBe("string");
      expect(meta.label.length).toBeGreaterThan(0);
      expect(typeof meta.icon).toBe("string");
      expect(meta.icon.length).toBeGreaterThan(0);
      expect(typeof meta.color).toBe("number");
      expect(meta.color).toBeGreaterThanOrEqual(0);
      expect(meta.color).toBeLessThanOrEqual(0xffffff);
    }
  });

  it("does not carry metadata for powerups the sim cannot produce", () => {
    const orphans = Object.keys(GAME.POWERUPS).filter((t) => !C.POWERUP_TYPES.includes(t));
    expect(orphans).toEqual([]);
  });
});

describe("window.GAME tuning mirror", () => {
  it("re-exports the shared flight and arena constants the client predicts with", () => {
    // net-ws.ts stepLocal reads these off window.GAME; a missing one silently
    // turns prediction maths into NaN.
    const required = [
      "CRUISE_SPEED", "BOOST_SPEED", "ACCEL", "TURN_RATE", "PITCH_RATE", "PITCH_MAX",
      "AFTERBURNER_FACTOR", "PLANE_RADIUS", "MAP_HALF", "MAP_EDGE_SOFT",
      "MIN_ALT", "MAX_ALT", "LANDMARKS",
    ];
    for (const key of required) {
      expect(GAME[key], `window.GAME.${key} is missing`).toBeDefined();
    }
    expect(GAME.CRUISE_SPEED).toBe(C.CRUISE_SPEED);
    expect(GAME.BOOST_SPEED).toBe(C.BOOST_SPEED);
    expect(GAME.MAP_HALF).toBe(C.MAP_HALF);
    expect(GAME.LANDMARKS).toHaveLength(C.LANDMARKS.length);
  });
});
