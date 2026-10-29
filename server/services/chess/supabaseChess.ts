import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { serverDb } from '../../engine/uno/database';

export interface ChessPlayerRow {
  id?: number;
  player_id: string;
  wallet_address: string;
  username: string;
  avatar_url?: string;
  elo_rating: number;
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
  last_active?: string;
  last_seen?: string;
  online_status?: string;
  is_online?: boolean;
}

export interface ChessLeaderboardEntry {
  rank: number;
  address: string;
  name: string;
  elo: number;
  wins: number;
  losses?: number;
  draws?: number;
  totalGames?: number;
  winRate?: string;
}

export interface ChessGameHistoryRecord {
  game_id: string;
  white_player_id: string;
  black_player_id: string;
  winner: 'white' | 'black' | 'draw';
  result: string;
  total_moves: number;
  game_duration: number;
  white_elo_before: number;
  black_elo_before: number;
  white_elo_after: number;
  black_elo_after: number;
  final_fen: string;
  started_at: string;
  completed_at: string;
}

export interface ChessFriendshipRecord {
  id: number;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface ChessNotificationRecord {
  id: number;
  recipient_id: string;
  sender_id: string;
  sender_username?: string;
  type: 'friend_request' | 'friend_accepted' | 'match_challenge' | 'system';
  status: 'unread' | 'read' | 'accepted' | 'declined';
  friendship_id?: number;
  challenge_id?: string;
  created_at: string;
  read_at?: string;
}

interface LocalChessDatabaseSchema {
  players: Record<string, ChessPlayerRow>;
  gameHistory: ChessGameHistoryRecord[];
  friendships: ChessFriendshipRecord[];
  notifications: ChessNotificationRecord[];
  nextId: number;
}

const DB_DIR = path.join(process.cwd(), 'data');
const CHESS_DB_FILE = path.join(DB_DIR, 'chess_db.json');

const DEFAULT_ELO = 1200;

class LocalChessStore {
  public data: LocalChessDatabaseSchema = {
    players: {},
    gameHistory: [],
    friendships: [],
    notifications: [],
    nextId: 100,
  };
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.seedDefaults();
    this.loadFromDisk();
  }

  private seedDefaults() {
    const nowIso = new Date().toISOString();
    const seeds: ChessPlayerRow[] = [
      {
        id: 1,
        player_id: '0x71c98a4b2f09a2d5e819a21f32b6d902e8194a11',
        wallet_address: '0x71c98a4b2f09a2d5e819a21f32b6d902e8194a11',
        username: 'GrandmasterHemi',
        avatar_url: '♟️',
        elo_rating: 1640,
        total_games: 42,
        wins: 31,
        losses: 8,
        draws: 3,
        last_active: nowIso,
        last_seen: nowIso,
        online_status: 'online',
        is_online: true,
      },
      {
        id: 2,
        player_id: '0x94b2e5a108f7c3b2d198a45c67e8f901a2b3c4d5',
        wallet_address: '0x94b2e5a108f7c3b2d198a45c67e8f901a2b3c4d5',
        username: 'SatoshiKnight',
        avatar_url: '♞',
        elo_rating: 1520,
        total_games: 35,
        wins: 24,
        losses: 9,
        draws: 2,
        last_active: nowIso,
        last_seen: nowIso,
        online_status: 'online',
        is_online: true,
      },
      {
        id: 3,
        player_id: '0x3f8c1d7e9a2b4c6d8e0f1a2b3c4d5e6f7a8b9c0d',
        wallet_address: '0x3f8c1d7e9a2b4c6d8e0f1a2b3c4d5e6f7a8b9c0d',
        username: 'ZeroKnowledgeQueen',
        avatar_url: '♛',
        elo_rating: 1465,
        total_games: 29,
        wins: 19,
        losses: 7,
        draws: 3,
        last_active: nowIso,
        last_seen: nowIso,
        online_status: 'online',
        is_online: true,
      },
      {
        id: 4,
        player_id: '0x82a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
        wallet_address: '0x82a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0',
        username: 'RollupRook',
        avatar_url: '♜',
        elo_rating: 1380,
        total_games: 22,
        wins: 14,
        losses: 7,
        draws: 1,
        last_active: nowIso,
        last_seen: nowIso,
        online_status: 'online',
        is_online: false,
      },
    ];

    for (const s of seeds) {
      this.data.players[s.player_id] = s;
    }
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(CHESS_DB_FILE)) {
        const raw = fs.readFileSync(CHESS_DB_FILE, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (parsed.players) {
            this.data.players = { ...this.data.players, ...parsed.players };
          }
          if (Array.isArray(parsed.gameHistory)) {
            this.data.gameHistory = parsed.gameHistory;
          }
          if (Array.isArray(parsed.friendships)) {
            this.data.friendships = parsed.friendships;
          }
          if (Array.isArray(parsed.notifications)) {
            this.data.notifications = parsed.notifications;
          }
          if (typeof parsed.nextId === 'number') {
            this.data.nextId = parsed.nextId;
          }
        }
      } else {
        this.saveSync();
      }
    } catch (err: any) {
      console.warn('[Database:CHESS] Warning loading chess_db.json:', err.message);
    }
  }

  public saveSync() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(CHESS_DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[Database:CHESS] Failed saving chess_db.json:', err.message);
    }
  }

  public save() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveSync(), 300);
  }

  public getNextId(): number {
    this.data.nextId = (this.data.nextId || 100) + 1;
    return this.data.nextId;
  }
}

