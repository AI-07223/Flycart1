// Sample-based audio (Web Audio). Loads self-hosted WAVs into buffers and plays
// through master -> music/sfx buses with persisted volume + mute. Falls back to
// tiny synth blips if a sample fails to load, so the game stays playable.

const NAMES = ["fire", "hit", "explosion", "kill", "ui", "engine", "music"] as const;
type SoundName = typeof NAMES[number];

const buffers: Partial<Record<SoundName, AudioBuffer | null>> = {};
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let engineGain: GainNode | null = null;
let engineSrc: AudioBufferSourceNode | null = null;
let musicSrc: AudioBufferSourceNode | null = null;
let loaded = false;
let loading = false;
const want = { music: false, engine: false };

const clamp = (v: unknown): number => { const n = parseFloat(v as string); return isNaN(n) ? 0 : Math.max(0, Math.min(1, n)); };
const rd = (k: string, d: number): number => { try { const v = localStorage.getItem(k); return v == null ? d : parseFloat(v); } catch (_e) { return d; } };
const wr = (k: string, v: number): void => { try { localStorage.setItem(k, String(v)); } catch (_e) { /* ignore */ } };

const store = {
  master: rd("sc_vol_master", 0.8),
  music: rd("sc_vol_music", 0.5),
  sfx: rd("sc_vol_sfx", 0.9),
  muted: !!rd("sc_muted", 0),
};

function applyVolumes(): void {
  if (!ctx || !master || !musicBus || !sfxBus) return;
  master.gain.value = store.muted ? 0 : store.master;
  musicBus.gain.value = store.music;
  sfxBus.gain.value = store.sfx;
}

function ensureCtx(): void {
  if (ctx) return;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.connect(master);
  engineGain = ctx.createGain(); engineGain.gain.value = 0; engineGain.connect(sfxBus);
  applyVolumes();
}

async function load(): Promise<void> {
  if (loaded || loading || !ctx) return;
  loading = true;
  await Promise.all(NAMES.map(async (name) => {
    try {
      const res = await fetch(`/assets/audio/${name}.wav`);
      buffers[name] = await ctx!.decodeAudioData(await res.arrayBuffer());
    } catch (_e) { buffers[name] = null; }
  }));
  loaded = true; loading = false;
  if (want.music) startMusicNow();
  if (want.engine) startEngineNow();
}

function playBuf(name: SoundName, rate?: number, gain?: number): void {
  if (!ctx || !sfxBus) return;
  const b = buffers[name];
  if (!b) return synthFallback(name);
  const src = ctx.createBufferSource(); src.buffer = b;
  if (rate) src.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = gain == null ? 1 : gain;
  src.connect(g); g.connect(sfxBus); src.start();
}

const SYNTH_MAP: Record<string, [number, number, OscillatorType]> = {
  fire: [660, 0.08, "square"], hit: [170, 0.1, "sawtooth"],
  explosion: [90, 0.4, "sawtooth"], kill: [880, 0.25, "square"],
  ui: [520, 0.05, "square"],
};

function synthFallback(name: string): void {
  if (!ctx || !sfxBus) return;
  const [f, d, ty] = SYNTH_MAP[name] || [440, 0.1, "square" as OscillatorType];
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = ty; o.frequency.value = f;
  g.gain.setValueAtTime(0.25, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d);
  o.connect(g); g.connect(sfxBus); o.start(); o.stop(ctx.currentTime + d);
}

function startMusicNow(): void {
  if (!ctx || musicSrc || !buffers.music) return;
  musicSrc = ctx.createBufferSource(); musicSrc.buffer = buffers.music; musicSrc.loop = true;
  musicSrc.connect(musicBus!); musicSrc.start();
}

function startEngineNow(): void {
  if (!ctx || engineSrc || !buffers.engine) return;
  engineSrc = ctx.createBufferSource(); engineSrc.buffer = buffers.engine; engineSrc.loop = true;
  engineSrc.connect(engineGain!); engineSrc.start();
}

// Menu ambient: subtle low drone while in menu
let menuAmbient: OscillatorNode | null = null;
let menuAmbientGain: GainNode | null = null;

function startMenuAmbient(): void {
  if (!ctx || menuAmbient) return;
  try {
    menuAmbient = ctx.createOscillator();
    menuAmbientGain = ctx.createGain();
    menuAmbient.type = "sine";
    menuAmbient.frequency.value = 82; // low hum
    menuAmbientGain.gain.value = 0;
    menuAmbientGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.5);
    menuAmbient.connect(menuAmbientGain);
    menuAmbientGain.connect(masterBus!);
    menuAmbient.start();
  } catch (_e) { menuAmbient = null; }
}

function stopMenuAmbient(): void {
  if (menuAmbientGain) {
    try { menuAmbientGain.gain.linearRampToValueAtTime(0, ctx!.currentTime + 0.5); } catch (_e) {}
  }
  setTimeout(() => { try { menuAmbient && menuAmbient.stop(); } catch (_e) {} menuAmbient = null; menuAmbientGain = null; }, 600);
}

(window as any).SFX = {
  unlock(): void { ensureCtx(); if (ctx && ctx.state === "suspended") ctx.resume(); load(); },
  suspend(): void { if (ctx && ctx.state === "running") { try { ctx.suspend(); } catch (_e) { /* ignore */ } } },
  resume(): void { if (ctx && ctx.state === "suspended") { try { ctx.resume(); } catch (_e) { /* ignore */ } } },
  stopLoops(): void {
    try { musicSrc && musicSrc.stop(); } catch (_e) { /* ignore */ }
    try { engineSrc && engineSrc.stop(); } catch (_e) { /* ignore */ }
    musicSrc = null; engineSrc = null; want.music = false; want.engine = false;
  },
  startMusic(): void { want.music = true; if (loaded) startMusicNow(); },
  startEngine(): void { want.engine = true; if (loaded) startEngineNow(); },
  startMenuAmbient(): void { ensureCtx(); startMenuAmbient(); },
  stopMenuAmbient(): void { stopMenuAmbient(); },
  setEngine(speed: number, boosting: boolean): void {
    if (!ctx || !engineGain) return;
    engineGain.gain.value = boosting ? 0.22 : 0.04 + (speed || 0) * 0.14;
    if (engineSrc) engineSrc.playbackRate.value = 0.9 + (speed || 0) * 0.5;
  },
  fire(): void { playBuf("fire", 0.95 + Math.random() * 0.1); },
  hit(): void { playBuf("hit"); },
  explosion(): void { playBuf("explosion"); },
  kill(): void { playBuf("kill"); },
  go(): void { playBuf("ui", 0.7, 0.8); },
  uiClick(): void { playBuf("ui"); },
  pickup(): void { playBuf("ui", 1.6, 0.9); },
  toggleMute(): boolean { store.muted = !store.muted; wr("sc_muted", store.muted ? 1 : 0); applyVolumes(); return store.muted; },
  isMuted(): boolean { return store.muted; },
  setMaster(v: number): void { store.master = clamp(v); wr("sc_vol_master", store.master); applyVolumes(); },
  setMusic(v: number): void { store.music = clamp(v); wr("sc_vol_music", store.music); applyVolumes(); },
  setSfx(v: number): void { store.sfx = clamp(v); wr("sc_vol_sfx", store.sfx); applyVolumes(); },
  vols(): { master: number; music: number; sfx: number; muted: boolean } {
    return { master: store.master, music: store.music, sfx: store.sfx, muted: store.muted };
  },
};
