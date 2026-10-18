import { Socket } from 'socket.io-client';
import { getChessSocket, disconnectChessSocket } from '@/lib/socket/socketFactory';

export function getSocket(): Socket {
  return getChessSocket();
}

export function disconnectSocket(): void {
  disconnectChessSocket();
}

export function reconnectSocket(): void {
  disconnectChessSocket();
  getChessSocket();
}

export function isSocketConnected(): boolean {
  const s = getChessSocket();
  return s ? s.connected : false;
}

export function getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
  const s = getChessSocket();
  if (!s) return 'disconnected';
  return s.connected ? 'connected' : 'disconnected';
}

export function onConnectionStatusChange(callback: (status: 'connected' | 'disconnected' | 'connecting') => void): () => void {
  const s = getChessSocket();
  if (!s) return () => {};

  const onConnect = () => callback('connected');
  const onDisconnect = () => callback('disconnected');

  s.on('connect', onConnect);
  s.on('disconnect', onDisconnect);

  if (s.connected) {
    callback('connected');
  } else {
    callback('connecting');
  }

  return () => {
    s.off('connect', onConnect);
    s.off('disconnect', onDisconnect);
  };
}

export const subscribeToConnectionStatus = onConnectionStatusChange;

export function registerPlayerOnline(walletAddress: string, playerName?: string): void {
  const socket = getChessSocket();
  if (socket && socket.connected && walletAddress) {
    socket.emit('register_player', {
      walletAddress: walletAddress.toLowerCase(),
      playerName,
    });
    console.log('[SOCKET] Registered player as online:', walletAddress.slice(0, 10) + '...');
  }
}
