import { Room, Client } from "colyseus";
import { ArenaState, Player, Bullet, Pickup } from "../schema/ArenaState";
import * as C from "../shared/constants";
import * as S from "../shared/sphere";
import * as leaderboard from "../leaderboard";

interface Input {
  turn: number; // -1, 0, 1
  boost: boolean;
  fire: boolean;
}

interface BotBrain {
  targetId: string | null;
  retargetAt: number;
  wander: number;
  react: number;
  aimErr: number;
  lead: number;
}

const ZERO_INPUT: Input = { turn: 0, boost: false, fire: false };

// ---- schema <-> Vec3 helpers ----
const getP = (e: { px: number; py: number; pz: number }): S.Vec3 => ({ x: e.px, y: e.py, z: e.pz });
const getF = (e: { fx: number; fy: number; fz: number }): S.Vec3 => ({ x: e.fx, y: e.fy, z: e.fz });
const setP = (e: { px: number; py: number; pz: number }, v: S.Vec3) => { e.px = v.x; e.py = v.y; e.pz = v.z; };
const setF = (e: { fx: number; fy: number; fz: number }, v: S.Vec3) => { e.fx = v.x; e.fy = v.y; e.fz = v.z; };
// signed angle to rotate `from` onto `to` about unit `normal` (matches S.turn's right-hand sense)
const signedAngle = (normal: S.Vec3, from: S.Vec3, to: S.Vec3): number =>
  Math.atan2(S.dot(S.cross(from, to), normal), S.dot(from, to));
// unit tangent at `fromPos` pointing along the geodesic toward `toPos`
const bearingTo = (fromPos: S.Vec3, toPos: S.Vec3): S.Vec3 => S.tangentize(fromPos, S.sub(toPos, fromPos));

export class ArenaRoom extends Room<ArenaState> {
  maxClients = C.MAX_CLIENTS;

  private inputs = new Map<string, Input>();
  private speed = new Map<string, number>();
  private lastShot = new Map<string, number>();
  private respawnAt = new Map<string, number>();
  private bots = new Map<string, BotBrain>();

  private now = 0;
  private bulletSeq = 0;
  private botSeq = 0;
  private pickupSeq = 0;
  private pickupAt = 0;
  private powerUntil = new Map<string, number>();
  private shield = new Map<string, number>();
  private invulnUntil = new Map<string, number>();
  private msgTimes = new Map<string, number[]>();
  private sized = false; // has the first round's radius been computed once bots filled?

  onCreate(options: { code?: string } = {}) {
    this.state = new ArenaState();
    this.state.timeLeft = C.ROUND_SECONDS;
    this.state.radius = C.radiusForBodies(C.MIN_PLAYERS);
    this.setMetadata({ code: options.code || "PUBLIC" });

    this.onMessage("input", (client, data: Partial<Input>) => {
      if (!this.rateOk(client.sessionId, C.INPUT_RATE_MAX)) return;
      const cur = this.inputs.get(client.sessionId) ?? { ...ZERO_INPUT };
      if (typeof data.turn === "number" && Number.isFinite(data.turn)) cur.turn = Math.max(-1, Math.min(1, data.turn));
      if (typeof data.boost === "boolean") cur.boost = data.boost;
      if (typeof data.fire === "boolean") cur.fire = data.fire;
      this.inputs.set(client.sessionId, cur);
    });

    this.onMessage("setName", (client, name: string) => {
      if (!this.rateOk(client.sessionId, C.NAME_RATE_MAX)) return;
      const p = this.state.players.get(client.sessionId);
      if (p && typeof name === "string") p.name = name.trim().slice(0, 14) || p.name;
    });

    this.setPatchRate(33);
    this.setSimulationInterval((dt) => this.update(Math.min(dt / 1000, C.DT_MAX)));
  }

