#!/usr/bin/env node
// scripts/gen-constants.mjs
// Generates public/js/constants.js from src/shared/constants.ts so the client
// always matches the server's gameplay values. Run via `npm run gen-constants`.
//
// Strategy: compile constants.ts to JS, evaluate it with a stub sphere module,
// then emit the values as the client's window.GAME object.

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { transformSync } from "esbuild"; // fast TS→JS, no full tsc needed

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src", "shared", "constants.ts");
const OUT = join(ROOT, "public", "js", "constants.js");

// --- 1. Read + strip type annotations so we can eval the TS ---
const tsSource = readFileSync(SRC, "utf8");

// esbuild strips types and gives us valid CJS (so we can eval with new Function)
const { code: jsSource } = transformSync(tsSource, {
  loader: "ts",
  format: "cjs",
  target: "es2020",
});

// --- 2. Evaluate in a sandboxed context ---
// Stub the sphere module (only vec/normalize/cross/rotateAxis are used at init time)
const stubVec = (x, y, z) => ({ x, y, z });
const sphereStub = {
  vec: stubVec,
  normalize: (v) => {
    const l = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return l > 1e-9 ? { x: v.x / l, y: v.y / l, z: v.z / l } : { x: 0, y: 1, z: 0 };
  },
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  scale: (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
  cross: (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),
  dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
  rotateAxis: (v, k, ang) => {
    const c = Math.cos(ang), s = Math.sin(ang);
    const kv = { x: k.y * v.z - k.z * v.y, y: k.z * v.x - k.x * v.z, z: k.x * v.y - k.y * v.x };
    const kd = (k.x * v.x + k.y * v.y + k.z * v.z) * (1 - c);
    return { x: v.x * c + kv.x * s + k.x * kd, y: v.y * c + kv.y * s + k.y * kd, z: v.z * c + kv.z * s + k.z * kd };
  },
};

// Rewrite the import to inject our stub (handles ESM import, CJS require, and esbuild's __toESM wrapper)
// esbuild CJS uses `stdin_exports` as the target — redirect it to our exports object
const evalCode = jsSource
  .replace(/import \* as \w+ from ["']\.\/sphere["'];?/, `const S = __sphere;`)
  .replace(/var \w+ = __toESM\(require\(["']\.\/sphere["']\)\);?/, `var S = __sphere;`)
  .replace(/const \w+ = require\(["']\.\/sphere["']\);?/, `const S = __sphere;`)
  .replace(/var stdin_exports = \{\};/, "var stdin_exports = exports;");

// esbuild CJS format uses `exports` — pass a fresh object and collect what gets assigned
const exportsObj = {};
const fn = new Function("__sphere", "exports", "module", evalCode + "\nreturn exports;");
const mod = fn(sphereStub, exportsObj, { exports: exportsObj });

// --- 3. Select which values to emit to the client ---
// Only emit gameplay-relevant values the client actually uses.
const CLIENT_KEYS = [
  "CRUISE_SPEED", "BOOST_SPEED", "ACCEL", "TURN_RATE",
  "PLANE_RADIUS", "MAX_HP", "BULLET_SPEED",
  "AFTERBURNER_FACTOR", "RAPID_FACTOR", "FIRE_COOLDOWN",
  "BULLET_LIFE", "BULLET_RADIUS", "SPREAD_ANGLE", "HOMING_TURN",
  "TICK_RATE", "SKIN_COUNT",
  "R_BASE", "R_MIN", "R_MAX", "N_BASE",
  "POWERUP_DURATION",
  "ZONES", "OBSTACLE_BEHAVIOR",
  "SPAWN_REROLL",
];

// POWERUPS is client-only (labels/icons/colors for HUD) — not in server constants.
// HOTSPOT_DIR and OBSTACLES are built client-side from OB_SPECS + Sphere.
const POWERUPS_CLIENT = `{
    spread:      { label: "Spread",      color: 0x6bff8b, icon: "🔱" },
    rapid:       { label: "Rapid Fire",  color: 0xffe14a, icon: "⚡" },
    shield:      { label: "Shield",      color: 0x49c0ff, icon: "🛡️" },
    afterburner: { label: "Afterburner", color: 0xff8c42, icon: "🚀" },
    repair:      { label: "Repair",      color: 0xff6b6b, icon: "❤️" },
    homing:      { label: "Homing",      color: 0xc07bff, icon: "🎯" },
  }`;

// --- 4. Build the output ---
function jsLiteral(v, indent = 0) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "string") return JSON.stringify(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    const items = v.map((item) => jsLiteral(item, indent + 1));
    // Short arrays on one line
    const oneLine = "[" + items.join(", ") + "]";
    if (oneLine.length <= 80) return oneLine;
    const pad = "  ".repeat(indent + 1);
    const end = "  ".repeat(indent);
    return "[\n" + items.map((i) => pad + i + ",").join("\n") + "\n" + end + "]";
  }
  if (typeof v === "object") {
    const entries = Object.entries(v).map(([k, val]) => {
      const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
      return `${key}: ${jsLiteral(val, indent + 1)}`;
    });
    const oneLine = "{ " + entries.join(", ") + " }";
    if (oneLine.length <= 80 && entries.length <= 4) return oneLine;
    const pad = "  ".repeat(indent + 1);
    const end = "  ".repeat(indent);
    return "{\n" + entries.map((e) => pad + e + ",").join("\n") + "\n" + end + "}";
  }
  return String(v);
}

const lines = [
  "// AUTO-GENERATED from src/shared/constants.ts — do not edit manually.",
  "// Run `npm run gen-constants` to regenerate.",
  "// GLOBE ARENA: positions are unit-vector directions; speeds are linear surface speeds (÷ radius → angular).",
  "window.GAME = {",
];

for (const key of CLIENT_KEYS) {
  const val = mod[key];
  if (val === undefined) continue;
  lines.push(`  ${key}: ${jsLiteral(val, 1)},`);
}

lines.push("");
lines.push("  // Powerups (client visuals + HUD). Durations/effects are server-authoritative.");
lines.push(`  POWERUPS: ${POWERUPS_CLIENT},`);

// Add OB_SPECS for client-side OBSTACLES computation
const obSpecs = mod.OB_SPECS || [];
lines.push("");
lines.push("  // Obstacle authoring specs — client builds OBSTACLES from these via Sphere.");
lines.push("  OB_SPECS: [");
for (const s of obSpecs) {
  const az = typeof s.az === "number" ? formatMath(s.az) : String(s.az);
  const parts = [
    `ang: ${s.ang}`,
    `az: ${az}`,
    `angRadius: ${s.angRadius}`,
    `height: ${s.height}`,
    `kind: ${JSON.stringify(s.kind)}`,
  ];
  if (s.landmark) parts.push(`landmark: ${JSON.stringify(s.landmark)}`);
  lines.push(`    { ${parts.join(", ")} },`);
}
lines.push("  ],");
lines.push("};");

// Append HOTSPOT_DIR + OBSTACLES builder (client-side, needs Sphere)
lines.push("// Build the hotspot direction + obstacle dirs once Sphere is available.");
lines.push("window.GAME.HOTSPOT_DIR = window.Sphere.normalize(window.Sphere.vec(0, 0.35, 1));");
lines.push("window.GAME.OBSTACLES = window.GAME.OB_SPECS.map(function (s) {");
lines.push("  return {");
lines.push("    dir: window.Sphere.dirFrom(window.GAME.HOTSPOT_DIR, s.ang, s.az),");
lines.push("    angRadius: s.angRadius, height: s.height, kind: s.kind, landmark: s.landmark,");
lines.push("  };");
lines.push("});");

// Format a number as a nice JS math expression if it's a clean multiple of PI
function formatMath(n) {
  const piFrac = n / Math.PI;
  // Check clean fractions of PI
  for (const d of [1, 2, 3, 4, 5, 6, 10]) {
    const num = piFrac * d;
    if (Math.abs(num - Math.round(num)) < 1e-9) {
      const numerator = Math.round(num);
      if (numerator === 0) return "0";
      if (d === 1) return numerator === 1 ? "Math.PI" : `${numerator} * Math.PI`;
      if (numerator === 1) return `Math.PI / ${d}`;
      return `${numerator} * Math.PI / ${d}`;
    }
  }
  return String(n);
}

writeFileSync(OUT, lines.join("\n") + "\n", "utf8");
console.log(`✓ Generated ${OUT} from ${SRC}`);
