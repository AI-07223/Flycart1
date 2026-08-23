## ADDED Requirements

### Requirement: Leaderboard persists across container restarts
The Docker deployment SHALL mount a named volume to the leaderboard data directory so that `leaderboard.json` survives container recreation.

#### Scenario: Container restart preserves scores
- **WHEN** the container is stopped and started (or recreated by Docker/Coolify)
- **THEN** the leaderboard endpoint `/leaderboard` returns the same data as before the restart

#### Scenario: Fresh deploy with no prior data
- **WHEN** the container starts for the first time with an empty volume
- **THEN** the leaderboard starts empty and records scores normally

### Requirement: Docker healthcheck reports container health
The `docker-compose.yml` SHALL include a healthcheck that polls the `/healthz` endpoint so Docker and orchestrators can detect unhealthy containers.

#### Scenario: Healthy container
- **WHEN** the server is running and responding to requests
- **THEN** Docker reports the container health as `healthy`

#### Scenario: Unhealthy container
- **WHEN** the server process crashes or stops responding
- **THEN** Docker reports the container health as `unhealthy` after the retry period
