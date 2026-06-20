import { describe, it, expect } from "vitest";
import { S, EPS, assertClose, assertVecClose, assertUnit, seededRng } from "./helpers";

const {
  vec, add, sub, scale, dot, cross, len, normalize,
  rotateAxis, advance, turn, angBetween, slerp,
  yawPitchForward, yawPitchFromForward, segmentPointT, segmentPointDistance,
  distance, randomDir,
} = S;

describe("flat vector helpers", () => {
  it("adds and subtracts vectors", () => {
    expect(add(vec(1, 2, 3), vec(4, 5, 6))).toEqual({ x: 5, y: 7, z: 9 });
    expect(sub(vec(5, 7, 9), vec(4, 5, 6))).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("computes dot and cross products", () => {
    assertClose(dot(vec(1, 0, 0), vec(0, 1, 0)), 0);
    assertVecClose(cross(vec(1, 0, 0), vec(0, 1, 0)), vec(0, 0, 1));
  });

  it("normalizes non-zero vectors", () => {
    const v = normalize(vec(3, 4, 0));
    assertUnit(v);
    assertClose(v.x, 0.6, EPS);
    assertClose(v.y, 0.8, EPS);
  });

  it("rotates a vector around an axis", () => {
    const r = rotateAxis(vec(1, 0, 0), vec(0, 1, 0), Math.PI / 2);
    assertVecClose(r, vec(0, 0, -1), 1e-6);
  });

  it("advances linearly along a forward vector", () => {
    const result = advance(vec(10, 20, 30), vec(1, 0, 0), 12);
    assertVecClose(result.p, vec(22, 20, 30));
    assertVecClose(result.f, vec(1, 0, 0));
  });

  it("turn rotates around world up", () => {
    const result = turn(vec(0, 0, 0), vec(1, 0, 0), Math.PI / 2);
    assertVecClose(result, vec(0, 0, -1), 1e-6);
  });

  it("yaw/pitch round-trips through forward vectors", () => {
    const forward = yawPitchForward(Math.PI / 3, 0.2);
    const roundTrip = yawPitchFromForward(forward);
    assertClose(roundTrip.yaw, Math.PI / 3, 1e-6);
    assertClose(roundTrip.pitch, 0.2, 1e-6);
  });

  it("measures segment proximity in 3D", () => {
    const a = vec(0, 0, 0);
    const b = vec(10, 0, 0);
    const p = vec(6, 3, 0);
    assertClose(segmentPointT(a, b, p), 0.6, 1e-6);
    assertClose(segmentPointDistance(a, b, p), 3, 1e-6);
  });

  it("slerps between unit vectors", () => {
    const a = vec(1, 0, 0);
    const b = vec(0, 1, 0);
    const m = slerp(a, b, 0.5);
    assertUnit(m, 1e-6);
    assertClose(angBetween(a, m), Math.PI / 4, 1e-5);
    assertClose(angBetween(m, b), Math.PI / 4, 1e-5);
  });

  it("randomDir is deterministic for the same seed and always unit length", () => {
    const a = seededRng(42);
    const b = seededRng(42);
    for (let i = 0; i < 6; i++) {
      const va = randomDir(a);
      const vb = randomDir(b);
      assertUnit(va, 1e-6);
      assertVecClose(va, vb, 1e-9);
    }
  });

  it("distance matches Euclidean separation", () => {
    assertClose(distance(vec(0, 0, 0), vec(3, 4, 0)), 5, 1e-6);
    assertClose(len(scale(vec(1, 2, 2), 2)), 6, 1e-6);
  });
});