import React from 'react';
import { Card, CardColor, BannerAlert, EscrowPotInfo, isWildCard } from '../types';
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
  // The top discard card reflects the nominated suit color when a Crazy 8 or Wild Draw 4 is played
  const effectiveDiscardCard = (topDiscardCard && isWildCard(topDiscardCard) && activeColor)
    ? {
        ...topDiscardCard,
        color: activeColor,
      }
    : topDiscardCard;

  return (
    <div className="relative flex flex-col items-center justify-center select-none shrink-0 pointer-events-auto">
      {/* 1. TOP NOTIFICATION / STACK ALERT ROW (Cleanly above cards with explicit static flow, no overlap) */}
      <div className="min-h-[26px] flex items-center justify-center mb-1.5 z-20">
        {pendingDrawCount > 0 ? (
          <div className="px-3 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 border border-white/80 text-white font-black text-[9px] sm:text-[10px] tracking-wider uppercase flex items-center gap-1.5 shadow-xl shadow-red-600/50 animate-bounce">
            <Flame className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 animate-pulse" />
            <span>ATTACK STACK: +{pendingDrawCount}</span>
          </div>
        ) : bannerAlert ? (
          <div className="px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 text-white font-black text-[9px] sm:text-[10px] tracking-wider uppercase shadow-xl border border-white/60 flex items-center gap-1 animate-pulse">
            <span>⚡</span>
            <span>{bannerAlert.text}</span>
            <span>⚡</span>
          </div>
        ) : null}
      </div>

      {/* 2. ISOLATED CENTER ZONE: DRAW DECK & DISCARD PILE */}
      <div className="relative z-10 flex items-center justify-center gap-4 sm:gap-6">
        {/* Draw Pile (Deck) */}
        <div id="draw-deck-pile" className="relative flex flex-col items-center">
          <div
            className="relative cursor-pointer group select-none transition-transform active:scale-95"
            onClick={canDraw ? onDrawCard : undefined}
          >
            {/* 3D Physical White Edge Thickness Stacks */}
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

            {/* Draw 1 Pill if My Turn & can draw and not under attack */}
            {canDraw && isMyTurn && pendingDrawCount === 0 && (
              <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.2 text-[8px] sm:text-[9px] font-black rounded-full shadow-lg bg-amber-400 text-slate-950 border border-white animate-bounce z-20">
                DRAW 1
              </div>
            )}
          </div>

          {/* Remaining Card Count Badge */}
          <div className="mt-2 px-2.5 py-0.5 rounded-full bg-black/75 border border-white/15 text-[9px] sm:text-[10px] font-mono font-bold text-slate-300 shadow">
            {drawPileCount} cards
          </div>
        </div>

        {/* Discard Pile */}
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
            <div className="w-[56px] h-[84px] sm:w-[68px] sm:h-[102px] rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 text-xs font-mono">
              EMPTY
            </div>
          )}

          {/* Active Color / Suit Indicator */}
          {activeColor && (
            <div className="mt-2 px-2.5 py-0.5 rounded-full bg-black/80 border border-white/25 text-[8px] sm:text-[9px] font-black text-white uppercase tracking-wider shadow backdrop-blur-sm flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full animate-pulse shadow-sm shrink-0"
                style={{
                  backgroundColor:
                    activeColor === 'red'
                      ? '#ef4444'
                      : activeColor === 'blue'
                      ? '#3b82f6'
                      : activeColor === 'green'
                      ? '#22c55e'
                      : '#eab308',
                }}
              />
              <span>SUIT: {activeColor.toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. POT BADGE ROW (Distinct row with dedicated margin, never colliding with sub-labels) */}
      {escrowPot && (
        <div className="mt-2 px-3 py-0.5 rounded-full bg-black/85 border border-amber-500/35 text-[9px] sm:text-[10px] font-mono font-bold text-amber-300 backdrop-blur-sm shadow-md flex items-center gap-1.5 z-10">
          <span className="text-amber-400 font-black tracking-wider text-[8px] sm:text-[9px]">POT:</span>
          <span>{escrowPot.amount} {escrowPot.currency}</span>
        </div>
      )}
    </div>
  );
};
