## 1. GitHub Actions Workflow

- [x] 1.1 Create `.github/workflows/ci.yml` with build job (checkout, node 24, npm ci, npm run build)
- [x] 1.2 Add test step with graceful skip when no test script exists
- [x] 1.3 Add deploy job that triggers Coolify webhook on main push (conditional on build success)

## 2. Secrets Setup

- [x] 2.1 Document that `COOLIFY_WEBHOOK_URL` needs to be added as a GitHub secret (manual step)

## 3. Verification

- [x] 3.1 Push to a branch and verify CI runs and passes
- [x] 3.2 Verify deploy job is skipped on non-main branches
