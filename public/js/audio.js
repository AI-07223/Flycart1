// Procedural sound — everything synthesized with the Web Audio API.
// No audio files, no licensing. Must be unlocked by a user gesture.
(function () {
  let ctx = null;
  let master = null;
  let engineNodes = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
    return ctx;
  }

  function unlock() {
    ensure();
    if (ctx.state === "suspended") ctx.resume();
  }

  function blip(freq, dur, type, gain, sweepTo) {
    if (muted || !ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t);
    if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    g.gain.setValueAtTime(gain || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, gain, filterFreq) {
    if (muted || !ctx) return;
    const t = ctx.currentTime;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = filterFreq || 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain || 0.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur);
  }

  const SFX = {
    unlock,
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.6; return muted; },
    isMuted() { return muted; },

    shoot() { blip(720, 0.08, "square", 0.12, 220); },
    hit() { blip(180, 0.07, "sawtooth", 0.18, 90); },
    explosion() {
      noiseBurst(0.45, 0.5, 900);
      blip(120, 0.4, "sawtooth", 0.25, 40);
    },
    pickup() { blip(520, 0.09, "triangle", 0.2, 880); setTimeout(() => blip(880, 0.1, "triangle", 0.2, 1200), 70); },
    countdown() { blip(440, 0.12, "square", 0.2); },
    go() { blip(660, 0.25, "square", 0.25, 990); },
    uiClick() { blip(330, 0.06, "square", 0.15, 440); },

    // Continuous engine drone; call setEngine(speed01, boosting) each frame.
    startEngine() {
      if (muted || !ctx || engineNodes) return;
      const o = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sawtooth"; sub.type = "sine";
      o.frequency.value = 90; sub.frequency.value = 45;
      g.gain.value = 0.0;
      o.connect(g); sub.connect(g); g.connect(master);
      o.start(); sub.start();
      engineNodes = { o, sub, g };
    },
    setEngine(speed01, boosting) {
      if (!engineNodes) return;
      const base = 70 + speed01 * 120 + (boosting ? 40 : 0);
      engineNodes.o.frequency.setTargetAtTime(base, ctx.currentTime, 0.05);
      engineNodes.sub.frequency.setTargetAtTime(base / 2, ctx.currentTime, 0.05);
      engineNodes.g.gain.setTargetAtTime(muted ? 0 : 0.05 + speed01 * 0.04, ctx.currentTime, 0.1);
    },
    stopEngine() {
      if (!engineNodes) return;
      try { engineNodes.o.stop(); engineNodes.sub.stop(); } catch (e) {}
      engineNodes = null;
    },
  };

  window.SFX = SFX;
})();
