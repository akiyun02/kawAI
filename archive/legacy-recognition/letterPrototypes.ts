import { HandPoseFeatures } from './handFeatureExtractor';

export interface PrototypeParam {
  mean: number;
  std: number;
}

export interface LetterPrototype {
  letter: string;
  isMotion: boolean;
  curls: {
    thumb: PrototypeParam;
    index: PrototypeParam;
    middle: PrototypeParam;
    ring: PrototypeParam;
    pinky: PrototypeParam;
  };
  spreads?: {
    indexToMiddle?: PrototypeParam;
    middleToRing?: PrototypeParam;
    ringToPinky?: PrototypeParam;
    thumbToIndex?: PrototypeParam;
  };
  thumbTouches?: {
    toIndexTip?: PrototypeParam;
    toMiddleTip?: PrototypeParam;
    toRingTip?: PrototypeParam;
    toPinkyTip?: PrototypeParam;
    toIndexPip?: PrototypeParam;
    toIndexMcp?: PrototypeParam;
  };
  orientation?: {
    palmFacingCamera?: boolean;
    palmFacingSide?: boolean;
    handPointingDown?: boolean;
    handPointingHorizontal?: boolean;
  };
  feedback: {
    ideal: string;
    onCurlMismatch?: string;
    onSpreadMismatch?: string;
    onThumbMismatch?: string;
    onOrientationMismatch?: string;
  };
}

export interface PrototypeSimilarityResult {
  letter: string;
  overallScore: number; // 0.0 to 1.0
  band: 'HIGH' | 'MEDIUM' | 'LOW';
  curlScore: number;
  spreadScore: number;
  thumbScore: number;
  orientationScore: number;
  feedback: string;
}

// Gaussian similarity: returns 1.0 at mean, smooth bell curve drop-off with standard deviation
function gaussianScore(val: number, param: PrototypeParam): number {
  const std = Math.max(0.04, param.std);
  const diff = val - param.mean;
  return Math.exp(-0.5 * Math.pow(diff / std, 2));
}

// Low curl = extended (~0.05 - 0.20), High curl = fist (~0.80 - 0.95)
const EXT: PrototypeParam = { mean: 0.12, std: 0.18 };
const HALF: PrototypeParam = { mean: 0.50, std: 0.20 };
const CURL: PrototypeParam = { mean: 0.88, std: 0.18 };

/**
 * Data-Driven Statistical Letter Prototypes (A-Z)
 */
