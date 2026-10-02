import { HandPoseFeatures } from './handFeatureExtractor';

export interface ConfusionDiscriminationResult {
  isAmbiguous: boolean;
  competingLetter: string | null;
  confidencePenalty: number; // 0.0 (no penalty) to 0.40 (heavy penalty if impostor clearly shown)
  clarifyingHint: string | null;
}

/**
 * Confusion-Aware Letter Pair Discriminator
 * Applies targeted geometric tests to differentiate naturally confusable ASL letter pairs.
 */
export function discriminateConfusablePairs(
  features: HandPoseFeatures,
  targetLetter: string
): ConfusionDiscriminationResult {
  const target = targetLetter.toUpperCase();

  // 1. Pair: B vs 4 (4 fingers up)
  // B requires fingers pressed together; 4 has spread fingers
  if (target === 'B') {
    const isSpread = features.spreads.indexToMiddle > 0.26 || features.spreads.middleToRing > 0.26;
    if (isSpread) {
      return {
        isAmbiguous: true,
        competingLetter: '4',
        confidencePenalty: 0.25,
        clarifyingHint: 'Keep your four fingers pressed close together for B (not spread apart)'
      };
    }
  }

  // 2. Pair: D vs L (Index extended)
  // L has thumb extended wide at 90 deg; D has thumb touching middle/ring forming circle
  if (target === 'D') {
    const thumbWide = features.spreads.thumbToIndex > 0.55 && features.curls.thumb < 0.35;
    if (thumbWide) {
      return {
        isAmbiguous: true,
        competingLetter: 'L',
        confidencePenalty: 0.35,
        clarifyingHint: 'Touch thumb to middle finger to form D (keep thumb close, not in an L shape)'
      };
    }
  } else if (target === 'L') {
    const thumbTouching = features.thumbTouches.toMiddleTip < 0.30 || features.spreads.thumbToIndex < 0.38;
    if (thumbTouching) {
      return {
        isAmbiguous: true,
        competingLetter: 'D',
        confidencePenalty: 0.30,
        clarifyingHint: 'Extend your thumb outward wide at 90 degrees to form an L'
      };
    }
  }

  // 3. Triplet: U vs V vs R (Index & Middle extended)
  if (target === 'U') {
    const isSpread = features.spreads.indexToMiddle > 0.26;
    if (isSpread) {
      return {
        isAmbiguous: true,
        competingLetter: 'V',
        confidencePenalty: 0.30,
        clarifyingHint: 'Keep index and middle fingers pressed tightly together for U'
      };
    }
  } else if (target === 'V') {
    const isTogether = features.spreads.indexToMiddle < 0.20;
    if (isTogether) {
      return {
        isAmbiguous: true,
        competingLetter: 'U',
        confidencePenalty: 0.30,
        clarifyingHint: 'Spread index and middle fingers apart into a V shape'
      };
    }
  } else if (target === 'R') {
    const notCrossed = features.indexMiddleXOverlap > 0.22;
    if (notCrossed) {
      return {
        isAmbiguous: true,
        competingLetter: 'U',
        confidencePenalty: 0.28,
        clarifyingHint: 'Cross your middle finger over the front of index finger for R'
      };
    }
  }

  // 4. Triplet: M vs N vs T (Thumb tucked under curled fingers)
  if (target === 'M') {
    // Thumb should reach towards pinky/ring side
    const thumbTooShort = features.thumbTouches.toPinkyTip > 0.42 && features.thumbTouches.toIndexPip < 0.26;
    if (thumbTooShort) {
      return {
        isAmbiguous: true,
        competingLetter: 'T',
        confidencePenalty: 0.25,
        clarifyingHint: 'Slide thumb under 3 fingers (index, middle, ring) for M'
      };
    }
  } else if (target === 'T') {
    // Thumb between index and middle
    const thumbUnderThree = features.thumbTouches.toPinkyTip < 0.32;
    if (thumbUnderThree) {
      return {
        isAmbiguous: true,
        competingLetter: 'M',
        confidencePenalty: 0.25,
        clarifyingHint: 'Tuck thumb between index and middle fingers for T'
      };
    }
  }

  // 5. Triplet: A vs S vs E (Fist variants)
  if (target === 'A') {
    // Thumb must be upright alongside index, not folded across front (S)
    const thumbAcrossFront = features.thumbTouches.toMiddleTip < 0.35 && features.curls.thumb > 0.60;
    if (thumbAcrossFront) {
      return {
        isAmbiguous: true,
        competingLetter: 'S',
        confidencePenalty: 0.28,
        clarifyingHint: 'Keep thumb upright against the side of index finger for A'
      };
    }
  } else if (target === 'S') {
    // Thumb must fold across the front of fingers
    const thumbOnSide = features.thumbTouches.toIndexPip < 0.30 && features.curls.thumb < 0.40;
    if (thumbOnSide) {
      return {
        isAmbiguous: true,
        competingLetter: 'A',
        confidencePenalty: 0.28,
        clarifyingHint: 'Fold thumb across the front of curled fingers for S'
      };
    }
  } else if (target === 'E') {
    // Fingers clawed tightly down onto thumb
    const fingersNotTightlyCurled = features.curls.index < 0.65 || features.curls.middle < 0.65;
    if (fingersNotTightlyCurled) {
      return {
        isAmbiguous: true,
        competingLetter: 'C',
        confidencePenalty: 0.25,
        clarifyingHint: 'Curl all fingertips tightly down onto thumb for E'
      };
    }
  }

  // 6. Pair: G vs H (Horizontal pointing)
  if (target === 'G') {
    const middleExtended = features.curls.middle < 0.45;
    if (middleExtended) {
      return {
        isAmbiguous: true,
        competingLetter: 'H',
        confidencePenalty: 0.30,
        clarifyingHint: 'Curl middle finger into palm; only extend index and thumb for G'
      };
    }
  } else if (target === 'H') {
    const middleCurled = features.curls.middle > 0.60;
    if (middleCurled) {
      return {
        isAmbiguous: true,
        competingLetter: 'G',
        confidencePenalty: 0.30,
        clarifyingHint: 'Extend both index and middle fingers together for H'
      };
    }
  }

  // 7. Pair: C vs O (Arc vs pinched circle)
  if (target === 'C') {
    const pinchedClosed = features.thumbTouches.toIndexTip < 0.18 && features.thumbTouches.toMiddleTip < 0.18;
    if (pinchedClosed) {
      return {
        isAmbiguous: true,
        competingLetter: 'O',
        confidencePenalty: 0.25,
        clarifyingHint: 'Open a gap between thumb and fingertips for C'
      };
    }
  } else if (target === 'O') {
    const gapOpen = features.thumbTouches.toIndexTip > 0.35;
    if (gapOpen) {
      return {
        isAmbiguous: true,
        competingLetter: 'C',
        confidencePenalty: 0.25,
        clarifyingHint: 'Touch fingertips to thumb tip to form a closed O'
      };
    }
  }

  // 8. Pair: K vs P / G vs Q (Orientation down)
  if (target === 'K' && features.handPointingDown) {
    return {
      isAmbiguous: true,
      competingLetter: 'P',
      confidencePenalty: 0.25,
      clarifyingHint: 'Hold hand upright facing camera for K (pointing down is P)'
    };
  } else if (target === 'P' && !features.handPointingDown) {
    return {
      isAmbiguous: true,
      competingLetter: 'K',
      confidencePenalty: 0.25,
      clarifyingHint: 'Point hand downward toward the floor for P'
    };
  }

  return {
    isAmbiguous: false,
    competingLetter: null,
    confidencePenalty: 0.0,
    clarifyingHint: null
  };
}
