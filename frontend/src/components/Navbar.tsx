import React, { useState } from 'react';
import { GameMode, StudentProfile, AccessibilitySettings } from '../types';
import { 
  Sparkles, Flame, Shield, BookOpen, Target, Zap, 
  Puzzle, Search, Skull, Network, GraduationCap, 
  Volume2, VolumeX, Eye, Type, Video, VideoOff, ArrowLeft, Sun, Menu, X, ChevronRight
} from 'lucide-react';
import { soundFx } from '../services/soundFx';

interface NavbarProps {
  currentMode: GameMode;
  onNavigate: (mode: GameMode) => void;
  profile: StudentProfile | null;
  accessibility: AccessibilitySettings;
  onUpdateAccessibility: (settings: Partial<AccessibilitySettings>) => void;
  demoMode: boolean;
  onToggleDemoMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMode,
  onNavigate,
  profile,
  accessibility,
  onUpdateAccessibility,
  demoMode,
  onToggleDemoMode
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const xp = profile?.xp || 1850;
  const level = profile?.level || 4;
  const streak = profile?.streak || 5;

  const navItems: { id: GameMode; label: string; icon: string; desc: string; color: string }[] = [
    { id: 'dashboard', label: 'QUEST LOG', icon: '📜', desc: 'Hero status & today quests', color: 'bg-[#FEF08A]' },
    { id: 'learn', label: 'LEARN A-Z', icon: '📖', desc: 'ASL alphabet codex & biomechanics', color: 'bg-[#BAE6FD]' },
    { id: 'wordbuilder', label: 'FINGERSPELL', icon: '✍️', desc: 'Spell words letter-by-letter', color: 'bg-[#DDD6FE]' },
    { id: 'practice', label: 'PRACTICE', icon: '🎯', desc: 'Adaptive flashcard drill', color: 'bg-[#BBF7D0]' },
    { id: 'speedrun', label: 'SPEED RUN', icon: '⚡', desc: '30s rapid combo sprint', color: 'bg-[#FED7AA]' },
    { id: 'detective', label: 'DETECTIVE', icon: '🔍', desc: 'Forensic case investigations', color: 'bg-[#FBCFE8]' },
    { id: 'boss', label: 'BOSS BATTLE', icon: '👾', desc: 'The Silent Guardian raid', color: 'bg-[#FECDD3]' },
    { id: 'skilltree', label: 'SKILL TREE', icon: '🌳', desc: 'RPG mastery matrix', color: 'bg-[#A7F3D0]' },
    { id: 'teacher', label: 'TEACHER', icon: '🎓', desc: 'Educator cohort telemetry', color: 'bg-[#E2E8F0]' },
    { id: 'benchmark', label: 'DEV METRICS', icon: '📊', desc: 'Confusion matrix & FPR benchmark', color: 'bg-[#CFFAFE]' },
    { id: 'recognitionlab', label: 'REC LAB', icon: '🔬', desc: 'Live recognition diagnostic', color: 'bg-[#FDE68A]' },
  ];

