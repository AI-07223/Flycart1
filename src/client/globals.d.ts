// Type declarations for window.* globals used by the SmashCart client.

// Inlined subset of TransportState for NetAPI — kept in sync with transport.ts.
// (Cannot import from transport.ts here without converting this file to a module,
// which would break the global Window augmentation.)
interface MapLike<K, V> {
  forEach(cb: (v: V, k: K) => void): void;
  get(k: K): V | undefined;
  readonly size: number;
}

interface TransportState {
  players: MapLike<string, any>;
  bullets: MapLike<string, any>;
  pickups: MapLike<string, any>;
  phase: string;
  timeLeft: number;
  hostId: string;
  roomName?: string;
  roundLength?: number;
  botsInRoom?: boolean;
}

interface Vec3 { x: number; y: number; z: number; }

interface SphereAPI {
  vec(x: number, y: number, z: number): Vec3;
  add(a: Vec3, b: Vec3): Vec3;
  sub(a: Vec3, b: Vec3): Vec3;
  scale(a: Vec3, s: number): Vec3;
  dot(a: Vec3, b: Vec3): number;
  cross(a: Vec3, b: Vec3): Vec3;
  len(a: Vec3): number;
  normalize(a: Vec3): Vec3;
  distance(a: Vec3, b: Vec3): number;
  distanceSq(a: Vec3, b: Vec3): number;
  clamp(v: number, min: number, max: number): number;
  lerp(a: number, b: number, t: number): number;
  lerpVec(a: Vec3, b: Vec3, t: number): Vec3;
  flatten(a: Vec3): Vec3;
  rotateAxis(v: Vec3, k: Vec3, ang: number): Vec3;
  anyTangent(p: Vec3): Vec3;
  tangentize(p: Vec3, f: Vec3): Vec3;
  advance(p: Vec3, f: Vec3, dist: number): { p: Vec3; f: Vec3 };
  turn(p: Vec3, f: Vec3, ang: number): Vec3;
  angBetween(a: Vec3, b: Vec3): number;
  slerp(a: Vec3, b: Vec3, t: number): Vec3;
  signedAngle(normal: Vec3, from: Vec3, to: Vec3): number;
  yawPitchForward(yaw: number, pitch: number): Vec3;
  yawPitchFromForward(f: Vec3): { yaw: number; pitch: number };
  withPitch(f: Vec3, pitch: number): Vec3;
  segmentPointT(a: Vec3, b: Vec3, p: Vec3): number;
  segmentPointDistance(a: Vec3, b: Vec3, p: Vec3): number;
  randomDir(rng?: () => number): Vec3;
}

interface PowerupInfo {
  label: string;
  color: number;
  icon: string;
}

interface Landmark {
  kind: "mesa" | "spire" | "tower" | "hangar";
  x: number;
  z: number;
  radius: number;
  height: number;
  color: number;
  cover: boolean;
}

interface GameConstants {
  CRUISE_SPEED: number;
  BOOST_SPEED: number;
  ACCEL: number;
  TURN_RATE: number;
  PITCH_RATE: number;
  PITCH_MAX: number;
  PLANE_RADIUS: number;
  MAX_HP: number;
  BULLET_SPEED: number;
  BULLET_DAMAGE: number;
  AFTERBURNER_FACTOR: number;
  RAPID_FACTOR: number;
  FIRE_COOLDOWN: number;
  BULLET_LIFE: number;
  BULLET_RADIUS: number;
  SPREAD_ANGLE: number;
  HOMING_TURN: number;
  TICK_RATE: number;
  SKIN_COUNT: number;
  BODY_SHAPE_COUNT: number;
  COLOR_COUNT: number;
  ACCENT_COUNT: number;
  TRAIL_COUNT: number;
  LIVERY_COUNT: number;
  MAP_HALF: number;
  MAP_EDGE_SOFT: number;
  GROUND_Y: number;
  MIN_ALT: number;
  SPAWN_ALT: number;
  MAX_ALT: number;
  PICKUP_ALT_MIN: number;
  PICKUP_ALT_MAX: number;
  PICKUP_FIELD_RADIUS: number;
  POWERUP_DURATION: number;
  POWERUPS: Record<string, PowerupInfo>;
  LANDMARKS: Landmark[];
}

interface QualityTier {
  name: string;
  pixelRatio: number;
  bloom: boolean;
  shadows: string;
  shadowMap: number;
  particles: number;
  decor: number;
}

interface QualityAPI {
  TIERS: Record<string, QualityTier>;
  ORDER: string[];
  current: string;
  _auto: boolean;
  init(): QualityAPI;
  cfg(): QualityTier;
  onChange(cb: (cfg: QualityTier, tier: string) => void): void;
  set(tier: string, fromUser?: boolean): void;
  sample(dt: number): void;
}

