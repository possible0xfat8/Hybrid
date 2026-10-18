import React from 'react';

interface OpponentCardStackProps {
  cardCount: number;
  isCurrentTurn?: boolean;
  playerName?: string;
  className?: string;
  side?: 'left' | 'right' | 'top';
}

export const OpponentCardStack: React.FC<OpponentCardStackProps> = ({
  cardCount,
  isCurrentTurn = false,
  playerName,
  className = '',
  side: _side,
}) => {
  if (cardCount <= 0) return null;

  // Number of additional visible card edges below top card (up to 8)
  const additionalEdges = Math.min(cardCount - 1, 8);

  return (
    <div
      className={`
        flex flex-col items-center select-none transition-all duration-300 shrink-0
        ${isCurrentTurn ? 'scale-105 filter drop-shadow-[0_0_14px_rgba(255,255,255,0.8)]' : 'opacity-95'}
        ${className}
      `}
      title={`${playerName || 'Opponent'}: ${cardCount} cards in hand`}
    >
      {/* Complete Top Card Back - Exact Same Size as All Other Cards (size sm) */}
      <div
        className={`
          relative w-14 h-[88px] xs:w-15 xs:h-[95px] sm:w-18 sm:h-[114px]
          bg-gradient-to-b from-[#26262a] via-[#1c1c1f] to-[#121214]
          border-2 border-white/90 rounded-xl
          shadow-xl shadow-black/80 flex flex-col items-center justify-center p-0.5 overflow-hidden
          ${isCurrentTurn ? 'border-amber-300 ring-2 ring-amber-300/60' : ''}
        `}
      >
        {/* Inner hairline frame */}
        <div className="absolute inset-1 rounded-lg border border-white/20 pointer-events-none" />

        {/* CRAZY 8 logo mark matching CardComponent */}
        <div className="z-10 flex flex-col items-center justify-center pointer-events-none px-1">
          <span className="font-['Montserrat','Arial_Black',sans-serif] font-black text-[8px] xs:text-[9px] sm:text-[11px] tracking-widest text-white/90 drop-shadow text-center leading-none">
            CRAZY
          </span>
          <span className="font-['Montserrat','Arial_Black',sans-serif] font-black text-base xs:text-lg sm:text-2xl text-white drop-shadow leading-none mt-0.5">
            8
          </span>
        </div>

        {/* Turn glow if active */}
        {isCurrentTurn && (
          <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Stacked Card Edges (The signature GamePigeon physical vertical card stack) */}
      {additionalEdges > 0 && (
        <div className="w-full flex flex-col items-center -mt-0.5">
          {Array.from({ length: additionalEdges }).map((_, idx) => (
            <div
              key={idx}
              className={`
                w-full h-1.5 xs:h-2 sm:h-2.5
                bg-[#18181a] border-b-2 border-x-2 border-white/90
                ${idx === additionalEdges - 1 ? 'rounded-b-xl' : ''}
                ${isCurrentTurn ? 'border-amber-300' : ''}
                transition-all duration-150
              `}
            />
          ))}
        </div>
      )}

      {/* Card Count Pill */}
      <div className="mt-1 px-2 py-0.2 rounded-full bg-black/90 border border-white/50 text-[8px] sm:text-[9px] font-mono font-black text-amber-300 shadow-md">
        {cardCount}
      </div>
    </div>
  );
};
