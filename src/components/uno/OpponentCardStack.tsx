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
      {/* Complete Top Card Back with explicit pixel dimensions */}
      <div
        className={`
          relative w-[52px] h-[78px] sm:w-[62px] sm:h-[92px]
          bg-gradient-to-b from-[#25252a] via-[#1b1b1e] to-[#101012]
          border-2 border-white/90 rounded-xl
          shadow-xl shadow-black/80 flex flex-col items-center justify-center p-0.5 overflow-hidden
          ${isCurrentTurn ? 'border-amber-300 ring-2 ring-amber-300/70 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : ''}
        `}
      >
        {/* Inner hairline frame */}
        <div className="absolute inset-1 rounded-lg border border-white/20 pointer-events-none" />

        {/* CRAZY 8 logo mark */}
        <div className="z-10 flex flex-col items-center justify-center pointer-events-none px-1">
          <span className="font-['Montserrat','Arial_Black',sans-serif] font-black text-[8px] sm:text-[10px] tracking-widest text-white/90 drop-shadow text-center leading-none">
            CRAZY
          </span>
          <span className="font-['Montserrat','Arial_Black',sans-serif] font-black text-sm sm:text-xl text-white drop-shadow leading-none mt-0.5">
            8
          </span>
        </div>

        {/* Turn glow if active */}
        {isCurrentTurn && (
          <div className="absolute inset-0 bg-amber-400/10 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* Stacked Card Edges (Layered card stack below) */}
      {additionalEdges > 0 && (
        <div className="w-full flex flex-col items-center -mt-0.5">
          {Array.from({ length: additionalEdges }).map((_, idx) => (
            <div
              key={idx}
              className={`
                w-full h-1.5 sm:h-2
                bg-[#161618] border-b-2 border-x-2 border-white/90
                ${idx === additionalEdges - 1 ? 'rounded-b-xl' : ''}
                ${isCurrentTurn ? 'border-amber-300' : ''}
                transition-all duration-150
              `}
            />
          ))}
        </div>
      )}

      {/* Card Count Pill — matches reference screenshot with orange glowing border */}
      <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-[#140D0E] border border-amber-500/80 text-[10px] sm:text-[11px] font-mono font-black text-amber-300 shadow-md flex items-center justify-center min-w-[28px]">
        {cardCount}
      </div>
    </div>
  );
};
