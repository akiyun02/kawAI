import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SignDefinition, RecognitionEvaluation, Landmark3D, StudentProfile, CaseFile, FaceLandmarkData } from '../types';
import { GET_SIGN_BY_ID } from '../data/signs';
import { WebcamHandTracker } from '../components/WebcamHandTracker';
import { evaluateSign, resetHoldBuffer } from '../services/recognitionEngine';
import { soundFx } from '../services/soundFx';
import { recordAttemptApi } from '../services/api';
import confetti from 'canvas-confetti';
import { SpiralBinder } from '../components/SpiralBinder';
import { Search, FolderOpen, Key, CheckCircle, ShieldAlert, Sparkles, ArrowRight, Award } from 'lucide-react';

const CASES_DATA: CaseFile[] = [
  {
    id: 'case-033',
    title: 'Case #033: The KawAI Cipher',
    synopsis: 'An AI researcher left an encrypted finger code on a terminal. Decode the three cipher runes: K - A - W to unlock the KawAI system core!',
    difficulty: 'Master',
    xpReward: 500,
    stages: [
      {
        clue: 'Rune 1: The terminal screen flashes a peace sign with thumb resting between the base of index and middle.',
        prompt: 'Form letter K to decrypt the first rune.',
        targetSign: 'K',
        decodedPart: 'Rune [K] Authenticated'
      },
      {
        clue: 'Rune 2: The second glyph shows a solid fist with thumb held straight against the index edge.',
        prompt: 'Form letter A to unlock the secondary cipher.',
        targetSign: 'A',
        decodedPart: 'Rune [A] Authenticated'
      },
      {
        clue: 'Rune 3: The final key displays three upright fingers spread like a W.',
        prompt: 'Form letter W to finalize the cipher sequence.',
        targetSign: 'W',
        decodedPart: 'Rune [W] Authenticated'
      }
    ],
    finalMessage: 'CASE SOLVED! KawAI AI Core Unlocked: Welcome to the future of inclusive sign intelligence!'
  },
  {
    id: 'case-014',
    title: 'Case #014: The Library Secret',
    synopsis: 'Your friend Maya is across the quiet university reading room. Talking is forbidden. She gives you 3 subtle hand signals to reveal where the hidden blueprint is stored.',
    difficulty: 'Novice',
    xpReward: 350,
    stages: [
      {
        clue: 'Clue 1: Maya holds up a tall single finger pointing directly up at the ceiling.',
        prompt: 'Replicate Maya’s first signal to unlock the aisle number.',
        targetSign: '1',
        decodedPart: 'Aisle #1'
      },
      {
        clue: 'Clue 2: Maya curves her hand smoothly into an open rounded arc.',
        prompt: 'Form the cabinet letter to identify the locker row.',
        targetSign: 'C',
        decodedPart: 'Cabinet C'
      },
      {
        clue: 'Clue 3: Finally, she holds up a flat vertical hand with 4 fingers together and thumb across.',
        prompt: 'Form the shelf tier letter to locate the blueprint box.',
        targetSign: 'B',
        decodedPart: 'Shelf Box B'
      }
    ],
    finalMessage: 'CASE SOLVED! The blueprint is in Aisle 1, Cabinet C, Shelf Box B. Excellent deduction, Detective!'
  },
  {
    id: 'case-021',
    title: 'Case #021: The Encrypted Handshake',
    synopsis: 'An undercover diplomatic envoy needs to authenticate your presence without drawing attention in a crowded lobby.',
    difficulty: 'Detective',
    xpReward: 450,
    stages: [
      {
        clue: 'Signal 1: The envoy flashes a classic peace sign with index and middle fingers spread.',
        prompt: 'Perform the peace sign to initiate the handshake.',
        targetSign: 'PEACE',
        decodedPart: 'Cipher Key Alpha'
      },
      {
        clue: 'Signal 2: The envoy touches chin with flat fingers and moves gracefully forward.',
        prompt: 'Acknowledge with the sign of gratitude.',
        targetSign: 'THANK YOU',
        decodedPart: 'Passcode Verified'
      }
    ],
    finalMessage: 'CASE SOLVED! Authentication successful. The diplomatic dispatch is securely delivered.'
  }
];

interface SignDetectiveViewProps {
  profile: StudentProfile | null;
  onRefreshProfile: () => void;
  demoMode: boolean;
  onToggleDemoMode: () => void;
}

