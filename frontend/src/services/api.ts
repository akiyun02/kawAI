import { StudentProfile, Quest } from '../types';

const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE = (import.meta as any).env?.VITE_API_URL || (isLocalhost ? 'http://127.0.0.1:8000' : '');

export async function fetchStudentProfile(studentId: string = 'student-alex'): Promise<StudentProfile> {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/student/${studentId}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Backend unavailable, using client state fallback', err);
    }
  }

  // Graceful client fallback
  return {
    id: studentId,
    name: 'Alex Rivers',
    avatar: 'student',
    level: 4,
    xp: 1850,
    xp_to_next: 150,
    streak: 5,
    alphabet_mastery: 82,
    numbers_mastery: 61,
    common_signs_mastery: 91,
    orientation_accuracy: 53,
    shape_accuracy: 88,
    total_attempts: 42,
    accuracy_rate: 76,
    weaknesses: ['Palm Orientation Angle'],
    ai_recommendation: {
      title: 'Palm Orientation Calibration Drill',
      focus: 'Hand Orientation (53%)',
      message: 'Your hand shapes are generally accurate, but you frequently rotate your palm inward toward yourself rather than directly facing the camera. Practice orientation-focused signs for 3 minutes to lock in proper spatial projection.',
      target_signs: ['B', 'D', 'HELLO', 'THANK YOU'],
      estimated_time: '3 mins',
      xp_bonus: 150
    }
  };
}

export async function recordAttemptApi(attempt: {
  student_id: string;
  sign_id: string;
  mode: string;
  is_correct: boolean;
  confidence: number;
  shape_score: number;
  orientation_score: number;
  position_score: number;
  latency_ms: number;
  feedback: string;
}) {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to record attempt to backend:', err);
    }
  }
  return { status: 'recorded_locally', xp_gained: attempt.is_correct ? 100 : 0 };
}

export async function fetchTeacherInsights() {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/teacher/insights`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Teacher API fallback:', err);
    }
  }

  return {
    active_students_count: 24,
    average_mastery_pct: 74,
    average_streak_days: 5.2,
    most_difficult_signs: [
      { sign: 'B', accuracy: 52, attempts: 114, primary_issue: 'Orientation Inversion' },
      { sign: 'D', accuracy: 58, attempts: 96, primary_issue: 'Orientation Inversion' },
      { sign: 'NO', accuracy: 64, attempts: 88, primary_issue: 'Pinch Timing' }
    ],
    common_mistake_breakdown: [
      { issue: 'Palm Inward Rotation (facing signer instead of viewer)', frequency: 44, impact: 'High' },
      { issue: 'Thumb placement over fingers (Confusing A vs S/E)', frequency: 28, impact: 'Medium' },
      { issue: 'Wrist drooping below camera frame', frequency: 18, impact: 'Low' },
      { issue: 'Hesitation before sequential sign transitions', frequency: 10, impact: 'Medium' }
    ],
    students_needing_support: [
      { name: 'Elena Rossi', level: 2, struggling_with: 'Hand Orientation (B, D)', status: 'Needs Review' },
      { name: 'Jordan Taylor', level: 3, struggling_with: 'Speed Transitions', status: 'Improving' }
    ],
    ai_class_insight: 'Most students have mastered individual static hand shapes, but 44% exhibit palm orientation inversions when moving between sequential signs (particularly B, D, and HELLO). Their palms tend to face inward toward themselves rather than outward to the interlocutor.',
    recommended_activity: '3D Palm Orientation Synchronous Drill',
    challenge_ready: true
  };
}

export async function startClassChallengeApi() {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/teacher/start-challenge`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn(err);
    }
  }
  return {
    status: 'challenge_broadcasted',
    title: '3D Palm Orientation Synchronous Drill',
    description: 'Sent to all 24 connected students in Classroom A-1',
    target_signs: ['B', 'D', 'HELLO', 'THANK YOU'],
    reward_xp: 200
  };
}

export async function fetchQuests(): Promise<Quest[]> {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/quests`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn(err);
    }
  }
  return [
    {
      id: 'quest-1',
      title: 'Master Everyday Greetings',
      description: 'Successfully perform HELLO and THANK YOU with >= 85% orientation accuracy.',
      progress: 70,
      target: 100,
      reward_xp: 250,
      category: 'Everyday Signs',
      completed: false
    },
    {
      id: 'quest-2',
      title: 'Clean Palm Calibration',
      description: 'Perform signs B and D with palm facing straight ahead for 3 consecutive reps.',
      progress: 33,
      target: 100,
      reward_xp: 300,
      category: 'Biomechanical Focus',
      completed: false
    },
    {
      id: 'quest-3',
      title: 'Speed Runner',
      description: 'Achieve a 5x combo multiplier in Speed Run mode.',
      progress: 80,
      target: 100,
      reward_xp: 400,
      category: 'Speed Run',
      completed: false
    }
  ];
}
