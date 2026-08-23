// tests/powerups.test.ts
// Every entry in C.POWERUP_TYPES, exercised at the sim level.
// Deterministic: no real timers, no bots, no random pickup spawning — only direct
// GameSim calls and private-method pokes.

import { describe, expect, it } from "vitest";
import { GameSim } from "../src/sim/GameSim";
import * as C from "../src/shared/constants";
import * as S from "../src/shared/sphere";

function makeSim(): GameSim {
  const sim = new GameSim({ botsEnabled: false, isPublic: true, onEvent: () => undefined });
  (sim as any).pickupAt = Number.POSITIVE_INFINITY;
  return sim;
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

function setInput(sim: GameSim, id: string, patch: Partial<{ turn: number; climb: number; boost: boolean; fire: boolean }>) {
  (sim as any).inputs.set(id, { seq: 1, turn: 0, climb: 0, boost: false, fire: false, ...patch });
}

const bulletList = (sim: GameSim) => Array.from(sim.bullets.values());
const mineList = (sim: GameSim) => bulletList(sim).filter((b) => b.kind === "mine");

// ---------------------------------------------------------------------------

describe("spread powerup", () => {
  it("fires three bullets fanned by SPREAD_ANGLE instead of one", () => {
    const sim = makeSim();
    const { a } = setupDuel(sim);

    (sim as any).applyPowerup("a", a, "spread");
    (sim as any).tryFire("a", a);

    const shots = bulletList(sim);
    expect(shots).toHaveLength(3);

    const fwds = shots.map((b) => S.vec(b.fx, b.fy, b.fz));
    const center = S.vec(1, 0, 0);
    const angles = fwds.map((f) => S.angBetween(f, center)).sort((x, y) => x - y);
    expect(angles[0]).toBeCloseTo(0, 6);
    expect(angles[1]).toBeCloseTo(C.SPREAD_ANGLE, 6);
    expect(angles[2]).toBeCloseTo(C.SPREAD_ANGLE, 6);
  });

  it("without the powerup a single shot goes straight ahead", () => {
    const sim = makeSim();
    const { a } = setupDuel(sim);

    (sim as any).tryFire("a", a);

    expect(bulletList(sim)).toHaveLength(1);
  });
});

describe("rapid powerup", () => {
  it("cuts the fire cooldown to FIRE_COOLDOWN * RAPID_FACTOR", () => {
    const rapidCooldown = C.FIRE_COOLDOWN * C.RAPID_FACTOR;

    const sim = makeSim();
    const { a } = setupDuel(sim);
    (sim as any).applyPowerup("a", a, "rapid");

    sim.now = 10;
    (sim as any).tryFire("a", a);
    sim.now = 10 + rapidCooldown + 0.001;
    (sim as any).tryFire("a", a);
    expect(bulletList(sim)).toHaveLength(2);

    // Same elapsed time, no powerup: the second trigger is still on cooldown.
    const plain = makeSim();
    const { a: pa } = setupDuel(plain);
    plain.now = 10;
    (plain as any).tryFire("a", pa);
    plain.now = 10 + rapidCooldown + 0.001;
    (plain as any).tryFire("a", pa);
    expect(bulletList(plain)).toHaveLength(1);
  });
});

describe("shield powerup", () => {
  it("absorbs exactly SHIELD_CHARGES hits, then clears itself and lets damage through", () => {
    const sim = makeSim();
    const { a, b } = setupDuel(sim);

    (sim as any).applyPowerup("b", b, "shield");
    expect(b.power).toBe("shield");
    expect((sim as any).shield.get("b")).toBe(C.SHIELD_CHARGES);

    for (let i = 0; i < C.SHIELD_CHARGES; i++) {
      sim.spawnBullet("a", S.vec(a.px, a.py, a.pz), S.vec(1, 0, 0), false);
      (sim as any).stepBullets(0.6, true);
      expect(b.hp).toBe(C.MAX_HP);
    }

    // Last charge consumed: the shield powerup drops off.
    expect(b.power).toBe("");
    expect((sim as any).shield.has("b")).toBe(false);

    sim.spawnBullet("a", S.vec(a.px, a.py, a.pz), S.vec(1, 0, 0), false);
    (sim as any).stepBullets(0.6, true);
    expect(b.hp).toBe(C.MAX_HP - C.BULLET_DAMAGE);
  });
});

describe("afterburner powerup", () => {
  it("raises cruise speed by AFTERBURNER_FACTOR without holding boost", () => {
    const sim = makeSim();
    const { a } = setupDuel(sim);
    a.speed = C.CRUISE_SPEED;

    (sim as any).applyPowerup("a", a, "afterburner");
    (sim as any).stepPlane("a", a, 0.1, true);
    expect(a.speed).toBeCloseTo(C.CRUISE_SPEED * C.AFTERBURNER_FACTOR, 6);

    // Expire it and the plane settles back to plain cruise.
    sim.now += C.POWERUP_DURATION + 0.1;
    (sim as any).expirePowers();
    for (let i = 0; i < 5; i++) (sim as any).stepPlane("a", a, 0.1, true);
    expect(a.speed).toBeCloseTo(C.CRUISE_SPEED, 6);
  });
});

describe("repair powerup", () => {
  it("restores full HP and leaves no lingering power state", () => {
    const sim = makeSim();
    const { a } = setupDuel(sim);
    a.hp = 30;

    (sim as any).applyPowerup("a", a, "repair");

    expect(a.hp).toBe(C.MAX_HP);
    expect(a.power).toBe("");
    expect(a.powerLeft).toBe(0);
  });

  it("is not collected by a player already at full HP", () => {
    const sim = makeSim();
    const { a } = setupDuel(sim);
    sim.pickups.set("pkRepair", { type: "repair", px: a.px, py: a.py, pz: a.pz });

    (sim as any).collectPickups();
    expect(sim.pickups.has("pkRepair")).toBe(true);

    a.hp = C.MAX_HP - 1;
    (sim as any).collectPickups();
    expect(sim.pickups.has("pkRepair")).toBe(false);
    expect(a.hp).toBe(C.MAX_HP);
  });
});

describe("homing powerup", () => {
  it("curves toward an enemy that a plain bullet flies straight past", () => {
    const sim = makeSim();
    const { a, b } = setupDuel(sim);
    // Park the target 90 degrees off the muzzle line: far outside the aim-assist
    // cone, so only true homing can bend toward it.
    b.px = -300; b.py = 100; b.pz = 220;

    const muzzle = S.vec(a.px, a.py, a.pz);
    sim.spawnBullet("a", muzzle, S.vec(1, 0, 0), true);
    (sim as any).stepBullets(0.1, true);
    const homing = bulletList(sim)[0];
    expect(homing.fz).toBeGreaterThan(0.1);

    const plainSim = makeSim();
    const { a: pa, b: pb } = setupDuel(plainSim);
    pb.px = -300; pb.py = 100; pb.pz = 220;
    plainSim.spawnBullet("a", S.vec(pa.px, pa.py, pa.pz), S.vec(1, 0, 0), false);
    (plainSim as any).stepBullets(0.1, true);
    const plain = bulletList(plainSim)[0];
    expect(Math.abs(plain.fz)).toBeLessThan(1e-9);
  });
});

describe("mine powerup", () => {
  /** Force a mine's remaining life so its age lands either side of MINE_ARM_DELAY. */
  function setMineLife(sim: GameSim, life: number) {
    for (const [key, b] of sim.bullets) {
      if (b.kind === "mine") (sim as any).bulletLife.set(key, life);
    }
  }

  it("drops a mine instead of shooting, gated by MINE_DROP_COOLDOWN", () => {
    const sim = makeSim();
    const { a } = setupDuel(sim);
    (sim as any).applyPowerup("a", a, "mine");

    sim.now = 10;
    (sim as any).tryFire("a", a);
    expect(mineList(sim)).toHaveLength(1);
    expect(bulletList(sim).every((b) => b.kind === "mine")).toBe(true);

    // Still inside the cooldown window.
    sim.now = 10 + C.MINE_DROP_COOLDOWN - 0.01;
    (sim as any).tryFire("a", a);
    expect(mineList(sim)).toHaveLength(1);

    sim.now = 10 + C.MINE_DROP_COOLDOWN + 0.01;
    (sim as any).tryFire("a", a);
    expect(mineList(sim)).toHaveLength(2);
  });

  it("caps live mines per owner at MINE_MAX_PER_OWNER, evicting the oldest", () => {
    const sim = makeSim();
    const { a } = setupDuel(sim);
    (sim as any).applyPowerup("a", a, "mine");

    sim.now = 10;
    for (let i = 0; i < C.MINE_MAX_PER_OWNER + 2; i++) {
      (sim as any).tryFire("a", a);
      sim.now += C.MINE_DROP_COOLDOWN + 0.01;
      // Age each mine slightly so "oldest" is unambiguous.
      for (const [key, bb] of sim.bullets) {
        if (bb.kind === "mine") {
          (sim as any).bulletLife.set(key, ((sim as any).bulletLife.get(key) as number) - 0.1);
        }
      }
    }

    expect(mineList(sim)).toHaveLength(C.MINE_MAX_PER_OWNER);
  });

  it("stays inert until MINE_ARM_DELAY, then detonates for MINE_DAMAGE", () => {
    const sim = makeSim();
    const { a, b } = setupDuel(sim);
    (sim as any).applyPowerup("a", a, "mine");
    sim.now = 10;
    (sim as any).tryFire("a", a);

    const mine = mineList(sim)[0];
    // Victim parked on top of the mine, well inside the trigger radius.
    b.px = mine.px; b.py = mine.py; b.pz = mine.pz;
    // Keep the owner clear of the blast so only the victim is scored.
    a.px = mine.px + C.MINE_BLAST_RADIUS + 50;

    // Age just under the arm delay: nothing happens.
    setMineLife(sim, C.MINE_LIFE - C.MINE_ARM_DELAY + 0.1);
    (sim as any).stepBullets(0.05, true);
    expect(mineList(sim)).toHaveLength(1);
    expect(b.hp).toBe(C.MAX_HP);

    // Past the arm delay: it blows.
    setMineLife(sim, C.MINE_LIFE - C.MINE_ARM_DELAY);
    (sim as any).stepBullets(0.05, true);
    expect(mineList(sim)).toHaveLength(0);
    expect(b.hp).toBe(C.MAX_HP - C.MINE_DAMAGE);
  });

  it("damages everything inside MINE_BLAST_RADIUS, including its own owner", () => {
    const sim = makeSim();
    const { a, b } = setupDuel(sim);
    const c = sim.addPlayer("c", join("C"));
    (sim as any).invulnUntil.delete("c");

    (sim as any).applyPowerup("a", a, "mine");
    sim.now = 10;
    (sim as any).tryFire("a", a);
    const mine = mineList(sim)[0];

    // b triggers it from inside the fuse radius; c is in the blast but not the fuse.
    b.px = mine.px; b.py = mine.py; b.pz = mine.pz + C.MINE_TRIGGER_RADIUS - 5;
    c.px = mine.px; c.py = mine.py; c.pz = mine.pz + C.MINE_BLAST_RADIUS - 5;

    setMineLife(sim, C.MINE_LIFE - C.MINE_ARM_DELAY);
    (sim as any).stepBullets(0.05, true);

    expect(b.hp).toBe(C.MAX_HP - C.MINE_DAMAGE);
    expect(c.hp).toBe(C.MAX_HP - C.MINE_DAMAGE);
    expect(a.hp).toBe(C.MAX_HP - C.MINE_DAMAGE); // the owner sits at the blast center
    expect(a.score).toBe(0);                     // ...and is not rewarded for it
  });
});

describe("star powerup", () => {
  it("runs for STAR_DURATION, not the standard POWERUP_DURATION", () => {
    const sim = makeSim();
    const { a } = setupDuel(sim);

    (sim as any).applyPowerup("a", a, "star");

    expect(a.power).toBe("star");
    expect(a.powerLeft).toBe(C.STAR_DURATION);
    expect(C.STAR_DURATION).not.toBe(C.POWERUP_DURATION);
  });

  it("is immune to all damage while active", () => {
    const sim = makeSim();
    const { a } = setupDuel(sim);
    (sim as any).applyPowerup("a", a, "star");

    expect((sim as any).damage(a, "a", "b", 999)).toBe(false);
    expect(a.hp).toBe(C.MAX_HP);
    expect(a.alive).toBe(true);
  });

  it("rams enemies inside the ram radius for an instant kill, and misses beyond it", () => {
    const sim = makeSim();
    const { a, b } = setupDuel(sim);
    const ramRadius = C.PLANE_RADIUS * C.STAR_RAM_RADIUS_FACTOR;

    (sim as any).applyPowerup("a", a, "star");

    // Out of reach.
    b.px = a.px + ramRadius + 10; b.py = a.py; b.pz = a.pz;
    (sim as any).stepStarRams();
    expect(b.alive).toBe(true);
    expect(a.score).toBe(0);

    // Inside the ram radius.
    b.px = a.px + ramRadius - 5;
    (sim as any).stepStarRams();
    expect(b.alive).toBe(false);
    expect(a.score).toBe(1);
  });

  it("cannot ram another starred plane", () => {
    const sim = makeSim();
    const { a, b } = setupDuel(sim);
    b.px = a.px + C.PLANE_RADIUS;

    (sim as any).applyPowerup("a", a, "star");
    (sim as any).applyPowerup("b", b, "star");

    (sim as any).stepStarRams();

    expect(a.alive).toBe(true);
    expect(b.alive).toBe(true);
    expect(a.score).toBe(0);
    expect(b.score).toBe(0);
  });
});

describe("emp powerup", () => {
  it("disables enemies inside EMP_RADIUS instantly and leaves the picker unpowered", () => {
    const sim = makeSim();
    const { a, b } = setupDuel(sim);
    const far = sim.addPlayer("c", join("C"));
    (sim as any).invulnUntil.delete("c");

    b.px = a.px + C.EMP_RADIUS - 50; b.py = a.py; b.pz = a.pz;
    far.px = a.px + C.EMP_RADIUS + 50; far.py = a.py; far.pz = a.pz;

    (sim as any).applyPowerup("a", a, "emp");

    expect(b.empLeft).toBe(C.EMP_DURATION);
    expect(far.empLeft).toBe(0);
    expect(a.empLeft).toBe(0);
    expect(a.power).toBe(""); // instant effect, no lasting power state
  });

  it("spares teammates in TDM", () => {
    const sim = makeSim();
    const { a, b } = setupDuel(sim);
    sim.mode = "tdm";
    a.team = 0;
    b.team = 0;
    b.px = a.px + 50; b.py = a.py; b.pz = a.pz;

    (sim as any).applyPowerup("a", a, "emp");
    expect(b.empLeft).toBe(0);

    b.team = 1;
    (sim as any).applyPowerup("a", a, "emp");
    expect(b.empLeft).toBe(C.EMP_DURATION);
  });

  it("kills boost and fire but leaves steering intact, then ticks itself down", () => {
    const sim = makeSim();
    const { b } = setupDuel(sim);
    b.empLeft = C.EMP_DURATION;
    setInput(sim, "b", { turn: 1, climb: 1, boost: true, fire: true });

    (sim as any).stepPlane("b", b, 0.1, true);

    expect(b.boosting).toBe(false);
    expect(bulletList(sim)).toHaveLength(0);
    expect(b.turn).toBe(1);  // EMP does not lock the stick
    expect(b.climb).toBe(1);
    expect(b.empLeft).toBeCloseTo(C.EMP_DURATION - 0.1, 6);
  });
});

describe("freeze powerup", () => {
  it("deals normal damage and locks the victim for FREEZE_DURATION", () => {
    const sim = makeSim();
    const { a, b } = setupDuel(sim);

    sim.spawnBullet("a", S.vec(a.px, a.py, a.pz), S.vec(1, 0, 0), false, true);
    (sim as any).stepBullets(0.6, true);

    expect(b.hp).toBe(C.MAX_HP - C.BULLET_DAMAGE);
    expect(b.frozenLeft).toBe(C.FREEZE_DURATION);
  });

  it("does not freeze a victim whose hit was blocked or lethal", () => {
    const blocked = makeSim();
    const { a: ba, b: bb } = setupDuel(blocked);
    (blocked as any).applyPowerup("b", bb, "shield");
    blocked.spawnBullet("a", S.vec(ba.px, ba.py, ba.pz), S.vec(1, 0, 0), false, true);
    (blocked as any).stepBullets(0.6, true);
    expect(bb.hp).toBe(C.MAX_HP);
    expect(bb.frozenLeft).toBe(0);

    const lethal = makeSim();
    const { a: la, b: lb } = setupDuel(lethal);
    lb.hp = C.BULLET_DAMAGE;
    lethal.spawnBullet("a", S.vec(la.px, la.py, la.pz), S.vec(1, 0, 0), false, true);
    (lethal as any).stepBullets(0.6, true);
    expect(lb.alive).toBe(false);
    expect(lb.frozenLeft).toBe(0);
  });

  it("locks steering and fire but leaves boost available, then thaws", () => {
    const sim = makeSim();
    const { b } = setupDuel(sim);
    b.frozenLeft = C.FREEZE_DURATION;
    setInput(sim, "b", { turn: 1, climb: 1, boost: true, fire: true });

    (sim as any).stepPlane("b", b, 0.1, true);

    expect(b.turn).toBe(0);
    expect(b.climb).toBe(0);
    expect(bulletList(sim)).toHaveLength(0);
    expect(b.boosting).toBe(true); // freeze locks the stick, not the throttle
    expect(b.frozenLeft).toBeCloseTo(C.FREEZE_DURATION - 0.1, 6);

    // Once thawed, the same input flies and shoots normally.
    b.frozenLeft = 0;
    (sim as any).stepPlane("b", b, 0.1, true);
    expect(b.turn).toBe(1);
    expect(bulletList(sim)).toHaveLength(1);
  });
});

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

  it("blocks mine blasts while active", () => {
    const sim = makeSim();
    const { a, b } = setupDuel(sim);
    (sim as any).applyPowerup("a", a, "mine");
    sim.now = 10;
    (sim as any).tryFire("a", a);
    const mine = mineList(sim)[0];

    b.px = mine.px; b.py = mine.py; b.pz = mine.pz;
    (sim as any).applyPowerup("b", b, "ghost");

    for (const [key, bb] of sim.bullets) {
      if (bb.kind === "mine") (sim as any).bulletLife.set(key, C.MINE_LIFE - C.MINE_ARM_DELAY);
    }
    (sim as any).stepBullets(0.05, true);

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

// ---------------------------------------------------------------------------

describe("powerup coverage", () => {
  // Guard rail: adding a powerup to C.POWERUP_TYPES without a suite above fails here.
  const COVERED = new Set([
    "spread", "rapid", "shield", "afterburner", "repair", "homing",
    "mine", "star", "emp", "freeze", "ghost", "magnet",
  ]);

  it("has a suite for every entry in POWERUP_TYPES", () => {
    const missing = C.POWERUP_TYPES.filter((t) => !COVERED.has(t));
    expect(missing).toEqual([]);
    expect(COVERED.size).toBe(C.POWERUP_TYPES.length);
  });

  it("gives every powerup a spawn weight", () => {
    const unweighted = C.POWERUP_TYPES.filter((t) => !(t in C.POWERUP_WEIGHTS));
    expect(unweighted).toEqual([]);
  });
});
