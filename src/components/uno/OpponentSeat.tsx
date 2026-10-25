import React from 'react';
import { Player, FloatingEmote } from '../types';
import { FloatingEmoteDisplay } from './ReactionWheel';
import { OpponentCardStack } from './OpponentCardStack';
import { UserAvatar } from './UserAvatar';

interface OpponentSeatProps {
  player: Player;
  isCurrentTurn: boolean;
  turnTimeRemaining: number;
  turnTimeTotal: number;
  emotes: FloatingEmote[];
  positionStyle?: string;
  sidePosition?: 'left' | 'right' | 'top';
  stackPlacement?: 'left' | 'right' | 'top';
  onOpenProfile?: (player: Player) => void;
}

export const OpponentSeat: React.FC<OpponentSeatProps> = ({
  player,
  isCurrentTurn,
  turnTimeRemaining,
  turnTimeTotal: _turnTimeTotal,
  emotes,
  positionStyle = '',
  sidePosition,
  stackPlacement,
  onOpenProfile,
}) => {
  // Determine whether card stack goes on the left or right of the capsule
  const effectiveStackPlacement: 'left' | 'right' =
    stackPlacement === 'left' || sidePosition === 'left' ? 'left' : 'right';

  // If stackPlacement is 'right', we want: [Capsule] [CardStack] (flex-row-reverse)
  // If stackPlacement is 'left', we want: [CardStack] [Capsule] (flex-row)
  const isStackOnRight = effectiveStackPlacement === 'right';

  return (
    <div
      id={`opponent-seat-${player.id}`}
      className={`relative flex items-center select-none ${
        isStackOnRight
          ? 'flex-row-reverse gap-2 sm:gap-3'
          : 'flex-row gap-2 sm:gap-3'
      } ${positionStyle}`}
    >
      {/* Floating Emote on top */}
      <FloatingEmoteDisplay emotes={emotes} targetPlayerId={player.id} />

      {/* Turn Countdown Badge (Screenshot: Purple circle with number like '8') */}
      {isCurrentTurn && (
        <div className="absolute -top-2.5 -right-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-600 border border-purple-300 text-white font-mono font-black text-[10px] sm:text-xs flex items-center justify-center shadow-lg shadow-purple-900/60 animate-pulse z-30">
          {turnTimeRemaining}
        </div>
      )}

      {/* Opponent Physical Card Stack (Layered black Crazy 8 cards with orange count pill) */}
      {player.cardCount > 0 && (
        <OpponentCardStack
          cardCount={player.cardCount}
          isCurrentTurn={isCurrentTurn}
          playerName={player.name}
        />
      )}

      {/* Player Capsule (Screenshot: Rounded pill with purple/orange border, avatar, badge & name) */}
      <button
        type="button"
        onClick={() => onOpenProfile?.(player)}
        className={`flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-[#0D0F14]/90 border transition-all cursor-pointer shadow-xl backdrop-blur-md group/opp focus:outline-none active:scale-95 shrink-0 ${
          isCurrentTurn
            ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-amber-400/30'
            : player.isHost
            ? 'border-amber-500/40 hover:border-amber-500/70 shadow-amber-950/20'
            : 'border-purple-500/35 hover:border-purple-500/60 shadow-purple-950/20'
        }`}
        title={`View ${player.name}'s profile`}
      >
        {/* Avatar Container with BOT or .HOST badge on top */}
        <div className="relative shrink-0">
          {isCurrentTurn && (
            <div className="absolute -inset-1 rounded-full border-2 border-white animate-ping opacity-40 pointer-events-none" />
          )}

          <div
            className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center overflow-hidden transition-all shadow-md ${
              isCurrentTurn ? 'ring-2 ring-white scale-105' : 'ring-1 ring-white/30'
            } ${!player.isConnected ? 'opacity-50 grayscale' : ''}`}
            style={{
              backgroundColor: isCurrentTurn ? '#a3e635' : '#84cc16',
            }}
          >
            <UserAvatar avatar={player.avatar} name={player.name} className="w-full h-full rounded-full" />
          </div>

          {/* Cyan BOT badge on top of avatar (matches screenshot) */}
          {player.isBot && (
            <span className="absolute -top-1.5 -left-1 px-1.5 py-0.2 rounded-full bg-sky-500 text-white text-[7px] sm:text-[8px] font-black uppercase tracking-wider shadow-sm z-10">
              BOT
            </span>
          )}

          {/* Golden .HOST badge on top of avatar (matches screenshot) */}
          {player.isHost && !player.isBot && (
            <span className="absolute -top-1.5 -left-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[7px] sm:text-[8px] font-black uppercase tracking-wider shadow-sm z-10">
              .HOST
            </span>
          )}
        </div>

        {/* Player Name and Online Indicator */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] sm:text-xs font-bold text-white tracking-tight truncate max-w-[70px] sm:max-w-[95px] group-hover/opp:text-amber-300 transition-colors">
            {player.name}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              player.isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-500'
            }`}
          />
        </div>

        {/* 1 CARD alert indicator */}
        {player.cardCount === 1 && (
          <span className="px-1 py-0.2 rounded bg-rose-500 text-white text-[8px] font-mono font-black animate-bounce ml-0.5">
            UNO
          </span>
        )}
      </button>
    </div>
  );
};
