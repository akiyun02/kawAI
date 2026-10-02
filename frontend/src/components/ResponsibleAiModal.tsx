import React from 'react';
import { ShieldCheck, Lock, Eye, Heart, X, Check } from 'lucide-react';

interface ResponsibleAiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResponsibleAiModal: React.FC<ResponsibleAiModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-sm">
      <div className="bg-[#BAE6FD] border-4 border-[#0F172A] rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-pixel-lg relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white border-2 border-[#0F172A] text-[#0F172A] hover:bg-slate-100 shadow-pixel-sm active:translate-y-0.5"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2 text-[10px] font-pixel text-[#0369A1] mb-1 font-bold">
          <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
          <span>RESPONSIBLE AI & ETHICS CHARTER</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-chunky text-[#0F172A] mb-3">
          AI Ethics, Privacy & Inclusive Design
        </h2>

        <div className="space-y-3 text-xs text-[#0F172A] font-game leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-pixel-sm">
            <h4 className="font-bold text-[#0F172A] font-chunky text-sm mb-0.5 flex items-center space-x-2">
              <Eye className="w-4 h-4 text-[#0284C7]" />
              <span>100% Local Client-Side Computer Vision</span>
            </h4>
            <p className="text-[12px] text-[#334155]">
              Your webcam frames are processed directly inside your browser using MediaPipe running on your local device. 
              No video, images, or biometric face recordings are ever transmitted across the internet or stored on cloud servers.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-pixel-sm">
            <h4 className="font-bold text-[#0F172A] font-chunky text-sm mb-0.5 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-[#7C3AED]" />
              <span>Transparent Telemetry & Privacy</span>
            </h4>
            <p className="text-[12px] text-[#334155]">
              We only persist aggregate numerical metrics: your current level, XP, and anonymous accuracy ratios across sign categories. 
              Educators in the Teacher Portal view cohort-level trends without surveillance over individual home environments.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border-2 border-[#0F172A] shadow-pixel-sm">
            <h4 className="font-bold text-[#0F172A] font-chunky text-sm mb-0.5 flex items-center space-x-2">
              <Heart className="w-4 h-4 text-[#E11D48]" />
              <span>Deaf Culture & Inclusive Framing</span>
            </h4>
            <p className="text-[12px] text-[#334155]">
              KawAI celebrates Sign Language as an expressive, natural, and rich human language. 
              We explicitly reject any medical deficit model that frames Deaf people as individuals who need "fixing." 
              Our mission is to foster inclusive two-way communication between hearing and Deaf communities.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FEF08A] border-2 border-[#0F172A] shadow-pixel-sm">
            <h4 className="font-bold text-[#0F172A] font-chunky text-xs mb-0.5">
              AI Limitations & Non-Clinical Disclaimer
            </h4>
            <p className="text-[11px] text-[#475569]">
              KawAI is an educational game designed to encourage beginner and intermediate learners. 
              AI confidence scores are pedagogical feedback cues and must not be used for certified legal, medical, or official interpretation.
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t-2 border-[#0F172A] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#0F172A] font-pixel text-xs border-3 border-[#0F172A] shadow-pixel active:translate-y-1 transition-all"
          >
            I UNDERSTAND
          </button>
        </div>
      </div>
    </div>
  );
};

