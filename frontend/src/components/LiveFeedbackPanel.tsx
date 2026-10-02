import React from 'react';
import { RecognitionEvaluation, SignDefinition } from '../types';
import { RotateCcw, ArrowRight } from 'lucide-react';

interface LiveFeedbackPanelProps {
  targetSign: SignDefinition;
  evaluation: RecognitionEvaluation | null;
  xpEarned: number;
  comboCount: number;
  onRetry: () => void;
  onNext?: () => void;
}

export const LiveFeedbackPanel: React.FC<LiveFeedbackPanelProps> = ({
  evaluation,
  xpEarned,
  comboCount,
  onRetry,
  onNext
}) => {
  const confidence = evaluation?.confidence || 0;
  const isCorrect = evaluation?.isCorrect || false;

  const shapeStatus = evaluation?.shapeStatus || 'error';
  const orientStatus = evaluation?.orientationStatus || 'error';
  const posStatus = evaluation?.positionStatus || 'error';
  const locStatus = evaluation?.locationStatus || 'correct';

  return (
    <div className="flex flex-col h-full justify-between space-y-3">
      {/* Right Card: Real-Time AI Analysis (Handheld Game Stats Screen) */}
      <div className="bg-[#BAE6FD] border-3 border-[#0F172A] rounded-2xl p-4 shadow-pixel flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-[#0F172A]">
            <span className="font-pixel text-[10px] uppercase font-bold text-[#0F172A]">
              AI SCANNER METRICS
            </span>
            <span className={`font-pixel text-[9px] px-2 py-0.5 rounded border-2 border-[#0F172A] font-bold ${
              isCorrect ? 'bg-[#4ADE80] text-[#0F172A]' : 'bg-white text-[#64748B]'
            }`}>
              {isCorrect ? 'MATCH DETECTED' : 'ANALYZING'}
            </span>
          </div>

          {/* Large Confidence Bar (RPG Mana/HP Bar style) */}
          <div className="bg-white border-2 border-[#0F172A] rounded-xl p-3 mb-2.5 shadow-pixel-sm">
            <div className="flex justify-between items-baseline mb-1">
              <span className="font-pixel text-[10px] text-[#475569]">OVERALL MATCH</span>
              <span className={`font-pixel text-xl font-black ${
                confidence >= 80 ? 'text-[#16A34A]' : confidence >= 60 ? 'text-[#D97706]' : 'text-[#64748B]'
              }`}>
                {confidence}%
              </span>
            </div>
            {/* Retro segmented progress bar */}
            <div className="w-full bg-[#E2E8F0] h-3 rounded-full border-2 border-[#0F172A] overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  confidence >= 80 
                    ? 'bg-[#22C55E]' 
                    : confidence >= 60 
                    ? 'bg-[#F59E0B]' 
                    : 'bg-[#38BDF8]'
                }`}
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>

          {/* Steady Hold-To-Confirm Progress Bar */}
          <div className={`border-2 border-[#0F172A] rounded-xl p-2.5 mb-2.5 shadow-pixel-sm transition-all ${
            isCorrect 
              ? 'bg-[#DCFCE7] border-[#16A34A]' 
              : (evaluation?.holdProgress || 0) > 0 
              ? 'bg-[#E0F2FE] border-[#0284C7]' 
              : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-pixel text-[9px] uppercase font-bold text-[#0F172A] flex items-center gap-1">
                <span>🎯</span> {isCorrect ? 'SIGN CONFIRMED!' : (evaluation?.holdProgress || 0) > 0 ? 'HOLDING STEADY...' : 'HOLD TO LOCK IN'}
              </span>
              <span className={`font-mono font-black text-xs ${
                isCorrect ? 'text-[#16A34A]' : (evaluation?.holdProgress || 0) > 0 ? 'text-[#0284C7]' : 'text-[#94A3B8]'
              }`}>
                {isCorrect ? '100%' : `${evaluation?.holdProgress || 0}%`}
              </span>
            </div>
            <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full border border-[#0F172A] overflow-hidden p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-150 ${
                  isCorrect 
                    ? 'bg-[#22C55E]' 
                    : 'bg-[#0284C7]'
                }`}
                style={{ width: `${isCorrect ? 100 : (evaluation?.holdProgress || 0)}%` }}
              />
            </div>
            <p className="font-chunky text-[11px] text-[#475569] mt-1 leading-tight">
              {isCorrect 
                ? 'Sign locked in and verified!' 
                : (evaluation?.holdProgress || 0) > 0 
                ? 'Keep hand still... locking in match!' 
                : 'Hold clean posture for 0.4s to confirm.'}
            </p>
          </div>

          {/* Kaggle Neural Network Telemetry */}
          {evaluation?.mlPrediction && (
            <div className="bg-white/90 border-2 border-[#0F172A] rounded-xl p-2 mb-2.5 shadow-pixel-sm">
              <div className="flex items-center justify-between font-pixel text-[8px] sm:text-[9px] mb-1.5">
                <span className="font-bold text-[#0F172A] flex items-center gap-1">
                  <span>🧠</span> KAGGLE ML CLASSIFIER
                </span>
                <span className="text-[#0284C7] font-mono font-bold text-[8px] bg-[#E0F2FE] px-1 rounded border border-[#BAE6FD]">
                  {evaluation.mlPrediction.inferenceTimeMs}ms
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {evaluation.mlPrediction.top3.map((cand, idx) => (
                  <div
                    key={cand.sign}
                    className={`px-1 py-0.5 rounded-lg border text-center transition-all ${
                      idx === 0
                        ? 'bg-[#E0F2FE] border-[#0284C7] text-[#0F172A] font-bold shadow-pixel-xs'
                        : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#64748B]'
                    }`}
                  >
                    <div className="font-pixel text-[9px] leading-none truncate">
                      {cand.sign}
                    </div>
                    <div className="font-mono text-[8px] text-[#0284C7] font-bold leading-none mt-0.5">
                      {Math.round(cand.probability * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3 Biomechanical Stat Cards */}
          <div className="space-y-2">
            {/* 1. Hand Shape */}
            <div className="p-2.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-pixel-sm">
              <div className="flex items-center justify-between font-pixel text-[10px] mb-1">
                <span className="font-bold text-[#0F172A]">FINGER SHAPE</span>
                <span className={`font-bold ${shapeStatus === 'correct' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {shapeStatus === 'correct' ? '✓ OK' : '⚠ ADJUST'}
                </span>
              </div>
              <p className="font-chunky text-xs text-[#475569] leading-tight">
                {evaluation?.shapeFeedback || "Forming finger curvature..."}
              </p>
            </div>

            {/* 2. Palm Orientation (THE KEY HACKATHON DIFFERENTIATOR) */}
            <div className={`p-2.5 rounded-xl border-2 border-[#0F172A] shadow-pixel-sm transition-all ${
              orientStatus === 'warning' ? 'bg-[#FEF08A]' : 'bg-white'
            }`}>
              <div className="flex items-center justify-between font-pixel text-[10px] mb-1">
                <span className="font-bold text-[#0F172A]">PALM ORIENTATION</span>
                <span className={`font-bold ${orientStatus === 'correct' ? 'text-[#16A34A]' : 'text-[#D97706]'}`}>
                  {orientStatus === 'correct' ? '✓ ALIGNED' : '⚠ ROTATE'}
                </span>
              </div>
              <p className={`font-chunky text-xs leading-tight ${orientStatus === 'warning' ? 'text-[#854D0E] font-bold' : 'text-[#475569]'}`}>
                {evaluation?.orientationFeedback || "Orient palm toward camera sensor."}
              </p>
            </div>

            {/* 3. Body / Face Location Anchor */}
            <div className={`p-2.5 rounded-xl border-2 border-[#0F172A] shadow-pixel-sm transition-all ${
              locStatus === 'warning' ? 'bg-[#FEF08A]' : 'bg-white'
            }`}>
              <div className="flex items-center justify-between font-pixel text-[10px] mb-1">
                <span className="font-bold text-[#0F172A] flex items-center gap-1">
                  <span>👤</span> BODY LOCATION
                </span>
                <span className={`font-bold ${locStatus === 'correct' ? 'text-[#16A34A]' : 'text-[#D97706]'}`}>
                  {locStatus === 'correct' 
                    ? `✓ ${evaluation?.detectedFeatures?.locationZone?.toUpperCase() || 'ALIGNED'}` 
                    : '⚠ REPOSITION'}
                </span>
              </div>
              <p className={`font-chunky text-xs leading-tight ${locStatus === 'warning' ? 'text-[#854D0E] font-bold' : 'text-[#475569]'}`}>
                {evaluation?.locationFeedback || "Hand positioned at required body anchor."}
              </p>
            </div>

            {/* 4. Spatial Position */}
            <div className="p-2.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-pixel-sm">
              <div className="flex items-center justify-between font-pixel text-[10px] mb-1">
                <span className="font-bold text-[#0F172A]">FRAMING</span>
                <span className={`font-bold ${posStatus === 'correct' ? 'text-[#16A34A]' : 'text-[#D97706]'}`}>
                  {posStatus === 'correct' ? '✓ CENTER' : '⚠ REPOSITION'}
                </span>
              </div>
              <p className="font-chunky text-xs text-[#475569] leading-tight">
                {evaluation?.positionFeedback || "Position hand inside the bounding guide."}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Coach Dialogue Box (like NPC dialogue box in Pokemon) */}
        <div className={`mt-3 p-2.5 rounded-xl border-2 border-[#0F172A] font-chunky text-xs shadow-pixel-sm ${
          isCorrect ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEF9C3] text-[#854D0E]'
        }`}>
          <div className="flex items-start space-x-1.5">
            <span className="text-base leading-none">💬</span>
            <p className="leading-tight font-medium">
              {evaluation?.feedbackMessage || "Hold your hand steady in front of the lens!"}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar: XP, Combo, Buttons (Like bottom HUD in reference) */}
      <div className="bg-[#BAE6FD] border-3 border-[#0F172A] rounded-2xl p-3 shadow-pixel flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* XP Gained */}
          <div className="bg-white border-2 border-[#0F172A] px-2.5 py-1 rounded-xl shadow-pixel-sm">
            <span className="font-pixel text-[8px] text-[#64748B] block leading-none">XP EARNED</span>
            <span className="font-pixel text-sm font-black text-[#16A34A] leading-none mt-0.5 block">
              +{xpEarned}
            </span>
          </div>

          {/* Combo */}
          <div className="bg-[#FED7AA] border-2 border-[#0F172A] px-2.5 py-1 rounded-xl shadow-pixel-sm">
            <span className="font-pixel text-[8px] text-[#9A3412] block leading-none">COMBO</span>
            <span className="font-pixel text-sm font-black text-[#EA580C] leading-none mt-0.5 block">
              ×{comboCount}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onRetry}
            className="game-btn px-3 py-2 rounded-xl bg-white hover:bg-slate-100 font-pixel text-[10px] text-[#0F172A] flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RETRY</span>
          </button>

          {onNext && isCorrect && (
            <button
              onClick={onNext}
              className="game-btn px-4 py-2 rounded-xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#0F172A] font-pixel text-[10px] font-bold flex items-center space-x-1 animate-bounce"
            >
              <span>NEXT</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
