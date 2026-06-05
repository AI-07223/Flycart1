// Generates original arcade audio (16-bit PCM WAV, 22050 Hz mono) into
// public/assets/audio/. Self-hosted, licensing-clean (generated here). Run via
// `npm run gen-audio`. Files are committed so the Docker image ships them.
import { writeFileSync, mkdirSync } from "node:fs";

const SR = 22050;
const OUT = "public/assets/audio";
mkdirSync(OUT, { recursive: true });

function wav(s) {
  const n = s.length, buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { let v = Math.max(-1, Math.min(1, s[i])); buf.writeInt16LE((v * 32767) | 0, 44 + i * 2); }
  return buf;
}
const T = (sec) => Math.floor(sec * SR);
const sq = (p) => (p % 1 < 0.5 ? 1 : -1);
const saw = (p) => 2 * (p % 1) - 1;
const tri = (p) => 2 * Math.abs(2 * (p % 1) - 1) - 1;
const sin = (p) => Math.sin(p * Math.PI * 2);
const note = (n) => 440 * Math.pow(2, (n - 69) / 12); // midi -> Hz

// --- discrete SFX ---
function fire() {
  const s = new Float32Array(T(0.13));
  for (let i = 0; i < s.length; i++) { const t = i / SR, env = Math.exp(-t * 34); const f = 880 - t * 3200; s[i] = sq((f * t)) * env * 0.5 + (Math.random() * 2 - 1) * env * 0.08; }
  return s;
}
function hit() {
  const s = new Float32Array(T(0.12));
  for (let i = 0; i < s.length; i++) { const t = i / SR, env = Math.exp(-t * 40); s[i] = ((Math.random() * 2 - 1) * 0.6 + sin(150 * t) * 0.5) * env * 0.7; }
  return s;
}
function explosion() {
  const s = new Float32Array(T(0.7));
  let lp = 0;
  for (let i = 0; i < s.length; i++) { const t = i / SR, env = Math.exp(-t * 6); const n = Math.random() * 2 - 1; lp += (n - lp) * 0.25; s[i] = (lp * 0.9 + sin(70 * t) * 0.4) * env * 0.85; }
  return s;
}
function kill() {
  const s = new Float32Array(T(0.45)); const seq = [72, 76, 79, 84]; // C E G C arpeggio up
  for (let i = 0; i < s.length; i++) { const t = i / SR; const idx = Math.min(seq.length - 1, Math.floor(t / 0.1)); const ph = (t % 0.1); const env = Math.exp(-ph * 12) * Math.exp(-t * 1.5); s[i] = sq(note(seq[idx]) * t) * env * 0.4; }
  return s;
}
function ui() {
  const s = new Float32Array(T(0.06));
  for (let i = 0; i < s.length; i++) { const t = i / SR, env = Math.exp(-t * 60); s[i] = sq(660 * t) * env * 0.35; }
  return s;
}
function engine() { // 1.0s seamless loop — low buzzy drone w/ vibrato; integer cycles
  const len = T(1.0), s = new Float32Array(len);
  for (let i = 0; i < len; i++) { const t = i / SR; const vib = 1 + 0.02 * sin(6 * t); const base = 92 * vib; s[i] = (saw(base * t) * 0.5 + sq(base * 0.5 * t) * 0.2) * 0.22; }
  // crossfade ends for seamless loop
  const f = T(0.04);
  for (let i = 0; i < f; i++) { const a = i / f; s[i] = s[i] * a + s[len - f + i] * (1 - a); }
  return s;
}

// --- music: ~7.7s upbeat loop, 125 BPM, I-V-vi-IV in C ---
function music() {
  const bpm = 125, beat = 60 / bpm, bars = 4, len = T(beat * 4 * bars), s = new Float32Array(len);
  const chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]; // C G Am F
  const arpRoot = [72, 67, 69, 65];
  for (let i = 0; i < len; i++) {
    const t = i / SR, bar = Math.floor(t / (beat * 4)) % 4;
    const ch = chords[bar];
    // arpeggio (8th notes)
    const step = Math.floor(t / (beat / 2));
    const an = note(arpRoot[bar] + [0, 4, 7, 4][step % 4]);
    const ap = (t % (beat / 2)); const aenv = Math.exp(-ap * 7);
    let v = sq(an * t) * aenv * 0.16;
    // bass (root each beat)
    const bp = (t % beat); const benv = Math.exp(-bp * 3);
    v += tri(note(ch[0] - 12) * t) * benv * 0.22;
    // pad (soft chord)
    v += (sin(note(ch[1]) * t) + sin(note(ch[2]) * t)) * 0.05;
    // kick on each beat
    const kenv = Math.exp(-bp * 18); const kf = 120 - bp * 220;
    v += sin(Math.max(40, kf) * t) * kenv * 0.5;
    // hat on off-beats
    if ((step % 2) === 1) { const hp = (t % (beat / 2)); v += (Math.random() * 2 - 1) * Math.exp(-hp * 60) * 0.06; }
    s[i] = v * 0.8;
  }
  const f = T(0.03);
  for (let i = 0; i < f; i++) { const a = i / f; s[i] = s[i] * a + s[len - f + i] * (1 - a); }
  return s;
}

const files = { fire, hit, explosion, kill, ui, engine, music };
for (const [name, fn] of Object.entries(files)) {
  const buf = wav(fn());
  writeFileSync(`${OUT}/${name}.wav`, buf);
  console.log(`${name}.wav  ${(buf.length / 1024).toFixed(0)} KB`);
}
console.log("audio generated -> " + OUT);
