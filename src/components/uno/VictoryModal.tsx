import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { GameState } from '../types';
import { Trophy, CheckCircle2, Copy, ArrowRight, ShieldCheck, LogOut, ExternalLink, Loader2, Eye, EyeOff } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface VictoryModalProps {
  gameState: GameState;
  myPlayerId: string;
  isHost: boolean;
  onRematch: () => void;
  onLeaveRoom?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  gameState,
  myPlayerId,
  isHost,
  onRematch,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const winner = gameState.winner;
  const isMe = winner?.id === myPlayerId;
  const signature = gameState.settlementSignature;

  useEffect(() => {
    // Launch celebratory confetti
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  }, []);

  const handleCopySignature = () => {
    if (signature) {
      navigator.clipboard.writeText(JSON.stringify(signature, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClaim = () => {
    setClaimed(true);
  };

  // If player minimized the modal to inspect the table
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0C0F14]/90 border border-[#FF4600]/50 rounded-2xl p-3 sm:px-6 shadow-[0_0_35px_rgba(255,70,0,0.35)] backdrop-blur-md flex items-center gap-3 sm:gap-4 animate-in slide-in-from-bottom-5">
        <span className="text-xl sm:text-2xl">🏆</span>
        <div className="text-left">
          <div className="text-xs sm:text-sm font-bold text-white">
            {isMe ? 'You Won the Match!' : `${winner?.name || 'Player'} Won!`}
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            Final Pot: <span className="text-[#FF4600] font-bold">{gameState.escrowPot.amount} {gameState.escrowPot.currency === 'ETH' ? 'CRAZY8' : gameState.escrowPot.currency}</span>
          </div>
        </div>
        <button
          onClick={() => setIsMinimized(false)}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
        >
          <Eye className="w-3.5 h-3.5 text-[#FF4600]" />
          <span className="hidden sm:inline">Show Details</span>
        </button>
        <button
          onClick={onRematch}
          className="px-3 py-1.5 rounded-xl bg-[#FF4600] hover:bg-[#FF5500] text-xs font-bold text-white transition-all shadow-sm"
        >
          <span>Rematch</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-2 sm:p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-[#0C0F14]/95 border border-[#FF4600]/30 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 max-w-lg w-full shadow-2xl text-center relative overflow-y-auto max-h-[92vh] sm:max-h-[90vh] custom-scrollbar">
        {/* Inspect Table Toggle Button */}
        <button
          onClick={() => setIsMinimized(true)}
          className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-semibold text-slate-300 hover:text-white transition-all"
          title="Minimize modal to inspect the table"
        >
          <Eye className="w-3.5 h-3.5 text-[#FF4600]" />
          <span>Inspect Table</span>
        </button>

        <div className="relative z-10">
          <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-2xl sm:text-3xl mb-2.5 sm:mb-3">
            🏆
          </div>

          <div className="inline-block px-2.5 sm:px-3 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[#FF4600] font-mono text-[10px] sm:text-xs font-semibold mb-1.5 sm:mb-2">
            HEMI CRAZY 8 • MATCH COMPLETE
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {isMe ? 'YOU WON THE MATCH!' : `${winner?.name || 'Player'} Won!`}
          </h2>

          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 mb-3 sm:mb-4">
            {isMe
              ? 'Congratulations! You shed all your cards first.'
              : `${winner?.name} has emptied their hand first.`}
          </p>

          {/* Pot settlement badge */}
          <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/[0.06] mb-3 sm:mb-4">
            <div className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">
              Escrow Pot Award ($CRAZY8)
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white font-mono flex items-center justify-center gap-1.5 sm:gap-2">
              <span className="text-[#FF4600]">{gameState.escrowPot.amount}</span>
              <span className="text-xs sm:text-sm text-slate-400 font-medium">
                {gameState.escrowPot.currency === 'ETH' ? 'CRAZY8' : gameState.escrowPot.currency}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-[10px] sm:text-[11px] font-mono">
              <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-slate-300">
                <div className="text-[9px] uppercase font-medium text-slate-400">95% Winner Payout</div>
                <div className="font-bold text-xs text-white">{(parseFloat(gameState.escrowPot.amount) * 0.95).toFixed(1)} {gameState.escrowPot.currency === 'ETH' ? 'CRAZY8' : gameState.escrowPot.currency}</div>
              </div>
              <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-slate-300">
                <div className="text-[9px] uppercase font-medium text-slate-400">5% Board Fee</div>
                <div className="font-bold text-xs text-white">{(parseFloat(gameState.escrowPot.amount) * 0.05).toFixed(1)} {gameState.escrowPot.currency === 'ETH' ? 'CRAZY8' : gameState.escrowPot.currency}</div>
              </div>
            </div>
          </div>

          {/* Lobby Scoreboard & Standings */}
          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/[0.06] mb-3 sm:mb-4 text-left">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FF4600]" />
                Lobby Standings & Scores
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">
                Round {gameState.players[0]?.roundsPlayed || 1}
              </span>
            </div>
            <div className="space-y-1 sm:space-y-1.5 max-h-32 sm:max-h-36 overflow-y-auto no-scrollbar">
              {[...gameState.players]
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs ${
                      p.id === winner?.id
                        ? 'bg-white/[0.06] border-white/[0.12] text-white'
                        : 'bg-white/[0.02] border-white/[0.04] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <span className="font-mono text-slate-400 font-medium w-4 text-[10px] sm:text-xs">#{idx + 1}</span>
                      <UserAvatar avatar={p.avatar} name={p.name} className="w-5 h-5 text-sm sm:text-base shrink-0 rounded-full" />
                      <span className="font-medium truncate max-w-[85px] sm:max-w-[120px]">{p.name}</span>
                      {p.id === myPlayerId && (
                        <span className="text-[8px] sm:text-[9px] px-1 py-0.2 rounded bg-[#FF4600]/20 border border-[#FF4600]/40 text-[#FF4600] font-bold shrink-0">YOU</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 font-mono shrink-0">
                      {p.lastRoundScore !== undefined && p.lastRoundScore > 0 && (
                        <span className="text-emerald-400 text-[10px] sm:text-[11px] font-medium">+{p.lastRoundScore}</span>
                      )}
                      <span className="text-white font-bold text-xs sm:text-sm">
                        {p.score || 0} <span className="text-[9px] sm:text-[10px] text-slate-500 font-normal">pts</span>
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Oracle On-Chain Settlement Status Box */}
          {signature ? (
            <div className="p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl bg-white/[0.02] border border-white/[0.06] text-left text-[10px] sm:text-xs mb-3 sm:mb-4 font-mono shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1.5">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Oracle On-Chain Settlement</span>
                </span>
                <button
                  onClick={handleCopySignature}
                  className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-300 hover:text-white bg-white/[0.04] border border-white/[0.06] px-1.5 sm:px-2 py-0.5 rounded transition-colors cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <div className="space-y-1 sm:space-y-1.5 text-[10px] sm:text-[11px] text-slate-300">
                <div className="truncate"><span className="text-slate-500">Winner:</span> {signature.winnerAddress}</div>
                {signature.signature && signature.signature.length === 66 ? (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06] flex-wrap">
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>95% Pot Transferred</span>
                    </span>
                    <a
                      href={`https://testnet.explorer.hemi.xyz/tx/${signature.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FF4600] hover:text-[#FF6622] flex items-center gap-1 font-mono font-medium"
                    >
                      <span>View Tx on Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <div className="truncate"><span className="text-slate-500">Sig:</span> {signature.signature.substring(0, 24)}...</div>
                )}
              </div>
            </div>
          ) : gameState.isStaking && parseFloat(gameState.escrowPot?.amount || '0') > 0 ? (
            <div className="p-2.5 sm:p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[10px] sm:text-xs mb-3 sm:mb-4 text-center text-slate-300 flex items-center justify-center gap-2 font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF4600] shrink-0" />
              <span>Oracle disbursing 95% pot reward on Hemi Sepolia...</span>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 justify-center">
            {isMe && (
              signature?.signature && signature.signature.length === 66 ? (
                <a
                  href={`https://testnet.explorer.hemi.xyz/tx/${signature.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>✓ 95% Pot Transferred</span>
                  <ExternalLink className="w-3 h-3 text-emerald-400" />
                </a>
              ) : gameState.isStaking && parseFloat(gameState.escrowPot?.amount || '0') > 0 ? (
                <div className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm tracking-wide bg-white/[0.04] border border-white/[0.08] text-slate-300 flex items-center justify-center gap-2 cursor-wait">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF4600]" />
                  <span>Oracle Disbursing On-Chain...</span>
                </div>
              ) : (
                <button
                  onClick={handleClaim}
                  disabled={claimed}
                  className={`
                    w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all shadow-sm cursor-pointer
                    ${claimed
                      ? 'bg-white/[0.06] border border-white/[0.1] text-slate-300 cursor-default'
                      : 'bg-[#FF4600] hover:bg-[#FF5500] text-white active:scale-95'}
                  `}
                >
                  {claimed ? '✓ Recorded' : 'Record Match'}
                </button>
              )
            )}

            <button
              onClick={onRematch}
              className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#FF4600] hover:bg-[#FF5500] text-white font-bold text-xs sm:text-sm tracking-wide transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm cursor-pointer"
            >
              <span>Next Round / Rematch</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {onLeaveRoom && (
              <button
                onClick={onLeaveRoom}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white font-medium text-xs sm:text-sm tracking-wide transition-all active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                <span>Quit to Lobby</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
