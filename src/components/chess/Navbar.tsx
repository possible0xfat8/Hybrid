'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectWallet } from './ConnectWallet'
import { ServerStatus } from './ServerStatus'
import { NotificationBell } from './NotificationBell'
import { ProfileCard } from './ProfileCard'
import { OnlineUserCount } from './OnlineUserCount'
import { useAccount } from 'wagmi'
import { Gamepad2, Shield, Trophy, Users, LayoutDashboard, Music, ArrowLeft } from 'lucide-react'
import { chessMusic } from '@/lib/chess/sounds'

const ADMIN_WALLETS = (process.env.NEXT_PUBLIC_ADMIN_WALLETS || process.env.ADMIN_WALLETS || '')
  .split(',')
  .map(addr => addr.trim().toLowerCase())
  .filter(addr => addr.length > 0)

const publicLinks = [
  { href: '/play/chess', label: 'Play', icon: Gamepad2 },
  { href: '/play/chess/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/play/chess/friends', label: 'Friends', icon: Users },
] as const

export function Navbar() {
  const pathname = usePathname()
  const { address, isConnected } = useAccount()
  const [isMusicOn, setIsMusicOn] = useState(true)

  useEffect(() => {
    setIsMusicOn(chessMusic.isMusicOn())
  }, [])

  const toggleMusic = () => {
    const next = !isMusicOn
    setIsMusicOn(next)
    chessMusic.setMusicEnabled(next)
    if (next) {
      chessMusic.startMusic('lobby')
    }
  }
  
  // Check if connected wallet is an admin
  const isAdmin = isConnected && address && ADMIN_WALLETS.includes(address.toLowerCase())

  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-[color-mix(in_oklab,var(--bg-elevated)_92%,transparent)] px-2.5 sm:px-5 md:px-6 py-2.5 sm:py-3 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
        
        {/* Left section: Back to Arcade + Logo + Server Status */}
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 min-w-0 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all group shrink-0"
            title="Return to Hybrid Hub"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-[#FF4600]" />
            <span className="font-bold text-xs">Arcade</span>
          </Link>

          <Link href="/play/chess" className="flex items-center min-w-max group shrink-0">
            <img 
              src="/hemi-chess-logo.png" 
              alt="Hemi Chess" 
              className="h-7 sm:h-9 md:h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.03]"
            />
          </Link>

          <div className="hidden xs:block">
            <ServerStatus />
          </div>
          
          {/* Online User Count - Desktop Only */}
          <div className="hidden lg:block">
            <OnlineUserCount size="sm" />
          </div>
        </div>

        {/* Center Navigation - Desktop Only */}
        <div className="hidden md:flex items-center gap-1.5 flex-1 justify-center max-w-md">
          {publicLinks.map((l) => {
            const Icon = l.icon
            const isActive = pathname === l.href
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold tracking-tight transition-colors ${
                  isActive
                    ? 'bg-orange-soft text-orange'
                    : 'text-ink-muted hover:text-ink hover:bg-[var(--surface-strong)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{l.label}</span>
              </Link>
            )
          })}
          
          {/* Admin link */}
          {isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
                pathname === '/admin'
                  ? 'bg-orange-soft text-orange'
                  : 'text-ink-muted hover:text-ink hover:bg-[var(--surface-strong)]'
              }`}
              title="Admin Panel"
            >
              <Shield className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Right section: Music + Notifications + Profile Card + Connect */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Background Music Toggle */}
          <button
            onClick={toggleMusic}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
              isMusicOn
                ? 'bg-orange-soft border-orange/40 text-orange shadow-[0_0_12px_rgba(255,70,0,0.2)]'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-500 hover:text-slate-300'
            }`}
            title={isMusicOn ? 'Mute Background Music' : 'Play Background Music'}
          >
            <Music className={`w-3.5 h-3.5 ${isMusicOn ? 'animate-pulse text-[#FF4600]' : ''}`} />
            <span className="text-[10px] font-mono font-bold hidden sm:inline">
              {isMusicOn ? 'BGM ON' : 'BGM OFF'}
            </span>
          </button>

          {/* Notification Bell - only show when connected */}
          {isConnected && <NotificationBell />}
          
          {/* Profile Card - only show when connected */}
          {isConnected && (
            <ProfileCard 
              isActive={pathname === '/profile'}
              isAdmin={isAdmin}
            />
          )}
          
          {/* Connect Wallet Button */}
          <ConnectWallet />
        </div>

      </div>
    </nav>
  )
}
