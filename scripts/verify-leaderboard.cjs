/* Verify the compiled leaderboard store: best-kept-per-name, ordering, zero/empty ignored,
   persistence across a simulated restart, and in-memory fallback. Run after `npm run build`. */
const os = require("os"), fs = require("fs"), path = require("path");
let pass = 0, fail = 0;
const ok = (n, c, x) => { (c ? pass++ : fail++); console.log(`${c ? "PASS" : "FAIL"}  ${n}${x ? "  — " + x : ""}`); };

const dir = path.join(os.tmpdir(), "sc-lb-" + process.pid);
const modPath = path.resolve(__dirname, "../dist/leaderboard.js");
const fresh = () => { delete require.cache[require.resolve(modPath)]; return require(modPath); };

process.env.DATA_DIR = dir;
let lb = fresh();
lb.init();
lb.record("Bob", 80);
lb.record("Alice", 50);
lb.record("Alice", 30);   // lower → keep 50
lb.record("Carol", 10);
lb.record("Zed", 0);       // zero → ignored
lb.record("  ", 99);       // empty name → ignored

const t = lb.top(10);
ok("ordered by score desc", t[0].name === "Bob" && t[0].score === 80 && t[1].name === "Alice" && t[1].score === 50, JSON.stringify(t));
ok("best score kept per name", t.find((e) => e.name === "Alice").score === 50);
ok("zero / empty ignored", !t.find((e) => e.name === "Zed") && !t.find((e) => e.name.trim() === ""));
ok("top(n) clamps", lb.top(2).length === 2);

setTimeout(() => {
  const fileExists = fs.existsSync(path.join(dir, "leaderboard.json"));
  ok("persisted to disk", fileExists);

  // simulate a restart: fresh module load + init reads the file
  const lb2 = fresh(); lb2.init();
  const t2 = lb2.top(10);
  ok("survives a restart", !!t2.find((e) => e.name === "Bob" && e.score === 80), JSON.stringify(t2.slice(0, 2)));

  // in-memory fallback when DATA_DIR is unset
  delete process.env.DATA_DIR;
  const lb3 = fresh(); lb3.init();
  lb3.record("MemOnly", 42);
  ok("in-memory fallback works (no DATA_DIR)", lb3.top(1)[0] && lb3.top(1)[0].name === "MemOnly");

  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}, 1800);
