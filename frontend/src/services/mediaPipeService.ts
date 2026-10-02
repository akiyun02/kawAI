import { Landmark3D, FaceLandmarkData } from '../types';

export type HandLandmarksCallback = (
  landmarks: Landmark3D[],
  faceData: FaceLandmarkData | null,
  handedness: 'Left' | 'Right'
) => void;

class MediaPipeService {
  private handsInstance: any = null;
  private faceInstance: any = null;
  private isWarmingUp: boolean = false;
  private isWarmedUp: boolean = false;
  private isProcessingHand: boolean = false;
  private isProcessingFace: boolean = false;
  private activeCallback: HandLandmarksCallback | null = null;
  private lastFaceData: FaceLandmarkData | null = null;
  private lastHandTime: number = 0;
  private lastFaceTime: number = 0;

  /**
   * Pre-warms the MediaPipe Hands engine in the background so there is zero delay
   * when the user opens the camera in any game mode.
   */
  public async warmUp(): Promise<boolean> {
    if (this.isWarmedUp) return true;
    if (this.isWarmingUp) {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (this.isWarmedUp) {
            clearInterval(interval);
            resolve(true);
          }
        }, 100);
      });
    }

    this.isWarmingUp = true;
    const win = window as any;

    // Wait until window.Hands is loaded from the CDN script
    let attempts = 0;
    while (!win.Hands && attempts < 30) {
      await new Promise((r) => setTimeout(r, 100));
      attempts++;
    }

    if (!win.Hands) {
      console.warn('MediaPipe Hands script not ready yet');
      this.isWarmingUp = false;
      return false;
    }

    try {
      this.handsInstance = new win.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      this.handsInstance.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // Lite model for ultra-low latency & best FPS
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.handsInstance.onResults((results: any) => {
        this.isProcessingHand = false;
        if (!this.activeCallback) return;

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          const raw = results.multiHandLandmarks[0];
          const handedness = (results.multiHandedness?.[0]?.label as 'Left' | 'Right') || 'Right';
          const landmarks: Landmark3D[] = raw.map((lm: any) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z || 0
          }));
          this.activeCallback(landmarks, this.lastFaceData, handedness);
        } else {
          this.activeCallback([], this.lastFaceData, 'Right');
        }
      });

      this.isWarmedUp = true;
      this.isWarmingUp = false;
      return true;
    } catch (err) {
      console.error('MediaPipe warmup failed:', err);
      this.isWarmingUp = false;
      return false;
    }
  }

  /**
   * Lazily initializes face detection only when a sign actually requires facial anchoring.
   */
  public async ensureFaceDetector(): Promise<void> {
    if (this.faceInstance) return;
    const win = window as any;
    if (!win.FaceDetection) return;

    try {
      this.faceInstance = new win.FaceDetection({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
      });

      this.faceInstance.setOptions({
        model: 'short',
        minDetectionConfidence: 0.4
      });

      this.faceInstance.onResults((results: any) => {
        this.isProcessingFace = false;
        if (results.detections && results.detections.length > 0) {
          const det = results.detections[0];
          const lms = det.landmarks;
          if (lms && lms.length >= 4) {
            this.lastFaceData = {
              rightEye: { x: lms[0].x, y: lms[0].y, z: lms[0].z || 0 },
              leftEye: { x: lms[1].x, y: lms[1].y, z: lms[1].z || 0 },
              noseTip: { x: lms[2].x, y: lms[2].y, z: lms[2].z || 0 },
              mouthCenter: { x: lms[3].x, y: lms[3].y, z: lms[3].z || 0 },
              rightEar: lms[4] ? { x: lms[4].x, y: lms[4].y, z: lms[4].z || 0 } : undefined,
              leftEar: lms[5] ? { x: lms[5].x, y: lms[5].y, z: lms[5].z || 0 } : undefined,
              box: det.boundingBox
            };
          }
        } else {
          this.lastFaceData = null;
        }
      });
    } catch (e) {
      console.warn('Face detection init error:', e);
    }
  }

  public registerCallback(cb: HandLandmarksCallback): void {
    this.activeCallback = cb;
  }

  public unregisterCallback(): void {
    this.activeCallback = null;
  }

  public get isReady(): boolean {
    return this.isWarmedUp;
  }

  /**
   * Processes a video frame with adaptive frame skipping to guarantee snappy 30 FPS.
   */
  public async processFrame(videoElement: HTMLVideoElement, needsFace: boolean = false): Promise<void> {
    if (!this.isWarmedUp || !this.handsInstance) {
      await this.warmUp();
      return;
    }

    if (videoElement.readyState < 2) return;

    const now = performance.now();

    // Hand inference rate: ~30 FPS (every 30ms)
    if (now - this.lastHandTime >= 30 && !this.isProcessingHand) {
      this.lastHandTime = now;
      this.isProcessingHand = true;
      try {
        await this.handsInstance.send({ image: videoElement });
      } catch (err) {
        this.isProcessingHand = false;
      }
    }

    // Face inference rate: only if sign needs it, throttled to 8 FPS (every 125ms)
    if (needsFace) {
      if (!this.faceInstance) {
        this.ensureFaceDetector();
      } else if (now - this.lastFaceTime >= 125 && !this.isProcessingFace) {
        this.lastFaceTime = now;
        this.isProcessingFace = true;
        this.faceInstance.send({ image: videoElement }).catch(() => {
          this.isProcessingFace = false;
        });
      }
    }
  }
}

export const mediaPipeService = new MediaPipeService();
