import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

let supabaseClient: SupabaseClient | null = null;

const UNO_DB_PATH = path.join(process.cwd(), 'data', 'uno_db.json');
const CHESS_DB_PATH = path.join(process.cwd(), 'data', 'chess_db.json');

function readLocalUnoDb(): { users: Record<string, any>; recentRooms: Record<string, any> } {
  try {
    if (fs.existsSync(UNO_DB_PATH)) {
      const raw = fs.readFileSync(UNO_DB_PATH, 'utf-8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        return {
          users: parsed.users || {},
          recentRooms: parsed.recentRooms || {},
        };
      }
    }
  } catch {}
  return { users: {}, recentRooms: {} };
}

function writeLocalUnoDb(data: { users: Record<string, any>; recentRooms: Record<string, any> }) {
  try {
    const dir = path.dirname(UNO_DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(UNO_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

function readLocalChessDb(): { players: Record<string, any>; gameHistory: any[] } {
  try {
    if (fs.existsSync(CHESS_DB_PATH)) {
      const raw = fs.readFileSync(CHESS_DB_PATH, 'utf-8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        return {
          players: parsed.players || {},
          gameHistory: parsed.gameHistory || [],
        };
      }
    }
  } catch {}
  return { players: {}, gameHistory: [] };
}

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

  if (!url || !key || !url.startsWith('http') || url.includes('your-project-id')) {
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
  const shortAddr = `${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)}`;
  const defaultTag = `Player_${cleanAddr.slice(2, 6)}`;
  const defaultName = shortAddr;

  if (!client) {
    const db = readLocalUnoDb();
    const canonicalId = `wallet_${cleanAddr}`;
    const existing =
      db.users[canonicalId] ||
      Object.values(db.users).find((u: any) => u?.address?.toLowerCase() === cleanAddr);

    if (existing) {
      return {
        id: existing.id || canonicalId,
        address: cleanAddr,
        tag: existing.tag || defaultTag,
        name: existing.name || defaultName,
        avatar: existing.avatar || '🦊',
        bio: existing.bio || 'Crazy 8 Pot Collector',
        status: existing.status || 'online',
        stats: existing.stats || {
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          cardsPlayed: 0,
          totalWinnings: '0.000',
        },
        tokenBalance: typeof existing.tokenBalance === 'number' ? existing.tokenBalance : 10000,
        hasClaimedAirdrop: Boolean(existing.hasClaimedAirdrop),
      };
    }

    return {
      id: canonicalId,
      address: cleanAddr,
      tag: defaultTag,
      name: defaultName,
      avatar: '🦊',
      bio: 'Crazy 8 Pot Collector',
      status: 'online',
      stats: { matchesPlayed: 0, wins: 0, losses: 0, cardsPlayed: 0, totalWinnings: '0.000' },
      tokenBalance: 10000,
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
        tokenBalance: 10000,
        hasClaimedAirdrop: false,
      };
    }

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
      tokenBalance: 10000,
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
      tokenBalance: 10000,
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
  const id = cleanAddr ? `wallet_${cleanAddr}` : params.id || `user_${Date.now()}`;

  const db = readLocalUnoDb();
  const existing = db.users[id] || {};
  const defaultName = cleanAddr ? `${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)}` : 'Player';
  const resolvedName = params.name?.trim() || existing.name || defaultName;
  const updatedLocal = {
    ...existing,
    id,
    address: cleanAddr || existing.address,
    name: resolvedName,
    tag: existing.tag || `${resolvedName.replace(/[^a-zA-Z0-9]/g, '') || 'Player'}#1001`,
    avatar: params.avatar || existing.avatar || '🦊',
    bio: params.bio !== undefined ? params.bio : existing.bio || 'Crazy 8 Pot Collector',
    status: existing.status || 'online',
    stats: existing.stats || {
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      cardsPlayed: 0,
      totalWinnings: '0.000',
    },
    tokenBalance: typeof existing.tokenBalance === 'number' ? existing.tokenBalance : 10000,
    updatedAt: Date.now(),
    lastSeen: Date.now(),
    createdAt: existing.createdAt || Date.now(),
    friends: existing.friends || [],
    friendRequestsSent: existing.friendRequestsSent || [],
    friendRequestsReceived: existing.friendRequestsReceived || [],
    recentOpponents: existing.recentOpponents || [],
    notifications: existing.notifications || [],
  };
  db.users[id] = updatedLocal;
  writeLocalUnoDb(db);

  if (!client) {
    return updatedLocal;
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
      return updatedLocal;
    }

    return data || updatedLocal;
  } catch (err) {
    console.warn('[Supabase] Profile upsert exception:', err);
    return updatedLocal;
  }
}

const BOT_CHIPS: Record<string, number> = {
  whale_1: 185000,
  whale_2: 142500,
  whale_3: 98000,
  bot_host_stck: 67500,
  bot_host_team: 51200,
  bot_host_clsc: 38000,
  bot_host_fast: 26400,
  whale_4: 19500,
};

export async function getCrazy8Leaderboard(sort: string = 'wins', limit: number = 20) {
  const client = getSupabase();
  if (!client) {
    const db = readLocalUnoDb();
    const list = Object.values(db.users).map((u: any) => {
      const wins = u.stats?.wins || 0;
      const matchesPlayed = u.stats?.matchesPlayed || 0;
      const cardsPlayed = u.stats?.cardsPlayed || 0;
      const totalWinnings = u.stats?.totalWinnings || '0';
      const chips =
        typeof u.tokenBalance === 'number'
          ? u.tokenBalance
          : BOT_CHIPS[u.id] ?? 10000;
      return {
        rank: 0,
        id: u.id,
        address: u.address,
        name: u.name || u.tag,
        tag: u.tag,
        avatar: u.avatar || '🦊',
        tokenBalance: chips,
        wins,
        matchesPlayed,
        cardsPlayed,
        totalWinnings,
        winRate: matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0,
        stats: {
          matchesPlayed,
          wins,
          losses: Math.max(0, matchesPlayed - wins),
          cardsPlayed,
          totalWinnings,
          totalLosses: u.stats?.totalLosses || '0',
        },
      };
    });

    if (sort === 'chips' || sort === 'total_winnings') {
      list.sort((a, b) => (b.tokenBalance ?? 0) - (a.tokenBalance ?? 0));
    } else {
      list.sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0));
    }

    return list.slice(0, limit).map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }

  try {
    const { data, error } = await client
      .from('crazy8_profiles')
      .select('id, address, tag, name, avatar, wins, matches_played, cards_played, total_winnings');

    if (error) {
      console.warn('[Supabase] Leaderboard query error:', error.message);
      return [];
    }

    const leaderboard = (data || []).map((row) => {
      const wins = row.wins || 0;
      const matchesPlayed = row.matches_played || 0;
      const cardsPlayed = row.cards_played || 0;
      const totalWinnings = row.total_winnings || '0';
      const botChip = BOT_CHIPS[row.id];
      const chips = botChip !== undefined ? botChip : Math.max(10000, (parseFloat(totalWinnings) || 0) + 10000);

      return {
        rank: 0,
        id: row.id,
        address: row.address,
        name: row.name || row.tag,
        tag: row.tag,
        avatar: row.avatar || '🦊',
        tokenBalance: chips,
        wins,
        matchesPlayed,
        cardsPlayed,
        totalWinnings,
        winRate: matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0,
        stats: {
          matchesPlayed,
          wins,
          losses: Math.max(0, matchesPlayed - wins),
          cardsPlayed,
          totalWinnings,
          totalLosses: '0',
        },
      };
    });

    if (sort === 'chips' || sort === 'total_winnings') {
      leaderboard.sort((a, b) => (b.tokenBalance ?? 0) - (a.tokenBalance ?? 0));
    } else {
      leaderboard.sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0));
    }

    return leaderboard.slice(0, limit).map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  } catch (err) {
    console.warn('[Supabase] Leaderboard query exception:', err);
    return [];
  }
}

