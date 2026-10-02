import { Landmark3D, Vector3D } from '../types';
import { 
  analyze3DFingerKinematics, 
  dist2D, 
  dist3D 
} from './handKinematics';

export interface StaticLetterScore {
  letter: string;
  score: number; // 0.0 to 1.0
  shapeScore: number;
  orientationScore: number;
  positionScore: number;
  feedback: string;
}

export interface StaticEvaluationResult {
  topLetter: string;
  topScore: number;
  secondLetter: string;
  secondScore: number;
  margin: number;
  isConfident: boolean;
  scores: Record<string, number>;
  bestMatch: StaticLetterScore;
}

// Smooth Continuous Scoring Helpers (No brittle cliff edges)
function smoothClamp(val: number, min: number, max: number): number {
  if (val <= min) return 0;
  if (val >= max) return 1;
  return (val - min) / (max - min);
}

function scoreCurl(ratio: number, lowThresh = 0.52, highThresh = 0.78): number {
  if (ratio <= lowThresh) return 1.0;
  if (ratio >= highThresh) return 0.0;
  return (highThresh - ratio) / (highThresh - lowThresh);
}

function scoreExtend(ratio: number, lowThresh = 0.55, highThresh = 0.78): number {
  if (ratio >= highThresh) return 1.0;
  if (ratio <= lowThresh) return 0.0;
  return (ratio - lowThresh) / (highThresh - lowThresh);
}

function scoreBetween(ratio: number, minVal: number, maxVal: number, margin = 0.18): number {
  if (ratio >= minVal && ratio <= maxVal) return 1.0;
  if (ratio < minVal - margin || ratio > maxVal + margin) return 0.0;
  if (ratio < minVal) return (ratio - (minVal - margin)) / margin;
  return ((maxVal + margin) - ratio) / margin;
}

/**
 * Robust, Continuous-Score ASL Fingerspelling Evaluator (A-Y, excluding dynamic J & Z)
 * Uses graded soft-threshold kinematics rather than binary gate cutoffs.
 */
