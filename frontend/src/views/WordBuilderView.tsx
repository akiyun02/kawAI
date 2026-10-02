import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SignDefinition, RecognitionEvaluation, Landmark3D, StudentProfile, FaceLandmarkData } from '../types';
import { GET_SIGN_BY_ID } from '../data/signs';
import { WebcamHandTracker } from '../components/WebcamHandTracker';
import { evaluateSign, resetHoldBuffer } from '../services/recognitionEngine';
import { soundFx } from '../services/soundFx';
import { recordAttemptApi } from '../services/api';
import confetti from 'canvas-confetti';
import { SpiralBinder } from '../components/SpiralBinder';
import { Puzzle, CheckCircle2, Sparkles, ArrowRight, RotateCcw } from 'lucide-react';

interface WordTarget {
  id: string;
  word: string;
  description: string;
  sequence: string[]; // e.g. ['C', 'A', 'T']
  difficulty: 'Novice' | 'Intermediate' | 'Master';
  rewardXp: number;
}

const WORDS_CATALOG: WordTarget[] = [
  {
    id: 'w-kawai',
    word: 'KAWAI',
    description: 'Spell out K - A - W - A - I in ASL fingerspelling for KawAI!',
    sequence: ['K', 'A', 'W', 'A', 'I'],
    difficulty: 'Intermediate',
    rewardXp: 550
  },
  {
    id: 'w-asl',
    word: 'ASL',
    description: 'Spell out A - S - L (American Sign Language).',
    sequence: ['A', 'S', 'L'],
    difficulty: 'Novice',
    rewardXp: 300
  },
  {
    id: 'w-cat',
    word: 'CAT',
    description: 'Spell out C - A - T in ASL fingerspelling.',
    sequence: ['C', 'A', 'T'],
    difficulty: 'Novice',
    rewardXp: 300
  },
  {
    id: 'w-sign',
    word: 'SIGN',
    description: 'Fingerspell S - I - G - N with crisp hand orientation.',
    sequence: ['S', 'I', 'G', 'N'],
    difficulty: 'Intermediate',
    rewardXp: 400
  },
  {
    id: 'w-robot',
    word: 'ROBOT',
    description: 'Spell out R - O - B - O - T letter by letter.',
    sequence: ['R', 'O', 'B', 'O', 'T'],
    difficulty: 'Intermediate',
    rewardXp: 500
  },
  {
    id: 'w-quest',
    word: 'QUEST',
    description: 'Master downward Q, pressed U, and compact T.',
    sequence: ['Q', 'U', 'E', 'S', 'T'],
    difficulty: 'Intermediate',
    rewardXp: 500
  },
  {
    id: 'w-joy',
    word: 'JOY',
    description: 'Features dynamic motion letter J followed by O and Y!',
    sequence: ['J', 'O', 'Y'],
    difficulty: 'Master',
    rewardXp: 450
  },
  {
    id: 'w-zebra',
    word: 'ZEBRA',
    description: 'Features dynamic 3-stroke Z followed by E - B - R - A!',
    sequence: ['Z', 'E', 'B', 'R', 'A'],
    difficulty: 'Master',
    rewardXp: 600
  }
];

interface WordBuilderViewProps {
  profile: StudentProfile | null;
  onRefreshProfile: () => void;
  demoMode: boolean;
  onToggleDemoMode: () => void;
}

