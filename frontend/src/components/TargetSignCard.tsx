import React from 'react';
import { SignDefinition } from '../types';
import { Compass, Info, Hand, Check, Sparkles } from 'lucide-react';

interface TargetSignCardProps {
  sign: SignDefinition;
  onSelectSign?: (signId: string) => void;
  availableSigns?: SignDefinition[];
}

export const TargetSignCard: React.FC<TargetSignCardProps> = ({
  sign,
  onSelectSign,
  availableSigns
}) => {
  return (
    <div className="bg-[#BAE6FD] border-2 sm:border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel flex flex-col justify-between h-full">
      <div>
        {/* Card Header: Category & Stars */}
        <div className="flex items-center justify-between mb-2.5 sm:mb-3 bg-white border-2 border-[#0F172A] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-pixel-sm">
          <span className="font-pixel text-[9px] sm:text-[10px] uppercase font-bold text-[#0284C7]">
            {sign.category}
          </span>
          <div className="flex items-center space-x-1">
            {[1, 2, 3].map((star) => (
              <span
                key={star}
                className={`text-xs ${star <= sign.difficulty ? 'text-[#F59E0B]' : 'text-slate-300'}`}
              >
                ★
              </span>
            ))}
            <span className="font-pixel text-[8px] sm:text-[9px] text-[#64748B] ml-1">
              T{sign.difficulty}
            </span>
          </div>
        </div>

        {/* Big Sign Item Glyph */}
        <div className="flex flex-col items-center justify-center p-3 sm:p-5 bg-[#FEF08A] border-2 sm:border-3 border-[#0F172A] rounded-2xl shadow-pixel mb-3 sm:mb-4 relative group">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white border-2 border-[#0F172A] shadow-inner flex items-center justify-center mb-1">
            <span className="font-pixel text-3xl sm:text-4xl font-black text-[#0F172A]">
              {sign.id}
            </span>
          </div>
          <span className="font-pixel text-xs font-bold text-[#0F172A] mt-1 uppercase">
            {sign.name}
          </span>
        </div>

        {/* Description & Position (Handbook style) */}
        <div className="space-y-2.5 mb-4">
          <div className="bg-white border-2 border-[#0F172A] p-2.5 rounded-xl shadow-pixel-sm">
            <h4 className="font-pixel text-[10px] text-[#0F172A] uppercase font-bold mb-1 flex items-center space-x-1">
              <span>📖</span>
              <span>FORMATION</span>
            </h4>
            <p className="font-chunky text-xs text-[#334155] leading-snug">
              {sign.description}
            </p>
          </div>

          <div className="bg-white border-2 border-[#0F172A] p-2.5 rounded-xl shadow-pixel-sm">
            <h4 className="font-pixel text-[10px] text-[#0F172A] uppercase font-bold mb-1 flex items-center space-x-1">
              <span>🧭</span>
              <span>PALM ORIENTATION</span>
            </h4>
            <p className="font-chunky text-xs text-[#334155] leading-snug">
              Target: <span className="font-bold text-[#0284C7] uppercase">{sign.orientationTarget}</span>. {sign.handPosition}
            </p>
          </div>
        </div>

        {/* Biomechanical Cues */}
        <div className="bg-[#F0FDF4] border-2 border-[#0F172A] p-2.5 rounded-xl shadow-pixel-sm">
          <h4 className="font-pixel text-[10px] uppercase text-[#16A34A] font-bold mb-1.5">
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
      </div>

      {/* Switch Target Sign Grid */}
      {availableSigns && onSelectSign && (
        <div className="mt-4 pt-3 border-t-2 border-[#0F172A]/20">
          <label className="font-pixel text-[9px] uppercase text-[#0F172A] block mb-1.5 font-bold">
            SELECT SIGN CARD
          </label>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
            {availableSigns.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelectSign(s.id)}
                className={`min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px] px-2 py-1 rounded-lg font-pixel text-[10px] sm:text-xs font-bold border-2 border-[#0F172A] transition-all flex items-center justify-center active:translate-y-0.5 ${
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
