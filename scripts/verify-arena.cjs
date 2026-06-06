/* Verification harness for arena-content: drives the REAL compiled ArenaRoom collision
   methods to prove the no-environment-damage invariant + cover/deflect/spawn behaviour.
   Run: node scripts/verify-arena.cjs   (after `npm run build`) */
const C = require("../dist/shared/constants.js");
const { ArenaState, Player, Bullet } = require("../dist/schema/ArenaState.js");
const { ArenaRoom } = require("../dist/rooms/ArenaRoom.js");

let pass = 0, fail = 0;
const ok = (name, cond, extra) => { (cond ? pass++ : fail++); console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`); };

// Build a bare ArenaRoom instance and give it the minimal state the methods touch.
function mkRoom() {
  const r = new ArenaRoom();
  r.state = new ArenaState();
  r.now = 100;            // past any invuln window
  r.broadcast = () => {}; // stub (only called on a kill, which we avoid)
  return r;
}
function mkPlayer(id, x, y, room, { bot = false, angle = 0 } = {}) {
  const p = new Player();
  p.name = id; p.x = x; p.y = y; p.angle = angle; p.hp = C.MAX_HP; p.alive = true; p.bot = bot;
  room.state.players.set(id, p);
  room.inputs.set(id, { turn: 0, boost: false, fire: false });
  room.speed.set(id, C.CRUISE_SPEED);
  return p;
}

// ---- T1: segCircleT entry parameter ----
{
  const r = mkRoom();
  const t1 = r.segCircleT(0, 0, 100, 0, 50, 0, 10);   // crosses at x=40 → t=0.4
  ok("T1a segCircleT crossing entry t≈0.4", Math.abs(t1 - 0.4) < 1e-6, `t=${t1}`);
  const t2 = r.segCircleT(0, 0, 100, 0, 50, 50, 10);  // miss
  ok("T1b segCircleT miss → Infinity", t2 === Infinity);
  const t3 = r.segCircleT(50, 0, 150, 0, 50, 0, 10);  // starts inside → 0
  ok("T1c segCircleT starts-inside → 0", t3 === 0, `t=${t3}`);
}

// ---- T2: bullet earliest-hit — cover protects a hidden plane, but an exposed plane is hit ----
function runBullet(planeX) {
  const r = mkRoom();
  // solid bullet-blocking obstacle at (500,500) r=60 (temporarily override the map for a clean test)
  const realObs = C.OBSTACLES.slice();
  C.OBSTACLES.length = 0;
  C.OBSTACLES.push({ x: 500, y: 500, radius: 60, height: 100, kind: "spire" });
  const victim = mkPlayer("V", planeX, 500, r);
  const b = new Bullet(); b.x = 300; b.y = 500; b.angle = 0; b.owner = "S"; b.homing = false;
  b.__life = C.BULLET_LIFE; b.__key = "b0";
  r.state.bullets.set("b0", b);
  for (let i = 0; i < 200 && r.state.bullets.size; i++) r.stepBullets(0.033, true);
  C.OBSTACLES.length = 0; realObs.forEach((o) => C.OBSTACLES.push(o)); // restore
  return victim.hp;
}
ok("T2a plane HIDDEN behind cover takes NO damage", runBullet(640) === C.MAX_HP, `hp=${runBullet(640)}`);
ok("T2b plane EXPOSED in front of cover is hit", runBullet(440) < C.MAX_HP, `hp=${runBullet(440)}`);

// ---- T3: solid obstacle deflects a plane to its surface, HP unchanged (NO environment damage) ----
{
  const r = mkRoom();
  const realObs = C.OBSTACLES.slice();
  C.OBSTACLES.length = 0;
  C.OBSTACLES.push({ x: 500, y: 500, radius: 60, height: 100, kind: "spire" });
  const p = mkPlayer("P", 520, 500, r); // overlapping the obstacle (20 from centre, rr=80)
  const hp0 = p.hp;
  r.stepPlane("P", p, 0.033, true);
  const d = Math.hypot(p.x - 500, p.y - 500);
  const rr = 60 + C.PLANE_RADIUS;
  C.OBSTACLES.length = 0; realObs.forEach((o) => C.OBSTACLES.push(o));
  ok("T3a plane pushed out to obstacle surface", Math.abs(d - rr) < 1.0, `dist=${d.toFixed(1)} target=${rr}`);
  ok("T3b plane HP unchanged by deflection", p.hp === hp0, `hp=${p.hp}`);
}

// ---- T4: a full multi-tick run with the REAL map — no plane ever loses HP to the environment ----
{
  const r = mkRoom();
  // 6 bots flying through the real obstacle field; only the sim runs, no firing.
  const ids = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const id = "p" + i;
    mkPlayer(id, C.HOTSPOT.x + Math.cos(a) * 200, C.HOTSPOT.y + Math.sin(a) * 200, r, { angle: a + Math.PI });
    ids.push(id);
  }
  let minHp = C.MAX_HP;
  for (let t = 0; t < 600; t++) { // ~20s of sim
    for (const id of ids) { const p = r.state.players.get(id); if (p && p.alive) r.stepPlane(id, p, 0.033, true); }
    for (const id of ids) { const p = r.state.players.get(id); if (p) minHp = Math.min(minHp, p.hp); }
  }
  ok("T4 no plane loses HP flying the real map (no fire)", minHp === C.MAX_HP, `minHp=${minHp}`);
}

// ---- T5: pickup spawn weighting — centre-skewed, never inside solid cover ----
{
  const r = mkRoom();
  let inSolid = 0, center = 0, edge = 0;
  const N = 8000;
  for (let i = 0; i < N; i++) {
    const pos = r.pickPickupPos();
    if (r.insideSolid(pos.x, pos.y, C.PICKUP_RADIUS)) inSolid++;
    const d = Math.hypot(pos.x - C.HOTSPOT.x, pos.y - C.HOTSPOT.y);
    if (d <= C.ZONES.midR) center++; else edge++;
  }
  ok("T5a no pickup spawns inside solid cover", inSolid === 0, `inSolid=${inSolid}/${N}`);
  ok("T5b spawns skew toward the centre", center > edge, `center=${center} edge=${edge}`);
}

// ---- T6: respawn never lands inside solid cover ----
{
  const r = mkRoom();
  let bad = 0;
  for (let i = 0; i < 4000; i++) { const s = r.pickSpawn(); if (r.insideSolid(s.x, s.y, C.PLANE_RADIUS)) bad++; }
  ok("T6 respawn clear of solid cover", bad === 0, `bad=${bad}/4000`);
}

// ---- map sanity ----
{
  let oob = 0;
  for (const o of C.OBSTACLES) if (o.x < 0 || o.x > C.ARENA_WIDTH || o.y < 0 || o.y > C.ARENA_HEIGHT) oob++;
  ok("MAP all obstacles in-bounds", oob === 0, `oob=${oob}`);
  const solids = C.OBSTACLES.filter((o) => C.OBSTACLE_BEHAVIOR[o.kind].solid).length;
  const rings = C.OBSTACLES.filter((o) => !C.OBSTACLE_BEHAVIOR[o.kind].solid).length;
  console.log(`INFO  ${C.OBSTACLES.length} obstacles (${solids} solid cover, ${rings} fly-through rings)`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
