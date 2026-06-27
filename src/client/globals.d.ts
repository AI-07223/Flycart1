// Type declarations for window.* globals used by the SmashCart client.

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
  get(): InputAPI;
  attach(): void;
  isTouchDevice(): boolean;
}

interface SnapshotPlayer {
  p: Vec3;
  f: Vec3;
  alive: boolean;
  speed: number;
  turn: number;
  climb: number;
  seq: number;
}

interface Snapshot {
  t: number;
  players: Record<string, SnapshotPlayer>;
}

interface NetAPI {
  client: any | null;
  room: any | null;
  sessionId: string | null;
  serverOrigin: string | null;
  lastSent: { seq: number; turn: number; climb: number; boost: boolean; fire: boolean };
  snaps: Snapshot[];
  onKill: ((msg: any) => void) | null;
  onPickup: ((msg: any) => void) | null;
  onDisconnect: ((info: any) => void) | null;
  reconnectToken: string | null;
  endpoint(origin?: string | null): string;
  connect(name: string, code: string, skin: number, serverOrigin?: string | null): Promise<any>;
  tryReconnect(): Promise<boolean>;
  sample(renderTime: number): Record<string, SnapshotPlayer>;
  sendInput(turn: number, climb: number, boost: boolean, fire: boolean): void;
  setName(name: string): void;
  leave(): void;
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
  drawMenu(dt: number, skin: number): void;
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
}
