/**
 * SIGNQUEST — Deterministic Replay Engine & Offline Evaluation Harness
 * Runs recorded landmark sequences offline through isolated instances of
 * SequenceBuffer -> TemporalRecognizer -> TemporalDecoder without game logic or webcam.
 */

import { Landmark3D } from '../../types';
import { SequenceBuffer } from './sequenceBuffer';
import { TemporalRecognizer, TemporalInferenceResult, TemporalModelWeights } from './temporalRecognizer';
import { TemporalDecoder, DecoderOutput } from './temporalDecoder';
import { RecordedAttempt } from './recorder';
import weightsJson from '../../data/fingerspell_temporal_weights.json';

export interface FrameReplayResult {
  frameIndex: number;
  timestampMs: number;
  predicted: string;
  confidence: number;
  targetConfidence: number;
  lifecycleState: string;
  holdProgress: number;
  accepted: boolean;
  rejectionReason: string;
  motionVelocity: number;
  motionState: string;
}

export interface ReplayEvaluationResult {
  attemptId: string;
  target: string;
  predicted: string;
  confidence: number;
  latencyMs: number;
  accepted: boolean;
  rejectionReason: string;
  totalFrames: number;
  firstAcceptedFrameIndex: number | null;
  frames: FrameReplayResult[];
}

export interface BatchEvaluationSummary {
  totalAttempts: number;
  acceptedCount: number;
  firstAttemptSuccessRate: number; // 0% to 100%
  averageLatencyMs: number;
  p95LatencyMs: number;
  perLetterAccuracy: Record<string, { total: number; accepted: number; rate: number }>;
  confusionMatrix: Record<string, Record<string, number>>;
  rejectionBreakdown: Record<string, number>;
}

export class ReplayHarness {
  private buffer: SequenceBuffer;
  private recognizer: TemporalRecognizer;
  private decoder: TemporalDecoder;

  constructor(customWeights?: TemporalModelWeights) {
    this.buffer = new SequenceBuffer(24);
    this.recognizer = new TemporalRecognizer(customWeights || (weightsJson as unknown as TemporalModelWeights));
    this.decoder = new TemporalDecoder();
  }

  /**
   * Evaluates a single recorded attempt deterministically from frame 0 to end.
   */
  public evaluateRecognition(attempt: RecordedAttempt): ReplayEvaluationResult {
    this.buffer.reset();
    this.decoder.reset();

    const targetLetter = attempt.targetLetter.toUpperCase();
    const frames: FrameReplayResult[] = [];
    let firstAcceptedFrameIndex: number | null = null;
    let acceptedLatencyMs: number = 0;
    let finalAccepted = false;
    let dominantPrediction = 'BLANK';
    let highestConfidence = 0;
    let lastRejectionReason = 'OK';

    for (let i = 0; i < attempt.frames.length; i++) {
      const f = attempt.frames[i];
      const landmarks: Landmark3D[] = f.rawLandmarks;

      // 1. Push to isolated sequence buffer
      const bufferRes = this.buffer.push(landmarks, f.handedness, f.timestampMs);
      const tensor = this.buffer.getSequenceTensor(false);

      // 2. Inference
      const inference = this.recognizer.predict(tensor, targetLetter);

      // 3. Decode
      const decoderRes = this.decoder.decode(inference, bufferRes.motionState, targetLetter);

      const isAcceptedThisFrame = decoderRes.isConfirmedThisFrame || decoderRes.isCorrect;

      // Determine frame-level rejection reason
      let frameRejection = 'OK';
      if (!isAcceptedThisFrame) {
        if (landmarks.length < 21) {
          frameRejection = 'NO_HAND_DETECTED';
        } else if (bufferRes.motionState === 'TRANSITIONING') {
          frameRejection = 'RAPID_TRANSITION';
        } else if (inference.predictedClass === 'BLANK') {
          frameRejection = 'BLANK_HAND';
        } else if (inference.targetConfidence < 0.50) {
          frameRejection = `LOW_TARGET_CONF (${Math.round(inference.targetConfidence * 100)}%)`;
        } else if (decoderRes.holdProgress < 1.0) {
          frameRejection = `HOLDING (${Math.round(decoderRes.holdProgress * 100)}%)`;
        } else {
          frameRejection = `MISMATCH (${inference.predictedClass})`;
        }
      }

      if (inference.confidence > highestConfidence) {
        highestConfidence = inference.confidence;
        dominantPrediction = inference.predictedClass;
      }

      if (isAcceptedThisFrame && firstAcceptedFrameIndex === null) {
        firstAcceptedFrameIndex = i;
        acceptedLatencyMs = f.timestampMs;
        finalAccepted = true;
      }

      frames.push({
        frameIndex: i,
        timestampMs: f.timestampMs,
        predicted: inference.predictedClass,
        confidence: inference.confidence,
        targetConfidence: inference.targetConfidence,
        lifecycleState: decoderRes.state,
        holdProgress: decoderRes.holdProgress,
        accepted: isAcceptedThisFrame,
        rejectionReason: frameRejection,
        motionVelocity: bufferRes.velocity,
        motionState: bufferRes.motionState
      });

      lastRejectionReason = frameRejection;
    }

    return {
      attemptId: attempt.id,
      target: targetLetter,
      predicted: dominantPrediction,
      confidence: highestConfidence,
      latencyMs: acceptedLatencyMs,
      accepted: finalAccepted,
      rejectionReason: finalAccepted ? 'ACCEPTED' : lastRejectionReason,
      totalFrames: attempt.frames.length,
      firstAcceptedFrameIndex,
      frames
    };
  }

