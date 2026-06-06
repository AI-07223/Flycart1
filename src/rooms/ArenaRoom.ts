import { Room, Client } from "colyseus";
import { ArenaState, Player, Bullet, Pickup } from "../schema/ArenaState";
import * as C from "../shared/constants";

interface Input {
  turn: number; // -1, 0, 1
  boost: boolean;
  fire: boolean;
}

interface BotBrain {
  targetId: string | null;
  retargetAt: number;
  wander: number;
  react: number;  // seconds between retargets (lower = sharper)
  aimErr: number; // radians of random aim jitter (lower = deadlier)
  lead: number;   // 0..1 fraction of predictive lead applied
}

const ZERO_INPUT: Input = { turn: 0, boost: false, fire: false };

export class ArenaRoom extends Room<ArenaState> {
  maxClients = C.MAX_CLIENTS;

  // Server-only, non-synced per-entity data (keyed by player id).
  private inputs = new Map<string, Input>();
  private speed = new Map<string, number>();
  private lastShot = new Map<string, number>();
  private respawnAt = new Map<string, number>();
  private bots = new Map<string, BotBrain>();

  private now = 0; // seconds since room start (accumulated from dt)
  private bulletSeq = 0;
  private botSeq = 0;
  private pickupSeq = 0;
  private pickupAt = 0;
  private powerUntil = new Map<string, number>(); // id -> expiry (seconds)
  private shield = new Map<string, number>();      // id -> remaining shield charges
  private invulnUntil = new Map<string, number>(); // id -> spawn-protection expiry (seconds)
  private msgTimes = new Map<string, number[]>();  // id -> recent message timestamps (rate limit)

