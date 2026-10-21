import React from 'react';
import { Card as CardType, CardColor, isWildCard } from '../types';

interface CardProps {
  card?: CardType;
  isBack?: boolean;
  isPlayable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'adaptive';
  rotation?: number;
}

// Authentic GamePigeon Crazy 8 Color Palette
export const CRAZY8_COLORS: Record<CardColor, { bg: string; text: string; ring: string; border: string; glow: string; darkBg: string }> = {
  red: {
    bg: '#d32f2f',
    text: '#ffffff',
    ring: 'ring-red-400',
    border: 'border-red-400',
    glow: 'shadow-red-500/50 hover:shadow-red-500/80',
    darkBg: '#7f1d1d',
  },
  blue: {
    bg: '#1976d2',
    text: '#ffffff',
    ring: 'ring-blue-400',
    border: 'border-blue-400',
    glow: 'shadow-blue-500/50 hover:shadow-blue-500/80',
    darkBg: '#1e3a8a',
  },
  green: {
    bg: '#388e3c',
    text: '#ffffff',
    ring: 'ring-emerald-400',
    border: 'border-emerald-400',
    glow: 'shadow-emerald-500/50 hover:shadow-emerald-500/80',
    darkBg: '#14532d',
  },
  yellow: {
    bg: '#fbc02d',
    text: '#1a1a1a',
    ring: 'ring-yellow-300',
    border: 'border-yellow-300',
    glow: 'shadow-amber-400/50 hover:shadow-amber-400/80',
    darkBg: '#78350f',
  },
  wild: {
    bg: 'linear-gradient(135deg, #ef4444 0%, #f97316 20%, #facc15 38%, #22c55e 58%, #06b6d4 75%, #3b82f6 88%, #a855f7 100%)',
    text: '#ffffff',
    ring: 'ring-purple-400',
    border: 'border-purple-400',
    glow: 'shadow-purple-500/60 hover:shadow-purple-500/90',
    darkBg: '#581c87',
  },
};