  /**
   * Batch evaluates an entire dataset of recorded attempts.
   */
  public evaluateBatch(attempts: RecordedAttempt[]): BatchEvaluationSummary {
    const totalAttempts = attempts.length;
    let acceptedCount = 0;
    const latencies: number[] = [];
    const perLetterAccuracy: Record<string, { total: number; accepted: number; rate: number }> = {};
    const confusionMatrix: Record<string, Record<string, number>> = {};
    const rejectionBreakdown: Record<string, number> = {};

    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    for (const a of ALPHABET) {
      perLetterAccuracy[a] = { total: 0, accepted: 0, rate: 0 };
      confusionMatrix[a] = {};
      for (const b of [...ALPHABET, 'BLANK', 'UNKNOWN']) {
        confusionMatrix[a][b] = 0;
      }
    }

    for (const attempt of attempts) {
      const target = attempt.targetLetter.toUpperCase();
      if (!perLetterAccuracy[target]) {
        perLetterAccuracy[target] = { total: 0, accepted: 0, rate: 0 };
      }
      perLetterAccuracy[target].total++;

      const res = this.evaluateRecognition(attempt);

      // Confusion tracking
      if (!confusionMatrix[target]) confusionMatrix[target] = {};
      const pred = res.predicted || 'UNKNOWN';
      confusionMatrix[target][pred] = (confusionMatrix[target][pred] || 0) + 1;

      if (res.accepted) {
        acceptedCount++;
        perLetterAccuracy[target].accepted++;
        latencies.push(res.latencyMs);
      } else {
        const reasonKey = res.rejectionReason.split(' ')[0];
        rejectionBreakdown[reasonKey] = (rejectionBreakdown[reasonKey] || 0) + 1;
      }
    }

    // Compute rates
    for (const letter of Object.keys(perLetterAccuracy)) {
      const item = perLetterAccuracy[letter];
      item.rate = item.total > 0 ? Math.round((item.accepted / item.total) * 100) : 0;
    }

    latencies.sort((a, b) => a - b);
    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
    const p95Latency = latencies.length > 0
      ? latencies[Math.floor(latencies.length * 0.95)] || avgLatency
      : 0;

    const firstAttemptSuccessRate = totalAttempts > 0
      ? Math.round((acceptedCount / totalAttempts) * 1000) / 10
      : 0;

    return {
      totalAttempts,
      acceptedCount,
      firstAttemptSuccessRate,
      averageLatencyMs: avgLatency,
      p95LatencyMs: p95Latency,
      perLetterAccuracy,
      confusionMatrix,
      rejectionBreakdown
    };
  }
}

export const globalReplayHarness = new ReplayHarness();
