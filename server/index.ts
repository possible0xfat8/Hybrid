import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import express from 'express';
import http from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import cors from 'cors';

// Ensure all project files are linked to / so platform build/publish runners can find package.json
let rootLinkStatus = 'init';
try {
  const appletDir = '/app/applet';
  if (fs.existsSync(appletDir)) {
    const entries = fs.readdirSync(appletDir);
    for (const entry of entries) {
      const rootPath = path.join('/', entry);
      const appletPath = path.join(appletDir, entry);
      if (!fs.existsSync(rootPath)) {
        try {
          fs.symlinkSync(appletPath, rootPath);
          console.log(`[LINK-ROOT] Symlinked ${entry} -> ${rootPath}`);
        } catch (e: any) {
          // If symlink fails, try copying files
          try {
            const stat = fs.statSync(appletPath);
            if (stat.isFile()) {
              fs.copyFileSync(appletPath, rootPath);
              console.log(`[LINK-ROOT] Copied ${entry} -> ${rootPath}`);
            }
          } catch (copyErr: any) {
            console.warn(`[LINK-ROOT] Link/copy failed for ${entry}:`, copyErr.message);
          }
        }
      }
    }
    rootLinkStatus = fs.existsSync('/package.json') ? 'package_json_exists' : 'package_json_missing';
    console.log(`[LINK-ROOT] Root link status: ${rootLinkStatus}`);
  }
} catch (err: any) {
  rootLinkStatus = `error: ${err.message}`;
  console.warn('[LINK-ROOT] Could not inspect /app/applet:', err.message);
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

let nextReady = false;
console.log('[NEXT] Initializing Next.js in background...');
nextApp.prepare()
  .then(() => {
    nextReady = true;
    console.log('[NEXT] ✓ Next.js prepared and ready to serve pages');
  })
  .catch((err) => {
    console.error('[NEXT] Error preparing Next.js:', err);
  });

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
    nextReady,
    rootLinkStatus,
    packageJsonAtRoot: fs.existsSync('/package.json'),
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
  if (!nextReady) {
    res.setHeader('Retry-After', '1');
    res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Hemi Arcade</title>
  <meta http-equiv="refresh" content="1">
  <style>
    body { background: #08090C; color: #FF4600; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .spinner { width: 36px; height: 36px; border: 3px solid rgba(255, 70, 0, 0.2); border-top-color: #FF4600; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-weight: 800; font-size: 20px; letter-spacing: -0.5px; margin: 0 0 6px 0; color: #fff; }
    p { font-size: 13px; color: #94a3b8; margin: 0; }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h2>HEMI <span style="color:#FF4600;">ARCADE</span></h2>
  <p>Booting game engine and dashboard...</p>
</body>
</html>`);
    return;
  }
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
