import { Schema, type, MapSchema } from "@colyseus/schema";

// Everything decorated with @type() is synchronized to clients.
// Keep this lean — it is serialized every patch.

export class Player extends Schema {
  @type("string") name = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") angle = 0; // heading in radians
  @type("number") hp = 100;
  @type("number") score = 0;
  @type("number") skin = 0;
  @type("boolean") alive = true;
  @type("boolean") bot = false;
  @type("boolean") boosting = false;
  @type("string") power = ""; // active powerup type ("" = none)
  @type("number") powerLeft = 0; // seconds remaining on the active timed powerup (authoritative; drives HUD)
}

export class Bullet extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") angle = 0;
  @type("string") owner = ""; // sessionId / bot id of shooter
  @type("boolean") homing = false;
}

export class Pickup extends Schema {
  @type("string") type = ""; // powerup type
  @type("number") x = 0;
  @type("number") y = 0;
}

export class ArenaState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Bullet }) bullets = new MapSchema<Bullet>();
  @type({ map: Pickup }) pickups = new MapSchema<Pickup>();
  @type("number") timeLeft = 0; // seconds remaining in the round
  @type("string") phase = "playing"; // "playing" | "intermission"
}
