// tests/powerups-new.test.ts
// Ghost (phase-out) and magnet (pickup attraction) — sim-level coverage.
// Deterministic: no real timers, only direct GameSim calls / private-method pokes
// following the arena.test.ts pattern.

import { describe, expect, it } from "vitest";
import { GameSim } from "../src/sim/GameSim";
import * as C from "../src/shared/constants";
import * as S from "../src/shared/sphere";

function makeSim(): GameSim {
  return new GameSim({ botsEnabled: false, isPublic: true, onEvent: () => undefined });
}

function join(name: string) {
  return { name, skin: 0, bodyShape: 0, accent: 0, trail: 0, livery: 0 };
}

/** Two players pinned along +X with spawn invuln cleared, so bullets fly true. */
function setupDuel(sim: GameSim) {
  const a = sim.addPlayer("a", join("A"));
  const b = sim.addPlayer("b", join("B"));
  (sim as any).invulnUntil.delete("a");
  (sim as any).invulnUntil.delete("b");
  a.px = -300; a.py = 100; a.pz = -220; a.fx = 1; a.fy = 0; a.fz = 0; a.speed = 0;
  b.px = -140; b.py = 100; b.pz = -220; b.fx = -1; b.fy = 0; b.fz = 0; b.speed = 0;
  return { a, b };
}

describe("ghost powerup", () => {
  it("blocks bullet damage while active, and damage lands after expiry", () => {
    const sim = makeSim();
    const { a, b } = setupDuel(sim);

    (sim as any).applyPowerup("b", b, "ghost");
    expect(b.power).toBe("ghost");
    expect(b.powerLeft).toBe(C.POWERUP_DURATION);

    sim.spawnBullet("a", S.vec(a.px, a.py, a.pz), S.vec(1, 0, 0), false);
    (sim as any).stepBullets(0.6, true);
    expect(b.hp).toBe(C.MAX_HP);

    // Expire through the normal powerUntil path.
    sim.now += C.POWERUP_DURATION + 0.1;
    (sim as any).expirePowers();
    expect(b.power).toBe("");
    expect(b.powerLeft).toBe(0);

    sim.spawnBullet("a", S.vec(a.px, a.py, a.pz), S.vec(1, 0, 0), false);
    (sim as any).stepBullets(0.6, true);
    expect(b.hp).toBe(C.MAX_HP - C.BULLET_DAMAGE);
  });

  it("blocks star rams while active", () => {
    const sim = makeSim();
    const { a, b } = setupDuel(sim);
    // Park the victim inside the star ram radius.
    b.px = a.px + C.PLANE_RADIUS;

    (sim as any).applyPowerup("b", b, "ghost");
    (sim as any).applyPowerup("a", a, "star");

    (sim as any).stepStarRams();
    expect(b.hp).toBe(C.MAX_HP);
    expect(b.alive).toBe(true);
  });
});

describe("magnet powerup", () => {
  it("pulls pickups within 4x PICKUP_RADIUS closer over ticks; far pickups untouched", () => {
    const sim = makeSim();
    const m = sim.addPlayer("m", join("M"));
    (sim as any).invulnUntil.delete("m");
    m.px = 0; m.py = 100; m.pz = 0; m.fx = 1; m.fy = 0; m.fz = 0; m.speed = 0;

    sim.pickups.set("pkNear", { type: "rapid", px: 180, py: 100, pz: 0 });
    sim.pickups.set("pkFar", { type: "repair", px: 600, py: 100, pz: 0 });

    (sim as any).applyPowerup("m", m, "magnet");

    const range = C.PICKUP_RADIUS * C.MAGNET_RADIUS_MULT + C.PLANE_RADIUS;
    const nearPos = () => S.vec(sim.pickups.get("pkNear")!.px, sim.pickups.get("pkNear")!.py, sim.pickups.get("pkNear")!.pz);
    const holderPos = () => S.vec(m.px, m.py, m.pz);

    const d0 = S.distance(nearPos(), holderPos());
    expect(d0).toBeLessThan(range);
    expect(d0).toBeGreaterThan(C.PICKUP_RADIUS + C.PLANE_RADIUS); // not collectible yet

    for (let i = 0; i < 10; i++) (sim as any).stepMagnet(0.05);

    const d1 = S.distance(nearPos(), holderPos());
    expect(d1).toBeLessThan(d0);
    expect(sim.pickups.has("pkNear")).toBe(true); // still in flight

    // Far pickup is outside the attraction range and never moves.
    const far = sim.pickups.get("pkFar")!;
    expect(far.px).toBe(600);
    expect(far.py).toBe(100);
    expect(far.pz).toBe(0);

    // Keep pulling until it crosses the collect radius, then normal pickup logic takes it.
    while (sim.pickups.has("pkNear") && S.distance(nearPos(), holderPos()) > C.PICKUP_RADIUS) {
      (sim as any).stepMagnet(0.05);
    }
    (sim as any).collectPickups();
    expect(sim.pickups.has("pkNear")).toBe(false);
    expect(m.power).toBe("rapid");
  });

  it("does nothing once the magnet expires", () => {
    const sim = makeSim();
    const m = sim.addPlayer("m", join("M"));
    (sim as any).invulnUntil.delete("m");
    m.px = 0; m.py = 100; m.pz = 0; m.fx = 1; m.fy = 0; m.fz = 0; m.speed = 0;

    sim.pickups.set("pk0", { type: "rapid", px: 150, py: 100, pz: 0 });
    (sim as any).applyPowerup("m", m, "magnet");

    sim.now += C.POWERUP_DURATION + 0.1;
    (sim as any).expirePowers();
    expect(m.power).toBe("");

    (sim as any).stepMagnet(0.05);
    const pk = sim.pickups.get("pk0")!;
    expect(pk.px).toBe(150);
    expect(pk.py).toBe(100);
    expect(pk.pz).toBe(0);
  });
});