export const localChessDb = new LocalChessStore();

let chessSupabaseInstance: SupabaseClient | null = null;
let hasLoggedChessConfig = false;

export function isChessSupabaseConfigured(): boolean {
  const url = (process.env.CHESS_SUPABASE_URL || process.env.SUPABASE_URL)?.trim();
  const key = (
    process.env.CHESS_SUPABASE_SERVICE_KEY ||
    process.env.CHESS_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY
  )?.trim();

  const isValid = Boolean(url && key && url.startsWith('http') && !url.includes('your-project-id'));

  if (!hasLoggedChessConfig) {
    hasLoggedChessConfig = true;
    if (isValid) {
      console.log(`[Supabase:CHESS] ✓ Connected to Chess Supabase: ${url}`);
    } else {
      console.log('[Database:CHESS] ✓ Operating with built-in local disk persistence (data/chess_db.json).');
    }
  }
  return isValid;
}

export function getChessSupabaseClient(): SupabaseClient | null {
  if (!isChessSupabaseConfigured()) return null;

  if (!chessSupabaseInstance) {
    const url = (process.env.CHESS_SUPABASE_URL || process.env.SUPABASE_URL)!.trim();
    const key = (
      process.env.CHESS_SUPABASE_SERVICE_KEY ||
      process.env.CHESS_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY
    )!.trim();

    chessSupabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return chessSupabaseInstance;
}

function normalizePlayer(row: any): ChessPlayerRow | null {
  if (!row) return null;
  const total_games = row.total_games ?? 0;
  const wins = row.wins ?? 0;
  return {
    ...row,
    elo_rating:
      row.elo_rating === null || row.elo_rating === undefined
        ? DEFAULT_ELO
        : Math.round(Number(row.elo_rating)),
    total_games,
    wins,
    losses: row.losses ?? 0,
    draws: row.draws ?? 0,
  };
}

/**
 * Upsert user by wallet address (persists locally in data/chess_db.json and syncs with unified serverDb)
 */
export async function upsertChessPlayer(walletAddress: string, username?: string, avatarUrl?: string): Promise<ChessPlayerRow | null> {
  if (!walletAddress) return null;
  const cleanAddr = walletAddress.toLowerCase().trim();
  const sharedUser = serverDb.getUserByAddress(cleanAddr);

  const hasCustomName = Boolean(
    username &&
      !username.startsWith('Player_') &&
      !username.startsWith('Player ') &&
      username.trim().length > 0
  );
  const defaultTruncated = `${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)}`;
  const resolvedName = hasCustomName
    ? username!.trim()
    : sharedUser?.name && !sharedUser.name.startsWith('Player')
    ? sharedUser.name
    : defaultTruncated;

  const resolvedAvatar = avatarUrl || sharedUser?.avatar || undefined;
  const nowIso = new Date().toISOString();

  // Always update local disk store first
  const existingLocal = localChessDb.data.players[cleanAddr];
  if (existingLocal) {
    existingLocal.last_active = nowIso;
    existingLocal.last_seen = nowIso;
    if (hasCustomName) {
      existingLocal.username = username!.trim();
    } else if (
      (!existingLocal.username || existingLocal.username === defaultTruncated) &&
      resolvedName !== defaultTruncated
    ) {
      existingLocal.username = resolvedName;
    }
    if (resolvedAvatar && (!existingLocal.avatar_url || avatarUrl)) {
      existingLocal.avatar_url = resolvedAvatar;
    }
    if (existingLocal.elo_rating === null || existingLocal.elo_rating === undefined) {
      existingLocal.elo_rating = DEFAULT_ELO;
    }
  } else {
    localChessDb.data.players[cleanAddr] = {
      id: localChessDb.getNextId(),
      player_id: cleanAddr,
      wallet_address: cleanAddr,
      username: resolvedName,
      avatar_url: resolvedAvatar,
      elo_rating: DEFAULT_ELO,
      total_games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      last_active: nowIso,
      last_seen: nowIso,
      is_online: true,
      online_status: 'online',
    };
  }
  localChessDb.save();

  // Also sync custom username/avatar to unified serverDb
  if (hasCustomName || avatarUrl) {
    serverDb.updateUserProfile(`wallet_${cleanAddr}`, {
      address: cleanAddr,
      ...(hasCustomName ? { name: username!.trim() } : {}),
      ...(avatarUrl ? { avatar: avatarUrl } : {}),
    });
  }

  const client = getChessSupabaseClient();
  if (!client) {
    return normalizePlayer(localChessDb.data.players[cleanAddr]);
  }

  try {
    const { data: existing } = await client
      .from('players')
      .select('player_id, username, wallet_address, avatar_url, elo_rating, total_games, wins, losses, draws')
      .or(`player_id.eq.${cleanAddr},wallet_address.eq.${cleanAddr}`)
      .maybeSingle();

    if (existing) {
      const updateData: any = { last_active: nowIso, last_seen: nowIso };
      if (hasCustomName) updateData.username = username!.trim();
      if (avatarUrl) updateData.avatar_url = avatarUrl;
      if (existing.elo_rating === null || existing.elo_rating === undefined) {
        updateData.elo_rating = DEFAULT_ELO;
      }

      const { data } = await client
        .from('players')
        .update(updateData)
        .eq('player_id', existing.player_id)
        .select()
        .single();

      if (data) {
        const norm = normalizePlayer(data);
        if (norm) localChessDb.data.players[cleanAddr] = norm;
        localChessDb.save();
        return norm;
      }
      return normalizePlayer(existing);
    }

    const { data: inserted } = await client
      .from('players')
      .insert({
        player_id: cleanAddr,
        username: resolvedName,
        wallet_address: cleanAddr,
        avatar_url: resolvedAvatar,
        elo_rating: DEFAULT_ELO,
        total_games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        last_active: nowIso,
        last_seen: nowIso,
        is_online: true,
        online_status: 'online',
      })
      .select()
      .single();

    if (inserted) {
      const norm = normalizePlayer(inserted);
      if (norm) localChessDb.data.players[cleanAddr] = norm;
      localChessDb.save();
      return norm;
    }
  } catch (err: any) {
    console.warn('[Supabase:CHESS] upsertChessPlayer fallback to local:', err.message);
  }

  return normalizePlayer(localChessDb.data.players[cleanAddr]);
}

/**
 * Update player avatar in local Chess DB (and Supabase if configured)
 */
export async function updateChessPlayerAvatar(walletAddress: string, avatarUrl: string): Promise<void> {
  if (!walletAddress || !avatarUrl) return;
  await upsertChessPlayer(walletAddress, undefined, avatarUrl);
}

/**
 * Get player stats by wallet address
 */
export async function getChessPlayerStats(walletAddress: string): Promise<any> {
  const cleanAddr = walletAddress?.toLowerCase().trim() || '';
  const fallbackName = cleanAddr ? `${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)}` : 'Player';

  if (!cleanAddr) {
    return {
      elo_rating: DEFAULT_ELO,
      wins: 0,
      losses: 0,
      draws: 0,
      total_games: 0,
      win_rate: 0,
      username: fallbackName,
      wallet_address: '',
      is_online: true,
    };
  }

  const client = getChessSupabaseClient();
  if (client) {
    try {
      const { data } = await client
        .from('players')
        .select('player_id, username, wallet_address, avatar_url, elo_rating, total_games, wins, losses, draws, last_seen, online_status, is_online')
        .or(`wallet_address.eq.${cleanAddr},player_id.eq.${cleanAddr}`)
        .maybeSingle();

      if (data) {
        const norm = normalizePlayer(data);
        if (norm) {
          localChessDb.data.players[cleanAddr] = norm;
          localChessDb.save();
        }
      }
    } catch {}
  }

  let player = localChessDb.data.players[cleanAddr];
  if (!player) {
    player = (await upsertChessPlayer(cleanAddr)) || {
      player_id: cleanAddr,
      wallet_address: cleanAddr,
      username: fallbackName,
      elo_rating: DEFAULT_ELO,
      total_games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      is_online: true,
    };
  }

  const sharedUser = serverDb.getUserByAddress(cleanAddr);
  if (sharedUser) {
    if (sharedUser.name && (!player.username || player.username === fallbackName)) {
      player.username = sharedUser.name;
    }
    if (sharedUser.avatar && !player.avatar_url) {
      player.avatar_url = sharedUser.avatar;
    }
  }

  const total = player.total_games || 0;
  const wins = player.wins || 0;
  const winRate = total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0;

  return {
    elo_rating: player.elo_rating ?? DEFAULT_ELO,
    wins,
    losses: player.losses ?? 0,
    draws: player.draws ?? 0,
    total_games: total,
    win_rate: winRate,
    username: player.username || fallbackName,
    wallet_address: cleanAddr,
    avatar_url: player.avatar_url,
    is_online: player.is_online ?? true,
  };
}

/**
 * Get match history by wallet address
 */
export async function getChessMatchHistory(walletAddress: string, limit = 10): Promise<any[]> {
  const cleanAddr = walletAddress?.toLowerCase().trim() || '';
  if (!cleanAddr) return [];

  const client = getChessSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('game_history')
        .select('game_id, winner, result, total_moves, completed_at, white_player_id, black_player_id, white_elo_before, white_elo_after, black_elo_before, black_elo_after')
        .or(`white_player_id.eq.${cleanAddr},black_player_id.eq.${cleanAddr}`)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data.map((game: any) => formatHistoryEntry(game, cleanAddr));
      }
    } catch {}
  }

  const localMatches = localChessDb.data.gameHistory
    .filter(
      (g) =>
        g.white_player_id?.toLowerCase() === cleanAddr ||
        g.black_player_id?.toLowerCase() === cleanAddr
    )
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    .slice(0, limit);

  return localMatches.map((game) => formatHistoryEntry(game, cleanAddr));
}