export function evaluateStaticFingerspelling(
  landmarks: Landmark3D[],
  targetLetter?: string,
  handedness: 'Left' | 'Right' = 'Right'
): StaticEvaluationResult {
  const kinematics = analyze3DFingerKinematics(landmarks, handedness);
  const palmNormal = kinematics.palmNormal;
  const { thumb, index, middle, ring, pinky } = kinematics;

  const wrist = landmarks[0];
  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const pinkyMcp = landmarks[17];

  const palmHeight = dist3D(wrist, middleMcp) || 0.18;
  const palmWidth = dist3D(indexMcp, pinkyMcp) || 0.12;

  // Key relative distances
  const thumbTipToIndexTip = dist3D(landmarks[4], landmarks[8]) / palmHeight;
  const thumbTipToMiddleTip = dist3D(landmarks[4], landmarks[12]) / palmHeight;
  const thumbTipToIndexPip = dist3D(landmarks[4], landmarks[6]) / palmHeight;
  const thumbTipToIndexMcp = dist3D(landmarks[4], landmarks[5]) / palmHeight;
  const thumbTipToWrist = dist3D(landmarks[4], wrist) / palmHeight;

  // Inter-finger spread distances
  const indexToMiddleTipDist = dist3D(landmarks[8], landmarks[12]) / palmHeight;
  const middleToRingTipDist = dist3D(landmarks[12], landmarks[16]) / palmHeight;
  const ringToPinkyTipDist = dist3D(landmarks[16], landmarks[20]) / palmHeight;

  // Crossed finger metric for R: index tip vs middle tip X coordinate in hand frame
  const crossedIndexMiddle = Math.abs(landmarks[8].x - landmarks[12].x);

  // Hand orientation: tolerate natural wrist angles (+/- 25 deg tilt)
  const palmFacingCamera = palmNormal.z > 0.15;
  const palmFacingSide = Math.abs(palmNormal.x) > 0.35;
  const handPointingHorizontal = Math.abs(landmarks[8].x - wrist.x) > Math.abs(landmarks[8].y - wrist.y) * 0.75;
  const handPointingDown = (middleMcp.y - wrist.y) > 0.02;

  // Individual letter score evaluators
  const scores: Record<string, StaticLetterScore> = {};

  // ===================== LETTER A =====================
  // Fist, thumb rests upright along the lateral side of index finger
  {
    const curlScore = (
      scoreCurl(index.extensionRatio) +
      scoreCurl(middle.extensionRatio) +
      scoreCurl(ring.extensionRatio) +
      scoreCurl(pinky.extensionRatio)
    ) / 4;
    const thumbUpright = scoreExtend(thumb.extensionRatio, 0.48, 0.75);
    const thumbSide = 1.0 - smoothClamp(thumbTipToIndexPip, 0.25, 0.65);
    const shape = curlScore * 0.50 + thumbUpright * 0.30 + thumbSide * 0.20;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['A'] = {
      letter: 'A',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: shape < 0.6 ? 'Curl fingers into a fist with thumb straight against index' : 'Good A shape!',
    };
  }

  // ===================== LETTER B =====================
  // 4 fingers straight up pressed together, thumb folded across palm
  {
    const extScore = (
      scoreExtend(index.extensionRatio, 0.62, 0.82) +
      scoreExtend(middle.extensionRatio, 0.62, 0.82) +
      scoreExtend(ring.extensionRatio, 0.62, 0.82) +
      scoreExtend(pinky.extensionRatio, 0.62, 0.82)
    ) / 4;
    const maxSpread = Math.max(indexToMiddleTipDist, middleToRingTipDist, ringToPinkyTipDist);
    const togetherScore = 1.0 - smoothClamp(maxSpread, 0.20, 0.42);
    const thumbAcross = scoreCurl(thumb.extensionRatio, 0.55, 0.85);
    const shape = extScore * 0.50 + togetherScore * 0.30 + thumbAcross * 0.20;

    const orient = palmFacingCamera ? 0.95 : 0.70;
    const total = shape * 0.80 + orient * 0.20;
    scores['B'] = {
      letter: 'B',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: togetherScore > 0.5 ? 'Good B!' : 'Keep four fingers pressed close together',
    };
  }

  // ===================== LETTER C =====================
  // Curved open "C" arc, gap between thumb and fingertips
  {
    const curveScore = (
      scoreBetween(index.extensionRatio, 0.42, 0.85) +
      scoreBetween(middle.extensionRatio, 0.42, 0.85) +
      scoreBetween(ring.extensionRatio, 0.42, 0.85) +
      scoreBetween(pinky.extensionRatio, 0.40, 0.85)
    ) / 4;
    const gapScore = scoreBetween(thumbTipToIndexTip, 0.12, 0.80, 0.18);
    const shape = curveScore * 0.60 + gapScore * 0.40;

    const orient = (palmFacingCamera || palmFacingSide) ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['C'] = {
      letter: 'C',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: gapScore > 0.5 ? 'Good C arc!' : 'Maintain an open gap between thumb and fingertips',
    };
  }

  // ===================== LETTER D =====================
  // Index straight up, thumb touches middle/ring forming circle
  {
    const indexUp = scoreExtend(index.extensionRatio, 0.65, 0.85);
    const othersCurled = (
      scoreCurl(middle.extensionRatio) +
      scoreCurl(ring.extensionRatio) +
      scoreCurl(pinky.extensionRatio)
    ) / 3;
    const loopContact = 1.0 - smoothClamp(Math.min(thumbTipToMiddleTip, thumbTipToIndexPip), 0.20, 0.55);
    const shape = indexUp * 0.45 + othersCurled * 0.35 + loopContact * 0.20;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['D'] = {
      letter: 'D',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: indexUp > 0.6 ? 'Good D!' : 'Point index finger straight up, curl other fingers to thumb',
    };
  }

  // ===================== LETTER E =====================
  // All 4 fingers curled down tightly touching thumb tucked beneath
  {
    const allCurled = (
      scoreCurl(index.extensionRatio, 0.45, 0.72) +
      scoreCurl(middle.extensionRatio, 0.45, 0.72) +
      scoreCurl(ring.extensionRatio, 0.45, 0.72) +
      scoreCurl(pinky.extensionRatio, 0.45, 0.72)
    ) / 4;
    const thumbTucked = 1.0 - smoothClamp(thumbTipToMiddleTip, 0.20, 0.52);
    const shape = allCurled * 0.65 + thumbTucked * 0.35;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['E'] = {
      letter: 'E',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Curl all fingers tightly down onto thumb',
    };
  }

  // ===================== LETTER F =====================
  // Index and thumb touch in a ring; middle, ring, pinky extended straight up
  {
    const threeUp = (
      scoreExtend(middle.extensionRatio, 0.62, 0.82) +
      scoreExtend(ring.extensionRatio, 0.62, 0.82) +
      scoreExtend(pinky.extensionRatio, 0.62, 0.82)
    ) / 3;
    const contact = 1.0 - smoothClamp(thumbTipToIndexTip, 0.16, 0.44);
    const shape = threeUp * 0.55 + contact * 0.45;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['F'] = {
      letter: 'F',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Touch index tip to thumb tip, extend other three fingers tall',
    };
  }

  // ===================== LETTER G =====================
  // Index and thumb extended parallel pointing sideways
  {
    const indexExt = scoreExtend(index.extensionRatio, 0.58, 0.80);
    const othersCurled = (
      scoreCurl(middle.extensionRatio) +
      scoreCurl(ring.extensionRatio) +
      scoreCurl(pinky.extensionRatio)
    ) / 3;
    const thumbExt = scoreExtend(thumb.extensionRatio, 0.52, 0.78);
    const shape = indexExt * 0.45 + othersCurled * 0.35 + thumbExt * 0.20;

    const orient = (palmFacingSide || handPointingHorizontal) ? 0.95 : 0.70;
    const total = shape * 0.75 + orient * 0.25;
    scores['G'] = {
      letter: 'G',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Point index and thumb horizontally across chest',
    };
  }

  // ===================== LETTER H =====================
  // Index and middle extended together horizontally pointing sideways
  {
    const twoExt = (scoreExtend(index.extensionRatio, 0.60, 0.82) + scoreExtend(middle.extensionRatio, 0.60, 0.82)) / 2;
    const othersCurled = (scoreCurl(ring.extensionRatio) + scoreCurl(pinky.extensionRatio)) / 2;
    const together = 1.0 - smoothClamp(indexToMiddleTipDist, 0.16, 0.38);
    const shape = twoExt * 0.50 + othersCurled * 0.30 + together * 0.20;

    const orient = (palmFacingSide || handPointingHorizontal) ? 0.95 : 0.70;
    const total = shape * 0.75 + orient * 0.25;
    scores['H'] = {
      letter: 'H',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Extend index and middle horizontally together',
    };
  }

  // ===================== LETTER I =====================
  // Pinky extended straight up, other three fingers curled
  {
    const pinkyUp = scoreExtend(pinky.extensionRatio, 0.65, 0.85);
    const othersCurled = (
      scoreCurl(index.extensionRatio) +
      scoreCurl(middle.extensionRatio) +
      scoreCurl(ring.extensionRatio)
    ) / 3;
    const shape = pinkyUp * 0.60 + othersCurled * 0.40;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['I'] = {
      letter: 'I',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Extend only pinky finger straight up',
    };
  }

  // ===================== LETTER K =====================
  // Index upright, middle forward/up at angle, thumb resting on middle knuckle
  {
    const indexUp = scoreExtend(index.extensionRatio, 0.65, 0.85);
    const middleExt = scoreExtend(middle.extensionRatio, 0.55, 0.80);
    const othersCurled = (scoreCurl(ring.extensionRatio) + scoreCurl(pinky.extensionRatio)) / 2;
    const thumbNearMiddle = 1.0 - smoothClamp(thumbTipToMiddleTip, 0.25, 0.60);
    const shape = indexUp * 0.40 + middleExt * 0.30 + othersCurled * 0.20 + thumbNearMiddle * 0.10;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['K'] = {
      letter: 'K',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Index up, middle forward at angle, thumb on middle knuckle',
    };
  }

  // ===================== LETTER L =====================
  // Index up, thumb extended horizontally at ~90 deg, middle/ring/pinky curled
  {
    const indexUp = scoreExtend(index.extensionRatio, 0.65, 0.85);
    const thumbAbducted = scoreExtend(thumb.extensionRatio, 0.55, 0.82) * smoothClamp(thumbTipToIndexTip, 0.30, 0.55);
    const othersCurled = (
      scoreCurl(middle.extensionRatio) +
      scoreCurl(ring.extensionRatio) +
      scoreCurl(pinky.extensionRatio)
    ) / 3;
    const shape = indexUp * 0.45 + thumbAbducted * 0.35 + othersCurled * 0.20;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['L'] = {
      letter: 'L',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Index up and thumb extended forming an L',
    };
  }

  // ===================== LETTER M =====================
  // 3 fingers folded over thumb
  {
    const allCurled = (
      scoreCurl(index.extensionRatio) +
      scoreCurl(middle.extensionRatio) +
      scoreCurl(ring.extensionRatio) +
      scoreCurl(pinky.extensionRatio)
    ) / 4;
    const thumbPosition = 1.0 - smoothClamp(thumbTipToPinky(landmarks, palmHeight), 0.25, 0.55);
    const shape = allCurled * 0.60 + thumbPosition * 0.40;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['M'] = {
      letter: 'M',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Tuck thumb under index, middle, and ring fingers',
    };
  }

  // ===================== LETTER N =====================
  // 2 fingers folded over thumb
  {
    const allCurled = (
      scoreCurl(index.extensionRatio) +
      scoreCurl(middle.extensionRatio) +
      scoreCurl(ring.extensionRatio) +
      scoreCurl(pinky.extensionRatio)
    ) / 4;
    const thumbPosition = 1.0 - smoothClamp(thumbTipToRing(landmarks, palmHeight), 0.25, 0.55);
    const shape = allCurled * 0.60 + thumbPosition * 0.40;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['N'] = {
      letter: 'N',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Tuck thumb under index and middle fingers',
    };
  }

  // ===================== LETTER O =====================
  // Circular O contact between thumb and fingertips
  {
    const circularContact = 1.0 - smoothClamp(Math.min(thumbTipToIndexTip, thumbTipToMiddleTip), 0.18, 0.45);
    const fingersArched = (scoreBetween(index.extensionRatio, 0.35, 0.80) + scoreBetween(middle.extensionRatio, 0.35, 0.80)) / 2;
    const shape = circularContact * 0.55 + fingersArched * 0.45;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['O'] = {
      letter: 'O',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Touch thumb tip to all fingertips forming a round O',
    };
  }

  // ===================== LETTER P =====================
  // K handshape pointing downward
  {
    const indexExt = scoreExtend(index.extensionRatio, 0.60, 0.82);
    const middleExt = scoreExtend(middle.extensionRatio, 0.55, 0.80);
    const othersCurled = (scoreCurl(ring.extensionRatio) + scoreCurl(pinky.extensionRatio)) / 2;
    const downward = handPointingDown ? 0.95 : 0.65;
    const shape = indexExt * 0.40 + middleExt * 0.35 + othersCurled * 0.25;

    const total = shape * 0.75 + downward * 0.25;
    scores['P'] = {
      letter: 'P',
      score: total,
      shapeScore: shape,
      orientationScore: downward,
      positionScore: 0.90,
      feedback: 'Form K handshape and point hand downwards toward floor',
    };
  }

  // ===================== LETTER Q =====================
  // G handshape pointing downward
  {
    const indexExt = scoreExtend(index.extensionRatio, 0.58, 0.80);
    const thumbExt = scoreExtend(thumb.extensionRatio, 0.52, 0.78);
    const othersCurled = (
      scoreCurl(middle.extensionRatio) +
      scoreCurl(ring.extensionRatio) +
      scoreCurl(pinky.extensionRatio)
    ) / 3;
    const downward = handPointingDown ? 0.95 : 0.65;
    const shape = indexExt * 0.45 + thumbExt * 0.30 + othersCurled * 0.25;

    const total = shape * 0.75 + downward * 0.25;
    scores['Q'] = {
      letter: 'Q',
      score: total,
      shapeScore: shape,
      orientationScore: downward,
      positionScore: 0.90,
      feedback: 'Point index and thumb downward toward floor',
    };
  }

  // ===================== LETTER R =====================
  // Index and middle upright and crossed over each other
  {
    const twoExt = (scoreExtend(index.extensionRatio, 0.65, 0.85) + scoreExtend(middle.extensionRatio, 0.65, 0.85)) / 2;
    const othersCurled = (scoreCurl(ring.extensionRatio) + scoreCurl(pinky.extensionRatio)) / 2;
    const crossedOverlap = 1.0 - smoothClamp(crossedIndexMiddle, 0.08, 0.28);
    const shape = twoExt * 0.45 + othersCurled * 0.30 + crossedOverlap * 0.25;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['R'] = {
      letter: 'R',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Cross middle finger over the front of index finger',
    };
  }

  // ===================== LETTER S =====================
  // Tight fist with thumb folded ACROSS front of all fingers
  {
    const allCurled = (
      scoreCurl(index.extensionRatio) +
      scoreCurl(middle.extensionRatio) +
      scoreCurl(ring.extensionRatio) +
      scoreCurl(pinky.extensionRatio)
    ) / 4;
    const thumbAcross = 1.0 - smoothClamp(thumbTipToMiddleTip, 0.20, 0.52);
    const shape = allCurled * 0.60 + thumbAcross * 0.40;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['S'] = {
      letter: 'S',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Make a fist with thumb wrapped across front of fingers',
    };
  }

  // ===================== LETTER T =====================
  // Thumb between index and middle fingers
  {
    const allCurled = (
      scoreCurl(index.extensionRatio) +
      scoreCurl(middle.extensionRatio) +
      scoreCurl(ring.extensionRatio) +
      scoreCurl(pinky.extensionRatio)
    ) / 4;
    const thumbBetween = 1.0 - smoothClamp(thumbTipToIndexPip, 0.18, 0.48);
    const shape = allCurled * 0.60 + thumbBetween * 0.40;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['T'] = {
      letter: 'T',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Tuck thumb between index and middle knuckles',
    };
  }

  // ===================== LETTER U =====================
  // Index and middle extended upright and pressed together side-by-side
  {
    const twoExt = (scoreExtend(index.extensionRatio, 0.65, 0.85) + scoreExtend(middle.extensionRatio, 0.65, 0.85)) / 2;
    const othersCurled = (scoreCurl(ring.extensionRatio) + scoreCurl(pinky.extensionRatio)) / 2;
    const pressedTogether = 1.0 - smoothClamp(indexToMiddleTipDist, 0.16, 0.36);
    const shape = twoExt * 0.50 + othersCurled * 0.30 + pressedTogether * 0.20;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['U'] = {
      letter: 'U',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Extend index and middle straight up pressed tightly together',
    };
  }

  // ===================== LETTER V =====================
  // Index and middle extended upright and spread apart in a "V"
  {
    const twoExt = (scoreExtend(index.extensionRatio, 0.65, 0.85) + scoreExtend(middle.extensionRatio, 0.65, 0.85)) / 2;
    const othersCurled = (scoreCurl(ring.extensionRatio) + scoreCurl(pinky.extensionRatio)) / 2;
    const spreadV = smoothClamp(indexToMiddleTipDist, 0.22, 0.40);
    const shape = twoExt * 0.50 + othersCurled * 0.30 + spreadV * 0.20;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['V'] = {
      letter: 'V',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Separate index and middle into a clean V shape',
    };
  }

  // ===================== LETTER W =====================
  // Index, middle, and ring extended upright and spread; pinky curled with thumb
  {
    const threeUp = (
      scoreExtend(index.extensionRatio, 0.62, 0.82) +
      scoreExtend(middle.extensionRatio, 0.62, 0.82) +
      scoreExtend(ring.extensionRatio, 0.62, 0.82)
    ) / 3;
    const pinkyCurled = scoreCurl(pinky.extensionRatio, 0.48, 0.76);
    const minSpread = Math.min(indexToMiddleTipDist, middleToRingTipDist);
    const spreadFingers = smoothClamp(minSpread, 0.16, 0.34);
    const shape = threeUp * 0.50 + pinkyCurled * 0.30 + spreadFingers * 0.20;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['W'] = {
      letter: 'W',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Extend index, middle, and ring fingers spread evenly',
    };
  }

  // ===================== LETTER X =====================
  // Index finger bent into a hook (~90 deg PIP bend), others curled
  {
    const indexHooked = scoreBetween(index.extensionRatio, 0.38, 0.78) * smoothClamp(index.pipAngleDeg, 35, 75);
    const othersCurled = (
      scoreCurl(middle.extensionRatio) +
      scoreCurl(ring.extensionRatio) +
      scoreCurl(pinky.extensionRatio)
    ) / 3;
    const shape = indexHooked * 0.60 + othersCurled * 0.40;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['X'] = {
      letter: 'X',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Bend index finger into a hook like letter X',
    };
  }

  // ===================== LETTER Y =====================
  // Thumb and pinky extended, middle 3 curled
  {
    const thumbPinkyExt = (
      scoreExtend(thumb.extensionRatio, 0.62, 0.85) +
      scoreExtend(pinky.extensionRatio, 0.62, 0.85)
    ) / 2;
    const middleThreeCurled = (
      scoreCurl(index.extensionRatio) +
      scoreCurl(middle.extensionRatio) +
      scoreCurl(ring.extensionRatio)
    ) / 3;
    const shape = thumbPinkyExt * 0.60 + middleThreeCurled * 0.40;

    const orient = palmFacingCamera ? 0.95 : 0.75;
    const total = shape * 0.80 + orient * 0.20;
    scores['Y'] = {
      letter: 'Y',
      score: total,
      shapeScore: shape,
      orientationScore: orient,
      positionScore: 0.90,
      feedback: 'Extend thumb and pinky outward, curl middle three',
    };
  }

  // Compile raw score table
  const rawScores: Record<string, number> = {};
  for (const [k, v] of Object.entries(scores)) {
    rawScores[k] = Number(v.score.toFixed(3));
  }

  // Target-Aware Mode: Soft evaluation for student learning
  if (targetLetter && scores[targetLetter]) {
    const targetMatch = scores[targetLetter];
    
    // Check if an incompatible sign has decisively higher evidence
    let maxOtherScore = 0;
    let competingSign = '';
    for (const [k, v] of Object.entries(scores)) {
      if (k !== targetLetter && v.score > maxOtherScore) {
        maxOtherScore = v.score;
        competingSign = k;
      }
    }

    // In target-aware mode, accept target if evidence is reasonably solid (>= 0.50)
    // and no clearly different gesture is dominating (> target + 0.22)
    const isOverridden = maxOtherScore > (targetMatch.score + 0.22);
    const isConfident = targetMatch.score >= 0.50 && !isOverridden;

    return {
      topLetter: isConfident ? targetLetter : 'UNKNOWN',
      topScore: targetMatch.score,
      secondLetter: isOverridden ? competingSign : 'UNKNOWN',
      secondScore: maxOtherScore,
      margin: Math.max(0, targetMatch.score - maxOtherScore),
      isConfident,
      scores: rawScores,
      bestMatch: targetMatch,
    };
  }

  // Open Recognition Mode: Find top 2 candidate letters
  const sorted = Object.values(scores).sort((a, b) => b.score - a.score);
  const best = sorted[0] || { letter: 'UNKNOWN', score: 0 };
  const second = sorted[1] || { letter: 'UNKNOWN', score: 0 };

  const margin = Math.max(0, best.score - second.score);
  // Relaxed Open Calibration: Top1 >= 0.54 AND margin >= 0.07
  const isConfident = best.score >= 0.54 && margin >= 0.07;

  return {
    topLetter: isConfident ? best.letter : 'UNKNOWN',
    topScore: best.score,
    secondLetter: second.letter,
    secondScore: second.score,
    margin,
    isConfident,
    scores: rawScores,
    bestMatch: best,
  };
}

// Helpers for specific finger proximity
function thumbTipToPinky(landmarks: Landmark3D[], palmHeight: number): number {
  return dist3D(landmarks[4], landmarks[17]) / palmHeight;
}

function thumbTipToRing(landmarks: Landmark3D[], palmHeight: number): number {
  return dist3D(landmarks[4], landmarks[13]) / palmHeight;
}
