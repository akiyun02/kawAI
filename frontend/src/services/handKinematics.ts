import { Landmark3D, Vector3D } from '../types';

export interface CanonicalHandFrame {
  origin: Vector3D;
  xAxis: Vector3D; // Directed radially (towards thumb)
  yAxis: Vector3D; // Directed distally (along palm, wrist -> middle MCP)
  zAxis: Vector3D; // Palm normal (directed OUT from palm surface)
  palmScale: number; // Euclidean length of palm (wrist to middle MCP)
}

export interface FingerBiometrics {
  extensionRatio: number;  // 0.0 (curled) to 1.0 (straight)
  pipAngleDeg: number;     // 0 deg (straight) to 120 deg (curled)
  dipAngleDeg: number;     // 0 deg (straight) to 90 deg (curled)
  isExtended: boolean;
  isCurled: boolean;
  isHooked: boolean;
  tipToMcpDist: number;
}

export interface ThumbBiometrics {
  extensionRatio: number;
  isExtended: boolean;      // Abducted wide outward (5, L, Y, 3)
  isAcross: boolean;        // Tucked across palm (B, 4, E)
  isAlongIndex: boolean;    // Upright along index edge (A fist)
  distToIndexMcp: number;   // Normalized by palm scale
  distToPinkyMcp: number;   // Normalized by palm scale
  distToMiddleTip: number;  // Normalized by palm scale
  distToIndexTip: number;   // Normalized by palm scale
}

export interface HandKinematicsAnalysis {
  handedness: 'Left' | 'Right';
  frame: CanonicalHandFrame;
  palmNormal: Vector3D;
  palmFacing: 'camera' | 'inward' | 'side';
  palmAspect: number; // width / height
  palmScale: number;
  spreadRatio: number; // Total fingertip spread ratio
  thumb: ThumbBiometrics;
  index: FingerBiometrics;
  middle: FingerBiometrics;
  ring: FingerBiometrics;
  pinky: FingerBiometrics;
  canonicalFeatures: number[]; // 63 rotation- and scale-invariant coordinates
}

// 3D Euclidean distance
export function dist3D(p1: Landmark3D, p2: Landmark3D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.hypot(dx, dy, dz);
}

// 2D distance
export function dist2D(p1: Landmark3D, p2: Landmark3D): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

// Dot product between two 3D vectors
export function dot3D(v1: Vector3D, v2: Vector3D): number {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

// Cross product between two 3D vectors
export function cross3D(v1: Vector3D, v2: Vector3D): Vector3D {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x
  };
}

// Normalize a 3D vector
export function normalize3D(v: Vector3D): Vector3D {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

// Vector difference p2 - p1
export function vectorSub(p2: Landmark3D, p1: Landmark3D): Vector3D {
  return {
    x: p2.x - p1.x,
    y: p2.y - p1.y,
    z: (p2.z || 0) - (p1.z || 0)
  };
}

// Calculate angle between two vectors in degrees (0 to 180)
export function angleBetweenDeg(v1: Vector3D, v2: Vector3D): number {
  const n1 = normalize3D(v1);
  const n2 = normalize3D(v2);
  const dot = Math.max(-1, Math.min(1, dot3D(n1, n2)));
  return (Math.acos(dot) * 180) / Math.PI;
}

/**
 * Infer handedness from hand geometry if not explicitly provided by tracker.
 * Checks whether thumb (1) is to the left or right of the palm axis (wrist -> middle MCP).
 */
export function inferHandedness(landmarks: Landmark3D[]): 'Left' | 'Right' {
  if (!landmarks || landmarks.length < 21) return 'Right';
  
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const thumbCmc = landmarks[1];
  
  // 2D cross product in image coordinates
  const palmAxisX = middleMcp.x - wrist.x;
  const palmAxisY = middleMcp.y - wrist.y;
  const thumbVecX = thumbCmc.x - wrist.x;
  const thumbVecY = thumbCmc.y - wrist.y;
  
  const cross = palmAxisX * thumbVecY - palmAxisY * thumbVecX;
  // If thumb is to the right in mirrored webcam view, it's typically user's right hand
  return cross > 0 ? 'Right' : 'Left';
}

/**
 * Constructs an intrinsic, rotation- and scale-invariant 3D coordinate frame for the hand.
 * Origin = Wrist (0)
 * Y-axis = Palm direction (wrist 0 -> middle MCP 9)
 * Z-axis = Palm Normal (perpendicular to knuckles, points OUT from palm)
 * X-axis = Transverse direction (Y x Z, pointing radially toward thumb)
 */
export function computeCanonicalHandFrame(
  landmarks: Landmark3D[],
  providedHandedness?: 'Left' | 'Right'
): CanonicalHandFrame {
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];

  const handedness = providedHandedness || inferHandedness(landmarks);

  const origin: Vector3D = { x: wrist.x, y: wrist.y, z: wrist.z || 0 };
  const yVec = vectorSub(middleMcp, wrist);
  const palmScale = Math.hypot(yVec.x, yVec.y, yVec.z) || 0.18;
  const yAxis = normalize3D(yVec);

  // Knuckle transverse vector (Ulnar -> Radial)
  let widthVec: Vector3D;
  if (handedness === 'Right') {
    widthVec = vectorSub(indexMcp, pinkyMcp); // Pinky to Index is radial
  } else {
    widthVec = vectorSub(pinkyMcp, indexMcp); // Inverted for left hand
  }

  // Palm normal (Z-axis pointing out of palm surface)
  const zVec = cross3D(widthVec, yAxis);
  const zAxis = normalize3D(zVec);

  // X-axis (transverse axis completing right-handed orthonormal basis)
  const xAxis = normalize3D(cross3D(yAxis, zAxis));

  return {
    origin,
    xAxis,
    yAxis,
    zAxis,
    palmScale
  };
}