function formatHistoryEntry(game: any, cleanAddr: string) {
  const isWhite = game.white_player_id?.toLowerCase() === cleanAddr;
  const outcome =
    game.winner === 'draw'
      ? 'D'
      : (game.winner === 'white' && isWhite) || (game.winner === 'black' && !isWhite)
      ? 'W'
      : 'L';

  const eloBefore = isWhite ? game.white_elo_before : game.black_elo_before;
  const eloAfter = isWhite ? game.white_elo_after : game.black_elo_after;
  const eloChange =
    eloBefore && eloAfter
      ? eloAfter - eloBefore
      : outcome === 'W'
      ? 16
      : outcome === 'L'
      ? -16
      : 0;

  return {
    game_id: game.game_id,
    outcome,
    my_color: isWhite ? 'white' : 'black',
    elo_before: eloBefore || DEFAULT_ELO,
    elo_after: eloAfter || DEFAULT_ELO,
    elo_change: eloChange,
    total_moves: game.total_moves,
    result: game.result,
    completed_at: game.completed_at,
  };
}

/**
 * Get leaderboard ranked by ELO
 */
export async function getChessLeaderboard(limit = 15): Promise<ChessLeaderboardEntry[]> {
  const client = getChessSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('players')
        .select('player_id, wallet_address, username, elo_rating, total_games, wins, losses, draws')
        .order('elo_rating', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data.map((p: any, idx: number) => {
          const total = p.total_games || 0;
          const wins = p.wins || 0;
          const winRate = total > 0 ? `${((wins / total) * 100).toFixed(1)}%` : '0%';
          return {
            rank: idx + 1,
            address: p.wallet_address || p.player_id,
            name:
              p.username ||
              `${(p.wallet_address || p.player_id).slice(0, 6)}...${(p.wallet_address || p.player_id).slice(-4)}`,
            elo: p.elo_rating || DEFAULT_ELO,
            wins,
            losses: p.losses || 0,
            draws: p.draws || 0,
            totalGames: total,
            winRate,
          };
        });
      }
    } catch {}
  }

  const playersList = Object.values(localChessDb.data.players)
    .sort((a, b) => (b.elo_rating || DEFAULT_ELO) - (a.elo_rating || DEFAULT_ELO))
    .slice(0, limit);

  return playersList.map((p, idx) => {
    const addr = p.wallet_address || p.player_id;
    const sharedUser = serverDb.getUserByAddress(addr);
    const total = p.total_games || 0;
    const wins = p.wins || 0;
    const winRate = total > 0 ? `${((wins / total) * 100).toFixed(1)}%` : '0%';
    return {
      rank: idx + 1,
      address: addr,
      name:
        sharedUser?.name ||
        p.username ||
        `${addr.slice(0, 6)}...${addr.slice(-4)}`,
      elo: p.elo_rating || DEFAULT_ELO,
      wins,
      losses: p.losses || 0,
      draws: p.draws || 0,
      totalGames: total,
      winRate,
    };
  });
}