export const LETTER_PROTOTYPES: Record<string, LetterPrototype> = {
  // A: Fist, thumb upright on lateral side of index
  'A': {
    letter: 'A',
    isMotion: false,
    curls: { thumb: EXT, index: CURL, middle: CURL, ring: CURL, pinky: CURL },
    thumbTouches: { toIndexPip: { mean: 0.30, std: 0.16 } },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Fist with thumb resting upright beside index finger',
      onThumbMismatch: 'Keep thumb upright beside index, not folded across'
    }
  },

  // B: 4 fingers straight up pressed together, thumb tucked across palm
  'B': {
    letter: 'B',
    isMotion: false,
    curls: { thumb: CURL, index: EXT, middle: EXT, ring: EXT, pinky: EXT },
    spreads: {
      indexToMiddle: { mean: 0.12, std: 0.10 },
      middleToRing: { mean: 0.12, std: 0.10 },
      ringToPinky: { mean: 0.12, std: 0.10 }
    },
    thumbTouches: { toIndexMcp: { mean: 0.40, std: 0.18 } },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Four fingers straight up pressed close, thumb across palm',
      onSpreadMismatch: 'Keep four fingers pressed tightly together',
      onThumbMismatch: 'Fold thumb across palm'
    }
  },

  // C: Arched open cup, gap between thumb and fingers
  'C': {
    letter: 'C',
    isMotion: false,
    curls: { thumb: HALF, index: HALF, middle: HALF, ring: HALF, pinky: HALF },
    thumbTouches: { toIndexTip: { mean: 0.45, std: 0.22 } },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Curved open C arc with gap between thumb and fingertips',
      onThumbMismatch: 'Keep open space between thumb and fingers'
    }
  },

  // D: Index upright, other 3 touch thumb in circle
  'D': {
    letter: 'D',
    isMotion: false,
    curls: { thumb: HALF, index: EXT, middle: CURL, ring: CURL, pinky: CURL },
    thumbTouches: { toMiddleTip: { mean: 0.22, std: 0.16 } },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Index pointing straight up, other fingers touching thumb',
      onCurlMismatch: 'Only extend index finger tall',
      onThumbMismatch: 'Touch thumb to middle fingertip forming a circle'
    }
  },

  // E: All 4 fingertips curled tightly down resting on thumb
  'E': {
    letter: 'E',
    isMotion: false,
    curls: { thumb: CURL, index: CURL, middle: CURL, ring: CURL, pinky: CURL },
    thumbTouches: { toIndexTip: { mean: 0.20, std: 0.15 } },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Curl all fingertips tightly down onto thumb',
      onCurlMismatch: 'Curl all fingers tightly into palm'
    }
  },

  // F: Index touches thumb tip ("OK" ring), middle/ring/pinky extended straight up
  'F': {
    letter: 'F',
    isMotion: false,
    curls: { thumb: HALF, index: HALF, middle: EXT, ring: EXT, pinky: EXT },
    thumbTouches: { toIndexTip: { mean: 0.15, std: 0.14 } },
    spreads: { middleToRing: { mean: 0.22, std: 0.12 } },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Touch index tip to thumb tip, extend other 3 fingers straight up',
      onThumbMismatch: 'Touch index tip to thumb tip forming a circle'
    }
  },

  // G: Index and thumb extended horizontal pointing sideways
  'G': {
    letter: 'G',
    isMotion: false,
    curls: { thumb: EXT, index: EXT, middle: CURL, ring: CURL, pinky: CURL },
    orientation: { palmFacingSide: true, handPointingHorizontal: true },
    feedback: {
      ideal: 'Point index and thumb horizontally across chest',
      onOrientationMismatch: 'Turn hand sideways to point horizontally'
    }
  },

  // H: Index and middle extended horizontal together pointing sideways
  'H': {
    letter: 'H',
    isMotion: false,
    curls: { thumb: CURL, index: EXT, middle: EXT, ring: CURL, pinky: CURL },
    spreads: { indexToMiddle: { mean: 0.12, std: 0.10 } },
    orientation: { palmFacingSide: true, handPointingHorizontal: true },
    feedback: {
      ideal: 'Extend index and middle horizontally together pointing sideways',
      onSpreadMismatch: 'Keep index and middle fingers pressed together'
    }
  },

  // I: Pinky straight up, other 3 curled, thumb across
  'I': {
    letter: 'I',
    isMotion: false,
    curls: { thumb: CURL, index: CURL, middle: CURL, ring: CURL, pinky: EXT },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Extend pinky finger straight up, curl others into fist',
      onCurlMismatch: 'Only pinky should be extended'
    }
  },

  // J: Dynamic motion letter (Pinky trace swoop)
  'J': {
    letter: 'J',
    isMotion: true,
    curls: { thumb: CURL, index: CURL, middle: CURL, ring: CURL, pinky: EXT },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Hold pinky up and trace a curved J swoop downward',
    }
  },

  // K: Index up, middle angled forward, thumb on middle knuckle
  'K': {
    letter: 'K',
    isMotion: false,
    curls: { thumb: EXT, index: EXT, middle: EXT, ring: CURL, pinky: CURL },
    thumbTouches: { toMiddleTip: { mean: 0.32, std: 0.18 } },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Index upright, middle forward at angle, thumb resting between them',
      onThumbMismatch: 'Rest thumb on middle knuckle'
    }
  },

  // L: Index up, thumb out at 90 degrees forming L
  'L': {
    letter: 'L',
    isMotion: false,
    curls: { thumb: EXT, index: EXT, middle: CURL, ring: CURL, pinky: CURL },
    spreads: { thumbToIndex: { mean: 0.70, std: 0.20 } },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Index straight up, thumb extended wide forming an L',
      onThumbMismatch: 'Extend thumb outward at 90 degrees'
    }
  },

  // M: Thumb tucked under first 3 fingers (curled over thumb)
  'M': {
    letter: 'M',
    isMotion: false,
    curls: { thumb: CURL, index: CURL, middle: CURL, ring: CURL, pinky: CURL },
    thumbTouches: { toPinkyTip: { mean: 0.28, std: 0.16 } },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Tuck thumb under index, middle, and ring fingers',
      onThumbMismatch: 'Slide thumb under 3 fingers toward pinky side'
    }
  },

  // N: Thumb tucked under first 2 fingers (curled over thumb)
  'N': {
    letter: 'N',
    isMotion: false,
    curls: { thumb: CURL, index: CURL, middle: CURL, ring: CURL, pinky: CURL },
    thumbTouches: { toRingTip: { mean: 0.28, std: 0.16 } },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Tuck thumb under index and middle fingers',
      onThumbMismatch: 'Slide thumb under 2 fingers toward ring finger'
    }
  },

  // O: All fingers touch thumb tip forming O circle
  'O': {
    letter: 'O',
    isMotion: false,
    curls: { thumb: HALF, index: HALF, middle: HALF, ring: HALF, pinky: HALF },
    thumbTouches: {
      toIndexTip: { mean: 0.15, std: 0.12 },
      toMiddleTip: { mean: 0.15, std: 0.12 }
    },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Touch all fingertips to thumb tip forming an O',
      onThumbMismatch: 'Pinch fingertips to thumb tip'
    }
  },

  // P: K shape pointing downward
  'P': {
    letter: 'P',
    isMotion: false,
    curls: { thumb: EXT, index: EXT, middle: EXT, ring: CURL, pinky: CURL },
    orientation: { handPointingDown: true },
    feedback: {
      ideal: 'Form K handshape and point hand downward toward floor',
      onOrientationMismatch: 'Point hand downward'
    }
  },

  // Q: G shape pointing downward
  'Q': {
    letter: 'Q',
    isMotion: false,
    curls: { thumb: EXT, index: EXT, middle: CURL, ring: CURL, pinky: CURL },
    orientation: { handPointingDown: true },
    feedback: {
      ideal: 'Form G handshape and point hand downward toward floor',
      onOrientationMismatch: 'Point hand downward'
    }
  },

  // R: Index and middle upright crossed over each other
  'R': {
    letter: 'R',
    isMotion: false,
    curls: { thumb: CURL, index: EXT, middle: EXT, ring: CURL, pinky: CURL },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Cross middle finger over the front of index finger',
      onSpreadMismatch: 'Cross middle finger over index finger'
    }
  },

  // S: Fist with thumb folded ACROSS front of all 4 fingers
  'S': {
    letter: 'S',
    isMotion: false,
    curls: { thumb: CURL, index: CURL, middle: CURL, ring: CURL, pinky: CURL },
    thumbTouches: { toMiddleTip: { mean: 0.32, std: 0.16 } },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Fist with thumb wrapped across front of fingers',
      onThumbMismatch: 'Wrap thumb across front of fingers, not on the side'
    }
  },

  // T: Thumb tucked between index and middle fingers
  'T': {
    letter: 'T',
    isMotion: false,
    curls: { thumb: CURL, index: CURL, middle: CURL, ring: CURL, pinky: CURL },
    thumbTouches: { toIndexPip: { mean: 0.22, std: 0.14 } },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Tuck thumb between index and middle knuckles',
      onThumbMismatch: 'Tuck thumb upright between index and middle fingers'
    }
  },

  // U: Index and middle upright pressed together
  'U': {
    letter: 'U',
    isMotion: false,
    curls: { thumb: CURL, index: EXT, middle: EXT, ring: CURL, pinky: CURL },
    spreads: { indexToMiddle: { mean: 0.12, std: 0.09 } },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Index and middle straight up pressed tightly together',
      onSpreadMismatch: 'Keep index and middle fingers pressed together'
    }
  },

  // V: Index and middle upright spread apart in V
  'V': {
    letter: 'V',
    isMotion: false,
    curls: { thumb: CURL, index: EXT, middle: EXT, ring: CURL, pinky: CURL },
    spreads: { indexToMiddle: { mean: 0.38, std: 0.14 } },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Separate index and middle into a clean V shape',
      onSpreadMismatch: 'Spread index and middle fingers apart into a V'
    }
  },

  // W: Index, middle, and ring upright spread in W
  'W': {
    letter: 'W',
    isMotion: false,
    curls: { thumb: CURL, index: EXT, middle: EXT, ring: EXT, pinky: CURL },
    spreads: {
      indexToMiddle: { mean: 0.30, std: 0.12 },
      middleToRing: { mean: 0.30, std: 0.12 }
    },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Index, middle, and ring fingers extended and spread evenly',
      onSpreadMismatch: 'Spread three fingers into a W'
    }
  },

  // X: Index hooked, others curled
  'X': {
    letter: 'X',
    isMotion: false,
    curls: { thumb: CURL, index: HALF, middle: CURL, ring: CURL, pinky: CURL },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Bend index finger into a hook like letter X',
      onCurlMismatch: 'Bend index into a hook shape'
    }
  },

  // Y: Thumb and pinky extended, middle 3 curled
  'Y': {
    letter: 'Y',
    isMotion: false,
    curls: { thumb: EXT, index: CURL, middle: CURL, ring: CURL, pinky: EXT },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Extend thumb and pinky outward, curl middle three',
      onCurlMismatch: 'Curl middle 3 fingers while extending thumb and pinky'
    }
  },

  // Z: Dynamic motion letter (Index traces Z)
  'Z': {
    letter: 'Z',
    isMotion: true,
    curls: { thumb: CURL, index: EXT, middle: CURL, ring: CURL, pinky: CURL },
    orientation: { palmFacingCamera: true },
    feedback: {
      ideal: 'Extend index finger and trace a 3-stroke Z in the air',
    }
  }
};

