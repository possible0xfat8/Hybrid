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
  // Always use clean horizontal outer layout matching LumiBear (left) and SoliditySam (right)
  const effectiveStackPlacement: 'left' | 'right' =
    stackPlacement === 'left' || sidePosition === 'left' ? 'left' : 'right';

  const isReversed = effectiveStackPlacement === 'right';

  return (
    <div
      id={`opponent-seat-${player.id}`}
      className={`relative flex items-center select-none ${
        isReversed
          ? 'flex-row-reverse gap-1.5 sm:gap-2.5'
          : 'flex-row gap-1.5 sm:gap-2.5'
      } ${positionStyle}`}
    >
      {/* Floating Emote on top */}
      <FloatingEmoteDisplay emotes={emotes} targetPlayerId={player.id} />

      {/* Opponent Physical Card Stack (Always attached & whole, never cut out) */}
      {player.cardCount > 0 && (
        <OpponentCardStack
          cardCount={player.cardCount}
          isCurrentTurn={isCurrentTurn}
          playerName={player.name}
        />
      )}

      {/* Avatar & Name Column (Clickable to view profile) */}
      <button
        type="button"
        onClick={() => onOpenProfile?.(player)}
        className="flex flex-col items-center shrink-0 cursor-pointer group/opp focus:outline-none transition-transform active:scale-95"
        title={`View ${player.name}'s profile`}
      >
        {/* GAMEPIGEON CIRCULAR AVATAR */}
        <div className="relative">
          {isCurrentTurn && (
            <div className="absolute -inset-1 rounded-full border-2 border-white animate-ping opacity-50 pointer-events-none" />
          )}

          <div
            className={`
              relative w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm sm:text-lg
              transition-all duration-300 shadow-xl group-hover/opp:ring-2 group-hover/opp:ring-[#FF4600]
              ${isCurrentTurn ? 'ring-2 sm:ring-3 ring-white scale-105 shadow-white/50' : 'ring-1.5 ring-white/40'}
              ${!player.isConnected ? 'opacity-50 grayscale' : ''}
            `}
            style={{
              backgroundColor: isCurrentTurn ? '#a3e635' : '#84cc16',
            }}
          >
            <UserAvatar avatar={player.avatar} name={player.name} className="w-full h-full rounded-full" />

            {/* Turn timer badge when it is their turn */}
            {isCurrentTurn && (
              <div className="absolute -bottom-1 -right-1 bg-black/90 text-white font-black text-[7px] sm:text-[8px] px-1 py-0.2 rounded-full shadow-lg font-mono border border-white/60">
                {turnTimeRemaining}s
              </div>
            )}

            {/* Bot / Host Tag */}
            {player.isBot && (
              <div className="absolute -top-1 -right-1 bg-sky-600 text-white text-[6px] sm:text-[7px] font-extrabold px-1 py-0.2 rounded-sm uppercase tracking-wider shadow-sm">
                BOT
              </div>
            )}
            {player.isHost && !player.isBot && (
              <div className="absolute -top-1 -left-1 bg-amber-500 text-slate-950 text-[6px] sm:text-[7px] font-extrabold px-1 py-0.2 rounded-sm uppercase tracking-wider shadow-sm">
                HOST
              </div>
            )}
          </div>
        </div>

        {/* Player Name */}
        <div className="mt-0.5 flex flex-col items-center max-w-[65px] sm:max-w-[85px]">
          <span className="text-[9px] sm:text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] truncate tracking-tight text-center group-hover/opp:text-amber-300 transition-colors">
            {player.name}
          </span>

          {player.cardCount === 1 && (
            <span className="text-[7px] sm:text-[8px] font-black text-amber-300 tracking-wider animate-bounce mt-0.2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              1 CARD!
            </span>
          )}

          {!player.isConnected && (
            <span className="text-[7px] text-red-300 font-semibold mt-0.2">
              Offline
            </span>
          )}
        </div>
      </button>
    </div>
  );
};
