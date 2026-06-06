/* Verification for globe-arena: drives the REAL compiled sphere math + spherical ArenaRoom.
   Proves great-circle motion, angular hits, no environment damage, dynamic √N sizing, per-round
   stability, and spawn safety. Run: node scripts/verify-sphere.cjs  (after `npm run build`) */
const S = require("../dist/shared/sphere.js");
const C = require("../dist/shared/constants.js");
const { ArenaState, Player, Bullet } = require("../dist/schema/ArenaState.js");
const { ArenaRoom } = require("../dist/rooms/ArenaRoom.js");

let pass = 0, fail = 0;
const ok = (n, c, x) => { (c ? pass++ : fail++); console.log(`${c ? "PASS" : "FAIL"}  ${n}${x ? "  — " + x : ""}`); };
const near = (a, b, e = 1e-4) => Math.abs(a - b) <= e;
const isUnit = (v) => near(S.len(v), 1, 1e-6);

// ---------- sphere math ----------
{
  const p = S.vec(1, 0, 0), f = S.vec(0, 1, 0);
  const adv = S.advance(p, f, Math.PI / 2);
  ok("math advance π/2 rotates p→f", S.angBetween(adv.p, S.vec(0, 1, 0)) < 1e-6 && isUnit(adv.p), `p'=(${adv.p.x.toFixed(2)},${adv.p.y.toFixed(2)},${adv.p.z.toFixed(2)})`);
  ok("math advance keeps forward tangent", near(S.dot(adv.p, adv.f), 0, 1e-6));

  let q = { x: 1, y: 0, z: 0 }, ff = { x: 0, y: 1, z: 0 };
  for (let i = 0; i < 360; i++) { const a = S.advance(q, ff, (2 * Math.PI) / 360); q = a.p; ff = a.f; }
  ok("math advance full 2π returns to start", S.angBetween(q, S.vec(1, 0, 0)) < 1e-3);

  const f2 = S.turn(p, f, Math.PI / 2);
  ok("math turn rotates heading, stays tangent", near(S.angBetween(f, f2), Math.PI / 2, 1e-6) && near(S.dot(p, f2), 0, 1e-6));

  ok("math angBetween axes = π/2", near(S.angBetween(S.vec(1, 0, 0), S.vec(0, 1, 0)), Math.PI / 2));
  const m = S.slerp(S.vec(1, 0, 0), S.vec(0, 1, 0), 0.5);
  ok("math slerp midpoint", near(m.x, Math.SQRT1_2, 1e-3) && near(m.y, Math.SQRT1_2, 1e-3));

  const a = S.vec(1, 0, 0), b = S.vec(0, 1, 0);
  ok("math arcDist on-arc ≈ 0", S.arcDistToPoint(a, b, S.slerp(a, b, 0.5)) < 1e-3);
  ok("math arcDist off-arc ≈ π/2", near(S.arcDistToPoint(a, b, S.vec(0, 0, 1)), Math.PI / 2, 1e-3));
  ok("math randomDir is unit", isUnit(S.randomDir()));
}

// ---------- room harness ----------
function mkRoom() {
  const r = new ArenaRoom();
  r.state = new ArenaState();
  r.now = 100;
  r.state.radius = C.radiusForBodies(6);
  r.broadcast = () => {};
  return r;
}
const setP = (e, v) => { e.px = v.x; e.py = v.y; e.pz = v.z; };
const setF = (e, v) => { e.fx = v.x; e.fy = v.y; e.fz = v.z; };
const getP = (e) => S.vec(e.px, e.py, e.pz);
function addPlayer(r, id, pos, fwd) {
  const p = new Player(); p.name = id; p.hp = 100; p.alive = true;
  setP(p, pos); setF(p, fwd || S.anyTangent(pos));
  r.state.players.set(id, p); r.inputs.set(id, { turn: 0, boost: false, fire: false }); r.speed.set(id, C.CRUISE_SPEED);
  return p;
}
function withObstacles(list, fn) {
  const real = C.OBSTACLES.slice();
  C.OBSTACLES.length = 0; list.forEach((o) => C.OBSTACLES.push(o));
  try { return fn(); } finally { C.OBSTACLES.length = 0; real.forEach((o) => C.OBSTACLES.push(o)); }
}

