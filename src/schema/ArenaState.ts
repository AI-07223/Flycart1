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
  @type("number") arenaHalf = 0;
  @type("number") floorY = 0;
  @type("number") ceilingY = 0;
}