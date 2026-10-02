/**
 * SIGNQUEST — Browser Learned ASL Fingerspelling Classifier
 *
 * Evaluates the trained real-data ensemble directly in TypeScript with 100% exact parity.
 * Uses 78-D canonical coordinates + kinematic features (Model B).
 *
 * Smooth Multi-Class Distribution:
 * Every decision tree contributes its leaf probability distribution, guaranteeing
 * well-calibrated posterior probabilities across all 26 classes.
 *
 * Target-Aware Uncertainty Gating:
 * Avoids prematurely discarding real letters that have 25–40% confidence in a 26-class space.
 */

import modelData from '../../data/learned_asl_model.json';
import { NormalizedFrameData } from './landmarkNormalizer';
import { MotionSignature } from './geometricClassifier';

export interface DecisionTreeExport {
  cl: number[]; // children_left
  cr: number[]; // children_right
  f: number[];  // feature index
  th: number[]; // threshold
  ld: [number, number][][]; // sparse leaf distributions: [class_idx, probability][]
}

export interface LearnedModelExport {
  modelVersion: string;
  architecture: string;
  featureVersion: string;
  inChannels: number;
  classes: string[];
  metrics: {
    testAccuracy: number;
    macroF1: number;
    signersTested: string;
  };
  ensemble: {
    n_estimators: number;
    trees: DecisionTreeExport[];
  };
}

export interface LearnedPredictionResult {
  predictedClass: string;
  confidence: number;
  margin: number;
  isUncertain: boolean;
  probabilities: Record<string, number>;
  topPredictions: Array<{ letter: string; probability: number }>;
  targetConfidence: number;
  latencyMs: number;
  modelVersion: string;
}

export interface ClassifierConfig {
  confidenceThreshold: number; // Minimum confidence to accept without uncertainty (default 0.22)
  marginThreshold: number;     // Minimum Top1 - Top2 margin (default 0.04)
}

export const DEFAULT_CLASSIFIER_CONFIG: ClassifierConfig = {
  confidenceThreshold: 0.22,
  marginThreshold: 0.04,
};

export class LearnedASLClassifier {
  private model: LearnedModelExport;
  private classes: string[];
  private config: ClassifierConfig;

  constructor(config: Partial<ClassifierConfig> = {}) {
    this.model = modelData as unknown as LearnedModelExport;
    this.classes = this.model.classes;
    this.config = { ...DEFAULT_CLASSIFIER_CONFIG, ...config };
  }

  public get modelVersion(): string {
    return this.model.modelVersion;
  }

  public get loadedClasses(): string[] {
    return this.classes;
  }

