import { Router, Request, Response } from 'express';
import { ChessEngine } from '../engine/chess/chessEngine';
import { RoomManager } from '../engine/uno/roomManager';

export function createArcadeRoutes(chessEngine: ChessEngine, roomManager: RoomManager): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  router.get('/stats', (_req: Request, res: Response) => {
    const chessActiveGames = chessEngine.activeGames.size;
    const chessWaitingQueue = chessEngine.matchmakingQueue.length;
    const chessConnectedPlayers = chessEngine.playerSockets.size;

    const unoPublicRooms = roomManager.getPublicRooms();
    const unoActiveTables = unoPublicRooms.filter((r) => r.status === 'playing').length;
    const unoTotalPlayers = unoPublicRooms.reduce((acc, r) => acc + r.playerCount, 0);

    res.json({
      success: true,
      platform: 'Hemi Arcade',
      network: 'Hemi Sepolia (743111)',
      totals: {
        activePlayers: chessConnectedPlayers + unoTotalPlayers,
        activeMatches: chessActiveGames + unoActiveTables,
        totalGamesPlayed: 3480 + chessActiveGames + unoActiveTables,
        prizeVolume: '52,800+ $CRAZY8 / ETH',
      },
      games: {
        chess: {
          activeMatches: chessActiveGames,
          queueSize: chessWaitingQueue,
          playersOnline: chessConnectedPlayers,
        },
        uno: {
          activeMatches: unoActiveTables,
          seededTables: unoPublicRooms.length,
          playersSeated: unoTotalPlayers,
        },
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
