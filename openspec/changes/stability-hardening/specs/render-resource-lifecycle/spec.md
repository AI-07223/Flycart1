## ADDED Requirements

### Requirement: GPU resources are released on entity removal
When the renderer removes an entity it created per-instance (bullets, planes/views, pickups, shields, blobs), it SHALL dispose that entity's per-instance geometries and materials, not merely detach it from the scene. Shared module-level geometries SHALL NOT be disposed.

#### Scenario: Bullet is removed
- **WHEN** a bullet leaves synchronized state and its mesh is removed
- **THEN** the bullet's per-instance geometries and materials are disposed so they do not accumulate in GPU memory

#### Scenario: Plane/pickup/shield is removed
- **WHEN** a player/bot leaves, or a pickup is collected, or a shield is torn down
- **THEN** the associated per-instance geometries and materials are disposed

#### Scenario: Shared geometry is preserved
- **WHEN** any entity using a shared module-level geometry is removed
- **THEN** the shared geometry is left intact for other and future entities

### Requirement: Memory does not grow unbounded over a session
Renderer GPU resource counts SHALL remain bounded across a multi-minute session of continuous combat (no monotonic growth in geometry/material/program counts attributable to despawned entities).

#### Scenario: Sustained combat
- **WHEN** bullets and planes are spawned and despawned continuously for several minutes
- **THEN** the renderer's reported geometry/material counts stay bounded rather than climbing indefinitely

### Requirement: Per-frame allocations are bounded
The per-frame render path SHALL avoid creating unbounded short-lived objects each frame where a reused buffer suffices, to limit garbage-collection pressure.

#### Scenario: Steady-state rendering
- **WHEN** the game renders at 60+ Hz with several entities present
- **THEN** the frame loop reuses its working collections/buffers instead of allocating fresh ones every frame

### Requirement: Memory is observable for regression detection
The renderer debug hook SHALL expose true GPU resource counts (geometries, textures, programs) so resource leaks are observable and cannot silently regress.

#### Scenario: Inspecting memory
- **WHEN** the renderer debug info is read
- **THEN** it reports actual GPU resource counts, not just scene-graph child count
