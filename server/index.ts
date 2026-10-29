import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import express from 'express';
import http from 'http';
import { parse } from 'url';
import next from 'next';
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

const PORT = parseInt(process.env.PORT || process.env.SERVER_PORT || '3000', 10);
const hasProdBuild = fs.existsSync(path.join(process.cwd(), '.next', 'BUILD_ID'));
const isProd =
  process.env.NODE_ENV === 'production' ||
  process.env.npm_lifecycle_event === 'start' ||
  hasProdBuild;
const dev = !isProd;

const isBackendOnly = process.env.BACKEND_ONLY === 'true';

const app = express();
const server = http.createServer(app);

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
    cwd: process.cwd(),
    mode: dev ? 'development' : 'production',
    platform: 'Hybrid Unified Server',
    namespaces: ['/chess', '/uno', '/connect4'],
    activeChessGames: chessEngine.activeGames.size,
    activeUnoRooms: roomManager.getAllRooms().length,
    uptime: process.uptime(),
  });
});

let handle: any = null;

// ==========================================
// 5. NEXT.JS PAGES HANDLER (OR BACKEND STATUS ROOT)
// ==========================================
if (!isBackendOnly) {
  app.all(/.*/, (req, res) => {
    if (req.url && req.url.startsWith('/socket.io')) {
      return;
    }
    if (handle) {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    } else {
      res.status(503).send('Initializing application...');
    }
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      engine: 'Hemi Arcade Authoritative Game Engine',
      namespaces: ['/chess', '/uno', '/connect4'],
      timestamp: new Date().toISOString(),
    });
  });
}

async function bootstrap() {
  if (!isBackendOnly) {
    let standaloneConf: any = undefined;
    const requiredServerFilesPath = path.join(process.cwd(), '.next', 'required-server-files.json');
    if (!dev && fs.existsSync(requiredServerFilesPath)) {
      try {
        const requiredFiles = JSON.parse(fs.readFileSync(requiredServerFilesPath, 'utf8'));
        if (requiredFiles?.config) {
          standaloneConf = requiredFiles.config;
          process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(standaloneConf);
        }
      } catch (e: any) {
        console.warn('[NEXT] Failed to read required-server-files.json:', e.message);
      }
    }

    const nextApp = next({
      dev,
      dir: process.cwd(),
      hostname: '0.0.0.0',
      port: PORT,
      ...(standaloneConf ? { conf: standaloneConf } : {}),
    });
    handle = nextApp.getRequestHandler();

    console.log(`[NEXT] Preparing Next.js application (dev=${dev})...`);
    await nextApp.prepare();
    console.log('[NEXT] ✓ Next.js prepared and ready to serve pages');
  } else {
    console.log('[BACKEND] Running in BACKEND_ONLY mode (dedicated real-time socket & API engine)');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=================================================`);
    console.log(`🚀 HYBRID UNIFIED SERVER LISTENING ON PORT ${PORT}`);
    console.log(`🎮 Socket /chess namespace: ws://0.0.0.0:${PORT}/chess`);
    console.log(`🃏 Socket /uno namespace:   ws://0.0.0.0:${PORT}/uno`);
    console.log(`🔴 Socket /connect4:        ws://0.0.0.0:${PORT}/connect4`);
    console.log(`🌐 API Gateway:            http://0.0.0.0:${PORT}/api/arcade`);
    console.log(`⚡ Next.js Frontend:       http://0.0.0.0:${PORT}/`);
    console.log(`=================================================\n`);
  });
}

bootstrap().catch((err) => {
  console.error('[SERVER] Fatal error during server bootstrap:', err);
  process.exit(1);
});

export { app, server, io };
