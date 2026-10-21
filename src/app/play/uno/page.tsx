'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const UnoGameApp = dynamic(() => import('@/components/uno/UnoGameApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#08090C] text-white flex flex-col items-center justify-center p-4">
      <div className="w-12 h-12 rounded-2xl bg-[#FF4600]/15 border border-[#FF4600]/30 flex items-center justify-center text-[#FF4600] font-black text-xl shadow-[0_0_24px_rgba(255,70,0,0.3)] animate-pulse mb-3">
        8
      </div>
      <div className="text-sm font-mono text-slate-400">Loading Hemi Crazy 8...</div>
    </div>
  ),
});

export default function UnoPlayPage() {
  return (
    <main className="min-h-screen bg-[#08090C] text-white">
      <UnoGameApp />
    </main>
  );
}