/**
 * Computes the continuous Gaussian similarity between the user's current hand pose
 * and a target letter prototype.
 */
export function computePrototypeSimilarity(
  features: HandPoseFeatures,
  targetLetter: string
): PrototypeSimilarityResult {
  const proto = LETTER_PROTOTYPES[targetLetter.toUpperCase()];
  if (!proto) {
    return {
      letter: targetLetter,
      overallScore: 0,
      band: 'LOW',
      curlScore: 0,
      spreadScore: 0,
      thumbScore: 0,
      orientationScore: 0,
      feedback: `Unknown letter prototype: ${targetLetter}`
    };
  }

  // 1. Curl Similarity (5 fingers)
  const curlT = gaussianScore(features.curls.thumb, proto.curls.thumb);
  const curlI = gaussianScore(features.curls.index, proto.curls.index);
  const curlM = gaussianScore(features.curls.middle, proto.curls.middle);
  const curlR = gaussianScore(features.curls.ring, proto.curls.ring);
  const curlP = gaussianScore(features.curls.pinky, proto.curls.pinky);
  const curlScore = (curlT + curlI + curlM + curlR + curlP) / 5;

  // 2. Spread Similarity
  let spreadScore = 1.0;
  if (proto.spreads) {
    const scores: number[] = [];
    if (proto.spreads.indexToMiddle) {
      scores.push(gaussianScore(features.spreads.indexToMiddle, proto.spreads.indexToMiddle));
    }
    if (proto.spreads.middleToRing) {
      scores.push(gaussianScore(features.spreads.middleToRing, proto.spreads.middleToRing));
    }
    if (proto.spreads.ringToPinky) {
      scores.push(gaussianScore(features.spreads.ringToPinky, proto.spreads.ringToPinky));
    }
    if (proto.spreads.thumbToIndex) {
      scores.push(gaussianScore(features.spreads.thumbToIndex, proto.spreads.thumbToIndex));
    }
    if (scores.length > 0) {
      spreadScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }

  // 3. Thumb Touch Proximity
  let thumbScore = 1.0;
  if (proto.thumbTouches) {
    const scores: number[] = [];
    if (proto.thumbTouches.toIndexTip) {
      scores.push(gaussianScore(features.thumbTouches.toIndexTip, proto.thumbTouches.toIndexTip));
    }
    if (proto.thumbTouches.toMiddleTip) {
      scores.push(gaussianScore(features.thumbTouches.toMiddleTip, proto.thumbTouches.toMiddleTip));
    }
    if (proto.thumbTouches.toRingTip) {
      scores.push(gaussianScore(features.thumbTouches.toRingTip, proto.thumbTouches.toRingTip));
    }
    if (proto.thumbTouches.toPinkyTip) {
      scores.push(gaussianScore(features.thumbTouches.toPinkyTip, proto.thumbTouches.toPinkyTip));
    }
    if (proto.thumbTouches.toIndexPip) {
      scores.push(gaussianScore(features.thumbTouches.toIndexPip, proto.thumbTouches.toIndexPip));
    }
    if (proto.thumbTouches.toIndexMcp) {
      scores.push(gaussianScore(features.thumbTouches.toIndexMcp, proto.thumbTouches.toIndexMcp));
    }
    if (scores.length > 0) {
      thumbScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    }
  }

  // 4. Orientation Alignment
  let orientationScore = 0.95;
  if (proto.orientation) {
    if (proto.orientation.handPointingDown) {
      orientationScore = features.handPointingDown ? 0.95 : 0.55;
    } else if (proto.orientation.palmFacingSide || proto.orientation.handPointingHorizontal) {
      orientationScore = (features.palmFacingSide || features.handPointingHorizontal) ? 0.95 : 0.65;
    } else if (proto.orientation.palmFacingCamera) {
      orientationScore = features.palmFacingCamera ? 0.95 : 0.75;
    }
  }

  // 5. Special R Overlap check
  if (targetLetter === 'R') {
    const overlapScore = Math.max(0, 1.0 - features.indexMiddleXOverlap * 3);
    spreadScore = spreadScore * 0.4 + overlapScore * 0.6;
  }

  // 6. Weighted Total Score
  const overallScore = Number(
    (curlScore * 0.45 + spreadScore * 0.25 + thumbScore * 0.15 + orientationScore * 0.15).toFixed(3)
  );

  // Confidence Bands: HIGH >= 0.70, MEDIUM >= 0.45, LOW < 0.45
  let band: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (overallScore >= 0.70) {
    band = 'HIGH';
  } else if (overallScore >= 0.45) {
    band = 'MEDIUM';
  } else {
    band = 'LOW';
  }

  // Meaningful Educational Feedback
  let feedback = proto.feedback.ideal;
  if (band === 'LOW' || band === 'MEDIUM') {
    if (curlScore < 0.60 && proto.feedback.onCurlMismatch) {
      feedback = proto.feedback.onCurlMismatch;
    } else if (spreadScore < 0.60 && proto.feedback.onSpreadMismatch) {
      feedback = proto.feedback.onSpreadMismatch;
    } else if (thumbScore < 0.60 && proto.feedback.onThumbMismatch) {
      feedback = proto.feedback.onThumbMismatch;
    } else if (orientationScore < 0.70 && proto.feedback.onOrientationMismatch) {
      feedback = proto.feedback.onOrientationMismatch;
    }
  }

  return {
    letter: targetLetter,
    overallScore,
    band,
    curlScore,
    spreadScore,
    thumbScore,
    orientationScore,
    feedback
  };
}