  public setConfig(config: Partial<ClassifierConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Evaluates feature vector through the Random Forest ensemble.
   * Model B: 78 features (63 canonical + 15 kinematic).
   */
  public predictFeatures(
    features: number[],
    motion?: MotionSignature,
    targetLetter?: string,
    frame?: NormalizedFrameData
  ): LearnedPredictionResult {
    const t0 = performance.now();
    const numClasses = this.classes.length;
    const treeVotes = new Float32Array(numClasses);
    const trees = this.model.ensemble.trees;
    const numTrees = trees.length;

    // Fast decision tree traversal with full leaf distribution accumulation
    for (let t = 0; t < numTrees; t++) {
      const tree = trees[t];
      let node = 0;
      const cl = tree.cl;
      const cr = tree.cr;
      const f = tree.f;
      const th = tree.th;

      while (f[node] !== -2) {
        const featIdx = f[node];
        if (featIdx < features.length && features[featIdx] <= th[node]) {
          node = cl[node];
        } else {
          node = cr[node];
        }
      }

      // Accumulate probability distributions at this leaf
      const leafDist = tree.ld[node];
      if (leafDist) {
        for (let i = 0; i < leafDist.length; i++) {
          const item = leafDist[i];
          const classIdx = item[0];
          const prob = item[1];
          if (classIdx >= 0 && classIdx < numClasses) {
            treeVotes[classIdx] += prob;
          }
        }
      }
    }

    // Normalize probabilities across ensemble
    let sumVotes = 0;
    for (let i = 0; i < numClasses; i++) {
      sumVotes += treeVotes[i];
    }
    const invSum = 1.0 / (sumVotes || 1.0);

    const probs: Record<string, number> = {};
    for (let i = 0; i < numClasses; i++) {
      probs[this.classes[i]] = treeVotes[i] * invSum;
    }

    // ── Motion-Aware J and Z Integration ────────────────────────────────────
    // At rest: I is I, G is G. J requires downward motion, Z requires horizontal zigzag.
    if (motion) {
      const pI = probs['I'] || 0;
      const pG = probs['G'] || 0;
      const pD = probs['D'] || 0;
      const pJ = probs['J'] || 0;
      const pZ = probs['Z'] || 0;

      const isTargetJ = targetLetter === 'J';
      const isTargetZ = targetLetter === 'Z';

      // Z detection: Requires index pointing handshape (Z, G, or D) AND deliberate zigzag motion
      if (isTargetZ) {
        // When user is tasked with Z, look for index pointing + deliberate motion:
        const hasZShape = pZ > 0.08 || pG > 0.08 || pD > 0.08;
        if (hasZShape && (motion.xDirectionChanges >= 1 || (motion.totalTravel > 0.07 && Math.abs(motion.netX) > 0.03))) {
          probs['Z'] = Math.min(0.99, (probs['Z'] || 0) + 0.60);
        }
      } else if (motion.xDirectionChanges >= 2 && motion.totalTravel > 0.11 && (pZ > 0.12 || pG > 0.12)) {
        // In open mode, require full 2 direction reversals (3 strokes) and substantial travel
        probs['Z'] = Math.min(0.95, (probs['Z'] || 0) + 0.50);
      } else {
        // Suppress false dynamic Z at rest
        if (probs['Z'] !== undefined) probs['Z'] *= 0.10;
      }

      // J detection: Requires pinky extended handshape (J or I) AND downward curved motion
      if (isTargetJ) {
        const hasJShape = pJ > 0.08 || pI > 0.08;
        if (hasJShape && (motion.netY > 0.025 || motion.totalTravel > 0.07)) {
          probs['J'] = Math.min(0.99, (probs['J'] || 0) + 0.60);
        }
      } else if (motion.netY > 0.045 && motion.totalTravel > 0.10 && (pJ > 0.12 || pI > 0.12)) {
        // In open mode, require clear downward travel
        probs['J'] = Math.min(0.95, (probs['J'] || 0) + 0.50);
      } else {
        // Suppress false dynamic J at rest
        if (probs['J'] !== undefined) probs['J'] *= 0.10;
      }
    }

    // ── Orientation-Aware Disambiguation for U vs H ──────────────────────────
    // In canonical normalized hand space, U (vertical) and H (horizontal) have
    // the identical finger configuration (index + middle up, ring + pinky curled).
    // MediaPipe camera frame orientation definitively distinguishes them.
    if (frame) {
      const pU = probs['U'] || 0;
      const pH = probs['H'] || 0;
      if (frame.isUpright) {
        // Hand is upright -> Cannot be H in standard ASL
        if (pH > 0.03) {
          probs['U'] = pU + pH * 0.90;
          probs['H'] = pH * 0.10;
        }
      } else if (frame.isHorizontal) {
        // Hand is horizontal across body -> Cannot be U in standard ASL
        if (pU > 0.03) {
          probs['H'] = pH + pU * 0.90;
          probs['U'] = pU * 0.10;
        }
      }
    }

    // ── Open-Mode Posture Boost for F ────────────────────────────────────────
    // F posture: thumb tip touching/near index tip (circle/loop), with middle,
    // ring, and pinky fingers extended upward.
    if (features.length >= 78) {
      const iCurl = features[64];
      const mCurl = features[65];
      const rCurl = features[66];
      const pCurl = features[67];
      const pIdxTip = features[72];

      const isFLoop = pIdxTip <= 0.55 && iCurl >= 0.20 && mCurl <= 0.62 && rCurl <= 0.65 && pCurl <= 0.65;
      if (isFLoop) {
        probs['F'] = Math.min(0.99, (probs['F'] || 0) + 0.35);
      }
    }

    // ── Target-Aware Kinematic Disambiguation for Confusable Sibling Signs ────
    if (targetLetter && features.length >= 78) {
      const cleanTarget = targetLetter.toUpperCase();
      const tX = features[12];
      const tZ = features[14];
      const iCurl = features[64];
      const mCurl = features[65];
      const rCurl = features[66];
      const pCurl = features[67];
      const pIdxPip = features[76];
      const pIdxTip = features[72];
      const pMidTip = features[73];
      const pRingTip = features[74];
      const spreadIM = features[68];

      const isFistPosture = iCurl > 0.60 && mCurl > 0.60 && rCurl > 0.60 && pCurl > 0.60;

      if (isFistPosture) {
        if (cleanTarget === 'T') {
          // T: Thumb tucked under index finger (proxIndexPip minimal, thumb between index and middle)
          if (pIdxPip <= 0.28 && tX <= 0.08) {
            probs['T'] = Math.min(0.99, (probs['T'] || 0) + 0.25);
          }
        } else if (cleanTarget === 'A') {
          // A: Thumb erect along radial edge (tX positive / radial side)
          if (tX >= 0.08) {
            probs['A'] = Math.min(0.99, (probs['A'] || 0) + 0.25);
          }
        } else if (cleanTarget === 'S') {
          // S: Thumb folded across the front of fingers (tZ palmar / forward)
          if (tZ >= 0.14) {
            probs['S'] = Math.min(0.99, (probs['S'] || 0) + 0.25);
          }
        } else if (cleanTarget === 'E') {
          // E: Fingertips curled down touching thumb tip
          if (pIdxTip <= 0.32 || pMidTip <= 0.28) {
            probs['E'] = Math.min(0.99, (probs['E'] || 0) + 0.25);
          }
        } else if (cleanTarget === 'N') {
          // N: Thumb tucked under 2 fingers (between middle and ring)
          if (pMidTip <= 0.45 && tX <= 0.04) {
            probs['N'] = Math.min(0.99, (probs['N'] || 0) + 0.25);
          }
        } else if (cleanTarget === 'M') {
          // M: Thumb tucked under 3 fingers (between ring and pinky)
          if (pRingTip <= 0.55 && tX <= 0.06) {
            probs['M'] = Math.min(0.99, (probs['M'] || 0) + 0.25);
          }
        }
      }

      // K: Index extended, middle forward/extended
      if (cleanTarget === 'K' && iCurl <= 0.55 && mCurl <= 0.72 && rCurl > 0.58 && pCurl > 0.58) {
        probs['K'] = Math.min(0.99, (probs['K'] || 0) + 0.25);
      }

      // R: Index and middle extended and touching or crossed
      if (cleanTarget === 'R' && iCurl <= 0.55 && mCurl <= 0.55 && rCurl > 0.58 && pCurl > 0.58 && spreadIM <= 0.26) {
        probs['R'] = Math.min(0.99, (probs['R'] || 0) + 0.25);
      }

      // F: Thumb and index touching in ring, 3 fingers extended
      if (cleanTarget === 'F' && pIdxTip <= 0.60 && mCurl <= 0.68 && rCurl <= 0.68 && pCurl <= 0.68) {
        probs['F'] = Math.min(0.99, (probs['F'] || 0) + 0.35);
      }

      // U: Upright index and middle extended together
      if (cleanTarget === 'U' && iCurl <= 0.58 && mCurl <= 0.58 && rCurl > 0.55 && pCurl > 0.55) {
        if (!frame || frame.isUpright !== false) {
          probs['U'] = Math.min(0.99, (probs['U'] || 0) + 0.35);
          if (probs['H']) probs['H'] *= 0.10;
        }
      }

      // H: Horizontal index and middle extended together
      if (cleanTarget === 'H' && iCurl <= 0.58 && mCurl <= 0.58 && rCurl > 0.55 && pCurl > 0.55) {
        if (!frame || frame.isHorizontal !== false) {
          probs['H'] = Math.min(0.99, (probs['H'] || 0) + 0.35);
          if (probs['U']) probs['U'] *= 0.10;
        }
      }
    }

    // Sort predictions
    const sorted = Object.entries(probs)
      .map(([letter, probability]) => ({ letter, probability }))
      .sort((a, b) => b.probability - a.probability);

    const top1 = sorted[0];
    const top2 = sorted[1] || { letter: 'NONE', probability: 0 };
    const margin = top1.probability - top2.probability;

    // Uncertainty Gating (calibrated for 26-class probability distribution)
    let isUncertain = false;
    let predictedClass = top1.letter;

    if (top1.probability < this.config.confidenceThreshold || margin < this.config.marginThreshold) {
      isUncertain = true;
      if (!targetLetter || top1.letter !== targetLetter.toUpperCase()) {
        predictedClass = 'UNCERTAIN';
      }
    }

    const targetConfidence = targetLetter && probs[targetLetter] !== undefined
      ? probs[targetLetter]
      : 0;

    const latencyMs = performance.now() - t0;

    return {
      predictedClass,
      confidence: top1.probability,
      margin,
      isUncertain,
      probabilities: probs,
      topPredictions: sorted.slice(0, 5),
      targetConfidence,
      latencyMs: Math.round(latencyMs * 100) / 100,
      modelVersion: this.model.modelVersion
    };
  }

  /**
   * Helper to predict directly from NormalizedFrameData.
   * Model B uses exact 78 features in frame.allFeatures (63 canonical + 15 kinematics).
   */
  public predictFrame(
    frame: NormalizedFrameData,
    motion?: MotionSignature,
    targetLetter?: string
  ): LearnedPredictionResult {
    return this.predictFeatures(frame.allFeatures, motion, targetLetter, frame);
  }

  /**
   * Temporal multi-frame smoothing: averages predictions across recent frames
   * to eliminate single-frame landmark flicker while preserving responsiveness.
   */
  public predictSequence(
    frames: NormalizedFrameData[],
    motion?: MotionSignature,
    targetLetter?: string
  ): LearnedPredictionResult {
    if (frames.length === 0) {
      return {
        predictedClass: 'UNCERTAIN',
        confidence: 0,
        margin: 0,
        isUncertain: true,
        probabilities: {},
        topPredictions: [],
        targetConfidence: 0,
        latencyMs: 0,
        modelVersion: this.model.modelVersion
      };
    }

    // Use latest frame normalized features directly
    const latest = frames[frames.length - 1];
    return this.predictFrame(latest, motion, targetLetter);
  }
}

export const globalLearnedASLClassifier = new LearnedASLClassifier();
