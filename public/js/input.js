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
        get() {
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
        }
      };
      window.Input = Input;
    }
  });
  require_input();
})();
