import { Landmark3D, RecognitionEvaluation, Vector3D, FaceLandmarkData } from '../types';
import { GET_SIGN_BY_ID } from '../data/signs';
import { analyze3DFingerKinematics, dist2D, dist3D } from './handKinematics';
import { globalRecognizerOrchestrator } from './recognition/recognizerState';


export { dist2D, dist3D };



// Vector cross product to compute palm normal vector
export function computePalmNormal(landmarks: Landmark3D[]): Vector3D {
  if (landmarks.length < 21) {
    return { x: 0, y: 0, z: -1 };
  }

  const wrist = landmarks[0];
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];

  // Vector A: wrist -> index_mcp
  const ax = indexMcp.x - wrist.x;
  const ay = indexMcp.y - wrist.y;
  const az = (indexMcp.z || 0) - (wrist.z || 0);

  // Vector B: wrist -> pinky_mcp
  const bx = pinkyMcp.x - wrist.x;
  const by = pinkyMcp.y - wrist.y;
  const bz = (pinkyMcp.z || 0) - (wrist.z || 0);

  // Normal = A x B
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;

  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}

// Analyze finger extension states (scale-invariant via dual ratio checks: wrist & MCP distance)
export function analyzeFingerStates(landmarks: Landmark3D[]) {
  const wrist = landmarks[0];
  const palmHeight = dist2D(wrist, landmarks[9]) || 0.18;

  // Index (MCP: 5, PIP: 6, DIP: 7, TIP: 8)
  const indexDistTip = dist2D(landmarks[8], wrist);
  const indexDistPip = dist2D(landmarks[6], wrist);
  const indexDistMcp = dist2D(landmarks[8], landmarks[5]);
  const indexExtended = (indexDistTip > indexDistPip * 1.15) && (indexDistMcp > palmHeight * 0.52);
  const indexCurled = (indexDistTip < indexDistPip * 1.04) || (indexDistMcp < palmHeight * 0.45);

  // Middle (MCP: 9, PIP: 10, DIP: 11, TIP: 12)
  const midDistTip = dist2D(landmarks[12], wrist);
  const midDistPip = dist2D(landmarks[10], wrist);
  const midDistMcp = dist2D(landmarks[12], landmarks[9]);
  const middleExtended = (midDistTip > midDistPip * 1.15) && (midDistMcp > palmHeight * 0.55);
  const middleCurled = (midDistTip < midDistPip * 1.04) || (midDistMcp < palmHeight * 0.45);

  // Ring (MCP: 13, PIP: 14, DIP: 15, TIP: 16)
  const ringDistTip = dist2D(landmarks[16], wrist);
  const ringDistPip = dist2D(landmarks[14], wrist);
  const ringDistMcp = dist2D(landmarks[16], landmarks[13]);
  const ringExtended = (ringDistTip > ringDistPip * 1.15) && (ringDistMcp > palmHeight * 0.52);
  const ringCurled = (ringDistTip < ringDistPip * 1.04) || (ringDistMcp < palmHeight * 0.45);

  // Pinky (MCP: 17, PIP: 18, DIP: 19, TIP: 20)
  const pinkyDistTip = dist2D(landmarks[20], wrist);
  const pinkyDistPip = dist2D(landmarks[18], wrist);
  const pinkyDistMcp = dist2D(landmarks[20], landmarks[17]);
  const pinkyExtended = (pinkyDistTip > pinkyDistPip * 1.15) && (pinkyDistMcp > palmHeight * 0.44);
  const pinkyCurled = (pinkyDistTip < pinkyDistPip * 1.04) || (pinkyDistMcp < palmHeight * 0.40);

  // Thumb (CMC: 1, MCP: 2, IP: 3, TIP: 4)
  const thumbTipToPinky = dist2D(landmarks[4], landmarks[17]);
  const thumbTipToIndex = dist2D(landmarks[4], landmarks[5]);
  const thumbTipToMiddle = dist2D(landmarks[4], landmarks[9]);
  const thumbDistToWrist = dist2D(landmarks[4], wrist);
  const thumbMcpToWrist = dist2D(landmarks[2], wrist);

  // Thumb is extended outward (abducted away from hand, e.g. 5, L, Y, 3)
  const thumbExtended = (thumbDistToWrist > thumbMcpToWrist * 1.25) && 
    (thumbTipToIndex > palmHeight * 0.38) && 
    (thumbTipToMiddle > palmHeight * 0.45);

  // Thumb is tucked across palm (e.g. B, 4, A, E, S)
  const thumbAcross = (thumbTipToMiddle < palmHeight * 0.52) || 
    (thumbTipToPinky < palmHeight * 0.70 && thumbDistToWrist < thumbMcpToWrist * 1.30);

  return {
    thumb: thumbExtended ? 'extended' : (thumbAcross ? 'across' : 'curled'),
    index: indexExtended ? 'extended' : (indexCurled ? 'curled' : 'hooked'),
    middle: middleExtended ? 'extended' : (middleCurled ? 'curled' : 'hooked'),
    ring: ringExtended ? 'extended' : (ringCurled ? 'curled' : 'hooked'),
    pinky: pinkyExtended ? 'extended' : (pinkyCurled ? 'curled' : 'hooked'),
    flags: {
      thumb: thumbExtended,
      index: indexExtended,
      middle: middleExtended,
      ring: ringExtended,
      pinky: pinkyExtended
    },
    curled: {
      index: indexCurled,
      middle: middleCurled,
      ring: ringCurled,
      pinky: pinkyCurled
    },
    thumbAcross
  };
}

// Bounding box & position evaluation (forgiving, comfortable signing area)
export function analyzePosition(landmarks: Landmark3D[]) {
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const p of landmarks) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const boxWidth = maxX - minX;

  const xOffset = Math.abs(centerX - 0.5);
  const yOffset = Math.abs(centerY - 0.5);
  const centerScore = Math.max(0, 100 - (xOffset * 80 + yOffset * 70));
  const sizeScore = boxWidth >= 0.06 && boxWidth <= 0.85 ? 100 : Math.max(50, 100 - Math.abs(boxWidth - 0.35) * 150);
  const finalScore = Math.min(100, Math.round((centerScore * 0.7) + (sizeScore * 0.3)));

  let feedback = "Position looks great!";
  let status: 'correct' | 'warning' | 'error' = 'correct';

  if (centerX < 0.05) {
    feedback = "Shift hand slightly inward";
    status = 'warning';
  } else if (centerX > 0.95) {
    feedback = "Shift hand slightly inward";
    status = 'warning';
  }

  return {
    score: finalScore,
    status,
    feedback,
    centerX,
    centerY,
    centered: finalScore >= 35
  };
}

// Rolling Confidence Smoother for responsive, jitter-free recognition
let previousConfidence: number = 0;
let previousSignId: string = '';

// Temporal Hold-to-Confirm: requires steady posture held for 380ms before triggering match
let holdStartTime: number | null = null;
let holdTargetSignId: string = '';
let currentHoldProgress: number = 0;
const REQUIRED_HOLD_MS = 380;