  onJoin(client: Client, options: { name?: string; skin?: number } = {}) {
    const p = new Player();
    p.name = (options.name || "Pilot").trim().slice(0, 14) || "Pilot";
    const s = options.skin;
    p.skin = (typeof s === "number" && Number.isInteger(s) && s >= 0 && s < C.SKIN_COUNT)
      ? s : Math.floor(Math.random() * C.SKIN_COUNT); // validate; random fallback
    p.bot = false;
    this.spawn(client.sessionId, p);
    this.state.players.set(client.sessionId, p);
    this.inputs.set(client.sessionId, { ...ZERO_INPUT });
  }

  async onLeave(client: Client, consented?: boolean) {
    if (consented) { this.removePlayer(client.sessionId); return; }
    this.inputs.set(client.sessionId, { ...ZERO_INPUT });
    try {
      await this.allowReconnection(client, C.RECONNECT_WINDOW);
    } catch (e) {
      this.removePlayer(client.sessionId);
    }
  }

  // ---------- simulation ----------

  private update(dt: number) {
    this.now += dt;
    const playing = this.state.phase === "playing";
    const R = this.state.radius;
    this.maintainBots();
    // First-round sizing: once bots have filled to the floor, set the real radius once.
    if (!this.sized && this.state.players.size >= C.MIN_PLAYERS) { this.resizePlanet(); this.sized = true; }
    this.maintainPickups(R);
    this.updateTimer(dt);

    for (const [id, brain] of this.bots) this.thinkBot(id, brain, R);

    for (const [id, p] of this.state.players) {
      if (!p.alive) {
        const t = this.respawnAt.get(id) ?? 0;
        if (this.now >= t) this.spawn(id, p);
        continue;
      }
      this.stepPlane(id, p, dt, playing, R);
    }

    this.stepBullets(dt, playing, R);
    this.collectPickups(R);
    this.expirePowers();
  }

  private resizePlanet() {
    // Recompute the planet radius from the number of bodies (humans + bots). Positions are
    // directions and speeds are angular, so nothing teleports — only the rendered scale changes.
    this.state.radius = C.radiusForBodies(this.state.players.size);
  }

  private updateTimer(dt: number) {
    if (this.state.phase === "playing") {
      this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
      if (this.state.timeLeft <= 0) {
        // Round over: record each human's round score (best-kept) before scores reset next round.
        for (const [, p] of this.state.players) if (!p.bot && p.score > 0) leaderboard.record(p.name, p.score);
        this.state.phase = "intermission";
        this.state.timeLeft = C.ROUND_INTERMISSION;
      }
    } else {
      this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
      if (this.state.timeLeft <= 0) {
        // New round: resize the planet for the current lobby, wipe scores, respawn everyone.
        this.resizePlanet();
        for (const [id, p] of this.state.players) {
          p.score = 0;
          this.spawn(id, p);
        }
        this.state.phase = "playing";
        this.state.timeLeft = C.ROUND_SECONDS;
      }
    }
  }

  private stepPlane(id: string, p: Player, dt: number, playing: boolean, R: number) {
    const input = this.inputs.get(id) ?? ZERO_INPUT;
    let pos = getP(p), fwd = getF(p);

    // turn (rotate heading about the surface normal)
    fwd = S.turn(pos, fwd, input.turn * C.TURN_RATE * dt);
    p.boosting = input.boost;

    // speed easing (linear surface speed)
    let target = input.boost ? C.BOOST_SPEED : C.CRUISE_SPEED;
    if (p.power === "afterburner") target *= C.AFTERBURNER_FACTOR;
    const before = this.speed.get(id) ?? C.CRUISE_SPEED;
    let s = before + Math.sign(target - before) * C.ACCEL * dt;
    if ((target - s) * (target - before) < 0) s = target;
    this.speed.set(id, s);

    // great-circle advance by angular distance (linear speed / radius)
    const adv = S.advance(pos, fwd, (s / R) * dt);
    pos = adv.p; fwd = adv.f;

    // solid obstacles: deflect/slide off (cover) — NEVER touches hp (no environment damage)
    const planeAng = C.PLANE_RADIUS / R;
    for (const o of C.OBSTACLES) {
      if (!C.OBSTACLE_BEHAVIOR[o.kind].solid) continue;
      const sep = S.angBetween(pos, o.dir);
      const rr = o.angRadius + planeAng;
      if (sep < rr) {
        pos = sep > 1e-4 ? S.slerp(o.dir, pos, rr / sep) : S.advance(o.dir, S.anyTangent(o.dir), rr).p;
        fwd = this.deflectSphere(pos, fwd, o.dir);
      }
    }

    setP(p, pos); setF(p, S.tangentize(pos, fwd));
    if (input.fire && playing) this.tryFire(id, p, R);
  }

