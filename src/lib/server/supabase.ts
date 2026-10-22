import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.UNO_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.trim();

  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.UNO_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.UNO_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !key) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

export async function getCrazy8ProfileByAddress(address: string) {
  const client = getSupabase();
  const cleanAddr = address.trim().toLowerCase();
  const defaultTag = `Player_${cleanAddr.slice(2, 6)}`;
  const defaultName = `Player ${cleanAddr.slice(2, 6)}`;

  if (!client) {
    return {
      id: `wallet_${cleanAddr}`,
      address: cleanAddr,
      tag: defaultTag,
      name: defaultName,
      avatar: '🦊',
      bio: 'Crazy 8 Pot Collector',
      status: 'online',
      stats: { matchesPlayed: 0, wins: 0, losses: 0, cardsPlayed: 0, totalWinnings: '0.000' },
      tokenBalance: 0,
      hasClaimedAirdrop: false,
    };
  }

  try {
    const { data, error } = await client
      .from('crazy8_profiles')
      .select('*')
      .eq('address', cleanAddr)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        address: data.address,
        tag: data.tag || defaultTag,
        name: data.name || defaultName,
        avatar: data.avatar || '🦊',
        bio: data.bio || 'Crazy 8 Pot Collector',
        status: data.status || 'online',
        stats: {
          matchesPlayed: data.matches_played || 0,
          wins: data.wins || 0,
          losses: Math.max(0, (data.matches_played || 0) - (data.wins || 0)),
          cardsPlayed: data.cards_played || 0,
          totalWinnings: data.total_winnings || '0.000',
        },
        tokenBalance: 0,
        hasClaimedAirdrop: false,
      };
    }

    // Auto-create initial profile for wallet
    const newProfile = {
      id: `wallet_${cleanAddr}`,
      address: cleanAddr,
      tag: defaultTag,
      name: defaultName,
      avatar: '🦊',
      bio: 'Crazy 8 Pot Collector',
      status: 'online',
      matches_played: 0,
      wins: 0,
      cards_played: 0,
      total_winnings: '0.000',
      last_seen: Date.now(),
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    await client.from('crazy8_profiles').insert(newProfile);

    return {
      ...newProfile,
      stats: { matchesPlayed: 0, wins: 0, losses: 0, cardsPlayed: 0, totalWinnings: '0.000' },
      tokenBalance: 0,
      hasClaimedAirdrop: false,
    };
  } catch (err) {
    console.warn('[Supabase] Failed to get/create profile:', err);
    return {
      id: `wallet_${cleanAddr}`,
      address: cleanAddr,
      tag: defaultTag,
      name: defaultName,
      avatar: '🦊',
      bio: 'Crazy 8 Pot Collector',
      status: 'online',
      stats: { matchesPlayed: 0, wins: 0, losses: 0, cardsPlayed: 0, totalWinnings: '0.000' },
      tokenBalance: 0,
      hasClaimedAirdrop: false,
    };
  }
}

export async function upsertCrazy8Profile(params: {
  id?: string;
  address?: string;
  name?: string;
  avatar?: string;
  bio?: string;
}) {
  const client = getSupabase();
  const cleanAddr = params.address ? params.address.trim().toLowerCase() : undefined;
  const id = params.id || (cleanAddr ? `wallet_${cleanAddr}` : `user_${Date.now()}`);

  if (!client) {
    return { id, ...params, address: cleanAddr };
  }

  try {
    const updatePayload: Record<string, any> = {
      id,
      updated_at: Date.now(),
    };
    if (cleanAddr) updatePayload.address = cleanAddr;
    if (params.name) updatePayload.name = params.name.trim();
    if (params.avatar) updatePayload.avatar = params.avatar;
    if (params.bio !== undefined) updatePayload.bio = params.bio;

    const { data, error } = await client
      .from('crazy8_profiles')
      .upsert(updatePayload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Profile upsert error:', error.message);
      return { id, ...params, address: cleanAddr };
    }

    return data;
  } catch (err) {
    console.warn('[Supabase] Profile upsert exception:', err);
    return { id, ...params, address: cleanAddr };
  }
}

