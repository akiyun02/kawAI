import { Landmark3D, RecognitionEvaluation, RecognitionState, QualityGateResult } from '../types';
import { evaluateHandQualityGate } from './handQualityGate';
import { extractHandPoseFeatures, HandPoseFeatures } from './handFeatureExtractor';
import { computePrototypeSimilarity, PrototypeSimilarityResult, LETTER_PROTOTYPES } from './letterPrototypes';
import { discriminateConfusablePairs, ConfusionDiscriminationResult } from './confusionMatrixDiscriminator';
import { globalMotionRecognizer } from './temporalMotionRecognizer';
import { classifyWithKaggleModel } from './mlClassifier';

export interface TargetAwareEvaluationResult {
  targetLetter: string;
  matchedLetter: string | null;
  isConfirmed: boolean;
  confidenceScore: number; // 0 to 100
  evidenceProgress: number; // 0 to 100%
  band: 'HIGH' | 'MEDIUM' | 'LOW';
  motionState: string;
  feedbackMessage: string;
  state: RecognitionState;
  features: HandPoseFeatures | null;
  protoSimilarity: PrototypeSimilarityResult | null;
  confusion: ConfusionDiscriminationResult | null;
}

export class TargetAwareRecognizer {
  private activeTarget: string = '';
  private accumulatedEvidence: number = 0; // 0.0 to 1.0
  private isAwaitingRelease: boolean = false;
  private lastConfirmedLetter: string | null = null;
  private confirmationStartTime: number = 0;

  // Leaky integrator constants
  private readonly EVIDENCE_TRIGGER_THRESHOLD = 0.75;
  private readonly EVIDENCE_STEP_HIGH = 0.34;
  private readonly EVIDENCE_STEP_MEDIUM = 0.12;
  private readonly EVIDENCE_DECAY = 0.18;

  public reset(newTarget?: string) {
    if (newTarget && newTarget !== this.activeTarget) {
      this.activeTarget = newTarget;
      this.isAwaitingRelease = false;
      this.accumulatedEvidence = 0;
      this.confirmationStartTime = 0;
    } else if (!newTarget) {
      this.accumulatedEvidence = 0;
      this.isAwaitingRelease = false;
      this.lastConfirmedLetter = null;
      this.confirmationStartTime = 0;
    }
  }

