#!/usr/bin/env node
// scripts/build-client.mjs
// Compiles src/client/*.ts → public/js/*.js using esbuild.
// Format: IIFE (client scripts loaded via <script> tags).
// Bundle: true so shared module imports are inlined.
// Three.js/Colyseus are NOT imported by these files (they use window.* globals).

import { build } from "esbuild";
import { createHash } from "crypto";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC_DIR = join(ROOT, "src", "client");
const OUT_DIR = join(ROOT, "public", "js");

// Explicit allowlist of entry modules that index.html loads as standalone <script> tags.
// net-ws.ts and transport.ts are NOT entry points — they are imported by main.ts
// and bundled into main.js automatically. Do NOT add them here. (net-ws IS built
// standalone so js/net-ws.js exists for debugging, but index.html does not load it;
// window.Net is assigned by main.js.)
//
// render3d is the one ESM entry: index.html loads it with <script type="module"> and
// resolves its bare "three" import through the page's import map, so it must be emitted
// as ESM with "three" left external rather than wrapped in an IIFE.
const IIFE_ENTRIES = [
  "sphere",
  "constants",
  "quality",
  "audio",
  "assets",
  "input",
  "net-ws",
  "qr",
  "main",
];
const ESM_ENTRIES = ["render3d"];
const ENTRY_NAMES = [...IIFE_ENTRIES, ...ESM_ENTRIES];

/**
 * public/sw.js is cache-first, so a stale CACHE name means returning players keep
 * running the previous bundle after a deploy. The name used to be a hand-edited
 * constant ("BUMP smashcart-v2 whenever a bundle changes") — a manual step that is
 * trivially forgotten. Derive it from the shipped bytes instead: same content in,
 * same name out; any change to a precached file rotates the cache automatically.
 */
function stampServiceWorkerCache() {
  const swPath = join(ROOT, "public", "sw.js");
  if (!existsSync(swPath)) return;

  const hash = createHash("sha256");
  const inputs = [
    join(ROOT, "public", "index.html"),
    join(ROOT, "public", "manifest.webmanifest"),
    ...readdirSync(OUT_DIR).filter((f) => f.endsWith(".js")).sort()
      .map((f) => join(OUT_DIR, f)),
    ...readdirSync(join(ROOT, "public", "css")).filter((f) => f.endsWith(".css")).sort()
      .map((f) => join(ROOT, "public", "css", f)),
  ];
  for (const file of inputs) {
    if (!existsSync(file)) continue;
    hash.update(file.replace(ROOT, ""));
    hash.update(readFileSync(file));
  }
  const name = `smashcart-${hash.digest("hex").slice(0, 12)}`;

  const src = readFileSync(swPath, "utf8");
  const marker = /const CACHE = "[^"]*";/;
  if (!marker.test(src)) {
    console.warn("  ⚠ sw.js: no `const CACHE = \"...\";` line to stamp");
    return;
  }
  const next = src.replace(marker, `const CACHE = "${name}";`);
  // An unchanged build produces the same name; only write when it actually moved.
  if (next !== src) writeFileSync(swPath, next);
  console.log(`  ✓ sw.js cache name → ${name}`);
}

const availableFiles = new Set(
  readdirSync(SRC_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
);

const entries = ENTRY_NAMES
  .filter((name) => {
    const filename = `${name}.ts`;
    if (!availableFiles.has(filename)) {
      console.warn(`  ⚠ Entry ${filename} not found in src/client/ — skipping`);
      return false;
    }
    return true;
  })
  .map((name) => ({
    entry: join(SRC_DIR, `${name}.ts`),
    outfile: join(OUT_DIR, `${name}.js`),
    name,
    format: ESM_ENTRIES.includes(name) ? "esm" : "iife",
  }));

if (entries.length === 0) {
  console.log("No .ts files found in src/client/");
  process.exit(0);
}

console.log(`Building ${entries.length} client file(s)...`);

try {
  // Build all entries in parallel
  await Promise.all(
    entries.map(({ entry, outfile, name, format }) =>
      build({
        entryPoints: [entry],
        outfile,
        format,
        bundle: true,
        target: "es2020",
        sourcemap: false,
        minify: false,
        // Don't bundle these if accidentally imported
        external: ["three", "three/*", "colyseus.js"],
        // Ensure window.* assignments work in IIFE
        platform: "browser",
      }).then(() => console.log(`  ✓ ${name}.ts → js/${name}.js (${format})`))
    )
  );

  stampServiceWorkerCache();

  console.log("Client build complete.");
} catch (err) {
  console.error("Client build failed:", err);
  process.exit(1);
}
