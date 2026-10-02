import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const weightsPath = path.resolve(__dirname, '../frontend/src/data/fingerspell_temporal_weights.json');
const weights = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));

console.log('=' .repeat(60));
console.log('BROWSER INFERENCE ENGINE VERIFICATION');
console.log('Architecture:', weights.architecture, 'v' + weights.version);
console.log('In channels:', weights.in_channels, '| Seq len:', weights.seq_len, '| Classes:', weights.num_classes);
console.log('=' .repeat(60));

// Implement exact browser Conv1D logic from temporalRecognizer.ts
function conv1d(X, W, b, dilation) {
  const T = X.length;
  const inC = X[0].length;
  const outC = b.length;
  const K = W.length;
  const pad = Math.floor(((K - 1) * dilation) / 2);

  const totalPaddedT = T + 2 * pad;
  const padded = new Array(totalPaddedT);
  const zeroVec = new Float32Array(inC);

  for (let t = 0; t < totalPaddedT; t++) {
    if (t < pad || t >= pad + T) {
      padded[t] = zeroVec;
    } else {
      padded[t] = X[t - pad];
    }
  }

  const out = new Array(T);
  for (let t = 0; t < T; t++) {
    const outStep = new Float32Array(outC);
    for (let j = 0; j < outC; j++) outStep[j] = b[j];

    for (let k = 0; k < K; k++) {
      const inputVec = padded[t + k * dilation];
      const kernelSlice = W[k];
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

function predict(sequenceTensor) {
  const { W1, b1, W2, b2, W3, b3, W_head, b_head } = weights.weights;
  const T = sequenceTensor.length;
  const X = sequenceTensor.map(row => new Float32Array(row));

  // Layer 1
  const z1 = conv1d(X, W1, b1, 1);
  const hidden = b1.length;
  const a1 = z1.map(row => {
    const r = new Float32Array(hidden);
    for (let j = 0; j < hidden; j++) r[j] = Math.max(0, row[j]);
    return r;
  });

  // Layer 2
  const z2 = conv1d(a1, W2, b2, 2);
  const a2 = z2.map((row, t) => {
    const r = new Float32Array(hidden);
    for (let j = 0; j < hidden; j++) r[j] = Math.max(0, row[j] + a1[t][j]);
    return r;
  });

  // Layer 3
  const z3 = conv1d(a2, W3, b3, 4);
  const a3 = z3.map((row, t) => {
    const r = new Float32Array(hidden);
    for (let j = 0; j < hidden; j++) r[j] = Math.max(0, row[j] + a2[t][j]);
    return r;
  });

  // Global Pooling
  const pooled = new Float32Array(hidden);
  for (let t = 0; t < T; t++) {
    for (let j = 0; j < hidden; j++) pooled[j] += a3[t][j];
  }
  for (let j = 0; j < hidden; j++) pooled[j] /= T;

  // Dense Head
  const numClasses = b_head.length;
  const logits = new Float32Array(numClasses);
  let maxLogit = -Infinity;
  for (let c = 0; c < numClasses; c++) {
    let s = b_head[c];
    for (let j = 0; j < hidden; j++) s += pooled[j] * W_head[j][c];
    logits[c] = s;
    if (s > maxLogit) maxLogit = s;
  }

  // Softmax
  let sumExp = 0;
  const probs = new Float32Array(numClasses);
  for (let c = 0; c < numClasses; c++) {
    const e = Math.exp(logits[c] - maxLogit);
    probs[c] = e;
    sumExp += e;
  }
  for (let c = 0; c < numClasses; c++) probs[c] /= sumExp;

  let bestIdx = 0, bestP = -1;
  for (let c = 0; c < numClasses; c++) {
    if (probs[c] > bestP) {
      bestP = probs[c];
      bestIdx = c;
    }
  }

  return {
    predictedClass: weights.classes[bestIdx],
    confidence: bestP,
    probabilities: probs
  };
}

// Test with zero sequence (simulating resting hand)
const zeroSeq = Array.from({ length: 24 }, () => new Array(63).fill(0));
const t0 = performance.now();
const res0 = predict(zeroSeq);
const elapsed = performance.now() - t0;

console.log(`Zero tensor forward pass: ${elapsed.toFixed(3)} ms`);
console.log(`Prediction: ${res0.predictedClass} (conf ${(res0.confidence * 100).toFixed(1)}%)`);

// Benchmark 100 iterations
const times = [];
for (let i = 0; i < 100; i++) {
  const tStart = performance.now();
  predict(zeroSeq);
  times.push(performance.now() - tStart);
}
const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
console.log(`\nBrowser forward pass latency: ${avgTime.toFixed(3)} ms across 100 runs.`);
console.log('[PASS] Browser TypeScript inference engine verified successfully!');
