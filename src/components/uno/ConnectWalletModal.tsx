import React, { useState, useEffect } from 'react';
import { DiscoveredWallet, subscribeToWallets } from '@/lib/uno/wallet';
import {
  X,
  Wallet,
  Shield,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Sparkles,
  Download,
} from 'lucide-react';

export interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet: (wallet: DiscoveredWallet) => Promise<void>;
  connectingWalletId: string | null;
  error: string | null;
  onClearError?: () => void;
}

export const ConnectWalletModal: React.FC<ConnectWalletModalProps> = ({
  isOpen,
  onClose,
  onSelectWallet,
  connectingWalletId,
  error,
  onClearError,
}) => {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [showOtherWallets, setShowOtherWallets] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = subscribeToWallets((updatedWallets) => {
      setWallets(updatedWallets);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const installedWallets = wallets.filter((w) => w.isInstalled);
  const otherWallets = wallets.filter((w) => !w.isInstalled);

  const handleWalletClick = async (wallet: DiscoveredWallet) => {
    if (onClearError) onClearError();
    if (wallet.isInstalled) {
      await onSelectWallet(wallet);
    } else if (wallet.installUrl) {
      window.open(wallet.installUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#0C0F14] border border-white/[0.08] rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/[0.06] mb-3 sm:mb-4 relative z-10">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/[0.04] border border-white/[0.08] text-[#FF4600] flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                <span>Connect Wallet</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400">
                Pick your wallet to jump into Hemi Crazy 8
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2 animate-in fade-in shrink-0">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-[11px] leading-snug">{error}</div>
          </div>
        )}


        {/* Wallets Scroll Container */}
        <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-3 sm:space-y-4">
          {/* Installed / Detected Wallets Section */}
          {installedWallets.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between px-1">
                <span>Available in Your Browser ({installedWallets.length})</span>
                <span className="text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Ready
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {installedWallets.map((w) => {
                  const isConnectingThis = connectingWalletId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      disabled={!!connectingWalletId}
                      onClick={() => handleWalletClick(w)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                        isConnectingThis
                          ? 'bg-white/[0.06] border-[#FF4600]/60'
                          : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] active:scale-98'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Wallet Icon */}
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center p-1.5 shrink-0 group-hover:scale-105 transition-transform">
                          <img
                            src={w.icon}
                            alt={w.name}
                            className="w-full h-full object-contain rounded-lg"
                          />
                        </div>

                        {/* Name & Details */}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                            <span className="truncate">{w.name}</span>
                            {w.isEIP6963 && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-300 font-normal">
                                EIP-6963
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                            Detected & ready to connect
                          </div>
                        </div>
                      </div>

                      {/* Right Indicator */}
                      <div className="shrink-0 flex items-center">
                        {isConnectingThis ? (
                          <div className="flex items-center gap-1.5 text-xs text-[#FF4600] font-bold">
                            <Loader2 className="w-4 h-4 animate-spin text-[#FF4600]" />
                            <span className="text-[10px] sm:text-xs hidden xs:inline">Connecting...</span>
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-white/[0.04] group-hover:bg-[#FF4600] text-slate-400 group-hover:text-white flex items-center justify-center transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* No wallets detected empty state */
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-2.5 text-slate-400">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-white mb-1">
                No Web3 Wallets Detected
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed mb-3">
                No compatible wallet extensions found in your browser. Install MetaMask, Rabby, or OKX to play Crazy 8 on Hemi.
              </p>
            </div>
          )}

          {/* Other Popular Wallets Section */}
          {otherWallets.length > 0 && (
            <div className="pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setShowOtherWallets(!showOtherWallets)}
                className="w-full flex items-center justify-between text-[11px] sm:text-xs font-mono font-medium text-slate-400 hover:text-slate-200 py-1 cursor-pointer transition-colors"
              >
                <span>Other Wallets ({otherWallets.length})</span>
                <span className="text-[10px] text-[#FF4600]">
                  {showOtherWallets ? 'Hide ▲' : 'Show All ▼'}
                </span>
              </button>

              {showOtherWallets && (
                <div className="grid grid-cols-1 gap-1.5 mt-2 animate-in fade-in">
                  {otherWallets.map((w) => (
                    <div
                      key={w.id}
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] p-1 shrink-0">
                          <img
                            src={w.icon}
                            alt={w.name}
                            className="w-full h-full object-contain rounded-md"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-200 truncate">{w.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{w.description}</div>
                        </div>
                      </div>

                      {w.installUrl && (
                        <a
                          href={w.installUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 hover:text-white text-[10px] font-medium flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        >
                          <span>Install</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Notes */}
        <div className="pt-3 border-t border-white/[0.06] mt-3 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-500 shrink-0">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-slate-400" />
            Hemi Network Safe
          </span>
          <span>EIP-6963 Compatible</span>
        </div>
      </div>
    </div>
  );
};
