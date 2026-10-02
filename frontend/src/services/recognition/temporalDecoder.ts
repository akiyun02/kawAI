/**
 * SIGNQUEST — Target-Aware Temporal Sequence Decoder
 * Manages evidence accumulation, hysteresis state machine, transition suppression,
 * and pedagogical guidance for natural, forgiving ASL fingerspelling recognition.
 */

import { SequenceMotionState } from './sequenceBuffer';
import { TemporalInferenceResult } from './temporalRecognizer';

export type RecognitionLifecycleState =
  | 'IDLE'          // Hand not detected or resting
  | 'OBSERVING'     // Hand active, forming gesture
  | 'CANDIDATE'     // Target letter or high-confidence gesture detected
  | 'CONFIRMED'     // Sign sustained sufficiently; fires game success
  | 'RELEASED';     // Sign completed; requires release/transition before next trigger

export interface TemporalDecoderConfig {
  targetPosteriorThreshold: number; // Min posterior probability to count as candidate (default 0.20)
  openPosteriorThreshold: number;   // Min probability in open/unprompted mode (default 0.25)
  openMarginThreshold: number;      // Margin over runner-up in open mode (default 0.05)
  confirmationFrames: number;       // Frames required to confirm target (default 4 frames ~120ms at 30 FPS)
  decayRate: number;                // Evidence decay per frame when match is lost (default 0.18)
}

export const DEFAULT_DECODER_CONFIG: TemporalDecoderConfig = {
  targetPosteriorThreshold: 0.20,
  openPosteriorThreshold: 0.25,
  openMarginThreshold: 0.05,
  confirmationFrames: 4,
  decayRate: 0.18
};

export interface DecoderOutput {
  state: RecognitionLifecycleState;
  recognizedLetter: string;
  isCorrect: boolean;
  confidence: number;
  holdProgress: number; // 0.0 to 1.0
  feedbackMessage: string;
  isConfirmedThisFrame: boolean;
  motionState: SequenceMotionState;
}

export class TemporalDecoder {
  private config: TemporalDecoderConfig;
  private state: RecognitionLifecycleState = 'IDLE';
  private accumulatedEvidence: number = 0;
  private currentCandidate: string | null = null;
  private lastConfirmedLetter: string | null = null;
  private confirmedCooldownFrames: number = 0;

  constructor(config: Partial<TemporalDecoderConfig> = {}) {
    this.config = { ...DEFAULT_DECODER_CONFIG, ...config };
  }

  public reset(): void {
    this.state = 'IDLE';
    this.accumulatedEvidence = 0;
    this.currentCandidate = null;
    this.lastConfirmedLetter = null;
    this.confirmedCooldownFrames = 0;
  }

