// tests/combat.test.ts
// The core combat loop: damage gating, kills, scoring, respawn, and round flow.
// Deterministic — no real timers, no bots, no pickup spawning. Private methods are
// poked directly (same pattern as tests/powerups.test.ts) so each system is
// exercised in isolation rather than through a noisy full tick.

import { describe, expect, it } from "vitest";
import { GameSim } from "../src/sim/GameSim";
import * as C from "../src/shared/constants";
import * as S from "../src/shared/sphere";
import type { SimEvent } from "../src/sim/types";

function join(name: string) {
  return { name, skin: 0, bodyShape: 0, accent: 0, trail: 0, livery: 0 };
}

/** Sim with bots off and pickup spawning disabled, capturing every emitted event. */
function makeSim() {
  const events: SimEvent[] = [];
  const sim = new GameSim({
    botsEnabled: false,
    isPublic: true,
    onEvent: (e) => { events.push(e); },
  });
  // Pickups spawn on a timer inside tick(); pin it out of reach so combat tests
  // never race a random powerup drop.
  (sim as any).pickupAt = Number.POSITIVE_INFINITY;
  return { sim, events };
}

/** Two players facing each other along +X, spawn invuln cleared, engines idle. */
function setupDuel(sim: GameSim) {
  const a = sim.addPlayer("a", join("A"));
  const b = sim.addPlayer("b", join("B"));
  (sim as any).invulnUntil.delete("a");
  (sim as any).invulnUntil.delete("b");
  a.px = -300; a.py = 100; a.pz = -220; a.fx = 1; a.fy = 0; a.fz = 0; a.speed = 0;
  b.px = -140; b.py = 100; b.pz = -220; b.fx = -1; b.fy = 0; b.fz = 0; b.speed = 0;
  return { a, b };
}

/** One bullet from A straight at B, advanced far enough to connect. */
function shoot(sim: GameSim, a: { px: number; py: number; pz: number }) {
  sim.spawnBullet("a", S.vec(a.px, a.py, a.pz), S.vec(1, 0, 0), false);
  (sim as any).stepBullets(0.6, true);
}

type KillEvent = Extract<SimEvent, { type: "kill" }>;
type RoundEndEvent = Extract<SimEvent, { type: "roundEnd" }>;

const kills = (events: SimEvent[]): KillEvent[] =>
  events.filter((e): e is KillEvent => e.type === "kill");

describe("damage and kills", () => {
  it("a non-lethal hit costs BULLET_DAMAGE, scores nothing, and emits no kill", () => {
    const { sim, events } = makeSim();
    const { a, b } = setupDuel(sim);

    shoot(sim, a);

    expect(b.hp).toBe(C.MAX_HP - C.BULLET_DAMAGE);
    expect(b.alive).toBe(true);
    expect(a.score).toBe(0);
    expect(kills(events)).toHaveLength(0);
  });

  it("MAX_HP / BULLET_DAMAGE hits kill: victim down, killer +1, kill event carries both names", () => {
    const { sim, events } = makeSim();
    const { a, b } = setupDuel(sim);

    const shots = Math.ceil(C.MAX_HP / C.BULLET_DAMAGE);
    for (let i = 0; i < shots; i++) shoot(sim, a);

    expect(b.alive).toBe(false);
    expect(b.hp).toBe(0);
    expect(a.score).toBe(1);

    const killed = kills(events);
    expect(killed).toHaveLength(1);
    expect(killed[0]).toMatchObject({
      killer: "a", victim: "b", killerName: "A", victimName: "B",
    });
  });

  it("a kill zeroes the victim control state and schedules a respawn", () => {
    const { sim } = makeSim();
    const { a, b } = setupDuel(sim);
    b.hp = C.BULLET_DAMAGE;
    b.turn = 1; b.climb = 1; b.boosting = true;
    (sim as any).applyPowerup("b", b, "rapid");

    shoot(sim, a);

    expect(b.alive).toBe(false);
    expect(b.turn).toBe(0);
    expect(b.climb).toBe(0);
    expect(b.boosting).toBe(false);
    expect(b.power).toBe("");
    expect((sim as any).respawnAt.get("b")).toBeCloseTo(sim.now + C.RESPAWN_DELAY, 10);
  });

  it("self-kills emit a kill event but award no score", () => {
    const { sim, events } = makeSim();
    const { a } = setupDuel(sim);

    const applied = (sim as any).damage(a, "a", "a", 999);

    expect(applied).toBe(true);
    expect(a.alive).toBe(false);
    expect(a.score).toBe(0);
    expect(kills(events)[0]).toMatchObject({ killer: "a", victim: "a" });
  });

  it("damage() reports false when a hit is gated, true when HP actually drops", () => {
    const { sim } = makeSim();
    const { b } = setupDuel(sim);

    (sim as any).invulnUntil.set("b", sim.now + C.SPAWN_INVULN);
    expect((sim as any).damage(b, "b", "a")).toBe(false);
    expect(b.hp).toBe(C.MAX_HP);

    (sim as any).invulnUntil.delete("b");
    expect((sim as any).damage(b, "b", "a")).toBe(true);
    expect(b.hp).toBe(C.MAX_HP - C.BULLET_DAMAGE);
  });
});

