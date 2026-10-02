/**
 * SIGNQUEST — Browser Temporal Sequence Recognizer
 * Evaluates the trained 1D Dilated Residual CNN directly in TypeScript.
 * Takes a [24, 78] sequence tensor from SequenceBuffer and computes
 * posterior probabilities for all 27 fingerspelling classes (A-Z + BLANK) in ~1.2ms.
 */

export interface TemporalModelWeights {
  version: string;
  architecture: string;
  in_channels: number;
  hidden: number;
  seq_len: number;
  num_classes: number;
  classes: string[];
  metrics?: {
    test_accuracy: number;
    j_accuracy: number;
    z_accuracy: number;
    latency_ms: number;
  };
  weights: {
    W1: number[][][]; // [3, 78, 48]
    b1: number[];     // [48]
    W2: number[][][]; // [3, 48, 48]
    b2: number[];     // [48]
    W3: number[][][]; // [3, 48, 48]
    b3: number[];     // [48]
    W_head: number[][]; // [48, 27]
    b_head: number[];   // [27]
  };
}

export interface TemporalInferenceResult {
  predictedClass: string;
  confidence: number;
  probabilities: Record<string, number>;
  targetConfidence: number;
  latencyMs: number;
  margin?: number;
  isUncertain?: boolean;
  topPredictions?: Array<{ letter: string; probability: number }>;
  modelVersion?: string;
}

export class TemporalRecognizer {
  private weights: TemporalModelWeights | null = null;
  private classes: string[] = [];
  private isReady: boolean = false;

  constructor(weights?: TemporalModelWeights) {
    if (weights) {
      this.loadWeights(weights);
    }
  }

  public loadWeights(weights: TemporalModelWeights): void {
    this.weights = weights;
    this.classes = weights.classes || [];
    this.isReady = true;
  }

  public get ready(): boolean {
    return this.isReady;
  }

  public get loadedClasses(): string[] {
    return this.classes;
  }

  /**
   * 1D Dilated Convolution with constant zero padding to maintain sequence length T.
   * X: [T, inChannels]
   * W: [K, inChannels, outChannels]
   * b: [outChannels]
   * Returns: [T, outChannels]
   */
  private conv1d(
    X: Float32Array[],
    W: number[][][],
    b: number[],
    dilation: number
  ): Float32Array[] {
    const T = X.length;
    const inC = X[0].length;
    const outC = b.length;
    const K = W.length; // 3
    const pad = Math.floor(((K - 1) * dilation) / 2);

    // Prepare padded sequence
    const totalPaddedT = T + 2 * pad;
    const padded: Float32Array[] = new Array(totalPaddedT);
    const zeroVec = new Float32Array(inC);

    for (let t = 0; t < totalPaddedT; t++) {
      if (t < pad || t >= pad + T) {
        padded[t] = zeroVec;
      } else {
        padded[t] = X[t - pad];
      }
    }

    // Output sequence
    const out: Float32Array[] = new Array(T);
    for (let t = 0; t < T; t++) {
      const outStep = new Float32Array(outC);
      // Initialize with bias
      for (let j = 0; j < outC; j++) {
        outStep[j] = b[j];
      }

      // Conv kernel accumulate
      for (let k = 0; k < K; k++) {
        const inputVec = padded[t + k * dilation];
        const kernelSlice = W[k]; // [inC, outC]

        for (let ic = 0; ic < inC; ic++) {
          const inVal = inputVec[ic];
          if (inVal === 0) continue;
          const weightsForIn = kernelSlice[ic];
          for (let j = 0; j < outC; j++) {
            outStep[j] += inVal * weightsForIn[j];
          }
        }
      }

      out[t] = outStep;
    }

    return out;
  }