export async function getArcadeStats() {
  const client = getSupabase();
  if (!client) {
    const unoDb = readLocalUnoDb();
    const chessDb = readLocalChessDb();
    const unoPlayers = Object.keys(unoDb.users).length;
    const chessPlayers = Object.keys(chessDb.players).length;
    const chessGames = chessDb.gameHistory.length;

    return {
      activeGames: 4,
      totalPlayers: Math.max(unoPlayers + chessPlayers, 12),
      totalTransactions: Math.max(chessGames + 1420, 1420),
      chessGames: Math.max(chessGames, 140),
      unoGames: 1280,
      connect4Games: 85,
      chessOnline: 4,
      unoOnline: 8,
      connect4Online: 2,
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
  if (!client) {
    const chessDb = readLocalChessDb();
    const list = Object.values(chessDb.players)
      .sort((a: any, b: any) => (b.elo_rating || 1200) - (a.elo_rating || 1200))
      .slice(0, limit);
    return list.map((p: any, idx: number) => ({
      global_rank: idx + 1,
      player_id: p.player_id,
      wallet_address: p.wallet_address,
      display_name: p.username,
      avatar: p.avatar_url || '♟️',
      primary_game: 'chess',
      total_victories: p.wins || 0,
      total_matches: p.total_games || 0,
      top_elo: p.elo_rating || 1200,
    }));
  }

  try {
    const { data, error } = await client
      .from('arcade_global_leaderboard')
      .select('*')
      .limit(limit);

    if (!error && data) {
      return data;
    }

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

