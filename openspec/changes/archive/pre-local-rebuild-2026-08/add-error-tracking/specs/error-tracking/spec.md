## ADDED Requirements

### Requirement: Server errors are captured by Sentry
The server SHALL report unhandled exceptions and room errors to Sentry when `SENTRY_DSN` is configured.

#### Scenario: Unhandled exception reported
- **WHEN** an unhandled exception occurs in the server process
- **THEN** Sentry receives the error with stack trace, room context, and player count
- **AND** the error appears in the Sentry issues dashboard

#### Scenario: Local dev is silent
- **WHEN** `SENTRY_DSN` is not set
- **THEN** Sentry SDK is not initialized and no network requests are made

### Requirement: Client errors are captured by Sentry
The browser client SHALL report uncaught exceptions and WebGL context loss to Sentry when configured.

#### Scenario: Client runtime error
- **WHEN** an uncaught exception occurs in the client JavaScript
- **THEN** Sentry receives the error with stack trace, URL, and user agent

#### Scenario: WebGL context loss
- **WHEN** the browser loses the WebGL context
- **THEN** Sentry receives a warning-level message with the event details