/**
 * Record a completed chess match in local disk DB (and Supabase if configured)
 */
export async function recordChessMatchResult(matchData: {
  gameId: string;
  whiteAddress: string;
  blackAddress: string;
  winner: 'white' | 'black' | 'draw';
  reason?: string;
  totalMoves?: number;
  gameDuration?: number;
  finalFen?: string;
  whiteEloChange?: number;
  blackEloChange?: number;
  newWhiteElo?: number;
  newBlackElo?: number;
}): Promise<boolean> {
  try {
    const {
      gameId,
      whiteAddress,
      blackAddress,
      winner,
      reason = 'normal',
      totalMoves = 0,
      gameDuration = 0,
      finalFen = '',
      whiteEloChange = winner === 'white' ? 16 : winner === 'draw' ? 0 : -16,
      blackEloChange = winner === 'black' ? 16 : winner === 'draw' ? 0 : -16,
      newWhiteElo,
      newBlackElo,
    } = matchData;

    const whiteId = whiteAddress.toLowerCase().trim();
    const blackId = blackAddress.toLowerCase().trim();

    const whitePlayer = await upsertChessPlayer(whiteId);
    const blackPlayer = await upsertChessPlayer(blackId);

    const whiteBefore = whitePlayer?.elo_rating || DEFAULT_ELO;
    const blackBefore = blackPlayer?.elo_rating || DEFAULT_ELO;

    const whiteAfter = newWhiteElo ?? whiteBefore + whiteEloChange;
    const blackAfter = newBlackElo ?? blackBefore + blackEloChange;

    const nowIso = new Date().toISOString();

    const historyItem: ChessGameHistoryRecord = {
      game_id: gameId,
      white_player_id: whiteId,
      black_player_id: blackId,
      winner,
      result: reason,
      total_moves: totalMoves,
      game_duration: gameDuration,
      white_elo_before: whiteBefore,
      black_elo_before: blackBefore,
      white_elo_after: whiteAfter,
      black_elo_after: blackAfter,
      final_fen: finalFen,
      started_at: nowIso,
      completed_at: nowIso,
    };

    const existingIdx = localChessDb.data.gameHistory.findIndex((g) => g.game_id === gameId);
    if (existingIdx >= 0) {
      localChessDb.data.gameHistory[existingIdx] = historyItem;
    } else {
      localChessDb.data.gameHistory.unshift(historyItem);
      localChessDb.data.gameHistory = localChessDb.data.gameHistory.slice(0, 200);
    }

    if (localChessDb.data.players[whiteId]) {
      const wp = localChessDb.data.players[whiteId];
      wp.total_games = (wp.total_games || 0) + 1;
      wp.wins = (wp.wins || 0) + (winner === 'white' ? 1 : 0);
      wp.losses = (wp.losses || 0) + (winner === 'black' ? 1 : 0);
      wp.draws = (wp.draws || 0) + (winner === 'draw' ? 1 : 0);
      wp.elo_rating = whiteAfter;
      wp.last_active = nowIso;
    }

    if (localChessDb.data.players[blackId]) {
      const bp = localChessDb.data.players[blackId];
      bp.total_games = (bp.total_games || 0) + 1;
      bp.wins = (bp.wins || 0) + (winner === 'black' ? 1 : 0);
      bp.losses = (bp.losses || 0) + (winner === 'white' ? 1 : 0);
      bp.draws = (bp.draws || 0) + (winner === 'draw' ? 1 : 0);
      bp.elo_rating = blackAfter;
      bp.last_active = nowIso;
    }

    localChessDb.save();

    const client = getChessSupabaseClient();
    if (client) {
      await client.from('game_history').upsert(historyItem, { onConflict: 'game_id' });
      await Promise.all([
        client
          .from('players')
          .update({
            total_games: localChessDb.data.players[whiteId]?.total_games,
            wins: localChessDb.data.players[whiteId]?.wins,
            losses: localChessDb.data.players[whiteId]?.losses,
            draws: localChessDb.data.players[whiteId]?.draws,
            elo_rating: whiteAfter,
            updated_at: nowIso,
            last_active: nowIso,
          })
          .eq('player_id', whiteId),
        client
          .from('players')
          .update({
            total_games: localChessDb.data.players[blackId]?.total_games,
            wins: localChessDb.data.players[blackId]?.wins,
            losses: localChessDb.data.players[blackId]?.losses,
            draws: localChessDb.data.players[blackId]?.draws,
            elo_rating: blackAfter,
            updated_at: nowIso,
            last_active: nowIso,
          })
          .eq('player_id', blackId),
      ]);
    }

    console.log(`[Database:CHESS] ✓ Settled match ${gameId}: White=${whiteAfter} Black=${blackAfter}`);
    return true;
  } catch (err: any) {
    console.warn('[Database:CHESS] Error settling match:', err.message);
    return false;
  }
}

