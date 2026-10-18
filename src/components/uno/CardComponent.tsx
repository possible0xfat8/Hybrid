import React from 'react';
import { Card as CardType, CardColor } from '../types';

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
  // Responsive sizing presets with 2:3 card aspect ratio
  const sizeClasses = {
    xs: 'w-12 h-[76px] xs:w-13 xs:h-[82px] sm:w-16 sm:h-[102px]',
    sm: 'w-14 h-[88px] xs:w-15 xs:h-[95px] sm:w-18 sm:h-[114px]',
    md: 'w-16 h-[102px] sm:w-22 sm:h-[140px]',
    lg: 'w-24 h-[152px] sm:w-28 sm:h-[178px]',
    adaptive: 'w-13.5 h-[86px] xs:w-15 xs:h-[95px] sm:w-19 sm:h-[120px] md:w-22 md:h-[140px]',
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
          <span className="font-['Montserrat','Arial_Black',sans-serif] font-black text-[9px] xs:text-[10px] sm:text-[13px] tracking-widest text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] text-center leading-none">
            CRAZY
          </span>
          <span className="font-['Montserrat','Arial_Black',sans-serif] font-black text-lg xs:text-xl sm:text-3xl text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] leading-none mt-0.5">
            8
          </span>
        </div>

        {/* Diagonal shine/glare overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
      </div>
    );
  }

  // 2. CRAZY 8 FACE CARDS (Exact match to GamePigeon Special Cards)
  // Only 5 special cards: Crazy 8, Skip, Reverse, Draw 2, Crazy Draw 4
  const isEight = card.value === '8';
  const isDraw4 = card.value === 'wild_draw4';
  const isDraw2 = card.value === 'draw2';
  const isSkip = card.value === 'skip';
  const isReverse = card.value === 'reverse';

  // Temporary Rainbow Color Rule:
  // Crazy 8 and Crazy Draw 4 have the temporary rainbow color in hand/unplayed (color === 'wild').
  // Once played, they turn into their chosen nominated permanent color (red, blue, green, yellow).
  // Draw 2 is ALWAYS a permanent color (never rainbow). Skip & Reverse are permanent colors.
  const isCrazyRainbow = card.color === 'wild';

  const colorMeta = CRAZY8_COLORS[card.color] || CRAZY8_COLORS.wild;
  const isYellow = card.color === 'yellow';

  // Playable elevation: pops up vertically to make selection effortless
  const playableElevate = isPlayable
    ? '-translate-y-3 sm:-translate-y-4 hover:-translate-y-5 hover:scale-105 active:scale-95 ring-2 ring-white/90 shadow-2xl'
    : 'opacity-90 hover:opacity-100';

  const selectedElevate = isSelected
    ? '-translate-y-6 ring-4 ring-amber-400 scale-105 shadow-2xl shadow-amber-400/60 z-30'
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
      {/* Crisp White Inner Rounded Frame (Present on all GamePigeon cards, matching screenshots) */}
      <div className="absolute inset-1 xs:inset-1.2 sm:inset-1.5 rounded-lg border border-white/80 sm:border-[1.5px] pointer-events-none z-10" />

      {/* Radiating sunburst ray lines for unplayed Crazy 8 / Draw 4 rainbow cards (GamePigeon Detail) */}
      {isCrazyRainbow && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `repeating-conic-gradient(from -45deg at 10% 90%, rgba(255,255,255,0.45) 0deg 8deg, transparent 8deg 16deg)`,
          }}
        />
      )}

      {/* TOP-LEFT INDEX (Clean, high-contrast, fully visible when cards overlap in hand) */}
      <div className="absolute top-1 left-1.5 z-20 flex flex-col items-center leading-none pointer-events-none">
        {isDraw2 || isDraw4 ? (
          /* Mini overlapping cards corner icon */
          <div className="flex flex-col items-center">
            <div className="relative w-3.5 h-3.5 xs:w-4 xs:h-4 mb-0.5">
              <div className="absolute top-0 left-0 w-2.5 h-3 rounded-xs border border-white/80 bg-white/30" />
              <div className="absolute top-0.5 left-0.8 w-2.5 h-3 rounded-xs border border-white bg-white/50 shadow-xs" />
            </div>
            <span
              className={`
                font-['Montserrat','Arial_Black',sans-serif] font-black text-[9px] xs:text-[10px] sm:text-xs
                ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}
                drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]
              `}
            >
              {isDraw4 ? '+4' : '+2'}
            </span>
          </div>
        ) : isSkip ? (
          /* Mini Skip (⊘) icon */
          <svg viewBox="0 0 20 20" className={`w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 fill-none stroke-current ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}`} strokeWidth="3">
            <circle cx="10" cy="10" r="7" />
            <line x1="5" y1="5" x2="15" y2="15" strokeLinecap="round" />
          </svg>
        ) : isReverse ? (
          /* Mini Reverse (⇄) icon */
          <svg viewBox="0 0 24 24" className={`w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 fill-current ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}`}>
            <path d="M 12 3 C 17 3 21 7 21 12 L 18.5 12 C 18.5 8.5 15.5 5.5 12 5.5 C 9.5 5.5 7.5 7 6.5 9 L 9 9 L 5 14 L 1 9 L 3.8 9 C 5 5.5 8.2 3 12 3 Z" />
            <path d="M 12 21 C 7 21 3 17 3 12 L 5.5 12 C 5.5 15.5 8.5 18.5 12 18.5 C 14.5 18.5 16.5 17 17.5 15 L 15 15 L 19 10 L 23 15 L 20.2 15 C 19 18.5 15.8 21 12 21 Z" />
          </svg>
        ) : (
          /* Digit index */
          <span
            className={`
              font-['Montserrat','Arial_Black',sans-serif] font-black
              ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}
              ${size === 'xs' ? 'text-[11px]' : size === 'sm' ? 'text-xs' : 'text-sm sm:text-base'}
              drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]
            `}
          >
            {card.value}
          </span>
        )}
      </div>

      {/* BOTTOM-RIGHT INDEX (Rotated 180deg) */}
      <div className="absolute bottom-1 right-1.5 z-20 flex flex-col items-center leading-none pointer-events-none rotate-180">
        {isDraw2 || isDraw4 ? (
          <div className="flex flex-col items-center">
            <div className="relative w-3.5 h-3.5 xs:w-4 xs:h-4 mb-0.5">
              <div className="absolute top-0 left-0 w-2.5 h-3 rounded-xs border border-white/80 bg-white/30" />
              <div className="absolute top-0.5 left-0.8 w-2.5 h-3 rounded-xs border border-white bg-white/50 shadow-xs" />
            </div>
            <span
              className={`
                font-['Montserrat','Arial_Black',sans-serif] font-black text-[9px] xs:text-[10px] sm:text-xs
                ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}
                drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]
              `}
            >
              {isDraw4 ? '+4' : '+2'}
            </span>
          </div>
        ) : isSkip ? (
          <svg viewBox="0 0 20 20" className={`w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 fill-none stroke-current ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}`} strokeWidth="3">
            <circle cx="10" cy="10" r="7" />
            <line x1="5" y1="5" x2="15" y2="15" strokeLinecap="round" />
          </svg>
        ) : isReverse ? (
          <svg viewBox="0 0 24 24" className={`w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 fill-current ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}`}>
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
            {card.value}
          </span>
        )}
      </div>

      {/* CENTER CARD GRAPHIC (Exact match to GamePigeon Crazy 8 screenshots) */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        {isDraw4 ? (
          /* 1. CRAZY DRAW 4: Overlapping white card outlines with central black disc +4 */
          <div className="relative flex items-center justify-center">
            {/* Back card outline */}
            <div
              className={`
                absolute -top-1.5 -left-1.5 xs:-top-2 xs:-left-2 rounded border-1.5 xs:border-2 border-white/70 bg-white/20
                ${size === 'xs' ? 'w-5 h-7' : size === 'sm' ? 'w-7 h-10' : 'w-10 h-14 sm:w-12 sm:h-16'}
              `}
            />
            {/* Front card outline */}
            <div
              className={`
                absolute top-0.5 left-0.5 xs:top-1 xs:left-1 rounded border-1.5 xs:border-2 border-white/90 bg-white/30 shadow-md
                ${size === 'xs' ? 'w-5 h-7' : size === 'sm' ? 'w-7 h-10' : 'w-10 h-14 sm:w-12 sm:h-16'}
              `}
            />
            {/* Center black circular puck with bold white +4 */}
            <div
              className={`
                relative z-10 rounded-full bg-black/95 border-2 border-white shadow-xl flex items-center justify-center
                ${size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10 sm:w-13 sm:h-13'}
              `}
            >
              <span className="font-['Montserrat','Arial_Black',sans-serif] font-black text-white text-[11px] xs:text-xs sm:text-base leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                +4
              </span>
            </div>
          </div>
        ) : isDraw2 ? (
          /* 2. DRAW 2: Overlapping white card outlines with bold white +2 (Permanent color) */
          <div className="relative flex items-center justify-center">
            {/* Back card outline */}
            <div
              className={`
                absolute -top-1.5 -left-1.5 xs:-top-2 xs:-left-2 rounded border-1.5 xs:border-2 border-white/75 bg-white/20
                ${size === 'xs' ? 'w-5 h-7' : size === 'sm' ? 'w-7 h-10' : 'w-10 h-14 sm:w-12 sm:h-16'}
              `}
            />
            {/* Front card outline */}
            <div
              className={`
                absolute top-0.5 left-0.5 xs:top-1 xs:left-1 rounded border-1.5 xs:border-2 border-white/95 bg-white/30 shadow-md
                ${size === 'xs' ? 'w-5 h-7' : size === 'sm' ? 'w-7 h-10' : 'w-10 h-14 sm:w-12 sm:h-16'}
              `}
            />
            {/* Center bold +2 */}
            <span
              className={`
                relative z-10 font-['Montserrat','Arial_Black',sans-serif] font-black leading-none
                ${isYellow && !isCrazyRainbow ? 'text-black' : 'text-white'}
                ${size === 'xs' ? 'text-base' : size === 'sm' ? 'text-xl' : 'text-2xl sm:text-4xl'}
                drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]
              `}
            >
              +2
            </span>
          </div>
        ) : isEight ? (
          /* 3. CRAZY 8: Black circular disc with white border and bold white '8' (Screenshot 1) */
          <div
            className={`
              rounded-full bg-black/95 border-2 border-white shadow-xl flex items-center justify-center
              ${size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-8 h-8' : 'w-11 h-11 sm:w-14 sm:h-14'}
            `}
          >
            <span
              className={`
                font-['Montserrat','Arial_Black',sans-serif] font-black text-white leading-none
                ${size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-base' : 'text-xl sm:text-3xl'}
                drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]
              `}
            >
              8
            </span>
          </div>
        ) : isSkip ? (
          /* 4. SKIP: White circular prohibition sign (⊘) */
          <svg
            viewBox="0 0 40 40"
            className={`
              ${size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-8 h-8' : 'w-12 h-12 sm:w-16 sm:h-16'}
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
          /* 5. REVERSE: Two curved white arrows in circular loop (Screenshot 1) */
          <svg
            viewBox="0 0 40 40"
            className={`
              ${size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-8 h-8' : 'w-12 h-12 sm:w-16 sm:h-16'}
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
              ${size === 'xs' ? 'text-2xl' : size === 'sm' ? 'text-3xl' : 'text-4xl sm:text-6xl'}
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
