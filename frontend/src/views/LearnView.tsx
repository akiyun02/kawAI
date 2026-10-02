import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SignDefinition, RecognitionEvaluation, Landmark3D, StudentProfile, FaceLandmarkData } from '../types';
import { SIGN_DATABASE, GET_SIGN_BY_ID } from '../data/signs';
import { GAME_LEVELS, GameLevel, AssistStage, ASSIST_STAGES } from '../data/gameLevels';
import { TargetSignCard } from '../components/TargetSignCard';
import { WebcamHandTracker } from '../components/WebcamHandTracker';
import { LiveFeedbackPanel } from '../components/LiveFeedbackPanel';
import { evaluateSign, resetHoldBuffer } from '../services/recognitionEngine';
import { soundFx } from '../services/soundFx';
import { recordAttemptApi } from '../services/api';
import { SpiralBinder } from '../components/SpiralBinder';
import confetti from 'canvas-confetti';
import { Trophy, Star, ArrowRight, CheckCircle2, Sparkles, RotateCcw, Award, Zap, Pause, Play } from 'lucide-react';

interface LearnViewProps {
  initialSignId?: string;
  profile: StudentProfile | null;
  onRefreshProfile: () => void;
  demoMode: boolean;
  onToggleDemoMode: () => void;
}

export const LearnView: React.FC<LearnViewProps> = ({
  initialSignId = 'A',
  profile,
  onRefreshProfile,
  demoMode,
  onToggleDemoMode
}) => {
  // Level State: Default to Level 1 (The Vowels: A, E, I, O, U)
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const currentLevel: GameLevel = GAME_LEVELS.find(l => l.id === currentLevelId) || GAME_LEVELS[0];

  // Assist Stage State: 'graphic' -> 'hint' -> 'none'
  const [assistStage, setAssistStage] = useState<AssistStage>('graphic');

  // Auto Advance State: Automatically advances through signs, stages, and levels!
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [stageNotification, setStageNotification] = useState<string | null>(null);
  const [levelCountdown, setLevelCountdown] = useState<number | null>(null);

  // Active Sign within Current Level
  const [currentSignId, setCurrentSignId] = useState<string>(
    currentLevel.signs.includes(initialSignId) ? initialSignId : currentLevel.signs[0]
  );
  const targetSign: SignDefinition = GET_SIGN_BY_ID(currentSignId);

  // Level Mastery State
  const [completedSigns, setCompletedSigns] = useState<Record<string, AssistStage>>({});
  const [showLevelCompleteModal, setShowLevelCompleteModal] = useState<boolean>(false);

  const [evaluation, setEvaluation] = useState<RecognitionEvaluation | null>(null);
  const [xpEarned, setXpEarned] = useState<number>(0);
  const [comboCount, setComboCount] = useState<number>(1);

  const startTimeRef = useRef<number>(Date.now());
  const evaluatedRef = useRef<boolean>(false);
  const currentSignIdRef = useRef<string>(currentSignId);
  currentSignIdRef.current = currentSignId;
  const assistStageRef = useRef<AssistStage>(assistStage);
  assistStageRef.current = assistStage;
  const comboCountRef = useRef<number>(comboCount);
  comboCountRef.current = comboCount;
  const autoAdvanceRef = useRef<boolean>(autoAdvance);
  autoAdvanceRef.current = autoAdvance;
  const autoNextTimerRef = useRef<any>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const onRefreshProfileRef = useRef(onRefreshProfile);
  onRefreshProfileRef.current = onRefreshProfile;

  // When level changes, default to first sign of that level
  const handleSelectLevel = (levelId: number) => {
    if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    setCurrentLevelId(levelId);
    const lvl = GAME_LEVELS.find(l => l.id === levelId) || GAME_LEVELS[0];
    setCurrentSignId(lvl.signs[0]);
    setShowLevelCompleteModal(false);
  };

  // When sign or level changes, reset hold and recognition state
  useEffect(() => {
    resetHoldBuffer();
    setEvaluation(null);
    evaluatedRef.current = false;
    startTimeRef.current = Date.now();
    return () => {
      if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
    };
  }, [currentSignId, currentLevelId, assistStage]);

  const handleNextLevel = useCallback(() => {
    setShowLevelCompleteModal(false);
    setLevelCountdown(null);
    if (currentLevelId < GAME_LEVELS.length) {
      handleSelectLevel(currentLevelId + 1);
    }
  }, [currentLevelId]);

  // Master Next Sign / Stage / Level Advancer
  const handleNextSign = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    resetHoldBuffer();
    const idx = currentLevel.signs.indexOf(currentSignIdRef.current);
    
    if (idx < currentLevel.signs.length - 1) {
      // 1. Auto-advance to next sign in current level
      setCurrentSignId(currentLevel.signs[idx + 1]);
    } else {
      // 2. Completed all signs in this stage -> Auto-advance stage!
      if (assistStageRef.current === 'graphic') {
        setStageNotification('🎉 BLUEPRINT STAGE CLEARED! AUTO-ADVANCING TO STAGE 2: HINTS...');
        setTimeout(() => setStageNotification(null), 3200);
        setAssistStage('hint');
        setCurrentSignId(currentLevel.signs[0]);
      } else if (assistStageRef.current === 'hint') {
        setStageNotification('🔥 HINTS CLEARED! AUTO-ADVANCING TO STAGE 3: BLIND RECALL...');
        setTimeout(() => setStageNotification(null), 3200);
        setAssistStage('none');
        setCurrentSignId(currentLevel.signs[0]);
      } else {
        // 3. Completed Stage 3 (Mastery) -> Auto-advance to Next Level!
        setShowLevelCompleteModal(true);
      }
    }
  }, [currentLevel.signs]);

  // Handle landmarks received from camera or simulation
  const handleLandmarks = useCallback((landmarks: Landmark3D[], faceData?: FaceLandmarkData | null, handedness?: 'Left' | 'Right') => {
    const signId = currentSignIdRef.current;
    const result = evaluateSign(landmarks, signId, faceData, handedness);
    setEvaluation(result);

    // If recognized and not yet awarded
    if (result.isCorrect && !evaluatedRef.current) {
      evaluatedRef.current = true;
      
      const latency = Date.now() - startTimeRef.current;
      const stageBonus = assistStageRef.current === 'none' ? 100 : (assistStageRef.current === 'hint' ? 50 : 0);
      const earned = 100 + stageBonus + (latency < 1500 ? 30 : 0);
      setXpEarned(earned);
      setComboCount(prev => prev + 1);

      // Record mastery
      setCompletedSigns(prev => {
        const next = { ...prev, [signId]: assistStageRef.current };
        const allDone = currentLevel.signs.every(s => next[s]);
        if (allDone && assistStageRef.current === 'none') {
          setTimeout(() => setShowLevelCompleteModal(true), 600);
        }
        return next;
      });

      // Play audio and confetti
      soundFx.playSuccess();
      soundFx.playCombo(comboCountRef.current);

      confetti({
        particleCount: assistStageRef.current === 'none' ? 60 : 35,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#38BDF8', '#FBBF24', '#10B981', '#EC4899']
      });

      // ── AUTO-NEXT TRIGGER (1200ms delay for visual satisfaction) ────────
      if (autoAdvanceRef.current) {
        if (autoNextTimerRef.current) clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = setTimeout(() => {
          handleNextSign();
        }, 1250);
      }

      // Log attempt to backend
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
  }, [currentLevel.signs, handleNextSign]);

  // Level Complete Modal Auto-Advance Countdown (4s)
  useEffect(() => {
    let interval: any = null;
    if (showLevelCompleteModal && autoAdvance && currentLevelId < GAME_LEVELS.length) {
      setLevelCountdown(4);
      interval = setInterval(() => {
        setLevelCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            handleNextLevel();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setLevelCountdown(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showLevelCompleteModal, autoAdvance, currentLevelId, handleNextLevel]);

  const levelSignDefinitions: SignDefinition[] = currentLevel.signs.map(id => GET_SIGN_BY_ID(id));
  const completedCount = currentLevel.signs.filter(s => completedSigns[s]).length;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-5">
      {/* ── STAGE ADVANCEMENT TOAST BANNER ───────────────────────────────── */}
      {stageNotification && (
        <div className="mb-3 p-3 bg-[#4ADE80] border-3 border-[#0F172A] rounded-2xl shadow-pixel text-center animate-bounce">
          <span className="font-pixel text-xs sm:text-sm text-[#0F172A] font-black">
            {stageNotification}
          </span>
        </div>
      )}

      {/* ── TOP LEVEL SELECTION BAR ─────────────────────────────────────── */}
      <div className="mb-4 bg-white border-2 sm:border-3 border-[#0F172A] rounded-2xl p-2.5 sm:p-3 shadow-pixel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xl sm:text-2xl">🗺️</span>
            <div>
              <h2 className="font-pixel text-xs sm:text-sm font-black text-[#0F172A]">
                ASL CAMPAIGN MAP
              </h2>
              <span className="font-chunky text-[11px] sm:text-xs text-[#64748B]">
                Start with Level 1 Vowels, advance through hints to no-assist mastery!
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Auto-Next Toggle Button */}
            <button
              onClick={() => setAutoAdvance(prev => !prev)}
              title="Automatically advance to the next sign and stage when completed"
              className={`px-2.5 py-1 rounded-xl border-2 border-[#0F172A] font-pixel text-[9px] sm:text-[10px] font-bold shadow-pixel-sm transition-all flex items-center space-x-1.5 active:translate-y-0.5 ${
                autoAdvance
                  ? 'bg-[#22C55E] text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${autoAdvance ? 'fill-current animate-pulse' : ''}`} />
              <span>AUTO-NEXT: {autoAdvance ? 'ON' : 'OFF'}</span>
            </button>

            <span className="font-pixel text-[9px] sm:text-[10px] text-[#0284C7] font-bold bg-[#E0F2FE] px-2 py-1 rounded-lg border border-[#0F172A]">
              LEVEL {currentLevelId} / {GAME_LEVELS.length}
            </span>
          </div>
        </div>

        {/* Level Ribbon Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {GAME_LEVELS.map((lvl) => {
            const isSelected = lvl.id === currentLevelId;
            const isCompleted = lvl.signs.every(s => completedSigns[s]);
            return (
              <button
                key={lvl.id}
                onClick={() => handleSelectLevel(lvl.id)}
                className={`p-2 rounded-xl border-2 border-[#0F172A] transition-all text-left flex flex-col justify-between relative active:translate-y-0.5 ${
                  isSelected
                    ? `${lvl.color} shadow-pixel -translate-y-0.5 font-bold`
                    : 'bg-slate-50 hover:bg-white text-slate-700'
                }`}
              >
                {isCompleted && (
                  <span className="absolute top-1 right-1 text-xs">⭐</span>
                )}
                <div>
                  <span className="font-pixel text-[8px] sm:text-[9px] block text-[#0F172A] leading-tight">
                    LVL {lvl.id}
                  </span>
                  <span className="font-pixel text-[9px] sm:text-[10px] block font-black text-[#0F172A] truncate">
                    {lvl.subtitle}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-chunky text-[9px] sm:text-[10px] text-[#475569]">
                    {lvl.signs.length} signs
                  </span>
                  <span className="text-[10px]">{lvl.id === 1 ? '🌟' : (lvl.id === 2 ? '✋' : (lvl.id === 3 ? '✊' : '⚡'))}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3-STAGE ASSIST NAVIGATION TABS ────────────────────────────────── */}
      <div className="mb-4 bg-[#FEF08A] border-2 sm:border-3 border-[#0F172A] rounded-2xl p-2 sm:p-2.5 shadow-pixel flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="font-pixel text-[10px] sm:text-xs font-bold text-[#854D0E] uppercase flex items-center space-x-1">
            <span>🎓</span>
            <span>LEARNING ASSIST MODE:</span>
          </span>
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          {ASSIST_STAGES.map((stg) => {
            const isActive = assistStage === stg.id;
            return (
              <button
                key={stg.id}
                onClick={() => setAssistStage(stg.id)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl font-pixel text-[9px] sm:text-[10px] font-bold border-2 border-[#0F172A] transition-all flex items-center justify-center space-x-1 active:translate-y-0.5 ${
                  isActive
                    ? 'bg-white text-[#0F172A] shadow-pixel-sm -translate-y-0.5'
                    : 'bg-white/50 text-[#713F12] hover:bg-white/80'
                }`}
              >
                <span>{stg.icon}</span>
                <span>{stg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN HANDBOOK BINDER ─────────────────────────────────────────── */}
      <SpiralBinder
        title={currentLevel.title}
        subtitle={`${currentLevel.subtitle} • STAGE: ${assistStage.toUpperCase()} ASSIST`}
        badge={`PROGRESS: ${completedCount}/${currentLevel.signs.length}`}
        icon="📖"
      >
        {/* Main 3-Column Screen Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* LEFT COLUMN: Target Sign Reference with Visual Hand Blueprint */}
          <div className="lg:col-span-4">
            <TargetSignCard
              sign={targetSign}
              assistStage={assistStage}
              onSelectSign={(id) => setCurrentSignId(id)}
              availableSigns={levelSignDefinitions}
            />
          </div>

          {/* CENTER COLUMN: Real-Time Camera + Landmarks */}
          <div className="lg:col-span-5 flex flex-col">
            <WebcamHandTracker
              targetSignId={currentSignId}
              evaluation={evaluation}
              onLandmarks={handleLandmarks}
              demoMode={demoMode}
              onEnableDemoMode={onToggleDemoMode}
            />

            {/* In-View Next / Auto-Advancer Pill */}
            {evaluation?.isCorrect && (
              <div className="mt-3 p-3 bg-[#BBF7D0] border-2 sm:border-3 border-[#0F172A] rounded-2xl shadow-pixel flex items-center justify-between animate-bounce">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                  <div>
                    <span className="font-pixel text-[10px] sm:text-xs text-[#166534] font-bold block">
                      ✓ SIGN PERFECTED! (+{xpEarned} XP)
                    </span>
                    {autoAdvance && (
                      <span className="font-pixel text-[8px] text-[#15803D]">
                        ⚡ AUTO-ADVANCING TO NEXT SIGN...
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleNextSign}
                  className="game-btn px-3 py-1.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-pixel text-[9px] sm:text-[10px] font-bold border-2 border-[#0F172A] flex items-center space-x-1"
                >
                  <span>NEXT</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Biomechanical HUD & Coaching Feedback */}
          <div className="lg:col-span-3 flex flex-col">
            <LiveFeedbackPanel
              targetSign={targetSign}
              evaluation={evaluation}
              onRetry={() => {
                resetHoldBuffer();
                evaluatedRef.current = false;
                setXpEarned(0);
                startTimeRef.current = Date.now();
              }}
              onNext={handleNextSign}
              xpEarned={xpEarned}
              comboCount={comboCount}
            />
          </div>
        </div>
      </SpiralBinder>

      {/* ── LEVEL COMPLETE CELEBRATION MODAL ─────────────────────────────── */}
      {showLevelCompleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FEF08A] border-3 sm:border-4 border-[#0F172A] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-pixel-lg text-center animate-scaleUp">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white border-3 border-[#0F172A] rounded-2xl mx-auto flex items-center justify-center text-3xl sm:text-4xl shadow-pixel mb-4">
              🏆
            </div>
            
            <span className="font-pixel text-[10px] uppercase text-[#854D0E] font-bold block mb-1">
              LEVEL {currentLevelId} CONQUERED!
            </span>
            
            <h2 className="font-pixel text-xl sm:text-2xl font-black text-[#0F172A] mb-2">
              {currentLevel.title}
            </h2>
            
            <p className="font-chunky text-xs sm:text-sm text-[#475569] mb-4">
              You mastered all {currentLevel.signs.length} signs across all assist tiers!
            </p>

            {levelCountdown !== null && currentLevelId < GAME_LEVELS.length && (
              <div className="mb-5 p-2 bg-[#BBF7D0] border-2 border-[#0F172A] rounded-xl font-pixel text-[10px] text-[#166534] font-bold animate-pulse">
                ⚡ AUTO-ADVANCING TO NEXT LEVEL IN {levelCountdown}s...
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setLevelCountdown(null);
                  setShowLevelCompleteModal(false);
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border-2 border-[#0F172A] text-[#0F172A] font-pixel text-[10px] font-bold shadow-pixel-sm active:translate-y-0.5"
              >
                STAY ON THIS LEVEL
              </button>

              {currentLevelId < GAME_LEVELS.length && (
                <button
                  onClick={handleNextLevel}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white border-2 border-[#0F172A] font-pixel text-[10px] font-bold shadow-pixel active:translate-y-0.5 flex items-center justify-center space-x-1.5"
                >
                  <span>NEXT LEVEL NOW</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
