import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SignDefinition, RecognitionEvaluation, Landmark3D, StudentProfile, FaceLandmarkData } from '../types';
import { SIGN_DATABASE, GET_SIGN_BY_ID } from '../data/signs';
import { TargetSignCard } from '../components/TargetSignCard';
import { WebcamHandTracker } from '../components/WebcamHandTracker';
import { LiveFeedbackPanel } from '../components/LiveFeedbackPanel';
import { evaluateSign, resetHoldBuffer } from '../services/recognitionEngine';
import { soundFx } from '../services/soundFx';
import { recordAttemptApi } from '../services/api';
import { SpiralBinder } from '../components/SpiralBinder';
import confetti from 'canvas-confetti';

interface LearnViewProps {
  initialSignId?: string;
  profile: StudentProfile | null;
  onRefreshProfile: () => void;
  demoMode: boolean;
  onToggleDemoMode: () => void;
}

export const LearnView: React.FC<LearnViewProps> = ({
  initialSignId = 'B',
  profile,
  onRefreshProfile,
  demoMode,
  onToggleDemoMode
}) => {
  const [currentSignId, setCurrentSignId] = useState<string>(initialSignId);
  const targetSign: SignDefinition = GET_SIGN_BY_ID(currentSignId);

  const [evaluation, setEvaluation] = useState<RecognitionEvaluation | null>(null);
  const [xpEarned, setXpEarned] = useState<number>(0);
  const [comboCount, setComboCount] = useState<number>(1);

  const startTimeRef = useRef<number>(Date.now());
  const evaluatedRef = useRef<boolean>(false);
  const currentSignIdRef = useRef<string>(currentSignId);
  currentSignIdRef.current = currentSignId;
  const comboCountRef = useRef<number>(comboCount);
  comboCountRef.current = comboCount;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const onRefreshProfileRef = useRef(onRefreshProfile);
  onRefreshProfileRef.current = onRefreshProfile;

  // When sign changes, reset state
  useEffect(() => {
    resetHoldBuffer();
    setEvaluation(null);
    evaluatedRef.current = false;
    startTimeRef.current = Date.now();
  }, [currentSignId]);

  // Handle landmarks received from camera or simulation (guaranteed stable callback)
  const handleLandmarks = useCallback((landmarks: Landmark3D[], faceData?: FaceLandmarkData | null, handedness?: 'Left' | 'Right') => {
    const signId = currentSignIdRef.current;
    const result = evaluateSign(landmarks, signId, faceData, handedness);
    setEvaluation(result);

    // If recognized and not yet awarded
    if (result.isCorrect && !evaluatedRef.current) {
      evaluatedRef.current = true;
      
      const latency = Date.now() - startTimeRef.current;
      const earned = 100 + (latency < 1500 ? 30 : 0);
      setXpEarned(earned);
      setComboCount(prev => prev + 1);

      // Play audio and confetti
      soundFx.playSuccess();
      soundFx.playCombo(comboCountRef.current);

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#6366F1', '#06B6D4', '#10B981']
      });

      // Log attempt to backend asynchronously
      recordAttemptApi({
        student_id: profileRef.current?.id || 'student-alex',
        sign_id: signId,
        mode: 'learn',
        is_correct: true,
        confidence: result.confidence / 100,
        shape_score: result.shapeScore / 100,
        orientation_score: result.orientationScore / 100,
        position_score: result.positionScore / 100,
        latency_ms: latency,
        feedback: result.feedbackMessage
      }).then(() => {
        onRefreshProfileRef.current();
      });
    }
  }, []); // Truly stable callback!

  const handleRetry = () => {
    resetHoldBuffer();
    evaluatedRef.current = false;
    setXpEarned(0);
    startTimeRef.current = Date.now();
  };

  const handleNext = () => {
    resetHoldBuffer();
    const currentIndex = SIGN_DATABASE.findIndex((s: SignDefinition) => s.id === currentSignId);
    const nextIndex = (currentIndex + 1) % SIGN_DATABASE.length;
    setCurrentSignId(SIGN_DATABASE[nextIndex].id);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4">
      <SpiralBinder
        title="KawAI HANDBOOK"
        subtitle={`TARGET SIGN: ${targetSign.name} (TIER ${targetSign.difficulty})`}
        badge={`PALM: ${targetSign.orientationTarget.toUpperCase()}`}
        icon="📖"
      >
        {/* Main 3-Column Screen Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* LEFT COLUMN: Target Sign Reference (3 cols) */}
          <div className="lg:col-span-3">
            <TargetSignCard
              sign={targetSign}
              onSelectSign={(id) => setCurrentSignId(id)}
              availableSigns={SIGN_DATABASE}
            />
          </div>

          {/* CENTER COLUMN: Large Webcam + Hand Landmarks Overlay (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <WebcamHandTracker
              targetSignId={currentSignId}
              evaluation={evaluation}
              onLandmarks={handleLandmarks}
              demoMode={demoMode}
              onEnableDemoMode={onToggleDemoMode}
            />
          </div>

          {/* RIGHT COLUMN: AI Analysis & Biomechanical Breakdown (4 cols) */}
          <div className="lg:col-span-4 flex flex-col">
            <LiveFeedbackPanel
              targetSign={targetSign}
              evaluation={evaluation}
              xpEarned={xpEarned}
              comboCount={comboCount}
              onRetry={handleRetry}
              onNext={handleNext}
            />
          </div>
        </div>
      </SpiralBinder>
    </div>
  );
};