/**
 * Get friends for a wallet address
 */
export async function getChessFriends(walletAddress: string): Promise<any[]> {
  if (!walletAddress) return [];
  const cleanAddr = walletAddress.toLowerCase().trim();

  const client = getChessSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('friends_list')
        .select('*')
        .eq('user_id', cleanAddr);
      if (!error && data && data.length > 0) return data;
    } catch {}
  }

  const accepted = localChessDb.data.friendships.filter(
    (f) =>
      f.status === 'accepted' &&
      (f.user_id === cleanAddr || f.friend_id === cleanAddr)
  );

  return accepted.map((f) => {
    const friendAddr = f.user_id === cleanAddr ? f.friend_id : f.user_id;
    const p = localChessDb.data.players[friendAddr];
    const shared = serverDb.getUserByAddress(friendAddr);
    return {
      friendship_id: f.id,
      friend_id: friendAddr,
      username:
        shared?.name ||
        p?.username ||
        `${friendAddr.slice(0, 6)}...${friendAddr.slice(-4)}`,
      avatar_url: shared?.avatar || p?.avatar_url,
      elo_rating: p?.elo_rating ?? DEFAULT_ELO,
      wallet_address: friendAddr,
      total_games: p?.total_games ?? 0,
      wins: p?.wins ?? 0,
      last_active: p?.last_active || f.created_at,
      friendship_since: f.created_at,
      status: 'accepted',
      online: p?.is_online ?? true,
    };
  });
}

