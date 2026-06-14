"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/client/input.ts
  var require_input = __commonJS({
    "src/client/input.ts"() {
      var keys = {};
      var Input = {
        turn: 0,
        boost: false,
        fire: false,
        onPause: null,
        onMute: null,
        // Touch button state (set by main.js from on-screen controls).
        touch: { left: false, right: false, boost: false, fire: false, stick: 0 },
        stickActive: false,
        // true when steering mode = virtual thumbstick
        // Gyro state.
        gyro: { enabled: false, supported: false, turn: 0, base: null, sens: 1 },
        // Steering handedness. Base mapping is negated so a right input turns right (a +rotation
        // about the surface normal is CCW-from-camera = left). invertSteer flips it back for players
        // who prefer inverted (set from in-game control settings).
        invertSteer: false,
        get() {
          const kLeft = keys["ArrowLeft"] || keys["a"] || keys["A"];
          const kRight = keys["ArrowRight"] || keys["d"] || keys["D"];
          let t = (kRight ? 1 : 0) - (kLeft ? 1 : 0);
          if (this.touch.left) t -= 1;
          if (this.touch.right) t += 1;
          if (this.gyro.enabled && t === 0) t = this.gyro.turn;
          if (this.stickActive && t === 0) t = this.touch.stick;
          const sign = this.invertSteer ? 1 : -1;
          this.turn = Math.max(-1, Math.min(1, sign * t));
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
          window.addEventListener("keyup", (e) => {
            keys[e.key] = false;
          });
          window.addEventListener("blur", () => {
            for (const k in keys) keys[k] = false;
          });
          this.gyro.supported = typeof window.DeviceOrientationEvent !== "undefined";
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
          } catch (_e) {
            return false;
          }
          this.gyro.base = null;
          window.addEventListener("deviceorientation", (e) => this._onOrient(e), true);
          this.gyro.enabled = true;
          return true;
        },
        recalibrateGyro() {
          this.gyro.base = null;
        },
        setGyroSensitivity(s) {
          this.gyro.sens = s;
        },
        disableGyro() {
          this.gyro.enabled = false;
          this.gyro.turn = 0;
        },
        _onOrient(e) {
          if (e.gamma == null && e.beta == null) return;
          const ang = screen.orientation && screen.orientation.angle || window.orientation || 0;
          let val;
          if (ang === 90) val = e.beta;
          else if (ang === 270 || ang === -90) val = e.beta != null ? -e.beta : null;
          else if (ang === 180) val = e.gamma != null ? -e.gamma : null;
          else val = e.gamma;
          if (val == null) return;
          if (this.gyro.base === null) this.gyro.base = val;
          let d = val - this.gyro.base;
          if (d > 180) d -= 360;
          if (d < -180) d += 360;
          const dead = 3;
          const fullAt = 24;
          let t = 0;
          if (Math.abs(d) > dead) t = (d - Math.sign(d) * dead) / fullAt;
          this.gyro.turn = Math.max(-1, Math.min(1, t * this.gyro.sens));
        }
      };
      window.Input = Input;
    }
  });
  require_input();
})();
