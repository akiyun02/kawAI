import { Landmark3D } from '../types';
import modelData from '../data/asl_ml_weights.json';
import { computeCanonicalHandFrame, projectLandmarksToCanonical } from './handKinematics';

export interface MLPrediction {
  predictedSign: string;
  confidence: number; // 0 - 100
  top3: Array<{ sign: string; probability: number }>;
  probabilities: Record<string, number>;
  inferenceTimeMs: number;
}

const CLASSES: string[] = modelData.classes;
const modelRaw = modelData as any;
const W1: number[][] = modelRaw.W1 || modelRaw.weights?.W1;
const b1: number[] = modelRaw.b1 || modelRaw.weights?.b1;
const W2: number[][] = modelRaw.W2 || modelRaw.weights?.W2;
const b2: number[] = modelRaw.b2 || modelRaw.weights?.b2;
const W3: number[][] = modelRaw.W3 || modelRaw.weights?.W3;
const b3: number[] = modelRaw.b3 || modelRaw.weights?.b3;

/**
 * Extracts 63-D canonical hand-frame invariant coordinates.
 * Rotation-, tilt-, scale-, and translation-invariant.
 */
export function extractLandmarkFeatures(landmarks: Landmark3D[], handedness?: 'Left' | 'Right'): number[] {
  if (!landmarks || landmarks.length < 21) {
    return new Array(63).fill(0);
  }
  const frame = computeCanonicalHandFrame(landmarks, handedness);
  return projectLandmarksToCanonical(landmarks, frame);
}

/**
 * Zero-latency in-browser forward pass of the Kaggle-trained Neural Network.
 * Architecture: Dense(64, ReLU) -> Dense(32, ReLU) -> Dense(23, Softmax)
 */
export function classifyWithKaggleModel(landmarks: Landmark3D[], handedness?: 'Left' | 'Right'): MLPrediction {
  const startTime = performance.now();

  if (!landmarks || landmarks.length < 21) {
    return {
      predictedSign: 'NONE',
      confidence: 0,
      top3: [],
      probabilities: {},
      inferenceTimeMs: 0
    };
  }

  const x = extractLandmarkFeatures(landmarks, handedness);
  const numFeatures = x.length; // 63
  const hidden1 = 64;
  const hidden2 = 32;
  const numClasses = CLASSES.length; // 23

  // Layer 1: Dense + ReLU
  const h1 = new Float32Array(hidden1);
  for (let j = 0; j < hidden1; j++) {
    let sum = b1[j];
    for (let i = 0; i < numFeatures; i++) {
      sum += x[i] * W1[i][j];
    }
    h1[j] = sum > 0 ? sum : 0;
  }

  // Layer 2: Dense + ReLU
  const h2 = new Float32Array(hidden2);
  for (let k = 0; k < hidden2; k++) {
    let sum = b2[k];
    for (let j = 0; j < hidden1; j++) {
      sum += h1[j] * W2[j][k];
    }
    h2[k] = sum > 0 ? sum : 0;
  }

  // Layer 3: Dense + Softmax
  const logits = new Float32Array(numClasses);
  let maxLogit = -Infinity;
  for (let c = 0; c < numClasses; c++) {
    let sum = b3[c];
    for (let k = 0; k < hidden2; k++) {
      sum += h2[k] * W3[k][c];
    }
    logits[c] = sum;
    if (sum > maxLogit) maxLogit = sum;
  }

  // Softmax
  let sumExp = 0;
  const probs = new Float32Array(numClasses);
  for (let c = 0; c < numClasses; c++) {
    const expVal = Math.exp(logits[c] - maxLogit);
    probs[c] = expVal;
    sumExp += expVal;
  }

  let bestIdx = 0;
  let maxProb = 0;
  const probMap: Record<string, number> = {};
  const scoredList: Array<{ sign: string; probability: number }> = [];

  for (let c = 0; c < numClasses; c++) {
    const p = Math.round((probs[c] / sumExp) * 1000) / 1000;
    const signName = CLASSES[c];
    probMap[signName] = p;
    scoredList.push({ sign: signName, probability: p });

    if (p > maxProb) {
      maxProb = p;
      bestIdx = c;
    }
  }

  scoredList.sort((a, b) => b.probability - a.probability);

  const inferenceTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    predictedSign: CLASSES[bestIdx],
    confidence: Math.round(maxProb * 100),
    top3: scoredList.slice(0, 3),
    probabilities: probMap,
    inferenceTimeMs
  };
}
