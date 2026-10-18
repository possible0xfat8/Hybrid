'use client';

import React from 'react';
import { PlayClient } from '@/components/chess/game/PlayClient';

export default function ChessPlayPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <PlayClient />
    </main>
  );
}
