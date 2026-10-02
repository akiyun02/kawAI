import { Landmark3D } from '../types';
import { analyze3DFingerKinematics } from './handKinematics';

export interface TrajectoryPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface MotionRecognitionResult {
  letter: 'J' | 'Z' | null;
  isMatched: boolean;
  progress: number; // 0 to 100
  feedback: string;
  strokeTrail: Array<{ x: number; y: number }>;
}

export class TemporalMotionRecognizer {
  private jBuffer: TrajectoryPoint[] = [];
  private zBuffer: TrajectoryPoint[] = [];
  private lastShapeCheckTime = 0;
  private jCompletedAt = 0;
  private zCompletedAt = 0;

  public reset() {
    this.jBuffer = [];
    this.zBuffer = [];
    this.lastShapeCheckTime = 0;
    this.jCompletedAt = 0;
    this.zCompletedAt = 0;
  }

  /**
   * Process a new landmark frame for temporal letter recognition (J or Z)
   */
  public evaluate(
    landmarks: Landmark3D[],
    targetLetter?: string,
    handedness: 'Left' | 'Right' = 'Right'
  ): MotionRecognitionResult {
    const now = performance.now();
    const trailWindowMs = 1200; // 1.2 second stroke window

    // Clean old points
    this.jBuffer = this.jBuffer.filter(p => now - p.timestamp < trailWindowMs);
    this.zBuffer = this.zBuffer.filter(p => now - p.timestamp < trailWindowMs);

    // Analyze static hand configuration
    const kinematics = analyze3DFingerKinematics(landmarks);
    const { thumb, index, middle, ring, pinky } = kinematics;

    // --- EVALUATE J ---
    // Handshape: "I" (Pinky extended, Index/Middle/Ring curled, Thumb folded across)
    const isJHandshape = 
      pinky.extensionRatio > 0.72 &&
      index.extensionRatio < 0.65 &&
      middle.extensionRatio < 0.65 &&
      ring.extensionRatio < 0.65;

    let jResult: MotionRecognitionResult = {
      letter: 'J',
      isMatched: false,
      progress: 0,
      feedback: 'Form letter "I" (pinky up) and draw a "J" hook in the air',
      strokeTrail: [],
    };

    if (isJHandshape) {
      const pinkyTip = landmarks[20];
      this.jBuffer.push({ x: pinkyTip.x, y: pinkyTip.y, timestamp: now });
      jResult.strokeTrail = this.jBuffer.map(p => ({ x: p.x, y: p.y }));
      jResult = this.analyzeJTrajectory(this.jBuffer, handedness, now);
    } else {
      // Shape broke, decay buffer faster
      if (this.jBuffer.length > 0 && now - this.lastShapeCheckTime > 300) {
        this.jBuffer = this.jBuffer.slice(Math.floor(this.jBuffer.length / 2));
      }
    }

    // --- EVALUATE Z ---
    // Handshape: "1/D" (Index extended, Middle/Ring/Pinky curled)
    const isZHandshape = 
      index.extensionRatio > 0.72 &&
      middle.extensionRatio < 0.65 &&
      ring.extensionRatio < 0.65 &&
      pinky.extensionRatio < 0.65;

    let zResult: MotionRecognitionResult = {
      letter: 'Z',
      isMatched: false,
      progress: 0,
      feedback: 'Point index finger and trace a 3-stroke "Z" in the air',
      strokeTrail: [],
    };

    if (isZHandshape) {
      const indexTip = landmarks[8];
      this.zBuffer.push({ x: indexTip.x, y: indexTip.y, timestamp: now });
      zResult.strokeTrail = this.zBuffer.map(p => ({ x: p.x, y: p.y }));
      zResult = this.analyzeZTrajectory(this.zBuffer, handedness, now);
    } else {
      if (this.zBuffer.length > 0 && now - this.lastShapeCheckTime > 300) {
        this.zBuffer = this.zBuffer.slice(Math.floor(this.zBuffer.length / 2));
      }
    }

    this.lastShapeCheckTime = now;

    // If target letter is specified
    if (targetLetter === 'J') return jResult;
    if (targetLetter === 'Z') return zResult;

    // Open mode: prioritize matched letter
    if (jResult.isMatched) return jResult;
    if (zResult.isMatched) return zResult;

    // Return the one with highest progress
    return jResult.progress >= zResult.progress ? jResult : zResult;
  }

