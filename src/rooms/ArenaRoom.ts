import { Room, Client } from "colyseus";
import { ArenaState, Player, Bullet } from "../schema/ArenaState";
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

  onCreate(options: { code?: string } = {}) {
    this.state = new ArenaState();
    this.state.timeLeft = C.ROUND_SECONDS;
    this.setMetadata({ code: options.code || "PUBLIC" });

    this.onMessage("input", (client, data: Partial<Input>) => {
      const cur = this.inputs.get(client.sessionId) ?? { ...ZERO_INPUT };
      if (typeof data.turn === "number") cur.turn = Math.max(-1, Math.min(1, data.turn));
      if (typeof data.boost === "boolean") cur.boost = data.boost;
      if (typeof data.fire === "boolean") cur.fire = data.fire;
      this.inputs.set(client.sessionId, cur);
    });

    this.onMessage("setName", (client, name: string) => {
      const p = this.state.players.get(client.sessionId);
      if (p && typeof name === "string") p.name = name.slice(0, 14) || p.name;
    });

    this.setSimulationInterval((dt) => this.update(dt / 1000));
  }

  onJoin(client: Client, options: { name?: string } = {}) {
    const p = new Player();
    p.name = (options.name || "Pilot").slice(0, 14);
    p.skin = Math.floor(Math.random() * C.SKIN_COUNT);
    p.bot = false;
    this.spawn(client.sessionId, p);
    this.state.players.set(client.sessionId, p);
    this.inputs.set(client.sessionId, { ...ZERO_INPUT });
  }

  onLeave(client: Client) {
    this.removePlayer(client.sessionId);
  }

  // ---------- simulation ----------

  private update(dt: number) {
    this.now += dt;
    this.maintainBots();
    this.updateTimer(dt);

    // Bot AI decides inputs before physics runs.
    for (const [id, brain] of this.bots) this.thinkBot(id, brain);

    for (const [id, p] of this.state.players) {
      if (!p.alive) {
        const t = this.respawnAt.get(id) ?? 0;
        if (this.now >= t) this.spawn(id, p);
        continue;
      }
      this.stepPlane(id, p, dt);
    }

    this.stepBullets(dt);
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

  private stepPlane(id: string, p: Player, dt: number) {
    const input = this.inputs.get(id) ?? ZERO_INPUT;

    p.angle += input.turn * C.TURN_RATE * dt;
    p.boosting = input.boost;

    const target = input.boost ? C.BOOST_SPEED : C.CRUISE_SPEED;
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

    if (input.fire) this.tryFire(id, p);
  }

  // Nudge heading away from a wall by reflecting toward `inward`.
  private deflect(angle: number, inward: number) {
    const blend = 0.35;
    let diff = ((inward - angle + Math.PI) % (Math.PI * 2)) - Math.PI;
    return angle + diff * blend;
  }

  private tryFire(id: string, p: Player) {
    const last = this.lastShot.get(id) ?? -999;
    if (this.now - last < C.FIRE_COOLDOWN) return;
    this.lastShot.set(id, this.now);

    const b = new Bullet();
    b.x = p.x + Math.cos(p.angle) * (C.PLANE_RADIUS + 6);
    b.y = p.y + Math.sin(p.angle) * (C.PLANE_RADIUS + 6);
    b.angle = p.angle;
    b.owner = id;
    const key = "b" + this.bulletSeq++;
    (b as any).__life = C.BULLET_LIFE;
    (b as any).__key = key;
    this.state.bullets.set(key, b);
  }

  private stepBullets(dt: number) {
    for (const [key, b] of this.state.bullets) {
      const life = ((b as any).__life ?? C.BULLET_LIFE) - dt;
      if (life <= 0) { this.state.bullets.delete(key); continue; }
      (b as any).__life = life;

      b.x += Math.cos(b.angle) * C.BULLET_SPEED * dt;
      b.y += Math.sin(b.angle) * C.BULLET_SPEED * dt;

      if (b.x < 0 || b.x > C.ARENA_WIDTH || b.y < 0 || b.y > C.ARENA_HEIGHT) {
        this.state.bullets.delete(key);
        continue;
      }

      // Hit test against alive planes (skip the shooter).
      const hitR = C.PLANE_RADIUS + C.BULLET_RADIUS;
      for (const [pid, p] of this.state.players) {
        if (!p.alive || pid === b.owner) continue;
        const dx = p.x - b.x, dy = p.y - b.y;
        if (dx * dx + dy * dy <= hitR * hitR) {
          this.damage(p, pid, b.owner);
          this.state.bullets.delete(key);
          break;
        }
      }
    }
  }

  private damage(p: Player, victimId: string, killerId: string) {
    p.hp -= C.BULLET_DAMAGE;
    if (p.hp <= 0) {
      p.hp = 0;
      p.alive = false;
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

  // ---------- spawning / lifecycle ----------

  private spawn(id: string, p: Player) {
    p.x = C.WALL_MARGIN + 60 + Math.random() * (C.ARENA_WIDTH - 2 * (C.WALL_MARGIN + 60));
    p.y = C.WALL_MARGIN + 60 + Math.random() * (C.ARENA_HEIGHT - 2 * (C.WALL_MARGIN + 60));
    p.angle = Math.random() * Math.PI * 2;
    p.hp = C.MAX_HP;
    p.alive = true;
    p.boosting = false;
    this.speed.set(id, C.CRUISE_SPEED);
  }

  private removePlayer(id: string) {
    this.state.players.delete(id);
    this.inputs.delete(id);
    this.speed.delete(id);
    this.lastShot.delete(id);
    this.respawnAt.delete(id);
    this.bots.delete(id);
  }

  // ---------- bots ----------

  private maintainBots() {
    const total = this.state.players.size;
    if (total < C.MIN_PLAYERS) {
      this.addBot();
    } else if (this.bots.size > 0 && total > C.MIN_PLAYERS) {
      // Make room for humans: drop a bot when arena is above the floor.
      const humans = total - this.bots.size;
      if (humans + (this.bots.size - 1) >= C.MIN_PLAYERS && this.state.players.size >= C.MAX_CLIENTS) {
        const firstBot = this.bots.keys().next().value as string | undefined;
        if (firstBot) this.removePlayer(firstBot);
      }
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
