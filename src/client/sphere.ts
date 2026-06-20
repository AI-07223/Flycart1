// Client vector module: flat-world helpers exposed as window.Sphere for compatibility.
import {
  vec, add, sub, scale, dot, cross, len, normalize,
  rotateAxis, anyTangent, tangentize, advance, turn,
  angBetween, slerp, randomDir, signedAngle, yawPitchForward,
  yawPitchFromForward, withPitch, distance, distanceSq,
  clamp, lerp, lerpVec, flatten, segmentPointT, segmentPointDistance,
} from "../shared/sphere";

(window as any).Sphere = {
  vec, add, sub, scale, dot, cross, len, normalize,
  rotateAxis, anyTangent, tangentize, advance, turn,
  angBetween, slerp, signedAngle, yawPitchForward,
  yawPitchFromForward, withPitch, distance, distanceSq,
  clamp, lerp, lerpVec, flatten, segmentPointT, segmentPointDistance,
  randomDir,
};