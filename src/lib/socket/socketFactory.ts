import { io, Socket } from 'socket.io-client';

export function getSocketBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const configured = (
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      ''
    ).trim();

    // If an external backend URL is explicitly configured (not localhost/127.0.0.1), use it
    if (
      configured &&
      configured.length > 0 &&
      !configured.includes('localhost') &&
      !configured.includes('127.0.0.1')
    ) {
      return configured.replace(/\/+$/, '');
    }

    // Always use the browser's current origin so HTTPS and Cloud Run work seamlessly
    return window.location.origin;
  }

  const port = process.env.PORT || process.env.SERVER_PORT || '3000';
  return `http://127.0.0.1:${port}`;
}

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
    const baseUrl = getSocketBaseUrl();
    const namespaceUrl = `${baseUrl.replace(/\/+$/, '')}/chess`;
    console.log('[SOCKET:CHESS] Initializing namespace connection to:', namespaceUrl);

    chessSocket = io(namespaceUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
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
  } else if (!chessSocket.connected && chessSocket.disconnected) {
    chessSocket.connect();
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
    const baseUrl = getSocketBaseUrl();
    const namespaceUrl = `${baseUrl.replace(/\/+$/, '')}/uno`;
    console.log('[SOCKET:UNO] Initializing namespace connection to:', namespaceUrl);

    unoSocket = io(namespaceUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
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
  } else if (!unoSocket.connected && unoSocket.disconnected) {
    unoSocket.connect();
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
    const baseUrl = getSocketBaseUrl();
    const namespaceUrl = `${baseUrl.replace(/\/+$/, '')}/connect4`;
    console.log('[SOCKET:CONNECT4] Initializing namespace connection to:', namespaceUrl);

    connect4Socket = io(namespaceUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
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
  } else if (!connect4Socket.connected && connect4Socket.disconnected) {
    connect4Socket.connect();
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
