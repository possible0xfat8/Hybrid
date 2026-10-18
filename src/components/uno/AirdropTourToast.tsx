import React, { useEffect, useState, useCallback } from 'react';
import { Gift, Sparkles, ArrowUp, X, Coins, Zap, Check } from 'lucide-react';

interface AirdropTourToastProps {
  isVisible: boolean;
  targetId: string;
  isWalletConnected: boolean;
  onClaimClick: () => void;
  onDismiss: () => void;
}

export const AirdropTourToast: React.FC<AirdropTourToastProps> = ({
  isVisible,
  targetId,
  isWalletConnected,
  onClaimClick,
  onDismiss,
}) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  const updatePosition = useCallback(() => {
    const el = document.getElementById(targetId);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect(r);
    }
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, [targetId]);

  useEffect(() => {
    if (!isVisible) return;

    updatePosition();

    // Check multiple times during initial mount/render to handle animations/font loading
    const timer1 = setTimeout(updatePosition, 80);
    const timer2 = setTimeout(updatePosition, 300);
    const timer3 = setTimeout(updatePosition, 700);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isVisible, updatePosition]);

  if (!isVisible) return null;

  // Calculate layout geometry
  const cardWidth = Math.min(360, windowSize.width - 32);
  const targetCenterX = rect ? rect.left + rect.width / 2 : windowSize.width - 100;
  const targetBottom = rect ? rect.bottom : 56;
  const targetTop = rect ? rect.top : 12;
  const targetLeft = rect ? rect.left : windowSize.width - 120;
  const targetW = rect ? rect.width : 100;
  const targetH = rect ? rect.height : 36;

  // Clamp card within screen with 16px safety padding
  const idealLeft = targetCenterX - cardWidth / 2;
  const clampedLeft = Math.max(16, Math.min(windowSize.width - cardWidth - 16, idealLeft));
  const cardTop = targetBottom + 20;

  // Arrow offset relative to card
  const arrowOffsetLeft = Math.max(24, Math.min(cardWidth - 24, targetCenterX - clampedLeft));

  return (
    <div className="fixed inset-0 z-40 pointer-events-auto select-none animate-in fade-in duration-300">
      {/* 1. Darkened Backdrop Overlay with SVG Cutout Mask */}
      {/* Clicks on darkened areas are intercepted and blocked */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto"
        onClick={(e) => {
          // Block accidental background clicks
          e.stopPropagation();
        }}
      >
        <defs>
          <mask id="airdrop-tour-mask">
            {/* White = opaque backdrop */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black = transparent cutout hole over the Gift button */}
            {rect && (
              <rect
                x={targetLeft - 5}
                y={targetTop - 4}
                width={targetW + 10}
                height={targetH + 8}
                rx="10"
                ry="10"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Deep darkened screen that prevents interaction with other elements */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(4, 7, 13, 0.82)"
          mask="url(#airdrop-tour-mask)"
        />
      </svg>

      {/* 2. Glowing Spotlight Frame around the Gift symbol */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            top: targetTop - 4,
            left: targetLeft - 5,
            width: targetW + 10,
            height: targetH + 8,
          }}
          className="pointer-events-none rounded-xl ring-2 ring-[#FF4600] ring-offset-2 ring-offset-[#0C0F14] shadow-[0_0_30px_rgba(255,70,0,0.8),inset_0_0_15px_rgba(255,70,0,0.4)] animate-pulse"
        >
          {/* Animated beacon waves expanding outward */}
          <div className="absolute -inset-2 rounded-2xl border-2 border-[#FF4600]/40 animate-ping pointer-events-none" />
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FF4600] shadow-[0_0_8px_#FF4600] animate-bounce" />
        </div>
      )}

      {/* 3. Interactive click target overlay directly over the Gift button */}
      {rect && (
        <button
          style={{
            position: 'fixed',
            top: targetTop - 4,
            left: targetLeft - 5,
            width: targetW + 10,
            height: targetH + 8,
          }}
          onClick={onClaimClick}
          className="cursor-pointer rounded-xl z-50 bg-transparent active:scale-95 transition-transform"
          title="Click to claim your 10,000 $CRAZY8 chips!"
          aria-label="Claim your 10,000 $CRAZY8 chips"
        />
      )}

      {/* 4. Animated Pointer Arrow pointing up to the Gift Button */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            top: targetBottom + 2,
            left: targetCenterX - 14,
          }}
          className="z-50 pointer-events-none flex flex-col items-center animate-bounce"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#FF4600] to-[#E03E00] text-white flex items-center justify-center shadow-[0_0_18px_rgba(255,70,0,0.9)] border border-white/30">
            <ArrowUp className="w-4 h-4 stroke-[3]" />
          </div>
        </div>
      )}

      {/* 5. Modern Tour Toast / Popover Card */}
      <div
        style={{
          position: 'fixed',
          top: cardTop,
          left: clampedLeft,
          width: cardWidth,
        }}
        className="z-50 bg-[#0C1017]/95 backdrop-blur-xl border border-white/[0.14] rounded-2xl p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(255,70,0,0.25)] relative text-left animate-in slide-in-from-top-3 duration-200"
      >
        {/* Decorative Top Arrow Notch pointing to the Gift button */}
        <div
          style={{ left: arrowOffsetLeft - 8 }}
          className="absolute -top-2 w-4 h-4 rotate-45 bg-[#0C1017] border-l border-t border-white/[0.14]"
        />

        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FF4600]/15 border border-[#FF4600]/30 flex items-center justify-center text-[#FF4600] shadow-[0_0_10px_rgba(255,70,0,0.3)]">
              <Gift className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono font-bold text-[#FF6B00] uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-[#FF4600]" />
              <span>New Player Gift</span>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="w-6 h-6 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Dismiss Tour"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 tracking-tight flex items-center gap-1.5">
          Claim 10,000 $CRAZY8 Chips!
        </h3>

        {/* Explanation */}
        <p className="text-xs text-slate-300 leading-relaxed mb-3.5">
          {isWalletConnected
            ? 'You are eligible for your free welcome bonus! Click the highlighted Gift icon above to receive 10,000 chips and start playing.'
            : 'Welcome to Hemi Crazy 8! Click the highlighted Gift icon above to connect and claim your free 10,000 testnet chips.'}
        </p>

        {/* Feature Pills */}
        <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4 text-[10px] font-mono text-slate-300">
          <div className="flex flex-col items-center text-center p-1">
            <Coins className="w-3.5 h-3.5 text-[#FF4600] mb-0.5" />
            <span className="font-bold text-white">10,000</span>
            <span className="text-[8px] text-slate-400">Chips</span>
          </div>
          <div className="flex flex-col items-center text-center p-1 border-x border-white/[0.06]">
            <Zap className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
            <span className="font-bold text-white">0 ETH</span>
            <span className="text-[8px] text-slate-400">Gasless</span>
          </div>
          <div className="flex flex-col items-center text-center p-1">
            <Check className="w-3.5 h-3.5 text-emerald-400 mb-0.5" />
            <span className="font-bold text-white">1-Time</span>
            <span className="text-[8px] text-slate-400">Bonus</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClaimClick}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#FF4600] to-[#FF5500] hover:from-[#FF5500] hover:to-[#FF6600] text-white text-xs font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(255,70,0,0.4)] active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>{isWalletConnected ? 'Claim 10,000 Chips' : 'Connect & Claim'}</span>
          </button>

          <button
            onClick={onDismiss}
            className="py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Skip
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-2.5 text-[10px] text-slate-400 text-center font-sans">
          💡 Clicking anywhere outside is paused until you claim or skip.
        </div>
      </div>
    </div>
  );
};
