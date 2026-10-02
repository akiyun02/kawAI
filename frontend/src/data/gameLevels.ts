export interface GameLevel {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  description: string;
  signs: string[];
  color: string;
  bannerColor: string;
  borderColor: string;
  requiredXp: number;
}

export type AssistStage = 'graphic' | 'hint' | 'none';

export const GAME_LEVELS: GameLevel[] = [
  {
    id: 1,
    title: 'LEVEL 1: THE VOWELS',
    subtitle: 'A, E, I, O, U',
    badge: '⭐ NOVICE',
    description: 'Master the 5 essential vowels that form the bedrock of all ASL fingerspelling!',
    signs: ['A', 'E', 'I', 'O', 'U'],
    color: 'bg-[#BAE6FD]',
    bannerColor: 'bg-[#0284C7]',
    borderColor: 'border-[#0284C7]',
    requiredXp: 0
  },
  {
    id: 2,
    title: 'LEVEL 2: OPEN & FLAT SIGNS',
    subtitle: 'B, C, D, F, L',
    badge: '🌿 APPRENTICE',
    description: 'Learn foundational open hand contours, right-angle fingers, and loops.',
    signs: ['B', 'C', 'D', 'F', 'L'],
    color: 'bg-[#BBF7D0]',
    bannerColor: 'bg-[#16A34A]',
    borderColor: 'border-[#16A34A]',
    requiredXp: 400
  },
  {
    id: 3,
    title: 'LEVEL 3: THE FIST VARIANTS',
    subtitle: 'S, T, N, M',
    badge: '✊ WARRIOR',
    description: 'Subtle thumb positioning: tucked across fingers, under 1, 2, or 3 knuckles.',
    signs: ['S', 'T', 'N', 'M'],
    color: 'bg-[#FEF08A]',
    bannerColor: 'bg-[#CA8A04]',
    borderColor: 'border-[#CA8A04]',
    requiredXp: 900
  },
  {
    id: 4,
    title: 'LEVEL 4: TWIN EXTENSIONS',
    subtitle: 'H, K, R, V, W',
    badge: '✌️ SCHOLAR',
    description: 'Multi-finger upward and horizontal formations: parallel, crossed, and spread.',
    signs: ['H', 'K', 'R', 'V', 'W'],
    color: 'bg-[#DDD6FE]',
    bannerColor: 'bg-[#7C3AED]',
    borderColor: 'border-[#7C3AED]',
    requiredXp: 1500
  },
  {
    id: 5,
    title: 'LEVEL 5: PINKY & DYNAMIC SIGNS',
    subtitle: 'G, P, Q, Y, J, Z',
    badge: '⚡ ACE SIGNER',
    description: 'Sideways orientations, outward pinkies, and dynamic motion trajectories in air.',
    signs: ['G', 'P', 'Q', 'Y', 'J', 'Z'],
    color: 'bg-[#FED7AA]',
    bannerColor: 'bg-[#EA580C]',
    borderColor: 'border-[#EA580C]',
    requiredXp: 2200
  },
  {
    id: 6,
    title: 'LEVEL 6: NUMBERS & GREETINGS',
    subtitle: '1-5 & EXPRESSIONS',
    badge: '👑 GRANDMASTER',
    description: 'Cardinal numbers 1 to 5 and everyday conversation signs: HELLO, LOVE, PEACE.',
    signs: ['1', '2', '3', '4', '5', 'HELLO', 'LOVE', 'PEACE'],
    color: 'bg-[#FECDD3]',
    bannerColor: 'bg-[#E11D48]',
    borderColor: 'border-[#E11D48]',
    requiredXp: 3000
  }
];

export const ASSIST_STAGES: {
  id: AssistStage;
  label: string;
  icon: string;
  tagline: string;
  badge: string;
}[] = [
  {
    id: 'graphic',
    label: '1. GRAPHIC ASSIST',
    icon: '🖼️',
    tagline: 'Visual Blueprint: Copy the hand diagram shown on screen',
    badge: 'VISUAL AID'
  },
  {
    id: 'hint',
    label: '2. HINT ASSIST',
    icon: '💡',
    tagline: 'Prompted Recall: Diagram hidden. Follow verbal & anatomical cues',
    badge: 'HINTS ONLY'
  },
  {
    id: 'none',
    label: '3. NO ASSIST',
    icon: '🧠',
    tagline: 'Pure Muscle Memory: No diagram, no hints. Sign strictly from memory!',
    badge: 'MASTER CHALLENGE'
  }
];