  /**
   * Main evaluation loop: observes hand against the TARGET LETTER
   */
  public evaluate(
    landmarks: Landmark3D[] | null | undefined,
    targetLetter: string,
    providedHandedness?: 'Left' | 'Right',
    timestamp: number = performance.now()
  ): TargetAwareEvaluationResult {
    const target = (targetLetter || 'A').toUpperCase();
    if (target !== this.activeTarget) {
      this.reset(target);
    }

    // 1. Hand Quality Gate Validation
    const quality: QualityGateResult = evaluateHandQualityGate(landmarks);
    if (!quality.isUsable || !landmarks || landmarks.length < 21) {
      this.accumulatedEvidence = Math.max(0, this.accumulatedEvidence - this.EVIDENCE_DECAY);
      return {
        targetLetter: target,
        matchedLetter: null,
        isConfirmed: false,
        confidenceScore: 0,
        evidenceProgress: 0,
        band: 'LOW',
        motionState: 'NO_HAND',
        feedbackMessage: quality.message || 'Position hand in camera frame',
        state: quality.reason === 'NO_HAND' ? 'IDLE' : 'HAND_DETECTED',
        features: null,
        protoSimilarity: null,
        confusion: null
      };
    }

    // 2. Motion-Dependent Alphabet Letters (J and Z)
    if (target === 'J' || target === 'Z') {
      const motionRes = globalMotionRecognizer.evaluate(landmarks, target as any, providedHandedness);
      const isMatched = motionRes.isMatched;
      return {
        targetLetter: target,
        matchedLetter: isMatched ? target : null,
        isConfirmed: isMatched,
        confidenceScore: isMatched ? 96 : motionRes.progress,
        evidenceProgress: motionRes.progress,
        band: isMatched ? 'HIGH' : (motionRes.progress > 40 ? 'MEDIUM' : 'LOW'),
        motionState: 'MOTION_TRACKING',
        feedbackMessage: isMatched ? `🟢 Great! Letter "${target}" confirmed!` : motionRes.feedback,
        state: isMatched ? 'CONFIRMED' : (motionRes.progress > 0 ? 'CANDIDATE' : 'READY'),
        features: null,
        protoSimilarity: null,
        confusion: null
      };
    }

    // 3. Extract Invariant Geometric Hand Features
    const features = extractHandPoseFeatures(landmarks, providedHandedness, timestamp);

    // 4. Hand Motion & Transition Inhibition
    // Rapid hand motion (e.g. moving between letters) inhibits accidental triggers
    if (features.motionState === 'TRANSITIONING') {
      this.accumulatedEvidence = Math.max(0, this.accumulatedEvidence - 0.10);
      return {
        targetLetter: target,
        matchedLetter: null,
        isConfirmed: false,
        confidenceScore: Math.round(this.accumulatedEvidence * 100),
        evidenceProgress: Math.round(this.accumulatedEvidence * 100),
        band: 'LOW',
        motionState: 'TRANSITIONING',
        feedbackMessage: `Forming "${target}"...`,
        state: 'READY',
        features,
        protoSimilarity: null,
        confusion: null
      };
    }

    // 5. Compare with Target Letter Prototype
    const protoResult = computePrototypeSimilarity(features, target);

    // 6. Confusion Pair Discrimination
    const confusion = discriminateConfusablePairs(features, target);

    // Calculate effective confidence score
    let effectiveConfidence = Math.max(0, protoResult.overallScore - confusion.confidencePenalty);

    // Optional ML validation bonus (Strategy A hybrid boost)
    const ml = classifyWithKaggleModel(landmarks, providedHandedness);
    if (ml && ml.predictedSign === target && ml.confidence > 70) {
      effectiveConfidence = Math.min(1.0, effectiveConfidence + 0.05);
    }

    // 7. Anti-Duplicate Latching: If user continues holding the exact confirmed letter, wait for release
    if (this.isAwaitingRelease && this.lastConfirmedLetter === target) {
      // Check if user has relaxed or started a new sign
      if (effectiveConfidence < 0.35 || features.motionState !== 'STABLE') {
        this.isAwaitingRelease = false;
        this.accumulatedEvidence = 0;
      } else {
        return {
          targetLetter: target,
          matchedLetter: null,
          isConfirmed: false,
          confidenceScore: Math.round(effectiveConfidence * 100),
          evidenceProgress: 100,
          band: 'HIGH',
          motionState: features.motionState,
          feedbackMessage: `Letter "${target}" logged! Release or change hand for next letter`,
          state: 'RELEASE',
          features,
          protoSimilarity: protoResult,
          confusion
        };
      }
    }

    // 8. Leaky Temporal Evidence Accumulator
    if (protoResult.band === 'HIGH' && !confusion.isAmbiguous) {
      this.accumulatedEvidence = Math.min(1.0, this.accumulatedEvidence + this.EVIDENCE_STEP_HIGH);
    } else if (protoResult.band === 'MEDIUM' || (protoResult.band === 'HIGH' && confusion.isAmbiguous)) {
      this.accumulatedEvidence = Math.min(1.0, this.accumulatedEvidence + this.EVIDENCE_STEP_MEDIUM);
    } else {
      this.accumulatedEvidence = Math.max(0, this.accumulatedEvidence - this.EVIDENCE_DECAY);
    }

    const evidenceProgress = Math.round(this.accumulatedEvidence * 100);
    const confidencePct = Math.round(effectiveConfidence * 100);

    // 9. Confirmation Event Trigger
    const isConfirmed = this.accumulatedEvidence >= this.EVIDENCE_TRIGGER_THRESHOLD && effectiveConfidence >= 0.52;

    if (isConfirmed) {
      this.isAwaitingRelease = true;
      this.lastConfirmedLetter = target;
      return {
        targetLetter: target,
        matchedLetter: target,
        isConfirmed: true,
        confidenceScore: confidencePct,
        evidenceProgress: 100,
        band: 'HIGH',
        motionState: features.motionState,
        feedbackMessage: `🟢 Great! Letter "${target}" confirmed!`,
        state: 'CONFIRMED',
        features,
        protoSimilarity: protoResult,
        confusion
      };
    }

    // Candidate holding or observing
    if (this.accumulatedEvidence > 0.30) {
      const hint = confusion.clarifyingHint || protoResult.feedback;
      return {
        targetLetter: target,
        matchedLetter: target,
        isConfirmed: false,
        confidenceScore: confidencePct,
        evidenceProgress,
        band: protoResult.band,
        motionState: features.motionState,
        feedbackMessage: `🟡 Hold "${target}" (${evidenceProgress}%) — ${hint}`,
        state: 'CANDIDATE',
        features,
        protoSimilarity: protoResult,
        confusion
      };
    }

    // Ready / observing
    const idleMsg = confusion.clarifyingHint || `Show sign for "${target}"`;
    return {
      targetLetter: target,
      matchedLetter: null,
      isConfirmed: false,
      confidenceScore: confidencePct,
      evidenceProgress: 0,
      band: protoResult.band,
      motionState: features.motionState,
      feedbackMessage: idleMsg,
      state: 'READY',
      features,
      protoSimilarity: protoResult,
      confusion
    };
  }

  /**
   * Open Mode: Identifies the best-matching letter across all 26 letters
   */
  public evaluateOpenMode(
    landmarks: Landmark3D[] | null | undefined,
    providedHandedness?: 'Left' | 'Right'
  ): {
    topLetter: string;
    score: number;
    band: 'HIGH' | 'MEDIUM' | 'LOW';
    feedback: string;
  } {
    if (!landmarks || landmarks.length < 21) {
      return { topLetter: 'UNKNOWN', score: 0, band: 'LOW', feedback: 'No hand detected' };
    }

    const features = extractHandPoseFeatures(landmarks, providedHandedness);
    let bestLetter = 'UNKNOWN';
    let bestScore = 0;
    let bestBand: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    let bestFeedback = 'Form a letter';

    for (const letter of Object.keys(LETTER_PROTOTYPES)) {
      if (letter === 'J' || letter === 'Z') continue;
      const res = computePrototypeSimilarity(features, letter);
      const conf = discriminateConfusablePairs(features, letter);
      const eff = Math.max(0, res.overallScore - conf.confidencePenalty);
      if (eff > bestScore) {
        bestScore = eff;
        bestLetter = letter;
        bestBand = res.band;
        bestFeedback = conf.clarifyingHint || res.feedback;
      }
    }

    return {
      topLetter: bestScore >= 0.50 ? bestLetter : 'UNKNOWN',
      score: Math.round(bestScore * 100),
      band: bestBand,
      feedback: bestFeedback
    };
  }
}

export const globalTargetAwareRecognizer = new TargetAwareRecognizer();
