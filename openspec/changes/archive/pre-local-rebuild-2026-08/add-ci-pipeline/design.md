## Context

SmashCart deploys to Coolify (self-hosted) via manual redeploy from the `main` branch. There's no CI — the only build check is running `npm run build` locally. The project is a Node.js/TypeScript Colyseus server with vanilla JS client files.

## Goals / Non-Goals

**Goals:**
- Automated build verification on every push and PR
- Automated test execution (graceful if no tests yet)
- Fast feedback (<2 min from push to result)
- Optional auto-deploy to Coolify on main push

**Non-Goals:**
- Multi-environment staging pipeline
- Docker image building in CI (Coolify handles that)
- Client-side testing (no test framework for vanilla JS yet)
- Performance benchmarking

## Decisions

### 1. GitHub Actions over alternatives

GitHub Actions is free for public repos, has good Node.js support, and runs on the same platform as the codebase. Alternatives (CircleCI, Jenkins) add infrastructure overhead with no benefit for this project size.

### 2. Single workflow, two jobs

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup node 24
      - npm ci
      - npm run build
      - npm test (continue-on-error if no tests)

  # Optional: deploy on main
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - trigger Coolify webhook
```

### 3. Coolify deploy via webhook

Coolify supports webhook deploys. The CI job sends a POST to the Coolify webhook URL (stored as a GitHub secret) after a successful build on main. This replaces the manual "redeploy" button click.

### 4. Node 24 to match production

The CI uses Node 24 (matching the Dockerfile's `node:24-alpine`) to ensure build parity.

## Risks / Trade-offs

- **Webhook secret management**: The Coolify deploy webhook URL needs to be stored as a GitHub secret. If it leaks, anyone can trigger deploys. Mitigation: the webhook URL already acts as a bearer token.
- **Test absence**: If `npm test` isn't configured yet, the workflow should skip gracefully rather than fail. Use `continue-on-error` or check for test script existence.

## Migration Plan

1. Create `.github/workflows/ci.yml`
2. Add Coolify webhook URL as GitHub secret (manual step)
3. Push to a branch, verify CI runs
4. Merge to main, verify deploy triggers
