'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Swords, Layers, ArrowUpRight, Flame } from 'lucide-react';

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

  const leaderboardData: LeaderboardEntry[] = [
    {
      rank: 1,
      address: '0x8e8e39D67D227E0a8B10095e07EA020D53926df3',
      name: 'GrandMasterChad',
      game: 'both',
      score: '2,140 ELO / 18,200 $CRAZY8',
      metricLabel: 'Dual Champion',
      wins: 142,
      winRate: '78.4%',
      avatar: '👑',
    },
    {
      rank: 2,
      address: '0x71C8A3f892d194514781440079C6F6F94732bE5A',
      name: 'DeepHemiCheck',
      game: 'chess',
      score: '1,985 ELO',
      metricLabel: 'Chess Rating',
      wins: 98,
      winRate: '72.1%',
      avatar: '♟️',
    },
    {
      rank: 3,
      address: '0x438A20Fa0e176378A58908869b76E1B73cFe37b1',
      name: 'WildCardSavant',
      game: 'uno',
      score: '12,500 $CRAZY8',
      metricLabel: 'Tokens Won',
      wins: 84,
      winRate: '68.9%',
      avatar: '🃏',
    },
    {
      rank: 4,
      address: '0x12Fa87Bc1128EAf42c9535091Cd5866f809938b8',
      name: 'NeoKnight',
      game: 'chess',
      score: '1,840 ELO',
      metricLabel: 'Chess Rating',
      wins: 76,
      winRate: '64.5%',
      avatar: '🐴',
    },
    {
      rank: 5,
      address: '0x995dB176cf92490A5bc184b2F1253049F867490A',
      name: 'ColorShifter',
      game: 'uno',
      score: '9,800 $CRAZY8',
      metricLabel: 'Tokens Won',
      wins: 62,
      winRate: '61.2%',
      avatar: '🌈',
    },
  ];

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
              {filteredData.map((player) => {
                const isGold = player.rank === 1;
                const isSilver = player.rank === 2;
                const isBronze = player.rank === 3;

                return (
                  <tr
                    key={player.address}
                    className="hover:bg-white/[0.03] transition-colors group"
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
                        <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-base">
                          {player.avatar}
                        </span>
                        <div>
                          <div className="font-bold text-white group-hover:text-[#FF4600] transition-colors">
                            {player.name}
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
          <span>Synced with Hemi Sepolia smart contract events & Supabase databases</span>
          <span className="text-[#FF4600] font-mono font-bold">Updated real-time</span>
        </div>

      </div>
    </div>
  );
}
