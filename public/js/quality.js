// Graphics quality tiers + adaptive FPS scaling. Classic script -> window.Quality.
// render3d.js reads cfg() for renderer/pipeline settings and calls sample(dt) each
// frame; main.js drives set() from the settings UI. Auto-downscales (never up).
(function () {
  const TIERS = {
    low:  { name: "Low",  pixelRatio: 1.0, bloom: false, shadows: "blob", shadowMap: 0,    particles: 0.5, decor: 0.4 },
    med:  { name: "Med",  pixelRatio: 1.5, bloom: true,  shadows: "map",  shadowMap: 1024, particles: 1.0, decor: 1.0 },
    high: { name: "High", pixelRatio: 2.0, bloom: true,  shadows: "map",  shadowMap: 2048, particles: 1.4, decor: 1.0 },
  };
  const ORDER = ["low", "med", "high"];

  function deviceDefault() {
    const mem = navigator.deviceMemory || 4;
    const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && Math.min(innerWidth, innerHeight) < 820);
    const dpr = window.devicePixelRatio || 1;
    if (mobile || mem <= 3) return "low";
    if (mem <= 6 || dpr < 2) return "med";
    return "high";
  }

  const Quality = {
    TIERS, ORDER,
    current: "med",
    _cbs: [],
    _auto: true,
    _accum: 0, _count: 0, _window: 0,

    init() {
      let saved = null;
      try { saved = localStorage.getItem("sc_quality"); } catch (e) {}
      if (saved && TIERS[saved]) { this.current = saved; this._auto = false; }
      else { this.current = deviceDefault(); }
      return this;
    },

    cfg() { return TIERS[this.current]; },
    onChange(cb) { this._cbs.push(cb); },
    _emit() { for (const cb of this._cbs) { try { cb(this.cfg(), this.current); } catch (e) {} } },

    set(tier, fromUser) {
      if (!TIERS[tier]) return;
      const changed = tier !== this.current;
      this.current = tier;
      if (fromUser) { this._auto = false; try { localStorage.setItem("sc_quality", tier); } catch (e) {} }
      if (changed) this._emit();
    },

    // Rolling-average FPS watchdog. Steps down one tier on sustained < 45 fps.
    sample(dt) {
      if (!this._auto || !(dt > 0)) return;
      this._accum += dt; this._count++; this._window += dt;
      if (this._window < 2.5) return;
      const fps = this._count / this._accum;
      this._accum = 0; this._count = 0; this._window = 0;
      if (fps < 45) {
        const i = ORDER.indexOf(this.current);
        if (i > 0) this.set(ORDER[i - 1], false);
        else this._auto = false; // already lowest
      }
    },
  };

  window.Quality = Quality.init();
})();
