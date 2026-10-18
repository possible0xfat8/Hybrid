'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, Coins, Flame, Clock } from 'lucide-react';

export function StatsCounter() {
  const stats = [
    {
      label: 'Total Matches Played',
      value: '3,480+',
      change: '+14% this week',
      icon: Flame,
      color: 'text-[#FF4600]',
      border: 'border-[#FF4600]/30',
      bg: 'bg-[#FF4600]/5',
    },
    {
      label: 'Prize Volume Distributed',
      value: '52,800+',
      currency: '$CRAZY8 / ETH',
      change: '100% Non-custodial',
      icon: Coins,
      color: 'text-amber-400',
      border: 'border-amber-500/20',
      bg: 'bg-amber-500/5',
    },
    {
      label: 'Live Online Players',
      value: '24',
      change: 'Hemi Testnet Peers',
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
                <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                  {s.label}
                </span>
                <div className={`p-2 rounded-xl bg-black/40 ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {s.value}
                </span>
                {s.currency && (
                  <span className="text-[11px] font-mono text-[#FF4600] font-bold">
                    {s.currency}
                  </span>
                )}
              </div>

              <div className="mt-2 text-[11px] text-slate-400 font-mono">
                {s.change}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
