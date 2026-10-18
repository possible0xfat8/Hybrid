import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import { ChessEngine } from './engine/chess/chessEngine';
import { setupChessNamespace } from './engine/chess/chessNamespace';
import { createChessRoutes } from './routes/chessRoutes';

import { RoomManager } from './engine/uno/roomManager';
import { setupUnoNamespace } from './engine/uno/unoNamespace';
import { createUnoRoutes } from './routes/unoRoutes';

import { initConnect4Namespace } from './sockets/connect4Namespace';
import connect4Routes from './routes/connect4Routes';

import { createArcadeRoutes } from './routes/arcadeRoutes';

const app = express();
const server = http.createServer(app);

const PORT = process.env.SERVER_PORT || 3001;

// Global Middleware
app.use(cors());
app.use(express.json());

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
  transports: ['websocket', 'polling'],
});

// ==========================================
// 1. ISOLATED NAMESPACE: /chess
// ==========================================
const chessIo = io.of('/chess');
const chessEngine = new ChessEngine(chessIo);
setupChessNamespace(chessIo, chessEngine);
console.log('[ARCH] ✓ Initialized isolated namespace: /chess');

// ==========================================
// 2. ISOLATED NAMESPACE: /uno
// ==========================================
const unoIo = io.of('/uno');
const roomManager = new RoomManager(unoIo as any);
setupUnoNamespace(unoIo, roomManager);
console.log('[ARCH] ✓ Initialized isolated namespace: /uno');

// ==========================================
// 3. ISOLATED NAMESPACE: /connect4
// ==========================================
initConnect4Namespace(io);

// ==========================================
// 4. HTTP API ROUTES
// ==========================================
app.use('/api/chess', createChessRoutes(chessEngine));
app.use('/api/uno', createUnoRoutes(roomManager));
app.use('/api/connect4', connect4Routes);
app.use('/api/arcade', createArcadeRoutes(chessEngine, roomManager));
// Legacy & direct routes compatibility
app.use('/api', createChessRoutes(chessEngine));
app.use('/api', createUnoRoutes(roomManager));

// General Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    platform: 'Hemi Arcade Unified Server',
    namespaces: ['/chess', '/uno'],
    activeChessGames: chessEngine.activeGames.size,
    activeUnoRooms: roomManager.getAllRooms().length,
    uptime: process.uptime(),
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 HEMI ARCADE SERVER RUNNING ON PORT ${PORT}`);
  console.log(`🎮 Socket /chess namespace: ws://localhost:${PORT}/chess`);
  console.log(`🃏 Socket /uno namespace:   ws://localhost:${PORT}/uno`);
  console.log(`🌐 API Gateway:            http://localhost:${PORT}/api/arcade`);
  console.log(`=================================================\n`);
});

export { app, server, io };
