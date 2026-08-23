## Context

SmashCart is a real-time multiplayer game with an authoritative Colyseus server and a Three.js browser client. Currently the server has 4 console.log statements and the client has none. There's no error tracking, no structured logging, and no way to diagnose production issues beyond reading raw Docker stdout.

## Goals / Non-Goals

**Goals:**
- Capture unhandled errors from both server and client with stack traces
- Know when players hit errors (WebGL crashes, connection drops, physics edge cases)
- Structured server logs that are machine-parseable
- Zero overhead when not configured (local dev stays silent)

**Non-Goals:**
- Full APM/tracing (OpenTelemetry) — overkill for a small game
- Log aggregation infrastructure (ELK, Grafana Loki) — use Sentry's built-in issue tracking
- Custom dashboards or metrics — Sentry's default UI is sufficient
- Performance monitoring (profiling, transaction tracing) — can add later

## Decisions

### 1. Sentry over alternatives

Sentry has a free tier (5K events/month), supports both Node.js and browser, and provides issue grouping, stack traces, and release tracking out of the box. Alternatives:
- **LogRocket** — session replay, but expensive and overkill
- **Bugsnag** — similar to Sentry, less generous free tier
- **Self-hosted** — requires infrastructure, not autonomy-friendly

### 2. Server-side setup

```ts
// src/index.ts — must be first import
import * as Sentry from "@sentry/node";
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
}
```

Wrap the Colyseus game loop to capture errors:
```ts
// In ArenaRoom update()
try {
  this.update(dt);
} catch (e) {
  Sentry.captureException(e, { tags: { room: this.roomId } });
  throw e; // re-throw so Colyseus can handle it
}
```

### 3. Client-side setup

Load Sentry browser SDK via CDN (matching the existing pattern of vendored dependencies):
```html
<script src="/vendor/sentry.browser.min.js"></script>
<script>
  if (window.Sentry && window.SENTRY_DSN) {
    window.Sentry.init({ dsn: window.SENTRY_DSN, tracesSampleRate: 0.1 });
  }
</script>
```

Capture WebGL context loss:
```js
canvas.addEventListener("webglcontextlost", (e) => {
  window.Sentry?.captureMessage("WebGL context lost", "warning");
  e.preventDefault();
});
```

### 4. Structured logger

Replace `console.log` with a minimal structured logger that outputs JSON:

```ts
// src/logger.ts
export function log(level: string, msg: string, data?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), level, msg, ...data };
  if (level === "error") console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}
```

Usage: `log("info", "server started", { port: 2567 })` → `{"ts":"...","level":"info","msg":"server started","port":2567}`

This is deliberately minimal — no log levels config, no transports, no rotation. Docker captures stdout.

### 5. Environment gating

All Sentry/logging code is gated behind environment variables:
- `SENTRY_DSN` — if unset, Sentry SDK is not initialized (no-op)
- No code changes needed for local dev — everything is silent by default

## Risks / Trade-offs

- **Event volume**: Free tier is 5K events/month. A single bug could eat the quota. Mitigation: `tracesSampleRate: 0.1` (10% of transactions), and Sentry deduplicates identical errors.
- **Client SDK size**: Sentry browser SDK is ~30KB gzipped. For a game where load time matters, this is acceptable.
- **JSON logs are hard to read locally**: Structured logs are great for machines but noisy for `docker logs`. Mitigation: the logger can detect TTY and pretty-print in dev.

## Migration Plan

1. Install `@sentry/node` (server dependency)
2. Add Sentry browser SDK to `public/vendor/`
3. Create `src/logger.ts`
4. Wire up server Sentry init in `src/index.ts`
5. Wire up client Sentry init in `public/index.html`
6. Replace console.log/warn with structured logger
7. Document `SENTRY_DSN` in `.env.example`
8. Test: trigger an error, verify it appears in Sentry dashboard
