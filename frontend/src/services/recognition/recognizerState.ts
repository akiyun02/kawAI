/**
 * SIGNQUEST — Recognition Engine State & Event Bus
 *
 * Uses the real-data trained ASL ensemble classifier (learnedClassifier.ts)
 * trained on 2,122 real MediaPipe landmark samples across 26 letters with
 * strictly held-out signers.
 *
 * Enforces first-class UNCERTAINTY:
 * If confidence < threshold or (Top1 - Top2) < margin, returns UNCERTAIN.
 * Motion-aware dynamics for J and Z are preserved and integrated with trajectory analysis.
 */

import { SequenceMotionState, SequenceBuffer } from './sequenceBuffer';
import { TemporalDecoder, RecognitionLifecycleState, DecoderOutput } from './temporalDecoder';
import { TemporalInferenceResult } from './temporalRecognizer';
import { globalLearnedASLClassifier } from './learnedClassifier';
import { analyzeWristMotion } from './geometricClassifier';
import { globalRecognitionRecorder } from './recorder';

export interface RecognizerTelemetry {
  fps: number;
  inferenceLatencyMs: number;
  bufferFillRatio: number;
  motionVelocity: number;
  motionState: SequenceMotionState;
  lifecycleState: RecognitionLifecycleState;
  candidateLetter: string;
  targetLetter: string | null;
  targetConfidence: number;
  holdProgress: number;
  isConfirmed: boolean;
  margin: number;
  isUncertain: boolean;
  modelVersion: string;
  topPredictions: Array<{ letter: string; probability: number }>;
}

export type TelemetryListener = (telemetry: RecognizerTelemetry) => void;

export class RecognizerOrchestrator {
  private buffer: SequenceBuffer;
  private decoder: TemporalDecoder;
  private targetLetter: string | null = null;
  private listeners: Set<TelemetryListener> = new Set();
  private lastFrameTimestamp: number = performance.now();
  private smoothedFps: number = 30;

  constructor() {
    this.buffer = new SequenceBuffer(24);
    this.decoder = new TemporalDecoder();
  }

  public setTargetLetter(target: string | null): void {
    if (this.targetLetter !== target) {
      this.targetLetter = target;
      this.decoder.reset();
    }
  }

  public getTargetLetter(): string | null {
    return this.targetLetter;
  }

  public reset(): void {
    this.buffer.reset();
    this.decoder.reset();
  }

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public processFrame(
    landmarks: any[],
    providedHandedness?: 'Left' | 'Right'
  ): {
    inference: TemporalInferenceResult;
    decoder: DecoderOutput;
    telemetry: RecognizerTelemetry;
  } {
    const now = performance.now();
    const dt = Math.max(1, now - this.lastFrameTimestamp);
    this.lastFrameTimestamp = now;
    const instantFps = 1000 / dt;
    this.smoothedFps = this.smoothedFps * 0.90 + instantFps * 0.10;

    // 1. Push into Sequence Buffer (normalizes landmarks into canonical frame each frame)
    const bufferResult = this.buffer.push(landmarks, providedHandedness, now);

    // 2. Classify using the real-data trained ensemble classifier
    const recentFrames = this.buffer.getRecentNormalized(6);
    let trajectory = this.buffer.getWristTrajectory();
    if (this.targetLetter === 'Z') {
      trajectory = this.buffer.getIndexTipTrajectory();
    } else if (this.targetLetter === 'J') {
      trajectory = this.buffer.getPinkyTipTrajectory();
    }
    const motion = analyzeWristMotion(trajectory);

    const learnedResult = globalLearnedASLClassifier.predictSequence(
      recentFrames,
      motion,
      this.targetLetter || undefined
    );

    // 3. Adapt to TemporalInferenceResult interface (for decoder + telemetry)
    const inference: TemporalInferenceResult = {
      predictedClass: learnedResult.predictedClass,
      confidence: learnedResult.confidence,
      probabilities: learnedResult.probabilities,
      targetConfidence: learnedResult.targetConfidence,
      latencyMs: learnedResult.latencyMs,
      margin: learnedResult.margin,
      isUncertain: learnedResult.isUncertain,
      topPredictions: learnedResult.topPredictions,
      modelVersion: learnedResult.modelVersion
    };

    // 4. Decode state with target-awareness, hysteresis, and transition suppression
    const decoderResult = this.decoder.decode(
      inference,
      bufferResult.motionState,
      this.targetLetter
    );

    // 5. Telemetry packet for HUD, dev metrics, and Recognition Lab
    const telemetry: RecognizerTelemetry = {
      fps: Math.round(this.smoothedFps),
      inferenceLatencyMs: Math.round(learnedResult.latencyMs * 10) / 10,
      bufferFillRatio: this.buffer.length / 24,
      motionVelocity: Math.round(bufferResult.velocity * 10000) / 10000,
      motionState: bufferResult.motionState,
      lifecycleState: decoderResult.state,
      candidateLetter: decoderResult.recognizedLetter,
      targetLetter: this.targetLetter,
      targetConfidence: learnedResult.targetConfidence,
      holdProgress: decoderResult.holdProgress,
      isConfirmed: decoderResult.isConfirmedThisFrame,
      margin: Math.round(learnedResult.margin * 1000) / 1000,
      isUncertain: learnedResult.isUncertain,
      modelVersion: learnedResult.modelVersion,
      topPredictions: learnedResult.topPredictions
    };

    // If recording session is active, capture full frame
    if (globalRecognitionRecorder.active) {
      globalRecognitionRecorder.recordFrame(
        landmarks,
        bufferResult.normalized,
        inference,
        decoderResult,
        bufferResult.velocity,
        bufferResult.motionState
      );
    }

    // Notify telemetry listeners
    for (const listener of this.listeners) {
      listener(telemetry);
    }

    return {
      inference,
      decoder: decoderResult,
      telemetry
    };
  }

  public getBuffer(): SequenceBuffer {
    return this.buffer;
  }

  public getDecoder(): TemporalDecoder {
    return this.decoder;
  }
}

// Global Singleton Orchestrator
export const globalRecognizerOrchestrator = new RecognizerOrchestrator();
