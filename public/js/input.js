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
        climb: 0,
        boost: false,
        fire: false,
        onPause: null,
        onMute: null,
        invertSteer: false,
        invertPitch: false,
        touch: { left: false, right: false, climb: false, dive: false, boost: false, fire: false },
        controlScheme: "dpad",
        // Joystick internals
        _joystick: {
          active: false,
          identifier: -1,
          baseX: 0,
          baseY: 0,
          dx: 0,
          dy: 0
        },
        // Tilt internals
        _tilt: {
          active: false,
          centerGamma: 0,
          centerBeta: 0,
          gamma: 0,
          beta: 0,
          permissionGranted: false
        },
        // Joystick max radius in px for full deflection
        _joystickRadius: 60,
        get() {
          if (this.controlScheme === "joystick") {
            const rawX = this._joystick.dx;
            const rawY = this._joystick.dy;
            this.turn = this.invertSteer ? -rawX : rawX;
            const rawClimb2 = -rawY;
            this.climb = this.invertPitch ? -rawClimb2 : rawClimb2;
            this.boost = !!(keys["Shift"] || this.touch.boost);
            this.fire = !!(keys[" "] || keys["Spacebar"] || this.touch.fire);
            return this;
          }
          if (this.controlScheme === "tilt") {
            const DEADZONE = 5;
            const RANGE = 30;
            const dGamma = this._tilt.gamma - this._tilt.centerGamma;
            const dBeta = this._tilt.beta - this._tilt.centerBeta;
            const rawX = Math.max(-1, Math.min(
              1,
              Math.sign(dGamma) * Math.max(0, (Math.abs(dGamma) - DEADZONE) / (RANGE - DEADZONE))
            ));
            const rawY = Math.max(-1, Math.min(
              1,
              Math.sign(dBeta) * Math.max(0, (Math.abs(dBeta) - DEADZONE) / (RANGE - DEADZONE))
            ));
            this.turn = this.invertSteer ? -rawX : rawX;
            const rawClimb2 = rawY;
            this.climb = this.invertPitch ? -rawClimb2 : rawClimb2;
            this.boost = !!(keys["Shift"] || this.touch.boost);
            this.fire = !!(keys[" "] || keys["Spacebar"] || this.touch.fire);
            return this;
          }
          const left = !!(keys["ArrowLeft"] || keys["a"] || keys["A"] || this.touch.left);
          const right = !!(keys["ArrowRight"] || keys["d"] || keys["D"] || this.touch.right);
          const climbUp = !!(keys["ArrowUp"] || keys["w"] || keys["W"] || this.touch.climb);
          const diveDown = !!(keys["ArrowDown"] || keys["s"] || keys["S"] || this.touch.dive);
          const steer = (right ? 1 : 0) - (left ? 1 : 0);
          this.turn = this.invertSteer ? -steer : steer;
          const rawClimb = (climbUp ? 1 : 0) - (diveDown ? 1 : 0);
          this.climb = this.invertPitch ? -rawClimb : rawClimb;
          this.boost = !!(keys["Shift"] || this.touch.boost);
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
        },
        isTouchDevice() {
          return "ontouchstart" in window || navigator.maxTouchPoints > 0;
        },
        // ─── JOYSTICK TOUCH HANDLERS ──────────────────────────────────────────────
        attachJoystick(baseEl, thumbEl) {
          const onStart = (e) => {
            if (this._joystick.active) return;
            const touch = e.changedTouches[0];
            this._joystick.active = true;
            this._joystick.identifier = touch.identifier;
            const rect = baseEl.getBoundingClientRect();
            this._joystick.baseX = rect.left + rect.width / 2;
            this._joystick.baseY = rect.top + rect.height / 2;
            baseEl.classList.add("active");
            this._updateJoystick(touch);
          };
          const onMove = (e) => {
            if (!this._joystick.active) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
              if (e.changedTouches[i].identifier === this._joystick.identifier) {
                this._updateJoystick(e.changedTouches[i]);
                break;
              }
            }
          };
          const onEnd = (e) => {
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
          window.addEventListener("touchmove", onMove, { passive: true });
          window.addEventListener("touchend", onEnd, { passive: true });
          window.addEventListener("touchcancel", onEnd, { passive: true });
        },
        _updateJoystick(touch) {
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
        calibrateTilt() {
          this._tilt.centerGamma = this._tilt.gamma;
          this._tilt.centerBeta = this._tilt.beta;
        },
        attachTilt() {
          if (!window.DeviceOrientationEvent) return;
          const handler = (e) => {
            if (e.gamma !== null) this._tilt.gamma = e.gamma;
            if (e.beta !== null) this._tilt.beta = e.beta;
            if (!this._tilt.active) {
              this._tilt.active = true;
              this.calibrateTilt();
            }
          };
          const doAttach = () => {
            window.addEventListener("deviceorientation", handler);
            this._tilt.permissionGranted = true;
          };
          const DevOri = DeviceOrientationEvent;
          if (typeof DevOri.requestPermission === "function") {
            DevOri.requestPermission().then((result) => {
              if (result === "granted") doAttach();
              else {
                this.controlScheme = "dpad";
                try {
                  localStorage.setItem("smashcart.controls", "dpad");
                } catch {
                }
                this._notifySchemeChange("dpad", "Motion permission denied \u2014 switched to D-Pad.");
              }
            }).catch(() => {
              this.controlScheme = "dpad";
              try {
                localStorage.setItem("smashcart.controls", "dpad");
              } catch {
              }
              this._notifySchemeChange("dpad", "Motion not supported \u2014 switched to D-Pad.");
            });
          } else {
            doAttach();
            if (!("DeviceOrientationEvent" in window)) {
              this.controlScheme = "dpad";
              try {
                localStorage.setItem("smashcart.controls", "dpad");
              } catch {
              }
              this._notifySchemeChange("dpad", "Gyro not supported \u2014 switched to D-Pad.");
            }
          }
        },
        // Callback for scheme-change notifications (wired by main.ts)
        onSchemeChange: null,
        _notifySchemeChange(scheme, msg) {
          if (this.onSchemeChange) this.onSchemeChange(scheme, msg);
        },
        setControlScheme(scheme) {
          this.controlScheme = scheme;
          try {
            localStorage.setItem("smashcart.controls", scheme);
          } catch {
          }
          this._joystick.dx = 0;
          this._joystick.dy = 0;
          this._joystick.active = false;
          this._tilt.gamma = 0;
          this._tilt.beta = 0;
          this._notifySchemeChange(scheme);
        }
      };
      window.Input = Input;
    }
  });
  require_input();
})();
