## ADDED Requirements

### Requirement: CI runs on every push and PR
A GitHub Actions workflow SHALL verify that the project builds successfully on every push and pull request.

#### Scenario: Build verification
- **WHEN** code is pushed to any branch or a PR is opened
- **THEN** the workflow runs `npm ci` and `npm run build`
- **AND** the workflow reports pass/fail status on the commit

#### Scenario: Test execution
- **WHEN** a test script exists in `package.json`
- **THEN** the workflow runs `npm test` after build
- **AND** test failures cause the workflow to fail

#### Scenario: No test script
- **WHEN** no test script exists in `package.json`
- **THEN** the workflow skips the test step without failing

### Requirement: Auto-deploy on main push
The workflow SHALL trigger a Coolify deployment when code is pushed to the `main` branch after a successful build.

#### Scenario: Deploy trigger
- **WHEN** code is pushed to `main` and the build job succeeds
- **THEN** the workflow sends a POST to the Coolify deploy webhook
- **AND** the webhook URL is read from GitHub secrets

#### Scenario: No deploy on PR
- **WHEN** a PR is opened or updated
- **THEN** only the build/test jobs run, no deploy is triggered
