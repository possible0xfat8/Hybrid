'use client';

import React, { useState, useEffect } from 'react';
import { UserAvatar } from '../uno/UserAvatar';
import { formatAddress } from '@/lib/uno/wallet';
import { formatTokenAmount } from '@/lib/uno/token';
import {
  X,
  Trophy,
  Coins,
  Flame,
  Zap,
  Copy,
  Check,
  ExternalLink,
  Swords,
  Layers,
  UserPlus,
  UserCheck,
  Shield,
  Crown,
  Sparkles,
  Bot,
  Circle,
  Gamepad2,
  TrendingUp,
} from 'lucide-react';

export interface UserProfileTarget {
  id?: string;
  name?: string;
  avatar?: string;
  address?: string;
  isBot?: boolean;
  tag?: string;
  bio?: string;
  status?: string;
  score?: number;
  tokenBalance?: number | string;
  stats?: {
    matchesPlayed?: number;
    wins?: number;
    losses?: number;
    cardsPlayed?: number;
    totalWinnings?: string;
    totalLosses?: string;
    winRate?: number;
  };
  chessElo?: number;
  connect4Wins?: number;
}

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfileTarget | null;
  currentUserAddress?: string | null;
  currentUserId?: string | null;
  onChallenge?: (user: UserProfileTarget) => void;
}

