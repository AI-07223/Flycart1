// Builds the Android APK and copies it where the web server serves it.
// Usage: node scripts/build-apk.mjs
// Output: public/apk/smashcart.apk (served at /apk/smashcart.apk)

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const ANDROID = join(ROOT, "android");
const APK_OUT = join(ANDROID, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const DEST_DIR = join(ROOT, "public", "apk");
const DEST = join(DEST_DIR, "smashcart.apk");

function step(name, cmd, opts = {}) {
  console.log(`\n==> ${name}`);
  const r = spawnSync(cmd, {
    cwd: opts.cwd ?? ROOT,
    shell: true,
    stdio: "inherit",
    env: { ...process.env, ...opts.env },
  });
  if (r.status !== 0) {
    console.error(`FAILED: ${name} (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

step("build client bundles", "npm run build-client");

step("cap sync android", "npx cap sync android");

step("gradle assembleDebug", process.platform === "win32" ? "gradlew.bat assembleDebug" : "./gradlew assembleDebug", {
  cwd: ANDROID,
});

statSync(APK_OUT); // throws if gradle lied about success
mkdirSync(DEST_DIR, { recursive: true });
rmSync(DEST, { force: true });
cpSync(APK_OUT, DEST);

console.log(`\nDONE -> ${DEST}`);
console.log("Served by the game server at /apk/smashcart.apk");
