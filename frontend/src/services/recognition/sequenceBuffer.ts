import { Landmark3D } from '../../types';
import { dist3D } from '../handKinematics';
import { normalizeHandLandmarks, NormalizedFrameData } from './landmarkNormalizer';

export type SequenceMotionState = 'STABLE' | 'FORMING' | 'TRANSITIONING';

export interface BufferedFrame {
  landmarks: Landmark3D[];
  normalized: NormalizedFrameData;
  timestamp: number;
}

export class SequenceBuffer {
  private readonly maxFrames: number;
  private frames: BufferedFrame[] = [];
  private lastLandmarks: Landmark3D[] | null = null;
  private lastTimestamp: number = 0;
  private smoothVelocity: number = 0;

  constructor(maxFrames: number = 24) {
    this.maxFrames = maxFrames;
  }

  public push(
    landmarks: Landmark3D[],
    providedHandedness?: 'Left' | 'Right',
    timestamp: number = performance.now()
  ): {
    normalized: NormalizedFrameData;
    velocity: number;
    motionState: SequenceMotionState;
  } {
    // 1. Calculate temporal velocity (joint displacement / dt)
    let currentVelocity = 0;
    if (this.lastLandmarks && this.lastLandmarks.length === 21 && this.lastTimestamp > 0) {
      const dt = Math.max(1, timestamp - this.lastTimestamp);
      let totalDist = 0;
      for (let i = 0; i < 21; i++) {
        totalDist += dist3D(landmarks[i], this.lastLandmarks[i]);
      }
      currentVelocity = (totalDist / 21) / dt;
      this.smoothVelocity = this.smoothVelocity * 0.65 + currentVelocity * 0.35;
    }

    this.lastLandmarks = landmarks;
    this.lastTimestamp = timestamp;

    // 2. Normalize frame
    const normalized = normalizeHandLandmarks(landmarks, providedHandedness);

    // 3. Add to rolling queue
    this.frames.push({
      landmarks,
      normalized,
      timestamp
    });

    if (this.frames.length > this.maxFrames) {
      this.frames.shift();
    }

    // 4. Motion State classification
    let motionState: SequenceMotionState = 'STABLE';
    if (this.smoothVelocity > 0.0022) {
      motionState = 'TRANSITIONING';
    } else if (this.smoothVelocity > 0.0009) {
      motionState = 'FORMING';
    } else {
      motionState = 'STABLE';
    }

    return {
      normalized,
      velocity: this.smoothVelocity,
      motionState
    };
  }

  public reset() {
    this.frames = [];
    this.lastLandmarks = null;
    this.lastTimestamp = 0;
    this.smoothVelocity = 0;
  }

  public get length(): number {
    return this.frames.length;
  }

  public get velocity(): number {
    return this.smoothVelocity;
  }

  public get latestFrame(): BufferedFrame | null {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1] : null;
  }

  /**
   * Returns the NormalizedFrameData for the last N frames.
   * Used by the geometric classifier for multi-frame averaging.
   */
  public getRecentNormalized(n: number): import('./landmarkNormalizer').NormalizedFrameData[] {
    const start = Math.max(0, this.frames.length - n);
    return this.frames.slice(start).map(f => f.normalized);
  }

  /**
   * Returns raw wrist (landmark[0]) x,y positions across all buffered frames.
   * Used for J/Z motion trajectory analysis. Coordinates are in MediaPipe's
   * 0-1 image-space range so displacement is comparable across frame sizes.
   */
  public getWristTrajectory(): { x: number; y: number }[] {
    return this.frames.map(f => ({
      x: f.landmarks[0].x,
      y: f.landmarks[0].y,
    }));
  }

  /**
   * Returns index fingertip (landmark[8]) trajectory for Z trace detection.
   */
  public getIndexTipTrajectory(): { x: number; y: number }[] {
    return this.frames.map(f => ({
      x: f.landmarks[8] ? f.landmarks[8].x : f.landmarks[0].x,
      y: f.landmarks[8] ? f.landmarks[8].y : f.landmarks[0].y,
    }));
  }

  /**
   * Returns pinky fingertip (landmark[20]) trajectory for J scoop detection.
   */
  public getPinkyTipTrajectory(): { x: number; y: number }[] {
    return this.frames.map(f => ({
      x: f.landmarks[20] ? f.landmarks[20].x : f.landmarks[0].x,
      y: f.landmarks[20] ? f.landmarks[20].y : f.landmarks[0].y,
    }));
  }

  /**
   * Returns a 2D tensor of shape [T, D] padded with the earliest available frame
   * if buffer is not yet full.
   */
  public getSequenceTensor(useKinematics: boolean = false): number[][] {
    if (this.frames.length === 0) {
      const dim = useKinematics ? 78 : 63;
      return Array.from({ length: this.maxFrames }, () => new Array(dim).fill(0));
    }

    const tensor: number[][] = [];
    const firstFrame = this.frames[0];
    const firstVector = useKinematics ? firstFrame.normalized.allFeatures : firstFrame.normalized.canonicalCoords;

    // Pad beginning if sequence length < maxFrames
    const padCount = Math.max(0, this.maxFrames - this.frames.length);
    for (let i = 0; i < padCount; i++) {
      tensor.push([...firstVector]);
    }

    for (const f of this.frames) {
      const vec = useKinematics ? f.normalized.allFeatures : f.normalized.canonicalCoords;
      tensor.push([...vec]);
    }

    return tensor;
  }
}
