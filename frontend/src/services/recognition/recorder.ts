/**
 * SIGNQUEST — Deterministic Landmark Recorder & Diagnostic Session Storage
 * Captures complete per-frame MediaPipe landmarks, normalizations, model predictions,
 * and decoder states for replay, deterministic debugging, and offline evaluation.
 */

import { Landmark3D } from '../../types';
import { normalizeHandLandmarks, NormalizedFrameData } from './landmarkNormalizer';
import { SequenceMotionState } from './sequenceBuffer';
import { TemporalInferenceResult } from './temporalRecognizer';
import { DecoderOutput, RecognitionLifecycleState } from './temporalDecoder';

export interface BoundingBox2D {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  width: number;
  height: number;
}

export interface RecordedFrameTelemetry {
  frameIndex: number;
  timestampMs: number;
  rawLandmarks: Landmark3D[];
  canonicalCoords: number[]; // 63 features
  kinematicFeatures: number[]; // 15 features
  palmScale: number;
  handedness: 'Left' | 'Right';
  boundingBox: BoundingBox2D;
  motionVelocity: number;
  motionState: SequenceMotionState;

  // Real-time Recognition Outputs
  predictedClass: string;
  predictedConfidence: number;
  top3: Array<{ letter: string; probability: number }>;
  targetLetter: string | null;
  targetConfidence: number;
  lifecycleState: RecognitionLifecycleState;
  holdProgress: number;
  isConfirmed: boolean;
  rejectionReason: string;
}

export interface RecordedAttempt {
  id: string;
  targetLetter: string;
  timestamp: string;
  signerHandedness: 'Left' | 'Right';
  totalDurationMs: number;
  frameCount: number;
  finalResult: 'CONFIRMED' | 'REJECTED' | 'INCOMPLETE';
  firstConfirmedFrameIndex: number | null;
  latencyMs: number | null;
  frames: RecordedFrameTelemetry[];
}

export class RecognitionRecorder {
  private isRecording: boolean = false;
  private currentAttempt: RecordedAttempt | null = null;
  private startTimeMs: number = 0;
  private frameCount: number = 0;
  private targetLetter: string = 'A';
  private currentHandedness: 'Left' | 'Right' = 'Right';

  public startRecording(targetLetter: string, handedness: 'Left' | 'Right' = 'Right'): void {
    this.isRecording = true;
    this.targetLetter = targetLetter.toUpperCase();
    this.currentHandedness = handedness;
    this.startTimeMs = performance.now();
    this.frameCount = 0;

    this.currentAttempt = {
      id: `attempt_${Date.now()}_${targetLetter}`,
      targetLetter: this.targetLetter,
      timestamp: new Date().toISOString(),
      signerHandedness: handedness,
      totalDurationMs: 0,
      frameCount: 0,
      finalResult: 'INCOMPLETE',
      firstConfirmedFrameIndex: null,
      latencyMs: null,
      frames: []
    };
  }

