// Unified flat-world input: keyboard on desktop, on-screen buttons on touch.

const keys: Record<string, boolean> = {};

interface TouchState {
  left: boolean;
  right: boolean;
  climb: boolean;
  dive: boolean;
  boost: boolean;
  fire: boolean;
}

// ─── JOYSTICK STATE ──────────────────────────────────────────────────────────
interface JoystickState {
  active: boolean;
  identifier: number;
  baseX: number;
  baseY: number;
  dx: number;  // normalised [-1..1]
  dy: number;  // normalised [-1..1]
}

// ─── TILT STATE ───────────────────────────────────────────────────────────────
interface TiltState {
  active: boolean;
  centerGamma: number;  // calibration baseline
  centerBeta: number;
  gamma: number;        // current device gamma (left/right tilt)
  beta: number;         // current device beta  (forward/back tilt)
  permissionGranted: boolean;
}

type ControlScheme = "dpad" | "joystick" | "tilt";

const Input = {
  turn: 0,
  climb: 0,
  boost: false,
  fire: false,
  onPause: null as (() => void) | null,
  onMute: null as (() => void) | null,
  invertSteer: false,
  invertPitch: false,
  touch: { left: false, right: false, climb: false, dive: false, boost: false, fire: false } as TouchState,
  controlScheme: "dpad" as ControlScheme,

  // Joystick internals
  _joystick: {
    active: false, identifier: -1, baseX: 0, baseY: 0, dx: 0, dy: 0,
  } as JoystickState,

  // Tilt internals
  _tilt: {
    active: false, centerGamma: 0, centerBeta: 0, gamma: 0, beta: 0, permissionGranted: false,
  } as TiltState,

  // Joystick max radius in px for full deflection
  _joystickRadius: 60,

  get(): typeof Input {
    if (this.controlScheme === "joystick") {
      // Joystick: analog stick drives turn + climb; touch.boost/fire for right buttons
      const rawX = this._joystick.dx;
      const rawY = this._joystick.dy; // positive Y = stick down = dive
      this.turn  = this.invertSteer ? -rawX : rawX;
      // dy > 0 means stick pushed down (toward user) -> dive -> negative climb
      const rawClimb = -rawY;
      this.climb = this.invertPitch ? -rawClimb : rawClimb;
      this.boost = !!(keys["Shift"] || this.touch.boost);
      this.fire  = !!(keys[" "] || keys["Spacebar"] || this.touch.fire);
      return this;
    }

    if (this.controlScheme === "tilt") {
      // Tilt: gyro drives turn + climb; right buttons for boost/fire
      const DEADZONE = 5;   // degrees
      const RANGE    = 30;  // degrees from centre for full deflection

      const dGamma = this._tilt.gamma - this._tilt.centerGamma;
      const dBeta  = this._tilt.beta  - this._tilt.centerBeta;

      const rawX = Math.max(-1, Math.min(1,
        Math.sign(dGamma) * Math.max(0, (Math.abs(dGamma) - DEADZONE) / (RANGE - DEADZONE))
      ));
      const rawY = Math.max(-1, Math.min(1,
        Math.sign(dBeta) * Math.max(0, (Math.abs(dBeta) - DEADZONE) / (RANGE - DEADZONE))
      ));

      this.turn  = this.invertSteer ? -rawX : rawX;
      // tilt forward (positive beta) = climb
      const rawClimb = rawY;
      this.climb = this.invertPitch ? -rawClimb : rawClimb;
      this.boost = !!(keys["Shift"] || this.touch.boost);
      this.fire  = !!(keys[" "] || keys["Spacebar"] || this.touch.fire);
      return this;
    }

    // D-Pad (default): existing button behaviour
    const left    = !!(keys["ArrowLeft"]  || keys["a"] || keys["A"] || this.touch.left);
    const right   = !!(keys["ArrowRight"] || keys["d"] || keys["D"] || this.touch.right);
    const climbUp = !!(keys["ArrowUp"]    || keys["w"] || keys["W"] || this.touch.climb);
    const diveDown= !!(keys["ArrowDown"]  || keys["s"] || keys["S"] || this.touch.dive);

    const steer = (right ? 1 : 0) - (left ? 1 : 0);
    this.turn = this.invertSteer ? -steer : steer;
    const rawClimb = (climbUp ? 1 : 0) - (diveDown ? 1 : 0);
    this.climb = this.invertPitch ? -rawClimb : rawClimb;
    this.boost = !!(keys["Shift"] || this.touch.boost);
    this.fire  = !!(keys[" "] || keys["Spacebar"] || this.touch.fire);
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
  },

  isTouchDevice(): boolean {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  },

  // ─── JOYSTICK TOUCH HANDLERS ──────────────────────────────────────────────
  attachJoystick(baseEl: HTMLElement, thumbEl: HTMLElement): void {
    const onStart = (e: TouchEvent) => {
      if (this._joystick.active) return;
      const touch = e.changedTouches[0];
      this._joystick.active = true;
      this._joystick.identifier = touch.identifier;
      const rect = baseEl.getBoundingClientRect();
      this._joystick.baseX = rect.left + rect.width  / 2;
      this._joystick.baseY = rect.top  + rect.height / 2;
      baseEl.classList.add("active");
      this._updateJoystick(touch);
    };
    const onMove = (e: TouchEvent) => {
      if (!this._joystick.active) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this._joystick.identifier) {
          this._updateJoystick(e.changedTouches[i]);
          break;
        }
      }
    };
    const onEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this._joystick.identifier) {
          this._joystick.active = false;
          this._joystick.dx = 0;
          this._joystick.dy = 0;
          thumbEl.style.transform = "translate(-50%, -50%)";
          baseEl.classList.remove("active");
          break;
        }
      }
    };
    baseEl.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove",  onMove,  { passive: true });
    window.addEventListener("touchend",   onEnd,   { passive: true });
    window.addEventListener("touchcancel",onEnd,   { passive: true });
  },

  _updateJoystick(touch: Touch): void {
    const joyEl = document.getElementById("joystick-thumb");
    const dx = touch.clientX - this._joystick.baseX;
    const dy = touch.clientY - this._joystick.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const r = this._joystickRadius;
    const clampDist = Math.min(dist, r);
    const angle = Math.atan2(dy, dx);
    const cx = Math.cos(angle) * clampDist;
    const cy = Math.sin(angle) * clampDist;
    this._joystick.dx = cx / r;
    this._joystick.dy = cy / r;
    if (joyEl) {
      joyEl.style.transform = `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px))`;
    }
  },

  // ─── TILT (GYRO) ──────────────────────────────────────────────────────────
  calibrateTilt(): void {
    this._tilt.centerGamma = this._tilt.gamma;
    this._tilt.centerBeta  = this._tilt.beta;
  },

  attachTilt(): void {
    if (!window.DeviceOrientationEvent) return;

    const handler = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) this._tilt.gamma = e.gamma;
      if (e.beta  !== null) this._tilt.beta  = e.beta;
      if (!this._tilt.active) {
        this._tilt.active = true;
        this.calibrateTilt();
      }
    };

    const doAttach = () => {
      window.addEventListener("deviceorientation", handler as EventListener);
      this._tilt.permissionGranted = true;
    };

    // iOS 13+ requires explicit permission from a user gesture
    const DevOri = DeviceOrientationEvent as any;
    if (typeof DevOri.requestPermission === "function") {
      DevOri.requestPermission()
        .then((result: string) => {
          if (result === "granted") doAttach();
          else {
            // Permission denied — fall back to dpad and notify
            this.controlScheme = "dpad";
            try { localStorage.setItem("smashcart.controls", "dpad"); } catch {}
            this._notifySchemeChange("dpad", "Motion permission denied — switched to D-Pad.");
          }
        })
        .catch(() => {
          this.controlScheme = "dpad";
          try { localStorage.setItem("smashcart.controls", "dpad"); } catch {}
          this._notifySchemeChange("dpad", "Motion not supported — switched to D-Pad.");
        });
    } else {
      // Non-iOS: attach directly
      doAttach();
      if (!("DeviceOrientationEvent" in window)) {
        this.controlScheme = "dpad";
        try { localStorage.setItem("smashcart.controls", "dpad"); } catch {}
        this._notifySchemeChange("dpad", "Gyro not supported — switched to D-Pad.");
      }
    }
  },

  // Callback for scheme-change notifications (wired by main.ts)
  onSchemeChange: null as ((scheme: ControlScheme, msg?: string) => void) | null,

  _notifySchemeChange(scheme: ControlScheme, msg?: string): void {
    if (this.onSchemeChange) this.onSchemeChange(scheme, msg);
  },

  setControlScheme(scheme: ControlScheme): void {
    this.controlScheme = scheme;
    try { localStorage.setItem("smashcart.controls", scheme); } catch {}
    // Reset analog state on scheme change
    this._joystick.dx = 0;
    this._joystick.dy = 0;
    this._joystick.active = false;
    this._tilt.gamma = 0;
    this._tilt.beta  = 0;
    this._notifySchemeChange(scheme);
  },
};

(window as any).Input = Input;
