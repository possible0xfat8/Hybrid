import { Router, Request, Response } from 'express';
import { ChessEngine } from '../engine/chess/chessEngine';
import { isSettlementEnabled, getOracleAddress, readEloBalance } from '../services/chess/matchSettlement';
import {
  getChessPlayerStats,
  getChessMatchHistory,
  getChessLeaderboard,
  getChessFriends,
  getChessNotifications,
  upsertChessPlayer,
  updateChessUserStatus,
} from '../services/chess/supabaseChess';

export function createChessRoutes(engine: ChessEngine): Router {
  const router = Router();

  router.get('/diagnostic', (_req: Request, res: Response) => {
    res.json({
      status: 'online',
      namespace: '/chess',
      activeGames: engine.activeGames.size,
      matchmakingQueueSize: engine.matchmakingQueue.length,
      settlementEnabled: isSettlementEnabled(),
      oracleAddress: getOracleAddress(),
    });
  });

  router.get('/active-games', (_req: Request, res: Response) => {
    const games = Array.from(engine.activeGames.values()).map((g) => ({
      gameId: g.gameId,
      status: g.status,
      white: { name: g.players.white.playerName, elo: g.players.white.elo },
      black: { name: g.players.black.playerName, elo: g.players.black.elo },
      spectatorCount: g.spectators.size,
      timeControl: g.timeControl,
    }));
    res.json({ games });
  });

  // Authoritative ELO leaderboard from Supabase
  router.get('/leaderboard', async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const leaderboard = await getChessLeaderboard(limit);
    res.json({ leaderboard });
  });

  router.get('/balance/:address', async (req: Request, res: Response) => {
    const { address } = req.params;
    const balance = await readEloBalance(address);
    res.json({ address, balance: balance.toString() });
  });

  // User Stats from Supabase
  router.get('/users/:address/stats', async (req: Request, res: Response) => {
    const { address } = req.params;
    const cleanAddr = address ? address.toLowerCase() : '';
    const stats = await getChessPlayerStats(cleanAddr);
    res.json(stats);
  });

  // User Match History from Supabase
  router.get('/users/:address/history', async (req: Request, res: Response) => {
    const { address } = req.params;
    const cleanAddr = address ? address.toLowerCase() : '';
    const limit = parseInt(req.query.limit as string, 10) || 15;
    const history = await getChessMatchHistory(cleanAddr, limit);
    res.json(history);
  });

  // Notifications API (Hemi Chess)
  router.get('/notifications/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const notifications = await getChessNotifications(userId);
    res.json(notifications);
  });

  router.get('/notifications/:userId/count', async (req: Request, res: Response) => {
    const { userId } = req.params;
    const notifications = await getChessNotifications(userId);
    res.json({ count: notifications.length });
  });

  router.post('/notifications/:notificationId/read', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  router.post('/notifications/:notificationId/status', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  router.delete('/notifications/:notificationId', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  // Online & User Status (Hemi Chess)
  router.get('/user/:address/status', (req: Request, res: Response) => {
    const { address } = req.params;
    const cleanAddr = address ? address.toLowerCase() : '';
    const isOnline = Array.from(engine.playerSockets.values()).some(
      (p) => p.walletAddress === cleanAddr
    );
    res.json({ online: isOnline, is_online: isOnline });
  });

  router.post('/user/status', async (req: Request, res: Response) => {
    const { address, isOnline } = req.body;
    if (address) {
      await updateChessUserStatus(address, Boolean(isOnline));
    }
    res.json({ success: true });
  });

  router.get('/users/online', (_req: Request, res: Response) => {
    res.json({ count: Math.max(engine.playerSockets.size, 1), users: [] });
  });

  router.get('/users/count', (_req: Request, res: Response) => {
    res.json({ count: 184 });
  });

  router.post('/users/sync', async (req: Request, res: Response) => {
    const { wallet_address, address, username } = req.body;
    const targetAddr = wallet_address || address;
    if (targetAddr) {
      const player = await upsertChessPlayer(targetAddr, username);
      return res.json({ success: true, player });
    }
    res.json({ success: true });
  });

  router.get('/games/live', (_req: Request, res: Response) => {
    const games = Array.from(engine.activeGames.values()).map((g) => ({
      gameId: g.gameId,
      status: g.status,
      white: g.players.white.playerName,
      black: g.players.black.playerName,
    }));
    res.json({ success: true, games });
  });

  // Friends & Challenges
  router.get('/friends/:address', async (req: Request, res: Response) => {
    const { address } = req.params;
    const friends = await getChessFriends(address);
    res.json(friends);
  });

  router.get('/players/search', (_req: Request, res: Response) => {
    res.json([]);
  });

  router.post('/friends/request', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  router.post('/friends/accept', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  router.post('/friends/decline', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  router.post('/friends/remove', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  router.post('/challenge/send', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  return router;
}