  public recordFrame(
    rawLandmarks: Landmark3D[],
    normalized: NormalizedFrameData,
    inference: TemporalInferenceResult,
    decoder: DecoderOutput,
    motionVelocity: number,
    motionState: SequenceMotionState
  ): RecordedFrameTelemetry | null {
    if (!this.isRecording || !this.currentAttempt) return null;

    const now = performance.now();
    const frameIndex = this.frameCount++;
    const timestampMs = Math.round(now - this.startTimeMs);

    // Compute 2D bounding box
    let xMin = 1, xMax = 0, yMin = 1, yMax = 0;
    for (const lm of rawLandmarks) {
      if (lm.x < xMin) xMin = lm.x;
      if (lm.x > xMax) xMax = lm.x;
      if (lm.y < yMin) yMin = lm.y;
      if (lm.y > yMax) yMax = lm.y;
    }
    const boundingBox: BoundingBox2D = {
      xMin: Math.round(xMin * 1000) / 1000,
      xMax: Math.round(xMax * 1000) / 1000,
      yMin: Math.round(yMin * 1000) / 1000,
      yMax: Math.round(yMax * 1000) / 1000,
      width: Math.round((xMax - xMin) * 1000) / 1000,
      height: Math.round((yMax - yMin) * 1000) / 1000
    };

    // Sort top 3 predictions
    const sortedProbs = Object.entries(inference.probabilities)
      .map(([letter, probability]) => ({ letter, probability }))
      .sort((a, b) => b.probability - a.probability);
    const top3 = sortedProbs.slice(0, 3);

    // Determine rejection reason if not confirmed
    let rejectionReason = 'OK';
    if (!decoder.isCorrect) {
      if (rawLandmarks.length < 21) {
        rejectionReason = 'NO_HAND_DETECTED';
      } else if (motionState === 'TRANSITIONING') {
        rejectionReason = 'HAND_IN_RAPID_TRANSITION';
      } else if (inference.predictedClass === 'BLANK') {
        rejectionReason = 'RESTING_OR_BLANK_HAND';
      } else if (this.targetLetter && inference.targetConfidence < 0.50) {
        rejectionReason = `INSUFFICIENT_TARGET_CONFIDENCE (${Math.round(inference.targetConfidence * 100)}% < 50%)`;
      } else if (decoder.holdProgress < 1.0) {
        rejectionReason = `HOLD_INCOMPLETE (${Math.round(decoder.holdProgress * 100)}% < 100%)`;
      } else {
        rejectionReason = `MISMATCH_CLASS (showing ${inference.predictedClass})`;
      }
    }

    const frameTelemetry: RecordedFrameTelemetry = {
      frameIndex,
      timestampMs,
      rawLandmarks: rawLandmarks.map(p => ({
        x: Math.round(p.x * 10000) / 10000,
        y: Math.round(p.y * 10000) / 10000,
        z: Math.round((p.z || 0) * 10000) / 10000
      })),
      canonicalCoords: normalized.canonicalCoords.map(v => Math.round(v * 10000) / 10000),
      kinematicFeatures: normalized.kinematicFeatures.map(v => Math.round(v * 10000) / 10000),
      palmScale: Math.round(normalized.palmScale * 10000) / 10000,
      handedness: normalized.handedness,
      boundingBox,
      motionVelocity: Math.round(motionVelocity * 10000) / 10000,
      motionState,
      predictedClass: inference.predictedClass,
      predictedConfidence: Math.round(inference.confidence * 1000) / 1000,
      top3,
      targetLetter: this.targetLetter,
      targetConfidence: Math.round(inference.targetConfidence * 1000) / 1000,
      lifecycleState: decoder.state,
      holdProgress: Math.round(decoder.holdProgress * 1000) / 1000,
      isConfirmed: decoder.isConfirmedThisFrame || decoder.isCorrect,
      rejectionReason
    };

    this.currentAttempt.frames.push(frameTelemetry);

    // Track first confirmation
    if (decoder.isConfirmedThisFrame && this.currentAttempt.firstConfirmedFrameIndex === null) {
      this.currentAttempt.firstConfirmedFrameIndex = frameIndex;
      this.currentAttempt.latencyMs = timestampMs;
      this.currentAttempt.finalResult = 'CONFIRMED';
    }

    return frameTelemetry;
  }

  public stopRecording(): RecordedAttempt | null {
    if (!this.isRecording || !this.currentAttempt) return null;

    this.isRecording = false;
    const now = performance.now();
    this.currentAttempt.totalDurationMs = Math.round(now - this.startTimeMs);
    this.currentAttempt.frameCount = this.currentAttempt.frames.length;

    if (this.currentAttempt.finalResult === 'INCOMPLETE') {
      this.currentAttempt.finalResult = this.currentAttempt.firstConfirmedFrameIndex !== null ? 'CONFIRMED' : 'REJECTED';
    }

    const completed = this.currentAttempt;
    this.currentAttempt = null;

    // Persist attempt locally
    saveAttempt(completed);

    return completed;
  }

  public get active(): boolean {
    return this.isRecording;
  }

  public get activeTarget(): string {
    return this.targetLetter;
  }
}

// LocalStorage helpers for recorded dataset persistence
const STORAGE_KEY = 'signquest_recorded_attempts_v1';

export function getStoredAttempts(): RecordedAttempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function saveAttempt(attempt: RecordedAttempt): void {
  try {
    const list = getStoredAttempts();
    list.unshift(attempt);
    // Keep last 100 attempts in localStorage
    const trimmed = list.slice(0, 100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save recorded attempt to localStorage:', e);
  }
}

export function deleteAttempt(id: string): void {
  try {
    const list = getStoredAttempts().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) {}
}

export function clearAllAttempts(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportAttemptsAsJSON(): string {
  const list = getStoredAttempts();
  return JSON.stringify(list, null, 2);
}

export function importAttemptsFromJSON(jsonString: string): number {
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      const existing = getStoredAttempts();
      const existingIds = new Set(existing.map(a => a.id));
      const newlyAdded = parsed.filter(a => a && a.id && !existingIds.has(a.id));
      const combined = [...newlyAdded, ...existing].slice(0, 200);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(combined));
      return newlyAdded.length;
    }
  } catch (e) {
    console.error('Failed to import attempts from JSON:', e);
  }
  return 0;
}

export const globalRecognitionRecorder = new RecognitionRecorder();
