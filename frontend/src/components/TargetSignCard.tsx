import React, { useState } from 'react';
import { SignDefinition } from '../types';
import { AssistStage } from '../data/gameLevels';
import { HandSignGraphic } from './HandSignGraphic';
import { Eye, EyeOff, Sparkles, BookOpen, Compass, Check } from 'lucide-react';

interface TargetSignCardProps {
  sign: SignDefinition;
  assistStage?: AssistStage;
  onSelectSign?: (signId: string) => void;
  availableSigns?: SignDefinition[];
}

export const TargetSignCard: React.FC<TargetSignCardProps> = ({
  sign,
  assistStage = 'graphic',
  onSelectSign,
  availableSigns
}) => {
  const [peekDiagram, setPeekDiagram] = useState<boolean>(false);

  const showGraphic = assistStage === 'graphic' || peekDiagram;
  const showHints = assistStage !== 'none';

  return (
    <div className="bg-[#BAE6FD] border-2 sm:border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel flex flex-col justify-between h-full">
      <div>
        {/* Card Header: Category & Assist Stage Badge */}
        <div className="flex items-center justify-between mb-2.5 sm:mb-3 bg-white border-2 border-[#0F172A] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-pixel-sm">
          <div className="flex items-center space-x-1.5">
            <span className="font-pixel text-[9px] sm:text-[10px] uppercase font-bold text-[#0284C7]">
              {sign.category}
            </span>
            <span className={`font-pixel text-[8px] px-1.5 py-0.5 rounded border border-[#0F172A] font-bold ${
              assistStage === 'graphic'
                ? 'bg-[#FEF08A] text-[#854D0E]'
                : assistStage === 'hint'
                ? 'bg-[#BBF7D0] text-[#166534]'
                : 'bg-[#FECDD3] text-[#9F1239]'
            }`}>
              {assistStage === 'graphic' ? '🖼️ BLUEPRINT' : assistStage === 'hint' ? '💡 HINTS' : '🧠 NO ASSIST'}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            {[1, 2, 3].map((star) => (
              <span
                key={star}
                className={`text-xs ${star <= sign.difficulty ? 'text-[#F59E0B]' : 'text-slate-300'}`}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {/* Big Sign Item Glyph + Graphic Illustration Area */}
        <div className="flex flex-col items-center justify-center p-3 bg-[#FEF08A] border-2 sm:border-3 border-[#0F172A] rounded-2xl shadow-pixel mb-3 relative group">
          <div className="flex items-center justify-center gap-3 w-full mb-2">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white border-2 border-[#0F172A] shadow-inner flex items-center justify-center">
              <span className="font-pixel text-2xl sm:text-3xl font-black text-[#0F172A]">
                {sign.id}
              </span>
            </div>
            <div>
              <span className="font-pixel text-xs sm:text-sm font-bold text-[#0F172A] block uppercase">
                {sign.name}
              </span>
              <span className="font-pixel text-[8px] text-[#854D0E] font-semibold">
                TIER {sign.difficulty} HANDSHAPE
              </span>
            </div>
          </div>

          {/* Graphic Representation / Peek Curtain */}
          {showGraphic ? (
            <div className="w-full flex flex-col items-center animate-fadeIn">
              <HandSignGraphic sign={sign} size="md" />
              {assistStage !== 'graphic' && (
                <button
                  onClick={() => setPeekDiagram(false)}
                  className="mt-2 text-[9px] font-pixel text-[#0284C7] underline hover:text-[#0369A1] flex items-center space-x-1"
                >
                  <EyeOff className="w-3 h-3" />
                  <span>HIDE DIAGRAM</span>
                </button>
              )}
            </div>
          ) : (
            <div className="w-full py-6 px-3 bg-white/80 border-2 border-dashed border-[#0F172A] rounded-xl flex flex-col items-center justify-center text-center">
              <span className="text-2xl mb-1">{assistStage === 'hint' ? '💡' : '🧠'}</span>
              <span className="font-pixel text-[9px] sm:text-[10px] text-[#0F172A] font-bold">
                {assistStage === 'hint' ? 'DIAGRAM HIDDEN (HINT MODE)' : 'BLIND RECALL CHALLENGE'}
              </span>
              <p className="font-chunky text-[11px] text-[#475569] mt-0.5 max-w-[200px]">
                {assistStage === 'hint'
                  ? 'Use the text clues below to form the sign from memory!'
                  : 'No assist! Sign strictly from muscle memory.'}
              </p>
              {assistStage === 'hint' && (
                <button
                  onClick={() => setPeekDiagram(true)}
                  className="mt-2.5 px-2.5 py-1 rounded-lg bg-[#38BDF8] hover:bg-[#0EA5E9] text-white font-pixel text-[8px] font-bold border border-[#0F172A] shadow-pixel-sm flex items-center space-x-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>PEEK BLUEPRINT</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Formation & Palm Orientation */}
        {showHints && (
          <div className="space-y-2 mb-3">
            <div className="bg-white border-2 border-[#0F172A] p-2.5 rounded-xl shadow-pixel-sm">
              <h4 className="font-pixel text-[9px] sm:text-[10px] text-[#0F172A] uppercase font-bold mb-1 flex items-center space-x-1">
                <BookOpen className="w-3 h-3 text-[#0284C7]" />
                <span>FORMATION</span>
              </h4>
              <p className="font-chunky text-xs text-[#334155] leading-snug">
                {sign.description}
              </p>
            </div>

            <div className="bg-white border-2 border-[#0F172A] p-2.5 rounded-xl shadow-pixel-sm">
              <h4 className="font-pixel text-[9px] sm:text-[10px] text-[#0F172A] uppercase font-bold mb-1 flex items-center space-x-1">
                <Compass className="w-3 h-3 text-[#0284C7]" />
                <span>PALM ORIENTATION</span>
              </h4>
              <p className="font-chunky text-xs text-[#334155] leading-snug">
                Target: <span className="font-bold text-[#0284C7] uppercase">{sign.orientationTarget}</span>. {sign.handPosition}
              </p>
            </div>
          </div>
        )}

        {/* Biomechanical Cues / Pro Tips */}
        {showHints && (
          <div className="bg-[#F0FDF4] border-2 border-[#0F172A] p-2.5 rounded-xl shadow-pixel-sm">
            <h4 className="font-pixel text-[9px] sm:text-[10px] uppercase text-[#16A34A] font-bold mb-1">
              PRO TIPS
            </h4>
            <ul className="space-y-1">
              {sign.hints.map((hint, idx) => (
                <li key={idx} className="flex items-start space-x-1.5 font-chunky text-xs text-[#1E293B]">
                  <span className="text-[#16A34A] font-bold">✓</span>
                  <span className="leading-tight">{hint}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Pure Recall Mask Message */}
        {!showHints && (
          <div className="bg-white border-2 border-[#0F172A] p-3 rounded-xl shadow-pixel-sm text-center">
            <span className="font-pixel text-[10px] text-[#9F1239] font-bold block mb-1">
              🏆 LEVEL RECALL EXAM
            </span>
            <p className="font-chunky text-xs text-[#475569]">
              All visual guides and text hints are locked. Hold up your hand to the camera and perform the sign from memory!
            </p>
          </div>
        )}
      </div>

      {/* Switch Target Sign Grid */}
      {availableSigns && onSelectSign && (
        <div className="mt-3 pt-2.5 border-t-2 border-[#0F172A]/20">
          <label className="font-pixel text-[8px] sm:text-[9px] uppercase text-[#0F172A] block mb-1 font-bold">
            AVAILABLE SIGNS IN THIS LEVEL
          </label>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
            {availableSigns.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSign(s.id)}
                className={`min-w-[32px] min-h-[32px] px-2 py-1 rounded-lg font-pixel text-[10px] sm:text-xs font-bold border-2 border-[#0F172A] transition-all flex items-center justify-center active:translate-y-0.5 ${
                  s.id === sign.id
                    ? 'bg-[#FEF08A] text-[#0F172A] shadow-pixel-sm -translate-y-0.5'
                    : 'bg-white text-[#475569] hover:bg-[#F0F9FF]'
                }`}
              >
                {s.id}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
