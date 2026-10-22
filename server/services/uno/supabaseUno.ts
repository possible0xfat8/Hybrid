import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { UserProfileRecord, DatabaseSchema } from '../../engine/uno/database';

export interface SupabaseProfileRow {
  id: string;
  address: string | null;
  tag: string;
  name: string;
  avatar: string;
  bio: string | null;
  status: 'online' | 'in_game' | 'offline';
  current_room_code: string | null;
  matches_played: number;
  wins: number;
  cards_played: number;
  total_winnings: string;
  last_seen: number;
  created_at: number;
  updated_at: number;
}

export interface SupabaseFriendRow {
  user_id: string;
  friend_id: string;
  created_at: number;
}

export interface SupabaseFriendRequestRow {
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: number;
}

export interface SupabaseRecentOpponentRow {
  user_id: string;
  opponent_id: string;
  played_at: number;
}

export interface SupabaseRecentRoomRow {
  room_code: string;
  host_name: string;
  host_avatar: string;
  buy_in: string;
  status: 'lobby' | 'playing' | 'game_over';
  created_at: number;
}

export interface SupabaseMatchHistoryRow {
  id?: string;
  room_code: string;
  winner_id: string | null;
  player_ids: string[];
  pot_amount: string;
  cards_played: Record<string, number>;
  created_at: number;
}

let supabaseInstance: SupabaseClient | null = null;
let hasLoggedConfigState = false;

interface TableNames {
  profiles: string;
  rooms: string;
  match_history: string;
  friends: string;
  friend_requests: string;
  recent_opponents: string;
  leaderboard: string;
}

let tableNameCache: TableNames | null = null;

export async function resolveUnoTables(client: SupabaseClient): Promise<TableNames> {
  if (tableNameCache) return tableNameCache;

  try {
    const { error } = await client.from('crazy8_profiles').select('id').limit(1);
    if (!error) {
      tableNameCache = {
        profiles: 'crazy8_profiles',
        rooms: 'crazy8_rooms',
        match_history: 'crazy8_match_history',
        friends: 'crazy8_friends',
        friend_requests: 'crazy8_friend_requests',
        recent_opponents: 'crazy8_recent_opponents',
        leaderboard: 'crazy8_leaderboard',
      };
      console.log('[Supabase:UNO] ✓ Using game-namespaced tables (crazy8_*)');
      return tableNameCache;
    }
  } catch {}

  tableNameCache = {
    profiles: 'profiles',
    rooms: 'recent_rooms',
    match_history: 'match_history',
    friends: 'friends',
    friend_requests: 'friend_requests',
    recent_opponents: 'recent_opponents',
    leaderboard: 'leaderboard',
  };
  return tableNameCache;
}

/**
 * Check if Uno Supabase is configured in environment
 */
export function isUnoSupabaseConfigured(): boolean {
  const url = (process.env.UNO_SUPABASE_URL || process.env.SUPABASE_URL)?.trim();
  const key = (
    process.env.UNO_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.UNO_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY
  )?.trim();

  const isValid = Boolean(url && key && url.startsWith('http') && !url.includes('your-project-id'));

  if (!hasLoggedConfigState) {
    hasLoggedConfigState = true;
    if (isValid) {
      console.log(`[Supabase:UNO] ✓ Connected to Uno Supabase: ${url}`);
    } else {
      console.log('[Supabase:UNO] ⚠ Credentials not set. Operating in local in-memory/file mode.');
    }
  }
  return isValid;
}

/**
 * Get or initialize the Uno Supabase client
 */
