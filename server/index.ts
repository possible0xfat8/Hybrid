import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import express from 'express';
import http from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import cors from 'cors';

// Ensure all project files are mirrored to / so platform build/publish runners can find package.json
let rootLinkStatus = 'init';
try {
  const currentDir = process.cwd();
  console.log(`[LINK-ROOT] Current working directory: ${currentDir}`);

  if (currentDir !== '/') {
    const systemDirs = new Set([
      'app', 'bin', 'boot', 'dev', 'etc', 'home', 'lib', 'lib64',
      'media', 'mnt', 'opt', 'proc', 'root', 'run', 'sbin', 'srv',
      'sys', 'tmp', 'usr', 'var', 'workspace'
    ]);

    const entries = fs.readdirSync(currentDir);
    for (const entry of entries) {
      if (systemDirs.has(entry)) continue;

      const rootPath = path.join('/', entry);
      const sourcePath = path.join(currentDir, entry);

      try {
        // Remove any stale or broken link/file at rootPath first
        try {
          fs.rmSync(rootPath, { force: true, recursive: true });
        } catch {}

        const stat = fs.statSync(sourcePath);
        if (stat.isDirectory()) {
          fs.symlinkSync(sourcePath, rootPath, 'dir');
          console.log(`[LINK-ROOT] Symlinked directory: ${entry} -> ${rootPath}`);
        } else {
          fs.copyFileSync(sourcePath, rootPath);
          console.log(`[LINK-ROOT] Copied file: ${entry} -> ${rootPath}`);
        }
      } catch (e: any) {
        console.warn(`[LINK-ROOT] Failed for ${entry}:`, e.message);
      }
    }
  }
  rootLinkStatus = fs.existsSync('/package.json') ? 'package_json_exists' : 'package_json_missing';
  console.log(`[LINK-ROOT] Root mirror status: ${rootLinkStatus}`);
} catch (err: any) {
  rootLinkStatus = `error: ${err.message}`;
  console.warn('[LINK-ROOT] Could not mirror directory:', err.message);
}

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
const dev = process.env.NODE_ENV !== 'production';

// Initialize Next.js App
const nextApp = next({ dev, hostname: '0.0.0.0', port: PORT });
const handle = nextApp.getRequestHandler();

console.log('[NEXT] Preparing Next.js application...');
await nextApp.prepare();
console.log('[NEXT] ✓ Next.js prepared and ready to serve pages');

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
console.log('[ARCH] ✓ Initialized isolated namespace: /connect4');

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
    rootLinkStatus,
    packageJsonAtRoot: fs.existsSync('/package.json'),
    packageJsonAtCwd: fs.existsSync(path.join(process.cwd(), 'package.json')),
    platform: 'Hemi Arcade Unified Server',
    namespaces: ['/chess', '/uno', '/connect4'],
    activeChessGames: chessEngine.activeGames.size,
    activeUnoRooms: roomManager.getAllRooms().length,
    uptime: process.uptime(),
  });
});

// ==========================================
// 5. NEXT.JS PAGES HANDLER
// ==========================================
app.all(/.*/, (req, res) => {
  const parsedUrl = parse(req.url!, true);
  handle(req, res, parsedUrl);
});

// Start Server on PORT 3000 immediately
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=================================================`);
  console.log(`🚀 HEMI ARCADE UNIFIED SERVER LISTENING ON PORT ${PORT}`);
  console.log(`🎮 Socket /chess namespace: ws://0.0.0.0:${PORT}/chess`);
  console.log(`🃏 Socket /uno namespace:   ws://0.0.0.0:${PORT}/uno`);
  console.log(`🔴 Socket /connect4:        ws://0.0.0.0:${PORT}/connect4`);
  console.log(`🌐 API Gateway:            http://0.0.0.0:${PORT}/api/arcade`);
  console.log(`⚡ Next.js Frontend:       http://0.0.0.0:${PORT}/`);
  console.log(`📁 Root Link Status:       ${rootLinkStatus}`);
  console.log(`=================================================\n`);
});

export { app, server, io };