  // Steer forward away from an obstacle by blending toward the outward tangent (reuses the 0.35 feel).
  private deflectSphere(pos: S.Vec3, fwd: S.Vec3, oDir: S.Vec3): S.Vec3 {
    const outward = S.tangentize(pos, S.sub(pos, oDir));
    const a = signedAngle(pos, fwd, outward);
    return S.turn(pos, fwd, a * 0.35);
  }

  private rateOk(id: string, max: number): boolean {
    const now = Date.now();
    let arr = this.msgTimes.get(id);
    if (!arr) { arr = []; this.msgTimes.set(id, arr); }
    while (arr.length && now - arr[0] > 1000) arr.shift();
    if (arr.length >= max) return false;
    arr.push(now);
    return true;
  }

  private tryFire(id: string, p: Player, R: number) {
    this.invulnUntil.delete(id);
    const last = this.lastShot.get(id) ?? -999;
    const cd = C.FIRE_COOLDOWN * (p.power === "rapid" ? C.RAPID_FACTOR : 1);
    if (this.now - last < cd) return;
    this.lastShot.set(id, this.now);

    const pos = getP(p), fwd = getF(p);
    if (p.power === "spread") {
      this.spawnBullet(id, pos, S.turn(pos, fwd, -C.SPREAD_ANGLE), false, R);
      this.spawnBullet(id, pos, fwd, false, R);
      this.spawnBullet(id, pos, S.turn(pos, fwd, C.SPREAD_ANGLE), false, R);
    } else {
      this.spawnBullet(id, pos, fwd, p.power === "homing", R);
    }
  }

  private spawnBullet(id: string, pos: S.Vec3, fwd: S.Vec3, homing: boolean, R: number) {
    const b = new Bullet();
    const start = S.advance(pos, fwd, (C.PLANE_RADIUS + 6) / R); // emit just ahead of the nose
    setP(b, start.p); setF(b, start.f);
    b.owner = id;
    b.homing = homing;
    const key = "b" + this.bulletSeq++;
    (b as any).__life = C.BULLET_LIFE;
    (b as any).__key = key;
    this.state.bullets.set(key, b);
  }

