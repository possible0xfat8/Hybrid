'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Coins, Flame, Clock } from 'lucide-react';

export function StatsCounter() {
  const [liveStats, setLiveStats] = useState({
    totalMatches: 0,
    activePlayers: 0,
    prizeVolume: 'Live Escrow',
  });

  useEffect(() => {
    fetch('/api/arcade/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.totals) {
          setLiveStats({
            totalMatches: data.totals.totalGamesPlayed || 0,
            activePlayers: data.totals.activePlayers || 0,
            prizeVolume: data.totals.prizeVolume || 'Live Escrow',
          });
        }
      })
      .catch(() => {});
  }, []);

  const stats = [
    {
      label: 'Total Matches Played',
      value: liveStats.totalMatches.toLocaleString(),
      change: 'Real-time On-Chain',
      icon: Flame,
      color: 'text-[#FF4600]',
      border: 'border-[#FF4600]/30',
      bg: 'bg-[#FF4600]/5',
    },
    {
      label: 'Prize Volume',
      value: liveStats.prizeVolume,
      currency: '',
      change: '100% Non-custodial',
      icon: Coins,
      color: 'text-amber-400',
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/5',
    },
    {
      label: 'Live Online Players',
      value: liveStats.activePlayers.toString(),
      change: 'Active Socket Peers',
      icon: Users,
      color: 'text-[#FF4600]',
      border: 'border-[#FF4600]/30',
      bg: 'bg-[#FF4600]/5',
    },
    {
      label: 'Oracle Settlement Speed',
      value: '< 2.4s',
      change: 'Sub-block Finality',
      icon: Clock,
      color: 'text-emerald-400',
      border: 'border-emerald-500/20',
      bg: 'bg-emerald-500/5',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className={`p-5 rounded-2xl bg-obsidian-900 border ${s.border} ${s.bg} relative overflow-hidden`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  {s.label}
                </span>
                <div className={`p-2 rounded-xl bg-white/5 ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                  {s.value}
                </span>
                {s.currency && (
                  <span className="text-xs font-bold text-slate-400">
                    {s.currency}
                  </span>
                )}
              </div>

              <div className="text-[11px] font-mono text-slate-500">
                {s.change}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
