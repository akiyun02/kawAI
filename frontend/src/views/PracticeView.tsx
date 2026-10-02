import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SignDefinition, RecognitionEvaluation, Landmark3D, StudentProfile, FaceLandmarkData } from '../types';
import { SIGN_DATABASE, GET_SIGN_BY_ID } from '../data/signs';
import { WebcamHandTracker } from '../components/WebcamHandTracker';
import { evaluateSign, resetHoldBuffer } from '../services/recognitionEngine';
import { soundFx } from '../services/soundFx';
import { recordAttemptApi } from '../services/api';
import confetti from 'canvas-confetti';
import { SpiralBinder } from '../components/SpiralBinder';
import { Target, Flame, Sparkles, Clock, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';

interface PracticeViewProps {
  profile: StudentProfile | null;
  onRefreshProfile: () => void;
  demoMode: boolean;
  onToggleDemoMode: () => void;
  overrideSigns?: string[];
}

export const PracticeView: React.FC<PracticeViewProps> = ({
  profile,
  onRefreshProfile,
  demoMode,
  onToggleDemoMode,
  overrideSigns
}) => {
  // Pool of signs for practice
  const practicePool = overrideSigns && overrideSigns.length > 0 
    ? overrideSigns 
    : ['B', 'D', 'A', 'C', 'HELLO', 'THANK YOU', '1', '2', 'PEACE'];

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const currentSignId = practicePool[currentIndex % practicePool.length];
  const targetSign: SignDefinition = GET_SIGN_BY_ID(currentSignId);

  const [evaluation, setEvaluation] = useState<RecognitionEvaluation | null>(null);
  const [streak, setStreak] = useState<number>(profile?.streak || 3);
  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [xpEarnedTotal, setXpEarnedTotal] = useState<number>(0);
  const [isCompletedCurrent, setIsCompletedCurrent] = useState<boolean>(false);

  const startTimeRef = useRef<number>(Date.now());
  const evaluatedRef = useRef<boolean>(false);

  useEffect(() => {
    resetHoldBuffer();
    setEvaluation(null);
    setIsCompletedCurrent(false);
    evaluatedRef.current = false;
    startTimeRef.current = Date.now();
  }, [currentIndex]);

  const currentSignIdRef = useRef(currentSignId);
  currentSignIdRef.current = currentSignId;
  const streakRef = useRef(streak);
  streakRef.current = streak;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const onRefreshProfileRef = useRef(onRefreshProfile);
  onRefreshProfileRef.current = onRefreshProfile;

  const handleLandmarks = useCallback((landmarks: Landmark3D[], faceData?: FaceLandmarkData | null, handedness?: 'Left' | 'Right') => {
    const signId = currentSignIdRef.current;
    const result = evaluateSign(landmarks, signId, faceData, handedness);
    setEvaluation(result);

    if (result.isCorrect && !evaluatedRef.current) {
      evaluatedRef.current = true;
      setIsCompletedCurrent(true);

      const latency = Date.now() - startTimeRef.current;
      setReactionTimes(prev => [...prev, latency]);
      setSuccessCount(prev => prev + 1);
      setAttemptsCount(prev => prev + 1);
      setStreak(prev => prev + 1);
      setXpEarnedTotal(prev => prev + 100);

      soundFx.playSuccess();
      soundFx.playCombo(streakRef.current);

      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#10B981', '#06B6D4', '#F59E0B']
      });

      recordAttemptApi({
        student_id: profileRef.current?.id || 'student-alex',
        sign_id: signId,
        mode: 'practice',
        is_correct: true,
        confidence: result.confidence / 100,
        shape_score: result.shapeScore / 100,
        orientation_score: result.orientationScore / 100,
        position_score: result.positionScore / 100,
        latency_ms: latency,
        feedback: result.feedbackMessage
      }).then(() => onRefreshProfileRef.current());
    }
  }, []);

  const handleNextSign = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const handleSkip = () => {
    setAttemptsCount(prev => prev + 1);
    setStreak(Math.max(0, streak - 1));
    handleNextSign();
  };

  const avgReaction = reactionTimes.length > 0
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 1400;

  const accuracyPct = attemptsCount > 0 ? Math.round((successCount / attemptsCount) * 100) : 100;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3">
      <SpiralBinder
        title="DOJO DRILL: FLASHCARD ARENA"
        subtitle="Dynamic practice calibrated to your hand posture. No harsh penalties — only XP!"
        badge={`${currentIndex + 1}/${practicePool.length}`}
        icon="🥋"
      >
        {/* Top Header / Stats Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b-2 border-dashed border-[#94A3B8]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-[#38BDF8] text-[#0F172A] border-2 border-[#0F172A] font-bold shadow-pixel-sm">
                ADAPTIVE PRACTICE
              </span>
              {overrideSigns && (
                <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-[#C084FC] text-[#0F172A] border-2 border-[#0F172A] font-bold shadow-pixel-sm">
                  🎯 AI WEAKNESS FOCUS
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-chunky text-[#0F172A] mt-1 tracking-wide">
              Flashcard Drill #{currentIndex + 1} of {practicePool.length}
            </h2>
          </div>

          {/* Retro Performance Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 bg-[#FEF08A] border-2 border-[#0F172A] px-3 py-1.5 rounded-xl shadow-pixel-sm font-pixel text-[11px] text-[#0F172A]">
              <Flame className="w-3.5 h-3.5 text-[#DC2626] fill-red-400" />
              <span>{streak} STREAK</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-[#BAE6FD] border-2 border-[#0F172A] px-3 py-1.5 rounded-xl shadow-pixel-sm font-pixel text-[11px] text-[#0F172A]">
              <Clock className="w-3.5 h-3.5 text-[#0284C7]" />
              <span>{avgReaction}ms</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-[#BBF7D0] border-2 border-[#0F172A] px-3 py-1.5 rounded-xl shadow-pixel-sm font-pixel text-[11px] text-[#0F172A]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>{accuracyPct}% ACC</span>
            </div>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          {/* Left: Challenge Prompt (Yellow Card) */}
          <div className="lg:col-span-4 flex flex-col justify-between bg-[#FEF08A] border-2 sm:border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel">
            <div>
              <div className="flex items-center justify-between border-b-2 border-[#0F172A] pb-2 mb-2 sm:mb-3">
                <span className="font-pixel text-[10px] sm:text-[11px] text-[#0F172A] uppercase font-bold tracking-wider">
                  QUEST PROMPT
                </span>
                <span className="font-pixel text-[9px] sm:text-[10px] bg-white border border-[#0F172A] px-2 py-0.5 rounded text-[#0F172A]">
                  CARD #{currentIndex + 1}
                </span>
              </div>

              <div className="p-3 sm:p-4 bg-white rounded-xl border-2 border-[#0F172A] shadow-inner flex flex-col items-center justify-center my-1.5 sm:my-2">
                <span className="text-[9px] sm:text-[10px] text-[#64748B] font-pixel uppercase font-bold mb-0.5">
                  SHOW THIS SIGN
                </span>
                <span className="text-5xl sm:text-6xl font-black font-chunky text-[#0F172A] my-0.5">
                  {targetSign.id}
                </span>
                <span className="text-xs font-bold text-[#475569] font-game">
                  "{targetSign.name}"
                </span>
              </div>

              <div className="mt-2 sm:mt-3 p-2.5 sm:p-3 rounded-xl bg-[#FEF9C3] border-2 border-[#0F172A] text-xs">
                <span className="font-pixel text-[9px] sm:text-[10px] text-[#B45309] block mb-0.5">💡 SENSEI TIP:</span>
                <p className="text-[#0F172A] font-game text-[12px] sm:text-[13px] leading-snug">
                  {targetSign.hints[0]}
                </p>
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t-2 border-[#0F172A] flex items-center justify-between gap-2">
              <button
                onClick={handleSkip}
                className="min-h-[38px] px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#0F172A] text-[10px] font-pixel border-2 border-[#0F172A] shadow-pixel-sm active:translate-y-0.5 transition-all"
              >
                Skip Card
              </button>

              {isCompletedCurrent && (
                <button
                  onClick={handleNextSign}
                  className="min-h-[38px] px-4 py-2 rounded-xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#0F172A] text-xs font-pixel border-2 sm:border-3 border-[#0F172A] shadow-pixel flex items-center space-x-2 active:translate-y-1 transition-all animate-bounce"
                >
                  <span>NEXT ({practicePool.length - (currentIndex + 1)})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Center: Live Camera (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <WebcamHandTracker
              targetSignId={currentSignId}
              evaluation={evaluation}
              onLandmarks={handleLandmarks}
              demoMode={demoMode}
              onEnableDemoMode={onToggleDemoMode}
            />
          </div>

          {/* Right: Feedback & Diagnostic Bar (3 cols) */}
          <div className="lg:col-span-3 flex flex-col justify-between bg-[#FEF08A] border-2 sm:border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel">
            <div>
              <div className="flex items-center justify-between pb-2 border-b-2 border-[#0F172A] mb-3">
                <span className="font-pixel text-[11px] text-[#0F172A] uppercase font-bold">AI Scanner</span>
                <span className={`font-pixel text-[10px] px-2 py-0.5 rounded border border-[#0F172A] font-bold ${
                  isCompletedCurrent 
                    ? 'bg-[#4ADE80] text-[#0F172A]' 
                    : 'bg-white text-[#64748B]'
                }`}>
                  {isCompletedCurrent ? '✓ MATCH!' : 'SEARCHING'}
                </span>
              </div>

              {/* Confidence gauge */}
              <div className="text-center p-3 bg-white rounded-xl border-2 border-[#0F172A] shadow-inner mb-3">
                <span className="font-pixel text-[9px] text-[#64748B] block mb-1">MATCH CONFIDENCE</span>
                <span className={`text-4xl font-black font-pixel ${
                  (evaluation?.confidence || 0) >= 80 ? 'text-[#16A34A]' : 'text-[#D97706]'
                }`}>
                  {evaluation?.confidence || 0}%
                </span>
              </div>

              {/* Quick status checks */}
              <div className="space-y-1.5 text-xs font-game">
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#0F172A]">
                  <span className="text-[#475569] font-bold text-[11px]">Hand Shape:</span>
                  <span className={`font-pixel text-[10px] ${evaluation?.shapeStatus === 'correct' ? 'text-[#16A34A]' : 'text-[#D97706]'}`}>
                    {evaluation?.shapeStatus === 'correct' ? '✓ OK' : '⚠ Adjust'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#0F172A]">
                  <span className="text-[#475569] font-bold text-[11px]">Palm Angle:</span>
                  <span className={`font-pixel text-[10px] ${evaluation?.orientationStatus === 'correct' ? 'text-[#16A34A]' : 'text-[#D97706]'}`}>
                    {evaluation?.orientationStatus === 'correct' ? '✓ OK' : '⚠ Adjust'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#0F172A]">
                  <span className="text-[#475569] font-bold text-[11px]">Framing:</span>
                  <span className={`font-pixel text-[10px] ${evaluation?.positionStatus === 'correct' ? 'text-[#16A34A]' : 'text-[#D97706]'}`}>
                    {evaluation?.positionStatus === 'correct' ? '✓ OK' : '⚠ Center'}
                  </span>
                </div>
              </div>

              {/* Feedback dialog */}
              <div className="mt-3 p-2.5 rounded-xl bg-[#BAE6FD] border-2 border-[#0F172A] text-xs">
                <span className="font-pixel text-[9px] text-[#0369A1] block mb-0.5">SENSEI'S NOTE:</span>
                <p className="text-[#0F172A] font-game text-[12px] leading-tight">
                  {evaluation?.feedbackMessage || "Keep fingers steady in view for instant recognition."}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t-2 border-[#0F172A] text-center bg-white rounded-xl p-2 border border-[#0F172A]">
              <span className="font-pixel text-[10px] text-[#0F172A]">
                EARNED: <strong className="text-[#16A34A]">+{xpEarnedTotal} XP</strong>
              </span>
            </div>
          </div>
        </div>
      </SpiralBinder>
    </div>
  );
};