  /**
   * Evaluates the latest frame given sequence inference results, motion state, and active target letter.
   */
  public decode(
    inference: TemporalInferenceResult,
    motionState: SequenceMotionState,
    targetLetter?: string | null
  ): DecoderOutput {
    let isConfirmedThisFrame = false;

    // Handle cooldown after confirmation (prevent multiple rapid triggers for the same sign)
    if (this.confirmedCooldownFrames > 0) {
      this.confirmedCooldownFrames--;
      if (motionState === 'TRANSITIONING') {
        // Fast release if hand moved away
        this.confirmedCooldownFrames = 0;
      }
    }

    const isDynamicLetter = targetLetter === 'J' || targetLetter === 'Z';

// Anatomically related clusters where signers' subtle hand postures share ensemble probabilities
const CLUSTERS: Record<string, string[]> = {
  // Fist variants (thumb placement nuances):
  'A': ['A', 'S', 'T', 'M', 'N', 'E'],
  'S': ['S', 'A', 'T', 'M', 'N', 'E'],
  'T': ['T', 'S', 'A', 'M', 'N', 'E'],
  'M': ['M', 'N', 'T', 'S', 'A'],
  'N': ['N', 'M', 'T', 'S', 'A'],
  'E': ['E', 'A', 'S', 'O', 'C'],
  // 2-finger upward extensions (spread / cross / touch):
  'U': ['U', 'V', 'R', 'K', 'H'],
  'V': ['V', 'U', 'R', 'K'],
  'R': ['R', 'U', 'V', 'K'],
  'K': ['K', 'V', 'U', 'D', 'P'],
  'H': ['H', 'U', 'G', 'Z'],
  // 3-finger flared with index-thumb loop:
  'F': ['F', 'B', 'D', 'W', '9'],
  // Oval / circular shapes:
  'O': ['O', 'C', 'E'],
  // Index-pointing / horizontal variants:
  'G': ['G', 'Q', 'H', 'D', 'Z'],
  'Q': ['Q', 'G', 'P'],
  'D': ['D', 'Z', 'G'],
  'Z': ['Z', 'D', 'G'],
  'J': ['J', 'I', 'Y'],
  'I': ['I', 'J', 'Y'],
};

    // 1. Determine Match Quality
    let isTargetMatch = false;
    let effectiveConfidence = 0;
    let candidateLetter = 'UNKNOWN';

    const top1 = inference.topPredictions?.[0] || { letter: inference.predictedClass, probability: inference.confidence };
    const top2 = inference.topPredictions?.[1] || { letter: 'NONE', probability: 0 };

    if (targetLetter) {
      const cleanTarget = targetLetter.toUpperCase();
      let targetProb = inference.probabilities[cleanTarget] || 0;

      // Hysteresis bonus: if we are already actively accumulating evidence for cleanTarget,
      // grant a stability bonus (+0.08) so minor frame-to-frame noise between sister letters doesn't flicker
      if (this.state === 'CANDIDATE' && this.currentCandidate === cleanTarget) {
        targetProb += 0.08;
      }

      const isTargetTop1 = top1.letter === cleanTarget || inference.predictedClass === cleanTarget;
      const isTargetTop2 = top2.letter === cleanTarget;

      // Check if top prediction belongs to the target's anatomical sibling cluster
      const cluster = CLUSTERS[cleanTarget] || [cleanTarget];
      const isTopInCluster = cluster.includes(top1.letter);

      const isFistTarget = ['A', 'S', 'T', 'M', 'N', 'E'].includes(cleanTarget);
      const fistMass = (inference.probabilities['A'] || 0) +
                       (inference.probabilities['S'] || 0) +
                       (inference.probabilities['T'] || 0) +
                       (inference.probabilities['M'] || 0) +
                       (inference.probabilities['N'] || 0) +
                       (inference.probabilities['E'] || 0);
      const isFistMatch = isFistTarget && fistMass >= 0.40 && targetProb >= 0.08;

      // Match criteria:
      // (a) Target posterior probability meets target threshold (>= 0.18)
      // (b) OR target is Top-1 with probability >= 0.15
      // (c) OR target is Top-2 with probability >= 0.15 and within 0.08 of Top-1
      // (d) OR top prediction is a cluster sibling AND target has significant probability (>= 0.10)
      // (e) OR target is a Fist Sign and fist cluster mass is dominant (fistMass >= 0.40)
      if (
        targetProb >= this.config.targetPosteriorThreshold ||
        (isTargetTop1 && top1.probability >= 0.15) ||
        (isTargetTop2 && targetProb >= 0.15 && (top1.probability - targetProb) <= 0.08) ||
        (isTopInCluster && targetProb >= 0.10) ||
        isFistMatch
      ) {
        isTargetMatch = true;
        candidateLetter = cleanTarget;
        effectiveConfidence = Math.max(targetProb, isTargetTop1 ? top1.probability : (isFistMatch ? fistMass * 0.45 : targetProb));
      } else {
        // If not matching target, check if another distinct sign is clearly being held
        if (
          top1.letter !== 'UNCERTAIN' &&
          top1.letter !== 'BLANK' &&
          top1.probability >= this.config.openPosteriorThreshold &&
          !isTopInCluster // Do NOT claim user is showing a sister sign if they are trying to form the target!
        ) {
          candidateLetter = top1.letter;
          effectiveConfidence = top1.probability;
        } else {
          candidateLetter = cleanTarget;
          effectiveConfidence = targetProb;
        }
      }
    } else {
      // Open mode (unprompted)
      if (
        inference.predictedClass !== 'BLANK' &&
        inference.predictedClass !== 'UNCERTAIN' &&
        inference.confidence >= this.config.openPosteriorThreshold
      ) {
        candidateLetter = inference.predictedClass;
        effectiveConfidence = inference.confidence;
      } else if (
        top1.letter !== 'UNCERTAIN' &&
        top1.letter !== 'BLANK' &&
        top1.probability >= this.config.openPosteriorThreshold
      ) {
        candidateLetter = top1.letter;
        effectiveConfidence = top1.probability;
      } else {
        candidateLetter = 'UNKNOWN';
        effectiveConfidence = 0;
      }
    }

    // 2. Transition Suppression
    // During rapid movements, suppress false positive triggers unless it's a dynamic gesture (J/Z)
    const isRapidTransition = motionState === 'TRANSITIONING' && !isDynamicLetter;

    // 3. Evidence Accumulation & Hysteresis State Machine
    if (isTargetMatch && !isRapidTransition && this.confirmedCooldownFrames === 0) {
      this.currentCandidate = candidateLetter;
      // Increment evidence based on posterior strength
      const frameDelta = (effectiveConfidence / this.config.targetPosteriorThreshold);
      // For dynamic letters, accelerate confirmation as motion trajectories are transient
      const motionMultiplier = isDynamicLetter ? 1.6 : 1.0;
      this.accumulatedEvidence += (1.0 / this.config.confirmationFrames) * Math.min(1.8, Math.max(0.7, frameDelta)) * motionMultiplier;

      if (this.accumulatedEvidence >= 1.0) {
        if (this.state !== 'CONFIRMED' && this.state !== 'RELEASED') {
          this.state = 'CONFIRMED';
          isConfirmedThisFrame = true;
          this.lastConfirmedLetter = candidateLetter;
          this.confirmedCooldownFrames = 12; // ~400ms cooldown
        }
      } else {
        this.state = 'CANDIDATE';
      }
    } else {
      // Decay evidence smoothly when match drops (doesn't wipe out immediately on 1 noisy frame)
      this.accumulatedEvidence = Math.max(0, this.accumulatedEvidence - this.config.decayRate);

      if (this.confirmedCooldownFrames > 0) {
        this.state = 'RELEASED';
      } else if (this.accumulatedEvidence > 0.15) {
        this.state = 'CANDIDATE';
      } else if (motionState === 'FORMING' || motionState === 'STABLE') {
        this.state = 'OBSERVING';
      } else {
        this.state = 'IDLE';
      }
    }

    const holdProgress = Math.max(0, Math.min(1.0, this.accumulatedEvidence));
    const isCorrect = this.state === 'CONFIRMED' || isConfirmedThisFrame;

    // 4. Generate Pedagogical Feedback
    let feedbackMessage = '';
    if (isCorrect) {
      feedbackMessage = `✓ ${candidateLetter}! Great job!`;
    } else if (this.state === 'RELEASED') {
      feedbackMessage = 'Nice! Move on to the next letter.';
    } else if (this.state === 'CANDIDATE') {
      feedbackMessage = holdProgress > 0.60 ? 'Almost there, hold steady!' : `Good! Forming ${targetLetter || candidateLetter}...`;
    } else if (motionState === 'TRANSITIONING') {
      feedbackMessage = 'Transitioning... get ready!';
    } else if (candidateLetter !== 'UNKNOWN' && targetLetter && candidateLetter !== targetLetter) {
      feedbackMessage = `Showing ${candidateLetter}. Switch to ${targetLetter}.`;
    } else if (targetLetter) {
      feedbackMessage = `Form the sign for "${targetLetter}"`;
    } else {
      feedbackMessage = 'Make any ASL letter';
    }

    return {
      state: this.state,
      recognizedLetter: candidateLetter,
      isCorrect,
      confidence: effectiveConfidence,
      holdProgress,
      feedbackMessage,
      isConfirmedThisFrame,
      motionState
    };
  }
}
