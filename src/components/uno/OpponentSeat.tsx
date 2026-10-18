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
}) => {
  // Determine if card stack sits to the left, right, or top of the avatar
  const effectiveStackPlacement: 'left' | 'right' | 'top' =
    stackPlacement || (sidePosition === 'left' ? 'left' : sidePosition === 'top' ? 'top' : 'right');

  const isTopStack = effectiveStackPlacement === 'top';

  return (
    <div
      id={`opponent-seat-${player.id}`}
      className={`relative flex items-center select-none ${
        isTopStack
          ? 'flex-col gap-1'
          : effectiveStackPlacement === 'left'
          ? 'flex-row gap-1.5 xs:gap-2 sm:gap-2.5'
          : 'flex-row-reverse gap-1.5 xs:gap-2 sm:gap-2.5'
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

      {/* Avatar & Name Column */}
      <div className="flex flex-col items-center">
        {/* GAMEPIGEON CIRCULAR AVATAR (Screenshots 1 & 2) */}
        <div className="relative">
          {isCurrentTurn && (
            <div className="absolute -inset-1 rounded-full border-2 border-white animate-ping opacity-50 pointer-events-none" />
          )}

          <div
            className={`
              relative w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm xs:text-base sm:text-xl
              transition-all duration-300 shadow-xl
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
              <div className="absolute -top-1 -right-1 bg-sky-600 text-white text-[5px] xs:text-[6px] sm:text-[7px] font-extrabold px-0.8 rounded-sm uppercase tracking-wider shadow-sm">
                BOT
              </div>
            )}
            {player.isHost && !player.isBot && (
              <div className="absolute -top-1 -left-1 bg-amber-500 text-slate-950 text-[5px] xs:text-[6px] sm:text-[7px] font-extrabold px-0.8 rounded-sm uppercase tracking-wider shadow-sm">
                HOST
              </div>
            )}
          </div>
        </div>

        {/* Player Name (GamePigeon Typography: Screenshot 2) */}
        <div className="mt-0.5 flex flex-col items-center max-w-[55px] xs:max-w-[65px] sm:max-w-[85px]">
          <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] truncate tracking-tight text-center">
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
      </div>
    </div>
  );
};
