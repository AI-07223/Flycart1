// Global persistent leaderboard: each callsign's best single-round score, all-time.
// Server-authoritative (only the room writes, at round end). Durable to a JSON file on a
// persistent volume when DATA_DIR is set+writable; otherwise runs in-memory for the process
// lifetime (local dev, or prod before the volume is mounted) — never crashes.
import fs from "fs";
import path from "path";
import { log } from "./logger";

export interface Entry { name: string; score: number; }

const MAX_KEEP = 100;                          // cap rows in memory + on disk
const DATA_DIR = process.env.DATA_DIR || "";
const FILE = DATA_DIR ? path.join(DATA_DIR, "leaderboard.json") : "";

let board = new Map<string, number>();         // name -> best score
let persistent = false;
let saveTimer: NodeJS.Timeout | null = null;

function topAll(): Entry[] {
  return Array.from(board.entries())
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_KEEP);
}

export function init(): void {
  if (!FILE) { log("info", "leaderboard: in-memory (no DATA_DIR)"); return; }
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(FILE)) {
      const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
      if (Array.isArray(raw)) for (const e of raw) {
        if (e && typeof e.name === "string" && typeof e.score === "number" && e.score > 0) board.set(e.name, e.score);
      }
    }
    // confirm writable (a read-only mount would throw here, not at runtime)
    fs.writeFileSync(FILE + ".probe", "1"); fs.unlinkSync(FILE + ".probe");
    persistent = true;
    log("info", "leaderboard: persistent", { file: FILE, entries: board.size });
  } catch (e) {
    persistent = false;
    log("warn", "leaderboard: DATA_DIR not writable, running in-memory", { error: (e as Error).message });
  }
}

function scheduleSave(): void {
  if (!persistent || saveTimer) return;
  saveTimer = setTimeout(save, 1500); // debounce bursty round-end writes
}

function save(): void {
  saveTimer = null;
  if (!persistent) return;
  try {
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(topAll()));
    fs.renameSync(tmp, FILE); // atomic replace — a crash mid-write can't corrupt FILE
  } catch (e) { /* keep serving from memory; try again on the next record */ }
}

// Record a player's round score; keeps the max per callsign. Ignores empty names / non-positive.
export function record(name: string, score: number): void {
  const n = (name || "").trim().slice(0, 14);
  if (!n || !Number.isFinite(score) || score <= 0) return;
  if (score > (board.get(n) ?? 0)) {
    board.set(n, score);
    if (board.size > MAX_KEEP) board = new Map(topAll().map((e) => [e.name, e.score])); // bound memory
    scheduleSave();
  }
}

export function top(n: number): Entry[] {
  const k = Math.max(1, Math.min(50, Math.floor(n) || 10));
  return topAll().slice(0, k);
}
