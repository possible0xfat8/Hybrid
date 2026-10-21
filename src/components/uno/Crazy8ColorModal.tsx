import React from 'react';
import { CardColor } from '@/types/uno';
import { soundEngine } from '@/lib/uno/audio';
import { CRAZY8_COLORS } from './CardComponent';

interface Crazy8ColorModalProps {
  isOpen: boolean;
  onSelectColor: (color: CardColor) => void;
  onCancel: () => void;
  cardLabel?: string;
}

const SUIT_CHOICES: { color: CardColor; label: string; position: string; isDarkText?: boolean }[] = [
  { color: 'red', label: 'RED', position: 'top-0 left-1/2 -translate-x-1/2' },
  { color: 'blue', label: 'BLUE', position: 'bottom-0 left-1/2 -translate-x-1/2' },
  { color: 'yellow', label: 'YELLOW', position: 'left-0 top-1/2 -translate-y-1/2', isDarkText: true },
  { color: 'green', label: 'GREEN', position: 'right-0 top-1/2 -translate-y-1/2' },
];

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

        {/* 4-CARD COMPASS CROSS (Authentic Color Selection Formation) */}
        <div className="relative w-64 h-64 xs:w-72 xs:h-72 sm:w-80 sm:h-80 flex items-center justify-center my-2">
          {SUIT_CHOICES.map(({ color, label, position, isDarkText }) => {
            const meta = CRAZY8_COLORS[color];
            return (
              <div
                key={color}
                onClick={() => handleSelect(color)}
                className={`absolute ${position} z-20 cursor-pointer transform transition-all duration-150 hover:scale-105 hover:z-30 active:scale-95`}
                title={`Nominate ${label}`}
              >
                <div
                  style={{ backgroundColor: meta.bg }}
                  className={`w-[68px] h-[102px] sm:w-[84px] sm:h-[126px] relative rounded-xl overflow-hidden select-none shrink-0 border-2 sm:border-[2.5px] border-white/95 shadow-xl flex flex-col items-center justify-center ring-2 ${meta.ring}`}
                >
                  <div className={`absolute inset-1 sm:inset-1.5 rounded-lg border ${isDarkText ? 'border-black/30' : 'border-white/80'} pointer-events-none`} />
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${isDarkText ? 'bg-black/20 border-2 border-black/60' : 'bg-white/20 border-2 border-white'} flex items-center justify-center shadow-lg`}>
                    <span className={`font-['Montserrat','Arial_Black',sans-serif] font-black ${isDarkText ? 'text-slate-950 text-[9px] sm:text-[11px]' : 'text-white text-[10px] sm:text-xs'} tracking-wider`}>
                      {label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
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
