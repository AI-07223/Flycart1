## Why

SmashCart has no error tracking. The server logs 4 messages to stdout and the client logs nothing. When players hit bugs — rendering glitches, disconnection loops, physics edge cases — there's no way to know. Adding Sentry captures errors from both server and client with stack traces, user context, and breadcrumbs, turning invisible failures into actionable reports.

## What Changes

- **Add Sentry SDK** to both server (`@sentry/node`) and client (`@sentry/browser`)
- **Server**: capture uncaught exceptions, Colyseus room errors, and leaderboard file I/O failures
- **Client**: capture uncaught exceptions, WebGL context loss, and Colyseus connection errors
- **Structured logging** on the server: replace bare `console.log` with a lightweight logger that outputs JSON (parseable by log aggregators)
- **Environment-gated**: Sentry only initializes when `SENTRY_DSN` is set (no-op in local dev)

## Capabilities

### New Capabilities
- `error-tracking`: Sentry integration for server and client error capture
- `structured-logging`: JSON-formatted server logs with context (room ID, player count, tick rate)

### Modified Capabilities
(No existing specs modified)

## Impact

- `package.json` — add `@sentry/node` and `@sentry/browser`
- `src/index.ts` — initialize Sentry before other imports
- `src/rooms/ArenaRoom.ts` — wrap update loop in Sentry breadcrumb
- `src/logger.ts` — new: lightweight structured logger
- `public/index.html` — add Sentry browser SDK via `<script>` tag (or import map)
- `public/js/main.js` — initialize Sentry browser SDK
- `.env.example` — document `SENTRY_DSN` variable