// bullet earliest-hit on the sphere
function runBullet(victimT, obstacleT) {
  const r = mkRoom();
  const A = S.vec(1, 0, 0), B = S.slerp(A, S.normalize(S.vec(1, 0.4, 0)), 1); // target direction ~0.38 rad away
  const obs = obstacleT == null ? [] : [{ dir: S.slerp(A, B, obstacleT), angRadius: 0.05, height: 100, kind: "spire" }];
  return withObstacles(obs, () => {
    const victim = addPlayer(r, "V", S.slerp(A, B, victimT));
    const b = new Bullet(); setP(b, A); setF(b, S.tangentize(A, S.sub(B, A)));
    b.owner = "S"; b.homing = false; b.__life = C.BULLET_LIFE; b.__key = "b0";
    r.state.bullets.set("b0", b);
    for (let i = 0; i < 200 && r.state.bullets.size; i++) r.stepBullets(0.033, true, r.state.radius);
    return victim.hp;
  });
}
ok("room exposed plane is hit", runBullet(1.0, null) < 100, `hp=${runBullet(1.0, null)}`);
ok("room plane hidden behind cover takes NO damage", runBullet(1.0, 0.5) === 100, `hp=${runBullet(1.0, 0.5)}`);
ok("room exposed plane in front of cover still hit", runBullet(0.4, 0.7) < 100, `hp=${runBullet(0.4, 0.7)}`);

// no environment damage: real map, planes fly 20s, HP never drops
{
  const r = mkRoom();
  const ids = [];
  for (let i = 0; i < 6; i++) {
    const d = C.dirFromHotspot(0.3 + i * 0.05, (i / 6) * Math.PI * 2);
    addPlayer(r, "p" + i, d, S.turn(d, S.anyTangent(d), i)); ids.push("p" + i);
  }
  let minHp = 100;
  for (let t = 0; t < 600; t++) for (const id of ids) { const p = r.state.players.get(id); if (p && p.alive) { r.stepPlane(id, p, 0.033, true, r.state.radius); minHp = Math.min(minHp, p.hp); } }
  ok("room no HP lost flying the real map (no fire)", minHp === 100, `minHp=${minHp}`);
}

// planes stay on the unit sphere (no walls, valid positions) while flying straight + wrapping
{
  const r = mkRoom();
  const p = addPlayer(r, "w", S.vec(1, 0, 0), S.vec(0, 1, 0));
  let maxErr = 0;
  for (let t = 0; t < 2000; t++) { r.stepPlane("w", p, 0.033, true, r.state.radius); maxErr = Math.max(maxErr, Math.abs(S.len(getP(p)) - 1)); }
  ok("room position stays on the sphere (unbounded, no walls)", maxErr < 1e-3, `maxErr=${maxErr.toExponential(1)}`);
}

// dynamic √N sizing
{
  const r4 = C.radiusForBodies(4), r6 = C.radiusForBodies(6), r8 = C.radiusForBodies(8);
  ok("size monotonic with players (√N)", r4 < r6 && r6 < r8, `4→${r4|0} 6→${r6|0} 8→${r8|0}`);
  ok("size clamped to floor/ceiling", C.radiusForBodies(1) >= C.R_MIN && C.radiusForBodies(99) <= C.R_MAX, `min=${C.radiusForBodies(1)|0} max=${C.radiusForBodies(99)|0}`);
  ok("size follows sqrt ratio at base", near(C.radiusForBodies(6), C.R_BASE, 1), `R(6)=${C.radiusForBodies(6)|0} R_BASE=${C.R_BASE}`);
}

// per-round stability: radius fixed mid-round, recomputed only at round start
{
  const r = mkRoom(); r.sized = true; r.state.phase = "playing"; r.state.timeLeft = 50;
  for (let i = 0; i < 4; i++) addPlayer(r, "p" + i, S.randomDir());
  r.state.radius = 777; // pretend mid-round
  for (let t = 0; t < 30; t++) r.update(0.033); // players may change via bots, but radius must hold
  ok("radius stable within a round", r.state.radius === 777, `radius=${r.state.radius}`);
  // force the round to end → new round recomputes
  r.state.phase = "intermission"; r.state.timeLeft = 0.01; r.update(0.05);
  ok("radius recomputed at round start", r.state.radius === C.radiusForBodies(r.state.players.size), `radius=${r.state.radius|0} bodies=${r.state.players.size}`);
}

// spawn clear of solid cover (real map)
{
  const r = mkRoom();
  let bad = 0;
  for (let i = 0; i < 4000; i++) { const d = r.pickSpawnDir(); if (r.insideSolidAng(d, C.PLANE_RADIUS / r.state.radius)) bad++; }
  ok("spawn clear of solid cover", bad === 0, `bad=${bad}/4000`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
