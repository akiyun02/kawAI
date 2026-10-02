import React, { useState, useEffect, useCallback } from 'react';
import { GameMode, StudentProfile, AccessibilitySettings, Quest } from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './views/LandingPage';
import { StudentDashboardView } from './views/StudentDashboardView';
import { LearnView } from './views/LearnView';
import { PracticeView } from './views/PracticeView';
import { SpeedRunView } from './views/SpeedRunView';
import { WordBuilderView } from './views/WordBuilderView';
import { SignDetectiveView } from './views/SignDetectiveView';
import { BossBattleView } from './views/BossBattleView';
import { SkillTreeView } from './views/SkillTreeView';
import { TeacherDashboardView } from './views/TeacherDashboardView';
import { DeveloperBenchmarkView } from './views/DeveloperBenchmarkView';
import { RecognitionLabView } from './views/RecognitionLabView';
import { ResponsibleAiModal } from './components/ResponsibleAiModal';
import { fetchStudentProfile, fetchQuests } from './services/api';

export const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<GameMode>('landing');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [demoMode, setDemoMode] = useState<boolean>(false); // Default to live webcam feed for KawAI
  const [practiceOverrideSigns, setPracticeOverrideSigns] = useState<string[] | undefined>(undefined);
  const [learnInitialSign, setLearnInitialSign] = useState<string>('B');
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);

  // Accessibility State
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    soundEnabled: true,
    reducedMotion: false
  });

  const loadData = useCallback(() => {
    fetchStudentProfile('student-alex').then(setProfile);
    fetchQuests().then(setQuests);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply accessibility classes to HTML document root
  useEffect(() => {
    const root = document.documentElement;
    if (accessibility.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (accessibility.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
  }, [accessibility]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle demo mode with Alt + D
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        setDemoMode(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (mode: GameMode, signId?: string, overrideSigns?: string[]) => {
    if (signId) {
      setLearnInitialSign(signId);
    }
    if (overrideSigns) {
      setPracticeOverrideSigns(overrideSigns);
    } else if (mode !== 'practice') {
      setPracticeOverrideSigns(undefined);
    }
    setCurrentMode(mode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateAccessibility = (settings: Partial<AccessibilitySettings>) => {
    setAccessibility(prev => ({ ...prev, ...settings }));
  };

  return (
    <div className={`min-h-screen flex flex-col game-diamond-bg text-[#0F172A] ${
      accessibility.highContrast ? 'high-contrast' : ''
    } ${accessibility.largeText ? 'large-text' : ''}`}>
      
      {/* Top Navigation */}
      <Navbar
        currentMode={currentMode}
        onNavigate={(mode) => handleNavigate(mode)}
        profile={profile}
        accessibility={accessibility}
        onUpdateAccessibility={updateAccessibility}
        demoMode={demoMode}
        onToggleDemoMode={() => setDemoMode(prev => !prev)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentMode === 'landing' && (
          <LandingPage
            onStart={(mode) => handleNavigate(mode)}
            onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
          />
        )}

        {currentMode === 'dashboard' && (
          <StudentDashboardView
            profile={profile}
            quests={quests}
            onNavigateToMode={(mode, signId, override) => handleNavigate(mode, signId, override)}
          />
        )}

        {currentMode === 'learn' && (
          <LearnView
            initialSignId={learnInitialSign}
            profile={profile}
            onRefreshProfile={loadData}
            demoMode={demoMode}
            onToggleDemoMode={() => setDemoMode(prev => !prev)}
          />
        )}

        {currentMode === 'practice' && (
          <PracticeView
            profile={profile}
            onRefreshProfile={loadData}
            demoMode={demoMode}
            onToggleDemoMode={() => setDemoMode(prev => !prev)}
            overrideSigns={practiceOverrideSigns}
          />
        )}

        {currentMode === 'speedrun' && (
          <SpeedRunView
            profile={profile}
            onRefreshProfile={loadData}
            demoMode={demoMode}
            onToggleDemoMode={() => setDemoMode(prev => !prev)}
          />
        )}

        {currentMode === 'wordbuilder' && (
          <WordBuilderView
            profile={profile}
            onRefreshProfile={loadData}
            demoMode={demoMode}
            onToggleDemoMode={() => setDemoMode(prev => !prev)}
          />
        )}

        {currentMode === 'detective' && (
          <SignDetectiveView
            profile={profile}
            onRefreshProfile={loadData}
            demoMode={demoMode}
            onToggleDemoMode={() => setDemoMode(prev => !prev)}
          />
        )}

        {currentMode === 'boss' && (
          <BossBattleView
            profile={profile}
            onRefreshProfile={loadData}
            demoMode={demoMode}
            onToggleDemoMode={() => setDemoMode(prev => !prev)}
          />
        )}

        {currentMode === 'skilltree' && (
          <SkillTreeView
            profile={profile}
            onNavigateToMode={(mode, signId) => handleNavigate(mode, signId)}
          />
        )}

        {currentMode === 'teacher' && (
          <TeacherDashboardView />
        )}

        {currentMode === 'benchmark' && (
          <DeveloperBenchmarkView onBack={() => setCurrentMode('learn')} />
        )}

        {currentMode === 'recognitionlab' && (
          <RecognitionLabView onBack={() => setCurrentMode('benchmark')} />
        )}
      </main>

      {/* Floating Demo Mode & Ethics Helper Bar */}
      <footer className="bg-slate-950/80 border-t border-slate-900 py-3 px-4 text-[11px] text-slate-500 font-mono flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <span className="font-pixel text-[10px] text-sky-400">KawAI © 2026 • EMPOWERED BY AI</span>
          <span>•</span>
          <button
            onClick={() => setIsPrivacyModalOpen(true)}
            className="text-slate-400 hover:text-white underline cursor-pointer"
          >
            AI & Privacy Charter
          </button>
          <span>•</span>
          <button
            onClick={() => setCurrentMode('benchmark')}
            className="text-[#38BDF8] hover:text-[#BAE6FD] underline font-bold cursor-pointer"
          >
            📊 Dev Model Metrics &amp; Confusion Matrix
          </button>
          <span>•</span>
          <button
            onClick={() => setCurrentMode('recognitionlab')}
            className="text-amber-400 hover:text-amber-200 underline font-bold cursor-pointer"
          >
            🔬 Recognition Lab
          </button>
          <span>•</span>
          <span>Camera frames never stored</span>
        </div>

        <div className="flex items-center space-x-2">
          <span>Mode:</span>
          <span className={`px-2 py-0.5 rounded font-bold ${
            demoMode ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
          }`}>
            {demoMode ? 'SIMULATED DEMO' : 'LIVE WEBCAM'}
          </span>
          <span className="text-slate-600 hidden sm:inline">(Alt + D to toggle)</span>
        </div>
      </footer>

      {/* Privacy Charter Modal */}
      <ResponsibleAiModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
};

export default App;
