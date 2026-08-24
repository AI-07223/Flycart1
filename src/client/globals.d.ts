// Type declarations for window.* globals used by the SmashCart client.

// Inlined subset of TransportState — kept in sync with transport.ts.
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
  mode?: string;
  teamScore0?: number;
  teamScore1?: number;
  botDifficulty?: string;
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
  RESPAWN_DELAY: number;
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

type ControlScheme = "dpad" | "joystick" | "tilt";

interface InputAPI {
  turn: number;
  climb: number;
  boost: boolean;
  fire: boolean;
  onPause: (() => void) | null;
  onMute: (() => void) | null;
  onSchemeChange: ((scheme: ControlScheme, msg?: string) => void) | null;
  touch: TouchState;
  invertSteer: boolean;
  invertPitch: boolean;
  controlScheme: ControlScheme;
  get(): InputAPI;
  attach(): void;
  isTouchDevice(): boolean;
  attachJoystick(baseEl: HTMLElement, thumbEl: HTMLElement): void;
  calibrateTilt(): void;
  attachTilt(): void;
  setControlScheme(scheme: ControlScheme): void;
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

// window.Net is typed as the WsTransport class instance via `declare global`
// in net-ws.ts (a module can augment Window; this file deliberately stays
// import-free to preserve global scope).

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
  setHangarOpen?(open: boolean): void;
  killPopup(killerId: string, mine: boolean): void;
  hitStop(ms: number): void;
  startTakeoff?(): void;
  resize?(): void;
  setMenuSection?(sec: string): void;
  setSceneMode?(mode: string): void;
  showMenu?(): void;
  hideMenu?(): void;
}

declare interface Window {
  GAME: GameConstants;
  Sphere: SphereAPI;
  Quality: QualityAPI;
  SFX: SFXAPI;
  Assets: AssetsAPI;
  Input: InputAPI;
  QR: QRAPI;
  Renderer: RendererAPI;
}
