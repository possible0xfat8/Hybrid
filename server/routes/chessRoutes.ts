import { Router, Request, Response } from 'express';
import { ChessEngine } from '../engine/chess/chessEngine';
import { isSettlementEnabled, getOracleAddress, readEloBalance } from '../services/chess/matchSettlement';
import { serverDb } from '../engine/uno/database';
import {
  getChessPlayerStats,
  getChessMatchHistory,
  getChessLeaderboard,
  getChessFriends,
  getChessNotifications,
  upsertChessPlayer,
  updateChessPlayerAvatar,
  updateChessUserStatus,
  searchChessPlayers,
  sendChessFriendRequest,
  respondChessFriendRequest,
  removeChessFriend,
  updateChessNotification,
  deleteChessNotification,
  localChessDb,
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

  // Authoritative ELO leaderboard
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

  // User Stats + unified serverDb profile fallback
  router.get(['/users/:address/stats', '/player/:address/stats'], async (req: Request, res: Response) => {
    const { address } = req.params;
    const cleanAddr = address ? address.toLowerCase().trim() : '';
    const stats = await getChessPlayerStats(cleanAddr);
    if (cleanAddr) {
      const sharedUser = serverDb.getUserByAddress(cleanAddr);
      if (sharedUser) {
        const defaultTruncated = `${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)}`;
        if (
          sharedUser.name &&
          (!stats.username || stats.username === 'Player' || stats.username === defaultTruncated)
        ) {
          stats.username = sharedUser.name;
        }
        if (sharedUser.avatar && !stats.avatar_url) {
          stats.avatar_url = sharedUser.avatar;
        }
      }
    }
    res.json(stats);
  });

  // User Match History
  router.get(['/users/:address/history', '/player/:address/history'], async (req: Request, res: Response) => {
    const { address } = req.params;
    const cleanAddr = address ? address.toLowerCase().trim() : '';
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
    const unread = notifications.filter((n: any) => !n.status || n.status === 'unread').length;
    res.json({ count: unread });
  });

  router.post('/notifications/:notificationId/read', (req: Request, res: Response) => {
    const id = parseInt(req.params.notificationId, 10);
    if (!isNaN(id)) updateChessNotification(id, 'read');
    res.json({ success: true });
  });

  router.post('/notifications/:notificationId/status', (req: Request, res: Response) => {
    const id = parseInt(req.params.notificationId, 10);
    const { status } = req.body;
    if (!isNaN(id) && status) updateChessNotification(id, status);
    res.json({ success: true });
  });

  router.delete('/notifications/:notificationId', (req: Request, res: Response) => {
    const id = parseInt(req.params.notificationId, 10);
    if (!isNaN(id)) deleteChessNotification(id);
    res.json({ success: true });
  });

  // Online & User Status (Hemi Chess)
  router.get('/user/:address/status', (req: Request, res: Response) => {
    const { address } = req.params;
    const cleanAddr = address ? address.toLowerCase() : '';
    const isOnline =
      Array.from(engine.playerSockets.values()).some((p) => p.walletAddress === cleanAddr) ||
      Boolean(localChessDb.data.players[cleanAddr]?.is_online);
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
    const onlinePlayers = Object.values(localChessDb.data.players).filter((p) => p.is_online);
    res.json({
      count: Math.max(engine.playerSockets.size, onlinePlayers.length, 1),
      users: onlinePlayers,
    });
  });

  router.get('/users/count', (_req: Request, res: Response) => {
    res.json({ count: Math.max(Object.keys(localChessDb.data.players).length, 18) });
  });

  // Save Player Display Name
  router.post('/player/:address/username', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const { username, name } = req.body;
      const cleanAddr = address ? address.toLowerCase().trim() : '';
      const chosenName = username || name;
      if (!cleanAddr) {
        return res.status(400).json({ success: false, error: 'Valid wallet address required' });
      }

      const player = await upsertChessPlayer(cleanAddr, chosenName);
      if (player) {
        for (const p of engine.playerSockets.values()) {
          if (p.walletAddress === cleanAddr) {
            p.playerName = player.username;
          }
        }
        return res.json({ success: true, player });
      }

      res.json({
        success: true,
        player: {
          username: chosenName || `${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)}`,
          wallet_address: cleanAddr,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error updating username' });
    }
  });

  // Save Player Avatar
  router.post('/player/:address/avatar', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;
      const cleanAddr = address ? address.toLowerCase().trim() : '';
      const avatarUrl = req.body.avatarUrl || req.body.avatar || '♟️';
      if (cleanAddr) {
        await updateChessPlayerAvatar(cleanAddr, avatarUrl);
      }
      res.json({ success: true, avatarUrl });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/users/sync', async (req: Request, res: Response) => {
    const { wallet_address, walletAddress, address, username, name, avatar_url, avatar } = req.body;
    const targetAddr = wallet_address || walletAddress || address;
    const targetName = username || name;
    const targetAvatar = avatar_url || avatar;
    if (targetAddr) {
      const player = await upsertChessPlayer(targetAddr, targetName, targetAvatar);
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

  router.get('/players/search', async (req: Request, res: Response) => {
    const query = (req.query.query as string) || '';
    const userId = (req.query.userId as string) || '';
    const results = await searchChessPlayers(query, userId);
    res.json(results);
  });

  router.post('/friends/request', async (req: Request, res: Response) => {
    const { userId, friendId, senderId, receiverId, targetId } = req.body;
    const uId = userId || senderId;
    const fId = friendId || receiverId || targetId;
    if (!uId || !fId) {
      return res.status(400).json({ error: 'userId and friendId are required' });
    }
    const result = await sendChessFriendRequest(uId, fId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  router.post('/friends/accept', async (req: Request, res: Response) => {
    const { friendshipId, userId } = req.body;
    const result = await respondChessFriendRequest(friendshipId, userId, 'accepted');
    res.json(result);
  });

  router.post('/friends/decline', async (req: Request, res: Response) => {
    const { friendshipId, userId } = req.body;
    const result = await respondChessFriendRequest(friendshipId, userId, 'declined');
    res.json(result);
  });

  router.post('/friends/remove', async (req: Request, res: Response) => {
    const { userId, friendId } = req.body;
    const result = await removeChessFriend(userId, friendId);
    res.json(result);
  });

  router.post('/challenge/send', (_req: Request, res: Response) => {
    res.json({ success: true });
  });

  return router;
}

