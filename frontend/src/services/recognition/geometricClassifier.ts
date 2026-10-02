/**
 * SIGNQUEST — Geometric ASL Fingerspelling Classifier
 *
 * Works from real MediaPipe normalized landmark geometry — no training data.
 *
 * Key design decisions:
 * - Uses 63-D canonical coords + 15 kinematic features from landmarkNormalizer
 * - J and Z use wrist MOTION trajectory (raw pixel coords) + pose to distinguish from I and G
 * - A/S/E/M/N/T are separated by thumb Z position (canonical Z = palm normal direction):
 *     A: thumbTipZ ≈ 0 (side of fist, radial edge)
 *     S: thumbTipZ > 0 (thumb wraps across dorsal/front of fist)
 *     E: thumbTipZ < -0.05 (thumb tucked under/palmar side)
 * - G vs D separated by thumb: G=thumb extended parallel, D=thumb touching middle
 */

import { NormalizedFrameData } from './landmarkNormalizer';

export interface WristPoint { x: number; y: number; }

export interface MotionSignature {
  totalTravel: number;       // Total wrist travel in image-space (0-1)
  hasSignificantMotion: boolean;
  xDirectionChanges: number; // How many times X direction reversed (Z-pattern detector)
  netY: number;              // Positive = moved down overall (J-curve detector)
  netX: number;              // Net horizontal displacement
}

