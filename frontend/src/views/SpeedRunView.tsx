import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SignDefinition, RecognitionEvaluation, Landmark3D, StudentProfile, FaceLandmarkData } from '../types';
import { SIGN_DATABASE, GET_SIGN_BY_ID } from '../data/signs';
import { WebcamHandTracker } from '../components/WebcamHandTracker';
import { evaluateSign, resetHoldBuffer } from '../services/recognitionEngine';
import { soundFx } from '../services/soundFx';
import { recordAttemptApi } from '../services/api';
import confetti from 'canvas-confetti';
import { SpiralBinder } from '../components/SpiralBinder';
import { Zap, Timer, Flame, Trophy, RotateCcw, ArrowRight, Sparkles } from 'lucide-react';

interface SpeedRunViewProps {
  profile: StudentProfile | null;
  onRefreshProfile: () => void;
  demoMode: boolean;
  onToggleDemoMode: () => void;
}

export const SpeedRunView: React.FC<SpeedRunViewProps> = ({
  profile,
  onRefreshProfile,
  demoMode,
  onToggleDemoMode
}) => {
  const SPEED_SIGNS = ['A', 'B', 'C', 'D', 'E', 'L', 'V', '1', '2', '3', 'O', 'F'];

  const [gameState, setGameState] = useState<'ready' | 'running' | 'gameover'>('ready');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [currentSignIndex, setCurrentSignIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('kawai_speedrun_highscore') || '0', 10);
  });
  const [combo, setCombo] = useState<number>(1);
  const [maxCombo, setMaxCombo] = useState<number>(1);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [evaluation, setEvaluation] = useState<RecognitionEvaluation | null>(null);

  const currentSignId = SPEED_SIGNS[currentSignIndex % SPEED_SIGNS.length];
  const targetSign: SignDefinition = GET_SIGN_BY_ID(currentSignId);

  const startTimeRef = useRef<number>(Date.now());
  const evaluatedRef = useRef<boolean>(false);
  const timerIntervalRef = useRef<any>(null);

  // Timer countdown
  useEffect(() => {
    if (gameState === 'running') {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setGameState('gameover');
            soundFx.playLevelUp();
            confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
            
            // Update High Score
            setScore(currentScore => {
              const currentBest = parseInt(localStorage.getItem('kawai_speedrun_highscore') || '0', 10);
              if (currentScore > currentBest) {
                localStorage.setItem('kawai_speedrun_highscore', currentScore.toString());
                setHighScore(currentScore);
              }
              return currentScore;
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameState]);

  const handleStartGame = () => {
    resetHoldBuffer();
    setTimeLeft(30);
    setScore(0);
    setCombo(1);
    setMaxCombo(1);
    setCorrectCount(0);
    setCurrentSignIndex(0);
    evaluatedRef.current = false;
    startTimeRef.current = Date.now();
    setGameState('running');
    soundFx.playSuccess();
  };

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const currentSignIdRef = useRef(currentSignId);
  currentSignIdRef.current = currentSignId;
  const comboRef = useRef(combo);
  comboRef.current = combo;
  const maxComboRef = useRef(maxCombo);
  maxComboRef.current = maxCombo;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const onRefreshProfileRef = useRef(onRefreshProfile);
  onRefreshProfileRef.current = onRefreshProfile;

  const handleLandmarks = useCallback((landmarks: Landmark3D[], faceData?: FaceLandmarkData | null, handedness?: 'Left' | 'Right') => {
    if (gameStateRef.current !== 'running') return;

    const signId = currentSignIdRef.current;
    const result = evaluateSign(landmarks, signId, faceData, handedness);
    setEvaluation(result);

    if (result.isCorrect && !evaluatedRef.current) {
      evaluatedRef.current = true;

      const latency = Date.now() - startTimeRef.current;
      const speedBonus = latency < 1400 ? 50 : 0;
      const points = (100 + speedBonus) * comboRef.current;

      setScore(prev => prev + points);
      setCorrectCount(prev => prev + 1);
      const nextCombo = comboRef.current + 1;
      setCombo(nextCombo);
      if (nextCombo > maxComboRef.current) setMaxCombo(nextCombo);

      soundFx.playSuccess();
      soundFx.playCombo(nextCombo);

      // Advance immediately to next sign!
      setTimeout(() => {
        resetHoldBuffer();
        evaluatedRef.current = false;
        startTimeRef.current = Date.now();
        setCurrentSignIndex(prev => prev + 1);
      }, 400);

      recordAttemptApi({
        student_id: profileRef.current?.id || 'student-alex',
        sign_id: signId,
        mode: 'speedrun',
        is_correct: true,
        confidence: result.confidence / 100,
        shape_score: result.shapeScore / 100,
        orientation_score: result.orientationScore / 100,
        position_score: result.positionScore / 100,
        latency_ms: latency,
        feedback: "Fast speed-run hit!"
      }).then(() => onRefreshProfileRef.current());
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3">
      <SpiralBinder
        title="SPEED SPRINT: 30s TIME ATTACK"
        subtitle="Chain signs in rapid succession! Higher combos unlock massive XP multipliers."
        badge={gameState === 'running' ? `00:${timeLeft < 10 ? '0' + timeLeft : timeLeft}` : 'ARCADE'}
        icon="⚡"
      >
        {/* Header with Countdown & Combo HUD */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b-2 border-dashed border-[#94A3B8]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-[#FEF08A] text-[#0F172A] border-2 border-[#0F172A] font-bold shadow-pixel-sm">
                30 SECONDS
              </span>
              <span className="text-xs text-[#475569] font-game">Rapid recognition & combo burst</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-chunky text-[#0F172A] mt-1 tracking-wide">
              {gameState === 'running' ? 'Chain Signs Fast!' : 'Ready for the Sprint?'}
            </h2>
          </div>

          {/* Retro Arcade HUD Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border-2 border-[#0F172A] shadow-pixel-sm font-pixel text-xs ${
              timeLeft <= 5 ? 'bg-[#F87171] text-[#0F172A] animate-ping' : 'bg-[#BAE6FD] text-[#0F172A]'
            }`}>
              <Timer className="w-3.5 h-3.5" />
              <span>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
            </div>

            <div className="flex items-center space-x-1.5 bg-[#FEF08A] border-2 border-[#0F172A] px-3 py-1.5 rounded-xl shadow-pixel-sm font-pixel text-xs text-[#0F172A]">
              <Flame className={`w-3.5 h-3.5 text-[#DC2626] fill-red-400 ${combo > 1 ? 'animate-bounce' : ''}`} />
              <span>×{combo} COMBO</span>
            </div>

            <div className="flex items-center space-x-1.5 bg-[#BBF7D0] border-2 border-[#0F172A] px-3 py-1.5 rounded-xl shadow-pixel-sm font-pixel text-xs text-[#0F172A]">
              <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>{score} PTS</span>
            </div>
          </div>
        </div>

        {/* READY STATE */}
        {gameState === 'ready' && (
          <div className="max-w-xl mx-auto my-8 bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-6 sm:p-8 text-center shadow-pixel">
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#0F172A] flex items-center justify-center mx-auto mb-4 text-[#D97706] shadow-pixel-sm">
              <Zap className="w-8 h-8 fill-amber-300" />
            </div>
            <h3 className="text-2xl font-chunky text-[#0F172A] mb-2">30-Second Sign Sprint</h3>
            <p className="text-xs sm:text-sm text-[#475569] font-game max-w-md mx-auto mb-6 leading-relaxed">
              Signs will appear in rapid sequence. Form each sign as quickly as possible.
              Each correct sign gives +100 XP and increments your combo multiplier!
            </p>
            <button
              onClick={handleStartGame}
              className="px-8 py-3.5 rounded-2xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#0F172A] font-pixel text-xs uppercase tracking-wider border-3 border-[#0F172A] shadow-pixel active:translate-y-1 transition-all"
            >
              START SPEED RUN ⚡
            </button>
          </div>
        )}

        {/* GAME OVER STATE */}
        {gameState === 'gameover' && (
          <div className="max-w-xl mx-auto my-8 bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-6 sm:p-8 text-center shadow-pixel">
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#0F172A] flex items-center justify-center mx-auto mb-3 text-[#16A34A] shadow-pixel-sm">
              <Trophy className="w-8 h-8 fill-emerald-200" />
            </div>

            {/* Rank Badge */}
            <div className="inline-block mb-3">
              <div className={`px-4 py-1.5 rounded-xl border-3 border-[#0F172A] font-pixel text-base font-black shadow-pixel-sm ${
                score >= 1200 
                  ? 'bg-[#FDE047] text-[#854D0E]' 
                  : score >= 800 
                  ? 'bg-[#86EFAC] text-[#166534]' 
                  : score >= 400 
                  ? 'bg-[#7DD3FC] text-[#075985]' 
                  : 'bg-[#CBD5E1] text-[#334155]'
              }`}>
                RANK: {score >= 1200 ? 'S (MASTER)' : score >= 800 ? 'A (EXPERT)' : score >= 400 ? 'B (SKILLED)' : 'C (NOVICE)'}
              </div>
            </div>

            <h3 className="text-2xl font-chunky text-[#0F172A] mb-1">Time's Up!</h3>
            <p className="text-xs text-[#475569] font-game mb-4">Fantastic speed and reaction accuracy.</p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-white border-2 border-[#0F172A] shadow-pixel-sm">
                <span className="font-pixel text-[9px] text-[#64748B] block mb-1">TOTAL SCORE</span>
                <span className="text-2xl font-pixel text-[#D97706]">{score}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border-2 border-[#0F172A] shadow-pixel-sm">
                <span className="font-pixel text-[9px] text-[#64748B] block mb-1">SIGNS HIT</span>
                <span className="text-2xl font-pixel text-[#16A34A]">{correctCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border-2 border-[#0F172A] shadow-pixel-sm">
                <span className="font-pixel text-[9px] text-[#64748B] block mb-1">MAX COMBO</span>
                <span className="text-2xl font-pixel text-[#0284C7]">×{maxCombo}</span>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-xl border-2 border-[#0F172A] mb-5 font-pixel text-[10px] text-[#0F172A] flex items-center justify-center space-x-2">
              <span>🏆 PERSONAL BEST:</span>
              <strong className="text-[#D97706]">{Math.max(score, highScore)} PTS</strong>
              {score >= highScore && score > 0 && (
                <span className="text-[#16A34A] font-bold">★ NEW RECORD! ★</span>
              )}
            </div>

            <div className="flex justify-center space-x-3">
              <button
                onClick={handleStartGame}
                className="px-6 py-3 rounded-xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#0F172A] font-pixel text-xs border-3 border-[#0F172A] shadow-pixel flex items-center space-x-2 active:translate-y-1 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>PLAY AGAIN</span>
              </button>
            </div>
          </div>
        )}

        {/* RUNNING STATE */}
        {gameState === 'running' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
            {/* Target Box (Yellow Card, 4 cols) */}
            <div className="lg:col-span-4 bg-[#FEF08A] border-2 sm:border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b-2 border-[#0F172A] pb-2 mb-2 sm:mb-3">
                  <span className="font-pixel text-[10px] sm:text-[11px] text-[#0F172A] uppercase font-bold">
                    ACTIVE TARGET
                  </span>
                  <span className="font-pixel text-[9px] sm:text-[10px] bg-white border border-[#0F172A] px-2 py-0.5 rounded text-[#0F172A]">
                    RAPID CUE
                  </span>
                </div>

                <div className="my-1.5 sm:my-2 p-3 sm:p-5 bg-white rounded-xl border-2 border-[#0F172A] shadow-inner flex flex-col items-center justify-center">
                  <span className="text-5xl sm:text-7xl font-black font-chunky text-[#0F172A]">
                    {targetSign.id}
                  </span>
                  <span className="text-xs font-bold text-[#D97706] font-game mt-1">
                    "{targetSign.name}"
                  </span>
                </div>

                <p className="text-xs text-[#0F172A] text-center font-game bg-[#FEF9C3] p-2 rounded-lg border border-[#0F172A] mt-2">
                  {targetSign.hints[0]}
                </p>
              </div>

              <div className="mt-2.5 sm:mt-3 p-2 sm:p-2.5 rounded-xl bg-white border-2 border-[#0F172A] font-pixel text-[9px] sm:text-[10px] text-[#0F172A] text-center">
                ORIENTATION: <strong className="text-[#0284C7]">{targetSign.orientationTarget}</strong>
              </div>
            </div>

            {/* Webcam Center (5 cols) */}
            <div className="lg:col-span-5 flex flex-col">
              <WebcamHandTracker
                targetSignId={currentSignId}
                evaluation={evaluation}
                onLandmarks={handleLandmarks}
                demoMode={demoMode}
                onEnableDemoMode={onToggleDemoMode}
              />
            </div>

            {/* Fast HUD Status (Yellow Card, 3 cols) */}
            <div className="lg:col-span-3 bg-[#FEF08A] border-2 sm:border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel flex flex-col justify-between">
              <div>
                <span className="font-pixel text-[10px] sm:text-[11px] text-[#0F172A] uppercase font-bold block mb-2 sm:mb-3 pb-1.5 sm:pb-2 border-b-2 border-[#0F172A]">
                  SCANNER PULSE
                </span>

                <div className="p-3 bg-white rounded-xl border-2 border-[#0F172A] shadow-inner text-center mb-3">
                  <span className="font-pixel text-[9px] text-[#64748B] block mb-1">CONFIDENCE</span>
                  <span className="text-3xl font-pixel text-[#0284C7]">
                    {evaluation?.confidence || 0}%
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-game">
                  <div className="flex justify-between items-center p-2 rounded-xl bg-white border border-[#0F172A]">
                    <span className="text-[#475569] font-bold text-[11px]">Shape:</span>
                    <span className={`font-pixel text-[10px] ${evaluation?.shapeStatus === 'correct' ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                      {evaluation?.shapeStatus === 'correct' ? '✓ HIT' : '...'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-xl bg-white border border-[#0F172A]">
                    <span className="text-[#475569] font-bold text-[11px]">Angle:</span>
                    <span className={`font-pixel text-[10px] ${evaluation?.orientationStatus === 'correct' ? 'text-[#16A34A]' : 'text-[#64748B]'}`}>
                      {evaluation?.orientationStatus === 'correct' ? '✓ HIT' : '...'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white border-2 border-[#0F172A] text-center mt-3">
                <span className="font-pixel text-[10px] text-[#0F172A]">
                  MAX COMBO: <strong className="text-[#DC2626]">×{maxCombo}</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </SpiralBinder>
    </div>
  );
};
