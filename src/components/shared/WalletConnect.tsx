'use client';

import React, { useState, useEffect } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useChainId,
  useSwitchChain,
} from 'wagmi';
import { hemiSepolia } from '@/lib/web3/config';
import { getBackendUrl } from '@/lib/config';
import { saveLastConnectedWallet } from '@/lib/uno/account';
import { setActiveProvider, clearActiveProvider } from '@/lib/uno/wallet';
import {
  Wallet,
  LogOut,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  X,
} from 'lucide-react';

export function WalletConnect() {
  const { address, isConnected, isConnecting, connector } = useAccount();
  const { connect, connectors, error: connectError, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: balanceData } = useBalance({
    address,
    chainId: hemiSepolia.id,
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showConnectors, setShowConnectors] = useState(false);
  const [copied, setCopied] = useState(false);

  // Prioritize specific EIP-6963 discovered connectors over the generic 'injected' shim
  // so clicking a wallet name always connects that exact wallet extension
  const sortedConnectors = [...connectors].sort((a, b) => {
    if (a.id === 'injected' && b.id !== 'injected') return 1;
    if (a.id !== 'injected' && b.id === 'injected') return -1;
    return 0;
  });
  const uniqueConnectors = sortedConnectors.filter(
    (c, i, arr) => arr.findIndex((o) => o.name === c.name) === i
  );

  const isWrongNetwork = isConnected && chainId !== hemiSepolia.id;
  const busy = isConnecting || isPending;

  // Sync wallet connection with backend and shared active provider across all games
  useEffect(() => {
    if (isConnected && address) {
      setShowConnectors(false);
      const cleanAddr = address.toLowerCase();
      saveLastConnectedWallet(cleanAddr);

      if (connector && typeof connector.getProvider === 'function') {
        connector
          .getProvider()
          .then((prov) => {
            if (prov) {
              setActiveProvider(prov, connector.name, connector.id);
            }
          })
          .catch(() => {});
      }

      fetch(`${getBackendUrl()}/api/users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: cleanAddr }),
      }).catch(() => {});
    }
  }, [isConnected, address, connector]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSelectConnector = (walletConnector: (typeof connectors)[0]) => {
    try {
      connect({ connector: walletConnector });
    } catch (err) {
      console.error('[WalletConnect] Connection error:', err);
    }
  };

  const handleDisconnect = () => {
    try {
      if (connector) {
        disconnect({ connector });
      } else {
        disconnect();
      }
      clearActiveProvider();
      saveLastConnectedWallet(null);
      setDropdownOpen(false);
    } catch (err) {
      console.error('[WalletConnect] Disconnect error:', err);
    }
  };

  if (!isConnected) {
    return (
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setShowConnectors((prev) => !prev)}
          disabled={busy}
          className="relative group px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 sm:gap-2 bg-[#FF4600] hover:bg-[#e83a00] text-white shadow-[0_0_16px_rgba(255,70,0,0.3)] transition-all duration-200 cursor-pointer disabled:opacity-50 shrink-0"
        >
          <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:rotate-12 transition-transform shrink-0" />
          <span className="hidden xs:inline">{busy ? 'Connecting...' : 'Connect Wallet'}</span>
          <span className="xs:hidden">{busy ? 'Connecting' : 'Connect'}</span>
        </button>

        {showConnectors && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowConnectors(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-64 p-3 rounded-2xl bg-[#0C0F14] border border-[#FF4600]/30 shadow-[0_0_28px_rgba(255,70,0,0.25)] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/10">
                <div>
                  <p className="text-xs font-bold text-white">Choose Wallet</p>
                  <p className="text-[10px] text-slate-400">Connect to Hemi Network</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConnectors(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {uniqueConnectors.length === 0 ? (
                  <div className="px-3 py-4 text-center">
                    <p className="text-xs text-slate-300">No wallets detected</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Install MetaMask, Rabby, or use WalletConnect
                    </p>
                  </div>
                ) : (
                  uniqueConnectors.map((walletConnector) => (
                    <button
                      key={walletConnector.uid}
                      type="button"
                      onClick={() => handleSelectConnector(walletConnector)}
                      disabled={busy}
                      className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-200 hover:bg-[#FF4600]/15 hover:text-[#FF4600] border border-white/5 hover:border-[#FF4600]/30 disabled:opacity-50 transition-all flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {walletConnector.icon ? (
                          <img
                            src={walletConnector.icon}
                            alt={walletConnector.name}
                            className="w-4 h-4 rounded object-contain shrink-0"
                          />
                        ) : (
                          <Wallet className="w-4 h-4 text-[#FF4600] shrink-0" />
                        )}
                        <span className="truncate">{walletConnector.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">Connect</span>
                    </button>
                  ))
                )}
              </div>

              {connectError && (
                <div className="mt-2.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-[11px] text-red-400 font-semibold">Connection Failed</p>
                  <p className="text-[10px] text-red-300/80 mt-0.5 leading-snug">
                    {connectError.message.includes('User rejected') ||
                    connectError.message.includes('User denied')
                      ? 'Connection request was rejected.'
                      : connectError.message.includes('Provider not found')
                      ? 'Wallet extension not found. Try another option.'
                      : connectError.message}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <button
        type="button"
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
        type="button"
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

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
            dropdownOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Wallet dropdown modal */}
      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 p-3.5 rounded-2xl bg-[#0C0F14] border border-[#FF4600]/30 shadow-[0_0_24px_rgba(255,70,0,0.2)] z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
              <span className="text-xs font-semibold text-slate-300">Connected Account</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Sepolia Active
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-black/50 border border-white/5 mb-2.5">
              <span className="text-xs font-mono text-slate-200">{shortAddress}</span>
              <button
                type="button"
                onClick={copyAddress}
                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Copy Address"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-[#FF4600]/10 border border-[#FF4600]/25 mb-3">
              <div className="text-[11px] text-slate-400">Hemi Testnet Balance</div>
              <div className="text-base font-bold text-white mt-0.5">
                {balanceData ? balanceData.formatted.slice(0, 7) : '0.000'}{' '}
                <span className="text-xs text-[#FF4600]">ETH</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDisconnect}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect Wallet</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
