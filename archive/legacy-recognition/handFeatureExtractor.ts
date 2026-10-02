import { Landmark3D, Vector3D } from '../types';
import { 
  dist3D, 
  vectorSub, 
  dot3D, 
  cross3D, 
  normalize3D, 
  angleBetweenDeg,
  inferHandedness
} from './handKinematics';

export type HandMotionState = 'STABLE' | 'FORMING' | 'TRANSITIONING' | 'RELEASING';

export interface HandPoseFeatures {
  handedness: 'Left' | 'Right';
  palmScale: number;
  boundingBox: { xMin: number; yMin: number; xMax: number; yMax: number; width: number; height: number };
  
  // Continuous curl ratios: 0.0 (fully extended) to 1.0 (fully curled into palm)
  curls: {
    thumb: number;
    index: number;
    middle: number;
    ring: number;
    pinky: number;
  };

  // PIP Joint flexion angles (degrees: ~0 deg extended, ~100+ deg curled)
  pipAngles: {
    thumb: number;
    index: number;
    middle: number;
    ring: number;
    pinky: number;
  };

  // Normalized inter-finger spreads (distance / palmScale)
  spreads: {
    indexToMiddle: number;
    middleToRing: number;
    ringToPinky: number;
    thumbToIndex: number;
  };

  // Thumb tip proximity to other finger landmarks (normalized by palmScale)
  thumbTouches: {
    toIndexTip: number;
    toMiddleTip: number;
    toRingTip: number;
    toPinkyTip: number;
    toIndexPip: number;
    toPalmCenter: number;
    toIndexMcp: number;
  };

  // Overlap metric for crossed fingers (R)
  indexMiddleXOverlap: number;

  // 3D Palm Orientation
  palmNormal: Vector3D;
  palmFacingCamera: boolean;
  palmFacingSide: boolean;
  handPointingDown: boolean;
  handPointingHorizontal: boolean;

  // Dynamic Hand Kinematics
  handVelocity: number; // Landmark displacement per ms
  motionState: HandMotionState;
  
  // 63-element invariant coordinate vector
  canonicalCoordinates: number[];
}

// History tracking for velocity and motion state
let lastLandmarks: Landmark3D[] | null = null;
let lastTimestamp = 0;
let smoothVelocity = 0;

export function resetFeatureExtractorHistory() {
  lastLandmarks = null;
  lastTimestamp = 0;
  smoothVelocity = 0;
}

/**
 * Extracts rich, scale- and rotation-invariant geometric features from 21 MediaPipe landmarks.
 */
