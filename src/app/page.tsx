'use client';

import React from 'react';
import Link from 'next/link';
import {
  Swords,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  Gamepad2,
  Users,
  Timer,
  Trophy,
  Coins,
  Flame,
} from 'lucide-react';

export default function ArcadeDashboard() {
  const games = [
    {
      id: 'chess',
      title: 'Hemi Chess',
      tagline: 'Outplay. Checkmate. Climb the chain.',
      category: '1v1 Ranked Strategy',
      description:
        'Pure chess with zero excuses. Jump into blitz matchmaking with players worldwide, battle for rated pride, and etch every victory straight into Hemi on-chain ELO.',
      route: '/play/chess',
      status: 'live' as const,
      playersBadge: '1v1 Duel',
      tags: [
        { label: '3m / 5m Blitz', icon: Timer },
        { label: 'On-Chain ELO', icon: Trophy },
        { label: 'Ranked PvP', icon: Users },
      ],
      logoUrl: '/hemi-chess-logo.png',
      iconUrl: '/hemi-chess-icon.png',
      themeColor: '#FF4600',
      gradient: 'from-[#FF4600]/25 via-[#c22c00]/10 to-transparent',
      borderColor: 'border-[#FF4600]/30 hover:border-[#FF4600]',
      buttonText: 'Play Chess',
    },
    {
      id: 'uno',
      title: 'Hemi Crazy 8',
      tagline: 'Shed your hand. Sweep the pot.',
      category: 'Multiplayer Card Game',
      description:
        'The wildest card-slapping party on Web3. Hit your rivals with Skips, slap down +2s, reverse the heat, and ditch your entire hand first to take home the $CRAZY8 chip pot.',
      route: '/play/uno',
      status: 'live' as const,
      playersBadge: '2-4 Players',
      tags: [
        { label: 'Action Cards', icon: Flame },
        { label: '$CRAZY8 Pots', icon: Coins },
        { label: 'Live Tables', icon: Users },
      ],
      logoUrl: '/hemi-crazy8-logo.svg',
      iconUrl: '/hemi-uno-emblem.svg',
      themeColor: '#FF4600',
      gradient: 'from-[#FF4600]/25 via-[#9c2505]/10 to-transparent',
      borderColor: 'border-[#FF4600]/30 hover:border-[#FF4600]',
      buttonText: 'Play Crazy 8',
    },
    {
      id: 'connect4',
      title: 'Hemi Connect 4',
      tagline: 'Drop. Connect. Rule the grid.',
      category: '1v1 Ranked Strategy',
      description:
        'Line up four gravity-defying discs before your rival blocks the drop. Fast 20s turns, ruthless bot AI, and on-chain ELO settled directly on Hemi Sepolia!',
      route: '/play/connect4',
      status: 'live' as const,
      playersBadge: '1v1 Duel',
      tags: [
        { label: '4-in-a-Row', icon: Zap },
        { label: 'On-Chain ELO', icon: Trophy },
        { label: 'HemiBot & PvP', icon: Users },
      ],
      logoUrl: '/hemi-connect4-logo.svg',
      iconUrl: '/hemi-connect4-emblem.svg',
      themeColor: '#FF4600',
      gradient: 'from-[#FF4600]/25 via-[#e03a00]/10 to-transparent',
      borderColor: 'border-[#FF4600]/30 hover:border-[#FF4600]',
      buttonText: 'Play Connect 4',
    },
  ];

  return (
    <div className="w-full min-h-[calc(100vh-80px)] flex flex-col justify-between pb-16">
      
      {/* ── 1. Clean, High-Impact Hero ─────────────────────────────── */}
      <section className="relative overflow-hidden pt-10 sm:pt-16 pb-10 px-4 sm:px-6 lg:px-8">
        {/* Subtle Hemi brand glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[300px] bg-[#FF4600]/[0.08] blur-[130px] pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto text-center space-y-4">
          
          {/* Platform Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-obsidian-900 border border-[#FF4600]/30 text-xs font-semibold text-[#FF4600] shadow-[0_0_16px_rgba(255,70,0,0.15)]">
            <Gamepad2 className="w-3.5 h-3.5 text-[#FF4600]" />
            <span className="text-white font-medium">Hybrid</span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-[#FF4600]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4600] animate-ping" />
              Live on Hemi Sepolia
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-white">
            Pick Your <span className="text-[#FF4600]">Arena</span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Jump straight into live tables, challenge real opponents, and battle for on-chain bragging rights. Zero clunky setup — connect and play.
          </p>
        </div>
      </section>

      {/* ── 2. The Game Catalog (The Core of the Page) ──────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-12">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF4600]">
              Game Catalog
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#FF4600]/15 border border-[#FF4600]/30 text-xs text-[#FF4600] font-mono font-bold">
              3 Live Arenas
            </span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Direct Launch • Zero Install • Web3 Native
          </span>
        </div>

        {/* 3-Column Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {games.map((game) => {
            const isLive = game.status === 'live';

            return (
              <div
                key={game.id}
                className={`relative group rounded-3xl overflow-hidden bg-obsidian-900/90 border ${game.borderColor} transition-all duration-300 flex flex-col justify-between shadow-xl ${
                  isLive
                    ? 'hover:-translate-y-1.5 hover:shadow-[0_0_30px_rgba(255,70,0,0.25)]'
                    : 'opacity-90 hover:opacity-100'
                }`}
              >
                {/* 1. Official Logo Showcase Visual Banner */}
                <div className="relative w-full h-36 bg-gradient-to-b from-black/80 via-black/40 to-black/20 border-b border-white/[0.06] flex items-center justify-center p-6 overflow-hidden">
                  {/* Ambient spotlight glow */}
                  <div
                    className="absolute inset-0 opacity-25 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${game.themeColor} 0%, transparent 70%)`,
                    }}
                  />

                  {/* Reference Logo from Repo */}
                  {game.logoUrl ? (
                    <img
                      src={game.logoUrl}
                      alt={`${game.title} Official Logo`}
                      className="max-h-16 max-w-[85%] object-contain drop-shadow-[0_4px_20px_rgba(255,70,0,0.35)] group-hover:scale-105 transition-transform duration-300 select-none"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 shadow-inner">
                        <Gamepad2 className="w-6 h-6 text-slate-400 animate-pulse" />
                      </div>
                      <span className="text-[11px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                        To Be Announced
                      </span>
                    </div>
                  )}

                  {/* Status & Player Count Badges Floating Top */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                    {isLive ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF4600]/20 border border-[#FF4600]/50 text-[11px] font-bold text-[#FF4600] backdrop-blur-md shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF4600] animate-pulse" />
                        LIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/15 text-[11px] font-bold text-slate-300 backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        COMING SOON
                      </span>
                    )}

                    <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-[11px] font-mono text-slate-300 backdrop-blur-md">
                      {game.playersBadge}
                    </span>
                  </div>
                </div>

                {/* 2. Card Content & Authentic Icon Badge */}
                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-6">
                  <div>
                    {/* Header with Square Icon Badge */}
                    <div className="flex items-center gap-3.5 mb-2">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border overflow-hidden p-1 ${
                          isLive
                            ? 'bg-black/60 border-[#FF4600]/40 shadow-[0_0_16px_rgba(255,70,0,0.25)] group-hover:scale-105 transition-transform'
                            : 'bg-slate-800 text-slate-400 border-white/10'
                        }`}
                      >
                        {game.iconUrl ? (
                          <img
                            src={game.iconUrl}
                            alt={`${game.title} Emblem`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Sparkles className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                          {game.category}
                        </span>
                        <h3 className="text-2xl font-black text-white tracking-tight">
                          {game.title}
                        </h3>
                      </div>
                    </div>

                    {/* Tagline */}
                    <p className="text-xs font-semibold text-[#FF4600] mt-1 mb-3">
                      {game.tagline}
                    </p>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                      {game.description}
                    </p>
                  </div>

                  {/* Feature Highlights Pills */}
                  <div className="grid grid-cols-3 gap-2">
                    {game.tags.map((tag) => {
                      const TagIcon = tag.icon;
                      return (
                        <div
                          key={tag.label}
                          className="px-2 py-2 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center justify-center text-center gap-1"
                        >
                          <TagIcon className="w-3.5 h-3.5 text-[#FF4600]" />
                          <span className="text-[10px] font-medium text-slate-300 line-clamp-1">
                            {tag.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Bottom Action Button */}
                <div className="p-6 sm:p-7 pt-0">
                  {isLive ? (
                    <Link
                      href={game.route}
                      className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 bg-[#FF4600] hover:bg-[#e83a00] text-white shadow-[0_0_20px_rgba(255,70,0,0.3)] hover:shadow-[0_0_28px_rgba(255,70,0,0.45)] transition-all cursor-pointer group"
                    >
                      <span>{game.buttonText}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-white/5 text-slate-400 border border-white/10 cursor-not-allowed opacity-80"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{game.buttonText}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Next Game In Development Space ── */}
        <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 border-dashed flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF4600]/10 border border-[#FF4600]/25 flex items-center justify-center text-slate-400 shrink-0">
              <Sparkles className="w-5 h-5 text-[#FF4600]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Next Arena In Development</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-[10px] font-mono text-amber-400">
                  Cooking in Lab
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                A 4th Web3 multiplayer title is coming to Hybrid. Stay tuned for announcements!
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
            Game Space #4 Reserved
          </span>
        </div>
      </section>

      {/* ── 3. Simple Platform Guarantee Strip ─────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-4">
        <div className="rounded-2xl p-4 sm:p-6 bg-obsidian-900/60 border border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF4600]/15 text-[#FF4600] border border-[#FF4600]/30 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white">Instant Matchmaking</div>
              <div className="text-[11px] text-slate-400">Zero lag, snappy turns, and live tables.</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF4600]/15 text-[#FF4600] border border-[#FF4600]/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white">On-Chain Glory</div>
              <div className="text-[11px] text-slate-400">Rated ELO and chip payouts on Hemi Sepolia.</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FF4600]/15 text-[#FF4600] border border-[#FF4600]/30 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white">One Connected Wallet</div>
              <div className="text-[11px] text-slate-400">Jump between games seamlessly without reconnecting.</div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
