// Unified input: keyboard, gyroscope (tilt-to-steer), and on-screen touch.
// All sources feed the same analog turn (-1..1), boost, and fire outputs.

const keys: Record<string, boolean> = {};

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

const Input = {
  turn: 0,
  boost: false,
  fire: false,
  onPause: null as (() => void) | null,
  onMute: null as (() => void) | null,

  // Touch button state (set by main.js from on-screen controls).
  touch: { left: false, right: false, boost: false, fire: false, stick: 0 } as TouchState,
  stickActive: false, // true when steering mode = virtual thumbstick

  // Gyro state.
  gyro: { enabled: false, supported: false, turn: 0, base: null, sens: 1.0 } as GyroState,

  // Steering handedness. Base mapping is negated so a right input turns right (a +rotation
  // about the surface normal is CCW-from-camera = left). invertSteer flips it back for players
  // who prefer inverted (set from in-game control settings).
  invertSteer: false,

  get(): typeof Input {
    const kLeft = keys["ArrowLeft"] || keys["a"] || keys["A"];
    const kRight = keys["ArrowRight"] || keys["d"] || keys["D"];
    let t = (kRight ? 1 : 0) - (kLeft ? 1 : 0);

    // Touch arrows (used when gyro is off).
    if (this.touch.left) t -= 1;
    if (this.touch.right) t += 1;

    // Gyro tilt (analog) — takes over when active and no key/arrow override.
    if (this.gyro.enabled && t === 0) t = this.gyro.turn;
    // Virtual thumbstick (analog) — when that steering mode is active.
    if (this.stickActive && t === 0) t = this.touch.stick;

    const sign = this.invertSteer ? 1 : -1; // base -1 = correct handedness (right→right)
    this.turn = Math.max(-1, Math.min(1, sign * t));
    this.boost = !!(keys["ArrowUp"] || keys["w"] || keys["W"] || keys["Shift"] || this.touch.boost);
    this.fire = !!(keys[" "] || keys["Spacebar"] || this.touch.fire);
    return this;
  },

  attach(): void {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      keys[e.key] = true;
      if (e.key === " " || e.key.startsWith("Arrow")) e.preventDefault();
      if (e.key === "p" || e.key === "P") this.onPause && this.onPause();
      if (e.key === "m" || e.key === "M") this.onMute && this.onMute();
    });
    window.addEventListener("keyup", (e: KeyboardEvent) => { keys[e.key] = false; });
    window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

    this.gyro.supported =
      typeof (window as any).DeviceOrientationEvent !== "undefined";
  },

  isTouchDevice(): boolean {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  },

  // Must be called from a user gesture (iOS requires a permission prompt).
  async enableGyro(): Promise<boolean> {
    if (!this.gyro.supported) return false;
    try {
      const DOE = (window as any).DeviceOrientationEvent;
      if (DOE && typeof DOE.requestPermission === "function") {
        const res = await DOE.requestPermission();
        if (res !== "granted") return false;
      }
    } catch (_e) {
      return false;
    }
    this.gyro.base = null; // recalibrate neutral on next reading
    window.addEventListener("deviceorientation", (e: DeviceOrientationEvent) => this._onOrient(e), true);
    this.gyro.enabled = true;
    return true;
  },

  recalibrateGyro(): void { this.gyro.base = null; },
  setGyroSensitivity(s: number): void { this.gyro.sens = s; },
  disableGyro(): void { this.gyro.enabled = false; this.gyro.turn = 0; },

  _onOrient(e: DeviceOrientationEvent): void {
    if (e.gamma == null && e.beta == null) return;
    // Pick the axis that maps to left/right tilt for the current orientation.
    const ang =
      (screen.orientation && screen.orientation.angle) ||
      (window as any).orientation || 0;
    let val: number | null | undefined;
    if (ang === 90) val = e.beta;
    else if (ang === 270 || ang === -90) val = e.beta != null ? -e.beta : null;
    else if (ang === 180) val = e.gamma != null ? -e.gamma : null;
    else val = e.gamma; // portrait

    if (val == null) return;
    if (this.gyro.base === null) this.gyro.base = val;

    let d = val - this.gyro.base!;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;

    const dead = 3;       // degrees of deadzone
    const fullAt = 24;    // degrees of tilt for a full turn
    let t = 0;
    if (Math.abs(d) > dead) t = (d - Math.sign(d) * dead) / fullAt;
    this.gyro.turn = Math.max(-1, Math.min(1, t * this.gyro.sens));
  },
};

(window as any).Input = Input;
