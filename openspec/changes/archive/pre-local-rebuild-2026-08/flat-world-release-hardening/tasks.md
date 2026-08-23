## 1. Room Runtime Hardening

- [x] 1.1 Guard `ArenaRoom` input messages against non-object payloads and preserve the last safe input state for malformed fields
- [x] 1.2 Normalize join and rename payloads so non-string names fall back safely without throwing
- [x] 1.3 Add regression tests covering malformed input packets and malformed join names

## 2. Prediction And Collision Parity

- [x] 2.1 Extract landmark collision resolution into a shared flight helper used by the server plane step
- [x] 2.2 Update client local prediction to use the same landmark collision helper during predicted movement
- [x] 2.3 Add deterministic tests that compare obstacle outcomes for low-altitude impact and high-altitude flyover cases

## 3. Renderer Resource Lifecycle

- [x] 3.1 Add a render-object disposal helper for owned dynamic geometries and materials
- [x] 3.2 Call the disposal helper on dynamic object removal paths for planes, shields, bullets, pickups, particles, and the menu demo
- [x] 3.3 Expose or preserve a lightweight debug path that can be used to confirm transient object counts stay bounded

## 4. Release Integrity

- [x] 4.1 Make CI fail on test failures and surface deploy-trigger failures instead of treating them as non-fatal
- [x] 4.2 Fix the Docker runtime stage to copy built browser assets from the build stage
- [x] 4.3 Update README and cross-platform developer commands to reflect the current flat-world build

## 5. Verification

- [x] 5.1 Rebuild generated client assets after the shared helper and renderer changes
- [x] 5.2 Run the project build and automated tests to confirm the hardening pass is stable
