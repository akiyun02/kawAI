import { Landmark3D } from '../types';
import { normalizeHandLandmarks } from './recognition/landmarkNormalizer';

interface HandPoseFeaturesLocal {
  curls: { thumb: number; index: number; middle: number; ring: number; pinky: number };
  spreads: { indexToMiddle: number; middleToRing: number; ringToPinky: number; thumbToIndex: number };
}

export interface UserCalibrationSample {
  letter: string;
  sampleCount: number;
  averageCurls: { thumb: number; index: number; middle: number; ring: number; pinky: number };
  averageSpreads: { indexToMiddle: number; middleToRing: number; ringToPinky: number; thumbToIndex: number };
  timestamp: number;
}

const STORAGE_KEY = 'signquest_user_calibration_v1';

class UserCalibrationService {
  private calibrations: Record<string, UserCalibrationSample> = {};
  private activeRecordingLetter: string | null = null;
  private recordedFrames: HandPoseFeaturesLocal[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.calibrations = JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load user calibration from localStorage:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.calibrations));
    } catch (e) {
      console.warn('Failed to save user calibration to localStorage:', e);
    }
  }

  public startRecording(letter: string) {
    this.activeRecordingLetter = letter.toUpperCase();
    this.recordedFrames = [];
  }

  public recordFrame(landmarks: Landmark3D[], handedness?: 'Left' | 'Right'): { progress: number; isComplete: boolean } {
    if (!this.activeRecordingLetter || landmarks.length < 21) {
      return { progress: 0, isComplete: false };
    }

    const norm = normalizeHandLandmarks(landmarks, handedness);
    const k = norm.kinematicFeatures;
    this.recordedFrames.push({
      curls: { thumb: k[0], index: k[1], middle: k[2], ring: k[3], pinky: k[4] },
      spreads: { indexToMiddle: k[5], middleToRing: k[6], ringToPinky: k[7], thumbToIndex: k[8] }
    });

    const targetFrames = 30; // ~1 second of webcam capture
    const progress = Math.min(100, Math.round((this.recordedFrames.length / targetFrames) * 100));

    if (this.recordedFrames.length >= targetFrames) {
      this.finishRecording();
      return { progress: 100, isComplete: true };
    }

    return { progress, isComplete: false };
  }

  public finishRecording(): UserCalibrationSample | null {
    if (!this.activeRecordingLetter || this.recordedFrames.length === 0) {
      this.activeRecordingLetter = null;
      return null;
    }

    const n = this.recordedFrames.length;
    const avgCurls = { thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 };
    const avgSpreads = { indexToMiddle: 0, middleToRing: 0, ringToPinky: 0, thumbToIndex: 0 };

    for (const f of this.recordedFrames) {
      avgCurls.thumb += f.curls.thumb;
      avgCurls.index += f.curls.index;
      avgCurls.middle += f.curls.middle;
      avgCurls.ring += f.curls.ring;
      avgCurls.pinky += f.curls.pinky;

      avgSpreads.indexToMiddle += f.spreads.indexToMiddle;
      avgSpreads.middleToRing += f.spreads.middleToRing;
      avgSpreads.ringToPinky += f.spreads.ringToPinky;
      avgSpreads.thumbToIndex += f.spreads.thumbToIndex;
    }

    const sample: UserCalibrationSample = {
      letter: this.activeRecordingLetter,
      sampleCount: n,
      averageCurls: {
        thumb: Number((avgCurls.thumb / n).toFixed(3)),
        index: Number((avgCurls.index / n).toFixed(3)),
        middle: Number((avgCurls.middle / n).toFixed(3)),
        ring: Number((avgCurls.ring / n).toFixed(3)),
        pinky: Number((avgCurls.pinky / n).toFixed(3)),
      },
      averageSpreads: {
        indexToMiddle: Number((avgSpreads.indexToMiddle / n).toFixed(3)),
        middleToRing: Number((avgSpreads.middleToRing / n).toFixed(3)),
        ringToPinky: Number((avgSpreads.ringToPinky / n).toFixed(3)),
        thumbToIndex: Number((avgSpreads.thumbToIndex / n).toFixed(3)),
      },
      timestamp: Date.now()
    };

    this.calibrations[this.activeRecordingLetter] = sample;
    this.saveToStorage();
    this.activeRecordingLetter = null;
    this.recordedFrames = [];

    return sample;
  }

  public getCalibration(letter: string): UserCalibrationSample | null {
    return this.calibrations[letter.toUpperCase()] || null;
  }

  public clearCalibration(letter?: string) {
    if (letter) {
      delete this.calibrations[letter.toUpperCase()];
    } else {
      this.calibrations = {};
    }
    this.saveToStorage();
  }

  public getAllCalibrations(): Record<string, UserCalibrationSample> {
    return { ...this.calibrations };
  }
}

export const userCalibration = new UserCalibrationService();