  onCreate(options: { code?: string } = {}) {
    this.state = new ArenaState();
    this.state.timeLeft = C.ROUND_SECONDS;
    this.setMetadata({ code: options.code || "PUBLIC" });

    this.onMessage("input", (client, data: Partial<Input>) => {
      if (!this.rateOk(client.sessionId, C.INPUT_RATE_MAX)) return;
      const cur = this.inputs.get(client.sessionId) ?? { ...ZERO_INPUT };
      // Validate finite: NaN/Infinity must never reach the sim — they poison the shared state.
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

    this.setPatchRate(33); // ~30Hz broadcasts to match the simulation (smoother clients)
    // Clamp the step so a GC/CPU hitch can't integrate a huge dt (bullet tunneling / physics blow-up).
    this.setSimulationInterval((dt) => this.update(Math.min(dt / 1000, C.DT_MAX)));
  }

  onJoin(client: Client, options: { name?: string } = {}) {
    const p = new Player();
    p.name = (options.name || "Pilot").trim().slice(0, 14) || "Pilot";
    p.skin = Math.floor(Math.random() * C.SKIN_COUNT);
    p.bot = false;
    this.spawn(client.sessionId, p);
    this.state.players.set(client.sessionId, p);
    this.inputs.set(client.sessionId, { ...ZERO_INPUT });
  }

  async onLeave(client: Client, consented?: boolean) {
    // Intentional leave → drop now. Unexpected drop → hold the slot briefly so the client can
    // reconnect (mobile blips, redeploys) instead of losing the match to a momentary disconnect.
    if (consented) { this.removePlayer(client.sessionId); return; }
    this.inputs.set(client.sessionId, { ...ZERO_INPUT }); // park input while they're gone
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
    this.maintainBots();
    this.maintainPickups();
    this.updateTimer(dt);

    // Bot AI decides inputs before physics runs.
    for (const [id, brain] of this.bots) this.thinkBot(id, brain);

    for (const [id, p] of this.state.players) {
      if (!p.alive) {
        const t = this.respawnAt.get(id) ?? 0;
        if (this.now >= t) this.spawn(id, p);
        continue;
      }
      this.stepPlane(id, p, dt, playing);
    }

    this.stepBullets(dt, playing);
    this.collectPickups();
    this.expirePowers();
  }

  private updateTimer(dt: number) {
    if (this.state.phase === "playing") {
      this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
      if (this.state.timeLeft <= 0) {
        this.state.phase = "intermission";
        this.state.timeLeft = C.ROUND_INTERMISSION;
      }
    } else {
      this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
      if (this.state.timeLeft <= 0) {
        // New round: wipe scores, respawn everyone.
        for (const [id, p] of this.state.players) {
          p.score = 0;
          this.spawn(id, p);
        }
        this.state.phase = "playing";
        this.state.timeLeft = C.ROUND_SECONDS;
      }
    }
  }

  private stepPlane(id: string, p: Player, dt: number, playing: boolean) {
    const input = this.inputs.get(id) ?? ZERO_INPUT;

    p.angle += input.turn * C.TURN_RATE * dt;
    p.boosting = input.boost;

    let target = input.boost ? C.BOOST_SPEED : C.CRUISE_SPEED;
    if (p.power === "afterburner") target *= C.AFTERBURNER_FACTOR;
    let s = this.speed.get(id) ?? C.CRUISE_SPEED;
    s += Math.sign(target - s) * C.ACCEL * dt;
    if ((target - s) * Math.sign(target - (this.speed.get(id) ?? s)) < 0) s = target;
    this.speed.set(id, s);

    p.x += Math.cos(p.angle) * s * dt;
    p.y += Math.sin(p.angle) * s * dt;

    // Bounded arena: clamp and deflect heading inward at the walls.
    const m = C.WALL_MARGIN + C.PLANE_RADIUS;
    if (p.x < m) { p.x = m; p.angle = this.deflect(p.angle, 0); }
    if (p.x > C.ARENA_WIDTH - m) { p.x = C.ARENA_WIDTH - m; p.angle = this.deflect(p.angle, Math.PI); }
    if (p.y < m) { p.y = m; p.angle = this.deflect(p.angle, Math.PI / 2); }
    if (p.y > C.ARENA_HEIGHT - m) { p.y = C.ARENA_HEIGHT - m; p.angle = this.deflect(p.angle, -Math.PI / 2); }

    // Solid obstacles deflect/slide the plane off their surface (cover navigation). This NEVER
    // touches hp — the environment cannot damage a player. Reuses the wall deflect() so client
    // prediction can mirror it exactly. Distance/normal go through the pluggable metric (globe-ready).
    for (const o of C.OBSTACLES) {
      if (!C.OBSTACLE_BEHAVIOR[o.kind].solid) continue;
      const rr = o.radius + C.PLANE_RADIUS;
      if (C.within(p.x, p.y, o.x, o.y, rr)) {
        const n = C.normalDir(o.x, o.y, p.x, p.y); // outward normal: obstacle centre → plane
        p.x = o.x + n.x * rr;                       // push back to the surface
        p.y = o.y + n.y * rr;
        p.angle = this.deflect(p.angle, Math.atan2(n.y, n.x)); // steer outward, momentum preserved
      }
    }

    if (input.fire && playing) this.tryFire(id, p); // no scoreable combat outside the playing phase
  }

  // Nudge heading away from a wall by reflecting toward `inward`.
  private deflect(angle: number, inward: number) {
    const blend = 0.35;
    let diff = ((inward - angle + Math.PI) % (Math.PI * 2)) - Math.PI;
    return angle + diff * blend;
  }

  // Entry parameter t∈[0,1] where segment A→B first enters the circle (c, r), or Infinity if it
  // never does. t=0 means the segment starts already inside. Lets a bullet resolve the EARLIEST
  // thing along its swept path (obstacle vs plane) so cover can't be shot through, and a plane in
  // front of cover is still hit. (Swept → a fast bullet can't tunnel.)
  private segCircleT(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, r: number): number {
    const dx = bx - ax, dy = by - ay;
    const fx = ax - cx, fy = ay - cy;
    const a = dx * dx + dy * dy;
    if (a <= 1e-9) return (fx * fx + fy * fy <= r * r) ? 0 : Infinity; // zero-length step
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    let disc = b * b - 4 * a * c;
    if (disc < 0) return Infinity;
    disc = Math.sqrt(disc);
    const t1 = (-b - disc) / (2 * a);
    const t2 = (-b + disc) / (2 * a);
    if (t1 >= 0 && t1 <= 1) return t1;
    if (t1 < 0 && t2 >= 0) return 0; // started inside the circle
    return Infinity;
  }

  // Boolean swept hit test — thin wrapper so existing call-sites stay unchanged.
  private segHitsCircle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, r: number): boolean {
    return this.segCircleT(ax, ay, bx, by, cx, cy, r) !== Infinity;
  }

  // Rate limit: allow up to `max` messages per rolling second per client.
  private rateOk(id: string, max: number): boolean {
    const now = Date.now();
    let arr = this.msgTimes.get(id);
    if (!arr) { arr = []; this.msgTimes.set(id, arr); }
    while (arr.length && now - arr[0] > 1000) arr.shift();
    if (arr.length >= max) return false;
    arr.push(now);
    return true;
  }

  private tryFire(id: string, p: Player) {
    this.invulnUntil.delete(id); // firing ends spawn protection
    const last = this.lastShot.get(id) ?? -999;
    const cd = C.FIRE_COOLDOWN * (p.power === "rapid" ? C.RAPID_FACTOR : 1);
    if (this.now - last < cd) return;
    this.lastShot.set(id, this.now);

    if (p.power === "spread") {
      this.spawnBullet(id, p, p.angle - C.SPREAD_ANGLE, false);
      this.spawnBullet(id, p, p.angle, false);
      this.spawnBullet(id, p, p.angle + C.SPREAD_ANGLE, false);
    } else {
      this.spawnBullet(id, p, p.angle, p.power === "homing");
    }
  }

  private spawnBullet(id: string, p: Player, angle: number, homing: boolean) {
    const b = new Bullet();
    b.x = p.x + Math.cos(angle) * (C.PLANE_RADIUS + 6);
    b.y = p.y + Math.sin(angle) * (C.PLANE_RADIUS + 6);
    b.angle = angle;
    b.owner = id;
    b.homing = homing;
    const key = "b" + this.bulletSeq++;
    (b as any).__life = C.BULLET_LIFE;
    (b as any).__key = key;
    this.state.bullets.set(key, b);
  }

  private stepBullets(dt: number, playing: boolean) {
    for (const [key, b] of this.state.bullets) {
      const life = ((b as any).__life ?? C.BULLET_LIFE) - dt;
      if (life <= 0) { this.state.bullets.delete(key); continue; }
      (b as any).__life = life;

      // Homing missiles steer toward the nearest enemy.
      if (b.homing) {
        let best: Player | undefined; let bestD = Infinity;
        for (const [pid, tp] of this.state.players) {
          if (!tp.alive || pid === b.owner) continue;
          const d = (tp.x - b.x) ** 2 + (tp.y - b.y) ** 2;
          if (d < bestD) { bestD = d; best = tp; }
        }
        if (best) {
          const desired = Math.atan2(best.y - b.y, best.x - b.x);
          const diff = ((desired - b.angle + Math.PI) % (Math.PI * 2)) - Math.PI;
          const max = C.HOMING_TURN * dt;
          b.angle += Math.max(-max, Math.min(max, diff));
        }
      }

      const ox = b.x, oy = b.y;
      b.x += Math.cos(b.angle) * C.BULLET_SPEED * dt;
      b.y += Math.sin(b.angle) * C.BULLET_SPEED * dt;

      if (b.x < 0 || b.x > C.ARENA_WIDTH || b.y < 0 || b.y > C.ARENA_HEIGHT) {
        this.state.bullets.delete(key);
        continue;
      }

      // Resolve the EARLIEST thing along the bullet's swept segment this tick: a bullet-blocking
      // obstacle (cover — consumes the bullet, deals NO damage) vs. an enemy plane (damage). Whichever
      // is struck first wins, so cover protects a hidden plane while an exposed plane in front is hit.
      const hitR = C.PLANE_RADIUS + C.BULLET_RADIUS;
      let bestT = Infinity, victim: Player | null = null, victimId = "";
      if (playing) {
        // Plane damage only during the playing phase (no scoreable combat in intermission).
        for (const [pid, p] of this.state.players) {
          if (!p.alive || pid === b.owner) continue;
          const t = this.segCircleT(ox, oy, b.x, b.y, p.x, p.y, hitR);
          if (t < bestT) { bestT = t; victim = p; victimId = pid; }
        }
      }
      for (const o of C.OBSTACLES) {
        if (!C.OBSTACLE_BEHAVIOR[o.kind].blocksBullets) continue;
        const t = this.segCircleT(ox, oy, b.x, b.y, o.x, o.y, o.radius + C.BULLET_RADIUS);
        if (t < bestT) { bestT = t; victim = null; } // obstacle earliest → block with no damage
      }
      if (bestT !== Infinity) {
        if (victim) this.damage(victim, victimId, b.owner); // victim===null (obstacle) → zero damage
        this.state.bullets.delete(key);
      }
    }
  }

  private damage(p: Player, victimId: string, killerId: string) {
    if (this.now < (this.invulnUntil.get(victimId) ?? 0)) return; // spawn protection
    // Shield absorbs a hit (and clears when depleted).
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
      // Notify clients so they can show a kill feed / "+1" popup.
      this.broadcast("kill", {
        killer: killerId,
        victim: victimId,
        killerName: killer ? killer.name : "?",
        victimName: p.name,
      });
    }
  }

