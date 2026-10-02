import { Landmark3D, QualityGateResult } from '../types';

export interface GuideBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

// Broad, generous signing zone covering nearly the entire camera viewport
export const DEFAULT_GUIDE_BOX: GuideBox = {
  xMin: 0.04,
  yMin: 0.04,
  xMax: 0.96,
  yMax: 0.96,
};

// Tracks recent landmark history to detect sudden tracking loss
let previousLandmarks: Landmark3D[] | null = null;
let lastTimestamp = 0;

export function resetQualityGateHistory() {
  previousLandmarks = null;
  lastTimestamp = 0;
}

/**
 * Robust, Forgiving Hand Quality Gate
 * Philosophy: Accept natural human signing across the screen; only reject true non-detections
 * or hands cut off at the camera border.
 */
export function evaluateHandQualityGate(
  landmarks: Landmark3D[] | undefined | null,
  _guideBox: GuideBox = DEFAULT_GUIDE_BOX
): QualityGateResult {
  // 1. Check hand presence & completeness
  if (!landmarks || landmarks.length < 21) {
    previousLandmarks = null;
    return {
      isUsable: false,
      reason: 'NO_HAND',
      message: 'Show your hand to begin',
    };
  }

  // 2. Compute hand bounding box
  let xMin = 1.0;
  let xMax = 0.0;
  let yMin = 1.0;
  let yMax = 0.0;

  for (let i = 0; i < 21; i++) {
    const lm = landmarks[i];
    if (lm.x < xMin) xMin = lm.x;
    if (lm.x > xMax) xMax = lm.x;
    if (lm.y < yMin) yMin = lm.y;
    if (lm.y > yMax) yMax = lm.y;
  }

  const width = Math.max(0.01, xMax - xMin);
  const height = Math.max(0.01, yMax - yMin);
  const boundingBox = { xMin, yMin, xMax, yMax, width, height };

  // 3. Compute palm scale (Wrist [0] to Middle MCP [9])
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const palmDist = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y);

  // 4. Forgiving Hand Size Validation
  // MediaPipe landmarks are normalized anyway; only reject extreme vanishing or extreme lens jamming
  if (palmDist < 0.04 || width < 0.05 || height < 0.05) {
    return {
      isUsable: false,
      reason: 'TOO_SMALL',
      message: 'Move hand closer to camera',
      boundingBox,
    };
  }

  if (palmDist > 0.88 || width > 0.98 || height > 0.98) {
    return {
      isUsable: false,
      reason: 'TOO_LARGE',
      message: 'Move hand back slightly',
      boundingBox,
    };
  }

  // 5. Border Boundary Check: Only reject if the hand is actively cut off outside the frame
  if (xMin < 0.01 || xMax > 0.99 || yMin < 0.01 || yMax > 0.99) {
    return {
      isUsable: false,
      reason: 'OUT_OF_BOUNDS',
      message: 'Keep hand inside view',
      boundingBox,
    };
  }

  // 6. Tracking Continuity Check
  // Natural movement, small tremor, and signing transitions are completely normal.
  // Only trip if landmarks teleport wildly across the screen (loss of tracking)
  const now = performance.now();
  if (previousLandmarks && previousLandmarks.length === 21 && (now - lastTimestamp) < 250) {
    let totalDelta = 0;
    for (let i = 0; i < 21; i++) {
      const dx = landmarks[i].x - previousLandmarks[i].x;
      const dy = landmarks[i].y - previousLandmarks[i].y;
      totalDelta += Math.hypot(dx, dy);
    }
    const avgDelta = totalDelta / 21;

    // Only flag genuine tracking glitch (teleport > 0.55 of screen width in a fraction of a second)
    if (avgDelta > 0.55) {
      previousLandmarks = landmarks;
      lastTimestamp = now;
      return {
        isUsable: false,
        reason: 'UNSTABLE',
        message: 'Re-centering tracking...',
        boundingBox,
      };
    }
  }

  previousLandmarks = landmarks;
  lastTimestamp = now;

  return {
    isUsable: true,
    reason: 'OK',
    message: 'Hand visible',
    boundingBox,
  };
}
