// Plain TypeScript interfaces for the framework-agnostic simulation.
// No Colyseus, no @type decorators, no Node-specific imports.

export interface SimPlayer {
  name: string;
  px: number;
  py: number;
  pz: number;
  fx: number;
  fy: number;
  fz: number;
  seq: number;
  speed: number;
  turn: number;
  climb: number;
  hp: number;
  score: number;
  skin: number;
  alive: boolean;
  bot: boolean;
  boosting: boolean;
  power: string;
  powerLeft: number;
  ready: boolean;
  bodyShape: number;
  accent: number;
  trail: number;
  livery: number;
}

export interface SimBullet {
  px: number;
  py: number;
  pz: number;
  fx: number;
  fy: number;
  fz: number;
  owner: string;
  homing: boolean;
}

export interface SimPickup {
  type: string;
  px: number;
  py: number;
  pz: number;
}

export interface Input {
  seq: number;
  turn: number;
  climb: number;
  boost: boolean;
  fire: boolean;
}

export interface BotBrain {
  targetId: string | null;
  retargetAt: number;
  wanderYaw: number;
}

export interface JoinOpts {
  name: string;
  skin: number;
  bodyShape: number;
  accent: number;
  trail: number;
  livery: number;
}

// Events emitted by GameSim — consumed by the adapter layer (ArenaRoom).
export type SimEvent =
  | { type: "kill"; killer: string; victim: string; killerName: string; victimName: string }
  | { type: "pickup"; by: string; pickupType: string }
  | { type: "roundEnd"; scores: Array<{ name: string; score: number }> };

// Serializable snapshot for future P2P transmission.
export interface SimStateSnapshot {
  players: Array<[string, SimPlayer]>;
  bullets: Array<[string, SimBullet]>;
  pickups: Array<[string, SimPickup]>;
  phase: string;
  timeLeft: number;
  hostId: string;
}

export interface GameSimOpts {
  botsEnabled: boolean;
  isPublic: boolean;
  onEvent: (e: SimEvent) => void;
}
