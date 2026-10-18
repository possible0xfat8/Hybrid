import React, { useState } from 'react';
import { FloatingEmote } from '../types';

interface ReactionWheelProps {
  onSendEmote: (emoji: string, text?: string) => void;
}

const PRESET_EMOTES = [
  { emoji: '🐸', label: 'Pepe' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '😂', label: 'Lmao' },
  { emoji: '😵', label: 'Tilt' },
  { emoji: '💀', label: 'Dead' },
  { emoji: '🚀', label: 'LFG' },
  { emoji: '🏆', label: 'GG' },
  { emoji: '🤡', label: 'Clown' },
];

export const ReactionWheel: React.FC<ReactionWheelProps> = ({ onSendEmote }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-slate-800/90 border border-slate-700 hover:border-amber-400 hover:bg-slate-700 text-lg flex items-center justify-center shadow-lg transition-all active:scale-95"
        title="Send Emote / Reaction"
      >
        🐸
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-12 right-0 z-50 p-2 bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-md grid grid-cols-4 gap-2 w-48 animate-in zoom-in-90 duration-150">
            {PRESET_EMOTES.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  onSendEmote(item.emoji, item.label);
                  setIsOpen(false);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/60 hover:bg-amber-500/20 hover:scale-125 transition-all text-xl"
                title={item.label}
              >
                {item.emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const FloatingEmoteDisplay: React.FC<{ emotes: FloatingEmote[]; targetPlayerId: string }> = ({
  emotes,
  targetPlayerId,
}) => {
  const playerEmotes = emotes.filter((e) => e.playerId === targetPlayerId);

  return (
    <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center">
      {playerEmotes.map((e) => (
        <div
          key={e.id}
          className="animate-bounce text-3xl sm:text-4xl filter drop-shadow-md transition-opacity duration-1000"
        >
          {e.emoji}
        </div>
      ))}
    </div>
  );
};