  private stepBullets(dt: number, playing: boolean, R: number) {
    const hitAng = (C.PLANE_RADIUS + C.BULLET_RADIUS) / R;
    const bulletThin = C.BULLET_RADIUS / R;
    for (const [key, b] of this.state.bullets) {
      const life = ((b as any).__life ?? C.BULLET_LIFE) - dt;
      if (life <= 0) { this.state.bullets.delete(key); continue; }
      (b as any).__life = life;

      let pos = getP(b), fwd = getF(b);

      if (b.homing) {
        let best: Player | undefined; let bestD = Infinity;
        for (const [pid, tp] of this.state.players) {
          if (!tp.alive || pid === b.owner) continue;
          const d = S.angBetween(pos, getP(tp));
          if (d < bestD) { bestD = d; best = tp; }
        }
        if (best) {
          const desired = bearingTo(pos, getP(best));
          const a = signedAngle(pos, fwd, desired);
          const max = C.HOMING_TURN * dt;
          fwd = S.turn(pos, fwd, Math.max(-max, Math.min(max, a)));
        }
      }

      const oldPos = pos;
      const adv = S.advance(pos, fwd, (C.BULLET_SPEED / R) * dt);
      pos = adv.p; fwd = adv.f;

      // earliest hit along the geodesic arc: bullet-blocking obstacle (no damage) vs enemy plane
      let bestT = Infinity, victim: Player | null = null, victimId = "", hit = false;
      if (playing) {
        for (const [pid, pl] of this.state.players) {
          if (!pl.alive || pid === b.owner) continue;
          if (S.arcDistToPoint(oldPos, pos, getP(pl)) <= hitAng) {
            const t = S.arcClosestT(oldPos, pos, getP(pl));
            if (t < bestT) { bestT = t; victim = pl; victimId = pid; hit = true; }
          }
        }
      }
      for (const o of C.OBSTACLES) {
        if (!C.OBSTACLE_BEHAVIOR[o.kind].blocksBullets) continue;
        if (S.arcDistToPoint(oldPos, pos, o.dir) <= o.angRadius + bulletThin) {
          const t = S.arcClosestT(oldPos, pos, o.dir);
          if (t < bestT) { bestT = t; victim = null; hit = true; }
        }
      }
      if (hit) {
        if (victim) this.damage(victim, victimId, b.owner); // obstacle (victim===null) deals no damage
        this.state.bullets.delete(key);
      } else {
        setP(b, pos); setF(b, fwd);
      }
    }
  }

  private damage(p: Player, victimId: string, killerId: string) {
    if (this.now < (this.invulnUntil.get(victimId) ?? 0)) return;
    const sh = this.shield.get(victimId) ?? 0;
    if (sh > 0) {
      this.shield.set(victimId, sh - 1);
      if (sh - 1 <= 0) { this.shield.delete(victimId); if (p.power === "shield") this.clearPower(victimId, p); }
      return;
    }
    p.hp -= C.BULLET_DAMAGE;
    if (p.hp <= 0) {
      p.hp = 0;
      p.alive = false;
      this.clearPower(victimId, p);
      this.respawnAt.set(victimId, this.now + C.RESPAWN_DELAY);
      const killer = this.state.players.get(killerId);
      if (killer && killerId !== victimId) killer.score += 1;
      this.broadcast("kill", {
        killer: killerId,
        victim: victimId,
        killerName: killer ? killer.name : "?",
        victimName: p.name,
      });
    }
  }

  // ---------- powerups ----------

  private maintainPickups(R: number) {
    if (this.state.pickups.size >= C.PICKUP_MAX || this.now < this.pickupAt) return;
    this.pickupAt = this.now + C.PICKUP_INTERVAL;
    const pk = new Pickup();
    pk.type = this.weightedPowerup();
    const dir = this.pickPickupDir(R);
    setP(pk, dir);
    this.state.pickups.set("pk" + this.pickupSeq++, pk);
  }

  // Weighted toward the hotspot (angular power law), never inside solid cover.
  private pickPickupDir(R: number): S.Vec3 {
    const pad = C.PICKUP_RADIUS / R;
    let last = C.HOTSPOT_DIR;
    for (let i = 0; i < C.SPAWN_REROLL; i++) {
      const ang = Math.PI * Math.pow(Math.random(), C.HOTSPOT_BIAS); // small angle from hotspot more likely
      const az = Math.random() * Math.PI * 2;
      const dir = C.dirFromHotspot(ang, az);
      last = dir;
      if (!this.insideSolidAng(dir, pad)) return last;
    }
    for (let pass = 0; pass < 3; pass++) { // guarantee clear of cover
      let moved = false;
      for (const o of C.OBSTACLES) {
        if (!C.OBSTACLE_BEHAVIOR[o.kind].solid) continue;
        const rr = o.angRadius + pad + 0.01;
        if (S.angBetween(last, o.dir) < rr) { last = S.slerp(o.dir, last, rr / Math.max(1e-4, S.angBetween(last, o.dir))); moved = true; }
      }
      if (!moved) break;
    }
    return last;
  }

