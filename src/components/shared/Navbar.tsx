'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletConnect } from './WalletConnect';
import { Gamepad2, Swords, Layers, CircleDot, Trophy, Menu, X, ExternalLink } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'All Games', href: '/', icon: Gamepad2, logo: null },
    { name: 'Hemi Chess', href: '/play/chess', icon: Swords, logo: '/hemi-chess-icon.png' },
    { name: 'Hemi Crazy 8', href: '/play/uno', icon: Layers, logo: '/hemi-uno-emblem.svg' },
    { name: 'Hemi Connect 4', href: '/play/connect4', icon: CircleDot, logo: '/hemi-connect4-emblem.svg' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#FF4600]/20 bg-[#08090C]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 py-3">
          
          {/* Logo Branding */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              {/* Hemi Emblem SVG */}
              <div className="w-9 h-9 rounded-xl bg-[#FF4600]/15 border border-[#FF4600]/40 flex items-center justify-center shadow-[0_0_12px_rgba(255,70,0,0.25)] group-hover:scale-105 transition-transform">
                <svg viewBox="0 0 100 100" className="w-6 h-6" fill="none">
                  <g transform="translate(50, 50)">
                    <path d="M -4 -42 A 42 42 0 0 0 -4 42 L -4 16 A 16 16 0 0 1 -4 -16 Z" fill="#FF4600" />
                    <path d="M 4 -42 A 42 42 0 0 1 4 42 L 4 16 A 16 16 0 0 0 4 -16 Z" fill="#FF4600" />
                  </g>
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-black tracking-tight text-base sm:text-lg text-white whitespace-nowrap">
                    HEMI <span className="text-[#FF4600]">ARCADE</span>
                  </span>
                  <span className="hidden xs:inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#FF4600]/20 border border-[#FF4600]/40 text-[#FF4600] uppercase tracking-wider">
                    SEPOLIA
                  </span>
                </div>
                <span className="hidden sm:block text-[10px] text-slate-400 font-mono tracking-wide -mt-0.5">
                  Unified Web3 Gaming Hub
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1.5">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold tracking-wide transition-all ${
                    isActive
                      ? 'bg-[#FF4600]/15 text-[#FF4600] border border-[#FF4600]/40 shadow-[0_0_12px_rgba(255,70,0,0.2)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {item.logo ? (
                    <img src={item.logo} alt={item.name} className="w-4 h-4 object-contain rounded-sm shrink-0" />
                  ) : (
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FF4600]' : 'text-slate-400'}`} />
                  )}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Action: Network & Wallet */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://testnet.hemi.network"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-white/10 transition-all"
            >
              <span className="w-2 h-2 rounded-full bg-[#FF4600] animate-pulse" />
              <span>Chain: 743111</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>

            <WalletConnect />
          </div>

          {/* Mobile hamburger toggle */}
          <div className="flex md:hidden items-center gap-2">
            <WalletConnect />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/10"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#FF4600]/20 bg-[#08090C]/95 backdrop-blur-2xl px-4 pt-3 pb-5 space-y-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold ${
                  isActive
                    ? 'bg-[#FF4600]/20 text-[#FF4600] border border-[#FF4600]/40'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {item.logo ? (
                  <img src={item.logo} alt={item.name} className="w-5 h-5 object-contain rounded-sm shrink-0" />
                ) : (
                  <Icon className="w-5 h-5 shrink-0" />
                )}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
