import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SignDefinition, RecognitionEvaluation, Landmark3D, StudentProfile, FaceLandmarkData } from '../types';
import { SIGN_DATABASE, GET_SIGN_BY_ID } from '../data/signs';
import { GAME_LEVELS, GameLevel, AssistStage, ASSIST_STAGES } from '../data/gameLevels';
import { HandSignGraphic } from '../components/HandSignGraphic';
import { WebcamHandTracker } from '../components/WebcamHandTracker';
import { evaluateSign, resetHoldBuffer } from '../services/recognitionEngine';
import { soundFx } from '../services/soundFx';
import { recordAttemptApi } from '../services/api';
import confetti from 'canvas-confetti';
import { SpiralBinder } from '../components/SpiralBinder';
import { Target, Flame, Sparkles, Clock, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw, Eye, EyeOff } from 'lucide-react';

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
  // Level State: Default to Level 1 (Vowels) unless overrideSigns provided
  const [selectedLevelId, setSelectedLevelId] = useState<number>(1);
  const activeLevel = GAME_LEVELS.find(l => l.id === selectedLevelId) || GAME_LEVELS[0];

  // Assist Stage: 'graphic' -> 'hint' -> 'none'
  const [assistStage, setAssistStage] = useState<AssistStage>('graphic');
  const [peekDiagram, setPeekDiagram] = useState<boolean>(false);

  // Pool of signs for practice
  const practicePool = overrideSigns && overrideSigns.length > 0 
    ? overrideSigns 
    : activeLevel.signs;

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
    setPeekDiagram(false);
    startTimeRef.current = Date.now();
  }, [currentIndex, selectedLevelId, assistStage]);

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
        particleCount: 35,
        spread: 55,
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

  const handleSelectLevel = (levelId: number) => {
    setSelectedLevelId(levelId);
    setCurrentIndex(0);
  };

  const avgReaction = reactionTimes.length > 0
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 1400;

  const accuracyPct = attemptsCount > 0 ? Math.round((successCount / attemptsCount) * 100) : 100;

  const showGraphic = assistStage === 'graphic' || peekDiagram;
  const showHints = assistStage !== 'none';

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-5">
      {/* ── TOP LEVEL SELECTOR ─────────────────────────────────────────── */}
      <div className="mb-4 bg-white border-2 sm:border-3 border-[#0F172A] rounded-2xl p-2.5 sm:p-3 shadow-pixel">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🎯</span>
            <span className="font-pixel text-xs sm:text-sm font-black text-[#0F172A]">
              PRACTICE BY LEVEL
            </span>
          </div>
          <span className="font-pixel text-[9px] sm:text-[10px] text-[#166534] bg-[#BBF7D0] px-2 py-0.5 rounded-lg border border-[#0F172A] font-bold">
            {activeLevel.title}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {GAME_LEVELS.map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => handleSelectLevel(lvl.id)}
              className={`p-2 rounded-xl border-2 border-[#0F172A] transition-all text-left flex flex-col justify-between active:translate-y-0.5 ${
                lvl.id === selectedLevelId
                  ? `${lvl.color} shadow-pixel -translate-y-0.5 font-bold`
                  : 'bg-slate-50 hover:bg-white text-slate-700'
              }`}
            >
              <span className="font-pixel text-[8px] text-[#0F172A]">LVL {lvl.id}</span>
              <span className="font-pixel text-[9px] font-black text-[#0F172A] truncate">{lvl.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── ASSIST STAGE SELECTOR ────────────────────────────────────────── */}
      <div className="mb-4 bg-[#FEF08A] border-2 sm:border-3 border-[#0F172A] rounded-2xl p-2 sm:p-2.5 shadow-pixel flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="font-pixel text-[10px] font-bold text-[#854D0E] uppercase">
          ASSIST TIER:
        </span>
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          {ASSIST_STAGES.map((stg) => (
            <button
              key={stg.id}
              onClick={() => setAssistStage(stg.id)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl font-pixel text-[9px] sm:text-[10px] font-bold border-2 border-[#0F172A] transition-all flex items-center justify-center space-x-1 active:translate-y-0.5 ${
                assistStage === stg.id
                  ? 'bg-white text-[#0F172A] shadow-pixel-sm -translate-y-0.5'
                  : 'bg-white/50 text-[#713F12] hover:bg-white/80'
              }`}
            >
              <span>{stg.icon}</span>
              <span>{stg.label}</span>
            </button>
          ))}
        </div>
      </div>

      <SpiralBinder
        title="PRACTICE ARENA"
        subtitle={`${activeLevel.title} • DRILL CARD ${currentIndex + 1} OF ${practicePool.length}`}
        badge={`ACCURACY: ${accuracyPct}%`}
        icon="🎯"
      >
        {/* Practice Arena Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          
          {/* LEFT: Target Card with Graphic Blueprint / Masking */}
          <div className="lg:col-span-4 flex flex-col justify-between bg-[#FEF08A] border-2 sm:border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel">
            <div>
              <div className="flex items-center justify-between border-b-2 border-[#0F172A] pb-2 mb-2 sm:mb-3">
                <span className="font-pixel text-[10px] text-[#0F172A] uppercase font-bold tracking-wider">
                  TARGET CARD
                </span>
                <span className="font-pixel text-[9px] bg-white border border-[#0F172A] px-2 py-0.5 rounded text-[#0F172A] font-bold">
                  CARD #{currentIndex + 1}
                </span>
              </div>

              {/* Big Sign Name */}
              <div className="p-3 bg-white rounded-xl border-2 border-[#0F172A] shadow-inner flex flex-col items-center justify-center my-1.5">
                <span className="text-[9px] text-[#64748B] font-pixel uppercase font-bold">
                  SHOW THIS SIGN
                </span>
                <span className="text-4xl sm:text-5xl font-black font-chunky text-[#0F172A] my-0.5">
                  {targetSign.id}
                </span>
                <span className="text-xs font-bold text-[#475569] font-game">
                  "{targetSign.name}"
                </span>
              </div>

              {/* Graphic Blueprint or Hint Mask */}
              {showGraphic ? (
                <div className="my-2 flex flex-col items-center animate-fadeIn">
                  <HandSignGraphic sign={targetSign} size="md" />
                  {assistStage !== 'graphic' && (
                    <button
                      onClick={() => setPeekDiagram(false)}
                      className="mt-1.5 text-[9px] font-pixel text-[#0284C7] underline flex items-center space-x-1"
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>HIDE BLUEPRINT</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="my-2 p-4 bg-white/70 border-2 border-dashed border-[#0F172A] rounded-xl flex flex-col items-center justify-center text-center">
                  <span className="text-2xl mb-1">{assistStage === 'hint' ? '💡' : '🧠'}</span>
                  <span className="font-pixel text-[9px] text-[#0F172A] font-bold">
                    {assistStage === 'hint' ? 'BLUEPRINT HIDDEN' : 'NO ASSIST MODE'}
                  </span>
                  {assistStage === 'hint' && (
                    <button
                      onClick={() => setPeekDiagram(true)}
                      className="mt-2 px-2.5 py-1 rounded-lg bg-[#38BDF8] text-white font-pixel text-[8px] font-bold border border-[#0F172A] shadow-pixel-sm flex items-center space-x-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>PEEK BLUEPRINT</span>
                    </button>
                  )}
                </div>
              )}

              {/* SENSEI TIP */}
              {showHints && (
                <div className="mt-2 p-2.5 rounded-xl bg-[#FEF9C3] border-2 border-[#0F172A] text-xs">
                  <span className="font-pixel text-[9px] text-[#B45309] block mb-0.5">💡 SENSEI TIP:</span>
                  <p className="text-[#0F172A] font-game text-[12px] leading-snug">
                    {targetSign.hints[0]}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t-2 border-[#0F172A] flex items-center justify-between gap-2">
              <button
                onClick={handleSkip}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#0F172A] text-[10px] font-pixel border-2 border-[#0F172A] shadow-pixel-sm active:translate-y-0.5 transition-all"
              >
                Skip Card
              </button>

              {isCompletedCurrent && (
                <button
                  onClick={handleNextSign}
                  className="px-4 py-2 rounded-xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#0F172A] text-xs font-pixel border-2 border-[#0F172A] shadow-pixel flex items-center space-x-2 active:translate-y-1 transition-all animate-bounce"
                >
                  <span>NEXT SIGN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* CENTER: Webcam Tracker */}
          <div className="lg:col-span-5 flex flex-col">
            <WebcamHandTracker
              targetSignId={currentSignId}
              evaluation={evaluation}
              onLandmarks={handleLandmarks}
              demoMode={demoMode}
              onEnableDemoMode={onToggleDemoMode}
            />
          </div>

          {/* RIGHT: Live Biometrics & Stats */}
          <div className="lg:col-span-3 flex flex-col justify-between bg-white border-2 sm:border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel">
            <div>
              <div className="border-b-2 border-[#0F172A] pb-2 mb-3">
                <span className="font-pixel text-[10px] text-[#0F172A] uppercase font-bold tracking-wider">
                  DRILL STATS
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#FEF08A] border-2 border-[#0F172A]">
                  <span className="font-pixel text-[9px] text-[#0F172A]">STREAK</span>
                  <span className="font-pixel text-xs text-[#DC2626] font-bold">🔥 {streak}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#BAE6FD] border-2 border-[#0F172A]">
                  <span className="font-pixel text-[9px] text-[#0F172A]">AVG TIME</span>
                  <span className="font-pixel text-xs text-[#0284C7] font-bold">{avgReaction}ms</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#BBF7D0] border-2 border-[#0F172A]">
                  <span className="font-pixel text-[9px] text-[#0F172A]">ACCURACY</span>
                  <span className="font-pixel text-xs text-[#16A34A] font-bold">{accuracyPct}%</span>
                </div>
              </div>

              {evaluation && (
                <div className="p-2.5 rounded-xl bg-slate-50 border-2 border-[#0F172A]">
                  <span className="font-pixel text-[9px] text-[#64748B] block mb-1">LIVE CONFIDENCE</span>
                  <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden border border-[#0F172A]">
                    <div
                      className={`h-full transition-all duration-150 ${
                        evaluation.confidence >= 80 ? 'bg-[#10B981]' : (evaluation.confidence >= 50 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]')
                      }`}
                      style={{ width: `${evaluation.confidence}%` }}
                    />
                  </div>
                  <span className="font-pixel text-[9px] text-right block mt-1 font-bold">
                    {Math.round(evaluation.confidence)}%
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t-2 border-[#0F172A]">
              <span className="font-pixel text-[8px] text-[#64748B] block text-center">
                HOLD SHAPE STEADY FOR 350MS
              </span>
            </div>
          </div>
        </div>
      </SpiralBinder>
    </div>
  );
};
