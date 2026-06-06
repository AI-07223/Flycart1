// Client mirror of src/shared/sphere.ts — spherical (great-circle) math as window.Sphere.
// Keep in sync with the server. Positions are unit-vector directions; forward is a unit tangent.
(function () {
  const vec = (x, y, z) => ({ x, y, z });
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
  const scale = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  const len = (a) => Math.sqrt(dot(a, a));
  function normalize(a) { const l = len(a); return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 0, y: 1, z: 0 }; }
  function rotateAxis(v, k, ang) {
    const c = Math.cos(ang), s = Math.sin(ang), kv = cross(k, v), kd = dot(k, v) * (1 - c);
    return { x: v.x * c + kv.x * s + k.x * kd, y: v.y * c + kv.y * s + k.y * kd, z: v.z * c + kv.z * s + k.z * kd };
  }
  function anyTangent(p) {
    const ref = Math.abs(p.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    return normalize(cross(ref, p));
  }
  function tangentize(p, f) {
    const d = dot(f, p), t = { x: f.x - d * p.x, y: f.y - d * p.y, z: f.z - d * p.z };
    return len(t) > 1e-9 ? normalize(t) : anyTangent(p);
  }
  function advance(p, f, ang) {
    const axis = cross(p, f), al = len(axis);
    if (al < 1e-9) return { p, f };
    const k = { x: axis.x / al, y: axis.y / al, z: axis.z / al };
    const np = normalize(rotateAxis(p, k, ang));
    return { p: np, f: tangentize(np, rotateAxis(f, k, ang)) };
  }
  function turn(p, f, ang) { return tangentize(p, rotateAxis(f, p, ang)); }
  function angBetween(a, b) { return Math.acos(Math.max(-1, Math.min(1, dot(a, b)))); }
  function slerp(a, b, t) {
    let d = Math.max(-1, Math.min(1, dot(a, b)));
    const th = Math.acos(d);
    if (th < 1e-6) return normalize(a);
    const s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return normalize({ x: a.x * wa + b.x * wb, y: a.y * wa + b.y * wb, z: a.z * wa + b.z * wb });
  }
  const signedAngle = (normal, from, to) => Math.atan2(dot(cross(from, to), normal), dot(from, to));
  // build a unit direction at angular distance `ang` from a base dir along azimuth `az`
  function dirFrom(base, ang, az) {
    const up = Math.abs(base.y) < 0.9 ? vec(0, 1, 0) : vec(1, 0, 0);
    const east = normalize(cross(up, base));
    const north = cross(base, east);
    const tangent = add(scale(east, Math.cos(az)), scale(north, Math.sin(az)));
    const axis = normalize(cross(base, tangent));
    return normalize(rotateAxis(base, axis, ang));
  }

  window.Sphere = { vec, add, sub, scale, dot, cross, len, normalize, rotateAxis, anyTangent, tangentize, advance, turn, angBetween, slerp, signedAngle, dirFrom };
})();