export function getUnoSupabaseClient(): SupabaseClient | null {
  if (!isUnoSupabaseConfigured()) {
    return null;
  }
  if (!supabaseInstance) {
    const url = (process.env.UNO_SUPABASE_URL || process.env.SUPABASE_URL)!.trim();
    const key = (
      process.env.UNO_SUPABASE_SERVICE_ROLE_KEY ||
      process.env.UNO_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY
    )!.trim();

    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseInstance;
}

/**
 * Convert local UserProfileRecord to Supabase profile row
 */
export function toSupabaseProfile(user: UserProfileRecord): SupabaseProfileRow {
  return {
    id: user.id,
    address: user.address ? user.address.toLowerCase() : null,
    tag: user.tag,
    name: user.name,
    avatar: user.avatar || '🦊',
    bio: user.bio || 'Hemi Testnet Card Champion',
    status: user.status || 'offline',
    current_room_code: user.currentRoomCode || null,
    matches_played: user.stats?.matchesPlayed || 0,
    wins: user.stats?.wins || 0,
    cards_played: user.stats?.cardsPlayed || 0,
    total_winnings: user.stats?.totalWinnings || '0.000',
    last_seen: user.lastSeen || Date.now(),
    created_at: user.createdAt || Date.now(),
    updated_at: user.updatedAt || Date.now(),
  };
}

/**
 * Asynchronously upsert a profile in Uno Supabase
 */
export async function syncProfileToSupabase(user: UserProfileRecord): Promise<void> {
  const client = getUnoSupabaseClient();
  if (!client) return;

  try {
    const tables = await resolveUnoTables(client);
    const row = toSupabaseProfile(user);
    const { error } = await client.from(tables.profiles).upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn(`[Supabase:UNO] Error upserting profile ${user.id}:`, error.message);
    }
  } catch (err: any) {
    console.warn(`[Supabase:UNO] Exception syncing profile ${user.id}:`, err.message);
  }
}

/**
 * Update user status and presence in Uno Supabase
 */
export async function syncPresenceToSupabase(
  id: string,
  status: 'online' | 'in_game' | 'offline',
  currentRoomCode: string | null = null
): Promise<void> {
  const client = getUnoSupabaseClient();
  if (!client) return;

  try {
    const tables = await resolveUnoTables(client);
    const { error } = await client
      .from(tables.profiles)
      .update({
        status,
        current_room_code: currentRoomCode,
        last_seen: Date.now(),
      })
      .eq('id', id);

    if (error) {
      console.warn(`[Supabase:UNO] Error updating presence for ${id}:`, error.message);
    }
  } catch (err: any) {
    console.warn(`[Supabase:UNO] Exception updating presence for ${id}:`, err.message);
  }
}

/**
 * Record a mutual friendship in Uno Supabase
 */
export async function syncFriendRelationshipToSupabase(userId: string, friendId: string): Promise<void> {
  const client = getUnoSupabaseClient();
  if (!client) return;

  try {
    const tables = await resolveUnoTables(client);
    const now = Date.now();
    await client.from(tables.friends).upsert([
      { user_id: userId, friend_id: friendId, created_at: now },
      { user_id: friendId, friend_id: userId, created_at: now },
    ], { onConflict: 'user_id,friend_id' });
  } catch (err: any) {
    console.warn(`[Supabase:UNO] Error syncing friends (${userId} <-> ${friendId}):`, err.message);
  }
}

/**
 * Remove a mutual friendship in Uno Supabase
 */
export async function removeFriendRelationshipFromSupabase(userId: string, friendId: string): Promise<void> {
  const client = getUnoSupabaseClient();
  if (!client) return;

  try {
    const tables = await resolveUnoTables(client);
    await client
      .from(tables.friends)
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);
  } catch (err: any) {
    console.warn(`[Supabase:UNO] Error removing friends (${userId} <-> ${friendId}):`, err.message);
  }
}

/**
 * Upsert a friend request in Uno Supabase
 */
export async function syncFriendRequestToSupabase(
  senderId: string,
  receiverId: string,
  status: 'pending' | 'accepted' | 'declined'
): Promise<void> {
  const client = getUnoSupabaseClient();
  if (!client) return;

  try {
    const tables = await resolveUnoTables(client);
    await client.from(tables.friend_requests).upsert({
      sender_id: senderId,
      receiver_id: receiverId,
      status,
      created_at: Date.now(),
    }, { onConflict: 'sender_id,receiver_id' });
  } catch (err: any) {
    console.warn(`[Supabase:UNO] Error syncing friend request:`, err.message);
  }
}

/**
 * Delete a friend request from Uno Supabase
 */
