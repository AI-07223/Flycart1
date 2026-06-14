## ADDED Requirements

### Requirement: Test runner is configured and runnable
The project SHALL have vitest configured as the test runner with TypeScript support, runnable via `npm test`.

#### Scenario: Run all tests
- **WHEN** a developer runs `npm test`
- **THEN** vitest discovers and runs all test files in the `tests/` directory
- **AND** the process exits with code 0 if all tests pass, non-zero if any fail

#### Scenario: Run tests in watch mode
- **WHEN** a developer runs `npm test -- --watch`
- **THEN** vitest re-runs affected tests when source files change

### Requirement: Test helpers provide room setup utilities
A shared test helpers module SHALL provide utilities for creating and tearing down test rooms with deterministic configuration.

#### Scenario: Create a test room
- **WHEN** a test calls the room setup helper
- **THEN** an ArenaRoom is created with bots disabled and a known tick rate
- **AND** the room is cleaned up automatically after the test completes