/**
 * Search players by username or wallet address
 */
export async function searchChessPlayers(query: string, currentUserId?: string): Promise<any[]> {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const cleanCurrent = currentUserId?.toLowerCase().trim() || '';

  // Ensure any wallet users in unified serverDb are also represented in localChessDb
  for (const u of serverDb.getAllUsers()) {
    if (u.address && u.address.startsWith('0x')) {
      const addr = u.address.toLowerCase();
      if (!localChessDb.data.players[addr]) {
        localChessDb.data.players[addr] = {
          id: localChessDb.getNextId(),
          player_id: addr,
          wallet_address: addr,
          username: u.name || `${addr.slice(0, 6)}...${addr.slice(-4)}`,
          avatar_url: u.avatar,
          elo_rating: DEFAULT_ELO,
          total_games: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          is_online: u.status !== 'offline',
        };
      }
    }
  }

  return Object.values(localChessDb.data.players)
    .filter((p) => {
      const addr = (p.wallet_address || p.player_id).toLowerCase();
      if (addr === cleanCurrent) return false;
      const name = (p.username || '').toLowerCase();
      return name.includes(q) || addr.includes(q);
    })
    .slice(0, 15)
    .map((p) => {
      const addr = (p.wallet_address || p.player_id).toLowerCase();
      const rel = localChessDb.data.friendships.find(
        (f) =>
          (f.user_id === cleanCurrent && f.friend_id === addr) ||
          (f.user_id === addr && f.friend_id === cleanCurrent)
      );
      return {
        player_id: addr,
        username: p.username,
        avatar_url: p.avatar_url,
        elo_rating: p.elo_rating ?? DEFAULT_ELO,
        wallet_address: addr,
        total_games: p.total_games ?? 0,
        is_friend: rel?.status === 'accepted',
        has_pending_request: rel?.status === 'pending',
        online: p.is_online ?? false,
      };
    });
}

