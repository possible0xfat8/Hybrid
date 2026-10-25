'use client';

import React from 'react';
import { Eye, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

export interface SpectatorItem {
  id: string;
  name: string;
  avatar: string;
  isYou?: boolean;
}

interface SpectatorSidebarPanelProps {
  spectators: SpectatorItem[];
  totalCount: number;
  onViewAll?: () => void;
  className?: string;
}

// Curated demo spectators to display alongside real spectators when room has spectators
const DEFAULT_FALLBACK_SPECTATORS: SpectatorItem[] = [
  { id: 'spec_1', name: 'GalaxyUser', avatar: '🌌' },
  { id: 'spec_2', name: 'NaaJi', avatar: '👩' },
  { id: 'spec_3', name: 'Web3Bae', avatar: '🦆' },
  { id: 'spec_4', name: 'CryptoJide', avatar: '🤖' },
  { id: 'spec_5', name: 'LumiFan', avatar: '🐧' },
  { id: 'spec_6', name: 'Deezy', avatar: '🐯' },
  { id: 'spec_7', name: 'NaijaGM', avatar: '🐧' },
];

export const SpectatorSidebarPanel: React.FC<SpectatorSidebarPanelProps> = ({
  spectators,
  totalCount,
  onViewAll,
  className = '',
}) => {
  // Build effective list: user's entry first, then real spectators, then fallbacks if needed to match visual density
  const effectiveSpectators: SpectatorItem[] = React.useMemo(() => {
    const list: SpectatorItem[] = [];

    // Ensure 'You' is always at the top if present
    const you = spectators.find((s) => s.isYou);
    if (you) {
      list.push(you);
    } else {
      list.push({ id: 'you', name: 'You', avatar: '🐱', isYou: true });
    }

    // Add remaining real spectators
    spectators
      .filter((s) => !s.isYou)
      .forEach((s) => {
        if (!list.some((existing) => existing.id === s.id)) {
          list.push(s);
        }
      });

    // If list has fewer than 8, pad with fallback spectators up to totalCount or 8
    for (const fb of DEFAULT_FALLBACK_SPECTATORS) {
      if (list.length >= Math.max(totalCount, 8)) break;
      if (!list.some((existing) => existing.name === fb.name)) {
        list.push(fb);
      }
    }

    return list.slice(0, 8);
  }, [spectators, totalCount]);

  const displayCount = Math.max(totalCount, effectiveSpectators.length);

  return (
    <div
      className={`w-64 sm:w-72 bg-[#090A0F]/95 border border-purple-500/25 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between shadow-2xl backdrop-blur-md select-none shrink-0 ${className}`}
    >
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-orange-400" />
            <h3 className="text-xs font-black text-white tracking-widest uppercase">
              SPECTATORS
            </h3>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white font-mono text-[10px] font-bold">
            <span>{displayCount}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* Spectator Rows */}
        <div className="space-y-1 overflow-y-auto max-h-[380px] custom-scrollbar pr-1">
          {effectiveSpectators.map((spec) => (
            <div
              key={spec.id}
              className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-white/[0.03] transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-xs overflow-hidden shrink-0 group-hover:border-purple-400/50 transition-colors">
                  <UserAvatar avatar={spec.avatar} name={spec.name} className="w-full h-full text-xs rounded-full" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white tracking-tight truncate max-w-[110px]">
                    {spec.name}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    {spec.isYou ? (
                      <>
                        <span className="text-emerald-400">Watching</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Watching</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Action */}
      <div className="pt-3 border-t border-white/[0.06] mt-2">
        <button
          type="button"
          onClick={onViewAll}
          className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-purple-500/40 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-between transition-all cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>View All Spectators</span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
};