describe("spawn invulnerability", () => {
  it("blocks incoming fire until SPAWN_INVULN elapses", () => {
    const { sim } = makeSim();
    const { a, b } = setupDuel(sim);
    (sim as any).invulnUntil.set("b", sim.now + C.SPAWN_INVULN);

    shoot(sim, a);
    expect(b.hp).toBe(C.MAX_HP);

    sim.now += C.SPAWN_INVULN + 0.01;
    shoot(sim, a);
    expect(b.hp).toBe(C.MAX_HP - C.BULLET_DAMAGE);
  });

  it("is forfeited the moment the protected player opens fire", () => {
    const { sim } = makeSim();
    const { a, b } = setupDuel(sim);
    (sim as any).invulnUntil.set("b", sim.now + C.SPAWN_INVULN);

    (sim as any).tryFire("b", b);
    expect((sim as any).invulnUntil.has("b")).toBe(false);

    shoot(sim, a);
    expect(b.hp).toBe(C.MAX_HP - C.BULLET_DAMAGE);
  });
});

describe("respawn", () => {
  it("revives at RESPAWN_DELAY with full HP, cleared status, and fresh invuln", () => {
    const { sim } = makeSim();
    const { a, b } = setupDuel(sim);
    b.hp = C.BULLET_DAMAGE;
    b.frozenLeft = 5;
    b.empLeft = 5;
    shoot(sim, a);
    expect(b.alive).toBe(false);

    // Just short of the delay: still down.
    sim.tick(C.RESPAWN_DELAY - 0.1);
    expect(b.alive).toBe(false);

    sim.tick(0.2);
    expect(b.alive).toBe(true);
    expect(b.hp).toBe(C.MAX_HP);
    expect(b.frozenLeft).toBe(0);
    expect(b.empLeft).toBe(0);
    expect(b.power).toBe("");
    expect(b.speed).toBe(C.CRUISE_SPEED);
    expect((sim as any).invulnUntil.get("b")).toBeGreaterThan(sim.now);
  });

  it("keeps the killer score across the victim respawn", () => {
    const { sim } = makeSim();
    const { a, b } = setupDuel(sim);
    b.hp = C.BULLET_DAMAGE;
    shoot(sim, a);

    sim.tick(C.RESPAWN_DELAY + 0.1);

    expect(b.alive).toBe(true);
    expect(a.score).toBe(1);
  });
});

