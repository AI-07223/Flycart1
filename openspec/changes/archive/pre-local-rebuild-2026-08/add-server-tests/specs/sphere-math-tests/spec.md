## ADDED Requirements

### Requirement: All sphere math functions have unit tests
Every exported function in `src/shared/sphere.ts` SHALL have at least one test case verifying correct behavior.

#### Scenario: Vector arithmetic
- **WHEN** `add`, `sub`, `scale`, `dot`, `cross` are called with known inputs
- **THEN** the results match expected values within floating-point tolerance (epsilon 1e-9)

#### Scenario: Normalization
- **WHEN** `normalize` is called on a non-zero vector
- **THEN** the result has length 1.0 within epsilon
- **WHEN** `normalize` is called on a zero vector
- **THEN** the result is a safe default direction (0, 1, 0)

#### Scenario: Rotation
- **WHEN** `rotateAxis` rotates a vector 90° around a perpendicular axis
- **THEN** the result is the expected perpendicular direction
- **WHEN** `rotateAxis` rotates 360°
- **THEN** the result equals the original vector within epsilon

#### Scenario: Arc geometry
- **WHEN** `angBetween` measures the angle between two unit vectors
- **THEN** the result matches the known angle (0 for same, π for opposite, π/2 for perpendicular)
- **WHEN** `arcDistToPoint` measures the perpendicular arc distance from a point to a great-circle arc
- **THEN** the result matches the expected distance for known configurations

### Requirement: Tests are deterministic
All sphere math tests SHALL produce the same result on every run — no dependency on Math.random or time.

#### Scenario: Reproducible results
- **WHEN** the test suite runs twice
- **THEN** all pass/fail outcomes are identical
