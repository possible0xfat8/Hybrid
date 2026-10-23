'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { UserProfileClient } from '@/components/chess/game/UserProfileClient';

export default function UserProfilePage() {
  const params = useParams();
  const address = typeof params?.address === 'string' ? params.address : '';

  if (!address) {
    return (
      <div className="min-h-screen bg-[#07090C] text-white flex items-center justify-center p-4">
        <p className="text-slate-400 font-mono text-sm">No player address specified</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090C] text-white">
      <UserProfileClient walletAddress={address} />
    </main>
  );
}
