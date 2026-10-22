import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

let chessSupabaseInstance: SupabaseClient | null = null;
let hasLoggedChessConfig = false;

const DEFAULT_ELO = 1200;

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
      console.log('[Supabase:CHESS] ⚠ Credentials not set. Operating in local in-memory mode.');
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
 * Upsert user by wallet address
 */
export async function upsertChessPlayer(walletAddress: string, username?: string): Promise<ChessPlayerRow | null> {
  const client = getChessSupabaseClient();
  if (!client || !walletAddress) return null;

  try {
    const cleanAddr = walletAddress.toLowerCase();
    const displayName = username || `Player_${cleanAddr.slice(2, 6)}`;

    const { data: existing, error: readError } = await client
      .from('players')
      .select('player_id, username, wallet_address, avatar_url, elo_rating, total_games, wins, losses, draws')
      .or(`player_id.eq.${cleanAddr},wallet_address.eq.${cleanAddr}`)
      .maybeSingle();

    if (readError && readError.code !== 'PGRST116') {
      console.warn('[Supabase:CHESS] Read player error:', readError.message);
    }

    if (existing) {
      const updateData: any = { last_active: new Date().toISOString(), last_seen: new Date().toISOString() };
      if (username) updateData.username = username;
      if (existing.elo_rating === null || existing.elo_rating === undefined) {
        updateData.elo_rating = DEFAULT_ELO;
      }

      const { data, error } = await client
        .from('players')
        .update(updateData)
        .eq('player_id', existing.player_id)
        .select()
        .single();

      if (error) {
        console.warn('[Supabase:CHESS] Update player error:', error.message);
        return normalizePlayer(existing);
      }
      return normalizePlayer(data);
    }

    const { data: inserted, error: insertError } = await client
      .from('players')
      .insert({
        player_id: cleanAddr,
        username: displayName,
        wallet_address: cleanAddr,
        elo_rating: DEFAULT_ELO,
        total_games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        last_active: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_online: true,
        online_status: 'online',
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        const { data: raced } = await client
          .from('players')
          .select('*')
          .eq('player_id', cleanAddr)
          .single();
        return normalizePlayer(raced);
      }
      console.warn('[Supabase:CHESS] Insert player error:', insertError.message);
      return null;
    }

    return normalizePlayer(inserted);
  } catch (err: any) {
    console.warn('[Supabase:CHESS] upsertChessPlayer error:', err.message);
    return null;
  }
}

/**
 * Get player stats by wallet address
 */
export async function getChessPlayerStats(walletAddress: string): Promise<any> {
  const cleanAddr = walletAddress?.toLowerCase() || '';
  const client = getChessSupabaseClient();

  if (!client || !cleanAddr) {
    return {
      elo_rating: DEFAULT_ELO,
      wins: 0,
      losses: 0,
      draws: 0,
      total_games: 0,
      win_rate: 0,
      username: `Player_${cleanAddr.slice(2, 6)}`,
      wallet_address: cleanAddr,
      is_online: true,
    };
  }

  try {
    const { data, error } = await client
      .from('players')
      .select('player_id, username, wallet_address, avatar_url, elo_rating, total_games, wins, losses, draws, last_seen, online_status, is_online')
      .or(`wallet_address.eq.${cleanAddr},player_id.eq.${cleanAddr}`)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('[Supabase:CHESS] Error querying stats:', error.message);
    }

    if (!data) {
      const created = await upsertChessPlayer(cleanAddr);
      return {
        elo_rating: created?.elo_rating ?? DEFAULT_ELO,
        wins: created?.wins ?? 0,
        losses: created?.losses ?? 0,
        draws: created?.draws ?? 0,
        total_games: created?.total_games ?? 0,
        win_rate: 0,
        username: created?.username || `Player_${cleanAddr.slice(2, 6)}`,
        wallet_address: cleanAddr,
        is_online: true,
      };
    }

    const norm = normalizePlayer(data);
    const total = norm?.total_games || 0;
    const wins = norm?.wins || 0;
    const winRate = total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0;

    return {
      elo_rating: norm?.elo_rating ?? DEFAULT_ELO,
      wins,
      losses: norm?.losses ?? 0,
      draws: norm?.draws ?? 0,
      total_games: total,
      win_rate: winRate,
      username: norm?.username || `Player_${cleanAddr.slice(2, 6)}`,
      wallet_address: cleanAddr,
      avatar_url: norm?.avatar_url,
      is_online: Boolean(data.is_online),
    };
  } catch (err: any) {
    console.warn('[Supabase:CHESS] Stats query exception:', err.message);
    return {
      elo_rating: DEFAULT_ELO,
      wins: 0,
      losses: 0,
      draws: 0,
      total_games: 0,
      win_rate: 0,
      username: `Player_${cleanAddr.slice(2, 6)}`,
      wallet_address: cleanAddr,
      is_online: true,
    };
  }
}