/**
 * Projects 21 landmarks into the canonical intrinsic coordinate frame.
 * Output: 63 normalized coordinates [x0, y0, z0, ..., x20, y20, z20].
 * Invariant to:
 * - Hand position in camera frame
 * - Distance from camera (scale)
 * - 2D hand tilt and rotation
 * - 3D out-of-plane pitch and roll
 * - Left vs Right hand reflection
 */
export function projectLandmarksToCanonical(
  landmarks: Landmark3D[],
  frame: CanonicalHandFrame
): number[] {
  const result: number[] = new Array(63);
  const { origin, xAxis, yAxis, zAxis, palmScale } = frame;

  for (let i = 0; i < 21; i++) {
    const lm = landmarks[i];
    const dx = lm.x - origin.x;
    const dy = lm.y - origin.y;
    const dz = (lm.z || 0) - origin.z;

    const xLocal = (dx * xAxis.x + dy * xAxis.y + dz * xAxis.z) / palmScale;
    const yLocal = (dx * yAxis.x + dy * yAxis.y + dz * yAxis.z) / palmScale;
    const zLocal = (dx * zAxis.x + dy * zAxis.y + dz * zAxis.z) / palmScale;

    result[i * 3] = xLocal;
    result[i * 3 + 1] = yLocal;
    result[i * 3 + 2] = zLocal;
  }

  return result;
}

/**
 * Evaluates extension, curl, and joint angles of an individual finger.
 */
function evaluateSingleFinger(
  landmarks: Landmark3D[],
  mcpIdx: number,
  pipIdx: number,
  dipIdx: number,
  tipIdx: number
): FingerBiometrics {
  const mcp = landmarks[mcpIdx];
  const pip = landmarks[pipIdx];
  const dip = landmarks[dipIdx];
  const tip = landmarks[tipIdx];

  const l1 = dist3D(mcp, pip);
  const l2 = dist3D(pip, dip);
  const l3 = dist3D(dip, tip);
  const totalArcLength = (l1 + l2 + l3) || 0.15;

  const tipToMcp = dist3D(mcp, tip);
  const extensionRatio = Math.max(0, Math.min(1.0, tipToMcp / totalArcLength));

  // Joint flexion angles
  const b1 = vectorSub(pip, mcp);
  const b2 = vectorSub(dip, pip);
  const b3 = vectorSub(tip, dip);

  const pipAngleDeg = angleBetweenDeg(b1, b2);
  const dipAngleDeg = angleBetweenDeg(b2, b3);

  // Robust thresholds with zero dead zones
  const isExtended = extensionRatio >= 0.72 && pipAngleDeg <= 48;
  const isCurled = extensionRatio <= 0.54 || pipAngleDeg >= 62;
  const isHooked = !isExtended && !isCurled && extensionRatio >= 0.46 && extensionRatio <= 0.74;

  return {
    extensionRatio,
    pipAngleDeg,
    dipAngleDeg,
    isExtended,
    isCurled,
    isHooked,
    tipToMcpDist: tipToMcp
  };
}