export async function sendChessFriendRequest(userId: string, friendId: string): Promise<{ success: boolean; error?: string }> {
  const uId = userId?.toLowerCase().trim();
  const fId = friendId?.toLowerCase().trim();
  if (!uId || !fId || uId === fId) {
    return { success: false, error: 'Invalid player addresses' };
  }

  await upsertChessPlayer(uId);
  await upsertChessPlayer(fId);

  const existing = localChessDb.data.friendships.find(
    (f) =>
      (f.user_id === uId && f.friend_id === fId) ||
      (f.user_id === fId && f.friend_id === uId)
  );
  if (existing && existing.status === 'accepted') {
    return { success: false, error: 'Already friends' };
  }

  const nowIso = new Date().toISOString();
  let friendshipId = existing?.id;
  if (existing) {
    existing.status = 'pending';
  } else {
    friendshipId = localChessDb.getNextId();
    localChessDb.data.friendships.push({
      id: friendshipId,
      user_id: uId,
      friend_id: fId,
      status: 'pending',
      created_at: nowIso,
    });
  }

  const senderPlayer = localChessDb.data.players[uId];
  localChessDb.data.notifications.unshift({
    id: localChessDb.getNextId(),
    recipient_id: fId,
    sender_id: uId,
    sender_username: senderPlayer?.username || `${uId.slice(0, 6)}...${uId.slice(-4)}`,
    type: 'friend_request',
    status: 'unread',
    friendship_id: friendshipId,
    created_at: nowIso,
  });

  localChessDb.save();
  return { success: true };
}

