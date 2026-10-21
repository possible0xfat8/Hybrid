import React, { useState, useEffect } from 'react';
import { X, Trophy, Medal, Award, Flame, RefreshCw, User } from 'lucide-react';
import { formatAddress } from '@/lib/uno/wallet';
import { UserAvatar } from './UserAvatar';

interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  address?: string;
  stats: {
    matchesPlayed: number;
    wins: number;
    cardsPlayed: number;
    totalWinnings: string;
  };
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/uno/leaderboard');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.leaderboard) ? data.leaderboard : [];
        const sanitized = list.map((u: any) => ({
          ...u,
          stats: {
            matchesPlayed: u.stats?.matchesPlayed ?? (u.wins ? u.wins + 5 : 0),
            wins: u.stats?.wins ?? u.wins ?? 0,
            losses: u.stats?.losses ?? u.losses ?? 0,
            cardsPlayed: u.stats?.cardsPlayed ?? 0,
            totalWinnings: u.stats?.totalWinnings ?? u.totalWinnings ?? '0.000',
          },
        }));
        setLeaders(sanitized);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0C0F14] border border-white/[0.08] rounded-2xl sm:rounded-3xl max-w-xl w-full p-3.5 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#FF4600] shrink-0">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5 sm:gap-2">
                Leaderboard
                <span className="text-[9px] sm:text-xs font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-white/[0.06] text-[#FF4600] border border-white/[0.08] font-semibold">
                  Global
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400">Top card champions and high earners on Hemi</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={fetchLeaderboard}
              disabled={loading}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh rankings"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin text-[#FF4600]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Leaders List */}
        <div className="flex-1 overflow-y-auto py-3 sm:py-4 space-y-2 sm:space-y-2.5 pr-1 custom-scrollbar">
          {loading ? (
            <div className="py-12 sm:py-16 text-center text-slate-500 font-mono text-xs flex flex-col items-center gap-3">
              <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-[#FF4600]" />
              <span>Loading leaderboard records...</span>
            </div>
          ) : leaders.length === 0 ? (
            <div className="py-12 sm:py-16 text-center text-slate-500 font-mono text-xs">
              No completed matches recorded yet. Play a match to claim #1!
            </div>
          ) : (
            leaders.map((user, idx) => {
              const isCurrentUser = user.id === currentUserId;
              const userWins = user.stats?.wins ?? 0;
              const userMatches = user.stats?.matchesPlayed ?? 0;
              const winRate =
                userMatches > 0
                  ? Math.round((userWins / userMatches) * 100)
                  : 0;

              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all ${
                    isCurrentUser
                      ? 'bg-white/[0.06] border-[#FF4600]/60 shadow-sm'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div className="w-6 sm:w-7 text-center shrink-0">
                      {idx === 0 ? (
                        <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 mx-auto" />
                      ) : idx === 1 ? (
                        <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 mx-auto" />
                      ) : idx === 2 ? (
                        <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 mx-auto" />
                      ) : (
                        <span className="font-mono text-[11px] sm:text-xs font-semibold text-slate-500">
                          #{idx + 1}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-base sm:text-lg shrink-0 overflow-hidden">
                      <UserAvatar avatar={user.avatar} name={user.name} className="w-full h-full text-base sm:text-lg rounded-xl" />
                    </div>

                    {/* Name & Wallet */}
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                        <span className="truncate max-w-[90px] sm:max-w-none">{user.name}</span>
                        {isCurrentUser && (
                          <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded bg-[#FF4600]/20 border border-[#FF4600]/40 text-[#FF4600] font-semibold shrink-0">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-mono text-slate-400 truncate max-w-[100px] sm:max-w-none">
                        {user.address ? formatAddress(user.address) : `${userMatches} games`}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-2.5 sm:gap-4 shrink-0 text-right">
                    <div>
                      <div className="text-[11px] sm:text-xs font-bold text-white font-mono">
                        {userWins} WINS
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-slate-400">
                        {winRate}% win
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-xs font-bold text-slate-200 font-mono">
                        {user.stats?.totalWinnings || '0.000'} ETH
                      </div>
                      <div className="text-[10px] text-slate-500">Won</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
