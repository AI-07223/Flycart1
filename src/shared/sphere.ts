// Spherical (great-circle) math for the globe arena. Pure, framework-free, shared by the
// authoritative server and mirrored on the client (public/js/sphere.js — keep in sync).
//
// Model: a position is a UNIT vector `p` (direction from the planet centre). A moving entity
// (plane, bullet) also carries a FORWARD unit vector `f` that is tangent to the surface (f ⟂ p).
// World render position = p · (RADIUS + altitude). This representation has NO pole singularities
// and hands the renderer up = p and nose = f directly. Distances are angular (radians); speeds are
// linear surface speeds converted to angle via /RADIUS by the caller.

export interface Vec3 { x: number; y: number; z: number; }

export const vec = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const len = (a: Vec3): number => Math.sqrt(dot(a, a));

export function normalize(a: Vec3): Vec3 {
  const l = len(a);
  return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 0, y: 1, z: 0 };
}

// Rotate `v` about UNIT axis `k` by angle `ang` (Rodrigues' rotation formula).
export function rotateAxis(v: Vec3, k: Vec3, ang: number): Vec3 {
  const c = Math.cos(ang), s = Math.sin(ang);
  const kv = cross(k, v);
  const kd = dot(k, v) * (1 - c);
  return {
    x: v.x * c + kv.x * s + k.x * kd,
    y: v.y * c + kv.y * s + k.y * kd,
    z: v.z * c + kv.z * s + k.z * kd,
  };
}

// Re-project `f` onto the tangent plane at `p` and renormalize (restore f ⟂ p, |f| = 1).
// Used after interpolation/accumulated float drift.
export function tangentize(p: Vec3, f: Vec3): Vec3 {
  const d = dot(f, p);
  const t = { x: f.x - d * p.x, y: f.y - d * p.y, z: f.z - d * p.z };
  return len(t) > 1e-9 ? normalize(t) : anyTangent(p);
}

// Great-circle advance: move position `p` along forward `f` by angular distance `ang`.
// Returns the new {p, f}; both are rotated about the geodesic axis (p × f), so f stays tangent.
export function advance(p: Vec3, f: Vec3, ang: number): { p: Vec3; f: Vec3 } {
  const axis = cross(p, f);
  const al = len(axis);
  if (al < 1e-9) return { p, f }; // degenerate (f ∥ p) — shouldn't happen if f is tangent
  const k = { x: axis.x / al, y: axis.y / al, z: axis.z / al };
  return { p: normalize(rotateAxis(p, k, ang)), f: tangentize(normalize(rotateAxis(p, k, ang)), rotateAxis(f, k, ang)) };
}

// Turn: rotate forward `f` about the surface normal `p` by `ang` (keeps f tangent).
export function turn(p: Vec3, f: Vec3, ang: number): Vec3 {
  return tangentize(p, rotateAxis(f, p, ang));
}

// Angular distance (radians) between two unit vectors.
export function angBetween(a: Vec3, b: Vec3): number {
  return Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
}

// Spherical linear interpolation between two unit vectors.
export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  let d = Math.max(-1, Math.min(1, dot(a, b)));
  const th = Math.acos(d);
  if (th < 1e-6) return normalize(a);
  const s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return normalize({ x: a.x * wa + b.x * wb, y: a.y * wa + b.y * wb, z: a.z * wa + b.z * wb });
}

// A unit tangent vector at `p` (arbitrary direction), robust at the poles.
export function anyTangent(p: Vec3): Vec3 {
  // cross with whichever world axis is least parallel to p
  const ref = Math.abs(p.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  return normalize(cross(ref, p));
}

// Uniform random point on the unit sphere (acos(2u-1) latitude → no pole clustering).
export function randomDir(rng: () => number = Math.random): Vec3 {
  const u = rng(), w = rng();
  const z = 2 * u - 1;            // cosθ uniform in [-1,1]
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  const phi = 2 * Math.PI * w;
  return { x: r * Math.cos(phi), y: z, z: r * Math.sin(phi) };
}

// Minimum angular distance from cap centre `c` to the geodesic arc a→b (both unit).
// Tunnel-proof swept test: projects c onto the arc's great circle and clamps to the arc.
export function arcDistToPoint(a: Vec3, b: Vec3, c: Vec3): number {
  const n = cross(a, b);
  const nl = len(n);
  if (nl < 1e-9) return angBetween(a, c); // a≈b: zero-length arc
  const nh = { x: n.x / nl, y: n.y / nl, z: n.z / nl };
  // nearest point on the great circle = c projected off the plane normal, normalized
  const d = dot(c, nh);
  const proj = normalize({ x: c.x - d * nh.x, y: c.y - d * nh.y, z: c.z - d * nh.z });
  // is proj within the arc a→b? (sum of sub-arcs ≈ whole arc)
  const ab = angBetween(a, b);
  if (angBetween(a, proj) + angBetween(proj, b) <= ab + 1e-6) return angBetween(c, proj);
  return Math.min(angBetween(c, a), angBetween(c, b)); // clamp to nearest endpoint
}

// Arc parameter t∈[0,1] of the closest point on a→b to c (for earliest-hit ordering).
export function arcClosestT(a: Vec3, b: Vec3, c: Vec3): number {
  const ab = angBetween(a, b);
  if (ab < 1e-9) return 0;
  const n = cross(a, b);
  const nl = len(n);
  if (nl < 1e-9) return 0;
  const nh = { x: n.x / nl, y: n.y / nl, z: n.z / nl };
  const d = dot(c, nh);
  const proj = normalize({ x: c.x - d * nh.x, y: c.y - d * nh.y, z: c.z - d * nh.z });
  if (angBetween(a, proj) + angBetween(proj, b) <= ab + 1e-6) return angBetween(a, proj) / ab;
  return angBetween(c, a) <= angBetween(c, b) ? 0 : 1;
}
