// tests/sphere.test.ts
// Unit tests for src/shared/sphere.ts — all 14 exported functions.

import { describe, it, expect } from "vitest";
import { S, EPS, assertClose, assertVecClose, assertUnit, seededRng } from "./helpers";

const { vec, add, sub, scale, dot, cross, len, normalize, rotateAxis, tangentize, advance, turn, angBetween, slerp, arcDistToPoint, arcClosestT, randomDir } = S;

// --- Vector arithmetic ---

describe("vec", () => {
  it("creates a vector from components", () => {
    const v = vec(1, 2, 3);
    expect(v).toEqual({ x: 1, y: 2, z: 3 });
  });
});

describe("add", () => {
  it("adds two vectors", () => {
    const r = add(vec(1, 2, 3), vec(4, 5, 6));
    expect(r).toEqual({ x: 5, y: 7, z: 9 });
  });
  it("adding zero vector returns same", () => {
    const v = vec(3, -1, 7);
    assertVecClose(add(v, vec(0, 0, 0)), v);
  });
});

describe("sub", () => {
  it("subtracts two vectors", () => {
    const r = sub(vec(5, 7, 9), vec(4, 5, 6));
    expect(r).toEqual({ x: 1, y: 2, z: 3 });
  });
});

describe("scale", () => {
  it("scales a vector by a scalar", () => {
    const r = scale(vec(1, 2, 3), 2);
    expect(r).toEqual({ x: 2, y: 4, z: 6 });
  });
  it("scaling by 0 gives zero vector", () => {
    const r = scale(vec(5, -3, 7), 0);
    expect(Math.abs(r.x)).toBe(0);
    expect(Math.abs(r.y)).toBe(0);
    expect(Math.abs(r.z)).toBe(0);
  });
});

describe("dot", () => {
  it("dot product of perpendicular vectors is 0", () => {
    assertClose(dot(vec(1, 0, 0), vec(0, 1, 0)), 0);
  });
  it("dot product of parallel vectors is product of lengths", () => {
    assertClose(dot(vec(3, 0, 0), vec(5, 0, 0)), 15);
  });
  it("dot product of opposite vectors is negative", () => {
    assertClose(dot(vec(1, 0, 0), vec(-1, 0, 0)), -1);
  });
});

describe("cross", () => {
  it("cross product of x and y axes gives z axis", () => {
    const r = cross(vec(1, 0, 0), vec(0, 1, 0));
    assertVecClose(r, vec(0, 0, 1));
  });
  it("cross product of parallel vectors is zero", () => {
    const r = cross(vec(1, 0, 0), vec(2, 0, 0));
    assertVecClose(r, vec(0, 0, 0));
  });
  it("cross product is anti-commutative", () => {
    const a = vec(1, 2, 3);
    const b = vec(4, 5, 6);
    assertVecClose(cross(a, b), scale(cross(b, a), -1));
  });
});

// --- Length and normalization ---

describe("len", () => {
  it("length of unit vectors is 1", () => {
    assertClose(len(vec(1, 0, 0)), 1);
    assertClose(len(vec(0, 1, 0)), 1);
    assertClose(len(vec(0, 0, 1)), 1);
  });
  it("length of (3,4,0) is 5", () => {
    assertClose(len(vec(3, 4, 0)), 5);
  });
  it("length of zero vector is 0", () => {
    assertClose(len(vec(0, 0, 0)), 0);
  });
});

describe("normalize", () => {
  it("normalizes a non-zero vector to unit length", () => {
    const v = normalize(vec(3, 4, 0));
    assertUnit(v);
    assertClose(v.x, 0.6, EPS);
    assertClose(v.y, 0.8, EPS);
  });
  it("normalizing a unit vector returns it unchanged", () => {
    const v = vec(0, 1, 0);
    assertVecClose(normalize(v), v);
  });
  it("normalizing zero vector returns safe default", () => {
    const v = normalize(vec(0, 0, 0));
    assertUnit(v);
  });
});

// --- Rotation ---

describe("rotateAxis", () => {
  it("rotating 0° returns same vector", () => {
    const v = vec(1, 0, 0);
    const k = vec(0, 0, 1);
    assertVecClose(rotateAxis(v, k, 0), v);
  });
  it("rotating x-axis 90° around z-axis gives y-axis", () => {
    const v = vec(1, 0, 0);
    const k = vec(0, 0, 1);
    const r = rotateAxis(v, k, Math.PI / 2);
    assertVecClose(r, vec(0, 1, 0), 1e-6);
  });
  it("rotating 180° gives opposite", () => {
    const v = vec(1, 0, 0);
    const k = vec(0, 0, 1);
    const r = rotateAxis(v, k, Math.PI);
    assertVecClose(r, vec(-1, 0, 0), 1e-6);
  });
  it("rotating 360° returns same vector", () => {
    const v = vec(0.5, 0.7, 0.3);
    const k = normalize(vec(1, 1, 1));
    const r = rotateAxis(v, k, Math.PI * 2);
    assertVecClose(r, v, 1e-6);
  });
});

