import React from 'react';
import { GameMode, StudentProfile } from '../types';
import { SpiralBinder } from '../components/SpiralBinder';
import { Lock, CheckCircle2, Sparkles, Star, ChevronRight, BookOpen } from 'lucide-react';

interface SkillNode {
  id: string;
  title: string;
  category: string;
  status: 'mastered' | 'in_progress' | 'locked';
  masteryPct: number;
  xpRequired: number;
  description: string;
  targetMode: GameMode;
  targetSignId?: string;
  connections: string[]; // ids connected to
}

interface SkillTreeViewProps {
  profile: StudentProfile | null;
  onNavigateToMode: (mode: GameMode, signId?: string) => void;
}

export const SkillTreeView: React.FC<SkillTreeViewProps> = ({ profile, onNavigateToMode }) => {
  const currentXp = profile?.xp || 1850;

  const nodes: SkillNode[] = [
    {
      id: 'root',
      title: 'FOUNDATIONS',
      category: 'Orientation & Posture',
      status: 'mastered',
      masteryPct: 100,
      xpRequired: 0,
      description: 'Master hand centering, palm planes, and wrist alignment.',
      targetMode: 'learn',
      targetSignId: 'A',
      connections: ['alphabet', 'numbers']
    },
    {
      id: 'alphabet',
      title: 'ALPHABET (A-Z)',
      category: 'Fingerspelling',
      status: 'in_progress',
      masteryPct: profile?.alphabet_mastery || 82,
      xpRequired: 300,
      description: 'Letters A through Y. Finger curl, isolation, and thumb position.',
      targetMode: 'learn',
      targetSignId: 'B',
      connections: ['words']
    },
    {
      id: 'numbers',
      title: 'NUMBERS (1-5)',
      category: 'Counting & Digits',
      status: 'in_progress',
      masteryPct: profile?.numbers_mastery || 61,
      xpRequired: 500,
      description: 'ASL counting system, thumb inclusion, and distinct digit posture.',
      targetMode: 'learn',
      targetSignId: '1',
      connections: ['phrases']
    },
    {
      id: 'words',
      title: 'EVERYDAY WORDS',
      category: 'Vocabulary',
      status: 'in_progress',
      masteryPct: profile?.common_signs_mastery || 91,
      xpRequired: 1000,
      description: 'Hello, Thank You, Please, Yes, No, Sorry, Love, Peace.',
      targetMode: 'wordbuilder',
      connections: ['conversation']
    },
    {
      id: 'phrases',
      title: 'PHRASES & SPEED',
      category: 'Sequential Fluency',
      status: currentXp >= 1500 ? 'in_progress' : 'locked',
      masteryPct: currentXp >= 1500 ? 55 : 0,
      xpRequired: 1500,
      description: 'Chaining multiple signs under timed conditions without pauses.',
      targetMode: 'speedrun',
      connections: ['conversation']
    },
    {
      id: 'conversation',
      title: 'CONVERSATIONAL REALM',
      category: 'Master Dialogue',
      status: currentXp >= 2500 ? 'in_progress' : 'locked',
      masteryPct: currentXp >= 2500 ? 20 : 0,
      xpRequired: 2500,
      description: 'Interactive narrative dialogues and Guardian Boss Battles.',
      targetMode: 'boss',
      connections: []
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-3">
      <SpiralBinder
        title="SKILL CODEX: MASTERY MATRIX"
        subtitle="RPG advancement tree. Unlock new modules, fingerspelling fluency, and capstones!"
        badge={`LVL ${profile?.level || 12}`}
        icon="🗺️"
      >
        {/* Top Header Row */}
        <div className="text-center max-w-xl mx-auto mb-6 pb-4 border-b-2 border-dashed border-[#94A3B8]">
          <span className="text-[10px] font-pixel px-3 py-1 rounded bg-[#C084FC] text-[#0F172A] border-2 border-[#0F172A] font-bold shadow-pixel-sm">
            RPG SKILL TREE
          </span>
          <h2 className="text-xl sm:text-2xl font-chunky text-[#0F172A] mt-2 mb-1">
            Sign Language Mastery Matrix
          </h2>
          <p className="text-xs text-[#475569] font-game">
            Progress from foundational biomechanics through fingerspelling to conversational boss raids.
          </p>
        </div>

        {/* Visual Tree Layout */}
        <div className="max-w-3xl mx-auto relative px-2">
          {/* Tier 1: Foundations */}
          <div className="flex justify-center mb-6">
            <SkillNodeCard node={nodes[0]} onOpen={onNavigateToMode} />
          </div>

          {/* Tree Connector */}
          <div className="w-1 h-6 bg-[#0F172A] mx-auto rounded" />

          {/* Tier 2: Alphabet & Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            <SkillNodeCard node={nodes[1]} onOpen={onNavigateToMode} />
            <SkillNodeCard node={nodes[2]} onOpen={onNavigateToMode} />
          </div>

          {/* Tree Connector */}
          <div className="w-1 h-6 bg-[#0F172A] mx-auto rounded" />

          {/* Tier 3: Words & Phrases */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            <SkillNodeCard node={nodes[3]} onOpen={onNavigateToMode} />
            <SkillNodeCard node={nodes[4]} onOpen={onNavigateToMode} />
          </div>

          {/* Tree Connector */}
          <div className="w-1 h-6 bg-[#0F172A] mx-auto rounded" />

          {/* Tier 4: Conversational Capstone */}
          <div className="flex justify-center mt-6">
            <SkillNodeCard node={nodes[5]} onOpen={onNavigateToMode} />
          </div>
        </div>
      </SpiralBinder>
    </div>
  );
};

interface NodeCardProps {
  node: SkillNode;
  onOpen: (mode: GameMode, signId?: string) => void;
}

const SkillNodeCard: React.FC<NodeCardProps> = ({ node, onOpen }) => {
  const isLocked = node.status === 'locked';
  const isMastered = node.status === 'mastered';

  return (
    <div
      onClick={() => {
        if (!isLocked) {
          onOpen(node.targetMode, node.targetSignId);
        }
      }}
      className={`w-full max-w-sm p-4 rounded-2xl border-3 border-[#0F172A] transition-all duration-200 relative group ${
        isLocked
          ? 'bg-slate-200 opacity-60 cursor-not-allowed shadow-none'
          : isMastered
          ? 'bg-[#BBF7D0] hover:bg-[#86EFAC] cursor-pointer shadow-pixel hover:-translate-y-0.5'
          : 'bg-[#FEF08A] hover:bg-[#FDE047] cursor-pointer shadow-pixel hover:-translate-y-0.5'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="font-pixel text-[9px] uppercase tracking-wider text-[#64748B] block mb-0.5">
            {node.category}
          </span>
          <h4 className="text-base font-chunky text-[#0F172A]">{node.title}</h4>
        </div>

        <div className="flex items-center space-x-1.5">
          {isMastered && (
            <span className="px-2 py-0.5 rounded-lg bg-white text-[#16A34A] border-2 border-[#0F172A] font-pixel text-[9px] font-bold flex items-center space-x-1 shadow-pixel-sm">
              <CheckCircle2 className="w-3 h-3 text-[#16A34A]" />
              <span>DONE</span>
            </span>
          )}
          {node.status === 'in_progress' && (
            <span className="px-2 py-0.5 rounded-lg bg-white text-[#0F172A] border-2 border-[#0F172A] font-pixel text-[9px] font-bold shadow-pixel-sm">
              ACTIVE
            </span>
          )}
          {isLocked && (
            <span className="px-2 py-0.5 rounded-lg bg-slate-300 text-[#475569] font-pixel text-[9px] font-bold flex items-center space-x-1 border border-[#0F172A]">
              <Lock className="w-2.5 h-2.5" />
              <span>{node.xpRequired} XP</span>
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-[#0F172A] font-game my-2.5 leading-snug">{node.description}</p>

      {/* Mastery Progress Bar */}
      <div>
        <div className="flex justify-between font-pixel text-[9px] text-[#475569] mb-1">
          <span>Mastery</span>
          <span className={isMastered ? 'text-[#16A34A] font-bold' : 'text-[#0F172A]'}>
            {node.masteryPct}%
          </span>
        </div>
        <div className="w-full bg-white h-2.5 rounded-full overflow-hidden border-2 border-[#0F172A]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isMastered
                ? 'bg-[#16A34A]'
                : 'bg-[#38BDF8]'
            }`}
            style={{ width: `${node.masteryPct}%` }}
          />
        </div>
      </div>

      {!isLocked && (
        <div className="mt-3 pt-2.5 border-t-2 border-[#0F172A] flex items-center justify-between font-pixel text-[9px] text-[#0F172A] group-hover:text-[#0284C7]">
          <span>TRAIN THIS SKILL</span>
          <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </div>
  );
};

