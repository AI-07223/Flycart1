// tests/helpers.ts
// Shared test utilities for SmashCart server tests.

import { vi } from "vitest";
import * as S from "../src/shared/sphere";
import * as C from "../src/shared/constants";

/** Epsilon for floating-point comparisons */
export const EPS = 1e-9;

/** Assert two numbers are approximately equal */
export function assertClose(actual: number, expected: number, eps = EPS) {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(`Expected ${expected}, got ${actual} (diff: ${Math.abs(actual - expected)})`);
  }
}

/** Assert two Vec3 are approximately equal */
export function assertVecClose(actual: S.Vec3, expected: S.Vec3, eps = EPS) {
  assertClose(actual.x, expected.x, eps);
  assertClose(actual.y, expected.y, eps);
  assertClose(actual.z, expected.z, eps);
}

/** Assert Vec3 has unit length */
export function assertUnit(v: S.Vec3, eps = EPS) {
  assertClose(S.len(v), 1, eps);
}

/** Deterministic RNG for reproducible tests */
export function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export { S, C };
