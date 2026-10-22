'use client';

import React, { useState, useEffect } from 'react';
import { UserAvatar } from './UserAvatar';
import { formatAddress } from '@/lib/uno/wallet';
import { formatTokenAmount } from '@/lib/uno/token';
import {
  Trophy,
  Crown,
  Medal,
  Coins,
  RefreshCw,
  TrendingUp,
  Sparkles,
  Gamepad2,
  ChevronRight,
  Flame,
} from 'lucide-react';

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  address?: string;
  tokenBalance?: number;
  stats: {
    matchesPlayed: number;
    wins: number;
    losses?: number;
    cardsPlayed: number;
    totalWinnings: string;
    totalLosses?: string;
  };
}

export interface Crazy8RichLeaderboardProps {
  currentUserId?: string;
  currentUserAddress?: string;
  currentUserChips?: string;
  currentUserWins?: number;
  onQuickPlay?: () => void;
  className?: string;
}

export const Crazy8RichLeaderboard: React.FC<Crazy8RichLeaderboardProps> = ({
  currentUserId,
  currentUserAddress,
  currentUserChips = '0',
  currentUserWins = 0,
  onQuickPlay,
  className = '',
}) => {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [sortBy, setSortBy] = useState<'chips' | 'wins'>('chips');
  const [loading, setLoading] = useState(false);

  const fetchLeaders = async (sort: 'chips' | 'wins' = sortBy) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/uno/leaderboard?sort=${sort}&limit=12`);
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data.leaderboard)
          ? data.leaderboard
          : Array.isArray(data)
          ? data
          : [];

        // Ensure every entry has safe stats defaults
        let sanitized = rawList.map((u: any) => ({
          ...u,
          tokenBalance:
            typeof u.tokenBalance === 'number'
              ? u.tokenBalance
              : parseFloat(u.tokenBalance) || 10000,
          stats: {
            matchesPlayed: u.stats?.matchesPlayed ?? (u.wins ? u.wins + 5 : 0),
            wins: u.stats?.wins ?? u.wins ?? 0,
            losses: u.stats?.losses ?? u.losses ?? 0,
            cardsPlayed: u.stats?.cardsPlayed ?? 0,
            totalWinnings: u.stats?.totalWinnings ?? u.totalWinnings ?? '0',
            totalLosses: u.stats?.totalLosses ?? u.totalLosses ?? '0',
          },
        }));

        // If current user is connected, guarantee they appear in the leaderboard with their live chips & wins
        if (currentUserAddress || currentUserId) {
          const userIdx = sanitized.findIndex(
            (u: any) =>
              (currentUserAddress &&
                u.address &&
                u.address.toLowerCase() === currentUserAddress.toLowerCase()) ||
              (currentUserId && u.id === currentUserId)
          );

          const liveChips = parseFloat(currentUserChips) || 10000;
          const liveWins = currentUserWins || 0;

          if (userIdx !== -1) {
            sanitized[userIdx] = {
              ...sanitized[userIdx],
              tokenBalance: Math.max(sanitized[userIdx].tokenBalance || 0, liveChips),
              wins: Math.max(sanitized[userIdx].wins || 0, liveWins),
              stats: {
                ...sanitized[userIdx].stats,
                wins: Math.max(sanitized[userIdx].stats?.wins || 0, liveWins),
                totalWinnings: sanitized[userIdx].stats?.totalWinnings || `${liveChips}`,
              },
            };
          } else {
            const cleanAddr = currentUserAddress ? currentUserAddress.toLowerCase() : '';
            sanitized.push({
              id: currentUserId || `wallet_${cleanAddr}`,
              name: cleanAddr ? `Player_${cleanAddr.slice(2, 6)}` : 'You',
              tag: cleanAddr ? `Player#${cleanAddr.slice(2, 6)}` : 'You#0001',
              avatar: '🦊',
              address: cleanAddr,
              tokenBalance: liveChips,
              wins: liveWins,
              matchesPlayed: liveWins,
              totalWinnings: `${liveChips}`,
              stats: {
                matchesPlayed: liveWins,
                wins: liveWins,
                losses: 0,
                cardsPlayed: liveWins * 7,
                totalWinnings: `${liveChips}`,
                totalLosses: '0',
              },
            });
          }

          // Sort numerically by active tab
          if (sort === 'chips') {
            sanitized.sort((a: any, b: any) => (b.tokenBalance ?? 0) - (a.tokenBalance ?? 0));
          } else {
            sanitized.sort((a: any, b: any) => (b.wins ?? 0) - (a.wins ?? 0));
          }
        }

        setLeaders(sanitized);
      }
    } catch (err) {
      console.warn('Failed to fetch rich leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaders(sortBy);
  }, [sortBy, currentUserChips, currentUserWins, currentUserAddress]);

  // Top 3 Podium
  const top1 = leaders[0];
  const top2 = leaders[1];
  const top3 = leaders[2];
  const restLeaders = leaders.slice(3);

  // Find user rank if present
  const userRankIdx = leaders.findIndex(
    (u) =>
      (currentUserId && u.id === currentUserId) ||
      (currentUserAddress &&
        u.address &&
        u.address.toLowerCase() === currentUserAddress.toLowerCase())
  );
  const userIsOnBoard = userRankIdx !== -1;

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl bg-[#0E1217]/90 border border-white/[0.08] p-3.5 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-xl ${className}`}
    >
      {/* Background radial glow */}
      <div className="absolute top-0 right-1/4 w-80 h-40 bg-amber-500/[0.06] rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 sm:pb-4 border-b border-white/[0.06] relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-[#FF4600]/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-md">
            <Crown className="w-5 h-5 fill-amber-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                <span>HIGH ROLLERS</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                  RICH LIST
                </span>
              </h2>
            </div>
            <div className="text-[10px] sm:text-[11px] font-mono text-slate-400">
              Top chip holders & pot sweepers
            </div>
          </div>
        </div>

        {/* Filter Toggle & Refresh */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-center">
          <div className="flex p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setSortBy('chips')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'chips'
                  ? 'bg-gradient-to-r from-amber-500 to-[#FF4600] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Coins className="w-3 h-3" />
              <span>Richest</span>
            </button>
            <button
              type="button"
              onClick={() => setSortBy('wins')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'wins'
                  ? 'bg-gradient-to-r from-[#FF4600] to-orange-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3 h-3" />
              <span>Most Wins</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchLeaders(sortBy)}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
            title="Refresh Leaderboard"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#FF4600]' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* TOP 3 PODIUM (Visual Highlight) */}
      {top1 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 my-3 sm:my-4 items-end relative z-10">
          {/* #2 SILVER PODIUM */}
          {top2 ? (
            <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-3 bg-gradient-to-b from-slate-400/10 via-white/[0.02] to-black/40 border border-slate-400/30 flex flex-col items-center text-center relative group hover:border-slate-300/50 transition-all">
              <div className="absolute -top-2.5 w-6 h-6 rounded-full bg-slate-300 text-slate-950 font-black text-[11px] flex items-center justify-center border-2 border-[#0E1217] shadow-md">
                2
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800/80 border-2 border-slate-300/40 flex items-center justify-center text-xl sm:text-2xl mt-1 overflow-hidden shadow-inner">
                <UserAvatar avatar={top2.avatar} name={top2.name} className="w-full h-full text-xl sm:text-2xl rounded-xl" />
              </div>
              <span className="mt-1.5 text-xs font-black text-white truncate max-w-full">
                {top2.name}
              </span>
              <div className="mt-0.5 flex items-center gap-1 text-[11px] sm:text-xs font-black text-amber-300 font-mono">
                <Coins className="w-3 h-3 text-amber-400" />
                <span>{formatTokenAmount(String(top2.tokenBalance ?? 10000))}</span>
              </div>
              <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                {top2.stats?.wins ?? 0}W • {(top2.stats?.matchesPlayed ?? 0) > 0 ? Math.round(((top2.stats?.wins ?? 0) / (top2.stats?.matchesPlayed ?? 1)) * 100) : 0}%
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* #1 GOLD PODIUM (Center, Taller, Glowing) */}
          <div className="rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-black/60 border-2 border-amber-400/50 flex flex-col items-center text-center relative group shadow-[0_0_24px_rgba(245,158,11,0.2)] hover:border-amber-300 transition-all -translate-y-1">
            <div className="absolute -top-3.5 w-7 h-7 rounded-full bg-gradient-to-r from-amber-300 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-[#0E1217] shadow-lg">
              👑
            </div>
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500/30 to-amber-300/20 border-2 border-amber-400 flex items-center justify-center text-2xl sm:text-3xl mt-1 overflow-hidden shadow-lg">
              <UserAvatar avatar={top1.avatar} name={top1.name} className="w-full h-full text-2xl sm:text-3xl rounded-2xl" />
            </div>
            <span className="mt-2 text-xs sm:text-sm font-black text-white truncate max-w-full">
              {top1.name}
            </span>
            <div className="mt-0.5 flex items-center gap-1 text-xs sm:text-sm font-black text-amber-300 font-mono">
              <Coins className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
              <span>{formatTokenAmount(String(top1.tokenBalance ?? 10000))}</span>
            </div>
            <div className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold mt-0.5">
              <span>{top1.stats?.wins ?? 0} Wins</span>
              <span>•</span>
              <span>+{formatTokenAmount(top1.stats?.totalWinnings || '0')} Won</span>
            </div>
          </div>

          {/* #3 BRONZE PODIUM */}
          {top3 ? (
            <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-3 bg-gradient-to-b from-amber-700/15 via-white/[0.02] to-black/40 border border-amber-700/40 flex flex-col items-center text-center relative group hover:border-amber-600/60 transition-all">
              <div className="absolute -top-2.5 w-6 h-6 rounded-full bg-amber-700 text-amber-100 font-black text-[11px] flex items-center justify-center border-2 border-[#0E1217] shadow-md">
                3
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800/80 border-2 border-amber-700/40 flex items-center justify-center text-xl sm:text-2xl mt-1 overflow-hidden shadow-inner">
                <UserAvatar avatar={top3.avatar} name={top3.name} className="w-full h-full text-xl sm:text-2xl rounded-xl" />
              </div>
              <span className="mt-1.5 text-xs font-black text-white truncate max-w-full">
                {top3.name}
              </span>
              <div className="mt-0.5 flex items-center gap-1 text-[11px] sm:text-xs font-black text-amber-300 font-mono">
                <Coins className="w-3 h-3 text-amber-400" />
                <span>{formatTokenAmount(String(top3.tokenBalance ?? 10000))}</span>
              </div>
              <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                {top3.stats?.wins ?? 0}W • {(top3.stats?.matchesPlayed ?? 0) > 0 ? Math.round(((top3.stats?.wins ?? 0) / (top3.stats?.matchesPlayed ?? 1)) * 100) : 0}%
              </div>
            </div>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* RANKS #4 - #10 LIST */}
      <div className="space-y-1.5 max-h-56 sm:max-h-64 overflow-y-auto pr-1 custom-scrollbar relative z-10">
        {restLeaders.map((player, idx) => {
          const rank = idx + 4;
          const isCurrentUser =
            (currentUserId && player.id === currentUserId) ||
            (currentUserAddress &&
              player.address &&
              player.address.toLowerCase() === currentUserAddress.toLowerCase());

          const playerWins = player.stats?.wins ?? 0;
          const playerMatches = player.stats?.matchesPlayed ?? 0;
          const playerLosses =
            player.stats?.losses ??
            Math.max(0, playerMatches - playerWins);
          const wr =
            playerMatches > 0
              ? Math.round((playerWins / playerMatches) * 100)
              : 0;

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all ${
                isCurrentUser
                  ? 'bg-[#FF4600]/10 border-[#FF4600]/50 shadow-md'
                  : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]'
              }`}
            >
              {/* Left: Rank, Avatar, Name */}
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <span className="w-5 text-center font-mono text-xs font-bold text-slate-500 shrink-0">
                  #{rank}
                </span>

                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-sm sm:text-base shrink-0 overflow-hidden">
                  <UserAvatar avatar={player.avatar} name={player.name} className="w-full h-full text-sm sm:text-base rounded-lg" />
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    <span className="truncate max-w-[100px] sm:max-w-[130px]">
                      {player.name}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[9px] font-mono px-1 rounded bg-[#FF4600] text-white font-black shrink-0">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {playerWins}W / {playerLosses}L • {wr}% WR
                  </div>
                </div>
              </div>

              {/* Right: Chips Wealth */}
              <div className="text-right shrink-0">
                <div className="text-xs sm:text-sm font-black text-amber-300 font-mono flex items-center justify-end gap-1">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span>{formatTokenAmount(String(player.tokenBalance ?? 10000))}</span>
                </div>
                <div className="text-[9px] font-mono text-emerald-400">
                  +{formatTokenAmount(player.stats?.totalWinnings || '0')} Won
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* USER STANDING FOOTER (If not on podium or to encourage play) */}
      <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-white/[0.06] flex items-center justify-center text-xs">
            🎯
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-mono text-slate-400 block truncate">
              {userIsOnBoard
                ? `You are ranked #${userRankIdx + 1} on the High Rollers board`
                : `Your Balance: ${formatTokenAmount(currentUserChips)} Chips • ${currentUserWins} Wins`}
            </span>
          </div>
        </div>

        {onQuickPlay && (
          <button
            type="button"
            onClick={onQuickPlay}
            className="px-3 py-1.5 rounded-xl bg-[#FF4600] hover:bg-[#FF5500] active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Play Now</span>
          </button>
        )}
      </div>
    </div>
  );
};
