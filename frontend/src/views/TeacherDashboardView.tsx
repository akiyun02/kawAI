import React, { useState, useEffect } from 'react';
import { fetchTeacherInsights, startClassChallengeApi } from '../services/api';
import { soundFx } from '../services/soundFx';
import { SpiralBinder } from '../components/SpiralBinder';
import { 
  GraduationCap, Users, TrendingUp, AlertTriangle, 
  Sparkles, CheckCircle2, Send, ArrowRight, ShieldCheck, HelpCircle 
} from 'lucide-react';

export const TeacherDashboardView: React.FC = () => {
  const [insights, setInsights] = useState<any>(null);
  const [challengeSent, setChallengeSent] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchTeacherInsights().then((data) => {
      setInsights(data);
      setLoading(false);
    });
  }, []);

  const handleStartChallenge = async () => {
    soundFx.playSuccess();
    await startClassChallengeApi();
    setChallengeSent(true);
    setTimeout(() => setChallengeSent(false), 5000);
  };

  if (loading || !insights) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-[#0F172A] font-pixel text-xs">
        Loading classroom AI analytics...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3 space-y-4">
      <SpiralBinder
        title="EDUCATOR PORTAL: COHORT ANALYTICS"
        subtitle="Privacy-preserving aggregate learning analytics. Real-time pedagogical recommendations without camera surveillance."
        badge="CLASSROOM 101"
        icon="🎓"
      >
        {/* Teacher Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b-2 border-dashed border-[#94A3B8]">
          <div>
            <div className="flex items-center space-x-2 text-xs font-pixel text-[#0284C7] mb-1">
              <GraduationCap className="w-4 h-4" />
              <span>COHORT INTELLIGENCE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-chunky text-[#0F172A]">
              Classroom 101: Inclusive ASL Cohort
            </h1>
            <p className="text-xs text-[#475569] font-game">
              Aggregate student biomechanics. Raw video streams are processed on-device and never stored.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-[#BBF7D0] text-[#0F172A] border-2 border-[#0F172A] text-[10px] font-pixel shadow-pixel-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>FERPA / COPPA Compliant</span>
            </span>
          </div>
        </div>

        {/* Cohort High-Level Metrics (4 Retro Cards - 2x2 on mobile, 4 across on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
          <div className="p-3 sm:p-4 rounded-2xl bg-[#FEF08A] border-3 border-[#0F172A] shadow-pixel">
            <div className="flex items-center justify-between text-[#475569] text-[9px] sm:text-[10px] font-pixel mb-1">
              <span>ACTIVE</span>
              <div className="w-5 sm:w-6 h-5 sm:h-6 rounded-lg bg-white border border-[#0F172A] flex items-center justify-center">
                <Users className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#0284C7]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-pixel text-[#0F172A]">
              {insights.active_students_count}
            </div>
            <span className="text-[9px] sm:text-[10px] text-[#16A34A] font-pixel mt-1 block font-bold">● LIVE CONNECTED</span>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-[#FEF08A] border-3 border-[#0F172A] shadow-pixel">
            <div className="flex items-center justify-between text-[#475569] text-[9px] sm:text-[10px] font-pixel mb-1">
              <span>MASTERY</span>
              <div className="w-5 sm:w-6 h-5 sm:h-6 rounded-lg bg-white border border-[#0F172A] flex items-center justify-center">
                <TrendingUp className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#7C3AED]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-pixel text-[#0F172A]">
              {insights.average_mastery_pct}%
            </div>
            <span className="text-[9px] sm:text-[10px] text-[#7C3AED] font-pixel mt-1 block font-bold">+8% THIS WEEK</span>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-[#FEF08A] border-3 border-[#0F172A] shadow-pixel">
            <div className="flex items-center justify-between text-[#475569] text-[9px] sm:text-[10px] font-pixel mb-1">
              <span>AVG STREAK</span>
              <div className="w-5 sm:w-6 h-5 sm:h-6 rounded-lg bg-white border border-[#0F172A] flex items-center justify-center">
                <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#D97706]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-pixel text-[#D97706]">
              {insights.average_streak_days} DAYS
            </div>
            <span className="text-[9px] sm:text-[10px] text-[#64748B] font-pixel mt-1 block">91% RETENTION</span>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-[#FEF08A] border-3 border-[#0F172A] shadow-pixel">
            <div className="flex items-center justify-between text-[#475569] text-[9px] sm:text-[10px] font-pixel mb-1">
              <span>FRICTION</span>
              <div className="w-5 sm:w-6 h-5 sm:h-6 rounded-lg bg-white border border-[#0F172A] flex items-center justify-center">
                <AlertTriangle className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-[#DC2626]" />
              </div>
            </div>
            <div className="text-sm sm:text-base font-pixel text-[#DC2626] truncate">
              Palm Invert
            </div>
            <span className="text-[9px] sm:text-[10px] text-[#DC2626] font-pixel mt-1 block font-bold">SIGNS B & D (44%)</span>
          </div>
        </div>

        {/* AI CLASS INSIGHT & CLASS CHALLENGE LAUNCHER */}
        <div className="bg-[#BAE6FD] border-3 border-[#0F172A] rounded-2xl p-3.5 sm:p-5 shadow-pixel mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="max-w-2xl">
              <span className="font-pixel text-[9px] sm:text-[10px] uppercase text-[#0369A1] font-bold flex items-center space-x-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>AI CLASSROOM PEDAGOGICAL SYNTHESIS</span>
              </span>
              <h3 className="text-base sm:text-lg font-chunky text-[#0F172A] mb-1">
                Collective Weakness: Hand Orientation in Sequential Signs
              </h3>
              <p className="text-xs text-[#0F172A] font-game leading-relaxed">
                "{insights.ai_class_insight}"
              </p>
              <div className="mt-2 text-xs font-pixel text-[#16A34A]">
                RECOMMENDED ACTION: <strong className="text-[#0F172A]">{insights.recommended_activity}</strong>
              </div>
            </div>

            <div className="shrink-0 w-full lg:w-auto">
              <button
                onClick={handleStartChallenge}
                className={`w-full lg:w-auto justify-center px-5 py-3 rounded-xl font-pixel text-xs border-3 border-[#0F172A] flex items-center space-x-2 transition-all active:translate-y-1 ${
                  challengeSent
                    ? 'bg-[#4ADE80] text-[#0F172A] shadow-pixel-sm'
                    : 'bg-[#FEF08A] hover:bg-[#FDE047] text-[#0F172A] shadow-pixel'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{challengeSent ? '✓ SENT TO 24 STUDENTS!' : 'START CLASS CHALLENGE 🚀'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Most Difficult Signs & Common Biomechanical Pitfalls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Most Difficult Signs */}
          <div className="bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-4 shadow-pixel">
            <h3 className="text-sm font-chunky text-[#0F172A] mb-0.5">Most Challenging Signs</h3>
            <p className="text-xs text-[#475569] font-game mb-3">Signs with lowest cohort accuracy.</p>

            <div className="space-y-2">
              {insights.most_difficult_signs.map((item: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white border-2 border-[#0F172A] flex items-center justify-between shadow-pixel-sm">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#FEF08A] border border-[#0F172A] flex items-center justify-center font-chunky text-[#0F172A] text-base">
                      {item.sign}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#0F172A] font-game block">Sign '{item.sign}'</span>
                      <span className="text-[10px] text-[#64748B] font-pixel">{item.primary_issue}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-pixel text-[#D97706] block">{item.accuracy}% Acc</span>
                    <span className="text-[9px] text-[#64748B] font-pixel">{item.attempts} reps</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Common Biomechanical Errors */}
          <div className="bg-[#FEF08A] border-3 border-[#0F172A] rounded-2xl p-4 shadow-pixel">
            <h3 className="text-sm font-chunky text-[#0F172A] mb-0.5">Common Kinematic Errors</h3>
            <p className="text-xs text-[#475569] font-game mb-3">Frequency of anatomical misalignments detected.</p>

            <div className="space-y-2.5">
              {insights.common_mistake_breakdown.map((err: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white border-2 border-[#0F172A] shadow-pixel-sm">
                  <div className="flex justify-between items-baseline text-xs mb-1 font-game">
                    <span className="text-[#0F172A] font-bold">{err.issue}</span>
                    <span className="font-pixel text-[10px] text-[#DC2626] font-bold">{err.frequency}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-[#0F172A]">
                    <div
                      className="bg-[#EF4444] h-full rounded-full"
                      style={{ width: `${err.frequency}%` }}
                    />
                  </div>
                  <div className="flex justify-between font-pixel text-[9px] text-[#64748B] mt-1">
                    <span>Impact: {err.impact}</span>
                    <span>Targeted next</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SpiralBinder>
    </div>
  );
};

