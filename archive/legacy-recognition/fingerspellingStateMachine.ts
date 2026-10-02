import { RecognitionState, QualityGateResult } from '../types';

export type FingerspellingEventType =
  | 'SIGN_CANDIDATE'
  | 'SIGN_CONFIRMED'
  | 'SIGN_REJECTED'
  | 'SIGN_UNKNOWN';

export interface FingerspellingEvent {
  type: FingerspellingEventType;
  letter: string;
  confidence: number;
  timestamp: number;
}

export type FingerspellingEventListener = (event: FingerspellingEvent) => void;

interface FrameRecord {
  letter: string;
  confidence: number;
  timestamp: number;
}

/**
 * Fast, Natural, Rolling Probability Fingerspelling State Machine
 * Uses a temporal sliding probability window instead of rigid single-frame locks.
 * Tolerates normal human variation, tremor, and occasional noisy frames.
 */
export class FingerspellingStateMachine {
  private state: RecognitionState = 'IDLE';
  private candidateLetter: string = 'UNKNOWN';
  private candidateStartTime = 0;
  private lastConfirmedLetter: string | null = null;
  private isAwaitingRelease = false;
  private listeners: FingerspellingEventListener[] = [];

  // Rolling history of recent frames (up to 8 frames or 400ms)
  private history: FrameRecord[] = [];

  // Responsive confirmation threshold (feels snappy and immediate)
  private readonly confirmationThresholdMs = 130;
  private readonly minDominantFrames = 2;

