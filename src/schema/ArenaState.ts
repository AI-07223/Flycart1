import { Schema, type, MapSchema } from "@colyseus/schema";

// Everything decorated with @type() is synchronized to clients.
// Keep this lean — it is serialized every patch.
//
// GLOBE ARENA: positions are UNIT-VECTOR directions on the planet (px,py,pz). Moving entities also
// carry a FORWARD unit vector (fx,fy,fz) tangent to the surface. World render pos = p·(radius+alt).
// Speeds/hit tests are angular, so the shared `radius` only scales rendering/placement.

export class Player extends Schema {
  @type("string") name = "";
  // position (unit vector) + forward heading (unit tangent vector)
  @type("number") px = 0;
  @type("number") py = 1;
  @type("number") pz = 0;
  @type("number") fx = 1;
  @type("number") fy = 0;
  @type("number") fz = 0;
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
  @type("number") py = 1;
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
  @type("number") py = 1;
  @type("number") pz = 0;
}

export class ArenaState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Bullet }) bullets = new MapSchema<Bullet>();
  @type({ map: Pickup }) pickups = new MapSchema<Pickup>();
  @type("number") timeLeft = 0;        // seconds remaining in the round
  @type("string") phase = "playing";   // "playing" | "intermission"
  @type("number") radius = 700;        // current planet radius (set per round; scales the render)
}