  /**
   * Analyze 'J' trajectory:
   * Downward stroke followed by a curved hook inward/upward.
   */
  private analyzeJTrajectory(
    points: TrajectoryPoint[],
    handedness: 'Left' | 'Right',
    now: number
  ): MotionRecognitionResult {
    const defaultRes: MotionRecognitionResult = {
      letter: 'J',
      isMatched: false,
      progress: 0,
      feedback: 'Draw a downward stroke, then hook upward like a "J"',
      strokeTrail: points.map(p => ({ x: p.x, y: p.y })),
    };

    if (points.length < 8) {
      defaultRes.progress = Math.min(30, points.length * 4);
      return defaultRes;
    }

    // Downsample / resample trajectory to 16 normalized steps
    const resampled = this.resampleTrajectory(points, 16);
    
    // Find highest point (lowest y), lowest point (highest y), and final point
    let startY = resampled[0].y;
    let maxY = -1; // lowest physical position on screen
    let maxIdx = 0;

    for (let i = 0; i < resampled.length; i++) {
      if (resampled[i].y > maxY) {
        maxY = resampled[i].y;
        maxIdx = i;
      }
    }

    const endY = resampled[resampled.length - 1].y;
    const downDelta = maxY - startY; // positive = moved down
    const hookUpDelta = maxY - endY; // positive = curled back up

    // Horizontal hook movement
    const hookStartX = resampled[maxIdx].x;
    const hookEndX = resampled[resampled.length - 1].x;
    const hookXDelta = (hookEndX - hookStartX) * (handedness === 'Left' ? -1 : 1);

    // Progress metric:
    let progress = 0;
    if (downDelta > 0.04) progress += 40;
    if (downDelta > 0.08) progress += 20;
    if (hookUpDelta > 0.02) progress += 25;
    if (Math.abs(hookXDelta) > 0.02) progress += 15;

    // Check complete J stroke:
    // 1. Minimum downward stroke of ~0.07 (normalized screen height)
    // 2. Clear bottom inflection point before the end (maxIdx between 40% and 85% of points)
    // 3. Upward swoop of at least 0.03
    const hasDownStroke = downDelta >= 0.065;
    const hasInflection = maxIdx >= 6 && maxIdx <= 14;
    const hasUpHook = hookUpDelta >= 0.028;

    if (hasDownStroke && hasInflection && hasUpHook) {
      this.jCompletedAt = now;
      return {
        letter: 'J',
        isMatched: true,
        progress: 100,
        feedback: 'Great! "J" trajectory recognized!',
        strokeTrail: points.map(p => ({ x: p.x, y: p.y })),
      };
    }

    let feedback = 'Draw downward...';
    if (hasDownStroke) feedback = 'Now hook the pinky upward!';

    return {
      letter: 'J',
      isMatched: false,
      progress: Math.min(90, progress),
      feedback,
      strokeTrail: points.map(p => ({ x: p.x, y: p.y })),
    };
  }