export const CardComponent: React.FC<CardProps> = ({
  card,
  isBack = false,
  isPlayable = false,
  isSelected = false,
  onClick,
  className = '',
  size = 'md',
  rotation = 0,
}) => {
  // Bulletproof responsive sizing with true 2:3 card aspect ratio using explicit pixel classes
  const sizeClasses = {
    xs: 'w-[48px] h-[72px] sm:w-[56px] sm:h-[84px]',
    sm: 'w-[56px] h-[84px] sm:w-[68px] sm:h-[102px]',
    md: 'w-[68px] h-[102px] sm:w-[84px] sm:h-[126px]',
    lg: 'w-[88px] h-[132px] sm:w-[104px] sm:h-[156px]',
    adaptive: 'w-[64px] h-[96px] sm:w-[76px] sm:h-[114px] md:w-[86px] md:h-[129px]',
  }[size];

  // 1. CRAZY 8 CARD BACK (GamePigeon Draw Pile)
  if (isBack || !card) {
    return (
      <div
        id={card ? `card-back-${card.id}` : 'card-back'}
        style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
        className={`
          ${sizeClasses}
          relative rounded-xl overflow-hidden shadow-xl select-none shrink-0
          bg-gradient-to-b from-[#26262a] via-[#1c1c1f] to-[#121214]
          border-2 border-white/90 shadow-black/80
          flex flex-col items-center justify-center cursor-pointer transition-all duration-200
          ${className}
        `}
      >
        {/* Inner hairline border */}
        <div className="absolute inset-1 rounded-lg border border-white/20 pointer-events-none" />

        {/* Center CRAZY 8 Logo Badge */}
        <div className="flex flex-col items-center justify-center z-10 pointer-events-none px-1">
          <span className="font-['Montserrat','Arial_Black',sans-serif] font-black text-[9px] sm:text-[11px] tracking-widest text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-center leading-none">
            CRAZY
          </span>
          <span className="font-['Montserrat','Arial_Black',sans-serif] font-black text-lg sm:text-2xl text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] leading-none mt-0.5">
            8
          </span>
        </div>

        {/* Diagonal shine/glare overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
      </div>
    );
  }

  // 2. CARD FACE RENDERING
  const isEight = card.value === '8';
  const isDraw4 = card.value === 'wild_draw4';
  const isDraw2 = card.value === 'draw2';
  const isSkip = card.value === 'skip';
  const isReverse = card.value === 'reverse';

  // Universal Rainbow Rule:
  // All Crazy 8s (value '8'), Wild cards, and Wild Draw 4s ('wild_draw4') are ALWAYS RAINBOW!
  // They are universal wild cards and MUST NEVER render as a solid suit color.
  const isCrazyRainbow = isWildCard(card);
  const colorMeta = isCrazyRainbow ? CRAZY8_COLORS.wild : (CRAZY8_COLORS[card.color] || CRAZY8_COLORS.wild);
  const isYellow = card.color === 'yellow' && !isCrazyRainbow;

  // Playable & selection visual highlights (position transforms handled cleanly by parent tray)
  const playableElevate = isPlayable
    ? 'ring-1.5 sm:ring-2 ring-white/80'
    : '';

  const selectedElevate = isSelected
    ? 'ring-4 ring-amber-400 shadow-2xl shadow-amber-400/60'
    : '';

  return (
    <div
      id={`card-${card.id}`}
      onClick={isPlayable ? onClick : undefined}
      style={{
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        background: isCrazyRainbow
          ? 'linear-gradient(135deg, #ef4444 0%, #f97316 20%, #facc15 38%, #22c55e 58%, #06b6d4 75%, #3b82f6 88%, #a855f7 100%)'
          : colorMeta.bg,
      }}
      className={`
        ${sizeClasses}
        relative rounded-xl overflow-hidden select-none shrink-0
        border-2 sm:border-[2.5px] border-white/95
        shadow-lg shadow-black/60 transition-all duration-200 cursor-pointer
        ${playableElevate}
        ${selectedElevate}
        ${colorMeta.glow}
        ${className}
      `}
    >
      {/* Crisp White Inner Rounded Frame */}
      <div className="absolute inset-1 sm:inset-1.5 rounded-lg border border-white/80 sm:border-[1.5px] pointer-events-none z-10" />

      {/* Radiating sunburst ray lines for unplayed Crazy 8 / Draw 4 rainbow cards */}
      {isCrazyRainbow && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `repeating-conic-gradient(from -45deg at 10% 90%, rgba(255,255,255,0.45) 0deg 8deg, transparent 8deg 16deg)`,
          }}
        />
      )}

      {/* TOP-LEFT INDEX */}
      <div className="absolute top-1 left-1.5 z-20 flex flex-col items-center leading-none pointer-events-none">
        {isDraw2 || isDraw4 ? (
          /* Mini overlapping cards corner icon */
          <div className="flex flex-col items-center">
            <div className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 mb-0.5">
              <div className="absolute top-0 left-0 w-2.5 h-3 rounded-sm border border-white/80 bg-white/30" />
              <div className="absolute top-0.5 left-1 w-2.5 h-3 rounded-sm border border-white bg-white/50 shadow-sm" />
            </div>
            <span
              className={`
                font-['Montserrat','Arial_Black',sans-serif] font-black text-[9px] sm:text-[11px]
                ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}
                drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]
              `}
            >
              {isDraw4 ? '+4' : '+2'}
            </span>
          </div>
        ) : isSkip ? (
          /* Mini Skip (⊘) icon */
          <svg viewBox="0 0 20 20" className={`w-3 h-3 sm:w-3.5 sm:h-3.5 fill-none stroke-current ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}`} strokeWidth="3">
            <circle cx="10" cy="10" r="7" />
            <line x1="5" y1="5" x2="15" y2="15" strokeLinecap="round" />
          </svg>
        ) : isReverse ? (
          /* Mini Reverse (⇄) icon */
          <svg viewBox="0 0 24 24" className={`w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}`}>
            <path d="M 12 3 C 17 3 21 7 21 12 L 18.5 12 C 18.5 8.5 15.5 5.5 12 5.5 C 9.5 5.5 7.5 7 6.5 9 L 9 9 L 5 14 L 1 9 L 3.8 9 C 5 5.5 8.2 3 12 3 Z" />
            <path d="M 12 21 C 7 21 3 17 3 12 L 5.5 12 C 5.5 15.5 8.5 18.5 12 18.5 C 14.5 18.5 16.5 17 17.5 15 L 15 15 L 19 10 L 23 15 L 20.2 15 C 19 18.5 15.8 21 12 21 Z" />
          </svg>
        ) : (
          /* Digit index (including 8 for Crazy 8) */
          <span
            className={`
              font-['Montserrat','Arial_Black',sans-serif] font-black
              ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}
              ${size === 'xs' ? 'text-[11px]' : size === 'sm' ? 'text-xs' : 'text-sm sm:text-base'}
              drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]
            `}
          >
            {isEight ? '8' : card.value}
          </span>
        )}
      </div>

      {/* BOTTOM-RIGHT INDEX (Rotated 180deg) */}
      <div className="absolute bottom-1 right-1.5 z-20 flex flex-col items-center leading-none pointer-events-none rotate-180">
        {isDraw2 || isDraw4 ? (
          <div className="flex flex-col items-center">
            <div className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 mb-0.5">
              <div className="absolute top-0 left-0 w-2.5 h-3 rounded-sm border border-white/80 bg-white/30" />
              <div className="absolute top-0.5 left-1 w-2.5 h-3 rounded-sm border border-white bg-white/50 shadow-sm" />
            </div>
            <span
              className={`
                font-['Montserrat','Arial_Black',sans-serif] font-black text-[9px] sm:text-[11px]
                ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}
                drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]
              `}
            >
              {isDraw4 ? '+4' : '+2'}
            </span>
          </div>
        ) : isSkip ? (
          <svg viewBox="0 0 20 20" className={`w-3 h-3 sm:w-3.5 sm:h-3.5 fill-none stroke-current ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}`} strokeWidth="3">
            <circle cx="10" cy="10" r="7" />
            <line x1="5" y1="5" x2="15" y2="15" strokeLinecap="round" />
          </svg>
        ) : isReverse ? (
          <svg viewBox="0 0 24 24" className={`w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}`}>
            <path d="M 12 3 C 17 3 21 7 21 12 L 18.5 12 C 18.5 8.5 15.5 5.5 12 5.5 C 9.5 5.5 7.5 7 6.5 9 L 9 9 L 5 14 L 1 9 L 3.8 9 C 5 5.5 8.2 3 12 3 Z" />
            <path d="M 12 21 C 7 21 3 17 3 12 L 5.5 12 C 5.5 15.5 8.5 18.5 12 18.5 C 14.5 18.5 16.5 17 17.5 15 L 15 15 L 19 10 L 23 15 L 20.2 15 C 19 18.5 15.8 21 12 21 Z" />
          </svg>
        ) : (
          <span
            className={`
              font-['Montserrat','Arial_Black',sans-serif] font-black
              ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}
              ${size === 'xs' ? 'text-[11px]' : size === 'sm' ? 'text-xs' : 'text-sm sm:text-base'}
              drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]
            `}
          >
            {isEight ? '8' : card.value}
          </span>
        )}
      </div>


      {/* CENTER CARD GRAPHIC */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        {isDraw4 ? (
          /* 1. CRAZY DRAW 4: Overlapping white card outlines with central black disc +4 */
          <div className="relative flex items-center justify-center">
            {/* Back card outline */}
            <div
              className={`
                absolute -top-1.5 -left-1.5 rounded border border-white/70 bg-white/20
                ${size === 'xs' ? 'w-5 h-7' : size === 'sm' ? 'w-6 h-9' : 'w-8 h-12 sm:w-10 sm:h-14'}
              `}
            />
            {/* Front card outline */}
            <div
              className={`
                absolute top-0.5 left-0.5 rounded border border-white/90 bg-white/30 shadow-md
                ${size === 'xs' ? 'w-5 h-7' : size === 'sm' ? 'w-6 h-9' : 'w-8 h-12 sm:w-10 sm:h-14'}
              `}
            />
            {/* Center black circular puck with bold white +4 */}
            <div
              className={`
                relative z-10 rounded-full bg-black/95 border-2 border-white shadow-xl flex items-center justify-center
                ${size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-7 h-7' : 'w-9 h-9 sm:w-11 sm:h-11'}
              `}
            >
              <span className="font-['Montserrat','Arial_Black',sans-serif] font-black text-white text-[11px] sm:text-sm leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                +4
              </span>
            </div>
          </div>
        ) : isDraw2 ? (
          /* 2. DRAW 2: Overlapping white card outlines with bold white +2 */
          <div className="relative flex items-center justify-center">
            {/* Back card outline */}
            <div
              className={`
                absolute -top-1.5 -left-1.5 rounded border border-white/75 bg-white/20
                ${size === 'xs' ? 'w-5 h-7' : size === 'sm' ? 'w-6 h-9' : 'w-8 h-12 sm:w-10 sm:h-14'}
              `}
            />
            {/* Front card outline */}
            <div
              className={`
                absolute top-0.5 left-0.5 rounded border border-white/95 bg-white/30 shadow-md
                ${size === 'xs' ? 'w-5 h-7' : size === 'sm' ? 'w-6 h-9' : 'w-8 h-12 sm:w-10 sm:h-14'}
              `}
            />
            {/* Center bold +2 */}
            <span
              className={`
                relative z-10 font-['Montserrat','Arial_Black',sans-serif] font-black leading-none
                ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}
                ${size === 'xs' ? 'text-base' : size === 'sm' ? 'text-xl' : 'text-2xl sm:text-3xl'}
                drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]
              `}
            >
              +2
            </span>
          </div>
        ) : (isEight || (isCrazyRainbow && !isDraw4)) ? (
          /* 3. CRAZY 8: Black circular disc with white border and bold white '8' */
          <div
            className={`
              rounded-full bg-black/95 border-2 border-white shadow-xl flex items-center justify-center
              ${size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-7 h-7' : 'w-10 h-10 sm:w-12 sm:h-12'}
            `}
          >
            <span
              className={`
                font-['Montserrat','Arial_Black',sans-serif] font-black text-white leading-none
                ${size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-base' : 'text-lg sm:text-2xl'}
                drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]
              `}
            >
              8
            </span>
          </div>
        ) : isSkip ? (
          /* 4. SKIP */
          <svg
            viewBox="0 0 40 40"
            className={`
              ${size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-7 h-7' : 'w-10 h-10 sm:w-13 sm:h-13'}
              ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}
              drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]
            `}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
          >
            <circle cx="20" cy="20" r="15" />
            <line x1="9.4" y1="9.4" x2="30.6" y2="30.6" strokeLinecap="round" />
          </svg>
        ) : isReverse ? (
          /* 5. REVERSE */
          <svg
            viewBox="0 0 40 40"
            className={`
              ${size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-7 h-7' : 'w-10 h-10 sm:w-13 sm:h-13'}
              ${isYellow && !isCrazyRainbow ? 'fill-black' : 'fill-white'}
              drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]
            `}
          >
            <path d="M 20 7 C 27.5 7 33 12.5 33 20 L 29.5 20 C 29.5 14.5 25.5 10.5 20 10.5 C 16 10.5 12.5 12.8 11 16 L 14.5 16 L 9 23 L 3.5 16 L 7.5 16 C 9.5 10.5 14.3 7 20 7 Z" />
            <path d="M 20 33 C 12.5 33 7 27.5 7 20 L 10.5 20 C 10.5 25.5 14.5 29.5 20 29.5 C 24 29.5 27.5 27.2 29 24 L 25.5 24 L 31 17 L 36.5 24 L 32.5 24 C 30.5 29.5 25.7 33 20 33 Z" />
          </svg>
        ) : (
          /* 6. STANDARD NUMBER (0-7, 9) */
          <span
            className={`
              font-['Montserrat','Arial_Black',sans-serif] font-black leading-none
              ${isYellow ? 'text-black' : 'text-white'}
              ${size === 'xs' ? 'text-xl' : size === 'sm' ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-5xl'}
              drop-shadow-[0_3px_5px_rgba(0,0,0,0.4)]
            `}
          >
            {card.value}
          </span>
        )}
      </div>

      {/* Subtle glossy card glare */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
    </div>
  );
};
