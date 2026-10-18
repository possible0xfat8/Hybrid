'use client';

import React from 'react';
import { Navbar } from '@/components/chess/Navbar';
import { Footer } from '@/components/chess/Footer';
import { Leaderboard } from '@/components/chess/Leaderboard';

export default function ChessLeaderboardPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-['Poppins',sans-serif]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Leaderboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-muted">
            Top ranked players on HemiChess by ELO rating
          </p>
        </div>

        <Leaderboard />
      </main>

      <Footer />
    </div>
  );
}
