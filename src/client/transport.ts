// Transport abstraction for SmashCart networking.
// Slice 2: defines ITransport + TransportState so future WebRTC peers can plug
// in behind the same interface as the existing Colyseus WebSocket path.

/**
 * A minimal read-only map interface satisfied by both ES6 Map and Colyseus
 * MapSchema (which exposes forEach / get / size on its prototype).
 */
export interface MapLike<K, V> {
  forEach(cb: (v: V, k: K) => void): void;
  get(k: K): V | undefined;
  readonly size: number;
}

/**
 * The subset of live room state that the render loop and HUD need.
 * Colyseus room.state structurally satisfies this — players/bullets/pickups
 * are MapSchema instances (forEach/get/size) and the scalar fields are plain
 * properties on the state object.
 */
export interface TransportState {
  players: MapLike<string, any>;
  bullets: MapLike<string, any>;
  pickups: MapLike<string, any>;
  phase: string;
  timeLeft: number;
  hostId: string;
  roomName?: string;
  roundLength?: number;
  botsInRoom?: boolean;
  mode?: string;
  teamScore0?: number;
  teamScore1?: number;
}

/**
 * Common interface for any network transport (Colyseus WS today, WebRTC later).
 * Net in net.ts implements this — the comment there marks the intention.
 */
export interface ITransport {
  readonly sessionId: string | null;
  readonly state: TransportState | null;

  connect(
    name: string,
    code: string,
    cosmetics: { color: number; bodyShape: number; accent: number; trail: number; livery: number },
    serverOrigin?: string | null
  ): Promise<any>;

  leave(): void;
  tryReconnect(): Promise<boolean>;

  sendInput(turn: number, climb: number, boost: boolean, fire: boolean): void;
  sendReady(): void;
  sendHostStart(): void;
  sendHostKick(targetId: string): void;
  sendHostSettings(s: { roundLength?: number; roomName?: string; botsInRoom?: boolean; mode?: string }): void;

  getPhase(): string | null;
  getHostId(): string | null;
  getRosterSnapshot(): Array<any>;

  stepLocal(dt: number): void;
  sample?(renderTime: number): any;

  onKill: ((msg: any) => void) | null;
  onPickup: ((msg: any) => void) | null;
  onDisconnect: ((info: any) => void) | null;
  onStateChange: (() => void) | null;

  localPose: any;
}
