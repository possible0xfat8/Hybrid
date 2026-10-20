/**
 * Base URL of the HemiChess realtime/game server (Express + socket.io in /backend).
 *
 * Resolution order:
 *  1. VITE_BACKEND_URL build-time env var
 *  2. The default below (fallback)
 * 
 * Note: localStorage is ignored. URL is set at build time only.
 */
export const DEFAULT_BACKEND_URL =
  (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.VITE_BACKEND_URL)) ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function getBackendUrl(): string {
  // Always use the default URL (from env var or constant)
  return normalize(DEFAULT_BACKEND_URL);
}