export async function getCrazy8Leaderboard(sort: string = 'wins', limit: number = 20) {
  const client = getSupabase();
  if (!client) return [];

  try {
    let orderColumn = 'wins';
    if (sort === 'total_winnings' || sort === 'chips') {
      orderColumn = 'total_winnings';
    } else if (sort === 'matches_played') {
      orderColumn = 'matches_played';
    }

    const { data, error } = await client
      .from('crazy8_profiles')
      .select('id, address, tag, name, avatar, wins, matches_played, cards_played, total_winnings')
      .order(orderColumn, { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Supabase] Leaderboard query error:', error.message);
      return [];
    }

    return (data || []).map((row, idx) => ({
      rank: idx + 1,
      id: row.id,
      address: row.address,
      name: row.name || row.tag,
      tag: row.tag,
      avatar: row.avatar || '🦊',
      wins: row.wins || 0,
      matchesPlayed: row.matches_played || 0,
      cardsPlayed: row.cards_played || 0,
      totalWinnings: row.total_winnings || '0',
      winRate: (row.matches_played || 0) > 0 ? Math.round(((row.wins || 0) / row.matches_played) * 100) : 0,
    }));
  } catch (err) {
    console.warn('[Supabase] Leaderboard query exception:', err);
    return [];
  }
}

export async function getArcadeStats() {
  const client = getSupabase();
  if (!client) {
    return {
      activeGames: 0,
      totalPlayers: 0,
      totalTransactions: 0,
      chessGames: 0,
      unoGames: 0,
      connect4Games: 0,
      chessOnline: 0,
      unoOnline: 0,
      connect4Online: 0,
    };
  }

  try {
    const [playersRes, crazy8Res, chessGamesRes, connect4Res] = await Promise.all([
      client.from('players').select('id', { count: 'exact', head: true }),
      client.from('crazy8_profiles').select('id', { count: 'exact', head: true }),
      client.from('game_history').select('id', { count: 'exact', head: true }),
      client.from('connect4_matches').select('id', { count: 'exact', head: true }),
    ]);

    const chessPlayers = playersRes.count || 0;
    const unoPlayers = crazy8Res.count || 0;
    const totalPlayers = chessPlayers + unoPlayers;
    const chessGames = chessGamesRes.count || 0;
    const connect4Games = connect4Res.count || 0;

    return {
      activeGames: Math.max(1, Math.floor((chessGames + connect4Games) / 10)),
      totalPlayers: Math.max(totalPlayers, 1),
      totalTransactions: chessGames + connect4Games + 100,
      chessGames,
      unoGames: 0,
      connect4Games,
      chessOnline: 1,
      unoOnline: 1,
      connect4Online: 0,
    };
  } catch (err) {
    console.warn('[Supabase] Error getting arcade stats:', err);
    return {
      activeGames: 0,
      totalPlayers: 0,
      totalTransactions: 0,
      chessGames: 0,
      unoGames: 0,
      connect4Games: 0,
      chessOnline: 0,
      unoOnline: 0,
      connect4Online: 0,
    };
  }
}

export async function getArcadeGlobalLeaderboard(limit: number = 20) {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('arcade_global_leaderboard')
      .select('*')
      .limit(limit);

    if (!error && data) {
      return data;
    }

    // Fallback: query players
    const { data: chessData } = await client
      .from('players')
      .select('player_id, wallet_address, username, avatar_url, elo_rating, wins, total_games')
      .order('elo_rating', { ascending: false })
      .limit(limit);

    return (chessData || []).map((p, idx) => ({
      global_rank: idx + 1,
      player_id: p.player_id,
      wallet_address: p.wallet_address,
      display_name: p.username,
      avatar: p.avatar_url,
      primary_game: 'chess',
      total_victories: p.wins,
      total_matches: p.total_games,
      top_elo: p.elo_rating,
    }));
  } catch (err) {
    console.warn('[Supabase] Global leaderboard error:', err);
    return [];
  }
}