// --- Tangentize, advance, turn ---

describe("tangentize", () => {
  it("result is perpendicular to position", () => {
    const p = normalize(vec(1, 2, 3));
    const f = normalize(vec(0, 1, 0));
    const t = tangentize(p, f);
    assertClose(dot(p, t), 0, 1e-6);
  });
  it("result has unit length", () => {
    const p = normalize(vec(1, 2, 3));
    const f = normalize(vec(0, 1, 0));
    assertUnit(tangentize(p, f), 1e-6);
  });
});

describe("advance", () => {
  it("advancing 0° returns same position", () => {
    const p = normalize(vec(1, 0, 0));
    const f = normalize(vec(0, 1, 0));
    const r = advance(p, f, 0);
    assertVecClose(r.p, p, 1e-6);
  });
  it("advancing moves along forward direction", () => {
    const p = normalize(vec(1, 0, 0));
    const f = normalize(vec(0, 1, 0));
    const r = advance(p, f, 0.1);
    // Position should have moved toward f
    assertClose(angBetween(p, r.p), 0.1, 1e-6);
  });
});

describe("turn", () => {
  it("turning 0° returns same heading", () => {
    const p = normalize(vec(1, 0, 0));
    const f = normalize(vec(0, 1, 0));
    const r = turn(p, f, 0);
    assertVecClose(r, f, 1e-6);
  });
  it("turning rotates heading around position", () => {
    const p = normalize(vec(0, 0, 1));
    const f = normalize(vec(1, 0, 0));
    const r = turn(p, f, Math.PI / 2);
    // Heading should have rotated 90°
    assertClose(angBetween(f, r), Math.PI / 2, 1e-6);
  });
});

// --- Angular distance and slerp ---

describe("angBetween", () => {
  it("same direction = 0", () => {
    const v = normalize(vec(1, 2, 3));
    assertClose(angBetween(v, v), 0);
  });
  it("opposite directions = π", () => {
    assertClose(angBetween(vec(1, 0, 0), vec(-1, 0, 0)), Math.PI);
  });
  it("perpendicular = π/2", () => {
    assertClose(angBetween(vec(1, 0, 0), vec(0, 1, 0)), Math.PI / 2);
  });
});

describe("slerp", () => {
  it("t=0 returns start", () => {
    const a = normalize(vec(1, 0, 0));
    const b = normalize(vec(0, 1, 0));
    assertVecClose(slerp(a, b, 0), a, 1e-6);
  });
  it("t=1 returns end", () => {
    const a = normalize(vec(1, 0, 0));
    const b = normalize(vec(0, 1, 0));
    assertVecClose(slerp(a, b, 1), b, 1e-6);
  });
  it("t=0.5 is midpoint (π/4 from each)", () => {
    const a = normalize(vec(1, 0, 0));
    const b = normalize(vec(0, 1, 0));
    const m = slerp(a, b, 0.5);
    assertUnit(m, 1e-6);
    assertClose(angBetween(a, m), Math.PI / 4, 1e-6);
    assertClose(angBetween(m, b), Math.PI / 4, 1e-6);
  });
});

// --- Arc geometry ---

describe("arcDistToPoint", () => {
  it("point on arc midpoint has distance 0", () => {
    const a = normalize(vec(1, 0, 0));
    const b = normalize(vec(0, 1, 0));
    const mid = normalize(add(a, b));
    assertClose(arcDistToPoint(a, b, mid), 0, 1e-6);
  });
  it("point at pole has distance π/2 from equatorial arc", () => {
    const a = normalize(vec(1, 0, 0));
    const b = normalize(vec(0, 1, 0));
    const pole = vec(0, 0, 1);
    assertClose(arcDistToPoint(a, b, pole), Math.PI / 2, 1e-6);
  });
});

describe("arcClosestT", () => {
  it("midpoint of arc returns t≈0.5", () => {
    const a = normalize(vec(1, 0, 0));
    const b = normalize(vec(0, 1, 0));
    const mid = normalize(add(a, b));
    const t = arcClosestT(a, b, mid);
    assertClose(t, 0.5, 0.1);
  });
  it("point near start returns t≈0", () => {
    const a = normalize(vec(1, 0, 0));
    const b = normalize(vec(0, 1, 0));
    const nearA = normalize(add(a, scale(b, 0.05)));
    const t = arcClosestT(a, b, nearA);
    assertClose(t, 0, 0.1);
  });
});

// --- randomDir ---

describe("randomDir", () => {
  it("returns a unit vector", () => {
    const rng = seededRng(42);
    for (let i = 0; i < 10; i++) {
      assertUnit(randomDir(rng), 1e-6);
    }
  });
  it("deterministic with same seed", () => {
    const rng1 = seededRng(123);
    const rng2 = seededRng(123);
    for (let i = 0; i < 5; i++) {
      const a = randomDir(rng1);
      const b = randomDir(rng2);
      assertVecClose(a, b);
    }
  });
});