  private insideSolidAng(dir: S.Vec3, pad: number): boolean {
    for (const o of C.OBSTACLES) {
      if (!C.OBSTACLE_BEHAVIOR[o.kind].solid) continue;
      if (S.angBetween(dir, o.dir) <= o.angRadius + pad) return true;
    }
    return false;
  }

  private weightedPowerup(): string {
    let total = 0;
    for (const t of C.POWERUP_TYPES) total += C.POWERUP_WEIGHTS[t] ?? 1;
    let r = Math.random() * total;
    for (const t of C.POWERUP_TYPES) { r -= C.POWERUP_WEIGHTS[t] ?? 1; if (r <= 0) return t; }
    return C.POWERUP_TYPES[0];
  }

  private collectPickups(R: number) {
    const hitAng = (C.PICKUP_RADIUS + C.PLANE_RADIUS) / R;
    for (const [key, pk] of this.state.pickups) {
      const pkPos = getP(pk);
      for (const [pid, p] of this.state.players) {
        if (!p.alive) continue;
        if (S.angBetween(getP(p), pkPos) <= hitAng) {
          if (pk.type === "repair" && p.hp >= C.MAX_HP) continue;
          this.applyPowerup(pid, p, pk.type);
          this.state.pickups.delete(key);
          this.broadcast("pickup", { by: pid, type: pk.type });
          break;
        }
      }
    }
  }

  private applyPowerup(id: string, p: Player, type: string) {
    if (type === "repair") { p.hp = C.MAX_HP; return; }
    this.shield.delete(id);
    p.power = type;
    p.powerLeft = C.POWERUP_DURATION;
    this.powerUntil.set(id, this.now + C.POWERUP_DURATION);
    if (type === "shield") this.shield.set(id, C.SHIELD_CHARGES);
  }

  private clearPower(id: string, p: Player | undefined) {
    this.powerUntil.delete(id);
    this.shield.delete(id);
    if (p) { p.power = ""; p.powerLeft = 0; }
  }

  private expirePowers() {
    for (const [id, until] of this.powerUntil) {
      if (this.now >= until) {
        this.clearPower(id, this.state.players.get(id));
      } else {
        const p = this.state.players.get(id);
        if (p) p.powerLeft = Math.max(0, until - this.now);
      }
    }
  }

  // ---------- spawning / lifecycle ----------

  private spawn(id: string, p: Player) {
    const pos = this.pickSpawnDir();
    setP(p, pos);
    setF(p, S.turn(pos, S.anyTangent(pos), Math.random() * Math.PI * 2));
    p.hp = C.MAX_HP;
    p.alive = true;
    p.boosting = false;
    this.clearPower(id, p);
    this.speed.set(id, C.CRUISE_SPEED);
    this.lastShot.delete(id);
    this.invulnUntil.set(id, this.now + C.SPAWN_INVULN);
  }

  // Random surface point, biased away from the nearest alive enemy and clear of solid cover.
  private pickSpawnDir(): S.Vec3 {
    const pad = C.PLANE_RADIUS / this.state.radius + 0.02;
    let best: S.Vec3 | null = null, bestD = -1;
    let fallback = S.randomDir();
    for (let i = 0; i < C.SPAWN_REROLL; i++) {
      const d = S.randomDir();
      fallback = d;
      if (this.insideSolidAng(d, pad)) continue;
      let near = Infinity;
      for (const [, p] of this.state.players) {
        if (!p.alive) continue;
        const ad = S.angBetween(getP(p), d);
        if (ad < near) near = ad;
      }
      if (near > bestD) { bestD = near; best = d; }
    }
    return best ?? fallback;
  }

  private removePlayer(id: string) {
    this.state.players.delete(id);
    this.inputs.delete(id);
    this.speed.delete(id);
    this.lastShot.delete(id);
    this.respawnAt.delete(id);
    this.bots.delete(id);
    this.powerUntil.delete(id);
    this.shield.delete(id);
    this.invulnUntil.delete(id);
    this.msgTimes.delete(id);
  }

