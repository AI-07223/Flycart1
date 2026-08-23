## ADDED Requirements

### Requirement: Powerups operate in spherical space
Powerup mechanics SHALL be computed on the sphere: pickups spawn at valid surface points, homing missiles steer toward their target within the tangent plane (capped angular turn), spread shots offset the heading in the tangent plane, and afterburner raises angular speed. Effect definitions, durations, and the powerup set SHALL be unchanged.

#### Scenario: Pickups on the surface
- **WHEN** pickups spawn
- **THEN** they appear at valid, well-distributed points on the sphere surface and are collected by angular overlap with a plane

#### Scenario: Homing on the sphere
- **WHEN** a homing missile pursues a target
- **THEN** it steers toward the target along the surface (tangent-plane turn, capped rate) following a great-circle-style pursuit, not a flat-plane heading
