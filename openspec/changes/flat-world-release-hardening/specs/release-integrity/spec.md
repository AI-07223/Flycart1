## ADDED Requirements

### Requirement: Automated release validation must be blocking
The release workflow SHALL fail when the automated test suite fails and MUST not treat deploy-trigger failures as successful releases.

#### Scenario: Failing tests stop the pipeline
- **WHEN** `npm test` exits non-zero in CI
- **THEN** the workflow fails instead of continuing to later release steps

#### Scenario: Failed deploy trigger is surfaced
- **WHEN** the deploy webhook returns a failure status
- **THEN** the workflow reports the release as failed instead of silently succeeding

### Requirement: Runtime container must serve the built browser assets
The production container SHALL use the browser assets produced by the build stage instead of re-copying unchecked source assets into the runtime image.

#### Scenario: Runtime image carries the built client bundle
- **WHEN** the container image is built
- **THEN** the runtime stage serves the generated `public/js` output from the build stage

### Requirement: Repository guidance must match the shipped game
Repository-facing documentation SHALL describe the current flat-world 3D controls, renderer, and development commands.

#### Scenario: README reflects current flight model
- **WHEN** a contributor follows the README
- **THEN** the described controls and renderer behavior match the flat-world build in this repository
