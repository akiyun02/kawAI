export type SignCategory = 'alphabet' | 'numbers' | 'common' | 'phrases';

export interface SignDefinition {
  id: string;
  name: string;
  category: SignCategory;
  description: string;
  handPosition: string;
  orientationTarget: 'camera' | 'inward' | 'side' | 'up' | 'down';
  hints: string[];
  anatomicalTips: string;
  difficulty: 1 | 2 | 3;
  // Desired finger states
  fingers: {
    thumb: 'extended' | 'curled' | 'across' | 'abducted';
    index: 'extended' | 'curled' | 'hooked';
    middle: 'extended' | 'curled' | 'hooked';
    ring: 'extended' | 'curled';
    pinky: 'extended' | 'curled';
  };
  isMotionSign?: boolean;
  motionType?: 'trace_j' | 'trace_z' | 'none';
}

export type RecognitionState = 
  | 'IDLE' 
  | 'HAND_DETECTED' 
  | 'READY' 
  | 'CANDIDATE' 
  | 'CONFIRMED' 
  | 'RELEASE'
  | 'OBSERVING'
  | 'RELEASED';


export type QualityGateReason = 
  | 'OK' 
  | 'NO_HAND' 
  | 'TOO_SMALL' 
  | 'TOO_LARGE' 
  | 'OUT_OF_BOUNDS' 
  | 'UNSTABLE';

export interface QualityGateResult {
  isUsable: boolean;
  reason: QualityGateReason;
  message: string;
  boundingBox?: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    width: number;
    height: number;
  };
}

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface FaceLandmarkData {
  rightEye: Landmark3D;
  leftEye: Landmark3D;
  noseTip: Landmark3D;
  mouthCenter: Landmark3D;
  rightEar?: Landmark3D;
  leftEar?: Landmark3D;
  box?: {
    xCenter: number;
    yCenter: number;
    width: number;
    height: number;
  };
}

export interface RecognitionEvaluation {
  matchedSign: string | null;
  confidence: number; // 0 - 100
  shapeScore: number; // 0 - 100
  orientationScore: number; // 0 - 100
  positionScore: number; // 0 - 100
  locationScore?: number; // 0 - 100
  shapeStatus: 'correct' | 'warning' | 'error';
  orientationStatus: 'correct' | 'warning' | 'error';
  positionStatus: 'correct' | 'warning' | 'error';
  locationStatus?: 'correct' | 'warning' | 'error';
  feedbackMessage: string;
  orientationFeedback: string;
  shapeFeedback: string;
  positionFeedback: string;
  locationFeedback?: string;
  palmNormal: Vector3D;
  isCorrect: boolean;
  holdProgress?: number; // 0 - 100% steady hold progress
  isHolding?: boolean;
  detectedFeatures: {
    fingersExtended: {
      thumb: boolean;
      index: boolean;
      middle: boolean;
      ring: boolean;
      pinky: boolean;
    };
    palmFacing: 'camera' | 'inward' | 'side' | 'unknown';
    centered: boolean;
    fingerSpread?: 'together' | 'spread' | 'normal';
    thumbPosture?: 'across' | 'extended' | 'curled';
    locationZone?: 'forehead' | 'chin' | 'chest' | 'unknown';
  };
  faceData?: FaceLandmarkData | null;
  mlPrediction?: {
    predictedSign: string;
    confidence: number;
    top3: Array<{ sign: string; probability: number }>;
    inferenceTimeMs: number;
  };
  // ASL Fingerspelling enhancements
  recognitionState?: RecognitionState;
  qualityGate?: QualityGateResult;
  statusBadge?: 'strong' | 'steady' | 'none'; // 🟢, 🟡, ⚪
  top1Score?: number;
  top2Score?: number;
  margin?: number;
  isMotionLetter?: boolean;
  motionProgress?: number; // 0 - 100%
  strokeTrail?: Array<{ x: number; y: number }>;
}

export interface StudentProfile {
  id: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  xp_to_next: number;
  streak: number;
  alphabet_mastery: number;
  numbers_mastery: number;
  common_signs_mastery: number;
  orientation_accuracy: number;
  shape_accuracy: number;
  total_attempts: number;
  accuracy_rate: number;
  weaknesses: string[];
  ai_recommendation: {
    title: string;
    focus: string;
    message: string;
    target_signs: string[];
    estimated_time: string;
    xp_bonus: number;
  };
}

export type GameMode = 
  | 'landing'
  | 'dashboard'
  | 'learn'
  | 'practice'
  | 'speedrun'
  | 'wordbuilder'
  | 'detective'
  | 'boss'
  | 'teacher'
  | 'skilltree'
  | 'benchmark'
  | 'recognitionlab';

export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  soundEnabled: boolean;
  reducedMotion: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward_xp: number;
  category: string;
  completed: boolean;
}

export interface CaseFile {
  id: string;
  title: string;
  synopsis: string;
  difficulty: 'Novice' | 'Detective' | 'Master';
  stages: {
    clue: string;
    prompt: string;
    targetSign: string;
    decodedPart: string;
  }[];
  finalMessage: string;
  xpReward: number;
}
