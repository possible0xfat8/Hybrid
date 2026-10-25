import { io, Socket } from 'socket.io-client';

function getSocketBaseUrl(): string {
  const configured = (
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  ).trim();

  if (configured && configured.length > 0) {
    return configured.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:3000';
}

const BACKEND_URL = getSocketBaseUrl();

// Isolated socket singletons
let chessSocket: Socket | null = null;
let unoSocket: Socket | null = null;
let connect4Socket: Socket | null = null;

/**
 * Returns the isolated Socket.IO client for Hemi Chess (/chess namespace)
 */
export function getChessSocket(): Socket {
  if (typeof window === 'undefined') {
    return null as any;
  }

  if (!chessSocket) {
    const namespaceUrl = `${BACKEND_URL.replace(/\/+$/, '')}/chess`;
    console.log('[SOCKET:CHESS] Initializing namespace connection to:', namespaceUrl);

    chessSocket = io(namespaceUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    });

    chessSocket.on('connect', () => {
      console.log('[SOCKET:CHESS] ✓ Connected to /chess namespace');
    });

    chessSocket.on('disconnect', (reason) => {
      console.log('[SOCKET:CHESS] ✗ Disconnected from /chess namespace:', reason);
    });

    chessSocket.on('connect_error', (error) => {
      console.warn('[SOCKET:CHESS] Connection error:', error.message);
    });
  }

  return chessSocket;
}

export function disconnectChessSocket(): void {
  if (chessSocket) {
    chessSocket.removeAllListeners();
    chessSocket.disconnect();
    chessSocket = null;
  }
}

/**
 * Returns the isolated Socket.IO client for Hemi Crazy 8 (/uno namespace)
 */
export function getUnoSocket(): Socket {
  if (typeof window === 'undefined') {
    return null as any;
  }

  if (!unoSocket) {
    const namespaceUrl = `${BACKEND_URL.replace(/\/+$/, '')}/uno`;
    console.log('[SOCKET:UNO] Initializing namespace connection to:', namespaceUrl);

    unoSocket = io(namespaceUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    });

    unoSocket.on('connect', () => {
      console.log('[SOCKET:UNO] ✓ Connected to /uno namespace');
    });

    unoSocket.on('disconnect', (reason) => {
      console.log('[SOCKET:UNO] ✗ Disconnected from /uno namespace:', reason);
    });

    unoSocket.on('connect_error', (error) => {
      console.warn('[SOCKET:UNO] Connection error:', error.message);
    });
  }

  return unoSocket;
}

export function disconnectUnoSocket(): void {
  if (unoSocket) {
    unoSocket.removeAllListeners();
    unoSocket.disconnect();
    unoSocket = null;
  }
}

/**
 * Returns the isolated Socket.IO client for Hemi Connect 4 (/connect4 namespace)
 */
export function getConnect4Socket(): Socket {
  if (typeof window === 'undefined') {
    return null as any;
  }

  if (!connect4Socket) {
    const namespaceUrl = `${BACKEND_URL.replace(/\/+$/, '')}/connect4`;
    console.log('[SOCKET:CONNECT4] Initializing namespace connection to:', namespaceUrl);

    connect4Socket = io(namespaceUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    });

    connect4Socket.on('connect', () => {
      console.log('[SOCKET:CONNECT4] ✓ Connected to /connect4 namespace');
    });

    connect4Socket.on('disconnect', (reason) => {
      console.log('[SOCKET:CONNECT4] ✗ Disconnected from /connect4 namespace:', reason);
    });

    connect4Socket.on('connect_error', (error) => {
      console.warn('[SOCKET:CONNECT4] Connection error:', error.message);
    });
  }

  return connect4Socket;
}

export function disconnectConnect4Socket(): void {
  if (connect4Socket) {
    connect4Socket.removeAllListeners();
    connect4Socket.disconnect();
    connect4Socket = null;
  }
}
