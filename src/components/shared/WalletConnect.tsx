'use client';

import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { hemiSepolia } from '@/lib/web3/config';
import { Wallet, LogOut, ChevronDown, CheckCircle2, AlertTriangle, Copy, Check } from 'lucide-react';

export function WalletConnect() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: balanceData } = useBalance({
    address,
    chainId: hemiSepolia.id,
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isWrongNetwork = isConnected && chainId !== hemiSepolia.id;

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <button
        onClick={() => {
          const metamask = connectors[0];
          if (metamask) connect({ connector: metamask });
        }}
        disabled={isConnecting}
        className="relative group px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 sm:gap-2 bg-[#FF4600] hover:bg-[#e83a00] text-white shadow-[0_0_16px_rgba(255,70,0,0.3)] transition-all duration-200 cursor-pointer disabled:opacity-50 shrink-0"
      >
        <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:rotate-12 transition-transform shrink-0" />
        <span className="hidden xs:inline">{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
        <span className="xs:hidden">{isConnecting ? 'Connecting' : 'Connect'}</span>
      </button>
    );
  }

  if (isWrongNetwork) {
    return (
      <button
        onClick={() => switchChain({ chainId: hemiSepolia.id })}
        className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 transition-all cursor-pointer shadow-lg shadow-amber-500/10 shrink-0"
      >
        <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-bounce shrink-0" />
        <span className="hidden sm:inline">Switch to Hemi Sepolia</span>
        <span className="sm:hidden">Switch to Hemi</span>
      </button>
    );
  }

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  const formattedBalance = balanceData ? parseFloat(balanceData.formatted).toFixed(3) : '0.000';

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3.5 py-1.5 rounded-xl bg-obsidian-850 border border-white/10 hover:border-[#FF4600]/50 transition-all cursor-pointer"
      >
        {/* Network indicator pill */}
        <div className="hidden xs:flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-md bg-[#FF4600]/10 border border-[#FF4600]/30 text-[10px] sm:text-[11px] font-mono text-[#FF4600]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF4600]" />
          <span>Hemi</span>
        </div>

        {/* Balance & Address */}
        <div className="flex flex-col text-right">
          <span className="text-[11px] sm:text-xs font-bold text-white tracking-wide">
            {formattedBalance} <span className="text-[#FF4600] text-[9px] sm:text-[10px]">ETH</span>
          </span>
          <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
            {shortAddress}
          </span>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Wallet dropdown modal */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 p-3.5 rounded-2xl bg-obsidian-900 border border-[#FF4600]/30 shadow-[0_0_24px_rgba(255,70,0,0.2)] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
            <span className="text-xs font-semibold text-slate-300">Connected Account</span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Sepolia Active
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-black/50 border border-white/5 mb-2.5">
            <span className="text-xs font-mono text-slate-200">{shortAddress}</span>
            <button
              onClick={copyAddress}
              className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
              title="Copy Address"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-[#FF4600]/10 border border-[#FF4600]/25 mb-3">
            <div className="text-[11px] text-slate-400">Hemi Testnet Balance</div>
            <div className="text-base font-bold text-white mt-0.5">
              {balanceData ? balanceData.formatted.slice(0, 7) : '0.000'} <span className="text-xs text-[#FF4600]">ETH</span>
            </div>
          </div>

          <button
            onClick={() => {
              disconnect();
              setDropdownOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Disconnect Wallet</span>
          </button>
        </div>
      )}
    </div>
  );
}