export interface GeometricClassifierResult {
  predictedClass: string;
  confidence: number;
  probabilities: Record<string, number>;
  targetConfidence: number;
  latencyMs: number;
  rawScores: Record<string, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Motion Analysis
// ─────────────────────────────────────────────────────────────────────────────
export function analyzeWristMotion(trajectory: WristPoint[]): MotionSignature {
  if (trajectory.length < 5) {
    return { totalTravel: 0, hasSignificantMotion: false, xDirectionChanges: 0, netY: 0, netX: 0 };
  }

  let totalTravel = 0;
  let xDirectionChanges = 0;
  let lastXDir = 0;
  let currentLegDist = 0;

  for (let i = 1; i < trajectory.length; i++) {
    const dx = trajectory[i].x - trajectory[i - 1].x;
    const dy = trajectory[i].y - trajectory[i - 1].y;
    const segDist = Math.sqrt(dx * dx + dy * dy);
    totalTravel += segDist;

    // Filter out pixel tremor (under 0.010): require deliberate stroke leg before counting reversal
    if (Math.abs(dx) > 0.010) {
      const xDir = Math.sign(dx);
      if (lastXDir !== 0 && xDir !== lastXDir) {
        if (currentLegDist >= 0.022) {
          xDirectionChanges++;
          currentLegDist = 0;
        }
      } else {
        currentLegDist += Math.abs(dx);
      }
      lastXDir = xDir;
    }
  }

  const first = trajectory[0];
  const last = trajectory[trajectory.length - 1];
  const netY = last.y - first.y;   // positive = moved down (image Y increases downward)
  const netX = last.x - first.x;

  return {
    totalTravel,
    hasSignificantMotion: totalTravel > 0.08,
    xDirectionChanges,
    netY,
    netX,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sharpened softmax
// ─────────────────────────────────────────────────────────────────────────────
function softmax(scores: Record<string, number>, temperature = 0.32): Record<string, number> {
  const entries = Object.entries(scores);
  const maxScore = Math.max(...entries.map(([, s]) => s));
  const exps = entries.map(([k, s]) => [k, Math.exp((s - maxScore) / temperature)] as [string, number]);
  const sum = exps.reduce((a, [, e]) => a + e, 0) || 1;
  const result: Record<string, number> = {};
  for (const [k, e] of exps) {
    result[k] = e / sum;
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature extraction
//
// canonicalCoords layout: landmark i → [i*3, i*3+1, i*3+2] = (x, y, z)
//   x = radial axis (positive = toward thumb/index side)
//   y = distal axis (positive = away from wrist, toward fingertips)
//   z = palm normal (positive = dorsal/back-of-hand, negative = palmar)
//
// Landmark indices:
//  0=Wrist  1=ThumbCMC  2=ThumbMCP  3=ThumbIP  4=ThumbTip
//  5=IndexMCP  6=IndexPIP  7=IndexDIP  8=IndexTip
//  9=MiddleMCP  10=MiddlePIP  11=MiddleDIP  12=MiddleTip
//  13=RingMCP  14=RingPIP  15=RingDIP  16=RingTip
//  17=PinkyMCP  18=PinkyPIP  19=PinkyDIP  20=PinkyTip
// ─────────────────────────────────────────────────────────────────────────────

interface HandFeatures {
  // Kinematic (from landmarkNormalizer, 0-1 range)
  thumbCurl: number;
  indexCurl: number;
  middleCurl: number;
  ringCurl: number;
  pinkyCurl: number;
  spreadIndexMid: number;
  spreadMidRing: number;
  spreadRingPinky: number;
  spreadThumbIndex: number;
  proxIndexTip: number;   // thumb-tip to index-tip
  proxMiddleTip: number;  // thumb-tip to middle-tip
  proxRingTip: number;
  proxPinkyTip: number;
  proxIndexPip: number;   // thumb-tip to index-pip
  proxPalmCenter: number;

  // Derived booleans
  indexUp: boolean;
  middleUp: boolean;
  ringUp: boolean;
  pinkyUp: boolean;
  thumbExtended: boolean;
  thumbAcross: boolean;
  thumbAtIndex: boolean;  // thumb tip near index tip

  // Key canonical coordinates (in palm-normalized units)
  thumbTipX: number;  // radial: positive = toward index/thumb side
  thumbTipY: number;  // distal: positive = away from wrist
  thumbTipZ: number;  // z: positive = dorsal (back of hand), negative = palmar (toward camera)

  indexTipX: number;
  indexTipY: number;

  pinkyTipY: number;
  indexMipY: number;  // index MIP (pip) Y for detecting bent-but-not-curled
}

function extractFeatures(data: NormalizedFrameData): HandFeatures {
  const k = data.kinematicFeatures;
  const c = data.canonicalCoords;

  const thumbCurl        = k[0];
  const indexCurl        = k[1];
  const middleCurl       = k[2];
  const ringCurl         = k[3];
  const pinkyCurl        = k[4];
  const spreadIndexMid   = k[5];
  const spreadMidRing    = k[6];
  const spreadRingPinky  = k[7];
  const spreadThumbIndex = k[8];
  const proxIndexTip     = k[9];
  const proxMiddleTip    = k[10];
  const proxRingTip      = k[11];
  const proxPinkyTip     = k[12];
  const proxIndexPip     = k[13];
  const proxPalmCenter   = k[14];

  const indexUp    = indexCurl  < 0.38;
  const middleUp   = middleCurl < 0.38;
  const ringUp     = ringCurl   < 0.38;
  const pinkyUp    = pinkyCurl  < 0.38;
  const thumbExtended = thumbCurl < 0.38;

  // Thumb across = tip is toward the ulnar/pinky side (negative canonical X)
  const ttx = c[4 * 3];
  const tty = c[4 * 3 + 1];
  const ttz = c[4 * 3 + 2];
  const thumbAcross = ttx < -0.08;
  const thumbAtIndex = proxIndexTip < 0.33;

  const itx = c[8 * 3];
  const ity = c[8 * 3 + 1];
  const pty = c[20 * 3 + 1];    // pinky tip y
  const ipY = c[6 * 3 + 1];     // index pip y

  return {
    thumbCurl, indexCurl, middleCurl, ringCurl, pinkyCurl,
    spreadIndexMid, spreadMidRing, spreadRingPinky, spreadThumbIndex,
    proxIndexTip, proxMiddleTip, proxRingTip, proxPinkyTip, proxIndexPip, proxPalmCenter,
    indexUp, middleUp, ringUp, pinkyUp, thumbExtended,
    thumbAcross, thumbAtIndex,
    thumbTipX: ttx, thumbTipY: tty, thumbTipZ: ttz,
    indexTipX: itx, indexTipY: ity,
    pinkyTipY: pty, indexMipY: ipY,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function score(...terms: [boolean | number, number][]): number {
  let total = 0, weight = 0;
  for (const [val, w] of terms) {
    const v = typeof val === 'boolean' ? (val ? 1 : 0) : Math.max(0, Math.min(1, val as number));
    total += v * w;
    weight += w;
  }
  return weight > 0 ? total / weight : 0;
}

function ramp(val: number, lo: number, hi: number): number {
  return Math.max(0, Math.min(1, (val - lo) / (hi - lo)));
}

function invRamp(val: number, lo: number, hi: number): number {
  return 1 - ramp(val, lo, hi);
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-letter scoring functions
// ─────────────────────────────────────────────────────────────────────────────

type ScoringFn = (f: HandFeatures) => number;

const LETTER_SCORERS: Record<string, ScoringFn> = {

  // ── A ──────────────────────────────────────────────────────────────────────
  // Fist. Thumb rests along the side (radial edge) of the index finger.
  // All fingers fully curled. Thumb NOT across palm, NOT tucked under, NOT in front.
  // ThumbTip: high Y (pointing up), positive X (radial side), Z ≈ 0 (not front, not under).
  'A': (f) => score(
    [f.indexCurl > 0.72, 3],
    [f.middleCurl > 0.72, 3],
    [f.ringCurl > 0.72, 3],
    [f.pinkyCurl > 0.72, 3],
    [f.thumbTipY > 0.45, 2],            // thumb tip pointing upward
    [f.thumbTipX > 0.05, 2],            // thumb on radial/index side
    [Math.abs(f.thumbTipZ) < 0.22, 2],  // thumb NOT in front (Z≈0 = on the side)
    [f.thumbCurl < 0.55, 1],            // thumb somewhat extended (not folded tight)
    [!f.thumbAcross, 1],
    [f.proxIndexPip > 0.30, 1],         // thumb not buried deep under fingers
  ),

  // ── B ──────────────────────────────────────────────────────────────────────
  // Four fingers extended flat together, thumb folded across palm.
  'B': (f) => score(
    [f.indexUp, 3],
    [f.middleUp, 3],
    [f.ringUp, 3],
    [f.pinkyUp, 3],
    [f.thumbAcross, 2],
    [f.spreadIndexMid < 0.22, 1],
    [f.spreadMidRing < 0.22, 1],
    [f.spreadRingPinky < 0.22, 1],
  ),

  // ── C ──────────────────────────────────────────────────────────────────────
  // All fingers and thumb curved into a C shape (open arc, not closed).
  'C': (f) => score(
    [ramp(f.indexCurl, 0.32, 0.62), 2],
    [ramp(f.middleCurl, 0.32, 0.62), 2],
    [ramp(f.ringCurl, 0.32, 0.62), 2],
    [ramp(f.pinkyCurl, 0.32, 0.62), 2],
    [ramp(f.thumbCurl, 0.28, 0.60), 2],
    [f.proxIndexTip > 0.42, 2],         // opening between thumb and index
    [f.proxIndexTip < 0.85, 1],         // not too open (then it's 5/W)
    [f.spreadIndexMid < 0.35, 1],
  ),

  // ── D ──────────────────────────────────────────────────────────────────────
  // Index up. Thumb TOUCHES middle finger forming a circle. Others curled.
  // Key: proxMiddleTip is SMALL (thumb near middle tip).
  'D': (f) => score(
    [f.indexUp, 4],
    [f.indexTipY > 1.10, 2],            // index tip well extended
    [f.proxMiddleTip < 0.48, 3],        // thumb touches middle
    [f.middleCurl > 0.65, 2],
    [f.ringCurl > 0.72, 2],
    [f.pinkyCurl > 0.72, 2],
    [!f.thumbExtended, 2],              // thumb NOT freely extended (it's touching middle)
  ),

  // ── E ──────────────────────────────────────────────────────────────────────
  // All fingers tightly curled, thumb tucked UNDER/behind fingers toward palm.
  // Distinguisher: thumbTipZ NEGATIVE (palmar side, tucked under) + very high curls.
  'E': (f) => score(
    [f.indexCurl > 0.80, 3],
    [f.middleCurl > 0.80, 3],
    [f.ringCurl > 0.80, 3],
    [f.pinkyCurl > 0.80, 3],
    [f.thumbCurl > 0.78, 2],
    [f.thumbTipZ < -0.02, 2],           // thumb tucked palmar (under/into fist)
    [f.proxIndexPip < 0.38, 2],         // thumb tip close to finger pip joints
    [f.thumbTipY < 0.60, 1],            // thumb tip relatively low
  ),

  // ── F ──────────────────────────────────────────────────────────────────────
  // Index and thumb touching (OK ring), middle/ring/pinky extended.
  'F': (f) => score(
    [f.thumbAtIndex, 4],
    [f.indexCurl > 0.48, 2],
    [f.middleUp, 3],
    [f.ringUp, 3],
    [f.pinkyUp, 3],
    [f.spreadIndexMid > 0.18, 1],
  ),

  // ── G ──────────────────────────────────────────────────────────────────────
  // Index and thumb BOTH extended and parallel (like pointing sideways).
  // Key discriminators vs D: thumb is freely EXTENDED (not touching middle).
  // Key discriminators vs L: spreadThumbIndex is MODERATE (not a wide L-angle).
  // Key discriminators vs K: only index+thumb out, middle is curled (in K middle is also up).
  'G': (f) => score(
    [f.indexUp, 3],
    [f.thumbExtended, 3],               // thumb also freely extended (CRITICAL for G vs D)
    [f.proxMiddleTip > 0.52, 3],        // thumb NOT near middle (vs D)
    [f.proxIndexTip > 0.38, 2],         // thumb NOT pinching index tip
    [f.middleCurl > 0.70, 2],           // middle curled (vs K where middle is also up)
    [f.ringCurl > 0.78, 2],
    [f.pinkyCurl > 0.78, 2],
    [ramp(f.spreadThumbIndex, 0.15, 0.55), 1],  // moderate spread (vs L which is wide)
  ),

  // ── H ──────────────────────────────────────────────────────────────────────
  // Index and middle extended TOGETHER (tight, not spread), ring/pinky curled.
  'H': (f) => score(
    [f.indexUp, 3],
    [f.middleUp, 3],
    [f.ringCurl > 0.74, 2],
    [f.pinkyCurl > 0.74, 2],
    [f.spreadIndexMid < 0.20, 4],       // fingers pressed TOGETHER (critical H vs V)
    [f.thumbCurl > 0.58, 1],
  ),

  // ── I ──────────────────────────────────────────────────────────────────────
  // Only pinky extended. Everything else curled.
  'I': (f) => score(
    [f.pinkyUp, 5],
    [f.indexCurl > 0.68, 3],
    [f.middleCurl > 0.68, 3],
    [f.ringCurl > 0.68, 3],
    [f.pinkyTipY > 0.75, 2],
    [!f.thumbExtended, 1],
  ),

  // ── J ──────────────────────────────────────────────────────────────────────
  // Same pose as I (pinky up) but WITH downward-curving motion.
  // Motion boost is applied externally in classifySequence.
  // The static score here is the same as I — motion will differentiate.
  'J': (f) => score(
    [f.pinkyUp, 5],
    [f.indexCurl > 0.68, 3],
    [f.middleCurl > 0.68, 3],
    [f.ringCurl > 0.68, 3],
    [f.pinkyTipY > 0.75, 2],
    [!f.thumbExtended, 1],
  ),

  // ── K ──────────────────────────────────────────────────────────────────────
  // Index AND middle extended upward, spread in V. Thumb between them (up). Ring/pinky curled.
  'K': (f) => score(
    [f.indexUp, 3],
    [f.middleUp, 3],
    [f.ringCurl > 0.74, 2],
    [f.pinkyCurl > 0.74, 2],
    [f.spreadIndexMid > 0.24, 2],       // spread (vs H/U which are together)
    [f.thumbExtended, 2],               // thumb up between them
    [ramp(f.spreadThumbIndex, 0.15, 0.50), 1],
  ),

  // ── L ──────────────────────────────────────────────────────────────────────
  // Index pointing UP, thumb pointing wide SIDEWAYS. Wide 90° angle.
  'L': (f) => score(
    [f.indexUp, 4],
    [f.thumbExtended, 3],
    [f.spreadThumbIndex > 0.58, 4],     // WIDE spread is the key (vs G which is moderate)
    [f.middleCurl > 0.68, 2],
    [f.ringCurl > 0.68, 2],
    [f.pinkyCurl > 0.68, 2],
    [f.thumbTipX > 0.28, 2],            // thumb tip displaced radially
  ),

  // ── M ──────────────────────────────────────────────────────────────────────
  // Fist. THREE fingers (index + middle + ring) tucked over the thumb.
  // Like N but one more finger. Very similar to A but thumb is buried deeper.
  'M': (f) => score(
    [f.indexCurl > 0.68, 2],
    [f.middleCurl > 0.68, 2],
    [f.ringCurl > 0.68, 2],
    [f.pinkyCurl > 0.78, 2],
    [f.thumbCurl > 0.62, 2],
    [f.proxIndexPip < 0.48, 3],         // thumb under fingers (near pip joints)
    [f.thumbTipY < 0.60, 2],            // thumb tip not protruding high
    [f.spreadIndexMid < 0.22, 1],
    [f.spreadMidRing < 0.22, 1],
  ),

  // ── N ──────────────────────────────────────────────────────────────────────
  // Fist. TWO fingers (index + middle) tucked over thumb.
  // Like M but only 2 fingers. Ring and pinky a bit tighter than in M.
  'N': (f) => score(
    [f.indexCurl > 0.68, 2],
    [f.middleCurl > 0.68, 2],
    [f.ringCurl > 0.72, 2],
    [f.pinkyCurl > 0.78, 2],
    [f.thumbCurl > 0.60, 2],
    [f.proxIndexPip < 0.50, 3],         // thumb under 2 fingers
    [f.thumbTipY < 0.65, 2],
    [f.spreadIndexMid < 0.26, 1],
  ),

  // ── O ──────────────────────────────────────────────────────────────────────
  // Thumb and index (and others) form a closed O circle.
  'O': (f) => score(
    [ramp(f.indexCurl, 0.38, 0.65), 2],
    [ramp(f.middleCurl, 0.38, 0.65), 2],
    [ramp(f.ringCurl, 0.38, 0.65), 2],
    [ramp(f.pinkyCurl, 0.38, 0.65), 2],
    [ramp(f.thumbCurl, 0.38, 0.65), 2],
    [f.proxIndexTip < 0.38, 4],         // thumb and index TIP touching (closed circle)
    [f.proxMiddleTip < 0.55, 1],
    [f.spreadIndexMid < 0.32, 1],
  ),

  // ── P ──────────────────────────────────────────────────────────────────────
  // Like K but hand pointing DOWN. Canonical frame normalizes orientation,
  // so P looks similar to K. Best we can do: K-like features.
  'P': (f) => score(
    [f.indexUp, 3],
    [f.middleUp, 2],
    [f.ringCurl > 0.74, 2],
    [f.pinkyCurl > 0.74, 2],
    [f.spreadIndexMid > 0.22, 2],
    [f.thumbExtended, 2],
  ),

  // ── Q ──────────────────────────────────────────────────────────────────────
  // Like G but pointing DOWN. Canonical frame normalizes orientation away,
  // so use G-like features as the best static approximation.
  'Q': (f) => score(
    [f.indexUp, 3],
    [f.thumbExtended, 3],
    [f.proxMiddleTip > 0.52, 2],
    [f.middleCurl > 0.70, 2],
    [f.ringCurl > 0.78, 2],
    [f.pinkyCurl > 0.78, 2],
    [ramp(f.spreadThumbIndex, 0.12, 0.50), 1],
  ),

  // ── R ──────────────────────────────────────────────────────────────────────
  // Index and middle extended and CROSSED. Ring/pinky curled.
  // Key vs U/H: index and middle are crossed (tips close together, but extended).
  'R': (f) => score(
    [f.indexUp, 3],
    [f.middleUp, 3],
    [f.ringCurl > 0.74, 2],
    [f.pinkyCurl > 0.74, 2],
    [f.spreadIndexMid < 0.18, 4],       // fingers touching/crossed (very close)
    [f.thumbCurl > 0.48, 1],
  ),

  // ── S ──────────────────────────────────────────────────────────────────────
  // Fist. Thumb wraps across the FRONT of curled fingers (dorsal side).
  // Key: thumbTipZ POSITIVE (thumb on dorsal/back side of fist, in front toward camera).
  'S': (f) => score(
    [f.indexCurl > 0.78, 3],
    [f.middleCurl > 0.78, 3],
    [f.ringCurl > 0.78, 3],
    [f.pinkyCurl > 0.78, 3],
    [ramp(f.thumbCurl, 0.48, 0.80), 2],
    [f.thumbTipZ > 0.08, 3],            // thumb wraps to DORSAL/FRONT side (key vs A)
    [f.thumbTipY > 0.30, 1],
  ),

  // ── T ──────────────────────────────────────────────────────────────────────
  // Thumb tucked between index and middle (thumb pokes through the gap).
  // All fingers curled. ThumbTip is between the two finger pip joints.
  'T': (f) => score(
    [f.indexCurl > 0.68, 2],
    [f.middleCurl > 0.78, 2],
    [f.ringCurl > 0.78, 2],
    [f.pinkyCurl > 0.78, 2],
    [ramp(f.thumbCurl, 0.60, 0.90), 2],
    [f.proxIndexPip < 0.42, 3],         // thumb tip is near index pip area
    [f.thumbTipY > 0.38, 2],            // thumb tip visible (pokes between fingers)
    [Math.abs(f.thumbTipZ) < 0.25, 1], // thumb roughly centered (not strongly front or back)
    [f.thumbTipX > 0.05, 1],           // thumb toward radial side
  ),

  // ── U ──────────────────────────────────────────────────────────────────────
  // Index and middle extended UP together (tight). Ring/pinky curled.
  // Key vs V: fingers are TOGETHER (tight). Key vs H: fingers point UP not sideways.
  'U': (f) => score(
    [f.indexUp, 4],
    [f.middleUp, 4],
    [f.ringCurl > 0.74, 2],
    [f.pinkyCurl > 0.74, 2],
    [f.spreadIndexMid < 0.20, 4],       // TIGHT together (critical U vs V)
    [f.thumbCurl > 0.58, 1],
  ),

  // ── V ──────────────────────────────────────────────────────────────────────
  // Index and middle extended, SPREAD apart in V shape. Ring/pinky curled.
  'V': (f) => score(
    [f.indexUp, 4],
    [f.middleUp, 4],
    [f.ringCurl > 0.74, 2],
    [f.pinkyCurl > 0.74, 2],
    [f.spreadIndexMid > 0.30, 4],       // SPREAD (critical V vs U/H)
    [f.thumbCurl > 0.58, 1],
  ),

  // ── W ──────────────────────────────────────────────────────────────────────
  // Index, middle, ring extended (3 up). Pinky curled. Thumb tucked.
  'W': (f) => score(
    [f.indexUp, 3],
    [f.middleUp, 3],
    [f.ringUp, 3],
    [f.pinkyCurl > 0.68, 2],
    [f.thumbCurl > 0.58, 1],
    [f.spreadIndexMid > 0.18, 1],
    [f.spreadMidRing > 0.18, 1],
  ),

  // ── X ──────────────────────────────────────────────────────────────────────
  // Index HOOKED (partially curled, not fully curled and not straight). Others curled.
  'X': (f) => score(
    [ramp(f.indexCurl, 0.38, 0.68), 4], // index partially curled (hooked)
    [!f.indexUp, 2],                    // NOT fully straight
    [f.indexCurl < 0.80, 1],            // NOT fully curled
    [f.middleCurl > 0.72, 2],
    [f.ringCurl > 0.72, 2],
    [f.pinkyCurl > 0.72, 2],
    [f.thumbCurl > 0.58, 1],
    [f.indexMipY < 0.95, 1],            // index pip not high (not straight)
  ),

  // ── Y ──────────────────────────────────────────────────────────────────────
  // Thumb AND pinky extended (hang-loose). Index/middle/ring curled.
  'Y': (f) => score(
    [f.thumbExtended, 3],
    [f.pinkyUp, 3],
    [f.indexCurl > 0.68, 2],
    [f.middleCurl > 0.68, 2],
    [f.ringCurl > 0.68, 2],
    [f.spreadThumbIndex > 0.48, 2],     // wide gap between thumb and rest
    [f.pinkyTipY > 0.70, 1],
  ),

  // ── Z ──────────────────────────────────────────────────────────────────────
  // Index pointing (G-like pose) + MOTION: zigzag in Z shape.
  // Motion boost applied externally. Static score = G-like.
  'Z': (f) => score(
    [f.indexUp, 4],
    [f.middleCurl > 0.70, 2],
    [f.ringCurl > 0.75, 2],
    [f.pinkyCurl > 0.75, 2],
    [f.thumbCurl > 0.48, 1],
  ),

  // ── BLANK ──────────────────────────────────────────────────────────────────
  // No recognizable configuration (resting, transitioning, occluded).
  'BLANK': (_f) => 0.08, // constant low baseline — never wins unless everything else is ~0
};

const ALL_CLASSES = Object.keys(LETTER_SCORERS);

// ─────────────────────────────────────────────────────────────────────────────
// Main Classifier
// ─────────────────────────────────────────────────────────────────────────────

export class GeometricClassifier {

  /**
   * Classify a sequence of recent normalized frames, with optional wrist motion
   * for J/Z detection.
   *
   * @param frames   Recent NormalizedFrameData frames from SequenceBuffer
   * @param motion   Wrist trajectory motion analysis (needed for J and Z)
   * @param targetLetter  Optional target for targetConfidence reporting
   */
  public classifySequence(
    frames: NormalizedFrameData[],
    motion?: MotionSignature,
    targetLetter?: string
  ): GeometricClassifierResult {
    const t0 = performance.now();
    if (frames.length === 0) return this.emptyResult();

    // Use last 6 frames (most recently formed pose) averaged for stability
    const recentFrames = frames.slice(-6);

    // Average scores across frames
    const avgScores: Record<string, number> = {};
    for (const cls of ALL_CLASSES) avgScores[cls] = 0;

    for (const frame of recentFrames) {
      const features = extractFeatures(frame);
      for (const cls of ALL_CLASSES) {
        avgScores[cls] += LETTER_SCORERS[cls](features);
      }
    }
    for (const cls of ALL_CLASSES) {
      avgScores[cls] /= recentFrames.length;
    }

    // ── J/Z Motion Discrimination ─────────────────────────────────────────
    // J and Z have identical static poses to I and G respectively.
    // Motion is what makes them distinct.
    if (motion) {
      const poseI = avgScores['I'];
      const poseG = avgScores['G'];
      const poseZ = avgScores['Z'];

      if (motion.hasSignificantMotion) {
        // J: significant motion + downward component + I-shaped pose
        const isJLike = poseI > 0.45 && motion.netY > 0.04;
        if (isJLike) {
          const motionBoost = Math.min(0.25, motion.totalTravel * 1.5);
          avgScores['J'] = Math.min(0.95, avgScores['J'] + motionBoost);
          avgScores['I'] = Math.max(0, avgScores['I'] - motionBoost * 0.6);
        }

        // Z: significant motion + X direction reversals (≥1) + G/index-pointing pose
        const isZLike = (poseG > 0.35 || poseZ > 0.35) && motion.xDirectionChanges >= 1;
        if (isZLike) {
          const motionBoost = Math.min(0.30, motion.xDirectionChanges * 0.12 + motion.totalTravel * 0.8);
          avgScores['Z'] = Math.min(0.95, avgScores['Z'] + motionBoost);
          avgScores['G'] = Math.max(0, avgScores['G'] - motionBoost * 0.5);
        }
      } else {
        // No motion → suppress J and Z (they require motion to be distinguished)
        avgScores['J'] = avgScores['J'] * 0.40;
        avgScores['Z'] = avgScores['Z'] * 0.40;
      }
    }

    const probabilities = softmax(avgScores, 0.32);

    let bestClass = 'BLANK';
    let bestConf = 0;
    for (const [cls, p] of Object.entries(probabilities)) {
      if (p > bestConf) { bestConf = p; bestClass = cls; }
    }

    const targetConfidence = targetLetter ? (probabilities[targetLetter] ?? 0) : 0;

    return {
      predictedClass: bestClass,
      confidence: bestConf,
      probabilities,
      targetConfidence,
      latencyMs: performance.now() - t0,
      rawScores: avgScores,
    };
  }

  private emptyResult(): GeometricClassifierResult {
    const probabilities: Record<string, number> = {};
    for (const cls of ALL_CLASSES) probabilities[cls] = 1 / ALL_CLASSES.length;
    return {
      predictedClass: 'BLANK',
      confidence: 1 / ALL_CLASSES.length,
      probabilities,
      targetConfidence: 0,
      latencyMs: 0,
      rawScores: {},
    };
  }
}

export const globalGeometricClassifier = new GeometricClassifier();
