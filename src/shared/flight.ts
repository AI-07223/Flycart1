import type { Landmark } from "./constants";
import { lerp, normalize, type Vec3 } from "./sphere";

export interface LandmarkCollisionResult {
  pos: Vec3;
  fwd: Vec3;
  collided: boolean;
}

export function resolveLandmarkCollisions(
  pos: Vec3,
  fwd: Vec3,
  landmarks: Landmark[],
  radius: number,
): LandmarkCollisionResult {
  let nextPos = { ...pos };
  let nextFwd = normalize(fwd);
  let collided = false;

  for (const landmark of landmarks) {
    const dx = nextPos.x - landmark.x;
    const dz = nextPos.z - landmark.z;
    const rr = landmark.radius + radius;
    if (dx * dx + dz * dz > rr * rr) continue;

    const floor = landmark.height + radius;
    if (nextPos.y > floor) continue;

    const out = normalize({ x: dx || 1, y: 0, z: dz || 0 });
    nextPos = {
      x: landmark.x + out.x * rr,
      y: Math.max(nextPos.y, floor),
      z: landmark.z + out.z * rr,
    };
    nextFwd = normalize({
      x: lerp(nextFwd.x, out.x, 0.35),
      y: Math.max(0.08, nextFwd.y),
      z: lerp(nextFwd.z, out.z, 0.35),
    });
    collided = true;
  }

  return { pos: nextPos, fwd: nextFwd, collided };
}
