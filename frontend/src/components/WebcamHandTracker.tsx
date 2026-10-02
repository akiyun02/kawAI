import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Landmark3D, RecognitionEvaluation, FaceLandmarkData } from '../types';
import { renderHandMesh } from '../services/handCanvasRenderer';
import { generateSimulatedLandmarks } from '../services/recognitionEngine';
import { mediaPipeService } from '../services/mediaPipeService';
import { AlertCircle, Camera, CheckCircle2, RotateCw, Sparkles, Sliders, RefreshCw, SwitchCamera } from 'lucide-react';

interface WebcamHandTrackerProps {
  targetSignId: string;
  evaluation: RecognitionEvaluation | null;
  onLandmarks: (landmarks: Landmark3D[], faceData?: FaceLandmarkData | null, handedness?: 'Left' | 'Right') => void;
  demoMode: boolean;
  onEnableDemoMode: () => void;
}

export const WebcamHandTracker: React.FC<WebcamHandTrackerProps> = ({
  targetSignId,
  evaluation,
  onLandmarks,
  demoMode,
  onEnableDemoMode
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [handDetected, setHandDetected] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [simulatedFlaw, setSimulatedFlaw] = useState<'none' | 'wrong_orientation' | 'bad_shape' | 'off_center'>('none');

  // Performance Refs
  const onLandmarksRef = useRef(onLandmarks);
  onLandmarksRef.current = onLandmarks;

  const evaluationRef = useRef(evaluation);
  evaluationRef.current = evaluation;

  const targetSignIdRef = useRef(targetSignId);
  targetSignIdRef.current = targetSignId;

  const simulatedFlawRef = useRef(simulatedFlaw);
  simulatedFlawRef.current = simulatedFlaw;

  const streamRef = useRef<MediaStream | null>(null);
  const videoLoopRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastEmitTimeRef = useRef<number>(0);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (videoLoopRef.current) {
      cancelAnimationFrame(videoLoopRef.current);
      videoLoopRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Initialize camera with dynamic facingMode (front/back on mobile)
  const startCamera = useCallback(async (facing: 'user' | 'environment' = cameraFacing) => {
    if (demoMode) return;
    try {
      stopCamera();
      setCameraError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam mediaDevices API is not supported in this browser context.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: facing
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraActive(true);
            setCameraError(null);
          }).catch((playErr) => {
            console.warn('Video play error:', playErr);
          });
        };
      }
    } catch (err: unknown) {
      console.warn('Camera access error caught:', err);
      const errorObj = err as any;
      const name = errorObj?.name || '';
      const message = errorObj?.message || '';

      if (
        name === 'NotAllowedError' || 
        name === 'PermissionDeniedError' ||
        message.toLowerCase().includes('not allowed') ||
        message.toLowerCase().includes('permission')
      ) {
        setCameraError('PERMISSION_DENIED');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError('NO_DEVICE_FOUND');
      } else {
        setCameraError(message || 'Camera unavailable');
      }
      setCameraActive(false);
    }
  }, [demoMode, cameraFacing, stopCamera]);

  // Flip camera between front and rear (essential for mobile devices!)
  const handleToggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  // Demo Mode Simulation Loop (Smooth 60fps on canvas, throttled 10Hz to React!)
  useEffect(() => {
    if (!demoMode) return;

    let active = true;
    const loop = () => {
      if (!active) return;
      
      const landmarks = generateSimulatedLandmarks(targetSignIdRef.current, simulatedFlawRef.current);
      setHandDetected(true);

      const simulatedFace: FaceLandmarkData = {
        rightEye: { x: 0.46, y: 0.28, z: 0 },
        leftEye: { x: 0.54, y: 0.28, z: 0 },
        noseTip: { x: 0.50, y: 0.33, z: 0 },
        mouthCenter: { x: 0.50, y: 0.42, z: 0 }
      };

      const now = performance.now();
      if (now - lastEmitTimeRef.current >= 100) {
        lastEmitTimeRef.current = now;
        onLandmarksRef.current(landmarks, simulatedFace, 'Right');
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderHandMesh(ctx, canvas.width, canvas.height, landmarks, evaluationRef.current, true, simulatedFace);
        }
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [demoMode]);

  // Real Camera with High-Performance Singleton MediaPipe Engine
  const [engineReady, setEngineReady] = useState<boolean>(mediaPipeService.isReady);

  useEffect(() => {
    if (demoMode) {
      stopCamera();
      return;
    }

    startCamera();

    let active = true;
    const needsFace = ['HELLO', 'THANK YOU'].includes(targetSignIdRef.current);

    // Register callback with singleton MediaPipe service
    mediaPipeService.registerCallback((landmarks: Landmark3D[], faceData: FaceLandmarkData | null, handedness: 'Left' | 'Right') => {
      if (!active) return;
      setEngineReady(true);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (landmarks && landmarks.length > 0) {
        setHandDetected(true);
        const now = performance.now();
        if (now - lastEmitTimeRef.current >= 28) {
          lastEmitTimeRef.current = now;
          onLandmarksRef.current(landmarks, faceData, handedness);
        }
        renderHandMesh(ctx, canvas.width, canvas.height, landmarks, evaluationRef.current, true, faceData);
      } else {
        setHandDetected(false);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderHandMesh(ctx, canvas.width, canvas.height, [], null, true, faceData);
      }
    });

    // Start video processing loop using requestVideoFrameCallback (hardware vsync) or rAF
    const video = videoRef.current;
    let videoCallbackId: number | null = null;

    const processLoop = () => {
      if (!active) return;
      if (videoRef.current && videoRef.current.readyState >= 2) {
        mediaPipeService.processFrame(videoRef.current, needsFace);
      }

      if (video && 'requestVideoFrameCallback' in video) {
        videoCallbackId = (video as any).requestVideoFrameCallback(processLoop);
      } else {
        videoLoopRef.current = requestAnimationFrame(processLoop);
      }
    };

    // Kick off loop
    if (video && 'requestVideoFrameCallback' in video) {
      videoCallbackId = (video as any).requestVideoFrameCallback(processLoop);
    } else {
      videoLoopRef.current = requestAnimationFrame(processLoop);
    }

    return () => {
      active = false;
      mediaPipeService.unregisterCallback();
      if (videoLoopRef.current) {
        cancelAnimationFrame(videoLoopRef.current);
        videoLoopRef.current = null;
      }
      if (video && videoCallbackId !== null && 'cancelVideoFrameCallback' in video) {
        (video as any).cancelVideoFrameCallback(videoCallbackId);
      }
      stopCamera();
    };
  }, [demoMode, startCamera, stopCamera]);

  const isPermissionDenied = cameraError === 'PERMISSION_DENIED';
  const isMirrored = cameraFacing === 'user';

  return (
    <div className="relative w-full aspect-[4/3] max-h-[340px] sm:max-h-[480px] bg-[#0F172A] rounded-2xl overflow-hidden border-3 sm:border-4 border-[#0F172A] shadow-pixel-lg flex flex-col justify-center items-center">
      {/* Top Viewfinder HUD */}
      <div className="absolute top-2 inset-x-2 sm:inset-x-3 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-1 sm:space-x-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-[#0F172A]/85 border-2 border-white/20 backdrop-blur-sm">
          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${demoMode ? 'bg-[#FBBF24] animate-ping' : 'bg-[#EF4444] animate-pulse'}`} />
          <span className="font-pixel text-[8px] sm:text-[9px] text-white font-bold tracking-wider">
            {demoMode ? 'SIMULATOR ON' : 'LIVE 30FPS'}
          </span>
        </div>

        {/* Camera Flip Button (Only in real webcam mode) */}
        {!demoMode && cameraActive && (
          <button
            onClick={handleToggleCameraFacing}
            title="Flip Camera (Front/Rear)"
            className="pointer-events-auto p-1.5 rounded-lg bg-white border-2 border-[#0F172A] text-[#0F172A] shadow-pixel-sm active:translate-y-0.5"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="flex items-center space-x-1 sm:space-x-1.5">
          <div className="px-1.5 py-0.5 rounded bg-black/60 font-pixel text-[7px] sm:text-[8px] text-[#38BDF8]">
            CV HANDS
          </div>
          <div className="px-1.5 py-0.5 rounded bg-black/60 font-pixel text-[7px] sm:text-[8px] text-[#A855F7] flex items-center space-x-0.5">
            <span>👤</span>
            <span>FACE ANCHOR</span>
          </div>
          {evaluation?.mlPrediction && (
            <div className="px-1.5 py-0.5 rounded bg-[#0284C7]/85 border border-[#38BDF8]/40 font-pixel text-[7px] sm:text-[8px] text-white flex items-center space-x-1">
              <span>🧠 {evaluation.mlPrediction.predictedSign}</span>
              <span className="text-[#BAE6FD]">({Math.round(evaluation.mlPrediction.confidence)}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Real Video Element */}
      {!demoMode && (
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover opacity-90 ${isMirrored ? '-scale-x-100' : ''}`}
          playsInline
          autoPlay
          muted
        />
      )}

      {/* Demo Mode Diamond Grid Screen */}
      {demoMode && (
        <div className="absolute inset-0 bg-[#0F172A] opacity-95 flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] sm:[background-size:20px_20px] opacity-30" />
          <div className="font-pixel text-[9px] sm:text-[10px] text-[#38BDF8] tracking-widest select-none z-0">
            3D LANDMARK KINEMATICS
          </div>
        </div>
      )}

      {/* Canvas for Landmark Mesh & Skeleton Overlay */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className={`absolute inset-0 w-full h-full object-contain pointer-events-none z-10 ${isMirrored ? '-scale-x-100' : ''}`}
      />

      {/* Camera Error / Permission Banner */}
      {!demoMode && cameraError && (
        <div className="absolute inset-0 z-40 bg-[#E0F2FE]/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-center border-3 sm:border-4 border-[#0F172A]">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#FEF08A] border-2 sm:border-3 border-[#0F172A] shadow-pixel flex items-center justify-center mb-2 sm:mb-3 text-[#0F172A]">
            <Camera className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          
          <h3 className="font-pixel text-sm sm:text-base font-black text-[#0F172A] mb-1">
            {isPermissionDenied ? 'CAMERA BLOCKED' : 'CAMERA UNPLUGGED'}
          </h3>
          
          <p className="font-game text-[11px] sm:text-xs text-[#334155] max-w-sm mb-3 sm:mb-4 leading-tight">
            {isPermissionDenied
              ? 'Click the 🔒 icon in the URL bar to allow camera, or switch to Demo Mode below.'
              : 'Unable to stream webcam. Switch to Demo Mode for instant presentation!'}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <button
              onClick={onEnableDemoMode}
              className="game-btn px-3.5 py-2 rounded-xl bg-[#FEF08A] hover:bg-[#FDE047] text-[#0F172A] font-pixel text-[9px] sm:text-[10px] font-bold flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              <span>USE DEMO MODE</span>
            </button>

            <button
              onClick={() => startCamera(cameraFacing)}
              className="game-btn px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#0F172A] font-pixel text-[9px] sm:text-[10px] flex items-center space-x-1"
            >
              <RotateCw className="w-3 h-3" />
              <span>RETRY</span>
            </button>
          </div>
        </div>
      )}

      {/* Guidance Tag when no hand is in frame */}
      {!demoMode && !cameraError && !handDetected && (
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-pixel flex items-center space-x-1.5 font-pixel text-[8px] sm:text-[9px] text-[#0F172A] whitespace-nowrap">
          <AlertCircle className="w-3 h-3 text-[#0284C7] animate-pulse" />
          <span>POSITION HAND IN FRAME 🖐</span>
        </div>
      )}

      {/* Engine Warming Indicator */}
      {!demoMode && !cameraError && !engineReady && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-xl bg-[#FEF08A] border-2 border-[#0F172A] shadow-pixel flex items-center space-x-2 font-pixel text-[8px] sm:text-[9px] text-[#0F172A] animate-pulse">
          <RefreshCw className="w-3 h-3 text-[#B45309] animate-spin" />
          <span>INITIALIZING KAWAII AI...</span>
        </div>
      )}

      {/* Live Friendly Status Badge Pill (Green strong, Yellow steady, Gray no sign) */}
      {!cameraError && handDetected && (
        <div className="absolute top-10 sm:top-11 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-200">
          {evaluation?.isCorrect || evaluation?.statusBadge === 'strong' ? (
            <div className="px-3 py-1 rounded-full bg-[#10B981] border-2 border-white text-white font-pixel text-[8px] sm:text-[10px] shadow-lg flex items-center space-x-1.5 animate-bounce">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>🟢 {evaluation.feedbackMessage || 'Strong match!'}</span>
            </div>
          ) : evaluation?.isHolding || evaluation?.statusBadge === 'steady' ? (
            <div className="px-3 py-1 rounded-full bg-[#F59E0B] border-2 border-white text-white font-pixel text-[8px] sm:text-[10px] shadow-lg flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>🟡 {evaluation.feedbackMessage || 'Hold steady...'}</span>
              {evaluation.holdProgress !== undefined && (
                <span className="text-[9px] font-mono font-bold bg-black/20 px-1 rounded">
                  {Math.round(evaluation.holdProgress)}%
                </span>
              )}
            </div>
          ) : (
            <div className="px-2.5 py-0.5 rounded-full bg-[#0F172A]/85 border border-white/20 text-[#94A3B8] font-pixel text-[8px] sm:text-[9px] backdrop-blur-sm flex items-center space-x-1">
              <span>⚪</span>
              <span>{evaluation?.qualityGate?.message || evaluation?.feedbackMessage || 'No clear sign'}</span>
            </div>
          )}
        </div>
      )}

      {/* DEMO MODE PRESENTER CONTROLS (Responsive mobile buttons) */}
      {demoMode && (
        <div className="absolute bottom-2 inset-x-2 z-30 bg-[#BAE6FD] border-2 sm:border-3 border-[#0F172A] rounded-xl p-1.5 sm:p-2 shadow-pixel flex items-center justify-between gap-1 overflow-x-auto scrollbar-none touch-pan-x">
          <div className="hidden xs:flex items-center space-x-1 font-pixel text-[8px] sm:text-[9px] text-[#0F172A] font-bold shrink-0">
            <Sliders className="w-3 h-3 text-[#0284C7]" />
            <span>FLAW:</span>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
            <button
              onClick={() => setSimulatedFlaw('none')}
              className={`game-btn px-2 sm:px-2.5 py-1 rounded-lg font-pixel text-[8px] sm:text-[9px] font-bold ${
                simulatedFlaw === 'none'
                  ? 'bg-[#4ADE80] text-[#0F172A]'
                  : 'bg-white text-[#475569]'
              }`}
            >
              ✓ CLEAN
            </button>

            <button
              onClick={() => setSimulatedFlaw('wrong_orientation')}
              className={`game-btn px-2 sm:px-2.5 py-1 rounded-lg font-pixel text-[8px] sm:text-[9px] font-bold ${
                simulatedFlaw === 'wrong_orientation'
                  ? 'bg-[#FEF08A] text-[#854D0E]'
                  : 'bg-white text-[#854D0E]'
              }`}
              title="Simulates student forming correct shape but rotating palm inward"
            >
              ⚠ INWARD
            </button>

            <button
              onClick={() => setSimulatedFlaw('bad_shape')}
              className={`game-btn px-2 sm:px-2.5 py-1 rounded-lg font-pixel text-[8px] sm:text-[9px] font-bold ${
                simulatedFlaw === 'bad_shape'
                  ? 'bg-[#F87171] text-[#7F1D1D]'
                  : 'bg-white text-[#DC2626]'
              }`}
              title="Simulates finger shape ambiguity"
            >
              ⚠ CURL
            </button>

            <button
              onClick={() => setSimulatedFlaw('off_center')}
              className={`game-btn px-2 sm:px-2.5 py-1 rounded-lg font-pixel text-[8px] sm:text-[9px] font-bold ${
                simulatedFlaw === 'off_center'
                  ? 'bg-[#38BDF8] text-[#0F172A]'
                  : 'bg-white text-[#475569]'
              }`}
            >
              ⚠ SHIFT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
