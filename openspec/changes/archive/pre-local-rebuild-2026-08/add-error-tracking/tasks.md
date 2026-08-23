## 1. Server Error Tracking

- [x] 1.1 Install `@sentry/node` as a dependency
- [x] 1.2 Create `src/logger.ts` — structured JSON logger with `log(level, msg, data?)` function
- [x] 1.3 Initialize Sentry in `src/index.ts` (gated on `SENTRY_DSN` env var)
- [x] 1.4 Wrap ArenaRoom update loop with Sentry error capture
- [x] 1.5 Replace existing `console.log`/`console.warn` calls with structured logger

## 2. Client Error Tracking

- [x] 2.1 Add Sentry browser SDK to `public/vendor/`
- [x] 2.2 Initialize Sentry in `public/index.html` (gated on `SENTRY_DSN` meta tag or env injection)
- [x] 2.3 Add WebGL context loss handler with Sentry reporting

## 3. Configuration

- [x] 3.1 Create `.env.example` documenting `SENTRY_DSN` variable
- [x] 3.2 Add `SENTRY_DSN` to docker-compose.yml environment block (commented out)

## 4. Verification

- [x] 4.1 Start server without `SENTRY_DSN` — verify no errors, no network requests
- [x] 4.2 Trigger a test error — verify it appears in Sentry dashboard
- [x] 4.3 Verify structured JSON logs appear in `docker logs`
