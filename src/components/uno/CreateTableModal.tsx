import React, { useState } from 'react';
import { X, Users, Sparkles, Coins, ArrowRight, Shield } from 'lucide-react';

interface CreateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (playerName: string, avatar: string, buyIn: string, address?: string) => void;
  playerName: string;
  avatar: string;
  walletAddress?: string;
  tokenBalance?: string;
  onConnectWallet?: () => void;
}

const MODES = [
  { id: 'Classic', title: 'Classic', desc: 'The original official rules for 2-5 players.', icon: '🎴' },
  { id: 'Stacked Draw', title: 'Stacked Draw', desc: 'Defend and stack +2 and +4 cards to force rivals to draw!', icon: '⚡' },
  { id: 'Quick Match', title: 'Quick Match', desc: 'Short 15s turn timer with fast animations.', icon: '⏱️' },
];

const STAKE_OPTIONS = [
  { label: '50', value: '50', isStaking: true },
  { label: '100', value: '100', isStaking: true, recommended: true },
  { label: '250', value: '250', isStaking: true },
  { label: '500', value: '500', isStaking: true },
  { label: '1000', value: '1000', isStaking: true },
  { label: 'Non-Staking', value: 'Free', isStaking: false },
];

export const CreateTableModal: React.FC<CreateTableModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  playerName,
  avatar,
  walletAddress,
  tokenBalance = '10000',
  onConnectWallet,
}) => {
  const [selectedMode, setSelectedMode] = useState('Classic');
  const [selectedBuyIn, setSelectedBuyIn] = useState('100'); // Default to 100 chips stake

  if (!isOpen) return null;

  const currentBalNum = parseFloat(tokenBalance || '0');
  const selectedStakeNum = selectedBuyIn === 'Free' ? 0 : parseFloat(selectedBuyIn || '0');
  const hasInsufficientTokens = selectedStakeNum > 0 && currentBalNum < selectedStakeNum;

  const handleCreate = () => {
    if (!walletAddress) {
      if (onConnectWallet) onConnectWallet();
      return;
    }
    if (hasInsufficientTokens) return;
    const buyInValue = selectedBuyIn === 'Free' ? '0' : selectedBuyIn;
    onCreateRoom(playerName, avatar, buyInValue, walletAddress);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0C0F14] border border-white/[0.08] rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-y-auto max-h-[92vh] sm:max-h-[90vh] custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/[0.06] mb-4 sm:mb-6">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/[0.06] border border-white/[0.08] text-[#FF4600] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Create Table</h2>
              <p className="text-[10px] sm:text-xs text-slate-400">Host your own room with custom rules</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Game Mode Selector */}
        <div className="space-y-2.5 sm:space-y-3 mb-4 sm:mb-6">
          <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Select Game Mode
          </label>
          <div className="grid grid-cols-1 gap-2">
            {MODES.map((m) => {
              const active = selectedMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedMode(m.id)}
                  type="button"
                  className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                    active
                      ? 'bg-white/[0.06] border-[#FF4600]/60 text-white shadow-sm'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] text-slate-300'
                  }`}
                >
                  <span className="text-xl sm:text-2xl shrink-0">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 sm:gap-2">
                      <span>{m.title}</span>
                      {active && (
                        <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-[#FF4600]/20 border border-[#FF4600]/40 text-[#FF4600] font-semibold">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-400 truncate">{m.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Buy-In Selection */}
        <div className="mb-5 sm:mb-7">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
            <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Table Stake Chips ($CRAZY8)
            </label>
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-slate-400">Balance:</span>
              <span className="font-bold text-slate-200 font-mono">
                {parseFloat(tokenBalance || '0').toLocaleString()} $CRAZY8
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
            {STAKE_OPTIONS.map((opt) => {
              const active = selectedBuyIn === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSelectedBuyIn(opt.value)}
                  type="button"
                  className={`py-2 sm:py-2.5 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs font-mono font-bold transition-all text-center border cursor-pointer relative ${
                    active
                      ? 'bg-[#FF4600] text-white border-[#FF4600] shadow-sm'
                      : 'bg-white/[0.03] text-slate-300 border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]'
                  }`}
                >
                  <div>{opt.label}</div>
                  {opt.recommended && (
                    <div className={`text-[8px] font-sans uppercase font-medium ${active ? 'text-white/80' : 'text-slate-400'}`}>Standard</div>
                  )}
                  {!opt.isStaking && (
                    <div className={`text-[8px] font-sans uppercase font-medium ${active ? 'text-white/80' : 'text-slate-400'}`}>Free</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Staking summary */}
          <div className="mt-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] flex items-center justify-between">
            {selectedStakeNum > 0 ? (
              <span className="text-slate-300">
                Debits <strong className="text-white font-mono">{selectedStakeNum} $CRAZY8</strong> into the pot.
              </span>
            ) : (
              <span className="text-slate-300 font-medium">
                Casual Play: No chips debited.
              </span>
            )}
            <span className="text-[10px] text-slate-400 font-mono">
              {selectedStakeNum > 0 ? '95% Winner Payout' : 'Practice'}
            </span>
          </div>

          {hasInsufficientTokens && (
            <div className="mt-2 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium flex items-center gap-2">
              <span>⚠️ Insufficient test tokens. Balance: {currentBalNum.toLocaleString()} $CRAZY8. Choose a lower stake or Non-Staking.</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        {!walletAddress ? (
          <button
            onClick={() => {
              if (onConnectWallet) onConnectWallet();
            }}
            className="w-full py-2.5 sm:py-3 rounded-xl bg-[#FF4600] hover:bg-[#FF5500] text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Connect Wallet to Create Table</span>
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={hasInsufficientTokens}
            className={`w-full py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              hasInsufficientTokens
                ? 'bg-white/[0.04] text-slate-500 cursor-not-allowed border border-white/[0.06]'
                : 'bg-[#FF4600] hover:bg-[#FF5500] text-white active:scale-98 shadow-md cursor-pointer'
            }`}
          >
            <span>
              {hasInsufficientTokens
                ? 'Insufficient $CRAZY8 Chips'
                : selectedStakeNum > 0
                ? `Stake ${selectedStakeNum} $CRAZY8 & Open Table`
                : 'Create Non-Staking Table'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
