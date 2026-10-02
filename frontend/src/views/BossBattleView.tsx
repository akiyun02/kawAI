import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SignDefinition, RecognitionEvaluation, Landmark3D, StudentProfile, FaceLandmarkData } from '../types';
import { GET_SIGN_BY_ID } from '../data/signs';
import { WebcamHandTracker } from '../components/WebcamHandTracker';
import { evaluateSign, resetHoldBuffer } from '../services/recognitionEngine';
import { soundFx } from '../services/soundFx';
import { recordAttemptApi } from '../services/api';
import confetti from 'canvas-confetti';
import { SpiralBinder } from '../components/SpiralBinder';
import { Skull, Shield, Sword, Heart, Sparkles, Award, RotateCcw } from 'lucide-react';

interface BossBattleViewProps {
  profile: StudentProfile | null;
  onRefreshProfile: () => void;
  demoMode: boolean;
  onToggleDemoMode: () => void;
}

export const BossBattleView: React.FC<BossBattleViewProps> = ({
  profile,
  onRefreshProfile,
  demoMode,
  onToggleDemoMode
}) => {
  const BOSS_MAX_HP = 400;
  // Adaptive boss phases targeting orientation and shape biomechanics
  const BOSS_PHASES = [
    { sign: 'B', title: 'Phase 1: The Mirror Ward', requirement: 'Overcome palm inversion! Sign B facing camera with thumb across.' },
    { sign: 'A', title: 'Phase 2: The Iron Fist', requirement: 'Solidify your defense! Form the classic A fist with thumb erect along the index.' },
    { sign: 'C', title: 'Phase 3: The Crescent Moon', requirement: 'Bend the void! Form the open C curve with thumb and fingers arched.' },
    { sign: 'L', title: 'Phase 4: The Ray of Radiance', requirement: 'Unleash the decisive strike! Extend index and thumb in a sharp 90-degree L.' }
  ];

  const [phaseIndex, setPhaseIndex] = useState<number>(0);
  const [bossHp, setBossHp] = useState<number>(BOSS_MAX_HP);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<RecognitionEvaluation | null>(null);
  const [attackAnimation, setAttackAnimation] = useState<boolean>(false);

  const currentPhase = BOSS_PHASES[phaseIndex % BOSS_PHASES.length];
  const targetSign: SignDefinition = GET_SIGN_BY_ID(currentPhase.sign);

  const evaluatedRef = useRef<boolean>(false);

  const isVictoryRef = useRef(isVictory);
  isVictoryRef.current = isVictory;
  const currentPhaseRef = useRef(currentPhase);
  currentPhaseRef.current = currentPhase;
  const bossHpRef = useRef(bossHp);
  bossHpRef.current = bossHp;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const onRefreshProfileRef = useRef(onRefreshProfile);
  onRefreshProfileRef.current = onRefreshProfile;

  const handleLandmarks = useCallback((landmarks: Landmark3D[], faceData?: FaceLandmarkData | null, handedness?: 'Left' | 'Right') => {
    if (isVictoryRef.current) return;

    const phase = currentPhaseRef.current;
    const result = evaluateSign(landmarks, phase.sign, faceData, handedness);
    setEvaluation(result);

    if (result.isCorrect && !evaluatedRef.current) {
      evaluatedRef.current = true;
      soundFx.playBossHit();

      // Trigger player strike animation
      setAttackAnimation(true);
      setTimeout(() => setAttackAnimation(false), 500);

      const nextHp = Math.max(0, bossHpRef.current - 100);
      setBossHp(nextHp);

      if (nextHp <= 0) {
        setIsVictory(true);
        soundFx.playLevelUp();
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#F43F5E', '#F59E0B', '#10B981']
        });

        recordAttemptApi({
          student_id: profileRef.current?.id || 'student-alex',
          sign_id: 'BOSS_GUARDIAN',
          mode: 'boss',
          is_correct: true,
          confidence: result.confidence / 100,
          shape_score: result.shapeScore / 100,
          orientation_score: result.orientationScore / 100,
          position_score: result.positionScore / 100,
          latency_ms: 1200,
          feedback: "Defeated The Silent Guardian!"
        }).then(() => onRefreshProfileRef.current());
      } else {
        setTimeout(() => {
          resetHoldBuffer();
          evaluatedRef.current = false;
          setPhaseIndex(prev => prev + 1);
        }, 800);
      }
    }
  }, []);

  const handleRestartBoss = () => {
    resetHoldBuffer();
    setBossHp(BOSS_MAX_HP);
    setPlayerHp(100);
    setPhaseIndex(0);
    setIsVictory(false);
    setEvaluation(null);
    evaluatedRef.current = false;
  };

  const hpPercent = Math.round((bossHp / BOSS_MAX_HP) * 100);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3">
      <SpiralBinder
        title="BOSS RAID: THE SILENT GUARDIAN"
        subtitle="Final unit boss encounter! Precision palm orientation breaks the Guardian's shields."
        badge={`HP ${bossHp}/${BOSS_MAX_HP}`}
        icon="👹"
      >
        {/* Boss Encounter Banner & HP Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-dashed border-[#94A3B8]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-[#F87171] text-[#0F172A] border-2 border-[#0F172A] font-bold shadow-pixel-sm">
                FINAL CLIMAX
              </span>
              <span className="text-xs text-[#475569] font-game">Biomechanical orientation trial</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-chunky text-[#0F172A] mt-1 tracking-wide">
              The Silent Guardian
            </h2>
          </div>

          {/* Boss HP Bar (Retro Game Gauge) */}
          <div className="w-full sm:w-80 bg-[#FEF08A] border-2 border-[#0F172A] p-2.5 rounded-2xl shadow-pixel-sm">
            <div className="flex justify-between font-pixel text-[10px] mb-1 text-[#0F172A]">
              <span className="font-bold flex items-center space-x-1">
                <Skull className="w-3 h-3 text-[#DC2626]" />
                <span>GUARDIAN HP</span>
              </span>
              <span className="font-bold">{bossHp}/{BOSS_MAX_HP}</span>
            </div>
            <div className="w-full bg-white h-3.5 rounded-lg overflow-hidden border-2 border-[#0F172A]">
              <div
                className="bg-gradient-to-r from-[#DC2626] to-[#F59E0B] h-full rounded-md transition-all duration-500"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>
        </div>

        {isVictory ? (
          <div className="max-w-xl mx-auto my-8 bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-6 sm:p-8 text-center shadow-pixel">
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#0F172A] flex items-center justify-center mx-auto mb-3 text-[#D97706] shadow-pixel-sm">
              <Award className="w-9 h-9 animate-bounce text-[#D97706]" />
            </div>
            <span className="font-pixel text-[10px] uppercase text-[#16A34A] font-bold block mb-1">
              ★ TRIUMPHANT VICTORY ★
            </span>
            <h3 className="text-2xl font-chunky text-[#0F172A] mb-2">BOSS DEFEATED!</h3>
            <p className="text-xs text-[#475569] font-game max-w-md mx-auto mb-5 leading-relaxed">
              You conquered the Silent Guardian by maintaining precise palm orientation 
              under high-pressure combat!
            </p>

            <div className="p-4 bg-white rounded-xl border-2 border-[#0F172A] mb-5 text-center shadow-inner">
              <span className="font-pixel text-[9px] text-[#64748B] block mb-1">REWARD UNLOCKED:</span>
              <div className="text-2xl font-pixel text-[#D97706]">+1000 XP</div>
              <div className="font-pixel text-[10px] text-[#0284C7] mt-1">NEW REALM: Advanced Conversational Arena</div>
            </div>

            <button
              onClick={handleRestartBoss}
              className="px-6 py-3 rounded-xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#0F172A] font-pixel text-xs border-3 border-[#0F172A] shadow-pixel active:translate-y-1 transition-all"
            >
              CHALLENGE AGAIN
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
            {/* Left: Boss Spell & Combat Target (Yellow Card, 4 cols) */}
            <div className={`lg:col-span-4 bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel flex flex-col justify-between transition-all ${
              attackAnimation ? 'scale-95 bg-[#FCA5A5]' : ''
            }`}>
              <div>
                <div className="flex items-center justify-between pb-2 border-b-2 border-[#0F172A] mb-2.5 sm:mb-3">
                  <span className="font-pixel text-[9px] sm:text-[10px] text-[#DC2626] font-bold uppercase flex items-center space-x-1.5">
                    <Sword className="w-3.5 h-3.5" />
                    <span>SPELL #{phaseIndex + 1}</span>
                  </span>
                  <span className="font-pixel text-[9px] sm:text-[10px] bg-white border border-[#0F172A] px-2 py-0.5 rounded text-[#0F172A] font-bold">
                    Target: {currentPhase.sign}
                  </span>
                </div>

                <div className="p-3 sm:p-4 bg-white rounded-xl border-2 border-[#0F172A] shadow-inner text-center my-2">
                  <span className="font-pixel text-[9px] text-[#DC2626] uppercase font-bold block mb-1">
                    COUNTER-SIGN SPELL
                  </span>
                  <span className="text-4xl sm:text-6xl font-black font-chunky text-[#0F172A]">
                    {targetSign.id}
                  </span>
                  <span className="text-xs font-bold text-[#475569] block mt-1 font-game">{targetSign.name}</span>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-[#FEF9C3] border-2 border-[#0F172A] text-xs">
                  <span className="font-pixel text-[9px] text-[#B45309] block mb-0.5 font-bold">{currentPhase.title}</span>
                  <p className="text-[#0F172A] font-game text-[11px] sm:text-[12px] leading-tight">{currentPhase.requirement}</p>
                </div>
              </div>

              <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t-2 border-[#0F172A] flex justify-between font-pixel text-[9px] text-[#0F172A]">
                <span>HP: 100%</span>
                <span className="text-[#DC2626] font-bold">Damage: 100 HP / sign</span>
              </div>
            </div>

            {/* Center: Live Camera (5 cols) */}
            <div className="lg:col-span-5 flex flex-col">
              <WebcamHandTracker
                targetSignId={currentPhase.sign}
                evaluation={evaluation}
                onLandmarks={handleLandmarks}
                demoMode={demoMode}
                onEnableDemoMode={onToggleDemoMode}
              />
            </div>

            {/* Right: Boss Combat HUD (Yellow Card, 3 cols) */}
            <div className="lg:col-span-3 bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel flex flex-col justify-between">
              <div>
                <span className="font-pixel text-[10px] sm:text-[11px] text-[#0F172A] uppercase font-bold block mb-2 pb-2 border-b-2 border-[#0F172A]">
                  COMBAT FEEDBACK
                </span>

                <div className="p-2.5 sm:p-3 bg-white rounded-xl border-2 border-[#0F172A] shadow-inner text-center mb-3">
                  <span className="font-pixel text-[9px] text-[#64748B] block mb-1">PIERCING FORCE</span>
                  <span className="text-2xl sm:text-3xl font-pixel text-[#DC2626]">
                    {evaluation?.confidence || 0}%
                  </span>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-white border-2 border-[#0F172A] text-xs font-game">
                  <span className="font-pixel text-[9px] text-[#64748B] block mb-1 font-bold">TACTICAL READ:</span>
                  <p className="text-[#0F172A] text-[11px] sm:text-[12px] leading-snug">
                    {evaluation?.feedbackMessage || "Channel counter-sign to pierce defense!"}
                  </p>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white border-2 border-[#0F172A] text-center mt-3 font-pixel text-[9px] sm:text-[10px] text-[#0F172A]">
                PHASES LEFT: <strong className="text-[#DC2626]">{BOSS_PHASES.length - phaseIndex}</strong>
              </div>
            </div>
          </div>
        )}
      </SpiralBinder>
    </div>
  );
};
