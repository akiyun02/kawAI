import { Landmark3D, Vector3D } from '../../types';
import { dist3D, vectorSub, dot3D, cross3D, normalize3D, inferHandedness } from '../handKinematics';

export interface NormalizedFrameData {
  canonicalCoords: number[]; // 63 features (21 landmarks x 3 local axes / scale)
  kinematicFeatures: number[]; // 15 features (5 curls, 4 spreads, 6 proximities)
  allFeatures: number[]; // 78 combined features
  palmScale: number;
  palmNormal: Vector3D;
  handedness: 'Left' | 'Right';
  isUpright?: boolean;
  isHorizontal?: boolean;
  handAngleDeg?: number;
}

/**
 * Normalizes 21 3D MediaPipe landmarks into a rotation-, scale-, and translation-invariant
 * canonical hand coordinate frame.
 */
export function normalizeHandLandmarks(
  landmarks: Landmark3D[],
  providedHandedness?: 'Left' | 'Right'
): NormalizedFrameData {
  const handedness = providedHandedness || inferHandedness(landmarks);

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];
  const indexPip = landmarks[6];
  const indexTip = landmarks[8];
  const middleMcp = landmarks[9];
  const middlePip = landmarks[10];
  const middleTip = landmarks[12];
  const ringMcp = landmarks[13];
  const ringPip = landmarks[14];
  const ringTip = landmarks[16];
  const pinkyMcp = landmarks[17];
  const pinkyPip = landmarks[18];
  const pinkyTip = landmarks[20];

  // Palm scale: wrist to middle MCP
  const palmScale = dist3D(wrist, middleMcp) || 0.18;

  // 1. Canonical Coordinate Axes
  // Y-axis: wrist -> middle MCP (distal palm vector)
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

  // Z-axis: palm normal (X x Y)
  const zAxis = normalize3D(cross3D(xAxis, yAxis));

  // 2. Project 21 landmarks into canonical 63-D coordinate vector
  const canonicalCoords: number[] = [];
  for (let i = 0; i < 21; i++) {
    const rel = vectorSub(landmarks[i], wrist);
    canonicalCoords.push(dot3D(rel, xAxis) / palmScale);
    canonicalCoords.push(dot3D(rel, yAxis) / palmScale);
    canonicalCoords.push(dot3D(rel, zAxis) / palmScale);
  }

  // 3. Kinematic Features (15-D)
  function calcCurl(tip: Landmark3D, pip: Landmark3D, mcp: Landmark3D): number {
    const tipToWrist = dist3D(tip, wrist);
    const pipToWrist = dist3D(pip, wrist);
    const tipToMcp = dist3D(tip, mcp);
    const extRatio = (tipToWrist / (pipToWrist * 1.25 + 0.001)) * 0.6 + (tipToMcp / (palmScale * 0.85 + 0.001)) * 0.4;
    return Math.max(0, Math.min(1, (1.10 - extRatio) / 0.65));
  }

  const thumbCurl = Math.max(0, Math.min(1, (1.20 - dist3D(thumbTip, wrist) / palmScale) / 0.55));
  const indexCurl = calcCurl(indexTip, indexPip, indexMcp);
  const middleCurl = calcCurl(middleTip, middlePip, middleMcp);
  const ringCurl = calcCurl(ringTip, ringPip, ringMcp);
  const pinkyCurl = calcCurl(pinkyTip, pinkyPip, pinkyMcp);

  const spreadIndexMid = dist3D(indexTip, middleTip) / palmScale;
  const spreadMidRing = dist3D(middleTip, ringTip) / palmScale;
  const spreadRingPinky = dist3D(ringTip, pinkyTip) / palmScale;
  const spreadThumbIndex = dist3D(thumbTip, indexTip) / palmScale;

  const palmCenter = {
    x: (wrist.x + middleMcp.x) / 2,
    y: (wrist.y + middleMcp.y) / 2,
    z: ((wrist.z || 0) + (middleMcp.z || 0)) / 2
  };

  const proxIndexTip = dist3D(thumbTip, indexTip) / palmScale;
  const proxMiddleTip = dist3D(thumbTip, middleTip) / palmScale;
  const proxRingTip = dist3D(thumbTip, ringTip) / palmScale;
  const proxPinkyTip = dist3D(thumbTip, pinkyTip) / palmScale;
  const proxIndexPip = dist3D(thumbTip, indexPip) / palmScale;
  const proxPalmCenter = dist3D(thumbTip, palmCenter) / palmScale;

  const kinematicFeatures = [
    thumbCurl, indexCurl, middleCurl, ringCurl, pinkyCurl,
    spreadIndexMid, spreadMidRing, spreadRingPinky, spreadThumbIndex,
    proxIndexTip, proxMiddleTip, proxRingTip, proxPinkyTip, proxIndexPip, proxPalmCenter
  ];

  const allFeatures = [...canonicalCoords, ...kinematicFeatures];

  // Global orientation in camera/image frame (MediaPipe screen coordinates)
  const handDx = middleMcp.x - wrist.x;
  const handDy = middleMcp.y - wrist.y;
  // Angle from straight up (-Y axis) in degrees (-180 to +180)
  const handAngleDeg = (Math.atan2(handDx, -handDy) * 180) / Math.PI;
  const isUpright = Math.abs(handAngleDeg) <= 48;
  const isHorizontal = Math.abs(handAngleDeg) >= 55 && Math.abs(handAngleDeg) <= 125;

  return {
    canonicalCoords,
    kinematicFeatures,
    allFeatures,
    palmScale,
    palmNormal: zAxis,
    handedness,
    isUpright,
    isHorizontal,
    handAngleDeg
  };
}
