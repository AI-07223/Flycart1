import { Schema, type, MapSchema } from "@colyseus/schema";

// Everything decorated with @type() is synchronized to clients.
// Keep this lean — it is serialized every patch.

export class Player extends Schema {
  @type("string") name = "";
  @type("number") px = 0;
  @type("number") py = 0;
  @type("number") pz = 0;
  @type("number") fx = 1;
  @type("number") fy = 0;
  @type("number") fz = 0;
  @type("number") seq = 0;
  @type("number") speed = 0;
  @type("number") turn = 0;
  @type("number") climb = 0;
  @type("number") hp = 100;
  @type("number") score = 0;
  @type("number") skin = 0;
  @type("boolean") alive = true;
  @type("boolean") bot = false;
  @type("boolean") boosting = false;
  @type("string") power = "";
  @type("number") powerLeft = 0;
  @type("boolean") ready = false;
  @type("number") bodyShape = 0;
  @type("number") accent = 0;
  @type("number") trail = 0;
  @type("number") livery = 0;
  /** TDM team: 0=blue, 1=red, -1=unassigned (FFA). Appended last to preserve field order. */
  @type("number") team = -1;
  /** Freeze ray: turn/climb forced to 0 and fire blocked while > 0. Appended last to preserve field order. */
  @type("number") frozenLeft = 0;
  /** EMP burst: fire and boost blocked while > 0. Appended last to preserve field order. */
  @type("number") empLeft = 0;
}

export class Bullet extends Schema {
  @type("number") px = 0;
  @type("number") py = 0;
  @type("number") pz = 0;
  @type("number") fx = 1;
  @type("number") fy = 0;
  @type("number") fz = 0;
  @type("string") owner = "";
  @type("boolean") homing = false;
  /** "" = normal bullet, "mine" = stationary air mine. Appended last to preserve field order. */
  @type("string") kind = "";
}

export class Pickup extends Schema {
  @type("string") type = "";
  @type("number") px = 0;
  @type("number") py = 0;
  @type("number") pz = 0;
}

export class ArenaState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Bullet }) bullets = new MapSchema<Bullet>();
  @type({ map: Pickup }) pickups = new MapSchema<Pickup>();
  @type("number") timeLeft = 0;
  @type("string") phase = "playing";
  @type("string") hostId = "";
  @type("number") arenaHalf = 0;
  @type("number") floorY = 0;
  @type("number") ceilingY = 0;
  @type("string") roomName = "";
  @type("number") roundLength = 150;
  @type("boolean") botsInRoom = false;
  /** Game mode: 'ffa' (default) | 'tdm'. Appended after botsInRoom to preserve field order. */
  @type("string") mode = "ffa";
  @type("number") teamScore0 = 0;
  @type("number") teamScore1 = 0;
  /** Bot difficulty: 'easy' | 'medium' | 'high'. Appended last to preserve field order. */
  @type("string") botDifficulty = "medium";
}