/**
 * Base URL of the Hemi realtime/game server (Unified Express + Socket.IO + Next.js).
 */
function normalize(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function getBackendUrl(): string {
  // 1. In browser runtime: always prefer the current origin unless an external remote URL is explicitly configured
  if (typeof window !== 'undefined') {
    const remoteUrl = (
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      ''
    ).trim();

    // Only use remoteUrl if it's explicitly set to an external host (not localhost/127.0.0.1)
    if (
      remoteUrl &&
      remoteUrl.startsWith('http') &&
      !remoteUrl.includes('localhost') &&
      !remoteUrl.includes('127.0.0.1')
    ) {
      return normalize(remoteUrl);
    }

    return window.location.origin;
  }

  // 2. Server-side (SSR) execution fallback
  const port = process.env.PORT || process.env.SERVER_PORT || '3000';
  return `http://127.0.0.1:${port}`;
}

export const DEFAULT_BACKEND_URL = '';
