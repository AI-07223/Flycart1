// src/logger.ts
// Lightweight structured JSON logger for SmashCart server.
// Outputs machine-parseable logs to stdout/stderr. Docker captures these.

export type LogLevel = "info" | "warn" | "error" | "debug";

export function log(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  const entry: Record<string, unknown> = { ts: new Date().toISOString(), level, msg, ...data };
  const json = JSON.stringify(entry);
  if (level === "error") {
    console.error(json);
  } else if (level === "warn") {
    console.warn(json);
  } else {
    console.log(json);
  }
}
