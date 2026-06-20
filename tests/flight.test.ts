import { describe, expect, it } from "vitest";
import { LANDMARKS, PLANE_RADIUS } from "../src/shared/constants";
import { resolveLandmarkCollisions } from "../src/shared/flight";
import { normalize } from "../src/shared/sphere";

describe("shared flight landmark collision resolution", () => {
  const tower = LANDMARKS.find((landmark) => landmark.kind === "tower");

  if (!tower) {
    throw new Error("Expected a tower landmark for flight tests");
  }

  it("pushes low-altitude contacts out of landmark footprints", () => {
    const start = {
      x: tower.x + tower.radius + PLANE_RADIUS - 6,
      y: tower.height - 24,
      z: tower.z,
    };
    const fwd = normalize({ x: -1, y: -0.2, z: 0 });

    const result = resolveLandmarkCollisions(start, fwd, LANDMARKS, PLANE_RADIUS);

    expect(result.collided).toBe(true);
    expect(result.pos.x).toBeCloseTo(tower.x + tower.radius + PLANE_RADIUS, 6);
    expect(result.pos.y).toBeCloseTo(tower.height + PLANE_RADIUS, 6);
    expect(result.fwd.y).toBeGreaterThan(0);
  });

  it("allows high-altitude flyovers through the same horizontal footprint", () => {
    const start = {
      x: tower.x + 12,
      y: tower.height + PLANE_RADIUS + 20,
      z: tower.z - 8,
    };
    const fwd = normalize({ x: 0.4, y: 0.15, z: 0.9 });

    const result = resolveLandmarkCollisions(start, fwd, LANDMARKS, PLANE_RADIUS);

    expect(result.collided).toBe(false);
    expect(result.pos).toEqual(start);
    expect(result.fwd.x).toBeCloseTo(fwd.x, 10);
    expect(result.fwd.y).toBeCloseTo(fwd.y, 10);
    expect(result.fwd.z).toBeCloseTo(fwd.z, 10);
  });
});