  // ---------- powerups ----------

  private maintainPickups() {
    if (this.state.pickups.size >= C.PICKUP_MAX || this.now < this.pickupAt) return;
    this.pickupAt = this.now + C.PICKUP_INTERVAL;
    const pk = new Pickup();
    pk.type = this.weightedPowerup();
    const pos = this.pickPickupPos();
    pk.x = pos.x;
    pk.y = pos.y;
    this.state.pickups.set("pk" + this.pickupSeq++, pk);
  }

  // Spawn position weighted toward the hotspot (radial power law: r = maxR * rand^BIAS, BIAS>1 pulls
  // inward) so the contested centre stays busy, while occasional edge spawns remain. Re-rolls a
  // bounded number of times to avoid embedding a pickup in solid cover; never hangs.
  private pickPickupPos(): { x: number; y: number } {
    const maxR = Math.hypot(C.ARENA_WIDTH, C.ARENA_HEIGHT) / 2 - (C.WALL_MARGIN + 80);
    const lo = C.WALL_MARGIN + 40;
    let last = { x: C.HOTSPOT.x, y: C.HOTSPOT.y };
    for (let i = 0; i < C.SPAWN_REROLL; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = maxR * Math.pow(Math.random(), C.HOTSPOT_BIAS);
      const x = Math.max(lo, Math.min(C.ARENA_WIDTH - lo, C.HOTSPOT.x + Math.cos(ang) * r));
      const y = Math.max(lo, Math.min(C.ARENA_HEIGHT - lo, C.HOTSPOT.y + Math.sin(ang) * r));
      last = { x, y };
      if (!this.insideSolid(x, y, C.PICKUP_RADIUS)) return last;
    }
    // All attempts landed in cover (the dense centre) — guarantee a clear spot by ejecting to the
    // nearest solid surface with a small margin so the orb clears it. A few passes converge.
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (const o of C.OBSTACLES) {
        if (!C.OBSTACLE_BEHAVIOR[o.kind].solid) continue;
        const rr = o.radius + C.PICKUP_RADIUS + 4;
        if (C.within(last.x, last.y, o.x, o.y, rr)) {
          const n = C.normalDir(o.x, o.y, last.x, last.y);
          last = { x: o.x + n.x * rr, y: o.y + n.y * rr };
          moved = true;
        }
      }
      if (!moved) break;
    }
    return last;
  }

  // Is (x,y) within `pad` of any SOLID obstacle? (metric-routed; globe-ready)
  private insideSolid(x: number, y: number, pad: number): boolean {
    for (const o of C.OBSTACLES) {
      if (!C.OBSTACLE_BEHAVIOR[o.kind].solid) continue;
      if (C.within(x, y, o.x, o.y, o.radius + pad)) return true;
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

  private collectPickups() {
    const hitR = C.PICKUP_RADIUS + C.PLANE_RADIUS;
    for (const [key, pk] of this.state.pickups) {
      for (const [pid, p] of this.state.players) {
        if (!p.alive) continue;
        const dx = p.x - pk.x, dy = p.y - pk.y;
        if (dx * dx + dy * dy <= hitR * hitR) {
          if (pk.type === "repair" && p.hp >= C.MAX_HP) continue; // don't waste a heal at full HP
          this.applyPowerup(pid, p, pk.type);
          this.state.pickups.delete(key);
          this.broadcast("pickup", { by: pid, type: pk.type });
          break;
        }
      }
    }
  }

  private applyPowerup(id: string, p: Player, type: string) {
    if (type === "repair") { p.hp = C.MAX_HP; return; } // instant; no timed slot
    this.shield.delete(id);
    p.power = type;
    p.powerLeft = C.POWERUP_DURATION;
    this.powerUntil.set(id, this.now + C.POWERUP_DURATION);
    if (type === "shield") this.shield.set(id, C.SHIELD_CHARGES);
  }

  // Single place that clears a timed powerup's three pieces of state together (no stray state).
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
        if (p) p.powerLeft = Math.max(0, until - this.now); // authoritative HUD countdown
      }
    }
  }

  // ---------- spawning / lifecycle ----------

  private spawn(id: string, p: Player) {
    const pos = this.pickSpawn();
    p.x = pos.x;
    p.y = pos.y;
    p.angle = Math.random() * Math.PI * 2;
    p.hp = C.MAX_HP;
    p.alive = true;
    p.boosting = false;
    this.clearPower(id, p);
    this.speed.set(id, C.CRUISE_SPEED);
    this.lastShot.delete(id);                            // fresh cooldown on (re)spawn
    this.invulnUntil.set(id, this.now + C.SPAWN_INVULN); // brief protection at re-entry
  }

  // Pick a spawn point biased away from the nearest alive enemy (anti-spawn-camp) and clear of solid
  // obstacles (don't begin a life embedded in cover). Bounded attempts; falls through to the last
  // candidate so it can never hang.
  private pickSpawn(): { x: number; y: number } {
    const rx = () => C.WALL_MARGIN + 60 + Math.random() * (C.ARENA_WIDTH - 2 * (C.WALL_MARGIN + 60));
    const ry = () => C.WALL_MARGIN + 60 + Math.random() * (C.ARENA_HEIGHT - 2 * (C.WALL_MARGIN + 60));
    let best: { x: number; y: number } | null = null, bestD = -1;
    let fallback = { x: rx(), y: ry() };
    for (let i = 0; i < C.SPAWN_REROLL; i++) {
      const x = rx(), y = ry();
      fallback = { x, y };
      if (this.insideSolid(x, y, C.PLANE_RADIUS + 8)) continue;
      let near = Infinity;
      for (const [, p] of this.state.players) {
        if (!p.alive) continue;
        const d = C.dist2(p.x, p.y, x, y);
        if (d < near) near = d;
      }
      if (near > bestD) { bestD = near; best = { x, y }; }
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
      this.addBot(); // top up toward the floor (one per tick)
    } else if (this.bots.size > 0 && total > C.MIN_PLAYERS) {
      // Above the floor → cede a bot so humans take their place (one per tick, settles in a few ticks).
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
    // Per-bot difficulty spread so encounters vary.
    const skill = Math.random();
    this.bots.set(id, {
      targetId: null, retargetAt: 0, wander: Math.random() * Math.PI * 2,
      react: 1.2 + (1 - skill) * 2.2,
      aimErr: 0.02 + (1 - skill) * 0.22,
      lead: 0.4 + skill * 0.6,
    });
  }

  private thinkBot(id: string, brain: BotBrain) {
    const me = this.state.players.get(id);
    const input = this.inputs.get(id);
    if (!me || !input) return;
    if (!me.alive) { input.turn = 0; input.fire = false; input.boost = false; return; }

    // Re-pick a target periodically or if current target is gone/dead.
    let target = brain.targetId ? this.state.players.get(brain.targetId) : undefined;
    if (this.now >= brain.retargetAt || !target || !target.alive || brain.targetId === id) {
      target = this.pickTarget(id, me);
      brain.targetId = target ? this.idOf(target) : null;
      brain.retargetAt = this.now + brain.react + Math.random() * brain.react;
    }

    let desired: number;
    let wantFire = false, wantBoost = false;

    if (target) {
      const dx = target.x - me.x, dy = target.y - me.y;
      const dist = Math.hypot(dx, dy);
      if (me.hp <= 35 && dist < 520) {
        // Low on health: turn away from the threat and run.
        desired = Math.atan2(me.y - target.y, me.x - target.x);
        wantBoost = true;
      } else {
        // Predictive aim: lead the target using its velocity (heading * speed).
        const tid = brain.targetId as string;
        const tSpeed = this.speed.get(tid) ?? C.CRUISE_SPEED;
        const lead = (dist / C.BULLET_SPEED) * brain.lead;
        const px = target.x + Math.cos(target.angle) * tSpeed * lead;
        const py = target.y + Math.sin(target.angle) * tSpeed * lead;
        desired = Math.atan2(py - me.y, px - me.x) + brain.aimErr * (Math.random() * 2 - 1);
        const aim = Math.abs(((desired - me.angle + Math.PI) % (Math.PI * 2)) - Math.PI);
        wantFire = aim < 0.16 && dist < 640;
        wantBoost = dist > 720 && Math.random() < 0.4;
      }
    } else {
      brain.wander += (Math.random() - 0.5) * 0.6;
      desired = brain.wander;
    }

    const diff = ((desired - me.angle + Math.PI) % (Math.PI * 2)) - Math.PI;
    input.turn = Math.abs(diff) < 0.04 ? 0 : Math.sign(diff);
    input.fire = wantFire;
    input.boost = wantBoost;
  }

  private pickTarget(selfId: string, me: Player): Player | undefined {
    let best: Player | undefined;
    let bestD = Infinity;
    for (const [pid, p] of this.state.players) {
      if (pid === selfId || !p.alive) continue;
      const d = (p.x - me.x) ** 2 + (p.y - me.y) ** 2;
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  private idOf(target: Player): string | null {
    for (const [pid, p] of this.state.players) if (p === target) return pid;
    return null;
  }
}
