'use client';

import React, { useState } from 'react';
import { AccountProfile } from '@/lib/uno/account';
import { WalletState, formatAddress } from '@/lib/uno/wallet';
import { UserAvatar } from './UserAvatar';
import { formatTokenAmount } from '@/lib/uno/token';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Trophy,
  Copy,
  Check,
  Pencil,
  X,
  Zap,
  Gift,
  Shield,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export interface Crazy8ProfileDashboardProps {
  wallet: WalletState;
  account: AccountProfile | null;
  tokenBalance: string;
  onConnectWallet: () => Promise<void>;
  onOpenProfile: () => void;
  onUpdateName?: (name: string) => void;
  onClaimAirdrop?: () => void;
  isAirdropEligible?: boolean;
  hasClaimedAirdrop?: boolean;
}

export const Crazy8ProfileDashboard: React.FC<Crazy8ProfileDashboardProps> = ({
  wallet,
  account,
  tokenBalance,
  onConnectWallet,
  onOpenProfile,
  onUpdateName,
  onClaimAirdrop,
  isAirdropEligible = false,
  hasClaimedAirdrop = false,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(account?.name || '');
  const [copiedAddress, setCopiedAddress] = useState(false);

  const isConnected = Boolean(wallet.address && account);

  // Derived Stats
  const wins = account?.stats?.wins ?? 0;
  const matches = account?.stats?.matchesPlayed ?? 0;
  const losses = account?.stats?.losses ?? Math.max(0, matches - wins);
  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;

  // Chip Accounting
  const rawBal = parseFloat(tokenBalance) || 0;
  const chipsDisplay = formatTokenAmount(tokenBalance);
  
  const rawEarned = parseFloat(account?.stats?.totalWinnings || '0') || 0;
  const earnedDisplay = rawEarned > 0 ? formatTokenAmount(rawEarned.toString()) : '0';

  const rawLost = parseFloat(account?.stats?.totalLosses || '0') || (losses > 0 ? losses * 100 : 0);
  const lostDisplay = rawLost > 0 ? formatTokenAmount(rawLost.toString()) : '0';

  // Tier determination
  let tierLabel = 'ROOKIE';
  let tierColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
  let tierIcon = '⚡';

  if (rawBal >= 100000 || wins >= 50) {
    tierLabel = 'DIAMOND WHALE';
    tierColor = 'text-cyan-300 border-cyan-400/40 bg-cyan-500/15';
    tierIcon = '💎';
  } else if (rawBal >= 50000 || wins >= 25) {
    tierLabel = 'CARD SHARK';
    tierColor = 'text-purple-300 border-purple-400/40 bg-purple-500/15';
    tierIcon = '🦈';
  } else if (rawBal >= 20000 || wins >= 10) {
    tierLabel = 'HIGH ROLLER';
    tierColor = 'text-amber-300 border-amber-400/40 bg-amber-500/15';
    tierIcon = '👑';
  } else if (rawBal >= 10000 || wins >= 1) {
    tierLabel = 'POT SWEEPER';
    tierColor = 'text-emerald-300 border-emerald-400/40 bg-emerald-500/15';
    tierIcon = '🎴';
  }

  const handleCopy = () => {
    if (!wallet.address) return;
    navigator.clipboard.writeText(wallet.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (onUpdateName) {
      onUpdateName(trimmed);
    }
    setIsEditingName(false);
  };

  return (
    <div className="w-full rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0F1319] via-[#0B0E14] to-[#080A0E] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-3 sm:p-5 relative overflow-hidden backdrop-blur-xl">
      {/* Ambient background glow */}
      <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#FF4600]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Row: Player Info & Wallet Status */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-white/[0.06]">
        {/* Left: Player Profile Details */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar with clickable edit & VIP ring */}
          <div
            onClick={isConnected ? onOpenProfile : () => { onConnectWallet(); }}
            className="relative cursor-pointer group shrink-0"
            title="Edit avatar & profile"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-black to-slate-900 border-2 border-white/[0.12] group-hover:border-[#FF4600] flex items-center justify-center text-2xl sm:text-3xl transition-all duration-300 shadow-lg group-hover:scale-105 overflow-hidden">
              <UserAvatar
                avatar={account?.avatar || '🦊'}
                name={account?.name || 'Player'}
                className="w-full h-full text-2xl sm:text-3xl rounded-2xl"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#FF4600] text-white flex items-center justify-center text-[10px] font-bold border-2 border-[#0B0E14] shadow-sm">
              {tierIcon}
            </div>
          </div>

          {/* Nickname & Wallet Address */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {!isEditingName ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base sm:text-lg font-black text-white truncate max-w-[150px] sm:max-w-[200px]">
                    {isConnected ? account?.name : 'Disconnected'}
                  </span>
                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => {
                        setNameInput(account?.name || '');
                        setIsEditingName(true);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                      title="Edit Nickname"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 animate-in fade-in">
                  <input
                    type="text"
                    value={nameInput}
                    autoFocus
                    maxLength={16}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    className="bg-black/60 border border-[#FF4600] text-white text-xs font-bold rounded-lg px-2.5 py-1 outline-none w-32 sm:w-40"
                    placeholder="Nickname..."
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    className="p-1.5 rounded-lg bg-[#FF4600] text-white hover:brightness-110 cursor-pointer"
                    title="Save"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="p-1.5 rounded-lg bg-white/10 text-slate-300 hover:text-white cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* VIP Tier Badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 ${tierColor}`}>
                <span>{tierIcon}</span>
                <span>{tierLabel}</span>
              </span>
            </div>

            {/* Address & Connection Status */}
            <div className="flex items-center gap-2 mt-1">
              {isConnected ? (
                <>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] text-[10px] font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
                    title="Copy wallet address"
                  >
                    <span>{formatAddress(wallet.address)}</span>
                    {copiedAddress ? (
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-2.5 h-2.5 text-slate-500" />
                    )}
                  </button>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                </>
              ) : (
                <span className="text-[11px] font-medium text-amber-400/90 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-amber-400" />
                  Connect wallet to sync chips & records
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Action / Wallet Connect */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {!isConnected ? (
            <button
              type="button"
              onClick={onConnectWallet}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#FF3700] hover:brightness-110 active:scale-95 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[#FF4600]/25 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Connect Wallet</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {onClaimAirdrop && (
                <button
                  type="button"
                  onClick={onClaimAirdrop}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                    isAirdropEligible
                      ? 'bg-gradient-to-r from-amber-500 to-[#FF4600] hover:brightness-110 active:scale-95 text-white animate-pulse'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-emerald-400'
                  }`}
                  title={isAirdropEligible ? 'Claim 10,000 $CRAZY8 Free Chips' : 'Check 10,000 $CRAZY8 Airdrop Status'}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>{isAirdropEligible ? 'Claim +10K Chips' : '10K Claimed'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenProfile}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Profile Settings</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: 4 Prominent Stat Cards */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-3 sm:mt-4">
        {/* CARD 1: CHIP BALANCE */}
        <div
          onClick={onClaimAirdrop}
          className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 relative overflow-hidden group hover:border-amber-400/40 transition-all cursor-pointer"
          title="Click to view Chips & Airdrop status"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold tracking-wider text-amber-300 uppercase flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              CHIPS
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
              $CRAZY8
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight group-hover:text-amber-200 transition-colors">
              {isConnected ? chipsDisplay : '10,000'}
            </span>
            {!isConnected && (
              <span className="text-[9px] font-mono text-amber-400/80 font-bold">
                (Free Gift)
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-medium">
            <span>Current Balance</span>
            {isAirdropEligible && isConnected && (
              <span className="text-amber-400 font-bold flex items-center gap-0.5 animate-pulse">
                <Sparkles className="w-2.5 h-2.5" /> +10K
              </span>
            )}
          </div>
        </div>

        {/* CARD 2: CHIPS EARNED */}
        <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/25 relative overflow-hidden group hover:border-emerald-400/40 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-300 uppercase flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              EARNED
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-400/20 text-emerald-300 font-bold border border-emerald-400/30">
              POTS WON
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tracking-tight group-hover:text-emerald-300 transition-colors">
              +{earnedDisplay}
            </span>
          </div>

          <div className="mt-1 text-[10px] text-slate-400 font-medium flex items-center justify-between">
            <span>Total Pot Winnings</span>
            <span className="text-emerald-400/80 font-mono text-[9px] font-bold">
              {wins} Pots
            </span>
          </div>
        </div>

        {/* CARD 3: CHIPS LOST */}
        <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/25 relative overflow-hidden group hover:border-rose-400/40 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold tracking-wider text-rose-300 uppercase flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              LOST
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-rose-400/20 text-rose-300 font-bold border border-rose-400/30">
              SPENT
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-rose-400 font-mono tracking-tight group-hover:text-rose-300 transition-colors">
              -{lostDisplay}
            </span>
          </div>

          <div className="mt-1 text-[10px] text-slate-400 font-medium flex items-center justify-between">
            <span>Stakes & Buy-ins</span>
            <span className="text-rose-400/80 font-mono text-[9px] font-bold">
              {losses} Defeats
            </span>
          </div>
        </div>

        {/* CARD 4: GAMES WON & LOST */}
        <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#FF4600]/10 via-[#FF4600]/5 to-transparent border border-[#FF4600]/25 relative overflow-hidden group hover:border-[#FF4600]/40 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono font-bold tracking-wider text-orange-300 uppercase flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-[#FF4600]" />
              RECORD
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.06] text-white font-bold border border-white/[0.1]">
              {winRate}% WR
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
              <span className="text-emerald-400">{wins}W</span>
              <span className="text-slate-600 mx-1">/</span>
              <span className="text-rose-400">{losses}L</span>
            </span>
          </div>

          {/* Mini Win Rate Progress Bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-[#FF4600] rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, winRate)}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-slate-400 font-bold shrink-0">
              {matches} played
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