  const handleSelectMode = (mode: GameMode) => {
    onNavigate(mode);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#E0F2FE]/95 backdrop-blur-md border-b-3 sm:border-b-4 border-[#0F172A] py-1.5 sm:py-2 px-2 sm:px-6 shadow-sm">
      <div className="max-w-7xl mx-auto">
        {/* Top Game HUD Bar */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-3">
          
          {/* LEFT: Retro Chunky Red Back / Home Button */}
          <div className="flex items-center space-x-1.5 sm:space-x-3">
            <button
              onClick={() => onNavigate(currentMode === 'landing' ? 'dashboard' : 'landing')}
              title={currentMode === 'landing' ? 'Open Quest Dashboard' : 'Back to Main Title'}
              className="w-9 h-9 sm:w-11 sm:h-11 bg-[#EF4444] hover:bg-[#DC2626] active:translate-y-0.5 text-white border-2 sm:border-3 border-[#0F172A] rounded-xl shadow-pixel flex items-center justify-center font-bold transition-all group shrink-0"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3] transform group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {/* Game Logo Badge - KawAI */}
            <div 
              onClick={() => onNavigate('landing')}
              className="cursor-pointer bg-[#38BDF8] hover:bg-[#0EA5E9] border-2 sm:border-3 border-[#0F172A] rounded-xl px-2 sm:px-3 py-1 shadow-pixel flex items-center space-x-2 select-none transition-all group"
            >
              <img 
                src="/assets/kawai-logo.png" 
                alt="KawAI Logo" 
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain pixelated group-hover:scale-110 transition-transform" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-pixel text-[12px] sm:text-sm font-black text-[#0F172A] tracking-wider block leading-none">
                    KawAI
                  </span>
                  <span className="hidden lg:inline-block font-pixel text-[7px] bg-[#FEF08A] text-[#854D0E] border border-[#0F172A] px-1 py-0.2 rounded font-bold">
                    AI
                  </span>
                </div>
                <span className="hidden sm:block font-pixel text-[8px] text-[#0369A1] font-bold leading-none mt-0.5 tracking-tight">
                  EMPOWERED BY AI
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Game Resource Badges */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            
            {/* XP Coins Badge */}
            <div className="bg-[#FEF08A] border-2 sm:border-3 border-[#0F172A] px-2 sm:px-2.5 py-1 rounded-xl shadow-pixel flex items-center space-x-1">
              <span className="text-xs sm:text-base leading-none">🪙</span>
              <span className="font-pixel text-[10px] sm:text-xs font-bold text-[#0F172A]">
                {xp >= 1000 ? `${(xp / 1000).toFixed(1)}k` : xp}
                <span className="hidden md:inline"> XP</span>
              </span>
            </div>

            {/* Streak Flame Badge */}
            <div className="bg-[#FED7AA] border-2 sm:border-3 border-[#0F172A] px-1.5 sm:px-2.5 py-1 rounded-xl shadow-pixel flex items-center space-x-0.5 sm:space-x-1">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#EA580C] fill-[#EA580C]" />
              <span className="font-pixel text-[10px] sm:text-[11px] font-bold text-[#0F172A]">
                {streak}D
              </span>
            </div>

            {/* Time / Level HUD Badge */}
            <div className="hidden xs:flex bg-[#FFFFFF] border-2 sm:border-3 border-[#0F172A] px-2 sm:px-2.5 py-1 rounded-xl shadow-pixel items-center space-x-1">
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#F59E0B] flex items-center justify-center">
                <Sun className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white animate-spin" style={{ animationDuration: '12s' }} />
              </div>
              <div className="font-pixel text-[9px] sm:text-[10px] text-[#0F172A] leading-tight">
                <span className="font-bold">L{level}</span>
              </div>
            </div>

            {/* Demo Mode Button (Game Cartridge style) */}
            <button
              onClick={onToggleDemoMode}
              title="Toggle Webcam / Simulated Hackathon Demo Mode"
              className={`game-btn px-2 sm:px-2.5 py-1 rounded-xl font-pixel text-[9px] sm:text-[10px] flex items-center space-x-1 ${
                demoMode 
                  ? 'bg-[#FEF08A] text-[#854D0E]' 
                  : 'bg-[#BAE6FD] text-[#0369A1]'
              }`}
            >
              {demoMode ? <VideoOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              <span className="hidden md:inline">{demoMode ? 'SIMULATOR' : 'WEBCAM'}</span>
            </button>

            {/* Audio Toggle */}
            <button
              onClick={() => {
                const next = !accessibility.soundEnabled;
                onUpdateAccessibility({ soundEnabled: next });
                soundFx.setEnabled(next);
                if (next) soundFx.playSuccess();
              }}
              className="p-1 sm:p-1.5 rounded-xl bg-white border-2 sm:border-3 border-[#0F172A] shadow-pixel-sm text-[#0284C7] active:translate-y-0.5"
              title="Toggle Sound Effects"
            >
              {accessibility.soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#94A3B8]" />}
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden p-1.5 rounded-xl bg-[#38BDF8] border-2 border-[#0F172A] shadow-pixel text-[#0F172A] active:translate-y-0.5"
              title="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Game Mode Notebook Tabs (Horizontal scroll on tablet/desktop) */}
        {currentMode !== 'landing' && (
          <nav className="flex space-x-1.5 sm:space-x-2 overflow-x-auto pt-2 pb-0.5 scrollbar-none touch-pan-x">
            {navItems.map((item) => {
              const isActive = currentMode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectMode(item.id)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border-2 sm:border-3 border-[#0F172A] font-pixel text-[9px] sm:text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1 sm:space-x-1.5 active:translate-y-0.5 ${
                    isActive
                      ? `${item.color} shadow-pixel -translate-y-0.5 text-[#0F172A]`
                      : 'bg-white/80 hover:bg-white text-[#475569] shadow-pixel-sm'
                  }`}
                >
                  <span className="text-xs sm:text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Full-Screen Mobile Drawer Menu for 1-Tap Touch Navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-[52px] z-50 bg-[#E0F2FE]/98 backdrop-blur-md p-4 overflow-y-auto border-t-3 border-[#0F172A] md:hidden animate-in fade-in slide-in-from-top-4 duration-150">
            <div className="max-w-md mx-auto space-y-2 pb-8">
              <div className="flex items-center justify-between pb-2 border-b-2 border-dashed border-[#0F172A]/40 mb-3">
                <span className="font-pixel text-xs text-[#0F172A] uppercase font-bold">
                  SELECT GAME MODE
                </span>
                <span className="font-pixel text-[10px] text-[#0369A1]">
                  LVL 0{level} • {xp} XP
                </span>
              </div>

              {navItems.map((item) => {
                const isActive = currentMode === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectMode(item.id)}
                    className={`w-full p-3 rounded-2xl border-3 border-[#0F172A] shadow-pixel flex items-center justify-between transition-all active:translate-y-0.5 ${
                      isActive ? `${item.color} scale-[1.02]` : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#0F172A] flex items-center justify-center text-xl shadow-pixel-sm">
                        {item.icon}
                      </div>
                      <div className="text-left">
                        <span className="font-pixel text-xs font-bold text-[#0F172A] block">
                          {item.label}
                        </span>
                        <span className="font-game text-xs text-[#475569]">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#0F172A]" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
