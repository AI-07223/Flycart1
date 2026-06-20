## ADDED Requirements

### Requirement: Dynamic render objects must release owned GPU resources
The renderer SHALL dispose geometries and materials owned by dynamic scene objects when those objects are permanently removed from the scene.

#### Scenario: Projectile removal disposes owned resources
- **WHEN** a bullet leaves authoritative state and its render object is removed
- **THEN** the renderer disposes the bullet's geometry and material instances before dropping references

#### Scenario: Player removal disposes owned resources
- **WHEN** a player view and shield are removed from the scene
- **THEN** the renderer disposes the owned geometry and material instances for those objects

### Requirement: Expiring transient effects must not accumulate indefinitely
Transient particles and menu/demo objects SHALL release their owned resources when they expire or are replaced.

#### Scenario: Particle expiry releases resources
- **WHEN** a particle effect reaches the end of its lifetime
- **THEN** the particle mesh is removed and its owned resources are disposed