/**
 * Get match history by wallet address
 */
export async function getChessMatchHistory(walletAddress: string, limit = 10): Promise<any[]> {
  const cleanAddr = walletAddress?.toLowerCase() || '';
  const client = getChessSupabaseClient();
  if (!client || !cleanAddr) return [];

  try {
    const { data, error } = await client
      .from('game_history')
      .select('game_id, winner, result, total_moves, completed_at, white_player_id, black_player_id, white_elo_before, white_elo_after, black_elo_before, black_elo_after')
      .or(`white_player_id.eq.${cleanAddr},black_player_id.eq.${cleanAddr}`)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Supabase:CHESS] Match history error:', error.message);
      return [];
    }

    return (data || []).map((game: any) => {
      const isWhite = game.white_player_id?.toLowerCase() === cleanAddr;
      const outcome =
        game.winner === 'draw'
          ? 'D'
          : (game.winner === 'white' && isWhite) || (game.winner === 'black' && !isWhite)
          ? 'W'
          : 'L';

      const eloBefore = isWhite ? game.white_elo_before : game.black_elo_before;
      const eloAfter = isWhite ? game.white_elo_after : game.black_elo_after;
      const eloChange = eloBefore && eloAfter ? eloAfter - eloBefore : outcome === 'W' ? 16 : outcome === 'L' ? -16 : 0;

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
    });
  } catch (err: any) {
    console.warn('[Supabase:CHESS] History query exception:', err.message);
    return [];
  }
}

/**
 * Get leaderboard ranked by ELO
 */
