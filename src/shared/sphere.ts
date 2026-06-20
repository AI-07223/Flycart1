// Flat-world 3D vector math shared by the authoritative server and the browser client.
// The filename stays the same to minimize import churn, but the globe-specific contract is gone.

export interface Vec3 { x: number; y: number; z: number; }

export const WORLD_UP: Vec3 = { x: 0, y: 1, z: 0 };

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
export const lenSq = (a: Vec3): number => dot(a, a);
export const len = (a: Vec3): number => Math.sqrt(lenSq(a));
export const distanceSq = (a: Vec3, b: Vec3): number => lenSq(sub(a, b));
export const distance = (a: Vec3, b: Vec3): number => Math.sqrt(distanceSq(a, b));
export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpVec = (a: Vec3, b: Vec3, t: number): Vec3 => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  z: lerp(a.z, b.z, t),
});
export const flatten = (a: Vec3): Vec3 => ({ x: a.x, y: 0, z: a.z });

export function normalize(a: Vec3): Vec3 {
  const l = len(a);
  return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 1, y: 0, z: 0 };
}

export function rotateAxis(v: Vec3, k: Vec3, ang: number): Vec3 {
  const axis = normalize(k);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const kv = cross(axis, v);
  const kd = dot(axis, v) * (1 - c);
  return {
    x: v.x * c + kv.x * s + axis.x * kd,
    y: v.y * c + kv.y * s + axis.y * kd,
    z: v.z * c + kv.z * s + axis.z * kd,
  };
}

export function anyTangent(dir: Vec3): Vec3 {
  const base = Math.abs(dir.y) > 0.98 ? { x: 1, y: 0, z: 0 } : WORLD_UP;
  return normalize(cross(base, normalize(dir)));
}

export function tangentize(_pos: Vec3, f: Vec3): Vec3 {
  return normalize(f);
}

export function advance(p: Vec3, f: Vec3, dist: number): { p: Vec3; f: Vec3 } {
  const dir = normalize(f);
  return { p: add(p, scale(dir, dist)), f: dir };
}

export function turn(_pos: Vec3, f: Vec3, ang: number): Vec3 {
  return normalize(rotateAxis(f, WORLD_UP, ang));
}

export function angBetween(a: Vec3, b: Vec3): number {
  const na = normalize(a);
  const nb = normalize(b);
  return Math.acos(clamp(dot(na, nb), -1, 1));
}

export function slerp(a: Vec3, b: Vec3, t: number): Vec3 {
  const ta = normalize(a);
  const tb = normalize(b);
  const d = clamp(dot(ta, tb), -1, 1);
  if (d > 0.9995 || d < -0.9995) return normalize(lerpVec(ta, tb, t));
  const th = Math.acos(d);
  const s = Math.sin(th);
  const wa = Math.sin((1 - t) * th) / s;
  const wb = Math.sin(t * th) / s;
  return normalize({
    x: ta.x * wa + tb.x * wb,
    y: ta.y * wa + tb.y * wb,
    z: ta.z * wa + tb.z * wb,
  });
}

export function signedAngle(normal: Vec3, from: Vec3, to: Vec3): number {
  const n = normalize(normal);
  const a = normalize(from);
  const b = normalize(to);
  return Math.atan2(dot(cross(a, b), n), dot(a, b));
}

export function yawPitchForward(yaw: number, pitch: number): Vec3 {
  const cp = Math.cos(pitch);
  return normalize({
    x: Math.cos(yaw) * cp,
    y: Math.sin(pitch),
    z: Math.sin(yaw) * cp,
  });
}

export function yawPitchFromForward(f: Vec3): { yaw: number; pitch: number } {
  const dir = normalize(f);
  return {
    yaw: Math.atan2(dir.z, dir.x),
    pitch: Math.asin(clamp(dir.y, -1, 1)),
  };
}

export function withPitch(f: Vec3, pitch: number): Vec3 {
  const { yaw } = yawPitchFromForward(f);
  return yawPitchForward(yaw, pitch);
}

export function segmentPointT(a: Vec3, b: Vec3, p: Vec3): number {
  const ab = sub(b, a);
  const ll = lenSq(ab);
  if (ll < 1e-9) return 0;
  return clamp(dot(sub(p, a), ab) / ll, 0, 1);
}

export function segmentPointDistance(a: Vec3, b: Vec3, p: Vec3): number {
  const t = segmentPointT(a, b, p);
  return distance(add(a, scale(sub(b, a), t)), p);
}

export function randomDir(rng: () => number = Math.random): Vec3 {
  const z = rng() * 2 - 1;
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  const phi = rng() * Math.PI * 2;
  return { x: r * Math.cos(phi), y: z, z: r * Math.sin(phi) };
}