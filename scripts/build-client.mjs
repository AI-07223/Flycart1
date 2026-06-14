#!/usr/bin/env node
// scripts/build-client.mjs
// Compiles src/client/*.ts → public/js/*.js using esbuild.
// Format: IIFE (client scripts loaded via <script> tags).
// Bundle: true so shared module imports are inlined.
// Three.js/Colyseus are NOT imported by these files (they use window.* globals).

import { build } from "esbuild";
import { readdirSync } from "fs";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC_DIR = join(ROOT, "src", "client");
const OUT_DIR = join(ROOT, "public", "js");

// Collect all .ts files in src/client/ (excluding .d.ts)
const entries = readdirSync(SRC_DIR)
  .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
  .map((f) => ({
    entry: join(SRC_DIR, f),
    outfile: join(OUT_DIR, f.replace(/\.ts$/, ".js")),
    name: basename(f, ".ts"),
  }));

if (entries.length === 0) {
  console.log("No .ts files found in src/client/");
  process.exit(0);
}

console.log(`Building ${entries.length} client file(s)...`);

try {
  // Build all entries in parallel
  await Promise.all(
    entries.map(({ entry, outfile, name }) =>
      build({
        entryPoints: [entry],
        outfile,
        format: "iife",
        bundle: true,
        target: "es2020",
        sourcemap: false,
        minify: false,
        // Don't bundle these if accidentally imported
        external: ["three", "three/*", "colyseus.js"],
        // Ensure window.* assignments work in IIFE
        platform: "browser",
      }).then(() => console.log(`  ✓ ${name}.ts → js/${name}.js`))
    )
  );

  console.log("Client build complete.");
} catch (err) {
  console.error("Client build failed:", err);
  process.exit(1);
}