export async function removeFriendRequestFromSupabase(senderId: string, receiverId: string): Promise<void> {
  const client = getUnoSupabaseClient();
  if (!client) return;

  try {
    const tables = await resolveUnoTables(client);
    await client
      .from(tables.friend_requests)
      .delete()
      .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`);
  } catch (err: any) {
    console.warn(`[Supabase:UNO] Error deleting friend request:`, err.message);
  }
}

/**
 * Record recent opponents for social discovery
 */
export async function syncRecentOpponentsToSupabase(userId: string, opponentIds: string[]): Promise<void> {
  const client = getUnoSupabaseClient();
  if (!client || opponentIds.length === 0) return;

  try {
    const tables = await resolveUnoTables(client);
    const now = Date.now();
    const rows = opponentIds.map((oppId) => ({
      user_id: userId,
      opponent_id: oppId,
      played_at: now,
    }));
    await client.from(tables.recent_opponents).upsert(rows, { onConflict: 'user_id,opponent_id' });
  } catch (err: any) {
    console.warn(`[Supabase:UNO] Error syncing recent opponents for ${userId}:`, err.message);
  }
}

/**
 * Sync active or recent room lobby to Uno Supabase
 */
export async function syncRecentRoomToSupabase(
  roomCode: string,
  info: {
    hostName: string;
    hostAvatar: string;
    buyIn: string;
    status: 'lobby' | 'playing' | 'game_over';
    createdAt?: number;
  }
): Promise<void> {
  const client = getUnoSupabaseClient();
  if (!client) return;

  try {
    const tables = await resolveUnoTables(client);
    await client.from(tables.rooms).upsert({
      room_code: roomCode,
      host_name: info.hostName,
      host_avatar: info.hostAvatar,
      buy_in: info.buyIn,
      status: info.status,
      created_at: info.createdAt || Date.now(),
    }, { onConflict: 'room_code' });
  } catch (err: any) {
    console.warn(`[Supabase:UNO] Error syncing room ${roomCode}:`, err.message);
  }
}

/**
 * Record a completed match in Uno Supabase match_history table
 */
export async function syncMatchHistoryToSupabase(
  roomCode: string,
  winnerId: string,
  playerIds: string[],
  potAmount: string,
  cardsPlayedMap: Record<string, number>
): Promise<void> {
  const client = getUnoSupabaseClient();
  if (!client) return;

  try {
    const tables = await resolveUnoTables(client);
    await client.from(tables.match_history).insert({
      room_code: roomCode,
      winner_id: winnerId,
      player_ids: playerIds,
      pot_amount: potAmount,
      cards_played: cardsPlayedMap,
      created_at: Date.now(),
    });
  } catch (err: any) {
    console.warn(`[Supabase:UNO] Error recording match history for room ${roomCode}:`, err.message);
  }
}

/**
 * Pull all data from Uno Supabase to bootstrap/hydrate in-memory state
 */
export async function loadInitialDataFromSupabase(): Promise<{
  users: Record<string, UserProfileRecord>;
  recentRooms: DatabaseSchema['recentRooms'];
} | null> {
  const client = getUnoSupabaseClient();
  if (!client) return null;

  try {
    const tables = await resolveUnoTables(client);
    console.log(`[Supabase:UNO] Fetching initial data using table "${tables.profiles}"...`);

    const [profilesRes, friendsRes, requestsRes, opponentsRes, roomsRes] = await Promise.all([
      client.from(tables.profiles).select('*'),
      client.from(tables.friends).select('*'),
      client.from(tables.friend_requests).select('*'),
      client.from(tables.recent_opponents).select('*'),
      client.from(tables.rooms).select('*').order('created_at', { ascending: false }).limit(20),
    ]);

    if (profilesRes.error) {
      console.warn('[Supabase:UNO] Failed to fetch profiles:', profilesRes.error.message);
      return null;
    }

    const users: Record<string, UserProfileRecord> = {};

    for (const p of (profilesRes.data as SupabaseProfileRow[])) {
      users[p.id] = {
        id: p.id,
        address: p.address || undefined,
        tag: p.tag,
        name: p.name,
        avatar: p.avatar,
        bio: p.bio || 'Hemi Testnet Card Champion',
        status: p.status,
        currentRoomCode: p.current_room_code,
        lastSeen: Number(p.last_seen),
        createdAt: Number(p.created_at),
        updatedAt: Number(p.updated_at),
        stats: {
          matchesPlayed: p.matches_played,
          wins: p.wins,
          cardsPlayed: p.cards_played,
          totalWinnings: p.total_winnings,
        },
        tokenBalance: 10000,
        friends: [],
        friendRequestsSent: [],
        friendRequestsReceived: [],
        recentOpponents: [],
        notifications: [],
      };
    }

    // Populate friends
    if (friendsRes.data) {
      for (const f of (friendsRes.data as SupabaseFriendRow[])) {
        if (users[f.user_id] && !users[f.user_id].friends.includes(f.friend_id)) {
          users[f.user_id].friends.push(f.friend_id);
        }
      }
    }

    // Populate friend requests
    if (requestsRes.data) {
      for (const r of (requestsRes.data as SupabaseFriendRequestRow[])) {
        if (r.status === 'pending') {
          if (users[r.sender_id] && !users[r.sender_id].friendRequestsSent.includes(r.receiver_id)) {
            users[r.sender_id].friendRequestsSent.push(r.receiver_id);
          }
          if (users[r.receiver_id] && !users[r.receiver_id].friendRequestsReceived.includes(r.sender_id)) {
            users[r.receiver_id].friendRequestsReceived.push(r.sender_id);
          }
        }
      }
    }

    // Populate recent opponents
    if (opponentsRes.data) {
      for (const opp of (opponentsRes.data as SupabaseRecentOpponentRow[])) {
        if (users[opp.user_id]) {
          const oppUser = users[opp.opponent_id];
          users[opp.user_id].recentOpponents.push({
            id: opp.opponent_id,
            name: oppUser?.name || 'Player',
            avatar: oppUser?.avatar || '🦊',
            playedAt: Number(opp.played_at),
          });
        }
      }
    }

    const recentRooms: DatabaseSchema['recentRooms'] = {};
    if (roomsRes.data) {
      for (const rm of (roomsRes.data as SupabaseRecentRoomRow[])) {
        recentRooms[rm.room_code] = {
          roomCode: rm.room_code,
          hostName: rm.host_name,
          hostAvatar: rm.host_avatar,
          buyIn: rm.buy_in,
          status: rm.status,
          createdAt: Number(rm.created_at),
        };
      }
    }

    console.log(`[Supabase:UNO] ✓ Bootstrapped ${Object.keys(users).length} profiles & ${Object.keys(recentRooms).length} rooms.`);
    return { users, recentRooms };
  } catch (err: any) {
    console.warn('[Supabase:UNO] Could not fetch remote dataset:', err.message);
    return null;
  }
}

/**
 * Query real leaderboard directly from Uno Supabase
 */
export async function fetchUnoLeaderboardFromSupabase(limit = 15): Promise<UserProfileRecord[] | null> {
  const client = getUnoSupabaseClient();
  if (!client) return null;

  try {
    const tables = await resolveUnoTables(client);
    const { data, error } = await client
      .from(tables.profiles)
      .select('*')
      .order('wins', { ascending: false })
      .order('matches_played', { ascending: false })
      .limit(limit);

    if (error || !data) return null;

    return data.map((p: SupabaseProfileRow) => ({
      id: p.id,
      address: p.address || undefined,
      tag: p.tag,
      name: p.name,
      avatar: p.avatar,
      bio: p.bio || 'Hemi Testnet Card Champion',
      status: p.status,
      currentRoomCode: p.current_room_code,
      lastSeen: Number(p.last_seen),
      createdAt: Number(p.created_at),
      updatedAt: Number(p.updated_at),
      stats: {
        matchesPlayed: p.matches_played,
        wins: p.wins,
        cardsPlayed: p.cards_played,
        totalWinnings: p.total_winnings,
      },
      tokenBalance: 10000,
      friends: [],
      friendRequestsSent: [],
      friendRequestsReceived: [],
      recentOpponents: [],
      notifications: [],
    }));
  } catch (err: any) {
    console.warn('[Supabase:UNO] Failed to fetch leaderboard:', err.message);
    return null;
  }
}
