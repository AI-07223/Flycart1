## ADDED Requirements

### Requirement: Netcode operates on the sphere
Client prediction, remote interpolation, and bullet extrapolation SHALL operate in spherical space: prediction mirrors the server's great-circle step, remote positions are interpolated by spherical interpolation (slerp) of surface points with tangent-heading interpolation, and bullets are extrapolated along their geodesic.

#### Scenario: Local prediction on the sphere
- **WHEN** the local player steers
- **THEN** the predicted plane advances along the same great-circle step the server uses, so reconciliation error stays small

#### Scenario: Remote interpolation on the sphere
- **WHEN** a remote plane is interpolated between snapshots
- **THEN** its position is interpolated along the surface (not through the sphere) and its heading along the tangent, with no chord-cutting or shortest-3D-path artifacts

#### Scenario: Bullet extrapolation follows the geodesic
- **WHEN** a bullet is extrapolated between patches
- **THEN** it advances along its great-circle path rather than a flat straight line
