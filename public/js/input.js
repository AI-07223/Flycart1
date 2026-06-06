// Unified input: keyboard, gyroscope (tilt-to-steer), and on-screen touch.
// All sources feed the same analog turn (-1..1), boost, and fire outputs.
(function () {
  const keys = {};

  const Input = {
    turn: 0,
    boost: false,
    fire: false,
    onPause: null,
    onMute: null,

    // Touch button state (set by main.js from on-screen controls).
    touch: { left: false, right: false, boost: false, fire: false, stick: 0 },
    stickActive: false, // true when steering mode = virtual thumbstick

    // Gyro state.
    gyro: { enabled: false, supported: false, turn: 0, base: null, sens: 1.0 },

    // Steering handedness. Base mapping is negated so a right input turns right (a +rotation
    // about the surface normal is CCW-from-camera = left). invertSteer flips it back for players
    // who prefer inverted (set from in-game control settings).
    invertSteer: false,

    get() {
      const kLeft = keys["ArrowLeft"] || keys["a"] || keys["A"];
      const kRight = keys["ArrowRight"] || keys["d"] || keys["D"];
      let turn = (kRight ? 1 : 0) - (kLeft ? 1 : 0);

      // Touch arrows (used when gyro is off).
      if (this.touch.left) turn -= 1;
      if (this.touch.right) turn += 1;

      // Gyro tilt (analog) — takes over when active and no key/arrow override.
      if (this.gyro.enabled && turn === 0) turn = this.gyro.turn;
      // Virtual thumbstick (analog) — when that steering mode is active.
      if (this.stickActive && turn === 0) turn = this.touch.stick;

      const sign = this.invertSteer ? 1 : -1; // base -1 = correct handedness (right→right)
      this.turn = Math.max(-1, Math.min(1, sign * turn));
      this.boost = !!(keys["ArrowUp"] || keys["w"] || keys["W"] || keys["Shift"] || this.touch.boost);
      this.fire = !!(keys[" "] || keys["Spacebar"] || this.touch.fire);
      return this;
    },

    attach() {
      window.addEventListener("keydown", (e) => {
        keys[e.key] = true;
        if (e.key === " " || e.key.startsWith("Arrow")) e.preventDefault();
        if (e.key === "p" || e.key === "P") this.onPause && this.onPause();
        if (e.key === "m" || e.key === "M") this.onMute && this.onMute();
      });
      window.addEventListener("keyup", (e) => { keys[e.key] = false; });
      window.addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

      this.gyro.supported =
        typeof window.DeviceOrientationEvent !== "undefined";
    },

    isTouchDevice() {
      return "ontouchstart" in window || navigator.maxTouchPoints > 0;
    },

    // Must be called from a user gesture (iOS requires a permission prompt).
    async enableGyro() {
      if (!this.gyro.supported) return false;
      try {
        const DOE = window.DeviceOrientationEvent;
        if (DOE && typeof DOE.requestPermission === "function") {
          const res = await DOE.requestPermission();
          if (res !== "granted") return false;
        }
      } catch (e) {
        return false;
      }
      this.gyro.base = null; // recalibrate neutral on next reading
      window.addEventListener("deviceorientation", (e) => this._onOrient(e), true);
      this.gyro.enabled = true;
      return true;
    },

    recalibrateGyro() { this.gyro.base = null; },
    setGyroSensitivity(s) { this.gyro.sens = s; },
    disableGyro() { this.gyro.enabled = false; this.gyro.turn = 0; },

    _onOrient(e) {
      if (e.gamma == null && e.beta == null) return;
      // Pick the axis that maps to left/right tilt for the current orientation.
      const ang =
        (screen.orientation && screen.orientation.angle) ||
        window.orientation || 0;
      let val;
      if (ang === 90) val = e.beta;
      else if (ang === 270 || ang === -90) val = -e.beta;
      else if (ang === 180) val = -e.gamma;
      else val = e.gamma; // portrait

      if (val == null) return;
      if (this.gyro.base === null) this.gyro.base = val;

      let d = val - this.gyro.base;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;

      const dead = 3;       // degrees of deadzone
      const fullAt = 24;    // degrees of tilt for a full turn
      let t = 0;
      if (Math.abs(d) > dead) t = (d - Math.sign(d) * dead) / fullAt;
      this.gyro.turn = Math.max(-1, Math.min(1, t * this.gyro.sens));
    },
  };

  window.Input = Input;
})();
