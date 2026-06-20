"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/shared/sphere.ts
  function normalize(a) {
    const l = len(a);
    return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 1, y: 0, z: 0 };
  }
  function rotateAxis(v, k, ang) {
    const axis = normalize(k);
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const kv = cross(axis, v);
    const kd = dot(axis, v) * (1 - c);
    return {
      x: v.x * c + kv.x * s + axis.x * kd,
      y: v.y * c + kv.y * s + axis.y * kd,
      z: v.z * c + kv.z * s + axis.z * kd
    };
  }
  function anyTangent(dir) {
    const base = Math.abs(dir.y) > 0.98 ? { x: 1, y: 0, z: 0 } : WORLD_UP;
    return normalize(cross(base, normalize(dir)));
  }
  function tangentize(_pos, f) {
    return normalize(f);
  }
  function advance(p, f, dist) {
    const dir = normalize(f);
    return { p: add(p, scale(dir, dist)), f: dir };
  }
  function turn(_pos, f, ang) {
    return normalize(rotateAxis(f, WORLD_UP, ang));
  }
  function angBetween(a, b) {
    const na = normalize(a);
    const nb = normalize(b);
    return Math.acos(clamp(dot(na, nb), -1, 1));
  }
  function slerp(a, b, t) {
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
      z: ta.z * wa + tb.z * wb
    });
  }
  function signedAngle(normal, from, to) {
    const n = normalize(normal);
    const a = normalize(from);
    const b = normalize(to);
    return Math.atan2(dot(cross(a, b), n), dot(a, b));
  }
  function yawPitchForward(yaw, pitch) {
    const cp = Math.cos(pitch);
    return normalize({
      x: Math.cos(yaw) * cp,
      y: Math.sin(pitch),
      z: Math.sin(yaw) * cp
    });
  }
  function yawPitchFromForward(f) {
    const dir = normalize(f);
    return {
      yaw: Math.atan2(dir.z, dir.x),
      pitch: Math.asin(clamp(dir.y, -1, 1))
    };
  }
  function withPitch(f, pitch) {
    const { yaw } = yawPitchFromForward(f);
    return yawPitchForward(yaw, pitch);
  }
  function segmentPointT(a, b, p) {
    const ab = sub(b, a);
    const ll = lenSq(ab);
    if (ll < 1e-9) return 0;
    return clamp(dot(sub(p, a), ab) / ll, 0, 1);
  }
  function segmentPointDistance(a, b, p) {
    const t = segmentPointT(a, b, p);
    return distance(add(a, scale(sub(b, a), t)), p);
  }
  function randomDir(rng = Math.random) {
    const z = rng() * 2 - 1;
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    const phi = rng() * Math.PI * 2;
    return { x: r * Math.cos(phi), y: z, z: r * Math.sin(phi) };
  }
  var WORLD_UP, vec, add, sub, scale, dot, cross, lenSq, len, distanceSq, distance, clamp, lerp, lerpVec, flatten;
  var init_sphere = __esm({
    "src/shared/sphere.ts"() {
      "use strict";
      WORLD_UP = { x: 0, y: 1, z: 0 };
      vec = (x, y, z) => ({ x, y, z });
      add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
      sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
      scale = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
      dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
      cross = (a, b) => ({
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
      });
      lenSq = (a) => dot(a, a);
      len = (a) => Math.sqrt(lenSq(a));
      distanceSq = (a, b) => lenSq(sub(a, b));
      distance = (a, b) => Math.sqrt(distanceSq(a, b));
      clamp = (v, min, max) => Math.max(min, Math.min(max, v));
      lerp = (a, b, t) => a + (b - a) * t;
      lerpVec = (a, b, t) => ({
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        z: lerp(a.z, b.z, t)
      });
      flatten = (a) => ({ x: a.x, y: 0, z: a.z });
    }
  });

  // src/client/sphere.ts
  var require_sphere = __commonJS({
    "src/client/sphere.ts"() {
      init_sphere();
      window.Sphere = {
        vec,
        add,
        sub,
        scale,
        dot,
        cross,
        len,
        normalize,
        rotateAxis,
        anyTangent,
        tangentize,
        advance,
        turn,
        angBetween,
        slerp,
        signedAngle,
        yawPitchForward,
        yawPitchFromForward,
        withPitch,
        distance,
        distanceSq,
        clamp,
        lerp,
        lerpVec,
        flatten,
        segmentPointT,
        segmentPointDistance,
        randomDir
      };
    }
  });
  require_sphere();
})();
