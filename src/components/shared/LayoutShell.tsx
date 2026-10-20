'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const pathname = usePathname();

  useEffect(() => {
    const handleChunkError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const error = 'error' in event ? event.error : event.reason;
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
    };

    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', handleChunkError);
    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleChunkError);
    };
  }, []);

  // If user is inside an individual game (/play/chess, /play/uno, /play/connect4), do NOT inject the shared arcade header/footer.
  // Each game possesses its own authentic navigation, header, status bar, and controls from its original repo.
  const isGameRoute =
    Boolean(
      pathname?.startsWith('/play/chess') ||
      pathname?.startsWith('/play/uno') ||
      pathname?.startsWith('/play/connect4')
    );

  if (isGameRoute) {
    return (
      <div className="w-full min-h-screen">
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#08090C] text-slate-100">
      {/* Subtle Hemi Brand Radial Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-[#FF4600]/[0.06] blur-[140px] pointer-events-none -z-10" />

      {/* Shared Arcade Hub Header */}
      <Navbar />

      {/* Main Arcade View */}
      <main className="flex-1 w-full">
        {children}
      </main>

      {/* Shared Arcade Hub Footer */}
      <Footer />
    </div>
  );
}