export const WordBuilderView: React.FC<WordBuilderViewProps> = ({
  profile,
  onRefreshProfile,
  demoMode,
  onToggleDemoMode
}) => {
  const [selectedWordIndex, setSelectedWordIndex] = useState<number>(0);
  const activeWordTarget = WORDS_CATALOG[selectedWordIndex];

  const [stepIndex, setStepIndex] = useState<number>(0);
  const [evaluation, setEvaluation] = useState<RecognitionEvaluation | null>(null);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([]);
  const [wordCompleted, setWordCompleted] = useState<boolean>(false);
  const [wrongAttempt, setWrongAttempt] = useState<{ detected: string; target: string } | null>(null);

  const currentSignId = activeWordTarget.sequence[stepIndex] || activeWordTarget.sequence[0];
  const targetSign: SignDefinition = GET_SIGN_BY_ID(currentSignId);

  const evaluatedRef = useRef<boolean>(false);

  useEffect(() => {
    setStepIndex(0);
    setEvaluation(null);
    setWordCompleted(false);
    setWrongAttempt(null);
    setCompletedSteps(new Array(activeWordTarget.sequence.length).fill(false));
    evaluatedRef.current = false;
  }, [selectedWordIndex, activeWordTarget]);

  const wordCompletedRef = useRef(wordCompleted);
  wordCompletedRef.current = wordCompleted;
  const currentSignIdRef = useRef(currentSignId);
  currentSignIdRef.current = currentSignId;
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;
  const activeWordTargetRef = useRef(activeWordTarget);
  activeWordTargetRef.current = activeWordTarget;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const onRefreshProfileRef = useRef(onRefreshProfile);
  onRefreshProfileRef.current = onRefreshProfile;

  const handleLandmarks = useCallback((landmarks: Landmark3D[], faceData?: FaceLandmarkData | null, handedness?: 'Left' | 'Right') => {
    if (wordCompletedRef.current) return;

    const signId = currentSignIdRef.current;
    const result = evaluateSign(landmarks, signId, faceData, handedness);
    setEvaluation(result);

    // Track wrong letter attempt for immediate feedback and retry
    if (!result.isCorrect && result.mlPrediction && result.mlPrediction.confidence > 75 && result.mlPrediction.predictedSign !== signId) {
      setWrongAttempt({ detected: result.mlPrediction.predictedSign, target: signId });
    } else if (result.isCorrect) {
      setWrongAttempt(null);
    }

    if (result.isCorrect && !evaluatedRef.current) {
      evaluatedRef.current = true;
      setWrongAttempt(null);
      soundFx.playSuccess();

      const currentStep = stepIndexRef.current;
      const targetWord = activeWordTargetRef.current;

      setCompletedSteps(prev => {
        const next = [...prev];
        next[currentStep] = true;
        return next;
      });

      // Check if end of word sequence
      if (currentStep + 1 >= targetWord.sequence.length) {
        setWordCompleted(true);
        soundFx.playLevelUp();
        confetti({
          particleCount: 65,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10B981', '#6366F1', '#38BDF8', '#FBBF24']
        });

        recordAttemptApi({
          student_id: profileRef.current?.id || 'student-alex',
          sign_id: targetWord.word,
          mode: 'wordbuilder',
          is_correct: true,
          confidence: result.confidence / 100,
          shape_score: result.shapeScore / 100,
          orientation_score: result.orientationScore / 100,
          position_score: result.positionScore / 100,
          latency_ms: 1200,
          feedback: `Successfully fingerspelled "${targetWord.word}"!`
        }).then(() => onRefreshProfileRef.current());
      } else {
        // Move to next step in sequence after brief delay
        setTimeout(() => {
          resetHoldBuffer();
          evaluatedRef.current = false;
          setWrongAttempt(null);
          setStepIndex(prev => prev + 1);
        }, 700);
      }
    }
  }, []);

  const handleReset = () => {
    resetHoldBuffer();
    setStepIndex(0);
    setWordCompleted(false);
    setWrongAttempt(null);
    setEvaluation(null);
    setCompletedSteps(new Array(activeWordTarget.sequence.length).fill(false));
    evaluatedRef.current = false;
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3">
      <SpiralBinder
        title="FINGERSPELL: REAL-TIME ASL ALPHABET CHAINING"
        subtitle="Spell complete words letter-by-letter. Smooth kinematic transitions, immediate feedback, and combo multipliers!"
        badge="FINGERSPELL MODE"
        icon="✍️"
      >
        {/* Header & Word Selector Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-dashed border-[#94A3B8]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-[#4ADE80] text-[#0F172A] border-2 border-[#0F172A] font-bold shadow-pixel-sm">
                ALPHABET CHAIN
              </span>
              <span className="text-xs text-[#475569] font-game">Word: {activeWordTarget.word} ({activeWordTarget.sequence.length} letters)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-chunky text-[#0F172A] mt-1 tracking-wide">
              Spelling: {activeWordTarget.word}
            </h2>
          </div>

          {/* Word Selector Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {WORDS_CATALOG.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setSelectedWordIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-pixel border-2 border-[#0F172A] transition-all active:translate-y-0.5 ${
                  selectedWordIndex === idx
                    ? 'bg-[#FEF08A] text-[#0F172A] shadow-pixel font-bold'
                    : 'bg-white text-[#64748B] hover:text-[#0F172A] shadow-pixel-sm'
                }`}
              >
                {item.word}
              </button>
            ))}
          </div>
        </div>

        {/* Sequence Progress Tracker (Beveled Card) */}
        <div className="bg-[#BAE6FD] border-3 border-[#0F172A] rounded-2xl p-2.5 sm:p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-pixel">
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <span className="font-pixel text-[10px] sm:text-[11px] text-[#0F172A] uppercase font-bold shrink-0">
              SEQUENCE:
            </span>
            <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap gap-y-1.5">
              {activeWordTarget.sequence.map((sign, idx) => {
                const isDone = completedSteps[idx];
                const isCurrent = idx === stepIndex && !wordCompleted;

                return (
                  <div key={idx} className="flex items-center space-x-1 sm:space-x-1.5">
                    <div
                      className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-pixel border-2 border-[#0F172A] flex items-center space-x-1.5 transition-all ${
                        isDone
                          ? 'bg-[#4ADE80] text-[#0F172A] shadow-pixel-sm font-bold'
                          : isCurrent
                          ? 'bg-[#FEF08A] text-[#0F172A] shadow-pixel scale-105 font-bold animate-pulse'
                          : 'bg-white text-[#94A3B8]'
                      }`}
                    >
                      <span>{sign}</span>
                      {isDone && <CheckCircle2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-[#16A34A]" />}
                    </div>
                    {idx < activeWordTarget.sequence.length - 1 && (
                      <ArrowRight className="w-2.5 sm:w-3 h-2.5 sm:h-3 text-[#0F172A]" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Wrong Letter Attempt Notification with Retry */}
            {wrongAttempt && !wordCompleted && (
              <div className="ml-0 sm:ml-2 px-3 py-1 rounded-xl bg-[#FEE2E2] border-2 border-[#EF4444] text-[#991B1B] font-pixel text-[9px] sm:text-[10px] flex items-center space-x-1.5 shadow-pixel-sm animate-pulse">
                <span className="font-bold">{wrongAttempt.detected} ✕</span>
                <span>Target: {wrongAttempt.target} — Keep trying!</span>
              </div>
            )}
          </div>

          {wordCompleted && (
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
              <span className="font-pixel text-[9px] sm:text-[10px] text-[#0F172A] bg-[#4ADE80] border-2 border-[#0F172A] px-2.5 sm:px-3 py-1 rounded-xl shadow-pixel-sm font-bold flex items-center space-x-1.5 animate-bounce">
                <span>🎉 {activeWordTarget.word} COMPLETE!</span>
                <span>(+{activeWordTarget.rewardXp} XP 🔥 ×{activeWordTarget.sequence.length})</span>
              </span>
              <button
                onClick={handleReset}
                className="p-1.5 rounded-xl bg-white hover:bg-slate-100 border-2 border-[#0F172A] text-[#0F172A] shadow-pixel-sm active:translate-y-0.5"
                title="Repeat Sequence"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 3 Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          {/* Step Guide (Yellow Card, 4 cols) */}
          <div className="lg:col-span-4 bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b-2 border-[#0F172A] pb-2 mb-3">
                <span className="font-pixel text-[9px] sm:text-[10px] uppercase text-[#0F172A]">
                  STEP {stepIndex + 1} OF {activeWordTarget.sequence.length}
                </span>
                <span className="font-pixel text-[9px] sm:text-[10px] bg-white border border-[#0F172A] px-2 py-0.5 rounded text-[#0F172A] font-bold">
                  {targetSign.name}
                </span>
              </div>

              <div className="p-3 sm:p-4 bg-white rounded-xl border-2 border-[#0F172A] shadow-inner text-center my-2">
                <span className="text-4xl sm:text-6xl font-black font-chunky text-[#0F172A]">
                  {targetSign.id}
                </span>
                <p className="text-xs text-[#475569] mt-1 font-game">{targetSign.description}</p>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-[#FEF9C3] border-2 border-[#0F172A] text-xs mt-2">
                <span className="font-pixel text-[9px] text-[#B45309] block mb-1 font-bold">TARGET PALM ANGLE:</span>
                <span className="font-pixel text-[9px] sm:text-[10px] text-[#0F172A] bg-white px-2 py-0.5 rounded border border-[#0F172A] inline-block uppercase font-bold">
                  {targetSign.orientationTarget}
                </span>
                <p className="text-[#0F172A] font-game text-[11px] sm:text-[12px] mt-1 leading-tight">{targetSign.hints[0]}</p>
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t-2 border-[#0F172A] flex items-center justify-between text-xs">
              <span className="font-pixel text-[9px] text-[#64748B]">Fluidity Bonus Active</span>
              <button 
                onClick={handleReset} 
                className="px-2.5 py-1 rounded-lg bg-white border border-[#0F172A] text-[#0F172A] font-pixel text-[9px] shadow-pixel-sm hover:bg-slate-100 flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Webcam (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <WebcamHandTracker
              targetSignId={currentSignId}
              evaluation={evaluation}
              onLandmarks={handleLandmarks}
              demoMode={demoMode}
              onEnableDemoMode={onToggleDemoMode}
            />
          </div>

          {/* AI Sequence Analysis (Yellow Card, 3 cols) */}
          <div className="lg:col-span-3 bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel flex flex-col justify-between">
            <div>
              <span className="font-pixel text-[10px] sm:text-[11px] text-[#0F172A] uppercase font-bold block mb-2 pb-2 border-b-2 border-[#0F172A]">
                KINEMATICS AI
              </span>
              
              <div className="p-2.5 sm:p-3 bg-white rounded-xl border-2 border-[#0F172A] shadow-inner text-center mb-3">
                <span className="font-pixel text-[9px] text-[#64748B] block mb-1">SIGN PRECISION</span>
                <span className="text-2xl sm:text-3xl font-pixel text-[#16A34A]">
                  {evaluation?.confidence || 0}%
                </span>
              </div>

              <div className="space-y-2 text-xs font-game">
                <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-[#0F172A]">
                  <span className="font-pixel text-[9px] text-[#64748B] block uppercase font-bold">COACH NOTE:</span>
                  <p className="text-[#0F172A] text-[11px] sm:text-[12px] mt-0.5 leading-snug">
                    {evaluation?.feedbackMessage || "Hold current sign steady to register transition."}
                  </p>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl bg-[#BAE6FD] border border-[#0F172A] text-[#0F172A] text-[10px] sm:text-[11px]">
                  <Sparkles className="w-3 h-3 inline mr-1 text-[#0284C7]" />
                  Keep posture upright while transitioning fingers.
                </div>
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t-2 border-[#0F172A] text-center bg-white rounded-xl p-2 border border-[#0F172A]">
              <span className="font-pixel text-[9px] sm:text-[10px] text-[#0F172A]">
                WORDS FORGED: <strong className="text-[#16A34A]">3 / 8</strong>
              </span>
            </div>
          </div>
        </div>
      </SpiralBinder>
    </div>
  );
};
