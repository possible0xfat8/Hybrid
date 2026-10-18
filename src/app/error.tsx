'use client';

import React, { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // If a ChunkLoadError occurs because the client held an older bundle hash,
    // automatically hard-refresh the window once to fetch the latest server bundles.
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('ChunkLoadError') ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('failed to fetch');

    if (isChunkError) {
      const lastReload = sessionStorage.getItem('hemi_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
        sessionStorage.setItem('hemi_chunk_reload', now.toString());
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="w-14 h-14 rounded-2xl bg-[#FF4600]/15 border border-[#FF4600]/30 flex items-center justify-center mb-4 text-[#FF4600] font-black text-xl shadow-[0_0_20px_rgba(255,70,0,0.2)]">
        !
      </div>
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
        Bundle Update Detected
      </h2>
      <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
        The application bundles have been updated on the development server. Please refresh your browser tab to load the latest build.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            sessionStorage.removeItem('hemi_chunk_reload');
            window.location.reload();
          }}
          className="px-5 py-2.5 rounded-xl bg-[#FF4600] hover:bg-[#e83a00] text-white font-bold text-sm transition-all shadow-[0_0_16px_rgba(255,70,0,0.3)] cursor-pointer"
        >
          Hard Refresh
        </button>
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-semibold text-sm transition-all cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
