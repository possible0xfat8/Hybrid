import React, { useState } from 'react';
import {
  WalletState,
  formatAddress,
  isHemiChain,
  getHemiNetworkInfo,
} from '@/lib/uno/wallet';
import {
  Wallet,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  LogOut,
  Zap,
} from 'lucide-react';

interface WalletConnectButtonProps {
  wallet: WalletState;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  onSwitchNetwork?: () => Promise<void>;
  compact?: boolean;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  wallet,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
  compact = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const networkInfo = getHemiNetworkInfo(wallet.chainId);
  const isHemi = networkInfo.isHemi;

  if (!wallet.address) {
    return (
      <div className="relative shrink-0">
        <button
          onClick={() => onConnect()}
          disabled={wallet.isConnecting}
          className={`
            px-2.5 xs:px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-xl font-bold text-[11px] sm:text-xs tracking-wider uppercase transition-all duration-200
            flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm select-none shrink-0
            ${wallet.isConnecting
              ? 'bg-white/[0.06] text-slate-400 cursor-wait'
              : 'bg-[#FF4600] hover:bg-[#FF5500] text-white active:scale-95'}
          `}
          title="Connect Web3 Wallet (MetaMask, OKX, Rabby, Zerion)"
        >
          <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{wallet.isConnecting ? '...' : <><span className="hidden xs:inline">Connect </span>Wallet</>}</span>
        </button>

        {wallet.error && (
          <div className="absolute right-0 top-full mt-2 w-64 p-2.5 rounded-xl bg-rose-950/90 border border-rose-500/30 text-rose-200 text-[11px] shadow-xl z-50 animate-in fade-in">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <div>{wallet.error}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Connected state
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="px-2 xs:px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl bg-[#111620] border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-1.5 sm:gap-2 text-xs select-none shadow-sm cursor-pointer shrink-0"
      >
        {/* Orange Wallet Icon */}
        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg bg-[#FF4600]/15 border border-[#FF4600]/30 flex items-center justify-center text-[#FF4600] shrink-0">
          <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>

        {/* Text Details (Desktop only) */}
        <div className="flex flex-col text-left leading-tight hidden md:flex">
          <span className="font-black text-white text-[11px]">Hemi Wallet</span>
          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>

        {/* Truncated Address */}
        <span className="font-mono text-[10px] xs:text-[11px] sm:text-xs font-bold text-slate-300">
          <span className="sm:hidden">{wallet.address.slice(0, 4)}..{wallet.address.slice(-2)}</span>
          <span className="hidden sm:inline">{formatAddress(wallet.address)}</span>
        </span>

        <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 p-3.5 rounded-2xl bg-[#0C0F14] border border-white/[0.08] shadow-2xl z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header / Network */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#FF4600]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    {networkInfo.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Chain ID: {wallet.chainId || 'Unknown'}
                  </div>
                </div>
              </div>

              {!isHemi && onSwitchNetwork && (
                <button
                  onClick={() => {
                    onSwitchNetwork();
                    setDropdownOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#FF4600] hover:bg-[#FF5500] text-white font-bold text-[10px] transition-colors"
                >
                  Switch to Hemi
                </button>
              )}
            </div>

            {/* Address & Copy */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-3">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                Connected Address
              </div>
              <div className="text-xs font-mono text-slate-200 break-all select-all">
                {wallet.address}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06] text-[11px]">
                <span className="text-slate-400">Balance:</span>
                <span className="font-mono font-bold text-white">
                  {wallet.balance ? `${wallet.balance} ETH` : 'Fetching...'}
                </span>
              </div>
            </div>

            {/* Links & Disconnect */}
            <div className="space-y-1.5 text-xs">
              <a
                href={`${networkInfo.explorerUrl}/address/${wallet.address}`}
                target="_blank"
                rel="noreferrer"
                className="w-full p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-300 hover:text-white flex items-center justify-between transition-colors"
              >
                <span>View on Explorer</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>

              <button
                onClick={() => {
                  onDisconnect();
                  setDropdownOpen(false);
                }}
                className="w-full p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Disconnect</span>
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
