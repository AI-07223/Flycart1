// Client sphere module: spherical (great-circle) math as window.Sphere.
// Re-exports shared/sphere.ts functions + two client-only helpers (signedAngle, dirFrom).
import {
  vec, add, sub, scale, dot, cross, len, normalize,
  rotateAxis, anyTangent, tangentize, advance, turn,
  angBetween, slerp, randomDir,
} from "../shared/sphere";

/** Signed angle from `from` to `to` about `normal` (radians). */
function signedAngle(normal: { x: number; y: number; z: number }, from: { x: number; y: number; z: number }, to: { x: number; y: number; z: number }): number {
  return Math.atan2(dot(cross(from, to), normal), dot(from, to));
}

/** Build a unit direction at angular distance `ang` from `base` along azimuth `az`. */
function dirFrom(base: { x: number; y: number; z: number }, ang: number, az: number): { x: number; y: number; z: number } {
  const up = Math.abs(base.y) < 0.9 ? vec(0, 1, 0) : vec(1, 0, 0);
  const east = normalize(cross(up, base));
  const north = cross(base, east);
  const tangent = add(scale(east, Math.cos(az)), scale(north, Math.sin(az)));
  const axis = normalize(cross(base, tangent));
  return normalize(rotateAxis(base, axis, ang));
}

(window as any).Sphere = {
  vec, add, sub, scale, dot, cross, len, normalize,
  rotateAxis, anyTangent, tangentize, advance, turn,
  angBetween, slerp, signedAngle, dirFrom, randomDir,
};
