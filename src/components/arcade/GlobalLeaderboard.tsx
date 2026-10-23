'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Swords, Layers, ArrowUpRight, Flame, User } from 'lucide-react';
import { UserProfileModal, UserProfileTarget } from '../shared/UserProfileModal';

interface LeaderboardEntry {
  rank: number;
  address: string;
  name: string;
  game: 'chess' | 'uno' | 'both';
  score: string;
  metricLabel: string;
  wins: number;
  winRate: string;
  avatar: string;
}

export function GlobalLeaderboard() {
  const [activeTab, setActiveTab] = useState<'all' | 'chess' | 'uno'>('all');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfileTarget | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/arcade/leaderboard')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.leaderboard)) {
          setLeaderboardData(data.leaderboard);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const filteredData = leaderboardData.filter((entry) => {
    if (activeTab === 'all') return true;
    return entry.game === activeTab || entry.game === 'both';
  });

  return (
    <div id="leaderboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/10">
        
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase font-bold tracking-wider mb-1">
              <Trophy className="w-4 h-4" />
              <span>Arcade Hall of Fame</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
              GLOBAL LEADERBOARDS
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center p-1 rounded-2xl bg-black/50 border border-white/10 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#FF4600] text-white shadow-[0_0_16px_rgba(255,70,0,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Champions
            </button>
            <button
              onClick={() => setActiveTab('chess')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'chess'
                  ? 'bg-[#FF4600] text-white shadow-[0_0_16px_rgba(255,70,0,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Chess ELO</span>
            </button>
            <button
              onClick={() => setActiveTab('uno')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'uno'
                  ? 'bg-[#FF4600] text-white shadow-[0_0_16px_rgba(255,70,0,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Uno $CRAZY8</span>
            </button>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Rank</th>
                <th className="py-3 px-3">Player</th>
                <th className="py-3 px-3">Game</th>
                <th className="py-3 px-3 text-right">Rating / Payout</th>
                <th className="py-3 px-3 text-right">Wins</th>
                <th className="py-3 px-3 text-right">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <span className="text-xs font-mono animate-pulse">Loading live arcade leaderboard...</span>
                  </td>
                </tr>
              )}
              {!isLoading && filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Trophy className="w-8 h-8 text-slate-500 opacity-40" />
                      <span className="font-medium text-slate-300">No ranked matches recorded yet</span>
                      <span className="text-xs text-slate-500">Play a match of Chess, Crazy 8, or Connect 4 to claim the #1 spot!</span>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && filteredData.map((player) => {
                const isGold = player.rank === 1;
                const isSilver = player.rank === 2;
                const isBronze = player.rank === 3;

                return (
                  <tr
                    key={player.address}
                    onClick={() => {
                      setSelectedUser({
                        name: player.name,
                        avatar: player.avatar,
                        address: player.address,
                        stats: {
                          wins: player.wins,
                          matchesPlayed: player.wins,
                          totalWinnings: player.score,
                        },
                        tokenBalance: player.score,
                      });
                    }}
                    className="hover:bg-white/[0.06] transition-colors group cursor-pointer"
                    title={`Click to view ${player.name}'s profile`}
                  >
                    {/* Rank */}
                    <td className="py-4 px-3 font-mono font-bold">
                      <div className="flex items-center gap-1.5">
                        {isGold && <Crown className="w-4 h-4 text-amber-400" />}
                        {isSilver && <Medal className="w-4 h-4 text-slate-300" />}
                        {isBronze && <Medal className="w-4 h-4 text-amber-600" />}
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                            isGold
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                              : isSilver
                              ? 'bg-slate-400/20 text-slate-200 border border-slate-400/40'
                              : isBronze
                              ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
                              : 'text-slate-400'
                          }`}
                        >
                          {player.rank}
                        </span>
                      </div>
                    </td>

                    {/* Player */}
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-base group-hover:scale-105 transition-transform">
                          {player.avatar}
                        </span>
                        <div>
                          <div className="font-bold text-white group-hover:text-[#FF4600] transition-colors flex items-center gap-1.5">
                            <span>{player.name}</span>
                            <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              ↗
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {player.address.slice(0, 6)}...{player.address.slice(-4)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Game Category Badge */}
                    <td className="py-4 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                          player.game === 'chess'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : player.game === 'uno'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-[#FF4600]/20 text-[#FF4600] border border-[#FF4600]/40'
                        }`}
                      >
                        {player.game === 'chess' && <Swords className="w-3 h-3" />}
                        {player.game === 'uno' && <Layers className="w-3 h-3" />}
                        {player.game === 'both' && <Flame className="w-3 h-3 text-[#FF4600]" />}
                        <span className="capitalize">{player.game}</span>
                      </span>
                    </td>

                    {/* Score / Metric */}
                    <td className="py-4 px-3 text-right">
                      <div className="font-bold text-white font-mono">{player.score}</div>
                      <div className="text-[10px] text-slate-400">{player.metricLabel}</div>
                    </td>

                    {/* Wins */}
                    <td className="py-4 px-3 text-right font-mono font-bold text-slate-200">
                      {player.wins}
                    </td>

                    {/* Win Rate */}
                    <td className="py-4 px-3 text-right font-mono font-bold text-emerald-400">
                      {player.winRate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info note */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>Synced with Hemi Sepolia smart contract events & Supabase databases • Click any player to inspect profile</span>
          <span className="text-[#FF4600] font-mono font-bold">Updated real-time</span>
        </div>

        {/* User Profile Modal */}
        <UserProfileModal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          user={selectedUser}
        />

      </div>
    </div>
  );
}
