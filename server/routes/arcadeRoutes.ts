import { Router, Request, Response } from 'express';
import { ChessEngine } from '../engine/chess/chessEngine';
import { RoomManager } from '../engine/uno/roomManager';
import { getChessSupabaseClient, getChessLeaderboard } from '../services/chess/supabaseChess';
import { serverDb } from '../engine/uno/database';

export function createArcadeRoutes(chessEngine: ChessEngine, roomManager: RoomManager): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  router.get('/stats', async (_req: Request, res: Response) => {
    const chessActiveGames = chessEngine.activeGames.size;
    const chessWaitingQueue = chessEngine.matchmakingQueue.length;
    const chessConnectedPlayers = chessEngine.playerSockets.size;

    const unoPublicRooms = roomManager.getPublicRooms();
    const unoActiveTables = unoPublicRooms.filter((r) => r.status === 'playing').length;
    const unoTotalPlayers = unoPublicRooms.reduce((acc, r) => acc + r.playerCount, 0);

    let totalMatches = chessActiveGames + unoActiveTables;
    try {
      const client = getChessSupabaseClient();
      if (client) {
        const [gh, ch] = await Promise.all([
          client.from('game_history').select('id', { count: 'exact', head: true }),
          client.from('crazy8_match_history').select('id', { count: 'exact', head: true }),
        ]);
        totalMatches += (gh.count || 0) + (ch.count || 0);
      }
    } catch {}

    res.json({
      success: true,
      platform: 'Hybrid',
      network: 'Hemi Sepolia (743111)',
      totals: {
        activePlayers: chessConnectedPlayers + unoTotalPlayers,
        activeMatches: chessActiveGames + unoActiveTables,
        totalGamesPlayed: totalMatches,
        prizeVolume: 'Live On-Chain Escrow',
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

  router.get('/leaderboard', async (_req: Request, res: Response) => {
    try {
      const chessPlayers = await getChessLeaderboard(10);
      const unoPlayers = serverDb.getLeaderboard(10, 'chips');

      const unified: any[] = [];
      let rank = 1;

      // Interleave / rank top players
      for (const cp of chessPlayers) {
        unified.push({
          rank: rank++,
          address: cp.address,
          name: cp.name,
          game: 'chess',
          score: `${cp.elo} ELO`,
          metricLabel: 'Chess Rating',
          wins: cp.wins,
          winRate: cp.winRate || '65%',
          avatar: '♟️',
        });
      }

      for (const up of unoPlayers) {
        const addr = up.address || up.id;
        // Check if already in list
        const existing = unified.find(u => u.address.toLowerCase() === addr.toLowerCase());
        if (existing) {
          existing.game = 'both';
          existing.score = `${existing.score} / ${up.tokenBalance?.toLocaleString() || '10,000'} $CRAZY8`;
          existing.metricLabel = 'Dual Champion';
          existing.wins += (up.stats?.wins || 0);
        } else {
          const totalMatches = up.stats?.matchesPlayed || 0;
          const wins = up.stats?.wins || 0;
          const rate = totalMatches > 0 ? `${Math.round((wins / totalMatches) * 100)}%` : '100%';
          unified.push({
            rank: rank++,
            address: addr,
            name: up.name,
            game: 'uno',
            score: `${up.tokenBalance?.toLocaleString() || '10,000'} $CRAZY8`,
            metricLabel: 'Tokens Won',
            wins,
            winRate: rate,
            avatar: up.avatar || '🃏',
          });
        }
      }

      // Re-sort by total wins
      unified.sort((a, b) => b.wins - a.wins);
      unified.forEach((entry, i) => {
        entry.rank = i + 1;
      });

      res.json({ leaderboard: unified.slice(0, 15) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
