// Keyboard input. Auto-thrust is always on; the player steers, boosts, fires.
(function () {
  const keys = {};
  const Input = {
    turn: 0,
    boost: false,
    fire: false,
    onPause: null,
    onMute: null,

    get() {
      const left = keys["ArrowLeft"] || keys["a"] || keys["A"];
      const right = keys["ArrowRight"] || keys["d"] || keys["D"];
      this.turn = (right ? 1 : 0) - (left ? 1 : 0);
      this.boost = !!(keys["ArrowUp"] || keys["w"] || keys["W"] || keys["Shift"]);
      this.fire = !!(keys[" "] || keys["Spacebar"]);
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
    },
  };

  window.Input = Input;
})();
