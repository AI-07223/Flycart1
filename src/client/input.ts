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

  get(): typeof Input {
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
};

(window as any).Input = Input;