const KNOWN_BOTS = new Set([
  'lumibear',
  'neodash',
  'cyberpepe',
  'soliditysam',
  'chadcard',
  'foxcardist',
  'tobz',
  'dragonace',
  'zyro',
  'quantumbyte',
  'hemi chess bot',
  'hemi bot',
]);

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  currentUserAddress,
  currentUserId,
  onChallenge,
}) => {
  const [copied, setCopied] = useState(false);
  const [friendStatus, setFriendStatus] = useState<'idle' | 'sending' | 'sent' | 'friends'>('idle');
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) {
      setEnrichedData(null);
      setFriendStatus('idle');
      return;
    }

    // Determine if bot
    const isBot =
      user.isBot ||
      (user.id && user.id.toLowerCase().includes('bot')) ||
      (user.name && KNOWN_BOTS.has(user.name.toLowerCase().trim()));

    if (isBot) {
      setEnrichedData(null);
      return;
    }

    // If human with address or id, attempt to fetch live profile data from database
    const targetAddr = user.address?.trim().toLowerCase();
    const targetId = user.id?.trim();

    if (targetAddr && targetAddr.startsWith('0x')) {
      setLoading(true);
      fetch(`/api/profile/by-address/${encodeURIComponent(targetAddr)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && !data.error) {
            setEnrichedData(data);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else if (targetId && !targetId.startsWith('bot_')) {
      setLoading(true);
      fetch(`/api/profile/${encodeURIComponent(targetId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && !data.error) {
            setEnrichedData(data);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, user?.id, user?.address]);

  if (!isOpen || !user) return null;

  // Merge provided user object with live enriched database records
  const isBot =
    user.isBot ||
    (user.id && user.id.toLowerCase().includes('bot')) ||
    (user.name && KNOWN_BOTS.has(user.name.toLowerCase().trim()));

  const name = enrichedData?.name || user.name || (user.address ? formatAddress(user.address) : 'Arcade Player');
  const avatar = enrichedData?.avatar || user.avatar || '🦊';
  const address = user.address || enrichedData?.address;
  const bio =
    enrichedData?.bio ||
    user.bio ||
    (isBot ? 'Hybrid Resident AI Challenger. Always down for a fast match!' : 'Crazy 8 Pot Sweeper & Hybrid Challenger');

  const matchesPlayed =
    enrichedData?.stats?.matchesPlayed ??
    user.stats?.matchesPlayed ??
    (isBot ? 42 : 0);

  const wins =
    enrichedData?.stats?.wins ??
    user.stats?.wins ??
    (isBot ? 28 : 0);

  const losses =
    enrichedData?.stats?.losses ??
    user.stats?.losses ??
    Math.max(0, matchesPlayed - wins);

  const winRate =
    matchesPlayed > 0
      ? Math.round((wins / matchesPlayed) * 100)
      : isBot
      ? 67
      : 0;

  const rawChips =
    enrichedData?.tokenBalance !== undefined
      ? enrichedData.tokenBalance
      : user.tokenBalance !== undefined
      ? user.tokenBalance
      : isBot
      ? 38000
      : 10000;

  const chipsDisplay = formatTokenAmount(String(rawChips));

  const totalWinnings =
    enrichedData?.stats?.totalWinnings ||
    user.stats?.totalWinnings ||
    (isBot ? '32000' : '0');

  const isMe =
    (currentUserAddress && address && currentUserAddress.toLowerCase() === address.toLowerCase()) ||
    (currentUserId && user.id && currentUserId === user.id);

  // VIP / Tier Badge
  let tierName = 'ARCADE ROOKIE';
  let tierColor = 'text-slate-400 bg-white/[0.04] border-white/[0.08]';
  let tierIcon = <Sparkles className="w-3.5 h-3.5 text-slate-400" />;

  const numericChips = typeof rawChips === 'number' ? rawChips : parseFloat(rawChips) || 0;
  if (isBot) {
    tierName = 'AI BOT CHALLENGER';
    tierColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    tierIcon = <Bot className="w-3.5 h-3.5 text-cyan-400" />;
  } else if (numericChips >= 100000 || wins >= 50) {
    tierName = 'DIAMOND WHALE';
    tierColor = 'text-cyan-300 bg-cyan-500/15 border-cyan-400/40';
    tierIcon = <Crown className="w-3.5 h-3.5 text-cyan-300" />;
  } else if (numericChips >= 50000 || wins >= 25) {
    tierName = 'CARD SHARK';
    tierColor = 'text-purple-300 bg-purple-500/15 border-purple-400/40';
    tierIcon = <Flame className="w-3.5 h-3.5 text-purple-300" />;
  } else if (numericChips >= 20000 || wins >= 10) {
    tierName = 'HIGH ROLLER';
    tierColor = 'text-amber-300 bg-amber-500/15 border-amber-400/40';
    tierIcon = <Trophy className="w-3.5 h-3.5 text-amber-300" />;
  } else if (wins >= 1) {
    tierName = 'POT SWEEPER';
    tierColor = 'text-emerald-300 bg-emerald-500/15 border-emerald-400/40';
    tierIcon = <Zap className="w-3.5 h-3.5 text-emerald-300" />;
  }

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendFriendReq = () => {
    if (!currentUserId || !address || isMe || isBot) return;
    setFriendStatus('sending');
    fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUserId,
        targetQuery: address,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setFriendStatus('sent');
        } else {
          setFriendStatus('idle');
        }
      })
      .catch(() => setFriendStatus('idle'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="bg-[#0C0F14] border border-white/[0.1] rounded-3xl max-w-lg w-full p-4 sm:p-6 md:p-7 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh] custom-scrollbar animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Effects */}
        <div className="absolute -right-20 -top-20 w-56 h-56 rounded-full bg-[#FF4600]/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-56 h-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/[0.08] relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold">
              Player Identity
            </span>
            {isMe && (
              <span className="px-2 py-0.5 rounded-full bg-[#FF4600]/20 border border-[#FF4600]/40 text-[#FF4600] text-[10px] font-mono font-bold">
                YOU
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Profile Info Section */}
        <div className="py-4 sm:py-5 flex flex-col items-center text-center relative z-10">
          {/* Avatar with Halo Ring */}
          <div className="relative mb-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-2 border-white/[0.15] shadow-2xl flex items-center justify-center text-4xl sm:text-5xl overflow-hidden relative group">
              <UserAvatar avatar={avatar} name={name} className="w-full h-full text-4xl sm:text-5xl rounded-3xl" />
            </div>
            {/* Online Indicator Dot */}
            <div
              className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#0C0F14] flex items-center justify-center text-[10px] shadow-lg ${
                isBot
                  ? 'bg-cyan-500 text-white'
                  : 'bg-emerald-500 text-white animate-pulse'
              }`}
              title={isBot ? 'Arcade AI Bot' : 'Player Online'}
            >
              {isBot ? '🤖' : '✓'}
            </div>
          </div>

          {/* Name & Title */}
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 justify-center">
            <span>{name}</span>
          </h2>

          {/* Tier / Role Badge */}
          <div className="mt-1.5 flex items-center gap-2 flex-wrap justify-center">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${tierColor}`}>
              {tierIcon}
              <span>{tierName}</span>
            </span>

            {address && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>Verified Hemi</span>
              </span>
            )}
          </div>

          {/* Bio */}
          <p className="mt-2.5 text-xs text-slate-300 max-w-sm leading-relaxed italic">
            "{bio}"
          </p>

          {/* Wallet Address & Copy */}
          {address && (
            <div className="mt-3.5 flex items-center gap-2 p-1.5 pl-3 pr-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] max-w-full">
              <span className="font-mono text-xs text-slate-300 truncate">
                {formatAddress(address)}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1 font-mono"
                  title="Copy full address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[10px] hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <a
                  href={`https://testnet.explorer.hemi.xyz/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
                  title="View on Hemi Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#FF4600]" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Career Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 py-3 border-t border-b border-white/[0.08] relative z-10">
          {/* Card 1: Chips */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold mb-1">
              <span>Token Chips</span>
              <Coins className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base sm:text-lg font-black text-amber-300 font-mono">
              {chipsDisplay}
            </div>
            <div className="text-[10px] text-amber-400/80 font-mono mt-0.5">
              $CRAZY8
            </div>
          </div>

          {/* Card 2: Wins & Matches */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold mb-1">
              <span>Career Wins</span>
              <Trophy className="w-3.5 h-3.5 text-[#FF4600]" />
            </div>
            <div className="text-base sm:text-lg font-black text-white font-mono">
              {wins} <span className="text-xs text-slate-500 font-normal">/ {matchesPlayed}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {losses} losses
            </div>
          </div>

          {/* Card 3: Win Rate */}
          <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono uppercase font-bold mb-1">
              <span>Win Rate</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
              {winRate}%
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-1.5">
              <div
                className="h-full bg-gradient-to-r from-[#FF4600] to-emerald-400 rounded-full"
                style={{ width: `${Math.min(100, Math.max(5, winRate))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total Winnings Highlight */}
        <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-white/[0.02] to-[#FF4600]/10 border border-amber-500/20 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
              🏆
            </div>
            <div>
              <div className="font-bold text-white text-[11px] sm:text-xs">
                Total Tournament Earnings
              </div>
              <div className="text-[10px] text-slate-400">
                Pots won across official on-chain tables
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-black text-amber-300 font-mono text-xs sm:text-sm">
              +{formatTokenAmount(totalWinnings)}
            </div>
            <div className="text-[9px] font-mono text-amber-400/80">
              CRAZY8 WON
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center gap-2.5 relative z-10">
          {!isMe && !isBot && currentUserId && (
            <button
              onClick={handleSendFriendReq}
              disabled={friendStatus !== 'idle'}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                friendStatus === 'sent'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1]'
              }`}
            >
              {friendStatus === 'sent' ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Request Sent</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5 text-[#FF4600]" />
                  <span>Add Friend</span>
                </>
              )}
            </button>
          )}

          {onChallenge && !isMe && (
            <button
              onClick={() => {
                onChallenge(user);
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#FF3700] hover:brightness-110 active:scale-95 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#FF4600]/30"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Challenge</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
