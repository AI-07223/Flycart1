import { describe, it, expect } from "vitest";
import { ArenaRoom } from "../src/rooms/ArenaRoom";
import { ArenaState, Player, Pickup } from "../src/schema/ArenaState";
import * as C from "../src/shared/constants";
import * as S from "../src/shared/sphere";

function createRoom(): ArenaRoom {
  const room = new ArenaRoom();
  const state = new ArenaState();
  state.timeLeft = C.ROUND_SECONDS;
  state.phase = "playing";
  state.arenaHalf = C.MAP_HALF;
  state.floorY = C.GROUND_Y;
  state.ceilingY = C.MAX_ALT;

  (room as any).state = state;
  Object.defineProperty(room, "roomId", { value: "test-room", writable: true });
  (room as any).inputs = new Map();
  (room as any).lastShot = new Map();
  (room as any).respawnAt = new Map();
  (room as any).bots = new Map();
  (room as any).bulletLife = new Map();
  (room as any).powerUntil = new Map();
  (room as any).shield = new Map();
  (room as any).invulnUntil = new Map();
  (room as any).msgTimes = new Map();
  (room as any).now = 0;
  (room as any).bulletSeq = 0;
  (room as any).botSeq = 0;
  (room as any).pickupSeq = 0;
  (room as any).pickupAt = 0;
  (room as any).botsEnabled = false;
  return room;
}

function addPlayer(room: ArenaRoom, id: string, overrides: Partial<Player> = {}): Player {
  const p = new Player();
  p.name = overrides.name || id;
  p.bot = overrides.bot || false;
  p.alive = overrides.alive ?? true;
  p.hp = overrides.hp ?? C.MAX_HP;
  p.score = overrides.score ?? 0;
  p.skin = overrides.skin ?? 0;
  p.speed = overrides.speed ?? C.CRUISE_SPEED;
  p.px = overrides.px ?? 0;
  p.py = overrides.py ?? C.SPAWN_ALT;
  p.pz = overrides.pz ?? 0;
  p.fx = overrides.fx ?? 1;
  p.fy = overrides.fy ?? 0;
  p.fz = overrides.fz ?? 0;
  (room as any).state.players.set(id, p);
  (room as any).inputs.set(id, { seq: 0, turn: 0, climb: 0, boost: false, fire: false });
  return p;
}

describe("ArenaRoom flat-world simulation", () => {
  it("spawn places players inside map and altitude bounds", () => {
    const room = createRoom();
    const p = new Player();

    (room as any).spawn("p1", p);

    expect(Math.abs(p.px)).toBeLessThanOrEqual(C.MAP_HALF);
    expect(Math.abs(p.pz)).toBeLessThanOrEqual(C.MAP_HALF);
    expect(p.py).toBeGreaterThanOrEqual(C.MIN_ALT);
    expect(p.py).toBeLessThanOrEqual(C.MAX_ALT);
    expect(p.speed).toBe(C.CRUISE_SPEED);
  });

  it("climb input raises altitude and pitch", () => {
    const room = createRoom();
    const p = addPlayer(room, "p1", { px: 0, py: C.SPAWN_ALT, pz: 0, fx: 1, fy: 0, fz: 0 });
    const input = (room as any).inputs.get("p1");

    input.climb = 1;
    (room as any).stepPlane("p1", p, 0.5, true);

    expect(p.py).toBeGreaterThan(C.SPAWN_ALT);
    expect(p.fy).toBeGreaterThan(0);
  });

  it("soft clamps outward flight at map edges", () => {
    const room = createRoom();
    const p = addPlayer(room, "p1", { px: C.MAP_HALF - 8, py: C.SPAWN_ALT, pz: 0, fx: 1, fy: 0, fz: 0 });

    (room as any).stepPlane("p1", p, 0.8, true);

    expect(p.px).toBeLessThanOrEqual(C.MAP_HALF);
    expect(p.fy).toBeGreaterThanOrEqual(-0.05);
  });

  it("pushes low-altitude planes away from landmarks", () => {
    const room = createRoom();
    const tower = C.LANDMARKS.find((landmark) => landmark.kind === "tower");
    if (!tower) throw new Error("Expected tower landmark");

    const p = addPlayer(room, "p1", {
      px: tower.x + tower.radius + C.PLANE_RADIUS + 4,
      py: tower.height - 20,
      pz: tower.z,
      fx: -1,
      fy: -0.15,
      fz: 0,
    });

    (room as any).stepPlane("p1", p, 0.15, true);

    const dx = p.px - tower.x;
    const dz = p.pz - tower.z;
    expect(dx * dx + dz * dz).toBeGreaterThanOrEqual((tower.radius + C.PLANE_RADIUS - 0.5) ** 2);
    expect(p.py).toBeGreaterThanOrEqual(tower.height + C.PLANE_RADIUS);
    expect(p.fy).toBeGreaterThan(0);
  });

  it("projectiles hit targets in 3D space", () => {
    const room = createRoom();
    const shooter = addPlayer(room, "p1", { px: -420, py: 100, pz: -220, fx: 1, fy: 0, fz: 0 });
    const victim = addPlayer(room, "p2", { px: -300, py: 100, pz: -220, fx: -1, fy: 0, fz: 0 });

    (room as any).spawnBullet(
      "p1",
      S.vec(shooter.px, shooter.py, shooter.pz),
      S.vec(shooter.fx, shooter.fy, shooter.fz),
      false,
    );
    (room as any).stepBullets(0.6, true);

    expect(victim.hp).toBe(C.MAX_HP - C.BULLET_DAMAGE);
  });

  it("pickups are collected using 3D distance", () => {
    const room = createRoom();
    const player = addPlayer(room, "p1", { px: 40, py: 90, pz: -10 });
    const pickup = new Pickup();

    pickup.type = "rapid";
    pickup.px = 50;
    pickup.py = 95;
    pickup.pz = -8;
    (room as any).state.pickups.set("pk0", pickup);
    (room as any).collectPickups();

    expect((room as any).state.pickups.size).toBe(0);
    expect(player.power).toBe("rapid");
  });
});
