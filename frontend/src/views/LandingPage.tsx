import React from 'react';
import { GameMode } from '../types';
import { 
  Sparkles, ArrowRight, ShieldCheck, Zap, Eye, 
  Target, BookOpen, Skull, Search, Puzzle, Play, Lock, CheckCircle2, ChevronRight
} from 'lucide-react';

interface LandingPageProps {
  onStart: (mode: GameMode) => void;
  onOpenPrivacyModal?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onOpenPrivacyModal }) => {
  return (
    <div className="min-h-screen game-diamond-bg text-[#0F172A] flex flex-col justify-between py-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-12 lg:pt-10 lg:pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          {/* Main Hero Card (Chunky Notebook Style) */}
          <div className="bg-[#BAE6FD] border-4 border-[#0F172A] rounded-3xl p-6 sm:p-10 shadow-pixel-lg text-center relative">
            
            {/* Top Hanging Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-xl bg-[#FEF08A] border-3 border-[#0F172A] text-[#0F172A] font-pixel text-xs font-bold mb-6 shadow-pixel-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              <span>RAITE 2026 AI IN EDUCATION PROTOTYPE</span>
            </div>

            {/* Hero Brand Display with Pixel Hand Logo */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
              <img 
                src="/assets/kawai-logo.png" 
                alt="KawAI Hand Sign Logo" 
                className="w-20 h-20 sm:w-28 sm:h-28 object-contain pixelated drop-shadow-md hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-5xl sm:text-7xl font-black font-pixel tracking-wider text-[#0F172A]">
                    KawAI
                  </h1>
                  <span className="font-pixel text-[10px] sm:text-xs bg-[#FEF08A] text-[#854D0E] border-2 border-[#0F172A] px-2.5 py-1 rounded-xl shadow-pixel-sm font-bold">
                    AI
                  </span>
                </div>
                <div className="font-pixel text-xs sm:text-sm text-[#0369A1] font-bold tracking-widest mt-1">
                  EMPOWERED BY AI
                </div>
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-[#1E293B] font-game mb-8 leading-relaxed max-w-2xl mx-auto">
              An arcade-gamified ASL fingerspelling &amp; sign language adventure! Progress through interactive quests, 
              real-time on-device computer vision camera drills, and adaptive boss battles.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => onStart('dashboard')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#0F172A] font-pixel text-xs uppercase tracking-wider border-3 border-[#0F172A] shadow-pixel active:translate-y-1 transition-all flex items-center justify-center space-x-2"
              >
                <span>START LEARNING</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onStart('learn')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-[#0F172A] font-pixel text-xs uppercase tracking-wider border-3 border-[#0F172A] shadow-pixel active:translate-y-1 transition-all flex items-center justify-center space-x-2"
              >
                <Play className="w-4 h-4 text-[#0284C7] fill-cyan-300" />
                <span>TRY WEBCAM DEMO</span>
              </button>
            </div>

            {/* Interactive Live Teaser Mockup */}
            <div className="mt-10 max-w-3xl mx-auto rounded-2xl bg-white border-3 border-[#0F172A] shadow-pixel p-4 sm:p-5 text-left">
              <div className="flex items-center justify-between pb-3 border-b-2 border-[#0F172A] font-pixel text-[10px] text-[#0F172A]">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full bg-[#EF4444] border border-[#0F172A]" />
                  <span className="w-3 h-3 rounded-full bg-[#F59E0B] border border-[#0F172A]" />
                  <span className="w-3 h-3 rounded-full bg-[#10B981] border border-[#0F172A]" />
                  <span className="ml-2 font-bold">LIVE KINEMATICS SCANNER</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#BBF7D0] border border-[#0F172A] text-[#16A34A] font-bold">
                  LOCAL 30 FPS
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                {/* Left: Target */}
                <div className="bg-[#FEF08A] rounded-xl p-3 border-2 border-[#0F172A] flex flex-col justify-between">
                  <div>
                    <span className="font-pixel text-[9px] text-[#64748B] uppercase font-bold">TARGET SIGN</span>
                    <div className="text-4xl font-black font-chunky text-[#0F172A] my-1">B</div>
                    <p className="text-xs text-[#0F172A] font-game">Open flat palm with thumb folded across.</p>
                  </div>
                  <div className="font-pixel text-[9px] text-[#0369A1] font-bold mt-2">
                    Palm Facing Camera
                  </div>
                </div>

                {/* Center: Recognition */}
                <div className="bg-[#BAE6FD] rounded-xl p-3 border-2 border-[#0F172A] relative flex flex-col items-center justify-center min-h-[140px]">
                  <div className="w-14 h-16 border-2 border-[#0F172A] bg-white rounded-lg flex items-center justify-center relative shadow-pixel-sm">
                    <span className="font-pixel text-[10px] font-bold text-[#16A34A]">HAND</span>
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#16A34A] rounded-full border border-[#0F172A]" />
                  </div>
                  <span className="font-pixel text-[11px] text-[#16A34A] font-bold mt-2">
                    ✓ 94% MATCH
                  </span>
                  <span className="font-pixel text-[9px] text-[#475569]">21 Landmarks Aligned</span>
                </div>

                {/* Right: AI Diagnosis */}
                <div className="bg-[#FEF08A] rounded-xl p-3 border-2 border-[#0F172A] flex flex-col justify-between">
                  <div>
                    <span className="font-pixel text-[9px] text-[#64748B] uppercase font-bold">BIOMECHANICAL SCAN</span>
                    <div className="space-y-1 mt-1.5 font-game text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#475569]">Hand Shape:</span>
                        <span className="text-[#16A34A] font-bold">✓ Pass</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#475569]">Palm Angle:</span>
                        <span className="text-[#16A34A] font-bold">✓ Direct</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#475569]">Framing:</span>
                        <span className="text-[#16A34A] font-bold">✓ Centered</span>
                      </div>
                    </div>
                  </div>
                  <div className="font-game text-[11px] text-[#0F172A] bg-white p-1.5 rounded-lg border border-[#0F172A] mt-2 leading-tight">
                    "Perfect posture. Ready to chain in sequence!"
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6 Game Modes Showcase */}
      <section className="py-8 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-8">
          <span className="font-pixel text-[10px] uppercase bg-[#FEF08A] border-2 border-[#0F172A] px-3 py-1 rounded-xl shadow-pixel-sm font-bold text-[#0F172A]">
            6 GAMIFIED MODES
          </span>
          <h3 className="text-2xl sm:text-3xl font-chunky text-[#0F172A] mt-2 mb-1">
            An Interactive Sign RPG
          </h3>
          <p className="text-xs text-[#475569] font-game">
            Every sign learned builds muscle memory, earns XP, and advances your skill tree.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Learn Mode */}
          <div 
            onClick={() => onStart('learn')}
            className="p-4 rounded-2xl bg-[#FEF08A] border-3 border-[#0F172A] shadow-pixel hover:-translate-y-1 cursor-pointer transition-all active:translate-y-0.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#0F172A] flex items-center justify-center text-[#0284C7] mb-3 shadow-pixel-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <h4 className="text-base font-chunky text-[#0F172A] mb-1">1. Learn Codex</h4>
            <p className="text-xs text-[#475569] font-game leading-relaxed mb-3">
              Step-by-step anatomical guides, 3D vector orientation cues, and guided webcam verification.
            </p>
            <span className="font-pixel text-[10px] text-[#0284C7] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>EXPLORE SIGNS</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* 2. Practice Mode */}
          <div 
            onClick={() => onStart('practice')}
            className="p-4 rounded-2xl bg-[#FEF08A] border-3 border-[#0F172A] shadow-pixel hover:-translate-y-1 cursor-pointer transition-all active:translate-y-0.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#0F172A] flex items-center justify-center text-[#16A34A] mb-3 shadow-pixel-sm">
              <Target className="w-5 h-5" />
            </div>
            <h4 className="text-base font-chunky text-[#0F172A] mb-1">2. Adaptive Practice</h4>
            <p className="text-xs text-[#475569] font-game leading-relaxed mb-3">
              Flashcard drills that intelligently calibrate to your past hand orientation mistakes.
            </p>
            <span className="font-pixel text-[10px] text-[#16A34A] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>ENTER DOJO</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* 3. Speed Run */}
          <div 
            onClick={() => onStart('speedrun')}
            className="p-4 rounded-2xl bg-[#FEF08A] border-3 border-[#0F172A] shadow-pixel hover:-translate-y-1 cursor-pointer transition-all active:translate-y-0.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#0F172A] flex items-center justify-center text-[#D97706] mb-3 shadow-pixel-sm">
              <Zap className="w-5 h-5 fill-amber-300" />
            </div>
            <h4 className="text-base font-chunky text-[#0F172A] mb-1">3. Speed Run (30s)</h4>
            <p className="text-xs text-[#475569] font-game leading-relaxed mb-3">
              Rapid sign test under a 30-second clock. Chain combos up to 5x multiplier for massive XP.
            </p>
            <span className="font-pixel text-[10px] text-[#D97706] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>BEAT HIGH SCORE</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* 4. Word Builder */}
          <div 
            onClick={() => onStart('wordbuilder')}
            className="p-4 rounded-2xl bg-[#FEF08A] border-3 border-[#0F172A] shadow-pixel hover:-translate-y-1 cursor-pointer transition-all active:translate-y-0.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#0F172A] flex items-center justify-center text-[#0D9488] mb-3 shadow-pixel-sm">
              <Puzzle className="w-5 h-5" />
            </div>
            <h4 className="text-base font-chunky text-[#0F172A] mb-1">4. Word Forge</h4>
            <p className="text-xs text-[#475569] font-game leading-relaxed mb-3">
              Spell full words and courtesy phrases. Evaluates sequence flow and kinematic transitions.
            </p>
            <span className="font-pixel text-[10px] text-[#0D9488] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>BUILD PHRASES</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* 5. Sign Detective */}
          <div 
            onClick={() => onStart('detective')}
            className="p-4 rounded-2xl bg-[#FEF08A] border-3 border-[#0F172A] shadow-pixel hover:-translate-y-1 cursor-pointer transition-all active:translate-y-0.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#0F172A] flex items-center justify-center text-[#9333EA] mb-3 shadow-pixel-sm">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="text-base font-chunky text-[#0F172A] mb-1">5. Sign Detective</h4>
            <p className="text-xs text-[#475569] font-game leading-relaxed mb-3">
              Forensic mystery cases. Decode discreet signals across quiet rooms to unlock secrets.
            </p>
            <span className="font-pixel text-[10px] text-[#9333EA] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>CRACK CASE #014</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* 6. Boss Battle */}
          <div 
            onClick={() => onStart('boss')}
            className="p-4 rounded-2xl bg-[#FEF08A] border-3 border-[#0F172A] shadow-pixel hover:-translate-y-1 cursor-pointer transition-all active:translate-y-0.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#0F172A] flex items-center justify-center text-[#DC2626] mb-3 shadow-pixel-sm">
              <Skull className="w-5 h-5" />
            </div>
            <h4 className="text-base font-chunky text-[#0F172A] mb-1">6. Boss Battle</h4>
            <p className="text-xs text-[#475569] font-game leading-relaxed mb-3">
              Confront "The Silent Guardian". Counter-spells exploit your orientation weaknesses!
            </p>
            <span className="font-pixel text-[10px] text-[#DC2626] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>CHALLENGE BOSS</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </section>

      {/* Responsible AI & Privacy Section (Retro Notebook Box) */}
      <section className="py-8 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="bg-[#BAE6FD] border-3 border-[#0F172A] p-6 rounded-3xl shadow-pixel">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center space-x-2 text-[#0369A1] font-pixel text-[10px] font-bold mb-1">
                <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                <span>RESPONSIBLE AI & ETHICAL COMMITMENT</span>
              </div>
              <h3 className="text-lg font-chunky text-[#0F172A] mb-1">
                Privacy-First, Client-Side Computer Vision
              </h3>
              <p className="text-xs text-[#0F172A] font-game leading-relaxed">
                KawAI processes camera feeds <strong className="font-bold">100% locally in your browser</strong> using MediaPipe.
                No webcam video or photos are ever recorded or transmitted to any server. 
                We promote inclusive communication and accessibility without framing Deaf communities as people who need "fixing."
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 font-pixel text-[9px]">
              <div className="p-2.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-pixel-sm">
                <span className="text-[#16A34A] block font-bold mb-0.5">✓ STORED:</span>
                <span className="text-[#475569]">Anonymous metrics &amp; XP level.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-pixel-sm">
                <span className="text-[#DC2626] block font-bold mb-0.5">✗ NEVER STORED:</span>
                <span className="text-[#475569]">Camera feeds or video data.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-4 text-center font-pixel text-[10px] text-[#475569]">
        KawAI — Built for the RAITE 2026 AI in Education Hackathon. Empowered by AI • Gamified • Accessible.
      </footer>
    </div>
  );
};

