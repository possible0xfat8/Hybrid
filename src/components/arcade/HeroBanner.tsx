'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Swords, Layers, Sparkles, Trophy, Zap, ShieldCheck } from 'lucide-react';

export function HeroBanner() {
  return (
    <div className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Background ambient lighting in authentic Hemi Red-Orange */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-[#FF4600]/20 via-[#c22c00]/15 to-[#ff8459]/10 blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto text-center space-y-6">
        
        {/* Top Badges */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-obsidian-850 border border-[#FF4600]/30 text-xs font-semibold text-[#FF4600] shadow-[0_0_16px_rgba(255,70,0,0.2)]"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FF4600]" />
          <span className="text-white font-medium">Hemi Arcade</span>
          <span className="text-slate-500">•</span>
          <span className="text-[#FF4600] flex items-center gap-1 font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4600] animate-ping" />
            Live on Hemi Sepolia
          </span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif]"
        >
          UNIFIED WEB3 <br />
          <span className="bg-gradient-to-r from-white via-[#FF4600] to-[#ff8459] bg-clip-text text-transparent drop-shadow-sm">
            GAMING DASHBOARD
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed font-normal"
        >
          One unified wallet connection. Two contest-winning competitive games. Battle for on-chain ELO in <span className="text-[#FF4600] font-bold">Hemi Chess</span> or claim $CRAZY8 pots in <span className="text-[#FF4600] font-bold">Hemi Crazy 8</span> with automated smart contract settlement on Hemi Network.
        </motion.p>

        {/* Dual Game Launch Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          {/* Launch Chess CTA */}
          <Link
            href="/play/chess"
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-3 bg-[#FF4600] hover:bg-[#e83a00] text-white shadow-[0_0_28px_-8px_#FF4600] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group cursor-pointer"
          >
            <Swords className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
            <span>PLAY HEMI CHESS</span>
          </Link>

          {/* Launch Crazy 8 CTA */}
          <Link
            href="/play/uno"
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-3 bg-obsidian-850 hover:bg-obsidian-800 text-white border border-[#FF4600]/40 hover:border-[#FF4600] shadow-[0_0_20px_rgba(255,70,0,0.15)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group cursor-pointer"
          >
            <Layers className="w-5 h-5 text-[#FF4600] group-hover:-translate-y-0.5 transition-transform" />
            <span>PLAY HEMI CRAZY 8</span>
          </Link>
        </motion.div>

        {/* Feature Highlights Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-6 pt-6 text-xs text-slate-400 font-medium"
        >
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#FF4600]" />
            <span>Smart Contract Escrows</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#FF4600]" />
            <span>Isolated Socket Namespaces</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Instant Prize Settlement</span>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