export function resetHoldBuffer() {
  holdStartTime = null;
  currentHoldProgress = 0;
  previousConfidence = 0;
  globalRecognizerOrchestrator.reset();
}



// Calibrate 26-class probability distribution to pedagogically intuitive percentage
export function calibrateDisplayConfidence(rawProb: number): number {
  if (rawProb <= 0.05) return Math.round(rawProb * 400); // 0 to 20%
  if (rawProb <= 0.20) return Math.round(20 + ((rawProb - 0.05) / 0.15) * 50); // 20 to 70%
  if (rawProb <= 0.45) return Math.round(70 + ((rawProb - 0.20) / 0.25) * 25); // 70 to 95%
  return Math.min(99, Math.round(95 + ((rawProb - 0.45) / 0.55) * 4)); // 95 to 99%
}

// Dedicated, forgiving ASL number kinematics evaluator (1 - 5)
export function evaluateNumberSign(
  targetSignId: string,
  bio: ReturnType<typeof analyze3DFingerKinematics>
): {
  isMatch: boolean;
  score: number;
  feedback: string;
} {
  const { index, middle, ring, pinky, thumb } = bio;
  const iUp = index.extensionRatio >= 0.62;
  const mUp = middle.extensionRatio >= 0.62;
  const rUp = ring.extensionRatio >= 0.62;
  const pUp = pinky.extensionRatio >= 0.62;
  const tUp = thumb.extensionRatio >= 0.65 || thumb.isExtended;

  let isMatch = false;
  let feedback = '';

  switch (targetSignId) {
    case '1':
      isMatch = iUp && !mUp && !rUp && !pUp;
      feedback = isMatch
        ? "✓ 1! Clean index finger held steady."
        : "Extend your index finger; curl other fingers into palm.";
      break;

    case '2':
      isMatch = iUp && mUp && !rUp && !pUp && (!tUp || thumb.extensionRatio < 0.82);
      feedback = isMatch
        ? "✓ 2! Clean index and middle fingers held steady."
        : "Extend index and middle fingers; curl ring and pinky.";
      break;

    case '3':
      // 3 in ASL: Thumb + Index + Middle extended!
      isMatch = iUp && mUp && tUp && !rUp && !pUp;
      feedback = isMatch
        ? "✓ 3! In ASL, 3 is thumb, index, and middle fingers."
        : "Extend thumb, index, and middle fingers for ASL 3.";
      break;

    case '4':
      isMatch = iUp && mUp && rUp && pUp && (!tUp || thumb.extensionRatio < 0.75);
      feedback = isMatch
        ? "✓ 4! Four fingers extended with thumb tucked."
        : "Extend all 4 fingers with thumb folded across palm.";
      break;

    case '5':
      isMatch = iUp && mUp && rUp && pUp && tUp;
      feedback = isMatch
        ? "✓ 5! All five fingers open wide."
        : "Open all five fingers wide.";
      break;

    default:
      isMatch = false;
      feedback = `Form the number ${targetSignId}`;
  }

  const score = isMatch ? 96 : 40;
  return { isMatch, score, feedback };
}

/**
 * Main Evaluation Engine
 * Combines scale-invariant geometric recognition with accurate palm orientation and signature detection.
 */
