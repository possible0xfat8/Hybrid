import { Router, Request, Response } from 'express';
import { ChessEngine } from '../engine/chess/chessEngine';
import { isSettlementEnabled, getOracleAddress, readEloBalance } from '../services/chess/matchSettlement';

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

  router.get('/leaderboard', async (_req: Request, res: Response) => {
    const sampleLeaderboard = [
      { rank: 1, address: '0x8e8e39D67D227E0a8B10095e07EA020D53926df3', name: 'GrandMasterChad', elo: 2140, wins: 142 },
      { rank: 2, address: '0x71C8A3f892d194514781440079C6F6F94732bE5A', name: 'DeepHemiCheck', elo: 1985, wins: 98 },
      { rank: 3, address: '0x12Fa87Bc1128EAf42c9535091Cd5866f809938b8', name: 'NeoKnight', elo: 1840, wins: 76 },
    ];
    res.json({ leaderboard: sampleLeaderboard });
  });

  router.get('/balance/:address', async (req: Request, res: Response) => {
    const { address } = req.params;
    const balance = await readEloBalance(address);
    res.json({ address, balance: balance.toString() });
  });

  // User Stats & Match History (for Hemi-Chess UI hooks)
  router.get('/users/:address/stats', (req: Request, res: Response) => {
    const { address } = req.params;
    const cleanAddr = address ? address.toLowerCase() : '';
    res.json({
      elo_rating: 1200,
      wins: 14,
      losses: 5,
      draws: 2,
      total_games: 21,
      win_rate: 66.7,
      username: `Player_${cleanAddr.slice(2, 6)}`,
      wallet_address: cleanAddr,
      is_online: true,
    });
  });

  router.get('/users/:address/history', (req: Request, res: Response) => {
    const { address } = req.params;
    const cleanAddr = address ? address.toLowerCase() : '';
    res.json([
      {
        game_id: `g_${Date.now()}_1`,
        outcome: 'W',
        my_color: 'white',
        elo_before: 1184,
        elo_after: 1200,
        elo_change: 16,
        completed_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        game_id: `g_${Date.now()}_2`,
        outcome: 'W',
        my_color: 'black',
        elo_before: 1168,
        elo_after: 1184,
        elo_change: 16,
        completed_at: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        game_id: `g_${Date.now()}_3`,
        outcome: 'L',
        my_color: 'white',
        elo_before: 1182,
        elo_after: 1168,
        elo_change: -14,
        completed_at: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        game_id: `g_${Date.now()}_4`,
        outcome: 'W',
        my_color: 'black',
        elo_before: 1166,
        elo_after: 1182,
        elo_change: 16,
        completed_at: new Date(Date.now() - 14400000).toISOString(),
      },
    ]);
  });

  // Notifications API (Hemi Chess)
  router.get('/notifications/:userId', (_req: Request, res: Response) => {
    res.json([]);
  });

  router.get('/notifications/:userId/count', (_req: Request, res: Response) => {
    res.json({ count: 0 });
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
  router.get('/user/:address/status', (_req: Request, res: Response) => {
    res.json({ online: true, is_online: true });
  });

  router.post('/user/status', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  router.get('/users/online', (_req: Request, res: Response) => {
    res.json({ count: engine.playerSockets.size || 6, users: [] });
  });

  router.get('/users/count', (_req: Request, res: Response) => {
    res.json({ count: 184 });
  });

  router.post('/users/sync', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  router.get('/games/live', (_req: Request, res: Response) => {
    res.json({ success: true, games: [] });
  });

  // Friends & Challenges
  router.get('/friends/:address', (_req: Request, res: Response) => {
    res.json([]);
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