describe("round flow", () => {
  it("ends the round at zero, emitting scores and entering intermission", () => {
    const { sim, events } = makeSim();
    const { a, b } = setupDuel(sim);
    a.score = 3;
    b.score = 0; // zero-score players are omitted from the scoreboard

    sim.timeLeft = 0.05;
    sim.tick(0.1);

    expect(sim.phase).toBe("intermission");
    expect(sim.timeLeft).toBe(C.ROUND_INTERMISSION);

    const ended = events.filter((e): e is RoundEndEvent => e.type === "roundEnd");
    expect(ended).toHaveLength(1);
    expect(ended[0].scores).toEqual([{ name: "A", score: 3 }]);
  });

  it("omits bots from the roundEnd scoreboard", () => {
    const { sim, events } = makeSim();
    const { a, b } = setupDuel(sim);
    a.score = 2;
    b.score = 9;
    b.bot = true;

    sim.timeLeft = 0.05;
    sim.tick(0.1);

    const ended = events.find((e): e is RoundEndEvent => e.type === "roundEnd");
    expect(ended?.scores).toEqual([{ name: "A", score: 2 }]);
  });

  it("auto-restarts after intermission: scores wiped, everyone respawned, clock reset", () => {
    const { sim } = makeSim();
    const { a, b } = setupDuel(sim);
    a.score = 5;
    b.alive = false;
    sim.phase = "intermission";
    sim.timeLeft = 0.05;

    sim.tick(0.1);

    expect(sim.phase).toBe("playing");
    expect(sim.timeLeft).toBe(C.ROUND_SECONDS);
    expect(a.score).toBe(0);
    expect(b.score).toBe(0);
    expect(a.alive).toBe(true);
    expect(b.alive).toBe(true);
  });

  it("does not resolve bullets or award kills while intermission is running", () => {
    const { sim, events } = makeSim();
    const { a, b } = setupDuel(sim);
    b.hp = C.BULLET_DAMAGE;
    sim.phase = "intermission";
    sim.timeLeft = C.ROUND_INTERMISSION;

    sim.spawnBullet("a", S.vec(a.px, a.py, a.pz), S.vec(1, 0, 0), false);
    sim.tick(0.6);

    expect(b.alive).toBe(true);
    expect(kills(events)).toHaveLength(0);
  });
});

describe("team deathmatch", () => {
  it("blocks friendly fire and lets cross-team damage through", () => {
    const { sim } = makeSim();
    const { a, b } = setupDuel(sim);
    sim.mode = "tdm";
    a.team = 0;
    b.team = 0;

    shoot(sim, a);
    expect(b.hp).toBe(C.MAX_HP);

    b.team = 1;
    shoot(sim, a);
    expect(b.hp).toBe(C.MAX_HP - C.BULLET_DAMAGE);
  });

  it("credits the killer team score on a cross-team kill", () => {
    const { sim } = makeSim();
    const { a, b } = setupDuel(sim);
    sim.mode = "tdm";
    a.team = 0;
    b.team = 1;
    b.hp = C.BULLET_DAMAGE;

    shoot(sim, a);

    expect(a.score).toBe(1);
    expect(sim.teamScore0).toBe(1);
    expect(sim.teamScore1).toBe(0);
  });
});

describe("hit knockback", () => {
  it("nudges a survivor along the bullet travel direction", () => {
    const { sim } = makeSim();
    const { a, b } = setupDuel(sim);
    const before = b.px;

    shoot(sim, a);

    expect(b.alive).toBe(true);
    expect(b.px).toBeCloseTo(before + C.HIT_KNOCKBACK, 6);
    expect(b.pz).toBeCloseTo(-220, 6);
  });

  it("skips knockback on a kill and on a blocked hit", () => {
    const { sim } = makeSim();
    const { a, b } = setupDuel(sim);

    // Blocked by spawn invuln — position untouched.
    (sim as any).invulnUntil.set("b", sim.now + C.SPAWN_INVULN);
    const start = b.px;
    shoot(sim, a);
    expect(b.px).toBe(start);

    // Lethal hit — the corpse is not shoved.
    (sim as any).invulnUntil.delete("b");
    b.hp = C.BULLET_DAMAGE;
    shoot(sim, a);
    expect(b.alive).toBe(false);
    expect(b.px).toBe(start);
  });
});
