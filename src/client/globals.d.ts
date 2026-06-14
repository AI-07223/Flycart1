// Type declarations for window.* globals used by the SmashCart client.
// These are loaded via <script> tags and expose themselves on `window`.

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
  rotateAxis(v: Vec3, k: Vec3, ang: number): Vec3;
  anyTangent(p: Vec3): Vec3;
  tangentize(p: Vec3, f: Vec3): Vec3;
  advance(p: Vec3, f: Vec3, ang: number): { p: Vec3; f: Vec3 };
  turn(p: Vec3, f: Vec3, ang: number): Vec3;
  angBetween(a: Vec3, b: Vec3): number;
  slerp(a: Vec3, b: Vec3, t: number): Vec3;
  signedAngle(normal: Vec3, from: Vec3, to: Vec3): number;
  dirFrom(base: Vec3, ang: number, az: number): Vec3;
  randomDir(rng?: () => number): Vec3;
}

interface PowerupInfo {
  label: string;
  color: number;
  icon: string;
}

interface ObstacleBehavior {
  solid: boolean;
  blocksBullets: boolean;
}

interface ObstacleSpec {
  ang: number;
  az: number;
  angRadius: number;
  height: number;
  kind: string;
  landmark?: string;
}

interface Obstacle {
  dir: Vec3;
  angRadius: number;
  height: number;
  kind: string;
  landmark?: string;
}

interface GameConstants {
  CRUISE_SPEED: number;
  BOOST_SPEED: number;
  ACCEL: number;
  TURN_RATE: number;
  PLANE_RADIUS: number;
  MAX_HP: number;
  BULLET_SPEED: number;
  AFTERBURNER_FACTOR: number;
  RAPID_FACTOR: number;
  FIRE_COOLDOWN: number;
  BULLET_LIFE: number;
  BULLET_RADIUS: number;
  SPREAD_ANGLE: number;
  HOMING_TURN: number;
  TICK_RATE: number;
  SKIN_COUNT: number;
  R_BASE: number;
  R_MIN: number;
  R_MAX: number;
  N_BASE: number;
  POWERUP_DURATION: number;
  ZONES: { centerAng: number; midAng: number };
  OBSTACLE_BEHAVIOR: Record<string, ObstacleBehavior>;
  SPAWN_REROLL: number;
  POWERUPS: Record<string, PowerupInfo>;
  OB_SPECS: ObstacleSpec[];
  HOTSPOT_DIR: Vec3;
  OBSTACLES: Obstacle[];
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
  boost: boolean;
  fire: boolean;
  stick: number;
}

interface GyroState {
  enabled: boolean;
  supported: boolean;
  turn: number;
  base: number | null;
  sens: number;
}

interface InputAPI {
  turn: number;
  boost: boolean;
  fire: boolean;
  onPause: (() => void) | null;
  onMute: (() => void) | null;
  touch: TouchState;
  stickActive: boolean;
  gyro: GyroState;
  invertSteer: boolean;
  get(): InputAPI;
  attach(): void;
  isTouchDevice(): boolean;
  enableGyro(): Promise<boolean>;
  recalibrateGyro(): void;
  setGyroSensitivity(s: number): void;
  disableGyro(): void;
}

interface SnapshotPlayer {
  p: Vec3;
  f: Vec3;
  alive: boolean;
}

interface Snapshot {
  t: number;
  players: Record<string, SnapshotPlayer>;
}

interface NetAPI {
  client: any | null;
  room: any | null;
  sessionId: string | null;
  lastSent: { turn: number; boost: boolean; fire: boolean };
  snaps: Snapshot[];
  onKill: ((msg: any) => void) | null;
  onPickup: ((msg: any) => void) | null;
  onDisconnect: ((info: any) => void) | null;
  reconnectToken: string | null;
  endpoint(): string;
  connect(name: string, code: string, skin: number): Promise<any>;
  tryReconnect(): Promise<boolean>;
  sample(renderTime: number): Record<string, SnapshotPlayer>;
  sendInput(turn: number, boost: boolean, fire: boolean): void;
  setName(name: string): void;
  leave(): void;
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
  menuClick?(x: number, y: number): string | null;
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
  Renderer: RendererAPI;
  Colyseus: { Client: ColyseusClient };
}