export const SignDetectiveView: React.FC<SignDetectiveViewProps> = ({
  profile,
  onRefreshProfile,
  demoMode,
  onToggleDemoMode
}) => {
  const [selectedCaseIndex, setSelectedCaseIndex] = useState<number>(0);
  const activeCase = CASES_DATA[selectedCaseIndex];

  const [stageIndex, setStageIndex] = useState<number>(0);
  const [evidenceList, setEvidenceList] = useState<string[]>([]);
  const [caseSolved, setCaseSolved] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<RecognitionEvaluation | null>(null);

  const currentStage = activeCase.stages[stageIndex] || activeCase.stages[0];
  const targetSign: SignDefinition = GET_SIGN_BY_ID(currentStage.targetSign);

  const evaluatedRef = useRef<boolean>(false);

  useEffect(() => {
    resetHoldBuffer();
    setStageIndex(0);
    setEvidenceList([]);
    setCaseSolved(false);
    setEvaluation(null);
    evaluatedRef.current = false;
  }, [selectedCaseIndex, activeCase]);

  const caseSolvedRef = useRef(caseSolved);
  caseSolvedRef.current = caseSolved;
  const currentStageRef = useRef(currentStage);
  currentStageRef.current = currentStage;
  const stageIndexRef = useRef(stageIndex);
  stageIndexRef.current = stageIndex;
  const activeCaseRef = useRef(activeCase);
  activeCaseRef.current = activeCase;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const onRefreshProfileRef = useRef(onRefreshProfile);
  onRefreshProfileRef.current = onRefreshProfile;

  const handleLandmarks = useCallback((landmarks: Landmark3D[], faceData?: FaceLandmarkData | null, handedness?: 'Left' | 'Right') => {
    if (caseSolvedRef.current) return;

    const stage = currentStageRef.current;
    const cCase = activeCaseRef.current;
    const result = evaluateSign(landmarks, stage.targetSign, faceData, handedness);
    setEvaluation(result);

    if (result.isCorrect && !evaluatedRef.current) {
      evaluatedRef.current = true;
      soundFx.playSuccess();

      // Collect evidence
      setEvidenceList(prev => [...prev, stage.decodedPart]);

      if (stageIndexRef.current + 1 >= cCase.stages.length) {
        setCaseSolved(true);
        soundFx.playLevelUp();
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#A855F7', '#6366F1', '#38BDF8']
        });

        recordAttemptApi({
          student_id: profileRef.current?.id || 'student-alex',
          sign_id: cCase.id,
          mode: 'detective',
          is_correct: true,
          confidence: result.confidence / 100,
          shape_score: result.shapeScore / 100,
          orientation_score: result.orientationScore / 100,
          position_score: result.positionScore / 100,
          latency_ms: 1500,
          feedback: `Cracked ${cCase.title}`
        }).then(() => onRefreshProfileRef.current());
      } else {
        setTimeout(() => {
          resetHoldBuffer();
          evaluatedRef.current = false;
          setStageIndex(prev => prev + 1);
        }, 1000);
      }
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3">
      <SpiralBinder
        title="DETECTIVE DOSSIER: GESTURE CASE FILES"
        subtitle="Forensic sign investigation. Decipher hidden signals to solve confidential cases!"
        badge={`CASE #${selectedCaseIndex === 0 ? '014' : '021'}`}
        icon="🔍"
      >
        {/* Header & Case Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b-2 border-dashed border-[#94A3B8]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-[#C084FC] text-[#0F172A] border-2 border-[#0F172A] font-bold shadow-pixel-sm">
                INVESTIGATION
              </span>
              <span className="text-xs text-[#475569] font-game">Forensic gesture deduction</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-chunky text-[#0F172A] mt-1 tracking-wide">
              {activeCase.title}
            </h2>
          </div>

          {/* Case Switcher Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {CASES_DATA.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => setSelectedCaseIndex(idx)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-pixel border-2 border-[#0F172A] transition-all active:translate-y-0.5 ${
                  selectedCaseIndex === idx
                    ? 'bg-[#FEF08A] text-[#0F172A] shadow-pixel font-bold'
                    : 'bg-white text-[#64748B] hover:text-[#0F172A] shadow-pixel-sm'
                }`}
              >
                {c.id.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
          {/* Case Dossier & Clue (Yellow Card, 4 cols) */}
          <div className="lg:col-span-4 bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b-2 border-[#0F172A] mb-2.5 sm:mb-3">
                <span className="font-pixel text-[9px] sm:text-[10px] text-[#0F172A] flex items-center space-x-1.5 font-bold">
                  <FolderOpen className="w-3.5 h-3.5 text-[#9333EA]" />
                  <span>CASE DOSSIER</span>
                </span>
                <span className="font-pixel text-[9px] sm:text-[10px] bg-white border border-[#0F172A] px-2 py-0.5 rounded text-[#B45309] font-bold">
                  +{activeCase.xpReward} XP
                </span>
              </div>

              <p className="text-xs text-[#0F172A] font-game leading-relaxed mb-2.5 sm:mb-3 bg-white p-2.5 sm:p-3 rounded-xl border-2 border-[#0F172A] shadow-inner">
                {activeCase.synopsis}
              </p>

              {/* Current Clue Card */}
              <div className="p-2.5 sm:p-3.5 rounded-xl bg-[#E0E7FF] border-2 border-[#0F172A] mb-2.5 sm:mb-3 shadow-pixel-sm">
                <span className="font-pixel text-[9px] uppercase tracking-wider text-[#4338CA] font-bold block mb-1">
                  STAGE {stageIndex + 1} OF {activeCase.stages.length}
                </span>
                <p className="text-xs text-[#0F172A] font-bold font-game mb-2 leading-snug">
                  {currentStage.clue}
                </p>
                <div className="text-[10px] sm:text-[11px] text-[#1E1B4B] font-pixel bg-white p-1.5 rounded-lg border border-[#0F172A]">
                  &gt; {currentStage.prompt}
                </div>
              </div>

              {/* Evidence Locker */}
              <div>
                <span className="font-pixel text-[9px] sm:text-[10px] uppercase text-[#0F172A] block mb-1.5 font-bold">
                  EVIDENCE LOG:
                </span>
                <div className="space-y-1.5">
                  {evidenceList.length === 0 ? (
                    <span className="text-xs text-[#64748B] italic font-game block bg-white/60 p-2 rounded-lg border border-[#0F172A]">
                      No signals decrypted yet.
                    </span>
                  ) : (
                    evidenceList.map((ev, i) => (
                      <div key={i} className="flex items-center space-x-2 text-xs font-pixel text-[#0F172A] bg-[#BBF7D0] border-2 border-[#0F172A] p-2 rounded-xl shadow-pixel-sm">
                        <CheckCircle className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>{ev}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {caseSolved && (
              <div className="mt-3 p-3 sm:p-3.5 rounded-xl bg-[#BBF7D0] border-3 border-[#0F172A] text-center shadow-pixel animate-bounce">
                <Award className="w-6 sm:w-7 h-6 sm:h-7 text-[#D97706] mx-auto mb-1" />
                <h4 className="font-pixel text-xs font-bold text-[#0F172A]">CASE SOLVED!</h4>
                <p className="text-xs text-[#0F172A] font-game mt-1 leading-tight">{activeCase.finalMessage}</p>
              </div>
            )}
          </div>

          {/* Live Camera (5 cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <WebcamHandTracker
              targetSignId={currentStage.targetSign}
              evaluation={evaluation}
              onLandmarks={handleLandmarks}
              demoMode={demoMode}
              onEnableDemoMode={onToggleDemoMode}
            />
          </div>

          {/* Decoder HUD (Yellow Card, 3 cols) */}
          <div className="lg:col-span-3 bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel flex flex-col justify-between">
            <div>
              <span className="font-pixel text-[10px] sm:text-[11px] text-[#0F172A] uppercase font-bold block mb-2 pb-2 border-b-2 border-[#0F172A]">
                FORENSIC SCANNER
              </span>

              <div className="p-2.5 sm:p-3 bg-white rounded-xl border-2 border-[#0F172A] shadow-inner text-center mb-3">
                <span className="font-pixel text-[9px] text-[#64748B] block mb-1">SIGNAL CONFIDENCE</span>
                <span className="text-2xl sm:text-3xl font-pixel text-[#9333EA]">
                  {evaluation?.confidence || 0}%
                </span>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl bg-white border-2 border-[#0F172A] text-xs font-game">
                <span className="font-pixel text-[9px] text-[#64748B] block mb-1 font-bold">DECRYPTOR AI:</span>
                <p className="text-[#0F172A] text-[11px] sm:text-[12px] leading-snug">
                  {evaluation?.feedbackMessage || "Looking for hand signal in camera frame..."}
                </p>
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t-2 border-[#0F172A] text-center bg-white rounded-xl p-2 border border-[#0F172A]">
              <span className="font-pixel text-[9px] sm:text-[10px] text-[#0F172A]">
                CASES SOLVED: <strong className="text-[#9333EA]">1 / 4</strong>
              </span>
            </div>
          </div>
        </div>
      </SpiralBinder>
    </div>
  );
};
