## Why

SmashCart has no CI. Builds are verified manually, and broken code can reach production without any automated check. Adding a GitHub Actions pipeline catches build failures and test regressions before merge, and optionally auto-deploys on push to main.

## What Changes

- **GitHub Actions workflow** (`.github/workflows/ci.yml`) that runs on push and PRs:
  - Install dependencies
  - Run `npm run build` (gen-constants + tsc)
  - Run `npm test` (once tests exist — graceful skip if not)
- **Optional deploy trigger** on push to main (via Coolify webhook or `coolify deploy`)

## Capabilities

### New Capabilities
- `ci-pipeline`: automated build verification on every push/PR

### Modified Capabilities
(No existing specs modified)

## Impact

- `.github/workflows/ci.yml` — new: GitHub Actions workflow
- No changes to production code