  /**
   * Analyze 'Z' trajectory:
   * 3 strokes:
   * 1. Horizontal stroke across
   * 2. Diagonal stroke down-left
   * 3. Horizontal stroke across
   */
  private analyzeZTrajectory(
    points: TrajectoryPoint[],
    handedness: 'Left' | 'Right',
    now: number
  ): MotionRecognitionResult {
    const defaultRes: MotionRecognitionResult = {
      letter: 'Z',
      isMatched: false,
      progress: 0,
      feedback: 'Draw a "Z" in the air with your index finger',
      strokeTrail: points.map(p => ({ x: p.x, y: p.y })),
    };

    if (points.length < 10) {
      defaultRes.progress = Math.min(25, points.length * 3);
      return defaultRes;
    }

    const resampled = this.resampleTrajectory(points, 24);

    // Segment into 3 thirds
    const seg1 = resampled.slice(0, 8);
    const seg2 = resampled.slice(8, 16);
    const seg3 = resampled.slice(16, 24);

    // Stroke 1: Move right
    const dx1 = (seg1[seg1.length - 1].x - seg1[0].x) * (handedness === 'Left' ? -1 : 1);
    const dy1 = Math.abs(seg1[seg1.length - 1].y - seg1[0].y);

    // Stroke 2: Diagonal down-left
    const dx2 = (seg2[seg2.length - 1].x - seg2[0].x) * (handedness === 'Left' ? -1 : 1);
    const dy2 = seg2[seg2.length - 1].y - seg2[0].y;

    // Stroke 3: Move right
    const dx3 = (seg3[seg3.length - 1].x - seg3[0].x) * (handedness === 'Left' ? -1 : 1);
    const dy3 = Math.abs(seg3[seg3.length - 1].y - seg3[0].y);

    let progress = 0;
    const stroke1Pass = dx1 > 0.035 && dy1 < 0.06;
    if (stroke1Pass) progress += 33;

    const stroke2Pass = dx2 < -0.025 && dy2 > 0.035;
    if (stroke2Pass) progress += 34;

    const stroke3Pass = dx3 > 0.035 && dy3 < 0.06;
    if (stroke3Pass) progress += 33;

    if (stroke1Pass && stroke2Pass && stroke3Pass) {
      this.zCompletedAt = now;
      return {
        letter: 'Z',
        isMatched: true,
        progress: 100,
        feedback: 'Great! "Z" trajectory recognized!',
        strokeTrail: points.map(p => ({ x: p.x, y: p.y })),
      };
    }

    let feedback = 'Draw line right...';
    if (stroke1Pass) feedback = 'Now diagonal down-left...';
    if (stroke1Pass && stroke2Pass) feedback = 'Finish with line right!';

    return {
      letter: 'Z',
      isMatched: false,
      progress,
      feedback,
      strokeTrail: points.map(p => ({ x: p.x, y: p.y })),
    };
  }

  /**
   * Resample trajectory into N equidistant points along path
   */
  private resampleTrajectory(points: TrajectoryPoint[], n: number): Array<{ x: number; y: number }> {
    if (points.length === 0) return [];
    if (points.length === 1) return Array(n).fill({ x: points[0].x, y: points[0].y });

    let totalLength = 0;
    const dists: number[] = [0];
    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      totalLength += d;
      dists.push(totalLength);
    }

    if (totalLength === 0) return Array(n).fill({ x: points[0].x, y: points[0].y });

    const step = totalLength / (n - 1);
    const result: Array<{ x: number; y: number }> = [{ x: points[0].x, y: points[0].y }];

    let currIdx = 0;
    for (let i = 1; i < n - 1; i++) {
      const targetDist = i * step;
      while (currIdx < dists.length - 1 && dists[currIdx + 1] < targetDist) {
        currIdx++;
      }
      const segStart = dists[currIdx];
      const segEnd = dists[currIdx + 1];
      const t = (targetDist - segStart) / Math.max(0.0001, segEnd - segStart);
      result.push({
        x: points[currIdx].x + t * (points[currIdx + 1].x - points[currIdx].x),
        y: points[currIdx].y + t * (points[currIdx + 1].y - points[currIdx].y),
      });
    }

    result.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });
    return result;
  }
}

export const globalMotionRecognizer = new TemporalMotionRecognizer();
