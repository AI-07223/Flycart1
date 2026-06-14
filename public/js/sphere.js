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
    return l > 1e-9 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 0, y: 1, z: 0 };
  }
  function rotateAxis(v, k, ang) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const kv = cross(k, v);
    const kd = dot(k, v) * (1 - c);
    return {
      x: v.x * c + kv.x * s + k.x * kd,
      y: v.y * c + kv.y * s + k.y * kd,
      z: v.z * c + kv.z * s + k.z * kd
    };
  }
  function tangentize(p, f) {
    const d = dot(f, p);
    const t = { x: f.x - d * p.x, y: f.y - d * p.y, z: f.z - d * p.z };
    return len(t) > 1e-9 ? normalize(t) : anyTangent(p);
  }
  function advance(p, f, ang) {
    const axis = cross(p, f);
    const al = len(axis);
    if (al < 1e-9) return { p, f };
    const k = { x: axis.x / al, y: axis.y / al, z: axis.z / al };
    return { p: normalize(rotateAxis(p, k, ang)), f: tangentize(normalize(rotateAxis(p, k, ang)), rotateAxis(f, k, ang)) };
  }
  function turn(p, f, ang) {
    return tangentize(p, rotateAxis(f, p, ang));
  }
  function angBetween(a, b) {
    return Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
  }
  function slerp(a, b, t) {
    let d = Math.max(-1, Math.min(1, dot(a, b)));
    const th = Math.acos(d);
    if (th < 1e-6) return normalize(a);
    const s = Math.sin(th);
    const wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return normalize({ x: a.x * wa + b.x * wb, y: a.y * wa + b.y * wb, z: a.z * wa + b.z * wb });
  }
  function anyTangent(p) {
    const ref = Math.abs(p.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    return normalize(cross(ref, p));
  }
  function randomDir(rng = Math.random) {
    const u = rng(), w = rng();
    const z = 2 * u - 1;
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    const phi = 2 * Math.PI * w;
    return { x: r * Math.cos(phi), y: z, z: r * Math.sin(phi) };
  }
  var vec, add, sub, scale, dot, cross, len;
  var init_sphere = __esm({
    "src/shared/sphere.ts"() {
      "use strict";
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
      len = (a) => Math.sqrt(dot(a, a));
    }
  });

  // src/client/sphere.ts
  var require_sphere = __commonJS({
    "src/client/sphere.ts"() {
      init_sphere();
      function signedAngle(normal, from, to) {
        return Math.atan2(dot(cross(from, to), normal), dot(from, to));
      }
      function dirFrom(base, ang, az) {
        const up = Math.abs(base.y) < 0.9 ? vec(0, 1, 0) : vec(1, 0, 0);
        const east = normalize(cross(up, base));
        const north = cross(base, east);
        const tangent = add(scale(east, Math.cos(az)), scale(north, Math.sin(az)));
        const axis = normalize(cross(base, tangent));
        return normalize(rotateAxis(base, axis, ang));
      }
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
        dirFrom,
        randomDir
      };
    }
  });
  require_sphere();
})();
