## ADDED Requirements

### Requirement: Client TypeScript compiles to JavaScript
An esbuild build step SHALL compile TypeScript source files from `src/client/` to JavaScript files in `public/js/`, preserving the IIFE + window.* pattern.

#### Scenario: Build produces working JS
- **WHEN** `npm run build-client` is executed
- **THEN** each `.ts` file in `src/client/` produces a corresponding `.js` file in `public/js/`
- **AND** the output files are wrapped in IIFEs that assign to `window.*` globals
- **AND** the build completes in under 2 seconds

#### Scenario: Type errors fail the build
- **WHEN** a TypeScript file has type errors
- **THEN** the build exits with a non-zero code and reports the errors

### Requirement: Client has its own TypeScript configuration
A separate `tsconfig.client.json` SHALL configure TypeScript for browser compilation with DOM types and shared path aliases.

#### Scenario: Type checking passes
- **WHEN** `npx tsc -p tsconfig.client.json --noEmit` is run on clean source files
- **THEN** it exits with code 0 (no errors)
