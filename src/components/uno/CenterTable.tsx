import React from 'react';
import { Card, CardColor, BannerAlert, EscrowPotInfo } from '../types';
import { CardComponent } from './CardComponent';
import { Flame } from 'lucide-react';

interface CenterTableProps {
  topDiscardCard: Card | null;
  activeColor: CardColor | null;
  drawPileCount: number;
  turnDirection: 1 | -1;
  isMyTurn: boolean;
  canDraw: boolean;
  onDrawCard: () => void;
  bannerAlert: BannerAlert | null;
  lastActionMessage: string | null;
  escrowPot?: EscrowPotInfo;
  pendingDrawCount?: number;
  isMobile?: boolean;
}

export const CenterTable: React.FC<CenterTableProps> = ({
  topDiscardCard,
  activeColor,
  drawPileCount,
  turnDirection: _turnDirection,
  isMyTurn,
  canDraw,
  onDrawCard,
  bannerAlert,
  lastActionMessage: _lastActionMessage,
  escrowPot,
  pendingDrawCount = 0,
  isMobile: _isMobile = false,
}) => {
  // If top discard card is a Crazy 8 or Wild Draw 4, transform it into activeColor
  const effectiveDiscardCard = (topDiscardCard && (topDiscardCard.value === '8' || topDiscardCard.value === 'wild_draw4') && activeColor)
    ? {
        ...topDiscardCard,
        color: activeColor,
        label: topDiscardCard.value === 'wild_draw4' ? `+4 ${activeColor.toUpperCase()}` : `${activeColor.toUpperCase()} 8`,
      }
    : topDiscardCard;

  return (
    <div className="relative flex flex-col items-center justify-center select-none shrink-0 pointer-events-auto">
      {/* Banner Alert Banner (e.g. LAST CARD! or DEFENSE STACK) */}
      {bannerAlert && (
        <div className="absolute -top-10 sm:-top-12 z-40 w-full flex justify-center pointer-events-none animate-in zoom-in-75 duration-200">
          <div className="px-3 sm:px-4 py-0.8 rounded-full bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 text-white font-black text-[9px] sm:text-xs tracking-wider uppercase shadow-2xl border border-white/60 flex items-center gap-1 animate-pulse max-w-[95%] truncate">
            <span>⚡</span>
            <span className="truncate">{bannerAlert.text}</span>
            <span>⚡</span>
          </div>
        </div>
      )}

      {/* CENTER CARDS (Directly on Red Felt: No Center Table, Matching Screenshot 2) */}
      <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-5">
        {/* 1. DRAW PILE (GamePigeon Crazy 8 Deck) */}
        <div id="draw-deck-pile" className="relative flex flex-col items-center">
          <div
            className="relative cursor-pointer group select-none transition-transform active:scale-95"
            onClick={canDraw ? onDrawCard : undefined}
          >
            {/* 3D Physical White Edge Thickness Stacks (Matching Screenshot 2 white card edge) */}
            <div className="absolute -bottom-1 -right-1 w-full h-full bg-white/90 rounded-xl pointer-events-none shadow-md" />
            <div className="absolute -bottom-2 -right-2 w-full h-full bg-slate-200 rounded-xl pointer-events-none shadow-lg" />

            <CardComponent
              isBack
              size="sm"
              className={`
                transition-all duration-200 shadow-2xl shadow-black/80
                ${canDraw && isMyTurn ? 'ring-3 sm:ring-4 ring-amber-400 -translate-y-1.5 shadow-amber-400/50 group-hover:-translate-y-2.5' : 'hover:-translate-y-1'}
              `}
            />

            {/* Draw / Penalty Badge */}
            {canDraw && isMyTurn && (
              <div
                className={`
                  absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 text-[8px] sm:text-[10px] font-black rounded-full shadow-xl animate-bounce z-20
                  ${pendingDrawCount > 0 ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white border border-white ring-2 ring-red-500' : 'bg-amber-400 text-slate-950 font-extrabold border border-white'}
                `}
              >
                {pendingDrawCount > 0 ? `+${pendingDrawCount}` : 'DRAW 1'}
              </div>
            )}
          </div>

          {/* Deck Count */}
          <div className="mt-1.5 text-[9px] sm:text-xs font-mono font-bold text-white/90 drop-shadow-md">
            {drawPileCount} cards
          </div>
        </div>

        {/* 2. DISCARD PILE (Top Played Card) */}
        <div id="top-discard-card" className="relative flex flex-col items-center">
          {effectiveDiscardCard ? (
            <div className="relative">
              {/* Physical card pile stack below */}
              <div className="absolute -top-0.5 -left-0.5 w-full h-full bg-black/40 rounded-xl pointer-events-none rotate-[-4deg]" />
              <div className="absolute top-0.5 left-0.5 w-full h-full bg-black/30 rounded-xl pointer-events-none rotate-[3deg]" />

              <CardComponent
                card={effectiveDiscardCard}
                size="sm"
                isPlayable={false}
                className="shadow-2xl shadow-black/90"
              />
            </div>
          ) : (
            <div className="w-14 h-[88px] xs:w-15 xs:h-[95px] sm:w-18 sm:h-[114px] rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 text-xs font-mono">
              EMPTY
            </div>
          )}

          {/* Active Color Nomination Callout */}
          {activeColor && (
            <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-black/80 border border-white/40 text-[8px] sm:text-[9px] font-black text-white uppercase tracking-wider shadow-md backdrop-blur-sm flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full animate-ping"
                style={{
                  backgroundColor:
                    activeColor === 'red' ? '#ef4444' : activeColor === 'blue' ? '#3b82f6' : activeColor === 'green' ? '#22c55e' : '#eab308',
                }}
              />
              <span>SUIT: {activeColor.toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Active Defense Stack Counter (+2 / +4 Stacking) */}
      {pendingDrawCount > 0 && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 px-3 py-0.5 rounded-full bg-red-600 border-2 border-white text-white font-black text-[9px] sm:text-xs flex items-center gap-1 shadow-2xl shadow-red-600/80 animate-bounce">
          <Flame className="w-3 h-3 text-yellow-300 fill-yellow-300" />
          <span>ATTACK STACK: +{pendingDrawCount}</span>
        </div>
      )}

      {/* Escrow Pot Info Tag (Testnet Hemi) */}
      {escrowPot && (
        <div className="mt-1.5 px-2 py-0.5 rounded-md bg-black/80 border border-white/20 text-[8px] sm:text-[9px] font-mono font-bold text-amber-300 backdrop-blur-sm whitespace-nowrap">
          POT: {escrowPot.amount} {escrowPot.currency}
        </div>
      )}
    </div>
  );
};