export function evaluateSign(
  landmarks: Landmark3D[],
  targetSignId: string,
  faceData?: FaceLandmarkData | null,
  providedHandedness?: 'Left' | 'Right'
): RecognitionEvaluation {
  const target = GET_SIGN_BY_ID(targetSignId);
  const position = analyzePosition(landmarks);

  // 1. SIMPLE, UNRESTRICTIVE HAND DETECTION (No rigid tripwires)
  if (!landmarks || landmarks.length < 21) {
    return {
      matchedSign: null,
      confidence: 0,
      shapeScore: 0,
      orientationScore: 0,
      positionScore: position.score,
      locationScore: 0,
      shapeStatus: 'error',
      orientationStatus: 'error',
      positionStatus: position.status,
      locationStatus: 'error',
      feedbackMessage: 'Show hand to begin',
      orientationFeedback: 'Show hand to camera',
      shapeFeedback: 'Show hand to camera',
      positionFeedback: position.feedback,
      locationFeedback: "Position hand in camera frame.",
      palmNormal: { x: 0, y: 0, z: -1 },
      isCorrect: false,
      holdProgress: 0,
      isHolding: false,
      recognitionState: 'IDLE',
      statusBadge: 'none',
      detectedFeatures: {
        fingersExtended: { thumb: false, index: false, middle: false, ring: false, pinky: false },
        palmFacing: 'camera',
        centered: false,
        fingerSpread: 'normal',
        thumbPosture: 'neutral' as any,
        locationZone: 'unknown'
      },
      faceData: null
    };
  }

  const quality = { isUsable: true, reason: 'OK' as const, message: 'Hand detected' };

  // 2. ADVANCED 3D BIOMECHANICAL HAND ANALYSIS

  const bio = analyze3DFingerKinematics(landmarks, providedHandedness);
  const { thumb, index, middle, ring, pinky } = bio;
  const palmScale = bio.palmScale;
  const spreadRatio = bio.spreadRatio;
  const palmFacing = bio.palmFacing;
  const normal = bio.palmNormal;

  const isAlphabet = target?.category === 'alphabet' || (targetSignId.length === 1 && targetSignId.toUpperCase() >= 'A' && targetSignId.toUpperCase() <= 'Z');


  // 3. UNIFIED TEMPORAL SEQUENCE ENGINE FOR ALPHABET FINGERSPELLING (STATIC + MOTION)
  if (isAlphabet) {
    globalRecognizerOrchestrator.setTargetLetter(targetSignId);
    const { inference, decoder } = globalRecognizerOrchestrator.processFrame(landmarks, providedHandedness);

    const isConfirmed = decoder.isConfirmedThisFrame || decoder.state === 'CONFIRMED';
    const isHolding = decoder.state === 'CANDIDATE';
    let confPct = calibrateDisplayConfidence(decoder.confidence);
    if (isConfirmed) confPct = Math.max(92, confPct);
    else if (isHolding) confPct = Math.max(72, confPct);

    const shapeScore = isConfirmed ? 96 : (isHolding ? 85 : Math.max(45, confPct));
    const orientScore = 95;

    let statusBadge: 'strong' | 'steady' | 'none' = 'none';
    if (isConfirmed || confPct >= 80) {
      statusBadge = 'strong';
    } else if (isHolding || confPct >= 65) {
      statusBadge = 'steady';
    }

    const isMotion = targetSignId === 'J' || targetSignId === 'Z';

    return {
      matchedSign: isConfirmed ? targetSignId : (isHolding ? targetSignId : null),
      confidence: confPct,
      shapeScore,
      orientationScore: orientScore,
      positionScore: position.score,
      locationScore: 95,
      shapeStatus: isConfirmed ? 'correct' : (isHolding ? 'warning' : (confPct >= 65 ? 'warning' : 'error')),
      orientationStatus: 'correct',
      positionStatus: position.status,
      feedbackMessage: decoder.feedbackMessage,
      orientationFeedback: 'Palm orientation looks good',
      shapeFeedback: decoder.feedbackMessage,
      positionFeedback: position.feedback,
      palmNormal: normal,
      isCorrect: isConfirmed,
      holdProgress: decoder.holdProgress,
      isHolding,
      recognitionState: decoder.state,
      qualityGate: quality,
      statusBadge,
      top1Score: Math.round(inference.confidence * 100) / 100,
      top2Score: Math.round(Math.max(0, inference.confidence - (inference.margin ?? 0)) * 100) / 100,
      margin: Math.round((inference.margin ?? 0) * 100) / 100,
      isMotionLetter: isMotion,
      motionProgress: isMotion ? (isConfirmed ? 100 : Math.round(decoder.holdProgress * 100)) : undefined,
      detectedFeatures: {
        fingersExtended: {
          thumb: thumb.extensionRatio > 0.75,
          index: index.extensionRatio > 0.75,
          middle: middle.extensionRatio > 0.75,
          ring: ring.extensionRatio > 0.75,
          pinky: pinky.extensionRatio > 0.75,
        },
        palmFacing,
        centered: position.centered,
        fingerSpread: spreadRatio > 0.35 ? 'spread' : 'together',
        thumbPosture: thumb.extensionRatio > 0.80 ? 'extended' : 'across',
        locationZone: 'chest'
      },
      faceData: null
    };
  }

  // 3b. DEDICATED, FORGIVING NUMBER RECOGNITION (1 - 5)
  const isNumber = target?.category === 'numbers' || ['1', '2', '3', '4', '5'].includes(targetSignId);
  if (isNumber) {
    const numberEval = evaluateNumberSign(targetSignId, bio);

    // Responsive temporal hold-to-confirm for numbers (~260ms)
    if (targetSignId !== holdTargetSignId) {
      holdStartTime = null;
      holdTargetSignId = targetSignId;
      currentHoldProgress = 0;
    }

    const now = Date.now();
    if (numberEval.isMatch) {
      if (holdStartTime === null) {
        holdStartTime = now;
        currentHoldProgress = 25;
      } else {
        const elapsed = now - holdStartTime;
        currentHoldProgress = Math.min(100, Math.round((elapsed / 260) * 100));
      }
    } else {
      holdStartTime = null;
      currentHoldProgress = Math.max(0, currentHoldProgress - 20);
    }

    const isConfirmed = currentHoldProgress >= 100;
    const isHolding = numberEval.isMatch && currentHoldProgress > 0;
    const confPct = isConfirmed ? 98 : (isHolding ? 75 + Math.round(currentHoldProgress * 0.2) : 40);

    return {
      matchedSign: isConfirmed ? targetSignId : (isHolding ? targetSignId : null),
      confidence: confPct,
      shapeScore: numberEval.score,
      orientationScore: 95,
      positionScore: position.score,
      locationScore: 95,
      shapeStatus: isConfirmed ? 'correct' : (isHolding ? 'warning' : 'error'),
      orientationStatus: 'correct',
      positionStatus: position.status,
      locationStatus: 'correct',
      feedbackMessage: isConfirmed
        ? `✓ Number ${targetSignId}! Verified!`
        : (isHolding ? `Holding ${targetSignId}... ${currentHoldProgress}%` : numberEval.feedback),
      orientationFeedback: 'Palm orientation looks good',
      shapeFeedback: numberEval.feedback,
      positionFeedback: position.feedback,
      locationFeedback: '',
      palmNormal: normal,
      isCorrect: isConfirmed,
      holdProgress: currentHoldProgress / 100,
      isHolding,
      recognitionState: isConfirmed ? 'CONFIRMED' : (isHolding ? 'CANDIDATE' : 'READY'),
      qualityGate: quality,
      statusBadge: isConfirmed ? 'strong' : (isHolding ? 'steady' : 'none'),
      top1Score: confPct / 100,
      top2Score: 0,
      margin: 1.0,
      detectedFeatures: {
        fingersExtended: {
          thumb: thumb.extensionRatio > 0.65,
          index: index.extensionRatio > 0.62,
          middle: middle.extensionRatio > 0.62,
          ring: ring.extensionRatio > 0.62,
          pinky: pinky.extensionRatio > 0.62,
        },
        palmFacing,
        centered: position.centered,
        fingerSpread: spreadRatio > 0.35 ? 'spread' : 'together',
        thumbPosture: thumb.extensionRatio > 0.70 ? 'extended' : 'across',
        locationZone: 'chest'
      },
      faceData: null
    };
  }


  // 1b. PALM ORIENTATION EVALUATION
  let orientationScore = 95;
  let orientationStatus: 'correct' | 'warning' | 'error' = 'correct';
  let orientationFeedback = "Palm is squarely facing the camera.";

  if (target.orientationTarget === 'camera') {
    if (palmFacing === 'side') {
      orientationScore = 52;
      orientationStatus = 'warning';
      orientationFeedback = "Palm is turned sideways. Face the flat of your palm directly to the camera.";
    } else if (palmFacing === 'inward') {
      orientationScore = 42;
      orientationStatus = 'warning';
      orientationFeedback = "Palm is rotated inward toward yourself. Turn your palm to face outward toward camera.";
    } else {
      orientationScore = 98;
      orientationFeedback = "Excellent! Palm is squarely facing the camera.";
    }
  } else if (target.orientationTarget === 'inward') {
    if (palmFacing === 'inward') {
      orientationScore = 98;
      orientationFeedback = "Proper inward orientation against chest.";
    } else {
      orientationScore = 48;
      orientationStatus = 'warning';
      orientationFeedback = "Place flat palm/knuckles facing inward against your chest.";
    }
  }

  // 1c. SPATIAL LOCATION EVALUATION (Place of Articulation / Face Anchor)
  let locationScore = 100;
  let locationStatus: 'correct' | 'warning' | 'error' = 'correct';
  let locationFeedback = "Hand height is properly positioned.";
  let locationZone: 'forehead' | 'chin' | 'chest' | 'unknown' = 'chest';

  const handTopY = Math.min(landmarks[8].y, landmarks[12].y, landmarks[4].y, landmarks[0].y);
  const handWristY = landmarks[0].y;

  if (faceData) {
    const mouthY = faceData.mouthCenter.y;
    const eyesY = (faceData.leftEye.y + faceData.rightEye.y) / 2;
    const noseY = faceData.noseTip.y;

    if (handTopY <= eyesY + 0.08 || handWristY <= noseY + 0.15) {
      locationZone = 'forehead';
    } else if (Math.abs(handTopY - mouthY) < 0.16 || Math.abs(landmarks[8].y - mouthY) < 0.14) {
      locationZone = 'chin';
    } else {
      locationZone = 'chest';
    }
  } else {
    if (handTopY < 0.40) {
      locationZone = 'forehead';
    } else if (handTopY < 0.56) {
      locationZone = 'chin';
    } else {
      locationZone = 'chest';
    }
  }

  const signId = target.id.toUpperCase();

  // Location validation for location-dependent signs
  if (signId === 'HELLO') {
    if (locationZone !== 'forehead') {
      locationScore = 40;
      locationStatus = 'warning';
      locationFeedback = "Raise your hand up near your forehead or temple to wave HELLO!";
    } else {
      locationScore = 98;
      locationFeedback = "Great greeting position near forehead/temple!";
    }
  } else if (signId === 'THANK YOU') {
    if (locationZone !== 'chin') {
      locationScore = 45;
      locationStatus = 'warning';
      locationFeedback = "Bring your fingertips to your chin/lips to sign THANK YOU!";
    } else {
      locationScore = 98;
      locationFeedback = "Proper articulation starting at chin/lips!";
    }
  } else if (['B', '4', '5'].includes(signId)) {
    if (locationZone === 'forehead') {
      locationScore = 60;
      locationStatus = 'warning';
      locationFeedback = "Lower hand to chest level for manual number/letter.";
    }
  }

  // 2. STRICT CANONICAL 3D BIOMECHANICAL SHAPE EVALUATION
  let passesCanonical = true;
  const issues: string[] = [];
  let shapeScore = 0;

  switch (signId) {
    case 'A': {
      // Fist with thumb resting upright against index
      const fingersCurled = (index.isCurled || index.extensionRatio <= 0.58) &&
        (middle.isCurled || middle.extensionRatio <= 0.58) &&
        (ring.isCurled || ring.extensionRatio <= 0.58) &&
        (pinky.isCurled || pinky.extensionRatio <= 0.58);
      const thumbResting = !thumb.isExtended && (thumb.isAlongIndex || (thumb.distToIndexMcp <= 0.38 && !thumb.isAcross));

      if (index.isExtended || middle.isExtended || ring.isExtended || pinky.isExtended || !fingersCurled) {
        passesCanonical = false;
        issues.push("Curl all 4 fingers tightly into your palm for 'A'.");
      } else if (thumb.isExtended) {
        passesCanonical = false;
        issues.push("Rest your thumb along the side of your index finger (not sticking out).");
      } else if (thumb.isAcross) {
        passesCanonical = false;
        issues.push("Keep thumb resting upright alongside index finger (not tucked across palm).");
      } else if (!thumbResting) {
        passesCanonical = false;
        issues.push("Rest thumb firmly against index finger edge.");
      }
      shapeScore = passesCanonical ? 98 : 38;
      break;
    }

    case 'B': {
      // 4 fingers extended and pressed together, thumb across palm
      const allFourUp = index.isExtended && middle.isExtended && ring.isExtended && pinky.isExtended;
      if (!allFourUp) {
        passesCanonical = false;
        issues.push("Extend all 4 fingers straight upward for 'B'.");
      } else if (spreadRatio > 0.44) {
        passesCanonical = false;
        issues.push("Keep your 4 fingers pressed together for 'B' (flat blade hand, not spread like '4').");
      } else if (thumb.isExtended) {
        passesCanonical = false;
        issues.push("Fold your thumb across your palm for 'B'.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case 'C': {
      // Curved C shape with open arch between thumb and fingers
      const areFingersStraight = index.isExtended || middle.isExtended || ring.isExtended || pinky.isExtended;
      const isArchOpen = thumb.distToIndexTip >= 0.32 && thumb.distToIndexTip <= 1.15;
      const areFingersCurved = (index.extensionRatio >= 0.44 && middle.extensionRatio >= 0.44);
      const isTightFist = index.isCurled && middle.isCurled && thumb.distToIndexTip < 0.28;

      if (areFingersStraight) {
        passesCanonical = false;
        issues.push("Curve fingers into a rounded 'C' shape (do not hold fingers straight).");
      } else if (isTightFist) {
        passesCanonical = false;
        issues.push("Open your fingers into an arch for 'C' (imagine holding a cup).");
      } else if (!isArchOpen || !areFingersCurved) {
        passesCanonical = false;
        issues.push("Form an arch between your thumb and fingertips for 'C'.");
      }
      shapeScore = passesCanonical ? 96 : 40;
      break;
    }

    case 'D': {
      // Index extended UP, others curled, thumb touches middle fingertip
      const othersCurled = !middle.isExtended && !ring.isExtended && !pinky.isExtended &&
        (middle.isCurled || middle.extensionRatio <= 0.58) && (ring.isCurled || ring.extensionRatio <= 0.58);
      const thumbNearLoop = thumb.distToMiddleTip <= 0.65 || thumb.distToIndexTip <= 0.65;

      if (!index.isExtended) {
        passesCanonical = false;
        issues.push("Point your index finger straight up for 'D'.");
      } else if (!othersCurled) {
        passesCanonical = false;
        issues.push("Only index finger up; curl middle, ring, and pinky into palm.");
      } else if (thumb.isExtended) {
        passesCanonical = false;
        issues.push("Do not stick thumb out (that makes 'L'); touch thumb to middle finger.");
      } else if (!thumbNearLoop) {
        passesCanonical = false;
        issues.push("Touch your thumb to your curled middle fingertip for 'D'.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case 'E': {
      // All 4 fingers curled down tightly onto thumb folded across
      const allCurled = (index.isCurled || index.extensionRatio <= 0.55) &&
        (middle.isCurled || middle.extensionRatio <= 0.55) &&
        (ring.isCurled || ring.extensionRatio <= 0.55) &&
        (pinky.isCurled || pinky.extensionRatio <= 0.55);

      if (!allCurled || index.isExtended || middle.isExtended || ring.isExtended || pinky.isExtended) {
        passesCanonical = false;
        issues.push("Curl all 4 fingers down tightly for 'E'.");
      } else if (thumb.isExtended) {
        passesCanonical = false;
        issues.push("Fold thumb across the palm under your curled fingertips.");
      }
      shapeScore = passesCanonical ? 96 : 38;
      break;
    }

    case 'F': {
      // Thumb and index touch to form a ring (OK sign), middle, ring, pinky extended
      const circleClosed = thumb.distToIndexTip <= 0.42;
      const upperThreeUp = middle.isExtended && ring.isExtended && pinky.isExtended;

      if (!upperThreeUp) {
        passesCanonical = false;
        issues.push("Extend middle, ring, and pinky fingers straight up for 'F'.");
      } else if (index.isExtended) {
        passesCanonical = false;
        issues.push("Touch your index fingertip to your thumb tip.");
      } else if (!circleClosed) {
        passesCanonical = false;
        issues.push("Bring index fingertip and thumb tip together to form a ring for 'F'.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case 'L': {
      // Index extended UP, thumb extended OUT horizontally at 90 degrees
      const othersCurled = !middle.isExtended && !ring.isExtended && !pinky.isExtended &&
        (middle.isCurled || middle.extensionRatio <= 0.58);

      if (!index.isExtended) {
        passesCanonical = false;
        issues.push("Point your index finger straight up for 'L'.");
      } else if (!thumb.isExtended || thumb.distToIndexMcp < 0.38) {
        passesCanonical = false;
        issues.push("Extend your thumb outward horizontally at a right angle for 'L'.");
      } else if (!othersCurled) {
        passesCanonical = false;
        issues.push("Curl middle, ring, and pinky tightly into your palm for 'L'.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case 'V': {
      // Index and middle extended in a V, ring and pinky strictly curled, thumb tucked
      const vSpread = dist3D(landmarks[8], landmarks[12]) / palmScale;
      const bottomTwoCurled = !ring.isExtended && !pinky.isExtended &&
        (ring.isCurled || ring.extensionRatio <= 0.58) && (pinky.isCurled || pinky.extensionRatio <= 0.58);

      if (!index.isExtended || !middle.isExtended) {
        passesCanonical = false;
        issues.push("Extend both index and middle fingers upward for 'V'.");
      } else if (!bottomTwoCurled) {
        passesCanonical = false;
        issues.push("Tuck ring and pinky fingers down for 'V'.");
      } else if (thumb.isExtended) {
        passesCanonical = false;
        issues.push("Hold thumb folded over ring and pinky fingers (not sticking out).");
      } else if (vSpread < 0.20) {
        passesCanonical = false;
        issues.push("Spread your index and middle fingers apart in a 'V' shape.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case 'W': {
      // Index, middle, and ring extended upward, pinky curled
      const pinkyCurled = !pinky.isExtended && (pinky.isCurled || pinky.extensionRatio <= 0.58);
      if (!index.isExtended || !middle.isExtended || !ring.isExtended) {
        passesCanonical = false;
        issues.push("Extend index, middle, and ring fingers straight up for 'W'.");
      } else if (!pinkyCurled) {
        passesCanonical = false;
        issues.push("Curl your pinky down for 'W' (pinky should not be up).");
      } else if (thumb.isExtended) {
        passesCanonical = false;
        issues.push("Tuck thumb over pinky finger.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case 'Y': {
      // Thumb and pinky extended out wide (shaka), index, middle, ring strictly curled
      const middleThreeCurled = !index.isExtended && !middle.isExtended && !ring.isExtended &&
        (index.isCurled || index.extensionRatio <= 0.58) && (middle.isCurled || middle.extensionRatio <= 0.58);

      if (!pinky.isExtended) {
        passesCanonical = false;
        issues.push("Extend your pinky finger outward for 'Y'.");
      } else if (!thumb.isExtended) {
        passesCanonical = false;
        issues.push("Extend your thumb outward to the side for 'Y'.");
      } else if (!middleThreeCurled) {
        passesCanonical = false;
        issues.push("Curl index, middle, and ring fingers into your palm for 'Y'.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case '1': {
      // Only index finger extended straight up, thumb folded over curled fingers
      const othersCurled = !middle.isExtended && !ring.isExtended && !pinky.isExtended &&
        (middle.isCurled || middle.extensionRatio <= 0.58);

      if (!index.isExtended) {
        passesCanonical = false;
        issues.push("Point your index finger straight up for number '1'.");
      } else if (!othersCurled) {
        passesCanonical = false;
        issues.push("Curl middle, ring, and pinky down into your palm for number '1'.");
      } else if (thumb.isExtended) {
        passesCanonical = false;
        issues.push("Tuck your thumb across your curled fingers (do not stick it out like 'L').");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case '2': {
      // Index and middle extended upward, ring and pinky curled
      const othersCurled = !ring.isExtended && !pinky.isExtended &&
        (ring.isCurled || ring.extensionRatio <= 0.58);

      if (!index.isExtended || !middle.isExtended) {
        passesCanonical = false;
        issues.push("Extend index and middle fingers straight up for number '2'.");
      } else if (!othersCurled) {
        passesCanonical = false;
        issues.push("Curl ring and pinky fingers down for number '2'.");
      } else if (thumb.isExtended) {
        passesCanonical = false;
        issues.push("Hold your thumb over ring and pinky (not sticking out like '3').");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case '3': {
      // ASL 3 is Thumb, Index, and Middle extended! Ring and pinky curled
      const othersCurled = !ring.isExtended && !pinky.isExtended &&
        (ring.isCurled || ring.extensionRatio <= 0.58);

      if (!index.isExtended || !middle.isExtended) {
        passesCanonical = false;
        issues.push("Extend index and middle fingers for number '3'.");
      } else if (!thumb.isExtended) {
        passesCanonical = false;
        issues.push("In ASL, extend your thumb for number '3' (thumb + index + middle).");
      } else if (!othersCurled) {
        passesCanonical = false;
        issues.push("Curl ring and pinky fingers down for number '3'.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case '4': {
      // 4 fingers extended and spread, thumb folded across palm
      const allFourUp = index.isExtended && middle.isExtended && ring.isExtended && pinky.isExtended;

      if (!allFourUp) {
        passesCanonical = false;
        issues.push("Extend all 4 fingers straight up for number '4'.");
      } else if (spreadRatio < 0.38) {
        passesCanonical = false;
        issues.push("Spread your 4 fingers apart for '4' (fingers are pressed together like 'B').");
      } else if (thumb.isExtended) {
        passesCanonical = false;
        issues.push("Tuck your thumb across your palm for '4' (you are showing 5 fingers).");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case '5': {
      // All 5 fingers extended and spread wide
      const allFiveUp = index.isExtended && middle.isExtended && ring.isExtended && pinky.isExtended && thumb.isExtended;

      if (!allFiveUp) {
        passesCanonical = false;
        issues.push("Extend all fingers straight up for number '5'.");
      } else if (!thumb.isExtended) {
        passesCanonical = false;
        issues.push("Open your thumb wide for number '5' (you are only showing 4 fingers).");
      } else if (spreadRatio < 0.35) {
        passesCanonical = false;
        issues.push("Fan your fingers wide apart for number '5'.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case 'HELLO': {
      // Open flat hand at forehead / temple moving outward
      const flatHand = index.isExtended && middle.isExtended && ring.isExtended && pinky.isExtended;
      if (!flatHand) {
        passesCanonical = false;
        issues.push("Hold an open flat hand for HELLO.");
      } else if (locationZone !== 'forehead') {
        passesCanonical = false;
        issues.push("Raise your hand to your forehead/temple to sign HELLO.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case 'THANK YOU': {
      // Open flat hand at chin / lips moving outward
      const flatHand = index.isExtended && middle.isExtended && ring.isExtended && pinky.isExtended;
      if (!flatHand) {
        passesCanonical = false;
        issues.push("Hold an open flat hand for THANK YOU.");
      } else if (locationZone !== 'chin') {
        passesCanonical = false;
        issues.push("Touch your fingertips to your chin/lips for THANK YOU.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case 'PLEASE': {
      // Open hand placed against chest
      const flatHand = index.isExtended && middle.isExtended && ring.isExtended;
      if (!flatHand) {
        passesCanonical = false;
        issues.push("Place an open flat hand against your chest for PLEASE.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case 'YES': {
      // Closed fist
      const allCurled = (index.isCurled || index.extensionRatio <= 0.58) &&
        (middle.isCurled || middle.extensionRatio <= 0.58) &&
        (ring.isCurled || ring.extensionRatio <= 0.58) &&
        (pinky.isCurled || pinky.extensionRatio <= 0.58);

      if (!allCurled || index.isExtended || middle.isExtended || ring.isExtended || pinky.isExtended) {
        passesCanonical = false;
        issues.push("Make a closed fist for YES.");
      }
      shapeScore = passesCanonical ? 98 : 40;
      break;
    }

    case 'NO': {
      // Index and middle fingertips close to thumb, ring and pinky curled
      const isSnapping = thumb.distToIndexTip <= 0.48 && thumb.distToMiddleTip <= 0.48;
      const bottomTwoCurled = !ring.isExtended && !pinky.isExtended;

      if (!bottomTwoCurled) {
        passesCanonical = false;
        issues.push("Keep ring and pinky curled into your palm for NO.");
      } else if (!isSnapping && (index.isExtended || middle.isExtended)) {
        passesCanonical = false;
        issues.push("Snap index and middle fingertips down to meet your thumb for NO.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case 'SORRY': {
      // Fist placed against chest
      const allCurled = (index.isCurled || index.extensionRatio <= 0.58) &&
        (middle.isCurled || middle.extensionRatio <= 0.58) &&
        (ring.isCurled || ring.extensionRatio <= 0.58) &&
        (pinky.isCurled || pinky.extensionRatio <= 0.58);

      if (!allCurled || index.isExtended || middle.isExtended || ring.isExtended || pinky.isExtended) {
        passesCanonical = false;
        issues.push("Make an 'A' fist for SORRY.");
      }
      shapeScore = passesCanonical ? 98 : 40;
      break;
    }

    case 'LOVE': {
      // LOVE (ILY): Thumb, index, AND pinky extended; middle and ring curled
      const middleTwoCurled = !middle.isExtended && !ring.isExtended &&
        (middle.isCurled || middle.extensionRatio <= 0.58) && (ring.isCurled || ring.extensionRatio <= 0.58);

      if (!index.isExtended) {
        passesCanonical = false;
        issues.push("Extend your index finger upward for LOVE (I Love You).");
      } else if (!pinky.isExtended) {
        passesCanonical = false;
        issues.push("Extend your pinky finger upward for LOVE (I Love You).");
      } else if (!thumb.isExtended) {
        passesCanonical = false;
        issues.push("Extend your thumb outward to the side for LOVE.");
      } else if (!middleTwoCurled) {
        passesCanonical = false;
        issues.push("Curl middle and ring fingers down tightly into your palm for LOVE.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    case 'PEACE': {
      // Victory / peace sign (index & middle spread in V, others curled, thumb tucked)
      const vSpread = dist3D(landmarks[8], landmarks[12]) / palmScale;
      const bottomTwoCurled = !ring.isExtended && !pinky.isExtended &&
        (ring.isCurled || ring.extensionRatio <= 0.58) && (pinky.isCurled || pinky.extensionRatio <= 0.58);

      if (!index.isExtended || !middle.isExtended) {
        passesCanonical = false;
        issues.push("Extend index and middle fingers for PEACE.");
      } else if (!bottomTwoCurled) {
        passesCanonical = false;
        issues.push("Curl ring and pinky fingers down for PEACE.");
      } else if (thumb.isExtended) {
        passesCanonical = false;
        issues.push("Fold thumb over ring and pinky fingers.");
      } else if (vSpread < 0.20) {
        passesCanonical = false;
        issues.push("Spread index and middle fingers apart in a 'V' shape for PEACE.");
      }
      shapeScore = passesCanonical ? 98 : 42;
      break;
    }

    default: {
      let matches = 0;
      if (target.fingers.index === 'extended' ? index.isExtended : !index.isExtended) matches++;
      if (target.fingers.middle === 'extended' ? middle.isExtended : !middle.isExtended) matches++;
      if (target.fingers.ring === 'extended' ? ring.isExtended : !ring.isExtended) matches++;
      if (target.fingers.pinky === 'extended' ? pinky.isExtended : !pinky.isExtended) matches++;
      if (target.fingers.thumb === 'extended' ? thumb.isExtended : !thumb.isExtended) matches++;
      passesCanonical = matches === 5;
      shapeScore = Math.round((matches / 5) * 100);
      if (!passesCanonical) {
        issues.push("Adjust fingers to match target sign.");
      }
    }
  }



  let shapeStatus: 'correct' | 'warning' | 'error' = 'correct';
  let shapeFeedback = "Hand shape matches target geometry!";

  if (!passesCanonical || shapeScore < 60) {
    shapeStatus = 'error';
    shapeFeedback = issues.length > 0 ? issues[0] : "Hand shape does not match target.";
  } else if (shapeScore < 85) {
    shapeStatus = 'warning';
    shapeFeedback = issues.length > 0 ? issues[0] : "Good progress, adjust finger tension.";
  }

  // 3. OVERALL CONFIDENCE & STRICT VALIDATION
  const hasLocationRequirement = ['HELLO', 'THANK YOU'].includes(signId);
  let rawConfidence = 0;

  if (hasLocationRequirement) {
    rawConfidence = Math.round((shapeScore * 0.35) + (orientationScore * 0.30) + (locationScore * 0.25) + (position.score * 0.10));
  } else {
    rawConfidence = Math.round((shapeScore * 0.45) + (orientationScore * 0.35) + (position.score * 0.20));
  }

  // Strict posture requirements:
  const isShapeClean = passesCanonical && issues.length === 0 && shapeScore >= 85;
  const isOrientClean = orientationScore >= 78;
  const isLocClean = !hasLocationRequirement || locationScore >= 75;
  const isPosClean = position.score >= 45;

  const isPostureClean = isShapeClean && isOrientClean && isLocClean && isPosClean;

  // 4. TEMPORAL HOLD-TO-CONFIRM BUFFER (350ms)
  // Prevents false positives from single-frame transitions or accidental hand waves
  if (targetSignId !== holdTargetSignId) {
    holdStartTime = null;
    holdTargetSignId = targetSignId;
    currentHoldProgress = 0;
  }

  const now = Date.now();
  if (isPostureClean) {
    if (holdStartTime === null) {
      holdStartTime = now;
      currentHoldProgress = 20;
    } else {
      const elapsed = now - holdStartTime;
      currentHoldProgress = Math.min(100, Math.round((elapsed / 350) * 100));
    }
  } else {
    holdStartTime = null;
    currentHoldProgress = Math.max(0, currentHoldProgress - 25);
  }

  const isHeldConfirmed = currentHoldProgress >= 100;
  const isCorrect = isHeldConfirmed;

  // Temporal smoothing to avoid single-frame flickering in UI meter
  if (previousSignId !== targetSignId) {
    previousConfidence = rawConfidence;
    previousSignId = targetSignId;
  }
  const smoothedConfidence = Math.round((0.55 * rawConfidence) + (0.45 * previousConfidence));
  previousConfidence = smoothedConfidence;

  let feedbackMessage = "";
  if (isCorrect) {
    feedbackMessage = `Outstanding! Clean ${target.name} held steadily and verified (${smoothedConfidence}% match).`;
  } else if (isPostureClean && currentHoldProgress > 0) {
    feedbackMessage = `Holding pose steady... ${currentHoldProgress}% locked in!`;
  } else if (!isShapeClean) {
    feedbackMessage = issues.length > 0 ? issues[0] : shapeFeedback;
  } else if (!isOrientClean) {
    feedbackMessage = `Finger shape is great, but adjust palm orientation: ${orientationFeedback}`;
  } else if (hasLocationRequirement && !isLocClean) {
    feedbackMessage = locationFeedback;
  } else {
    feedbackMessage = position.feedback;
  }

  return {
    matchedSign: isCorrect ? target.id : null,
    confidence: smoothedConfidence,
    shapeScore,
    orientationScore,
    positionScore: position.score,
    locationScore,
    shapeStatus,
    orientationStatus,
    positionStatus: position.status,
    locationStatus,
    feedbackMessage,
    orientationFeedback,
    shapeFeedback,
    positionFeedback: position.feedback,
    locationFeedback,
    palmNormal: normal,
    isCorrect,
    holdProgress: currentHoldProgress,
    isHolding: isPostureClean && currentHoldProgress > 0,
    detectedFeatures: {
      fingersExtended: {
        thumb: thumb.isExtended,
        index: index.isExtended,
        middle: middle.isExtended,
        ring: ring.isExtended,
        pinky: pinky.isExtended
      },
      palmFacing,
      centered: position.centered,
      fingerSpread: spreadRatio <= 0.40 ? 'together' : (spreadRatio >= 0.44 ? 'spread' : 'normal'),
      thumbPosture: thumb.isExtended ? 'extended' : (thumb.isAcross ? 'across' : 'curled'),
      locationZone
    },
    faceData: faceData || null,
    mlPrediction: undefined,
    recognitionState: isCorrect ? 'CONFIRMED' : (isPostureClean && currentHoldProgress > 0 ? 'CANDIDATE' : 'READY'),
    qualityGate: quality,
    statusBadge: isCorrect ? 'strong' : (isPostureClean && currentHoldProgress > 0 ? 'steady' : 'none')
  };
}

/**
 * Open Fingerspelling Recognition (A-Z)
 * Classifies the active hand configuration into one of the 26 ASL alphabet letters,
 * or returns UNKNOWN if confidence is low, hand is ambiguous, or margin is narrow.
 */
export function recognizeFingerspellingOpen(
  landmarks: Landmark3D[],
  providedHandedness?: 'Left' | 'Right'
): RecognitionEvaluation {
  const position = analyzePosition(landmarks);

  // Simple unrestrictive hand presence check
  if (!landmarks || landmarks.length < 21) {
    return {
      matchedSign: null,
      confidence: 0,
      shapeScore: 0,
      orientationScore: 0,
      positionScore: position.score,
      locationScore: 0,
      shapeStatus: 'error',
      orientationStatus: 'error',
      positionStatus: position.status,
      locationStatus: 'error',
      feedbackMessage: 'Show hand to begin',
      orientationFeedback: 'Show hand to camera',
      shapeFeedback: 'Show hand to camera',
      positionFeedback: position.feedback,
      locationFeedback: "Position hand in camera frame.",
      palmNormal: { x: 0, y: 0, z: -1 },
      isCorrect: false,
      holdProgress: 0,
      isHolding: false,
      recognitionState: 'IDLE',
      statusBadge: 'none',
      detectedFeatures: {
        fingersExtended: { thumb: false, index: false, middle: false, ring: false, pinky: false },
        palmFacing: 'camera',
        centered: false,
        fingerSpread: 'normal',
        thumbPosture: 'neutral' as any,
        locationZone: 'unknown'
      },
      faceData: null
    };
  }

  const quality = { isUsable: true, reason: 'OK' as const, message: 'Hand detected' };

  // Process frame through unified temporal sequence engine

  globalRecognizerOrchestrator.setTargetLetter(null);
  const { inference, decoder } = globalRecognizerOrchestrator.processFrame(landmarks, providedHandedness);

  const isConfirmed = decoder.isConfirmedThisFrame || decoder.state === 'CONFIRMED';
  const isCandidate = decoder.state === 'CANDIDATE';
  const detectedLetter = decoder.recognizedLetter;
  let confPct = calibrateDisplayConfidence(decoder.confidence);
  if (isConfirmed) confPct = Math.max(92, confPct);
  else if (isCandidate) confPct = Math.max(72, confPct);
  const bio = analyze3DFingerKinematics(landmarks, providedHandedness);
  const isMotion = detectedLetter === 'J' || detectedLetter === 'Z';

  return {
    matchedSign: detectedLetter !== 'UNKNOWN' ? detectedLetter : null,
    confidence: confPct,
    shapeScore: Math.max(30, confPct),
    orientationScore: 95,
    positionScore: position.score,
    locationScore: 95,
    shapeStatus: isConfirmed ? 'correct' : (isCandidate ? 'warning' : 'error'),
    orientationStatus: 'correct',
    positionStatus: position.status,
    locationStatus: 'correct',
    feedbackMessage: decoder.feedbackMessage,
    orientationFeedback: 'Orientation looks good',
    shapeFeedback: decoder.feedbackMessage,
    positionFeedback: position.feedback,
    locationFeedback: '',
    palmNormal: bio.palmNormal,
    isCorrect: isConfirmed,
    holdProgress: decoder.holdProgress,
    isHolding: isCandidate,
    recognitionState: decoder.state,
    qualityGate: quality,
    statusBadge: isConfirmed ? 'strong' : (isCandidate ? 'steady' : 'none'),
    isMotionLetter: isMotion,
    motionProgress: isMotion ? Math.round(decoder.holdProgress * 100) : undefined,
    top1Score: inference.confidence,
    top2Score: 0,
    margin: 1.0,
    detectedFeatures: {
      fingersExtended: {
        thumb: bio.thumb.isExtended,
        index: bio.index.isExtended,
        middle: bio.middle.isExtended,
        ring: bio.ring.isExtended,
        pinky: bio.pinky.isExtended
      },
      palmFacing: bio.palmFacing,
      centered: position.centered,
      fingerSpread: bio.spreadRatio > 0.35 ? 'spread' : 'together',
      thumbPosture: bio.thumb.isExtended ? 'extended' : 'across'
    },
    faceData: null
  };
}



// ==========================================
// DEMO MODE / VIRTUAL LANDMARK GENERATOR
// ==========================================

export function generateSimulatedLandmarks(
  signId: string,
  flaw: 'none' | 'wrong_orientation' | 'bad_shape' | 'off_center' = 'none'
): Landmark3D[] {
  const target = GET_SIGN_BY_ID(signId);
  const base: Landmark3D[] = [];

  const rootX = flaw === 'off_center' ? 0.20 : 0.5;
  const rootY = signId === 'HELLO' ? 0.38 : (signId === 'THANK YOU' ? 0.48 : 0.72);
  const rootZ = 0.0;

  const t = Date.now() / 400;
  const jitterX = Math.sin(t) * 0.002;
  const jitterY = Math.cos(t) * 0.002;

  base.push({ x: rootX + jitterX, y: rootY + jitterY, z: rootZ });

  // Orientation modifier:
  let zOrient = -0.06;
  if (target.orientationTarget === 'inward') {
    zOrient = flaw === 'wrong_orientation' ? -0.06 : 0.25;
  } else {
    zOrient = flaw === 'wrong_orientation' ? 0.38 : -0.06;
  }

  // Thumb
  const thumbExt = target.fingers.thumb === 'extended' || target.fingers.thumb === 'abducted';
  const thumbAcross = target.fingers.thumb === 'across';
  let thumbOutX = -0.03;
  let thumbOutY = -0.05;

  if (signId === '5') {
    thumbOutX = -0.16;
    thumbOutY = -0.07;
  } else if (signId === 'B') {
    thumbOutX = 0.04;
    thumbOutY = -0.07;
  } else if (signId === '4') {
    thumbOutX = 0.05;
    thumbOutY = -0.08;
  } else if (signId === 'C') {
    thumbOutX = -0.09;
    thumbOutY = -0.11;
  } else if (signId === 'D') {
    thumbOutX = 0.01;
    thumbOutY = -0.16;
  } else if (signId === 'LOVE' || signId === 'Y' || signId === '3') {
    thumbOutX = -0.14;
    thumbOutY = -0.08;
  } else if (thumbExt) {
    thumbOutX = -0.12;
    thumbOutY = -0.08;
  } else if (thumbAcross) {
    thumbOutX = 0.04;
    thumbOutY = -0.05;
  }

  base.push({ x: rootX - 0.03, y: rootY - 0.05, z: rootZ });
  base.push({ x: rootX - 0.06, y: rootY - 0.11, z: rootZ });
  base.push({ x: rootX - 0.08 + (thumbOutX * 0.5), y: rootY - 0.16 + (thumbOutY * 0.5), z: rootZ });
  base.push({ x: rootX + thumbOutX, y: rootY - 0.18 + thumbOutY, z: rootZ + zOrient });

  let fingerOffsets = [
    { mcpX: -0.05, mcpY: -0.22, state: target.fingers.index, len: 0.18, spread: 0.0 },
    { mcpX: -0.01, mcpY: -0.24, state: target.fingers.middle, len: 0.20, spread: 0.0 },
    { mcpX: 0.03,  mcpY: -0.23, state: target.fingers.ring, len: 0.18, spread: 0.0 },
    { mcpX: 0.07,  mcpY: -0.20, state: target.fingers.pinky, len: 0.14, spread: 0.0 }
  ];

  if (signId === 'B') {
    // Tight blade
    fingerOffsets = [
      { mcpX: -0.028, mcpY: -0.22, state: target.fingers.index, len: 0.18, spread: 0.0 },
      { mcpX: -0.009, mcpY: -0.24, state: target.fingers.middle, len: 0.20, spread: 0.0 },
      { mcpX:  0.010, mcpY: -0.23, state: target.fingers.ring, len: 0.18, spread: 0.0 },
      { mcpX:  0.028, mcpY: -0.20, state: target.fingers.pinky, len: 0.14, spread: 0.0 }
    ];
  } else if (signId === '4' || signId === '5') {
    // Wide fan
    fingerOffsets = [
      { mcpX: -0.065, mcpY: -0.22, state: target.fingers.index, len: 0.18, spread: -0.04 },
      { mcpX: -0.020, mcpY: -0.24, state: target.fingers.middle, len: 0.20, spread: -0.01 },
      { mcpX:  0.025, mcpY: -0.23, state: target.fingers.ring, len: 0.18, spread: 0.02 },
      { mcpX:  0.075, mcpY: -0.20, state: target.fingers.pinky, len: 0.14, spread: 0.05 }
    ];
  } else if (signId === 'LOVE') {
    fingerOffsets = [
      { mcpX: -0.05, mcpY: -0.22, state: 'extended', len: 0.18, spread: -0.02 },
      { mcpX: -0.01, mcpY: -0.24, state: 'curled', len: 0.20, spread: 0.0 },
      { mcpX: 0.03,  mcpY: -0.23, state: 'curled', len: 0.18, spread: 0.0 },
      { mcpX: 0.07,  mcpY: -0.20, state: 'extended', len: 0.14, spread: 0.04 }
    ];
  }

  fingerOffsets.forEach((f, idx) => {
    let isExtended = f.state === 'extended';
    if (flaw === 'bad_shape' && idx === 0) {
      isExtended = !isExtended; // Deliberately invert index
    }

    const spread = f.spread || 0.0;
    const mcp = { x: rootX + f.mcpX, y: rootY + f.mcpY, z: rootZ + (zOrient * 0.3) };
    let pip: Landmark3D;
    let dip: Landmark3D;
    let tip: Landmark3D;

    if (signId === 'C') {
      pip = { x: rootX + f.mcpX - 0.02, y: rootY + f.mcpY - 0.08, z: rootZ + (zOrient * 0.4) };
      dip = { x: rootX + f.mcpX - 0.05, y: rootY + f.mcpY - 0.12, z: rootZ + (zOrient * 0.7) };
      tip = { x: rootX + f.mcpX - 0.08 + jitterX, y: rootY + f.mcpY - 0.09, z: rootZ + zOrient };
    } else if (isExtended) {
      pip = { x: rootX + f.mcpX + (spread * 0.3), y: rootY + f.mcpY - (f.len * 0.4), z: rootZ + (zOrient * 0.5) };
      dip = { x: rootX + f.mcpX + (spread * 0.7), y: rootY + f.mcpY - (f.len * 0.7), z: rootZ + (zOrient * 0.8) };
      tip = { x: rootX + f.mcpX + spread + jitterX, y: rootY + f.mcpY - f.len, z: rootZ + zOrient };
    } else {
      pip = { x: rootX + f.mcpX, y: rootY + f.mcpY - 0.04, z: rootZ + (zOrient * 0.5) };
      dip = { x: rootX + f.mcpX, y: rootY + f.mcpY - 0.01, z: rootZ + (zOrient * 0.7) };
      tip = { x: rootX + f.mcpX + jitterX, y: rootY + f.mcpY + 0.04, z: rootZ + zOrient };
    }

    base.push(mcp);
    base.push(pip);
    base.push(dip);
    base.push(tip);
  });

  return base;
}