  public subscribe(listener: FingerspellingEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(type: FingerspellingEventType, letter: string, confidence: number) {
    const event: FingerspellingEvent = {
      type,
      letter,
      confidence,
      timestamp: performance.now(),
    };
    this.listeners.forEach(l => l(event));
  }

  public reset() {
    this.state = 'IDLE';
    this.candidateLetter = 'UNKNOWN';
    this.candidateStartTime = 0;
    this.lastConfirmedLetter = null;
    this.isAwaitingRelease = false;
    this.history = [];
  }

  /**
   * Process a single evaluated frame through the state machine
   */
  public update(
    quality: QualityGateResult,
    rawPredictedLetter: string,
    confidence: number, // 0 - 100
    targetLetter?: string
  ): {
    state: RecognitionState;
    confirmedLetter: string | null;
    holdProgress: number; // 0 - 100%
    statusBadge: 'strong' | 'steady' | 'none';
    userMessage: string;
  } {
    const now = performance.now();

    // 1. Hand Quality Gate Check
    if (!quality.isUsable) {
      this.state = quality.reason === 'NO_HAND' ? 'IDLE' : 'HAND_DETECTED';
      this.candidateLetter = 'UNKNOWN';
      this.candidateStartTime = 0;
      this.isAwaitingRelease = false;
      this.history = [];

      return {
        state: this.state,
        confirmedLetter: null,
        holdProgress: 0,
        statusBadge: 'none',
        userMessage: quality.message,
      };
    }

    if (this.state === 'IDLE') {
      this.state = 'READY';
    }

    // 2. Add current frame to rolling history & prune stale frames (> 400ms or > 8 records)
    this.history.push({
      letter: rawPredictedLetter,
      confidence,
      timestamp: now,
    });

    this.history = this.history.filter(f => now - f.timestamp <= 400).slice(-8);

    // 3. Compute Rolling Dominant Letter & Weighted Probability
    const letterWeights: Record<string, { count: number; totalConf: number; weightedScore: number }> = {};
    let totalWeight = 0;

    for (let i = 0; i < this.history.length; i++) {
      const f = this.history[i];
      // Slightly higher weight for newer frames (0.7 -> 1.0)
      const recencyWeight = 0.7 + (0.3 * (i + 1)) / this.history.length;
      totalWeight += recencyWeight;

      if (!letterWeights[f.letter]) {
        letterWeights[f.letter] = { count: 0, totalConf: 0, weightedScore: 0 };
      }
      letterWeights[f.letter].count += 1;
      letterWeights[f.letter].totalConf += f.confidence;
      letterWeights[f.letter].weightedScore += f.confidence * recencyWeight;
    }

    let dominantLetter = 'UNKNOWN';
    let dominantScore = 0;
    let dominantCount = 0;

    for (const [letKey, data] of Object.entries(letterWeights)) {
      if (letKey === 'UNKNOWN') continue;
      const normalizedScore = totalWeight > 0 ? data.weightedScore / totalWeight : 0;
      if (normalizedScore > dominantScore) {
        dominantScore = normalizedScore;
        dominantLetter = letKey;
        dominantCount = data.count;
      }
    }

    // In Target Mode: If target letter has evidence and is dominant or strong
    if (targetLetter) {
      const targetData = letterWeights[targetLetter];
      if (targetData) {
        const targetNormalized = totalWeight > 0 ? targetData.weightedScore / totalWeight : 0;
        // If target has reasonable evidence (>= 48) and no other letter is overwhelming it
        if (targetNormalized >= 48 && (targetNormalized >= dominantScore - 15 || dominantLetter === 'UNKNOWN')) {
          dominantLetter = targetLetter;
          dominantScore = Math.max(dominantScore, targetNormalized);
          dominantCount = targetData.count;
        }
      }
    }

    // 4. Evaluate dominant signal against minimum certainty
    const isDominantValid = dominantLetter !== 'UNKNOWN' && dominantScore >= 50 && dominantCount >= 1;

    if (!isDominantValid) {
      // Hand is relaxed or uncertain
      if (this.candidateLetter !== 'UNKNOWN' && this.candidateStartTime > 0 && (now - this.candidateStartTime) > 300) {
        this.emit('SIGN_UNKNOWN', this.candidateLetter, Math.round(dominantScore));
        this.candidateLetter = 'UNKNOWN';
        this.candidateStartTime = 0;
      }
      this.isAwaitingRelease = false;
      this.state = 'READY';

      return {
        state: 'READY',
        confirmedLetter: null,
        holdProgress: 0,
        statusBadge: 'none',
        userMessage: targetLetter
          ? `Show sign for "${targetLetter}"`
          : 'Form a clear letter',
      };
    }

    // 5. Anti-duplicate letter latch:
    // If holding the same letter that was just confirmed, wait for user to release/change sign
    if (this.isAwaitingRelease && dominantLetter === this.lastConfirmedLetter) {
      return {
        state: 'RELEASE',
        confirmedLetter: null,
        holdProgress: 100,
        statusBadge: 'steady',
        userMessage: `Letter "${dominantLetter}" logged! Change hand for next letter`,
      };
    }

    if (dominantLetter !== this.lastConfirmedLetter) {
      this.isAwaitingRelease = false;
    }

    // 6. Candidate Progression with Rolling Smoothing
    if (dominantLetter === this.candidateLetter) {
      // Continue holding current candidate
      if (this.candidateStartTime === 0) {
        this.candidateStartTime = now;
      }
    } else {
      // Smooth candidate switch
      this.candidateLetter = dominantLetter;
      this.candidateStartTime = now;
      this.state = 'CANDIDATE';
      this.emit('SIGN_CANDIDATE', dominantLetter, Math.round(dominantScore));
    }

    const elapsedMs = now - this.candidateStartTime;
    const progressFromTime = (elapsedMs / this.confirmationThresholdMs) * 100;
    const progressFromFrames = (dominantCount / this.minDominantFrames) * 100;
    const holdProgress = Math.min(100, Math.round(Math.max(progressFromTime, progressFromFrames)));

    // 7. Responsive Confirmation
    const hasEnoughTime = elapsedMs >= this.confirmationThresholdMs;
    const hasEnoughFrames = dominantCount >= this.minDominantFrames;
    const isVeryHighConfidence = dominantScore >= 82 && dominantCount >= 2;

    if ((hasEnoughTime && hasEnoughFrames) || isVeryHighConfidence) {
      this.state = 'CONFIRMED';
      this.lastConfirmedLetter = this.candidateLetter;
      this.isAwaitingRelease = true;
      this.emit('SIGN_CONFIRMED', this.candidateLetter, Math.round(dominantScore));

      return {
        state: 'CONFIRMED',
        confirmedLetter: this.candidateLetter,
        holdProgress: 100,
        statusBadge: 'strong',
        userMessage: `🟢 Great! Letter "${this.candidateLetter}" recognized!`,
      };
    }

    // Holding steady in candidate state
    return {
      state: 'CANDIDATE',
      confirmedLetter: null,
      holdProgress,
      statusBadge: 'steady',
      userMessage: `🟡 Hold "${this.candidateLetter}" steady...`,
    };
  }
}

export const globalFingerspellingStateMachine = new FingerspellingStateMachine();
