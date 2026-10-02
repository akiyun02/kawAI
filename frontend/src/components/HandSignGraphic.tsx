import React from 'react';
import { SignDefinition } from '../types';

interface HandSignGraphicProps {
  sign: SignDefinition;
  size?: 'sm' | 'md' | 'lg';
  highlightFingers?: boolean;
}

export const HandSignGraphic: React.FC<HandSignGraphicProps> = ({
  sign,
  size = 'md',
  highlightFingers = true
}) => {
  const signId = sign.id.toUpperCase();

  const sizeClasses = {
    sm: 'w-24 h-24 text-xs',
    md: 'w-36 h-36 sm:w-44 sm:h-44 text-sm',
    lg: 'w-48 h-48 sm:w-56 sm:h-56 text-base'
  }[size];

  // Render stylized SVG hand shape blueprints according to sign geometry
  const renderHandSvg = () => {
    switch (signId) {
      // ── LEVEL 1: VOWELS ───────────────────────────────────────────────────
      case 'A':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Palm base */}
            <rect x="30" y="45" width="40" height="35" rx="10" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            {/* Curled 4 fingers */}
            <rect x="32" y="32" width="8" height="22" rx="4" fill="#FEF08A" stroke="#0F172A" strokeWidth="2.5" />
            <rect x="42" y="30" width="8" height="24" rx="4" fill="#FEF08A" stroke="#0F172A" strokeWidth="2.5" />
            <rect x="52" y="32" width="8" height="22" rx="4" fill="#FEF08A" stroke="#0F172A" strokeWidth="2.5" />
            <rect x="61" y="35" width="7" height="19" rx="3.5" fill="#FEF08A" stroke="#0F172A" strokeWidth="2.5" />
            {/* Thumb resting upright alongside radial edge */}
            <path d="M 28 70 C 18 60, 20 40, 26 35 C 30 35, 33 42, 32 55 Z" fill="#F59E0B" stroke="#0F172A" strokeWidth="3" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">THUMB UPRIGHT AT SIDE</text>
          </svg>
        );

      case 'E':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Palm base */}
            <rect x="30" y="45" width="40" height="35" rx="10" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            {/* Curled fingertips resting tight on thumb */}
            <rect x="33" y="38" width="8" height="16" rx="4" fill="#FEF08A" stroke="#0F172A" strokeWidth="2.5" />
            <rect x="43" y="36" width="8" height="18" rx="4" fill="#FEF08A" stroke="#0F172A" strokeWidth="2.5" />
            <rect x="53" y="38" width="8" height="16" rx="4" fill="#FEF08A" stroke="#0F172A" strokeWidth="2.5" />
            <rect x="62" y="40" width="7" height="14" rx="3.5" fill="#FEF08A" stroke="#0F172A" strokeWidth="2.5" />
            {/* Thumb tucked under fingertips */}
            <path d="M 26 68 C 30 58, 48 56, 64 56 C 66 60, 62 66, 45 68 Z" fill="#F59E0B" stroke="#0F172A" strokeWidth="3" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">TIGHT CLAW ON THUMB</text>
          </svg>
        );

      case 'I':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Palm base */}
            <rect x="30" y="45" width="40" height="35" rx="10" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            {/* Curled Index, Middle, Ring */}
            <rect x="32" y="38" width="9" height="16" rx="4.5" fill="#CBD5E1" stroke="#0F172A" strokeWidth="2.5" />
            <rect x="43" y="38" width="9" height="16" rx="4.5" fill="#CBD5E1" stroke="#0F172A" strokeWidth="2.5" />
            <rect x="54" y="40" width="9" height="14" rx="4.5" fill="#CBD5E1" stroke="#0F172A" strokeWidth="2.5" />
            {/* Pinky extended straight up */}
            <rect x="65" y="14" width="8" height="42" rx="4" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" />
            {/* Thumb crossed over */}
            <path d="M 26 65 C 32 52, 45 52, 54 54 C 54 58, 48 64, 34 66 Z" fill="#F59E0B" stroke="#0F172A" strokeWidth="2.5" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">PINKY TALL ↑</text>
          </svg>
        );

      case 'O':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Circular O shape with open hole in center */}
            <path
              d="M 35 25 C 65 15, 80 40, 75 60 C 70 75, 45 78, 30 65 C 20 50, 22 30, 35 25 Z"
              fill="#FDE047"
              stroke="#0F172A"
              strokeWidth="3.5"
            />
            {/* Inner oval hole */}
            <ellipse cx="48" cy="46" rx="14" ry="12" fill="#0F172A" />
            {/* Contact junction between fingertips and thumb */}
            <circle cx="36" cy="60" r="4.5" fill="#10B981" stroke="#0F172A" strokeWidth="2" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">ALL TIPS TOUCH THUMB</text>
          </svg>
        );

      case 'U':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Palm base */}
            <rect x="30" y="48" width="40" height="32" rx="10" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            {/* Index and Middle extended UPWARD TOGETHER */}
            <rect x="38" y="12" width="11" height="42" rx="5" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" />
            <rect x="50" y="12" width="11" height="42" rx="5" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" />
            {/* Ring and Pinky curled */}
            <rect x="62" y="46" width="8" height="12" rx="4" fill="#CBD5E1" stroke="#0F172A" strokeWidth="2.5" />
            {/* Thumb tucked over ring */}
            <path d="M 28 65 C 36 56, 52 56, 58 58 Z" fill="#F59E0B" stroke="#0F172A" strokeWidth="2.5" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">2 FINGERS UP TOGETHER</text>
          </svg>
        );

      // ── LEVEL 2: OPEN & FLAT SIGNS ────────────────────────────────────────
      case 'F':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Palm base */}
            <rect x="30" y="48" width="40" height="32" rx="10" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            {/* Middle, Ring, Pinky standing upright flared */}
            <rect x="42" y="12" width="8.5" height="42" rx="4" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" />
            <rect x="53" y="14" width="8.5" height="40" rx="4" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" />
            <rect x="64" y="20" width="8" height="34" rx="4" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" />
            {/* Thumb & Index meeting in circle/ring */}
            <path d="M 22 62 C 18 45, 34 38, 40 48 C 38 58, 28 66, 22 62 Z" fill="#10B981" stroke="#0F172A" strokeWidth="3" />
            <circle cx="32" cy="50" r="5" fill="#0F172A" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">INDEX-THUMB RING + 3 UP</text>
          </svg>
        );

      case 'B':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Palm base */}
            <rect x="28" y="46" width="44" height="34" rx="10" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            {/* 4 Fingers straight up pressed together */}
            <rect x="30" y="12" width="9.5" height="42" rx="4.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="2.5" />
            <rect x="41" y="10" width="9.5" height="44" rx="4.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="2.5" />
            <rect x="52" y="12" width="9.5" height="42" rx="4.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="2.5" />
            <rect x="63" y="16" width="9" height="38" rx="4.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="2.5" />
            {/* Thumb folded across palm */}
            <path d="M 24 66 C 35 56, 52 56, 60 58 C 60 63, 50 68, 30 70 Z" fill="#F59E0B" stroke="#0F172A" strokeWidth="3" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">FLAT 4 UP + THUMB ACROSS</text>
          </svg>
        );

      case 'C':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Open C arch */}
            <path
              d="M 68 28 C 30 20, 20 70, 68 74 C 72 70, 72 64, 60 62 C 32 58, 34 36, 60 38 Z"
              fill="#FDE047"
              stroke="#0F172A"
              strokeWidth="3.5"
            />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">OPEN CUP ARCH</text>
          </svg>
        );

      case 'D':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Palm base */}
            <rect x="30" y="48" width="40" height="32" rx="10" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            {/* Index extended straight up */}
            <rect x="34" y="10" width="11" height="44" rx="5.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" />
            {/* Middle, ring, pinky curled touching thumb */}
            <path d="M 46 45 C 65 42, 65 65, 48 68 C 38 68, 32 58, 46 45 Z" fill="#FEF08A" stroke="#0F172A" strokeWidth="2.5" />
            <circle cx="54" cy="56" r="4.5" fill="#0F172A" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">INDEX UP + CIRCLE BEHIND</text>
          </svg>
        );

      case 'L':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Palm base */}
            <rect x="36" y="45" width="34" height="35" rx="8" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            {/* Index finger pointing straight UP */}
            <rect x="38" y="10" width="11" height="44" rx="5.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" />
            {/* Thumb sticking OUT at 90 degrees */}
            <rect x="10" y="55" width="32" height="11" rx="5.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" />
            {/* Middle, Ring, Pinky curled into palm */}
            <rect x="52" y="44" width="8" height="14" rx="4" fill="#CBD5E1" stroke="#0F172A" strokeWidth="2.5" />
            <rect x="61" y="46" width="7" height="12" rx="3.5" fill="#CBD5E1" stroke="#0F172A" strokeWidth="2.5" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">90° RIGHT ANGLE 'L'</text>
          </svg>
        );

      // ── LEVEL 3: FIST VARIANTS ────────────────────────────────────────────
      case 'S':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Fist */}
            <rect x="28" y="35" width="44" height="42" rx="12" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            <line x1="39" y1="36" x2="39" y2="52" stroke="#0F172A" strokeWidth="2" />
            <line x1="50" y1="36" x2="50" y2="52" stroke="#0F172A" strokeWidth="2" />
            <line x1="61" y1="36" x2="61" y2="52" stroke="#0F172A" strokeWidth="2" />
            {/* Thumb folded ACROSS ALL FINGERS in front */}
            <path d="M 22 62 C 30 46, 68 46, 72 58 C 65 65, 30 68, 22 62 Z" fill="#F59E0B" stroke="#0F172A" strokeWidth="3" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">THUMB ACROSS FRONT</text>
          </svg>
        );

      case 'T':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Fist */}
            <rect x="28" y="35" width="44" height="42" rx="12" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            {/* Thumb poking between Index and Middle */}
            <ellipse cx="44" cy="42" rx="7" ry="9" fill="#10B981" stroke="#0F172A" strokeWidth="3" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">THUMB UNDER 1 FINGER</text>
          </svg>
        );

      case 'N':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Fist */}
            <rect x="28" y="35" width="44" height="42" rx="12" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            {/* Thumb under 2 fingers */}
            <ellipse cx="54" cy="44" rx="7" ry="9" fill="#10B981" stroke="#0F172A" strokeWidth="3" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">THUMB UNDER 2 FINGERS</text>
          </svg>
        );

      case 'M':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Fist */}
            <rect x="28" y="35" width="44" height="42" rx="12" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            {/* Thumb under 3 fingers */}
            <ellipse cx="64" cy="46" rx="6.5" ry="8.5" fill="#10B981" stroke="#0F172A" strokeWidth="3" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">THUMB UNDER 3 FINGERS</text>
          </svg>
        );

      // ── LEVEL 4: TWIN EXTENSIONS ──────────────────────────────────────────
      case 'H':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Palm rotated sideways */}
            <rect x="20" y="38" width="30" height="38" rx="8" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            {/* Index & Middle pointing HORIZONTALLY */}
            <rect x="42" y="40" width="46" height="10" rx="5" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" />
            <rect x="42" y="52" width="46" height="10" rx="5" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">2 FINGERS SIDEWAYS →</text>
          </svg>
        );

      case 'V':
      case 'PEACE':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Palm base */}
            <rect x="30" y="50" width="40" height="32" rx="10" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            {/* Index and Middle spread in V */}
            <rect x="32" y="14" width="10" height="42" rx="5" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" transform="rotate(-15 37 40)" />
            <rect x="58" y="14" width="10" height="42" rx="5" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" transform="rotate(15 63 40)" />
            {/* Ring and Pinky curled */}
            <rect x="52" y="52" width="8" height="12" rx="4" fill="#CBD5E1" stroke="#0F172A" strokeWidth="2.5" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">PEACE / 'V' SPREAD</text>
          </svg>
        );

      case 'W':
      case '3':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Palm base */}
            <rect x="28" y="50" width="44" height="32" rx="10" fill="#FDE047" stroke="#0F172A" strokeWidth="3" />
            {/* Index, Middle, Ring spread */}
            <rect x="30" y="14" width="9" height="42" rx="4.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" transform="rotate(-14 34 40)" />
            <rect x="45" y="12" width="9.5" height="44" rx="4.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" />
            <rect x="60" y="14" width="9" height="42" rx="4.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="3" transform="rotate(14 65 40)" />
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">3 FINGERS FAN SPREAD</text>
          </svg>
        );

      // Default generic hand blueprint
      default:
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <rect x="28" y="44" width="44" height="38" rx="10" fill="#FEF08A" stroke="#0F172A" strokeWidth="3" />
            <circle cx="50" cy="50" r="14" fill="#38BDF8" stroke="#0F172A" strokeWidth="2" />
            <text x="50" y="54" textAnchor="middle" className="font-pixel text-xs fill-white font-bold">{signId}</text>
            <text x="50" y="94" textAnchor="middle" className="font-pixel text-[8px] fill-[#0F172A] font-bold">TARGET: {sign.name}</text>
          </svg>
        );
    }
  };

  return (
    <div className={`relative ${sizeClasses} flex flex-col items-center justify-center bg-white border-2 sm:border-3 border-[#0F172A] rounded-2xl p-2 shadow-pixel`}>
      {renderHandSvg()}
    </div>
  );
};