export async function getChessLeaderboard(limit = 15): Promise<ChessLeaderboardEntry[]> {
  const client = getChessSupabaseClient();
  if (!client) {
    return [
      { rank: 1, address: '0x8e8e39D67D227E0a8B10095e07EA020D53926df3', name: 'GrandMasterChad', elo: 2140, wins: 142 },
      { rank: 2, address: '0x71C8A3f892d194514781440079C6F6F94732bE5A', name: 'DeepHemiCheck', elo: 1985, wins: 98 },
      { rank: 3, address: '0x12Fa87Bc1128EAf42c9535091Cd5866f809938b8', name: 'NeoKnight', elo: 1840, wins: 76 },
    ];
  }

  try {
    const { data, error } = await client
      .from('players')
      .select('player_id, wallet_address, username, elo_rating, total_games, wins, losses, draws')
      .order('elo_rating', { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      console.warn('[Supabase:CHESS] Leaderboard fetch fallback:', error?.message);
      return [
        { rank: 1, address: '0x8e8e39D67D227E0a8B10095e07EA020D53926df3', name: 'GrandMasterChad', elo: 2140, wins: 142 },
        { rank: 2, address: '0x71C8A3f892d194514781440079C6F6F94732bE5A', name: 'DeepHemiCheck', elo: 1985, wins: 98 },
        { rank: 3, address: '0x12Fa87Bc1128EAf42c9535091Cd5866f809938b8', name: 'NeoKnight', elo: 1840, wins: 76 },
      ];
    }

    return data.map((p: any, idx: number) => {
      const total = p.total_games || 0;
      const wins = p.wins || 0;
      const winRate = total > 0 ? `${((wins / total) * 100).toFixed(1)}%` : '0%';
      return {
        rank: idx + 1,
        address: p.wallet_address || p.player_id,
        name: p.username || `${(p.wallet_address || p.player_id).slice(0, 6)}...${(p.wallet_address || p.player_id).slice(-4)}`,
        elo: p.elo_rating || DEFAULT_ELO,
        wins,
        losses: p.losses || 0,
        draws: p.draws || 0,
        totalGames: total,
        winRate,
      };
    });
  } catch (err: any) {
    console.warn('[Supabase:CHESS] Leaderboard exception:', err.message);
    return [];
  }
}

/**
 * Record a completed chess match in Supabase game_history and update player stats
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
  const client = getChessSupabaseClient();
  if (!client) return false;

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

    const whiteId = whiteAddress.toLowerCase();
    const blackId = blackAddress.toLowerCase();

    // Ensure players exist
    const whitePlayer = await upsertChessPlayer(whiteId);
    const blackPlayer = await upsertChessPlayer(blackId);

    const whiteBefore = whitePlayer?.elo_rating || DEFAULT_ELO;
    const blackBefore = blackPlayer?.elo_rating || DEFAULT_ELO;

    const whiteAfter = newWhiteElo || (whiteBefore + whiteEloChange);
    const blackAfter = newBlackElo || (blackBefore + blackEloChange);

    const nowIso = new Date().toISOString();

    // Insert game history
    const { error: insertError } = await client.from('game_history').upsert({
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
    }, { onConflict: 'game_id' });

    if (insertError) {
      console.warn('[Supabase:CHESS] Error saving game history:', insertError.message);
    }

    // Update stats for both players
    const updateWhiteStats = {
      total_games: (whitePlayer?.total_games || 0) + 1,
      wins: (whitePlayer?.wins || 0) + (winner === 'white' ? 1 : 0),
      losses: (whitePlayer?.losses || 0) + (winner === 'black' ? 1 : 0),
      draws: (whitePlayer?.draws || 0) + (winner === 'draw' ? 1 : 0),
      elo_rating: whiteAfter,
      updated_at: nowIso,
      last_active: nowIso,
    };

    const updateBlackStats = {
      total_games: (blackPlayer?.total_games || 0) + 1,
      wins: (blackPlayer?.wins || 0) + (winner === 'black' ? 1 : 0),
      losses: (blackPlayer?.losses || 0) + (winner === 'white' ? 1 : 0),
      draws: (blackPlayer?.draws || 0) + (winner === 'draw' ? 1 : 0),
      elo_rating: blackAfter,
      updated_at: nowIso,
      last_active: nowIso,
    };

    await Promise.all([
      client.from('players').update(updateWhiteStats).eq('player_id', whiteId),
      client.from('players').update(updateBlackStats).eq('player_id', blackId),
    ]);

    console.log(`[Supabase:CHESS] ✓ Settled match ${gameId}: White=${whiteAfter} Black=${blackAfter}`);
    return true;
  } catch (err: any) {
    console.warn('[Supabase:CHESS] Error settling match:', err.message);
    return false;
  }
}

/**
 * Get friends for a wallet address from Chess Supabase
 */
export async function getChessFriends(walletAddress: string): Promise<any[]> {
  const client = getChessSupabaseClient();
  if (!client || !walletAddress) return [];

  try {
    const cleanAddr = walletAddress.toLowerCase();
    const { data, error } = await client
      .from('friends_list')
      .select('*')
      .eq('user_id', cleanAddr);

    if (error) {
      // Fallback to friends table
      const { data: fData } = await client
        .from('friends')
        .select('*')
        .or(`user_id.eq.${cleanAddr},friend_id.eq.${cleanAddr}`);
      return fData || [];
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Get notifications for a recipient from Chess Supabase
 */
export async function getChessNotifications(recipientId: string): Promise<any[]> {
  const client = getChessSupabaseClient();
  if (!client || !recipientId) return [];

  try {
    const cleanAddr = recipientId.toLowerCase();
    const { data, error } = await client
      .from('notifications_detailed')
      .select('*')
      .eq('recipient_id', cleanAddr)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      const { data: nData } = await client
        .from('notifications')
        .select('*')
        .eq('recipient_id', cleanAddr)
        .order('created_at', { ascending: false })
        .limit(20);
      return nData || [];
    }

    return data || [];
  } catch {
    return [];
  }
}

/**
 * Update player presence in Chess Supabase
 */
export async function updateChessUserStatus(walletAddress: string, isOnline: boolean): Promise<void> {
  const client = getChessSupabaseClient();
  if (!client || !walletAddress) return;

  try {
    const cleanAddr = walletAddress.toLowerCase();
    await client
      .from('players')
      .update({
        is_online: isOnline,
        online_status: isOnline ? 'online' : 'offline',
        last_seen: new Date().toISOString(),
      })
      .eq('player_id', cleanAddr);
  } catch {}
}