export async function respondChessFriendRequest(
  friendshipId: number | undefined,
  userId: string | undefined,
  status: 'accepted' | 'declined'
): Promise<{ success: boolean }> {
  const cleanUser = userId?.toLowerCase().trim();
  const record = localChessDb.data.friendships.find(
    (f) =>
      (friendshipId && f.id === Number(friendshipId)) ||
      (cleanUser && f.friend_id === cleanUser && f.status === 'pending')
  );

  if (record) {
    record.status = status;
    if (status === 'accepted') {
      const accepter = localChessDb.data.players[record.friend_id];
      localChessDb.data.notifications.unshift({
        id: localChessDb.getNextId(),
        recipient_id: record.user_id,
        sender_id: record.friend_id,
        sender_username:
          accepter?.username || `${record.friend_id.slice(0, 6)}...${record.friend_id.slice(-4)}`,
        type: 'friend_accepted',
        status: 'unread',
        friendship_id: record.id,
        created_at: new Date().toISOString(),
      });
    }
    localChessDb.save();
  }
  return { success: true };
}

export async function removeChessFriend(userId: string, friendId: string): Promise<{ success: boolean }> {
  const uId = userId?.toLowerCase().trim();
  const fId = friendId?.toLowerCase().trim();
  localChessDb.data.friendships = localChessDb.data.friendships.filter(
    (f) =>
      !(
        (f.user_id === uId && f.friend_id === fId) ||
        (f.user_id === fId && f.friend_id === uId)
      )
  );
  localChessDb.save();
  return { success: true };
}

/**
 * Get notifications for a recipient
 */
export async function getChessNotifications(recipientId: string): Promise<any[]> {
  if (!recipientId) return [];
  const cleanAddr = recipientId.toLowerCase().trim();

  const client = getChessSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('notifications_detailed')
        .select('*')
        .eq('recipient_id', cleanAddr)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data && data.length > 0) return data;
    } catch {}
  }

  return localChessDb.data.notifications
    .filter((n) => n.recipient_id === cleanAddr)
    .slice(0, 20);
}

export function updateChessNotification(notificationId: number, status: string) {
  const notif = localChessDb.data.notifications.find((n) => n.id === Number(notificationId));
  if (notif) {
    notif.status = status as any;
    if (status === 'read') notif.read_at = new Date().toISOString();
    localChessDb.save();
  }
}

export function deleteChessNotification(notificationId: number) {
  localChessDb.data.notifications = localChessDb.data.notifications.filter(
    (n) => n.id !== Number(notificationId)
  );
  localChessDb.save();
}

export function getTotalChessGamesCount(): number {
  return localChessDb.data.gameHistory.length;
}

/**
 * Update player presence
 */
export async function updateChessUserStatus(walletAddress: string, isOnline: boolean): Promise<void> {
  if (!walletAddress) return;
  const cleanAddr = walletAddress.toLowerCase().trim();
  const nowIso = new Date().toISOString();

  if (localChessDb.data.players[cleanAddr]) {
    localChessDb.data.players[cleanAddr].is_online = isOnline;
    localChessDb.data.players[cleanAddr].online_status = isOnline ? 'online' : 'offline';
    localChessDb.data.players[cleanAddr].last_seen = nowIso;
    localChessDb.save();
  }

  const client = getChessSupabaseClient();
  if (!client) return;

  try {
    await client
      .from('players')
      .update({
        is_online: isOnline,
        online_status: isOnline ? 'online' : 'offline',
        last_seen: nowIso,
      })
      .eq('player_id', cleanAddr);
  } catch {}
}

