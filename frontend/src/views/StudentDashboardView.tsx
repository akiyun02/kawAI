import React from 'react';
import { GameMode, StudentProfile, Quest } from '../types';
import { SpiralBinder } from '../components/SpiralBinder';
import { 
  Flame, Sparkles, Target, ArrowRight, Compass, Network
} from 'lucide-react';

interface StudentDashboardViewProps {
  profile: StudentProfile | null;
  quests: Quest[];
  onNavigateToMode: (mode: GameMode, initialSign?: string, overrideSigns?: string[]) => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  profile,
  quests,
  onNavigateToMode
}) => {
  const level = profile?.level || 4;
  const xp = profile?.xp || 1850;
  const streak = profile?.streak || 5;
  const xpInLevel = xp % 500;
  const xpPct = Math.round((xpInLevel / 500) * 100);

  const activeQuest = quests[0] || {
    id: 'q-default',
    title: 'Master Everyday Greetings',
    description: 'Perform HELLO and THANK YOU with >= 85% orientation accuracy.',
    progress: 70,
    target: 100,
    reward_xp: 250,
    category: 'Everyday Signs'
  };

  const aiRec = profile?.ai_recommendation || {
    title: 'Palm Orientation Calibration Drill',
    focus: 'Hand Orientation (53%)',
    message: 'Your hand shapes are generally accurate, but you frequently rotate your palm inward toward yourself rather than directly facing the camera. Practice orientation-focused signs for 3 minutes to lock in proper spatial projection.',
    target_signs: ['B', 'D', 'HELLO', 'THANK YOU'],
    estimated_time: '3 mins',
    xp_bonus: 150
  };

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4">
      <SpiralBinder
        title="ADVENTURE JOURNAL"
        subtitle="STUDENT COMPENDIUM • ALEX RIVERS"
        badge={`LVL 0${level}`}
        icon="📖"
      >
        {/* Top Hero Banner inside Notebook Page */}
        <div className="bg-[#BAE6FD] border-3 border-[#0F172A] rounded-2xl p-4 sm:p-5 shadow-pixel mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-pixel text-[10px] uppercase text-[#0284C7] font-bold block mb-1">
                HERO STATUS
              </span>
              <h1 className="font-pixel text-lg sm:text-xl font-black text-[#0F172A]">
                Alex Rivers (Level 0{level})
              </h1>
              <p className="font-chunky text-xs sm:text-sm text-[#334155] mt-0.5">
                Ready for today's quest? The AI detected steady hand shape improvements!
              </p>
            </div>

            {/* Quick Badges */}
            <div className="flex items-center space-x-2">
              <div className="bg-[#FEF08A] border-2 border-[#0F172A] px-3 py-1.5 rounded-xl shadow-pixel-sm text-center">
                <span className="font-pixel text-[8px] text-[#854D0E] block">TOTAL XP</span>
                <span className="font-pixel text-xs sm:text-sm font-black text-[#0F172A]">
                  🪙 {xp.toLocaleString()}
                </span>
              </div>
              <div className="bg-[#FED7AA] border-2 border-[#0F172A] px-3 py-1.5 rounded-xl shadow-pixel-sm text-center">
                <span className="font-pixel text-[8px] text-[#9A3412] block">STREAK</span>
                <span className="font-pixel text-xs sm:text-sm font-black text-[#EA580C]">
                  🔥 {streak}D
                </span>
              </div>
            </div>
          </div>

          {/* XP Level Bar */}
          <div className="mt-3 pt-3 border-t-2 border-[#0F172A]/20">
            <div className="flex justify-between font-pixel text-[9px] text-[#475569] mb-1">
              <span>LEVEL 0{level} PROGRESS</span>
              <span>{xpInLevel} / 500 XP TO LVL 0{level + 1}</span>
            </div>
            <div className="w-full bg-white h-3 rounded-full border-2 border-[#0F172A] overflow-hidden p-0.5">
              <div
                className="bg-[#38BDF8] h-full rounded-full transition-all duration-500"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Big Game Cards (Exact Layout of the User Reference Image) */}
        <div className="space-y-4">
          
          {/* Card 1: Today's Quest (Matches Squirrels Card in reference) */}
          <div className="bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Inset Icon Box (Like Squirrel Head in reference) */}
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white border-3 border-[#0F172A] rounded-xl shadow-inner flex items-center justify-center shrink-0">
                <span className="text-2xl sm:text-4xl">🎯</span>
              </div>
              
              {/* Card Title & Content */}
              <div>
                <span className="font-pixel text-[9px] text-[#854D0E] font-bold block uppercase">
                  ACTIVE QUEST • +{activeQuest.reward_xp} XP
                </span>
                <h3 className="font-pixel text-xs sm:text-base font-black text-[#0F172A] uppercase mt-0.5">
                  {activeQuest.title}
                </h3>
                <p className="font-chunky text-xs text-[#475569] mt-0.5 max-w-md leading-tight">
                  {activeQuest.description}
                </p>
                {/* Mini progress */}
                <div className="mt-2 flex items-center space-x-2">
                  <div className="w-24 sm:w-32 bg-white h-2 rounded-full border border-[#0F172A] overflow-hidden">
                    <div className="bg-[#4ADE80] h-full" style={{ width: `${activeQuest.progress}%` }} />
                  </div>
                  <span className="font-pixel text-[9px] font-bold text-[#0F172A]">{activeQuest.progress}%</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateToMode('learn', 'HELLO')}
              className="game-btn w-full sm:w-auto px-4 py-3 rounded-xl bg-[#4ADE80] hover:bg-[#22C55E] text-[#0F172A] font-pixel text-[10px] sm:text-xs font-bold shrink-0 flex items-center justify-center space-x-1.5"
            >
              <span>CONTINUE QUEST</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: AI Weakness Diagnosis (Matches Brain / Traits Card in reference) */}
          <div className="bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Inset Icon Box (Brain emoji like reference image) */}
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white border-3 border-[#0F172A] rounded-xl shadow-inner flex items-center justify-center shrink-0">
                <span className="text-2xl sm:text-4xl">🧠</span>
              </div>
              
              <div>
                <span className="font-pixel text-[9px] text-[#EA580C] font-bold block uppercase">
                  AI KINEMATICS WEAKNESS SCAN • {aiRec.focus}
                </span>
                <h3 className="font-pixel text-xs sm:text-base font-black text-[#0F172A] uppercase mt-0.5">
                  {aiRec.title}
                </h3>
                <p className="font-chunky text-xs text-[#475569] mt-0.5 max-w-md leading-tight">
                  "{aiRec.message}"
                </p>
                <div className="mt-1.5 font-pixel text-[9px] text-[#0284C7]">
                  Target Signs: {aiRec.target_signs.join(', ')} • {aiRec.estimated_time}
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateToMode('practice', undefined, aiRec.target_signs)}
              className="game-btn w-full sm:w-auto px-4 py-3 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] hover:text-white text-[#0F172A] font-pixel text-[10px] sm:text-xs font-bold shrink-0 flex items-center justify-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>START DRILL</span>
            </button>
          </div>

          {/* Card 3: Curriculum Mastery (Matches Globe / Environments Card in reference) */}
          <div className="bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel">
            <div className="flex items-center space-x-3 sm:space-x-4 mb-3">
              {/* Inset Globe Box */}
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white border-3 border-[#0F172A] rounded-xl shadow-inner flex items-center justify-center shrink-0">
                <span className="text-2xl sm:text-4xl">🌍</span>
              </div>
              
              <div className="flex-1">
                <span className="font-pixel text-[9px] text-[#0284C7] font-bold block uppercase">
                  TELEMETRY MATRIX
                </span>
                <h3 className="font-pixel text-xs sm:text-base font-black text-[#0F172A] uppercase mt-0.5">
                  CURRICULUM MASTERY
                </h3>
                <p className="font-chunky text-xs text-[#475569]">
                  Evaluated across your last {profile?.total_attempts || 42} webcam recognition attempts.
                </p>
              </div>
            </div>

            {/* 4 Chunky Stat Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t-2 border-[#0F172A]/20">
              <div className="bg-white border-2 border-[#0F172A] p-2 rounded-xl text-center shadow-pixel-sm">
                <span className="font-pixel text-[9px] text-[#64748B] block">ALPHABET</span>
                <span className="font-pixel text-xs sm:text-sm font-bold text-[#0F172A]">
                  {profile?.alphabet_mastery || 82}%
                </span>
              </div>

              <div className="bg-white border-2 border-[#0F172A] p-2 rounded-xl text-center shadow-pixel-sm">
                <span className="font-pixel text-[9px] text-[#64748B] block">NUMBERS</span>
                <span className="font-pixel text-xs sm:text-sm font-bold text-[#0F172A]">
                  {profile?.numbers_mastery || 61}%
                </span>
              </div>

              <div className="bg-white border-2 border-[#0F172A] p-2 rounded-xl text-center shadow-pixel-sm">
                <span className="font-pixel text-[9px] text-[#64748B] block">COMMON</span>
                <span className="font-pixel text-xs sm:text-sm font-bold text-[#16A34A]">
                  {profile?.common_signs_mastery || 91}%
                </span>
              </div>

              <div className="bg-[#FED7AA] border-2 border-[#0F172A] p-2 rounded-xl text-center shadow-pixel-sm">
                <span className="font-pixel text-[9px] text-[#9A3412] block">ORIENTATION</span>
                <span className="font-pixel text-xs sm:text-sm font-bold text-[#EA580C]">
                  {profile?.orientation_accuracy || 53}% ⚠
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Skill Tree & Capstones (Matches Person / People Card in reference) */}
          <div className="bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-3 sm:p-4 shadow-pixel flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Inset Person/Character Box */}
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white border-3 border-[#0F172A] rounded-xl shadow-inner flex items-center justify-center shrink-0">
                <span className="text-2xl sm:text-4xl">👤</span>
              </div>
              
              <div>
                <span className="font-pixel text-[9px] text-[#6D28D9] font-bold block uppercase">
                  PROGRESSION MAP
                </span>
                <h3 className="font-pixel text-xs sm:text-base font-black text-[#0F172A] uppercase mt-0.5">
                  SKILL TREE & BOSS CHALLENGES
                </h3>
                <p className="font-chunky text-xs text-[#475569] mt-0.5 max-w-md leading-tight">
                  Unlock conversational dialogue zones and confront The Silent Guardian.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateToMode('skilltree')}
              className="game-btn w-full sm:w-auto px-4 py-3 rounded-xl bg-[#C4B5FD] hover:bg-[#A78BFA] text-[#0F172A] font-pixel text-[10px] sm:text-xs font-bold shrink-0 flex items-center justify-center space-x-1.5"
            >
              <Network className="w-4 h-4" />
              <span>OPEN MAP</span>
            </button>
          </div>

        </div>
      </SpiralBinder>
    </div>
  );
};