/**
 * Comprehensive 3D Biomechanical Hand Analysis.
 * Computes exact joint flexion, 3D finger spans, thumb opposition, and orientation.
 */
export function analyze3DFingerKinematics(
  landmarks: Landmark3D[],
  providedHandedness?: 'Left' | 'Right'
): HandKinematicsAnalysis {
  const handedness = providedHandedness || inferHandedness(landmarks);
  const frame = computeCanonicalHandFrame(landmarks, handedness);
  const palmScale = frame.palmScale;

  // 1. Four fingers
  const index = evaluateSingleFinger(landmarks, 5, 6, 7, 8);
  const middle = evaluateSingleFinger(landmarks, 9, 10, 11, 12);
  const ring = evaluateSingleFinger(landmarks, 13, 14, 15, 16);
  const pinky = evaluateSingleFinger(landmarks, 17, 18, 19, 20);

  // 2. Thumb Biometrics
  const cmc = landmarks[1];
  const thumbMcp = landmarks[2];
  const thumbIp = landmarks[3];
  const thumbTip = landmarks[4];

  const thumbArc = dist3D(cmc, thumbMcp) + dist3D(thumbMcp, thumbIp) + dist3D(thumbIp, thumbTip);
  const thumbSpan = dist3D(cmc, thumbTip);
  const thumbExtensionRatio = thumbSpan / (thumbArc || 0.15);

  const distToIndexMcp = dist3D(thumbTip, landmarks[5]) / palmScale;
  const distToPinkyMcp = dist3D(thumbTip, landmarks[17]) / palmScale;
  const distToMiddleTip = dist3D(thumbTip, landmarks[12]) / palmScale;
  const distToIndexTip = dist3D(thumbTip, landmarks[8]) / palmScale;
  const thumbDistFromPalm = dist3D(thumbTip, landmarks[2]) / palmScale;

  // Thumb states:
  // - Extended/Abducted wide outward: far from index MCP and middle
  const thumbIsExtended = (distToIndexMcp >= 0.40 && distToMiddleTip >= 0.42 && thumbDistFromPalm >= 0.38);
  
  // - Across palm: tucked across the palm surface toward pinky MCP
  const thumbIsAcross = (distToPinkyMcp <= 0.68 && distToIndexMcp <= 0.48 && !thumbIsExtended);

  // - Along index edge (A fist): resting vertically along radial edge of index MCP/PIP
  const thumbIsAlongIndex = (distToIndexMcp <= 0.36 && distToPinkyMcp >= 0.55 && !thumbIsExtended);

  const thumb: ThumbBiometrics = {
    extensionRatio: thumbExtensionRatio,
    isExtended: thumbIsExtended,
    isAcross: thumbIsAcross,
    isAlongIndex: thumbIsAlongIndex,
    distToIndexMcp,
    distToPinkyMcp,
    distToMiddleTip,
    distToIndexTip
  };

  // 3. Inter-finger spread ratio (scale invariant)
  const dIndexMid = dist3D(landmarks[8], landmarks[12]);
  const dMidRing = dist3D(landmarks[12], landmarks[16]);
  const dRingPinky = dist3D(landmarks[16], landmarks[20]);
  const totalTipSpread = dIndexMid + dMidRing + dRingPinky;
  const spreadRatio = totalTipSpread / palmScale;

  // 4. Palm Orientation
  // frame.zAxis is the normal vector pointing OUT from the palm face
  const normalZ = frame.zAxis.z;
  const normalX = frame.zAxis.x;
  
  let palmFacing: 'camera' | 'inward' | 'side' = 'camera';
  if (normalZ < -0.22) {
    palmFacing = 'camera';
  } else if (normalZ > 0.22) {
    palmFacing = 'inward';
  } else {
    palmFacing = 'side';
  }

  const knuckleWidth = dist3D(landmarks[5], landmarks[17]);
  const palmAspect = knuckleWidth / palmScale;

  // 5. Canonical invariant features for ML classifier
  const canonicalFeatures = projectLandmarksToCanonical(landmarks, frame);

  return {
    handedness,
    frame,
    palmNormal: frame.zAxis,
    palmFacing,
    palmAspect,
    palmScale,
    spreadRatio,
    thumb,
    index,
    middle,
    ring,
    pinky,
    canonicalFeatures
  };
}
