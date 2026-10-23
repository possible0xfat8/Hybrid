import React from 'react';
import Link from 'next/link';
import { Gamepad2, Shield, Flame, ExternalLink, Github, Terminal } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-[#FF4600]/15 bg-obsidian-950 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Brand column */}
        <div className="md:col-span-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FF4600] flex items-center justify-center text-white shadow-[0_0_12px_rgba(255,70,0,0.3)]">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-white tracking-wider text-base">HYBRID</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The premier Web3 arcade ecosystem powered by Hemi Network. Featuring on-chain competitive Chess, high-stakes Crazy 8 Uno, and Connect 4 with automated smart contract settlements.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-[#FF4600]">
            <span className="w-2 h-2 rounded-full bg-[#FF4600] animate-pulse" />
            <span>Hemi Sepolia (Chain 743111)</span>
          </div>
        </div>

        {/* Quick Launch */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-[#FF4600]" /> Games
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/play/chess" className="hover:text-[#FF4600] transition-colors">
                Hemi Chess Arena (1v1 ELO & Matchmaking)
              </Link>
            </li>
            <li>
              <Link href="/play/uno" className="hover:text-[#FF4600] transition-colors">
                Hemi Crazy 8 (Action Cards & Chip Pots)
              </Link>
            </li>
            <li>
              <Link href="/play/connect4" className="hover:text-[#FF4600] transition-colors">
                Hemi Connect 4 (1v1 On-Chain ELO Duel)
              </Link>
            </li>
          </ul>
        </div>

        {/* Smart Contracts */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#FF4600]" /> Verified Contracts
          </h4>
          <ul className="space-y-2 text-xs font-mono">
            <li>
              <a
                href="https://testnet.explorer.hemi.network/address/0xeE82E97e9B8bA9b189FcB7Dedb65Dc3717f41d79"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#FF4600] flex items-center gap-1 transition-colors"
              >
                <span>Chess ELO: 0xeE82...1d79</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </li>
            <li>
              <a
                href="https://testnet.explorer.hemi.network/address/0xfe6dc2c29b9f0e83c229a9a3deb1c89cde81afa3"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#FF4600] flex items-center gap-1 transition-colors"
              >
                <span>Connect 4 ELO: 0xfe6d...afa3</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </li>
            <li>
              <a
                href="https://testnet.explorer.hemi.network/address/0x19B111602A60442CCbe947a58a5fd7CB0195324E"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#FF4600] flex items-center gap-1 transition-colors"
              >
                <span>$CRAZY8: 0x19B1...324E</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </li>
            <li>
              <a
                href="https://testnet.explorer.hemi.network/address/0xbD42f75Fee8aD5Dd260DAbbC0520b5A0Efa1F060"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#FF4600] flex items-center gap-1 transition-colors"
              >
                <span>Uno Escrow: 0xbD42...F060</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </li>
          </ul>
        </div>

        {/* Developer & Hemi Links */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#FF4600]" /> Ecosystem
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <a
                href="https://faucet.hemi.network"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white flex items-center gap-1"
              >
                <span>Hemi Sepolia Faucet</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </li>
            <li>
              <a
                href="https://docs.hemi.xyz"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white flex items-center gap-1"
              >
                <span>Hemi Network Documentation</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </li>
            <li>
              <a
                href="https://github.com/possible0xfat8"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white flex items-center gap-1"
              >
                <Github className="w-3 h-3 text-slate-400" />
                <span>GitHub Repositories</span>
              </a>
            </li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div>© 2026 Hybrid. Unified Web3 Gaming Dashboard on Hemi Network.</div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-[#FF4600]">Socket Isolation: /chess, /uno & /connect4</span>
          <span>•</span>
          <span className="text-slate-300">100% Non-Custodial Escrow</span>
        </div>
      </div>
    </footer>
  );
}
