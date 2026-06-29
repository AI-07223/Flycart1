import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOADOUT,
  createDefaultLoadoutStore,
  getLoadoutSummary,
  loadoutFromLegacy,
  parseLoadoutStore,
  randomizeLoadout,
  sameLoadout,
} from "../src/shared/loadout";

describe("shared loadout helpers", () => {
  it("hydrates the unified loadout from legacy keys", () => {
    const loadout = loadoutFromLegacy({
      skin: "4",
      bodyShape: "2",
      accent: "5",
      trail: "3",
      livery: "1",
    });

    expect(loadout).toEqual({
      color: 4,
      bodyShape: 2,
      accent: 5,
      trail: 3,
      livery: 1,
    });
  });

  it("prefers explicit legacy color over the old skin key", () => {
    const loadout = loadoutFromLegacy({ skin: "4", color: "1" });
    expect(loadout.color).toBe(1);
  });

  it("parses the persisted store and clamps invalid entries", () => {
    const parsed = parseLoadoutStore(JSON.stringify({
      version: 1,
      active: { color: 999, bodyShape: 1, accent: 2, trail: 3, livery: 4 },
      presets: [{ color: 2, bodyShape: 3, accent: 1, trail: 0, livery: 2 }],
    }));

    expect(parsed).not.toBeNull();
    expect(parsed?.active.color).toBe(DEFAULT_LOADOUT.color);
    expect(parsed?.active.bodyShape).toBe(1);
    expect(parsed?.active.livery).toBe(DEFAULT_LOADOUT.livery);
    expect(parsed?.presets).toHaveLength(4);
    expect(parsed?.presets[0]).toEqual({ color: 2, bodyShape: 3, accent: 1, trail: 0, livery: 2 });
  });

  it("randomizes all five cosmetic slots", () => {
    const values = [0.95, 0.2, 0.51, 0.8, 0.1];
    let index = 0;
    const randomized = randomizeLoadout(() => values[index++]);

    expect(randomized).toEqual({
      color: 11,
      bodyShape: 0,
      accent: 3,
      trail: 4,
      livery: 0,
    });
  });

  it("produces a readable summary and default preset store", () => {
    const store = createDefaultLoadoutStore();
    const summary = getLoadoutSummary(store.active);

    expect(store.presets).toHaveLength(4);
    expect(sameLoadout(store.active, DEFAULT_LOADOUT)).toBe(true);
    expect(summary.title).toContain("Fighter");
    expect(summary.subtitle).toContain("paint");
  });
});