interface SFXAPI {
  unlock(): void;
  suspend(): void;
  resume(): void;
  stopLoops(): void;
  startMusic(): void;
  startEngine(): void;
  setEngine(speed: number, boosting: boolean): void;
  fire(): void;
  hit(): void;
  explosion(): void;
  kill(): void;
  go(): void;
  uiClick(): void;
  pickup(): void;
  toggleMute(): boolean;
  isMuted(): boolean;
  setMaster(v: number): void;
  setMusic(v: number): void;
  setSfx(v: number): void;
  vols(): { master: number; music: number; sfx: number; muted: boolean };
  startMenuAmbient(): void;
  stopMenuAmbient(): void;
}

interface AssetsAPI {
  planes: (HTMLImageElement | null)[];
  ready: boolean;
  load(): Promise<AssetsAPI>;
  planeFor(skin: number): HTMLImageElement | null;
}

interface TouchState {
  left: boolean;
  right: boolean;
  climb: boolean;
  dive: boolean;
  boost: boolean;
  fire: boolean;
}

interface InputAPI {
  turn: number;
  climb: number;
  boost: boolean;
  fire: boolean;
  onPause: (() => void) | null;
  onMute: (() => void) | null;
  touch: TouchState;
  invertSteer: boolean;
  invertPitch: boolean;
  get(): InputAPI;
  attach(): void;
  isTouchDevice(): boolean;
}

interface PlayerCosmetics {
  color: number;
  bodyShape: number;
  accent: number;
  trail: number;
  livery: number;
}

interface SnapshotPlayer {
  p: Vec3;
  f: Vec3;
  alive: boolean;
  speed: number;
  turn: number;
  climb: number;
  seq: number;
  bodyShape: number;
  accent: number;
  trail: number;
  livery: number;
}

interface Snapshot {
  t: number;
  players: Record<string, SnapshotPlayer>;
}

interface NetAPI {
  client: any | null;
  room: any | null;
  /** Slice 2: abstracted state getter — use this instead of room.state in new code. */
  readonly state: TransportState | null;
  sessionId: string | null;
  serverOrigin: string | null;
  lastSent: { seq: number; turn: number; climb: number; boost: boolean; fire: boolean };
  snaps: Snapshot[];
  onKill: ((msg: any) => void) | null;
  onPickup: ((msg: any) => void) | null;
  onDisconnect: ((info: any) => void) | null;
  onStateChange: (() => void) | null;
  reconnectToken: string | null;
  localPose: any;
  endpoint(origin?: string | null): string;
  connect(name: string, code: string, cosmetics: PlayerCosmetics, serverOrigin?: string | null): Promise<any>;
  tryReconnect(): Promise<boolean>;
  sample(renderTime: number): Record<string, SnapshotPlayer>;
  stepLocal(dt: number): void;
  sendInput(turn: number, climb: number, boost: boolean, fire: boolean): void;
  setName(name: string): void;
  // Slice 6 lobby methods
  sendReady(): void;
  sendHostStart(): void;
  sendHostKick(targetId: string): void;
  sendHostSettings(s: { roundLength?: number; roomName?: string; botsInRoom?: boolean }): void;
  getPhase(): string | null;
  getHostId(): string | null;
  getRosterSnapshot(): Array<{ id: string; name: string; ready: boolean; bot: boolean; score: number; color: number }>;
  leave(): void;
}

/**
 * Extended API available only on a WebRtcTransport instance.
 * Access via `(window.Net as WebRtcNetAPI)` after a P2P session starts.
 */
interface WebRtcNetAPI extends NetAPI {
  startHost(name: string, code: string, cosmetics: PlayerCosmetics): Promise<void>;
  startOfflineQrOffer(canvas: HTMLCanvasElement): Promise<string>;
  startOfflineQrAnswer(encoded: string, answerCanvas: HTMLCanvasElement): Promise<void>;
  finishOfflineQrOffer(answerEncoded: string): Promise<void>;
}

interface QRRenderOptions {
  size?: number;
  margin?: number;
  foreground?: string;
  background?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

interface QRAPI {
  render(canvas: HTMLCanvasElement, text: string, options?: QRRenderOptions): void;
}

interface RendererAPI {
  init(canvas: HTMLCanvasElement): void;
  sync(state: any, dt: number, myId: string): void;
  draw(state: any, myId: string): void;
  drawMenu(dt: number, cosmetics: PlayerCosmetics): void;
  updateMenuPlane?(cosmetics: PlayerCosmetics): void;
  killPopup(killerId: string, mine: boolean): void;
  hitStop(ms: number): void;
  startTakeoff?(): void;
  setMenuSection?(sec: string): void;
  showMenu?(): void;
  hideMenu?(): void;
}

interface ColyseusClient {
  new(endpoint: string): {
    joinOrCreate(roomName: string, options: any): Promise<any>;
    reconnect(token: string): Promise<any>;
  };
}

declare function jsQR(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  opts?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst" }
): { data: string } | null;

declare interface Window {
  GAME: GameConstants;
  Sphere: SphereAPI;
  Quality: QualityAPI;
  SFX: SFXAPI;
  Assets: AssetsAPI;
  Input: InputAPI;
  Net: NetAPI;
  QR: QRAPI;
  Renderer: RendererAPI;
  Colyseus: { Client: ColyseusClient };
  jsQR: typeof jsQR;
}
