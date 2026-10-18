import React from 'react';
import { X } from 'lucide-react';
import { CardComponent } from './CardComponent';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150 select-none">
      <div className="bg-[#0C0F14] border border-white/[0.08] rounded-2xl sm:rounded-3xl p-4 sm:p-7 max-w-lg w-full shadow-2xl text-slate-100 relative max-h-[92vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-white/[0.08] mb-3 sm:mb-4 sticky top-0 bg-[#0C0F14]/95 backdrop-blur-sm z-20">
          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <h3 className="font-['Montserrat','Arial_Black',sans-serif] font-bold text-sm sm:text-base text-white tracking-wide text-center flex-1 pr-7 sm:pr-8">
            How to play CRAZY 8
          </h3>
        </div>

        {/* Special cards section */}
        <div className="space-y-5 text-sm">
          <div>
            <h4 className="font-['Montserrat','Arial_Black',sans-serif] font-bold text-base sm:text-lg text-white tracking-tight mb-3">
              Special cards:
            </h4>
          </div>

          {/* 1. Crazy 8 */}
          <div className="space-y-2 pb-3.5 border-b border-white/[0.06]">
            <h5 className="font-bold text-sm text-white">
              Crazy 8
            </h5>
            <div className="flex items-center gap-4">
              <div className="shrink-0 p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] shadow-inner">
                <CardComponent
                  card={{ id: 'preview-8', color: 'wild', value: '8', label: 'Crazy 8' }}
                  size="sm"
                  isPlayable={false}
                />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Can be played on any card on the discard pile, and allows you to change its color.
              </p>
            </div>
          </div>

          {/* 2. Skip */}
          <div className="space-y-2 pb-3.5 border-b border-white/[0.06]">
            <h5 className="font-bold text-sm text-white">
              Skip
            </h5>
            <div className="flex items-center gap-4">
              <div className="shrink-0 p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] shadow-inner">
                <CardComponent
                  card={{ id: 'preview-skip', color: 'red', value: 'skip', label: 'Skip' }}
                  size="sm"
                  isPlayable={false}
                />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Next player loses their turn.
              </p>
            </div>
          </div>

          {/* 3. Reverse */}
          <div className="space-y-2 pb-3.5 border-b border-white/[0.06]">
            <h5 className="font-bold text-sm text-white">
              Reverse
            </h5>
            <div className="flex items-center gap-4">
              <div className="shrink-0 p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] shadow-inner">
                <CardComponent
                  card={{ id: 'preview-reverse', color: 'green', value: 'reverse', label: 'Reverse' }}
                  size="sm"
                  isPlayable={false}
                />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Changes the direction of play.
              </p>
            </div>
          </div>

          {/* 4. Draw 2 */}
          <div className="space-y-2 pb-3.5 border-b border-white/[0.06]">
            <h5 className="font-bold text-sm text-white">
              Draw 2
            </h5>
            <div className="flex items-center gap-4">
              <div className="shrink-0 p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] shadow-inner">
                <CardComponent
                  card={{ id: 'preview-draw2', color: 'blue', value: 'draw2', label: 'Draw 2' }}
                  size="sm"
                  isPlayable={false}
                />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Next player draws 2 cards and skips their turn. If the next player has a Draw 2 card of their own, they can defend and stack it.
              </p>
            </div>
          </div>

          {/* 5. Crazy Draw 4 */}
          <div className="space-y-2 pb-3.5 border-b border-white/[0.06]">
            <h5 className="font-bold text-sm text-white">
              Crazy Draw 4
            </h5>
            <div className="flex items-center gap-4">
              <div className="shrink-0 p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] shadow-inner">
                <CardComponent
                  card={{ id: 'preview-draw4', color: 'wild', value: 'wild_draw4', label: 'Crazy Draw 4' }}
                  size="sm"
                  isPlayable={false}
                />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Can be played on any card, allows changing color, and makes next player draw 4 cards unless countered with another Draw 4.
              </p>
            </div>
          </div>

          {/* Objective & Turn Rules */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs text-slate-300">
            <div className="font-bold text-[#FF4600] text-sm flex items-center gap-1.5">
              <span>🎯</span>
              <span>Goal & Turn Flow</span>
            </div>
            <p>• Shed all your cards first to win the match and claim the Hemi crypto pot!</p>
            <p>• Play a card matching either the active suit/color or the number of the top card.</p>
            <p>• Crazy 8 and Crazy Draw 4 allow you to nominate any active suit when played.</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 rounded-2xl bg-[#FF4600] hover:bg-[#FF5500] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer"
        >
          Got It, Let's Play!
        </button>
      </div>
    </div>
  );
};