  // ---------- bots ----------

  private maintainBots() {
    const total = this.state.players.size;
    if (total < C.MIN_PLAYERS) {
      this.addBot();
    } else if (this.bots.size > 0 && total > C.MIN_PLAYERS) {
      const firstBot = this.bots.keys().next().value as string | undefined;
      if (firstBot) this.removePlayer(firstBot);
    }
  }

  private addBot() {
    const id = "bot_" + this.botSeq++;
    const p = new Player();
    p.name = C.BOT_NAMES[Math.floor(Math.random() * C.BOT_NAMES.length)];
    p.skin = Math.floor(Math.random() * C.SKIN_COUNT);
    p.bot = true;
    this.spawn(id, p);
    this.state.players.set(id, p);
    this.inputs.set(id, { ...ZERO_INPUT });
    const skill = Math.random();
    this.bots.set(id, {
      targetId: null, retargetAt: 0, wander: Math.random() * Math.PI * 2,
      react: 1.2 + (1 - skill) * 2.2,
      aimErr: 0.02 + (1 - skill) * 0.22,
      lead: 0.4 + skill * 0.6,
    });
  }

  private thinkBot(id: string, brain: BotBrain, R: number) {
    const me = this.state.players.get(id);
    const input = this.inputs.get(id);
    if (!me || !input) return;
    if (!me.alive) { input.turn = 0; input.fire = false; input.boost = false; return; }

    const myPos = getP(me), myFwd = getF(me);
    let target = brain.targetId ? this.state.players.get(brain.targetId) : undefined;
    if (this.now >= brain.retargetAt || !target || !target.alive || brain.targetId === id) {
      target = this.pickTarget(id, myPos);
      brain.targetId = target ? this.idOf(target) : null;
      brain.retargetAt = this.now + brain.react + Math.random() * brain.react;
    }

    let desiredBearing: S.Vec3;
    let wantFire = false, wantBoost = false;

    if (target) {
      const tPos = getP(target);
      const distWorld = S.angBetween(myPos, tPos) * R;
      if (me.hp <= 35 && distWorld < 520) {
        // flee: aim away from the threat
        desiredBearing = bearingTo(myPos, S.scale(tPos, -1)); // toward the antipode of the threat
        wantBoost = true;
      } else {
        // predictive lead: advance the target along its heading and aim there
        const tid = brain.targetId as string;
        const tSpeed = this.speed.get(tid) ?? C.CRUISE_SPEED;
        const leadT = (distWorld / C.BULLET_SPEED) * brain.lead;
        const leadPos = S.advance(tPos, getF(target), (tSpeed / R) * leadT).p;
        desiredBearing = S.turn(myPos, bearingTo(myPos, leadPos), brain.aimErr * (Math.random() * 2 - 1));
        const aim = Math.abs(signedAngle(myPos, myFwd, bearingTo(myPos, leadPos)));
        wantFire = aim < 0.16 && distWorld < 640;
        wantBoost = distWorld > 720 && Math.random() < 0.4;
      }
    } else {
      brain.wander += (Math.random() - 0.5) * 0.6;
      desiredBearing = S.turn(myPos, myFwd, brain.wander * 0.02);
    }

    const diff = signedAngle(myPos, myFwd, desiredBearing);
    input.turn = Math.abs(diff) < 0.04 ? 0 : Math.sign(diff);
    input.fire = wantFire;
    input.boost = wantBoost;
  }

  private pickTarget(selfId: string, myPos: S.Vec3): Player | undefined {
    let best: Player | undefined;
    let bestD = Infinity;
    for (const [pid, p] of this.state.players) {
      if (pid === selfId || !p.alive) continue;
      const d = S.angBetween(getP(p), myPos);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  private idOf(target: Player): string | null {
    for (const [pid, p] of this.state.players) if (p === target) return pid;
    return null;
  }
}
