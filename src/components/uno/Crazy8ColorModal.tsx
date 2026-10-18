import React from 'react';
import { CardColor } from '@/types/uno';
import { CardComponent } from './CardComponent';
import { soundEngine } from '@/lib/uno/audio';

interface Crazy8ColorModalProps {
  isOpen: boolean;
  onSelectColor: (color: CardColor) => void;
  onCancel: () => void;
  cardLabel?: string;
}

export const Crazy8ColorModal: React.FC<Crazy8ColorModalProps> = ({
  isOpen,
  onSelectColor,
  onCancel,
  cardLabel = 'Crazy 8',
}) => {
  if (!isOpen) return null;

  const handleSelect = (color: CardColor) => {
    soundEngine.play('wild');
    onSelectColor(color);
  };

  const isDraw4 = cardLabel.includes('+4');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="relative flex flex-col items-center justify-center max-w-lg w-full">
        {/* Title Tag */}
        <div className="mb-4 text-center">
          <div className="inline-block px-3.5 py-1 rounded-full bg-white/15 border border-white/40 text-white font-mono text-xs font-black tracking-widest uppercase mb-1.5 shadow-xl">
            {isDraw4 ? '⚡ CRAZY DRAW 4' : '★ NOMINATE SUIT COLOR'}
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            Tap a card to choose the active color:
          </p>
        </div>

        {/* 4-CARD COMPASS CROSS (Authentic GamePigeon Formation: Screenshot 3) */}
        <div className="relative w-64 h-64 xs:w-72 xs:h-72 sm:w-80 sm:h-80 flex items-center justify-center my-2">
          {/* TOP: RED 8 */}
          <div
            onClick={() => handleSelect('red')}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-20 cursor-pointer transform transition-all duration-150 hover:scale-105 hover:z-30 active:scale-95"
            title="Nominate RED"
          >
            <CardComponent
              card={{ id: 'c8_red', color: 'red', value: '8', label: '8' }}
              isPlayable
              size="md"
              className="ring-2 ring-white/60 shadow-xl shadow-black/80"
            />
          </div>

          {/* BOTTOM: BLUE 8 */}
          <div
            onClick={() => handleSelect('blue')}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 z-20 cursor-pointer transform transition-all duration-150 hover:scale-105 hover:z-30 active:scale-95"
            title="Nominate BLUE"
          >
            <CardComponent
              card={{ id: 'c8_blue', color: 'blue', value: '8', label: '8' }}
              isPlayable
              size="md"
              className="ring-2 ring-white/60 shadow-xl shadow-black/80"
            />
          </div>

          {/* LEFT: YELLOW 8 */}
          <div
            onClick={() => handleSelect('yellow')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 cursor-pointer transform transition-all duration-150 hover:scale-105 hover:z-30 active:scale-95"
            title="Nominate YELLOW"
          >
            <CardComponent
              card={{ id: 'c8_yellow', color: 'yellow', value: '8', label: '8' }}
              isPlayable
              size="md"
              className="ring-2 ring-white/60 shadow-xl shadow-black/80"
            />
          </div>

          {/* RIGHT: GREEN 8 */}
          <div
            onClick={() => handleSelect('green')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 cursor-pointer transform transition-all duration-150 hover:scale-105 hover:z-30 active:scale-95"
            title="Nominate GREEN"
          >
            <CardComponent
              card={{ id: 'c8_green', color: 'green', value: '8', label: '8' }}
              isPlayable
              size="md"
              className="ring-2 ring-white/60 shadow-xl shadow-black/80"
            />
          </div>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="mt-5 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-colors border border-white/[0.08] shadow-md cursor-pointer"
        >
          Cancel & Pick Another Card
        </button>
      </div>
    </div>
  );
};
