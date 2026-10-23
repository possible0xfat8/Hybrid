'use client';

import React, { useState, useMemo } from 'react';
import {
  Eye,
  Tv,
  Radio,
  Search,
  RefreshCw,
  X,
  Users,
  Coins,
  Shield,
  Clock,
  ChevronRight,
  Copy,
  Check,
  Flame,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { PublicRoomSummary } from '../../types/uno';
import { UserAvatar } from './UserAvatar';

interface SpectatorRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: PublicRoomSummary[];
  onSpectateRoom: (roomCode: string, spectatorName: string, avatar: string) => void;
  onRefreshRooms: () => void;
  playerName: string;
  playerAvatar: string;
}

export function SpectatorRoomsModal({
  isOpen,
  onClose,
  rooms,
  onSpectateRoom,
  onRefreshRooms,
  playerName,
  playerAvatar,
}: SpectatorRoomsModalProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'playing' | 'lobby'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [directCodeInput, setDirectCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefreshRooms();
    setTimeout(() => setIsRefreshing(false), 700);
  };

  const handleCopy = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const handleDirectSpectateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = directCodeInput.trim().toUpperCase();
    if (clean.length >= 4) {
      onSpectateRoom(clean, playerName, playerAvatar);
      onClose();
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // Filter by status
      if (filterMode === 'playing' && r.status !== 'playing') return false;
      if (filterMode === 'lobby' && r.status === 'playing') return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const codeMatches = r.roomCode.toLowerCase().includes(query);
        const hostMatches = r.hostName?.toLowerCase().includes(query);
        const playerMatches = r.players.some((p) => p.name.toLowerCase().includes(query));
        const modeMatches = r.mode?.toLowerCase().includes(query);
        return codeMatches || hostMatches || playerMatches || modeMatches;
      }
      return true;
    });
  }, [rooms, filterMode, searchQuery]);

  const livePlayingCount = useMemo(() => rooms.filter((r) => r.status === 'playing').length, [rooms]);
  const lobbyWaitingCount = useMemo(() => rooms.filter((r) => r.status !== 'playing').length, [rooms]);
  const totalSpectators = useMemo(() => rooms.reduce((acc, r) => acc + (r.spectatorCount || 0), 0), [rooms]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-[#0C0F14] border border-white/[0.08] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* MODAL HEADER: Broadcast Cam & Live Indicator              */}
        {/* ========================================================= */}
        <div className="p-3.5 sm:p-5 border-b border-white/[0.06] bg-gradient-to-r from-red-950/30 via-slate-900/60 to-purple-950/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-600 via-[#FF4600] to-orange-500 flex items-center justify-center text-white shadow-lg shadow-red-600/30 shrink-0">
              <Tv className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black text-white tracking-wide uppercase">
                  Spectator Hub
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 font-mono text-[9px] sm:text-[10px] font-bold flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse text-red-400" />
                  <span>JUDGE / STREAMER CAM</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                Official non-custodial live match view for tournament judges and broadcasters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleRefreshClick}
              disabled={isRefreshing}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh live room list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#FF4600]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SUB-HEADER: Special Note for Judges & Streamers           */}
        {/* ========================================================= */}
        <div className="px-3.5 sm:px-6 pt-3.5 sm:pt-4 pb-2 shrink-0">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-red-500/10 via-purple-500/10 to-[#FF4600]/10 border border-red-500/30 flex items-start gap-2.5 sm:gap-3 shadow-md">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-[#FF4600]" />
            </div>
            <div className="text-xs text-slate-200 min-w-0">
              <div className="font-black text-white text-[11px] sm:text-xs flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-amber-300">NOTE FOR STREAMING JUDGES:</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-200 text-[9px] font-mono font-bold">
                  Card Hand Protection Active
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-300 leading-relaxed">
                Use this <strong className="text-white">Spectator Mode</strong> on your livestream or screen share! It provides a full overhead table perspective with live pot escrows, turn timers, and discard pile moves, while <strong className="text-amber-300">strictly masking competitors&apos; card hands</strong> so you won&apos;t leak secrets or risk your chips.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DIRECT CODE JOIN & FILTERS                                */}
        {/* ========================================================= */}
        <div className="px-3.5 sm:px-6 py-2.5 flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between border-b border-white/[0.04] shrink-0">
          {/* Direct Code Input */}
          <form onSubmit={handleDirectSpectateSubmit} className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <input
                type="text"
                value={directCodeInput}
                onChange={(e) => setDirectCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter 4-digit code..."
                maxLength={6}
                className="w-full bg-[#08090C] border border-white/[0.08] focus:border-[#FF4600]/70 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white placeholder-slate-600 uppercase outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={directCodeInput.trim().length < 4}
              className="px-3 py-1.5 rounded-xl bg-[#FF4600] hover:bg-[#FF5500] disabled:opacity-40 text-white font-bold text-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Watch</span>
            </button>
          </form>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#08090C] p-1 rounded-xl border border-white/[0.06] overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterMode === 'all'
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Matches ({rooms.length})
            </button>
            <button
              onClick={() => setFilterMode('playing')}
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                filterMode === 'playing'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>Live Playing ({livePlayingCount})</span>
            </button>
            <button
              onClick={() => setFilterMode('lobby')}
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterMode === 'lobby'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              In Lobby ({lobbyWaitingCount})
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ROOMS CATALOG: Scrollable List of Active Matches          */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-3 custom-scrollbar">
          {filteredRooms.length === 0 ? (
            <div className="py-12 sm:py-16 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-slate-500 mb-3">
                <Tv className="w-7 h-7" />
              </div>
              <h3 className="text-sm sm:text-base font-black text-white mb-1">
                {filterMode === 'playing'
                  ? 'No Live Games In Progress'
                  : 'No Active Tables Found'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                {filterMode === 'playing'
                  ? 'Contestants are currently in the lobby preparing for their match. Switch filter to "All Matches" or enter a private code.'
                  : 'Tables will appear here automatically as soon as players start or host a match.'}
              </p>
              <button
                onClick={() => setFilterMode('all')}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-white border border-white/[0.1] transition-all cursor-pointer"
              >
                View All Tables
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {filteredRooms.map((room) => {
                const isPlaying = room.status === 'playing';
                const potDisplay = room.escrowPot?.amount || '0';
                const buyInDisplay = room.escrowPot?.buyInAmount && parseFloat(room.escrowPot.buyInAmount) > 0
                  ? `${room.escrowPot.buyInAmount} $CRAZY8`
                  : 'Free Casual';

                return (
                  <div
                    key={room.roomId || room.roomCode}
                    className={`relative p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border transition-all duration-200 hover:bg-white/[0.04] flex flex-col justify-between gap-3 group ${
                      isPlaying
                        ? 'border-red-500/30 hover:border-red-500/60 shadow-lg shadow-red-950/20'
                        : 'border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    {/* Top Row: Status badge & Code */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isPlaying ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold flex items-center gap-1 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span>LIVE MATCH</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>WAITING IN LOBBY</span>
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-300 text-[10px] font-bold">
                          {room.mode || 'Classic'}
                        </span>
                      </div>

                      {/* Room Code Badge */}
                      <button
                        type="button"
                        onClick={(e) => handleCopy(room.roomCode, e)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/40 border border-white/[0.08] hover:border-[#FF4600]/40 text-slate-300 hover:text-white text-[11px] font-mono font-bold transition-colors cursor-pointer"
                        title="Click to copy room code"
                      >
                        <span className="text-[#FF4600]">#</span>
                        <span>{room.roomCode}</span>
                        {copiedCode === room.roomCode ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-500" />
                        )}
                      </button>
                    </div>

                    {/* Middle: Match Details & Players */}
                    <div className="space-y-2">
                      {/* Pot & Buy-in row */}
                      <div className="flex items-center justify-between text-xs py-1 px-2.5 rounded-xl bg-black/30 border border-white/[0.04]">
                        <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                          <Coins className="w-3.5 h-3.5 text-[#FF4600]" />
                          <span className="text-slate-400 text-[10px]">POT:</span>
                          <strong className="text-white font-bold">{potDisplay}</strong>
                          <span className="text-[10px] text-slate-500">$CRAZY8</span>
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono">
                          Stake: <span className="text-slate-300 font-bold">{buyInDisplay}</span>
                        </div>
                      </div>

                      {/* Seated Contestants list */}
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>Contestants ({room.playerCount}/5)</span>
                          </span>
                          {room.spectatorCount > 0 && (
                            <span className="flex items-center gap-1 text-purple-300 font-mono lowercase">
                              <Eye className="w-3 h-3 text-purple-400" />
                              <span>{room.spectatorCount} watching</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {room.players.map((p) => {
                            const isCurrentTurn = room.currentTurnPlayerId === p.id;
                            return (
                              <div
                                key={p.id}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-medium transition-all ${
                                  isCurrentTurn
                                    ? 'bg-[#FF4600]/20 border-[#FF4600]/60 text-white ring-1 ring-[#FF4600]/50 animate-pulse'
                                    : 'bg-white/[0.03] border-white/[0.06] text-slate-300'
                                }`}
                              >
                                <UserAvatar avatar={p.avatar} name={p.name} className="w-4 h-4 rounded-full text-[10px]" />
                                <span className="truncate max-w-[80px]">{p.name}</span>
                                {isPlaying && p.cardCount !== undefined && (
                                  <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-bold ${
                                    p.cardCount <= 1
                                      ? 'bg-rose-500 text-white animate-bounce'
                                      : 'bg-black/50 text-slate-400'
                                  }`}>
                                    {p.cardCount}c
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Action Spectate Button */}
                    <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-500 font-mono">
                        Host: <strong className="text-slate-300">{room.hostName || 'Host'}</strong>
                      </div>

                      <button
                        onClick={() => {
                          onSpectateRoom(room.roomCode, playerName, playerAvatar);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-[#FF4600] to-orange-500 hover:brightness-110 active:scale-95 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-red-600/20"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Spectate Match</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* MODAL FOOTER                                              */}
        {/* ========================================================= */}
        <div className="p-3 sm:p-4 border-t border-white/[0.06] bg-[#08090C] flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono">Real-time socket observer synchronized</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