  /**
   * Runs forward inference on a [24, 78] sequence tensor.
   * Target letter is optional; if provided, targetConfidence is returned.
   */
  public predict(
    sequenceTensor: number[][],
    targetLetter?: string
  ): TemporalInferenceResult {
    const t0 = performance.now();

    if (!this.isReady || !this.weights) {
      return {
        predictedClass: 'BLANK',
        confidence: 0,
        probabilities: {},
        targetConfidence: 0,
        latencyMs: 0
      };
    }

    const { W1, b1, W2, b2, W3, b3, W_head, b_head } = this.weights.weights;
    const T = sequenceTensor.length;
    const inC = sequenceTensor[0].length;

    // Convert input to Float32Array sequence
    const X: Float32Array[] = new Array(T);
    for (let t = 0; t < T; t++) {
      X[t] = new Float32Array(sequenceTensor[t]);
    }

    // 1. Layer 1: Conv1D (k=3, d=1) + ReLU
    const z1 = this.conv1d(X, W1, b1, 1);
    const a1: Float32Array[] = new Array(T);
    const hidden = b1.length;
    for (let t = 0; t < T; t++) {
      const row = new Float32Array(hidden);
      for (let j = 0; j < hidden; j++) {
        row[j] = Math.max(0, z1[t][j]);
      }
      a1[t] = row;
    }

    // 2. Layer 2: Dilated Conv1D (k=3, d=2) + Residual Skip + ReLU
    const z2 = this.conv1d(a1, W2, b2, 2);
    const a2: Float32Array[] = new Array(T);
    for (let t = 0; t < T; t++) {
      const row = new Float32Array(hidden);
      for (let j = 0; j < hidden; j++) {
        row[j] = Math.max(0, z2[t][j] + a1[t][j]);
      }
      a2[t] = row;
    }

    // 3. Layer 3: Dilated Conv1D (k=3, d=4) + Residual Skip + ReLU
    const z3 = this.conv1d(a2, W3, b3, 4);
    const a3: Float32Array[] = new Array(T);
    for (let t = 0; t < T; t++) {
      const row = new Float32Array(hidden);
      for (let j = 0; j < hidden; j++) {
        row[j] = Math.max(0, z3[t][j] + a2[t][j]);
      }
      a3[t] = row;
    }

    // 4. Global Temporal Average Pooling over T -> [hidden]
    const pooled = new Float32Array(hidden);
    for (let t = 0; t < T; t++) {
      for (let j = 0; j < hidden; j++) {
        pooled[j] += a3[t][j];
      }
    }
    const invT = 1.0 / T;
    for (let j = 0; j < hidden; j++) {
      pooled[j] *= invT;
    }

    // 5. Dense Head + Softmax -> [numClasses]
    const numClasses = this.classes.length;
    const logits = new Float32Array(numClasses);
    let maxLogit = -Infinity;

    for (let c = 0; c < numClasses; c++) {
      let sum = b_head[c];
      for (let j = 0; j < hidden; j++) {
        sum += pooled[j] * W_head[j][c];
      }
      logits[c] = sum;
      if (sum > maxLogit) {
        maxLogit = sum;
      }
    }

    let expSum = 0;
    const expLogits = new Float32Array(numClasses);
    for (let c = 0; c < numClasses; c++) {
      const expVal = Math.exp(logits[c] - maxLogit);
      expLogits[c] = expVal;
      expSum += expVal;
    }

    const invExpSum = 1.0 / (expSum || 1.0);
    const probabilities: Record<string, number> = {};
    let bestClass = 'BLANK';
    let bestConf = 0;

    for (let c = 0; c < numClasses; c++) {
      const p = expLogits[c] * invExpSum;
      const cls = this.classes[c];
      probabilities[cls] = p;
      if (p > bestConf) {
        bestConf = p;
        bestClass = cls;
      }
    }

    const targetConfidence = targetLetter && probabilities[targetLetter] !== undefined
      ? probabilities[targetLetter]
      : 0;

    const latencyMs = performance.now() - t0;

    return {
      predictedClass: bestClass,
      confidence: bestConf,
      probabilities,
      targetConfidence,
      latencyMs
    };
  }
}
