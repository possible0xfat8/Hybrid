import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Gift,
  CheckCircle2,
  ExternalLink,
  X,
  Loader2,
  Coins,
  ShieldCheck,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { claimWelcomeAirdrop, CRAZY8_TOKEN_ADDRESS, CRAZY8_AIRDROP_AMOUNT, formatTokenAmount } from '@/lib/uno/token';
import { formatAddress } from '@/lib/uno/wallet';

interface AirdropModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string | null;
  onClaimSuccess: (newBalance: string) => void;
  hasAlreadyClaimed?: boolean;
  tokenBalance?: string;
}

export const AirdropModal: React.FC<AirdropModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
  onClaimSuccess,
  hasAlreadyClaimed = false,
  tokenBalance = '10000',
}) => {
  const [claiming, setClaiming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justClaimed, setJustClaimed] = useState(false);

  if (!isOpen) return null;

  const isClaimedState = justClaimed || hasAlreadyClaimed;

  const handleClaim = async () => {
    if (!walletAddress || hasAlreadyClaimed) return;
    setClaiming(true);
    setError(null);

    const result = await claimWelcomeAirdrop(walletAddress);
    setClaiming(false);

    if (result.success && result.balance) {
      setTxHash(result.txHash || null);
      setJustClaimed(true);
      onClaimSuccess(result.balance);

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FF4600', '#FF8000', '#FFD700', '#10B981'],
      });
    } else {
      setError(result.error || 'Failed to claim airdrop. You may have already claimed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#0C0F14] border border-white/[0.08] rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative text-center overflow-hidden">
        <div className="flex justify-end mb-1">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isClaimedState ? (
          <>
            {/* Header Icon */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-[#FF4600]">
              <Gift className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[#FF4600] font-mono text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">
              Hemi Sepolia Testnet Airdrop
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
              Claim 10,000 $CRAZY8
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              Welcome to <strong className="text-white">Hemi Crazy 8</strong>! Claim your free gasless testnet chips to join tables, bet on pots, and win real match rewards.
            </p>

            {/* Airdrop Specs Box */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-5 text-left space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Airdrop Amount:</span>
                <span className="font-bold text-white">10,000 $CRAZY8</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Gas Fee:</span>
                <span className="font-medium text-emerald-400">0.00 ETH (Sponsored)</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Claim Limit:</span>
                <span className="text-slate-300">1 Time per Wallet (On-Chain)</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2 mb-4 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleClaim}
              disabled={claiming || !walletAddress}
              className="w-full py-3 rounded-xl bg-[#FF4600] hover:bg-[#FF5500] text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispensing on Hemi Sepolia...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Claim 10,000 Free Chips</span>
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">
              {justClaimed ? 'Airdrop Received' : 'Already Claimed'}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
              {justClaimed ? '10,000 $CRAZY8 Received!' : '10,000 $CRAZY8 Claimed'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
              {justClaimed
                ? '10,000 $CRAZY8 tokens have landed in your wallet. You are ready to enter game tables, place bets, and compete for the 95% winner escrow pot!'
                : `This wallet (${formatAddress(walletAddress)}) has already claimed its one-time 10,000 $CRAZY8 welcome grant.`}
            </p>

            {/* Airdrop Status Details Box */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-5 text-left space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Wallet:</span>
                <span className="font-bold text-white">{formatAddress(walletAddress)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Chip Balance:</span>
                <span className="font-bold text-amber-400">{formatTokenAmount(tokenBalance || '10000')} $CRAZY8</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Claim Status:</span>
                <span className="font-medium text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Claimed (1 per wallet)
                </span>
              </div>
            </div>

            {txHash && (
              <a
                href={`https://testnet.explorer.hemi.xyz/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-300 hover:text-white transition-colors font-mono mb-6"
              >
                <span>View on Hemi Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#FF4600] hover:bg-[#FF5500] text-white font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer"
            >
              {justClaimed ? "Let's Play Crazy 8!" : "Back to Arcade"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