export function extractHandPoseFeatures(
  landmarks: Landmark3D[],
  providedHandedness?: 'Left' | 'Right',
  timestamp: number = performance.now()
): HandPoseFeatures {
  const handedness = providedHandedness || inferHandedness(landmarks);

  // 1. Hand scale & canonical axes
  const wrist = landmarks[0];
  const thumbCmc = landmarks[1];
  const thumbMcp = landmarks[2];
  const thumbIp = landmarks[3];
  const thumbTip = landmarks[4];

  const indexMcp = landmarks[5];
  const indexPip = landmarks[6];
  const indexDip = landmarks[7];
  const indexTip = landmarks[8];

  const middleMcp = landmarks[9];
  const middlePip = landmarks[10];
  const middleDip = landmarks[11];
  const middleTip = landmarks[12];

  const ringMcp = landmarks[13];
  const ringPip = landmarks[14];
  const ringDip = landmarks[15];
  const ringTip = landmarks[16];

  const pinkyMcp = landmarks[17];
  const pinkyPip = landmarks[18];
  const pinkyDip = landmarks[19];
  const pinkyTip = landmarks[20];

  // Palm scale: wrist to middle MCP
  const palmScale = dist3D(wrist, middleMcp) || 0.18;

  // Bounding box
  let xMin = 1, xMax = 0, yMin = 1, yMax = 0;
  for (let i = 0; i < 21; i++) {
    const lm = landmarks[i];
    if (lm.x < xMin) xMin = lm.x;
    if (lm.x > xMax) xMax = lm.x;
    if (lm.y < yMin) yMin = lm.y;
    if (lm.y > yMax) yMax = lm.y;
  }
  const boundingBox = {
    xMin, yMin, xMax, yMax,
    width: Math.max(0.01, xMax - xMin),
    height: Math.max(0.01, yMax - yMin)
  };

  // 2. Canonical Coordinate System
  // Y-axis = wrist -> middle MCP
  const yAxisRaw = vectorSub(middleMcp, wrist);
  const yAxis = normalize3D(yAxisRaw);

  // Knuckle transverse vector
  const knuckleRaw = handedness === 'Left'
    ? vectorSub(pinkyMcp, indexMcp)
    : vectorSub(indexMcp, pinkyMcp);

  const proj = dot3D(knuckleRaw, yAxis);
  const xAxisRaw = {
    x: knuckleRaw.x - proj * yAxis.x,
    y: knuckleRaw.y - proj * yAxis.y,
    z: knuckleRaw.z - proj * yAxis.z
  };
  const xAxis = normalize3D(xAxisRaw);

  // Normal Z-axis
  const zAxis = normalize3D(cross3D(xAxis, yAxis));

  // 63 canonical features
  const canonicalCoordinates: number[] = [];
  for (let i = 0; i < 21; i++) {
    const rel = vectorSub(landmarks[i], wrist);
    canonicalCoordinates.push(dot3D(rel, xAxis) / palmScale);
    canonicalCoordinates.push(dot3D(rel, yAxis) / palmScale);
    canonicalCoordinates.push(dot3D(rel, zAxis) / palmScale);
  }

  // 3. Continuous Curl Calculation (0.0 = straight extended, 1.0 = curled into fist)
  // Ratio between tip-to-wrist vs PIP-to-wrist and tip-to-MCP
  function calcFingerCurl(tip: Landmark3D, pip: Landmark3D, mcp: Landmark3D): number {
    const tipToWrist = dist3D(tip, wrist);
    const pipToWrist = dist3D(pip, wrist);
    const tipToMcp = dist3D(tip, mcp);
    
    // When extended: tipToWrist > pipToWrist * 1.18 and tipToMcp > palmScale * 0.70
    // When curled: tipToWrist < pipToWrist * 0.95 and tipToMcp < palmScale * 0.35
    const extRatio = (tipToWrist / (pipToWrist * 1.25 + 0.001)) * 0.6 + (tipToMcp / (palmScale * 0.85 + 0.001)) * 0.4;
    // Invert: 0.0 = extended, 1.0 = curled
    return Math.max(0, Math.min(1, (1.10 - extRatio) / 0.65));
  }

  // Thumb curl: distance to pinky MCP and palm center
  const thumbDistToPinky = dist3D(thumbTip, pinkyMcp) / palmScale;
  const thumbDistToWrist = dist3D(thumbTip, wrist) / palmScale;
  const thumbCurl = Math.max(0, Math.min(1, (1.20 - thumbDistToWrist) / 0.55));

  const curls = {
    thumb: thumbCurl,
    index: calcFingerCurl(indexTip, indexPip, indexMcp),
    middle: calcFingerCurl(middleTip, middlePip, middleMcp),
    ring: calcFingerCurl(ringTip, ringPip, ringMcp),
    pinky: calcFingerCurl(pinkyTip, pinkyPip, pinkyMcp),
  };

  // 4. PIP Angles
  const pipAngles = {
    thumb: angleBetweenDeg(vectorSub(thumbTip, thumbIp), vectorSub(thumbIp, thumbMcp)),
    index: angleBetweenDeg(vectorSub(indexTip, indexPip), vectorSub(indexPip, indexMcp)),
    middle: angleBetweenDeg(vectorSub(middleTip, middlePip), vectorSub(middlePip, middleMcp)),
    ring: angleBetweenDeg(vectorSub(ringTip, ringPip), vectorSub(ringPip, ringMcp)),
    pinky: angleBetweenDeg(vectorSub(pinkyTip, pinkyPip), vectorSub(pinkyPip, pinkyMcp)),
  };

  // 5. Inter-Finger Spreads
  const spreads = {
    indexToMiddle: dist3D(indexTip, middleTip) / palmScale,
    middleToRing: dist3D(middleTip, ringTip) / palmScale,
    ringToPinky: dist3D(ringTip, pinkyTip) / palmScale,
    thumbToIndex: dist3D(thumbTip, indexTip) / palmScale,
  };

  // 6. Thumb Proximities
  const palmCenter = {
    x: (wrist.x + middleMcp.x) / 2,
    y: (wrist.y + middleMcp.y) / 2,
    z: ((wrist.z || 0) + (middleMcp.z || 0)) / 2
  };

  const thumbTouches = {
    toIndexTip: dist3D(thumbTip, indexTip) / palmScale,
    toMiddleTip: dist3D(thumbTip, middleTip) / palmScale,
    toRingTip: dist3D(thumbTip, ringTip) / palmScale,
    toPinkyTip: dist3D(thumbTip, pinkyTip) / palmScale,
    toIndexPip: dist3D(thumbTip, indexPip) / palmScale,
    toPalmCenter: dist3D(thumbTip, palmCenter) / palmScale,
    toIndexMcp: dist3D(thumbTip, indexMcp) / palmScale,
  };

  // 7. Crossed fingers metric for R: index tip vs middle tip X coordinate in hand frame
  const indexRelX = dot3D(vectorSub(indexTip, wrist), xAxis) / palmScale;
  const middleRelX = dot3D(vectorSub(middleTip, wrist), xAxis) / palmScale;
  const indexMiddleXOverlap = Math.abs(indexRelX - middleRelX);

  // 8. Palm Orientation
  const palmNormal = zAxis;
  const palmFacingCamera = palmNormal.z > 0.15;
  const palmFacingSide = Math.abs(palmNormal.x) > 0.35;
  const handPointingDown = (middleMcp.y - wrist.y) > 0.02;
  const handPointingHorizontal = Math.abs(indexTip.x - wrist.x) > Math.abs(indexTip.y - wrist.y) * 0.75;

  // 9. Hand Velocity & Dynamic Motion State
  let handVelocity = 0;
  if (lastLandmarks && lastLandmarks.length === 21 && lastTimestamp > 0) {
    const dt = Math.max(1, timestamp - lastTimestamp);
    let totalDisp = 0;
    for (let i = 0; i < 21; i++) {
      totalDisp += dist3D(landmarks[i], lastLandmarks[i]);
    }
    const currentVelocity = (totalDisp / 21) / dt;
    // Exponential smoothing
    smoothVelocity = smoothVelocity * 0.7 + currentVelocity * 0.3;
    handVelocity = smoothVelocity;
  }

  lastLandmarks = landmarks;
  lastTimestamp = timestamp;

  // Classify motion state
  let motionState: HandMotionState = 'STABLE';
  if (handVelocity > 0.0022) {
    motionState = 'TRANSITIONING';
  } else if (handVelocity > 0.0009) {
    motionState = 'FORMING';
  } else {
    motionState = 'STABLE';
  }

  return {
    handedness,
    palmScale,
    boundingBox,
    curls,
    pipAngles,
    spreads,
    thumbTouches,
    indexMiddleXOverlap,
    palmNormal,
    palmFacingCamera,
    palmFacingSide,
    handPointingDown,
    handPointingHorizontal,
    handVelocity,
    motionState,
    canonicalCoordinates,
  };
}
