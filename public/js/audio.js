"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/client/audio.ts
  var require_audio = __commonJS({
    "src/client/audio.ts"() {
      var NAMES = ["fire", "hit", "explosion", "kill", "ui", "engine", "music"];
      var buffers = {};
      var ctx = null;
      var master = null;
      var musicBus = null;
      var sfxBus = null;
      var engineGain = null;
      var engineSrc = null;
      var musicSrc = null;
      var loaded = false;
      var loading = false;
      var want = { music: false, engine: false };
      var clamp = (v) => {
        const n = parseFloat(v);
        return isNaN(n) ? 0 : Math.max(0, Math.min(1, n));
      };
      var rd = (k, d) => {
        try {
          const v = localStorage.getItem(k);
          return v == null ? d : parseFloat(v);
        } catch (_e) {
          return d;
        }
      };
      var wr = (k, v) => {
        try {
          localStorage.setItem(k, String(v));
        } catch (_e) {
        }
      };
      var store = {
        master: rd("sc_vol_master", 0.8),
        music: rd("sc_vol_music", 0.5),
        sfx: rd("sc_vol_sfx", 0.9),
        muted: !!rd("sc_muted", 0)
      };
      function applyVolumes() {
        if (!ctx || !master || !musicBus || !sfxBus) return;
        master.gain.value = store.muted ? 0 : store.master;
        musicBus.gain.value = store.music;
        sfxBus.gain.value = store.sfx;
      }
      function ensureCtx() {
        if (ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain();
        master.connect(ctx.destination);
        musicBus = ctx.createGain();
        musicBus.connect(master);
        sfxBus = ctx.createGain();
        sfxBus.connect(master);
        engineGain = ctx.createGain();
        engineGain.gain.value = 0;
        engineGain.connect(sfxBus);
        applyVolumes();
      }
      async function load() {
        if (loaded || loading || !ctx) return;
        loading = true;
        await Promise.all(NAMES.map(async (name) => {
          try {
            const res = await fetch(`/assets/audio/${name}.wav`);
            buffers[name] = await ctx.decodeAudioData(await res.arrayBuffer());
          } catch (_e) {
            buffers[name] = null;
          }
        }));
        loaded = true;
        loading = false;
        if (want.music) startMusicNow();
        if (want.engine) startEngineNow();
      }
      function playBuf(name, rate, gain) {
        if (!ctx || !sfxBus) return;
        const b = buffers[name];
        if (!b) return synthFallback(name);
        const src = ctx.createBufferSource();
        src.buffer = b;
        if (rate) src.playbackRate.value = rate;
        const g = ctx.createGain();
        g.gain.value = gain == null ? 1 : gain;
        src.connect(g);
        g.connect(sfxBus);
        src.start();
      }
      var SYNTH_MAP = {
        fire: [660, 0.08, "square"],
        hit: [170, 0.1, "sawtooth"],
        explosion: [90, 0.4, "sawtooth"],
        kill: [880, 0.25, "square"],
        ui: [520, 0.05, "square"]
      };
      function synthFallback(name) {
        if (!ctx || !sfxBus) return;
        const [f, d, ty] = SYNTH_MAP[name] || [440, 0.1, "square"];
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = ty;
        o.frequency.value = f;
        g.gain.setValueAtTime(0.25, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(1e-3, ctx.currentTime + d);
        o.connect(g);
        g.connect(sfxBus);
        o.start();
        o.stop(ctx.currentTime + d);
      }
      function startMusicNow() {
        if (!ctx || musicSrc || !buffers.music) return;
        musicSrc = ctx.createBufferSource();
        musicSrc.buffer = buffers.music;
        musicSrc.loop = true;
        musicSrc.connect(musicBus);
        musicSrc.start();
      }
      function startEngineNow() {
        if (!ctx || engineSrc || !buffers.engine) return;
        engineSrc = ctx.createBufferSource();
        engineSrc.buffer = buffers.engine;
        engineSrc.loop = true;
        engineSrc.connect(engineGain);
        engineSrc.start();
      }
      var menuAmbient = null;
      var menuAmbientGain = null;
      function startMenuAmbient() {
        if (!ctx || menuAmbient) return;
        try {
          menuAmbient = ctx.createOscillator();
          menuAmbientGain = ctx.createGain();
          menuAmbient.type = "sine";
          menuAmbient.frequency.value = 82;
          menuAmbientGain.gain.value = 0;
          menuAmbientGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.5);
          menuAmbient.connect(menuAmbientGain);
          menuAmbientGain.connect(masterBus);
          menuAmbient.start();
        } catch (_e) {
          menuAmbient = null;
        }
      }
      function stopMenuAmbient() {
        if (menuAmbientGain) {
          try {
            menuAmbientGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
          } catch (_e) {
          }
        }
        setTimeout(() => {
          try {
            menuAmbient && menuAmbient.stop();
          } catch (_e) {
          }
          menuAmbient = null;
          menuAmbientGain = null;
        }, 600);
      }
      window.SFX = {
        unlock() {
          ensureCtx();
          if (ctx && ctx.state === "suspended") ctx.resume();
          load();
        },
        suspend() {
          if (ctx && ctx.state === "running") {
            try {
              ctx.suspend();
            } catch (_e) {
            }
          }
        },
        resume() {
          if (ctx && ctx.state === "suspended") {
            try {
              ctx.resume();
            } catch (_e) {
            }
          }
        },
        stopLoops() {
          try {
            musicSrc && musicSrc.stop();
          } catch (_e) {
          }
          try {
            engineSrc && engineSrc.stop();
          } catch (_e) {
          }
          musicSrc = null;
          engineSrc = null;
          want.music = false;
          want.engine = false;
        },
        startMusic() {
          want.music = true;
          if (loaded) startMusicNow();
        },
        startEngine() {
          want.engine = true;
          if (loaded) startEngineNow();
        },
        startMenuAmbient() {
          ensureCtx();
          startMenuAmbient();
        },
        stopMenuAmbient() {
          stopMenuAmbient();
        },
        setEngine(speed, boosting) {
          if (!ctx || !engineGain) return;
          engineGain.gain.value = boosting ? 0.22 : 0.04 + (speed || 0) * 0.14;
          if (engineSrc) engineSrc.playbackRate.value = 0.9 + (speed || 0) * 0.5;
        },
        fire() {
          playBuf("fire", 0.95 + Math.random() * 0.1);
        },
        hit() {
          playBuf("hit");
        },
        explosion() {
          playBuf("explosion");
        },
        kill() {
          playBuf("kill");
        },
        go() {
          playBuf("ui", 0.7, 0.8);
        },
        uiClick() {
          playBuf("ui");
        },
        pickup() {
          playBuf("ui", 1.6, 0.9);
        },
        toggleMute() {
          store.muted = !store.muted;
          wr("sc_muted", store.muted ? 1 : 0);
          applyVolumes();
          return store.muted;
        },
        isMuted() {
          return store.muted;
        },
        setMaster(v) {
          store.master = clamp(v);
          wr("sc_vol_master", store.master);
          applyVolumes();
        },
        setMusic(v) {
          store.music = clamp(v);
          wr("sc_vol_music", store.music);
          applyVolumes();
        },
        setSfx(v) {
          store.sfx = clamp(v);
          wr("sc_vol_sfx", store.sfx);
          applyVolumes();
        },
        vols() {
          return { master: store.master, music: store.music, sfx: store.sfx, muted: store.muted };
        }
      };
    }
  });
  require_audio();
})();
