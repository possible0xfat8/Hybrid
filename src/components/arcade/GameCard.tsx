'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Swords, Layers, Play, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface GameInfo {
  id: 'chess' | 'uno';
  title: string;
  tagline: string;
  description: string;
  route: string;
  badge: string;
  badgeColor: string;
  primaryColor: string;
  accentColor: string;
  glowClass: string;
  stats: {
    players: string;
    activeMatches: string;
    prizePool: string;
    contract: string;
  };
  features: string[];
}

export function GameCard({ game }: { game: GameInfo }) {
  const isChess = game.id === 'chess';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -6 }}
      className="relative group rounded-3xl overflow-hidden bg-obsidian-900/90 border border-[#FF4600]/20 hover:border-[#FF4600]/60 transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-[0_0_28px_rgba(255,70,0,0.25)]"
    >
      {/* Top Banner with Background Ambient Graphic */}
      <div className="relative p-6 sm:p-8 overflow-hidden">
        {/* Glow orb in Hemi Orange */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[80px] pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity bg-[#FF4600]" />

        {/* Header: Badge & Icon */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#FF4600]/15 text-[#FF4600] border border-[#FF4600]/30 shadow-[0_0_12px_rgba(255,70,0,0.2)] shrink-0">
              {isChess ? <Swords className="w-6 h-6 text-[#FF4600]" /> : <Layers className="w-6 h-6 text-[#FF4600]" />}
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-[#FF4600]">
                {game.badge}
              </span>
              <h3 className="text-2xl font-black text-white tracking-wide">
                {game.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#FF4600] animate-pulse" />
            <span className="text-white font-medium">Live</span>
          </div>
        </div>

        {/* Tagline & Description */}
        <p className="text-xs sm:text-sm font-semibold text-[#FF4600] mb-2">{game.tagline}</p>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">{game.description}</p>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-black/50 border border-white/5 mb-6">
          <div className="text-center">
            <div className="text-[10px] uppercase font-mono text-slate-400">Online</div>
            <div className="text-sm sm:text-base font-bold text-white mt-0.5">{game.stats.players}</div>
          </div>
          <div className="text-center border-x border-white/10">
            <div className="text-[10px] uppercase font-mono text-slate-400">Matches</div>
            <div className="text-sm sm:text-base font-bold text-white mt-0.5">{game.stats.activeMatches}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase font-mono text-slate-400">Total Stakes</div>
            <div className="text-sm sm:text-base font-bold mt-0.5 text-[#FF4600]">
              {game.stats.prizePool}
            </div>
          </div>
        </div>

        {/* Features list */}
        <div className="space-y-2 mb-6">
          {game.features.map((feat) => (
            <div key={feat} className="flex items-center gap-2 text-xs text-slate-300">
              <Zap className="w-3.5 h-3.5 text-[#FF4600]" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA Action Bar */}
      <div className="p-6 sm:p-8 pt-0">
        <Link
          href={game.route}
          className="w-full py-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-lg cursor-pointer bg-[#FF4600] hover:bg-[#e83a00] text-white shadow-[0_0_24px_rgba(255,70,0,0.35)] hover:-translate-y-0.5 active:translate-y-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>LAUNCH {game.title.toUpperCase()}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>

        <div className="flex items-center justify-between mt-3 text-[11px] font-mono text-slate-400 px-1">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> {game.stats.contract}
          </span>
          <span className="text-slate-400">Isolated Socket Namespace</span>
        </div>
      </div>
    </motion.div>
  );
}
