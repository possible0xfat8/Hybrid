import fs from 'fs';
import path from 'path';
import {
  isUnoSupabaseConfigured,
  loadInitialDataFromSupabase,
  syncProfileToSupabase,
  syncPresenceToSupabase,
  syncFriendRelationshipToSupabase,
  removeFriendRelationshipFromSupabase,
  syncFriendRequestToSupabase,
  removeFriendRequestFromSupabase,
  syncRecentOpponentsToSupabase,
  syncRecentRoomToSupabase,
  syncMatchHistoryToSupabase,
  fetchUnoLeaderboardFromSupabase,
} from '../../services/uno/supabaseUno';

export interface UserStats {
  matchesPlayed: number;
  wins: number;
  losses?: number;
  cardsPlayed: number;
  totalWinnings: string;
  totalLosses?: string;
  chipsEarned?: number;
  chipsLost?: number;
}

export interface UserNotification {
  id: string;
  type: 'airdrop_claimed' | 'match_won' | 'friend_request' | 'system';
  title: string;
  message: string;
  txHash?: string;
  amount?: string;
  roomCode?: string;
  createdAt: number;
  read: boolean;
}

export interface UserProfileRecord {
  id: string;
  tag: string;
  name: string;
  avatar: string;
  bio: string;
  address?: string;
  status: 'online' | 'in_game' | 'offline';
  currentRoomCode?: string | null;
  lastSeen: number;
  createdAt: number;
  updatedAt: number;
  stats: UserStats;
  tokenBalance: number;
  friends: string[];
  friendRequestsSent: string[];
  friendRequestsReceived: string[];
  recentOpponents: { id: string; name: string; avatar: string; playedAt: number }[];
  notifications?: UserNotification[];
  hasClaimedAirdrop?: boolean;
}

export interface EnrichedFriend {
  id: string;
  tag: string;
  name: string;
  avatar: string;
  bio: string;
  status: 'online' | 'in_game' | 'offline';
  presence: 'online' | 'in_game' | 'offline';
  currentRoomCode?: string | null;
  address?: string;
  stats: UserStats;
  lastSeen: number;
}

export interface DatabaseSchema {
  users: Record<string, UserProfileRecord>;
  recentRooms: Record<
    string,
    {
      roomCode: string;
      hostName: string;
      hostAvatar: string;
      buyIn: string;
      createdAt: number;
      status: 'lobby' | 'playing' | 'game_over';
    }
  >;
}

export function isDefaultName(name?: string | null): boolean {
  if (!name || !name.trim()) return true;
  const n = name.trim();
  if (n === 'Player' || n === 'Anonymous Player' || n === 'Arcade Player') return true;
  if (/^Player[ _#]/i.test(n)) return true;
  if (/^HemiPlayer_/i.test(n)) return true;
  if (/^0x[a-fA-F0-9]{4}\.\.\.[a-fA-F0-9]{4}$/.test(n)) return true;
  return false;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'uno_db.json');

export class ServerDatabase {
  private data: DatabaseSchema = {
    users: {},
    recentRooms: {},
  };
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.seedDefaultUsers();
    this.initLocalDisk();
    this.initSupabaseSync();
  }

  private cleanDatabaseIntegrity(): void {
    const fixedUsers: Record<string, UserProfileRecord> = {};
    for (const [key, user] of Object.entries(this.data.users)) {
      if (key.startsWith('wallet_0x')) {
        const canonicalAddr = key.replace('wallet_', '').toLowerCase();
        user.id = key;
        user.address = canonicalAddr;
        fixedUsers[key] = user;
      } else {
        fixedUsers[key] = user;
      }
    }
    this.data.users = fixedUsers;
  }

  private initLocalDisk(): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          const rawUsers: Record<string, UserProfileRecord> = parsed.users || {};
          for (const [id, user] of Object.entries(rawUsers)) {
            if (!this.data.users[id]) {
              this.data.users[id] = user;
            } else {
              this.data.users[id] = { ...this.data.users[id], ...user };
            }
          }
          if (parsed.recentRooms) {
            this.data.recentRooms = { ...this.data.recentRooms, ...parsed.recentRooms };
          }
          this.cleanDatabaseIntegrity();
          console.log(`[Database:UNO] Loaded and verified ${Object.keys(this.data.users).length} profiles from local disk cache.`);
        }
      }
    } catch (err: any) {
      console.warn('[Database:UNO] Warning reading local disk cache:', err.message);
    }
  }

  private async initSupabaseSync(): Promise<void> {
    if (!isUnoSupabaseConfigured()) return;

    try {
      const remoteData = await loadInitialDataFromSupabase();
      if (!remoteData) return;

      let remoteLoaded = 0;
      for (const [id, remoteUser] of Object.entries(remoteData.users)) {
        const localUser = this.data.users[id];
        if (!localUser) {
          this.data.users[id] = remoteUser;
          remoteLoaded++;
        } else {
          // Merge remote stats with local
          if (remoteUser.updatedAt > localUser.updatedAt) {
            this.data.users[id] = {
              ...localUser,
              ...remoteUser,
              tokenBalance: typeof localUser.tokenBalance === 'number' ? localUser.tokenBalance : remoteUser.tokenBalance,
              notifications: localUser.notifications || remoteUser.notifications || [],
              stats: {
                matchesPlayed: Math.max(localUser.stats.matchesPlayed || 0, remoteUser.stats?.matchesPlayed || 0),
                wins: Math.max(localUser.stats.wins || 0, remoteUser.stats?.wins || 0),
                cardsPlayed: Math.max(localUser.stats.cardsPlayed || 0, remoteUser.stats?.cardsPlayed || 0),
                totalWinnings:
                  parseFloat(remoteUser.stats?.totalWinnings || '0') > parseFloat(localUser.stats?.totalWinnings || '0')
                    ? remoteUser.stats.totalWinnings
                    : localUser.stats.totalWinnings,
              },
              friends: Array.from(new Set([...(localUser.friends || []), ...(remoteUser.friends || [])])),
              friendRequestsSent: Array.from(new Set([...(localUser.friendRequestsSent || []), ...(remoteUser.friendRequestsSent || [])])),
              friendRequestsReceived: Array.from(new Set([...(localUser.friendRequestsReceived || []), ...(remoteUser.friendRequestsReceived || [])])),
            };
          }
        }
      }

      for (const [code, room] of Object.entries(remoteData.recentRooms)) {
        if (!this.data.recentRooms[code]) {
          this.data.recentRooms[code] = room;
        }
      }

      this.saveSync();
      console.log(`[Supabase:UNO] ✓ Synchronized with remote database (${remoteLoaded} new records).`);

      // Push default seed profiles to Supabase if not yet present
      for (const localUser of Object.values(this.data.users)) {
        if (!remoteData.users[localUser.id]) {
          syncProfileToSupabase(localUser);
        }
      }
    } catch (err: any) {
      console.warn('[Supabase:UNO] Initial sync warning:', err.message);
    }
  }

  public saveSync(): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[Database:UNO] Error saving database synchronously:', err.message);
    }
  }

  public save(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      this.saveSync();
    }, 500);
  }

  private seedDefaultUsers() {
    const defaultUsers = [
      { id: 'whale_1', name: 'ApexWhale', avatar: '💎', tag: 'ApexWhale#0001', chips: 185000, wins: 112, losses: 18, earned: '165000', lost: '15000', bio: 'Hemi High Roller #1' },
      { id: 'whale_2', name: 'ApeKing', avatar: '🦁', tag: 'ApeKing#0002', chips: 142500, wins: 88, losses: 21, earned: '128000', lost: '22000', bio: 'Crazy 8 Pot Collector' },
      { id: 'whale_3', name: 'SatoshiShark', avatar: '🦈', tag: 'SatoshiShark#0003', chips: 98000, wins: 64, losses: 16, earned: '85000', lost: '14000', bio: 'High Stakes Player' },
      { id: 'bot_host_stck', name: 'NeoDash', avatar: '🤖', tag: 'NeoDash#0004', chips: 67500, wins: 45, losses: 15, earned: '58000', lost: '12000', bio: 'Bot Buster & Card Shark' },
      { id: 'bot_host_team', name: 'FoxCardist', avatar: '🦊', tag: 'FoxCardist#0005', chips: 51200, wins: 39, losses: 19, earned: '44000', lost: '18000', bio: 'Fast Draw Specialist' },
      { id: 'bot_host_clsc', name: 'LumiBear', avatar: '🐻', tag: 'LumiBear#0006', chips: 38000, wins: 28, losses: 14, earned: '32000', lost: '11000', bio: 'Hybrid Resident Challenger' },
      { id: 'bot_host_fast', name: 'Tobz', avatar: '🐱', tag: 'Tobz#0007', chips: 26400, wins: 21, losses: 11, earned: '24000', lost: '8000', bio: 'Speed Player' },
      { id: 'whale_4', name: 'DragonAce', avatar: '🐉', tag: 'DragonAce#0008', chips: 19500, wins: 17, losses: 9, earned: '18000', lost: '7500', bio: 'Wild 8 Enthusiast' },
    ];

    for (const u of defaultUsers) {
      if (!this.data.users[u.id]) {
        this.data.users[u.id] = {
          id: u.id,
          tag: u.tag,
          name: u.name,
          avatar: u.avatar,
          bio: u.bio,
          status: 'online',
          lastSeen: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          stats: {
            matchesPlayed: u.wins + u.losses,
            wins: u.wins,
            losses: u.losses,
            cardsPlayed: (u.wins + u.losses) * 7,
            totalWinnings: u.earned,
            totalLosses: u.lost,
          },
          tokenBalance: u.chips,
          friends: [],
          friendRequestsSent: [],
          friendRequestsReceived: [],
          recentOpponents: [],
          notifications: [],
        };
      }
    }
  }

  public resolveUserRecord(idOrAddress: string): UserProfileRecord | null {
    if (!idOrAddress) return null;
    let user =
      this.data.users[idOrAddress] ||
      (idOrAddress.startsWith('0x') ? this.getUserByAddress(idOrAddress) : null) ||
      this.getUser(idOrAddress);

    if (!user) {
      if (idOrAddress.startsWith('0x')) {
        user = this.linkOrGetUserByAddress(idOrAddress);
      } else {
        user = this.getOrCreateUser(idOrAddress, {});
      }
    }
    if (user && typeof user.tokenBalance !== 'number') {
      user.tokenBalance = 10000;
    }
    return user;
  }

  public getUserTokenBalance(idOrAddress: string): number {
    const user = this.resolveUserRecord(idOrAddress);
    return user?.tokenBalance ?? 10000;
  }

  public debitUserTokenBalance(idOrAddress: string, amount: number): boolean {
    if (!idOrAddress || amount <= 0) return true;
    const user = this.resolveUserRecord(idOrAddress);
    if (!user) return false;
    if (user.tokenBalance < amount) return false;

    user.tokenBalance -= amount;
    user.updatedAt = Date.now();
    this.save();
    return true;
  }

  public creditUserTokenBalance(idOrAddress: string, amount: number): number {
    if (!idOrAddress || amount <= 0) return 0;
    const user = this.resolveUserRecord(idOrAddress);
    if (!user) return 0;

    user.tokenBalance += amount;
    user.updatedAt = Date.now();
    this.save();
    return user.tokenBalance;
  }

  public getUser(id: string): UserProfileRecord | null {
    if (!id) return null;
    if (this.data.users[id]) return this.data.users[id];
    if (id.startsWith('0x')) {
      return this.getUserByAddress(id);
    }
    const walletKey = `wallet_${id.toLowerCase()}`;
    if (this.data.users[walletKey]) return this.data.users[walletKey];
    return null;
  }

  public getUserByAddress(address: string): UserProfileRecord | null {
    if (!address) return null;
    const clean = address.trim().toLowerCase();
    const canonicalId = `wallet_${clean}`;
    if (this.data.users[canonicalId]) {
      const u = this.data.users[canonicalId];
      if (u.address?.toLowerCase() !== clean || u.id !== canonicalId) {
        u.address = clean;
        u.id = canonicalId;
      }
      return u;
    }
    for (const user of Object.values(this.data.users)) {
      if (user.address?.toLowerCase() === clean) {
        if (user.id !== canonicalId && !user.id.startsWith('wallet_')) {
          delete this.data.users[user.id];
          user.id = canonicalId;
          this.data.users[canonicalId] = user;
        }
        return user;
      }
    }
    return null;
  }

  public getUserByTagOrName(query: string): UserProfileRecord | null {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return null;

    for (const user of Object.values(this.data.users)) {
      if (user.tag.toLowerCase() === trimmed) return user;
    }
    if (this.data.users[query.trim()]) {
      return this.data.users[query.trim()];
    }
    for (const user of Object.values(this.data.users)) {
      if (user.name.toLowerCase() === trimmed) return user;
    }
    for (const user of Object.values(this.data.users)) {
      if (user.name.toLowerCase().includes(trimmed) || user.tag.toLowerCase().includes(trimmed)) {
        return user;
      }
    }
    return null;
  }

  public linkOrGetUserByAddress(
    address: string,
    fallbackId?: string,
    fallbackData?: { name?: string; avatar?: string; bio?: string }
  ): UserProfileRecord {
    if (!address) {
      const id = fallbackId || `acc_${Date.now()}`;
      return this.getOrCreateUser(id, fallbackData || {});
    }

    const cleanAddress = address.trim().toLowerCase();
    const canonicalId = `wallet_${cleanAddress}`;

    const existing = this.getUserByAddress(cleanAddress);
    if (existing) {
      existing.lastSeen = Date.now();
      if (existing.id !== canonicalId) {
        if (!existing.id.startsWith('wallet_')) {
          delete this.data.users[existing.id];
        }
        existing.id = canonicalId;
        existing.address = cleanAddress;
        this.data.users[canonicalId] = existing;
      }
      // If custom non-default name provided and existing name is default, update
      if (fallbackData?.name && !isDefaultName(fallbackData.name) && isDefaultName(existing.name)) {
        existing.name = fallbackData.name.trim();
        const parts = existing.tag.split('#');
        const disc = parts[1] || Math.floor(1000 + Math.random() * 9000).toString();
        const cleanName = existing.name.replace(/[^a-zA-Z0-9]/g, '').trim() || 'Player';
        existing.tag = `${cleanName}#${disc}`;
      }
      syncProfileToSupabase(existing);
      this.save();
      return existing;
    }

    // Only inherit fallbackUser if it was an unlinked guest account (NEVER another wallet account!)
    const isGuestFallback = Boolean(fallbackId && !fallbackId.startsWith('wallet_') && !fallbackId.startsWith('0x'));
    const fallbackUser = isGuestFallback ? this.data.users[fallbackId!] : null;

    let defaultName = `${cleanAddress.slice(0, 6)}...${cleanAddress.slice(-4)}`;
    if (fallbackData?.name && !isDefaultName(fallbackData.name)) {
      defaultName = fallbackData.name.trim();
    } else if (fallbackUser?.name && !isDefaultName(fallbackUser.name)) {
      defaultName = fallbackUser.name.trim();
    }

    const cleanName = defaultName.replace(/[^a-zA-Z0-9]/g, '').trim() || 'Player';
    const tag = `${cleanName}#${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser: UserProfileRecord = {
      id: canonicalId,
      tag,
      name: defaultName,
      avatar: fallbackUser?.avatar || fallbackData?.avatar || '🦊',
      bio: fallbackUser?.bio || fallbackData?.bio || 'Hemi Testnet Card Champion',
      address: cleanAddress,
      status: 'online',
      currentRoomCode: null,
      lastSeen: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: fallbackUser?.stats || {
        matchesPlayed: 0,
        wins: 0,
        cardsPlayed: 0,
        totalWinnings: '0.000',
      },
      tokenBalance: fallbackUser?.tokenBalance ?? 10000,
      friends: fallbackUser?.friends || [],
      friendRequestsSent: fallbackUser?.friendRequestsSent || [],
      friendRequestsReceived: fallbackUser?.friendRequestsReceived || [],
      recentOpponents: fallbackUser?.recentOpponents || [],
      notifications: [],
    };

    // ONLY delete temporary guest account
    if (isGuestFallback && fallbackId && this.data.users[fallbackId]) {
      delete this.data.users[fallbackId];
    }

    this.data.users[canonicalId] = newUser;
    syncProfileToSupabase(newUser);
    this.save();
    return newUser;
  }

  public getOrCreateUser(
    id: string,
    initial: { name?: string; avatar?: string; address?: string; bio?: string }
  ): UserProfileRecord {
    if (initial.address) {
      return this.linkOrGetUserByAddress(initial.address, id, initial);
    }

    if (this.data.users[id]) {
      const user = this.data.users[id];
      if (initial.name && !user.name) user.name = initial.name;
      if (initial.avatar && !user.avatar) user.avatar = initial.avatar;
      if (initial.bio && !user.bio) user.bio = initial.bio;
      if (typeof user.tokenBalance !== 'number') user.tokenBalance = 10000;
      user.lastSeen = Date.now();
      return user;
    }

    const name = initial.name || 'Player';
    const tag = `${name}#${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser: UserProfileRecord = {
      id,
      tag,
      name,
      avatar: initial.avatar || '🦊',
      bio: initial.bio || 'Ready to play Crazy Eights on Hemi!',
      address: undefined,
      status: 'online',
      currentRoomCode: null,
      lastSeen: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: {
        matchesPlayed: 0,
        wins: 0,
        cardsPlayed: 0,
        totalWinnings: '0.000',
      },
      tokenBalance: 10000,
      friends: [],
      friendRequestsSent: [],
      friendRequestsReceived: [],
      recentOpponents: [],
      notifications: [],
    };

    this.data.users[id] = newUser;
    syncProfileToSupabase(newUser);
    this.save();
    return newUser;
  }

  public updateUserProfile(
    id: string,
    updates: { name?: string; avatar?: string; bio?: string; address?: string }
  ): UserProfileRecord {
    let user: UserProfileRecord | null = null;
    const cleanAddr = updates.address && updates.address.trim().startsWith('0x')
      ? updates.address.trim().toLowerCase()
      : undefined;

    if (cleanAddr) {
      user = this.getUserByAddress(cleanAddr) || this.linkOrGetUserByAddress(cleanAddr, id, updates);
    } else if (id) {
      user = this.getUser(id);
    }

    if (!user) {
      user = this.getOrCreateUser(id || `acc_${Date.now()}`, updates);
    }

    if (updates.name && updates.name.trim() && updates.name.trim() !== user.name) {
      user.name = updates.name.trim();
      const parts = user.tag.split('#');
      const disc = parts[1] || Math.floor(1000 + Math.random() * 9000).toString();
      const cleanName = user.name.replace(/[^a-zA-Z0-9]/g, '').trim() || 'Player';
      user.tag = `${cleanName}#${disc}`;
    }

    if (updates.avatar) user.avatar = updates.avatar;
    if (updates.bio !== undefined) user.bio = updates.bio.trim().substring(0, 120);

    if (cleanAddr) {
      user.address = cleanAddr;
      const canonicalId = `wallet_${cleanAddr}`;
      if (user.id !== canonicalId) {
        if (!user.id.startsWith('wallet_')) {
          delete this.data.users[user.id];
        }
        user.id = canonicalId;
        this.data.users[canonicalId] = user;
      }
    }

    user.updatedAt = Date.now();
    user.lastSeen = Date.now();
    syncProfileToSupabase(user);
    this.save();
    return user;
  }

  public setUserPresence(id: string, status: 'online' | 'in_game' | 'offline', roomCode?: string | null): void {
    const user = this.data.users[id] || (id.startsWith('0x') ? this.getUserByAddress(id) : null);
    if (!user) return;
    user.status = status;
    user.currentRoomCode = roomCode !== undefined ? roomCode : user.currentRoomCode;
    user.lastSeen = Date.now();
    syncPresenceToSupabase(user.id, status, user.currentRoomCode);
  }

  public touchUserPresence(id: string, roomCode?: string | null): void {
    const user = this.data.users[id] || (id.startsWith('0x') ? this.getUserByAddress(id) : null);
    if (!user) return;
    user.lastSeen = Date.now();
    if (roomCode) {
      user.status = 'in_game';
      user.currentRoomCode = roomCode;
    } else if (user.status === 'offline') {
      user.status = 'online';
    }
    syncPresenceToSupabase(user.id, user.status, user.currentRoomCode);
  }

  public getEnrichedFriends(userId: string): EnrichedFriend[] {
    const user = this.data.users[userId];
    if (!user) return [];

    const enriched: EnrichedFriend[] = [];
    for (const fId of user.friends) {
      const f = this.data.users[fId];
      if (f) {
        const isRecentlyActive = Date.now() - f.lastSeen < 15 * 60 * 1000;
        const currentStatus = isRecentlyActive ? f.status : 'offline';

        enriched.push({
          id: f.id,
          tag: f.tag,
          name: f.name,
          avatar: f.avatar,
          bio: f.bio,
          status: currentStatus,
          presence: currentStatus,
          currentRoomCode: isRecentlyActive ? f.currentRoomCode : null,
          address: f.address,
          stats: f.stats,
          lastSeen: f.lastSeen,
        });
      }
    }

    return enriched.sort((a, b) => {
      const order = { in_game: 0, online: 1, offline: 2 };
      return order[a.status] - order[b.status];
    });
  }

  public sendFriendRequest(fromUserId: string, targetQuery: string): { success: boolean; error?: string; friend?: UserProfileRecord } {
    const fromUser = this.data.users[fromUserId];
    if (!fromUser) return { success: false, error: 'Sender profile not found' };

    const targetUser = this.getUserByTagOrName(targetQuery);
    if (!targetUser) return { success: false, error: `Could not find player with tag or name "${targetQuery}"` };

    if (targetUser.id === fromUserId) {
      return { success: false, error: 'You cannot add yourself as a friend' };
    }
    if (fromUser.friends.includes(targetUser.id)) {
      return { success: false, error: `${targetUser.name} is already your friend` };
    }
    if (fromUser.friendRequestsSent.includes(targetUser.id)) {
      return { success: false, error: 'Friend request already sent' };
    }
    if (fromUser.friendRequestsReceived.includes(targetUser.id)) {
      return this.acceptFriendRequest(fromUserId, targetUser.id);
    }

    fromUser.friendRequestsSent.push(targetUser.id);
    if (!targetUser.friendRequestsReceived.includes(fromUserId)) {
      targetUser.friendRequestsReceived.push(fromUserId);
    }
    syncFriendRequestToSupabase(fromUserId, targetUser.id, 'pending');
    this.save();
    return { success: true, friend: targetUser };
  }

  public acceptFriendRequest(userId: string, requesterId: string): { success: boolean; error?: string; friend?: UserProfileRecord } {
    const user = this.data.users[userId];
    const requester = this.data.users[requesterId];

    if (!user || !requester) {
      return { success: false, error: 'User record not found' };
    }

    user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id !== requesterId);
    requester.friendRequestsSent = requester.friendRequestsSent.filter(id => id !== userId);

    if (!user.friends.includes(requesterId)) user.friends.push(requesterId);
    if (!requester.friends.includes(userId)) requester.friends.push(userId);

    syncFriendRelationshipToSupabase(userId, requesterId);
    removeFriendRequestFromSupabase(requesterId, userId);
    this.save();
    return { success: true, friend: requester };
  }

  public declineFriendRequest(userId: string, requesterId: string): { success: boolean } {
    const user = this.data.users[userId];
    const requester = this.data.users[requesterId];

    if (user) user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id !== requesterId);
    if (requester) requester.friendRequestsSent = requester.friendRequestsSent.filter(id => id !== userId);

    removeFriendRequestFromSupabase(requesterId, userId);
    this.save();
    return { success: true };
  }

  public removeFriend(userId: string, friendId: string): { success: boolean } {
    const user = this.data.users[userId];
    const friend = this.data.users[friendId];

    if (user) user.friends = user.friends.filter(id => id !== friendId);
    if (friend) friend.friends = friend.friends.filter(id => id !== userId);

    removeFriendRelationshipFromSupabase(userId, friendId);
    this.save();
    return { success: true };
  }

  public recordGameFinished(
    winnerId: string,
    playerIds: string[],
    potAmount: string,
    cardsPlayedMap?: Record<string, number>,
    roomCode?: string
  ): void {
    const potNum = parseFloat(potAmount) || 0;
    const cardsMap = cardsPlayedMap || {};

    for (const pid of playerIds) {
      const user = this.data.users[pid] || (pid.startsWith('0x') ? this.getUserByAddress(pid) : null);
      if (!user) continue;

      user.stats.matchesPlayed += 1;
      user.stats.cardsPlayed += (cardsMap[pid] || 0);

      if (pid === winnerId) {
        user.stats.wins += 1;
        const currentWon = parseFloat(user.stats.totalWinnings || '0') || 0;
        user.stats.totalWinnings = (currentWon + potNum).toFixed(0);
      } else {
        user.stats.losses = (user.stats.losses || 0) + 1;
        const currentLost = parseFloat(user.stats.totalLosses || '0') || 0;
        const approxLoss = playerIds.length > 0 ? Math.round(potNum / playerIds.length) : 100;
        user.stats.totalLosses = (currentLost + approxLoss).toFixed(0);
      }

      const otherPlayers = playerIds
        .filter(id => id !== pid)
        .map(id => this.data.users[id])
        .filter(Boolean) as UserProfileRecord[];

      for (const opp of otherPlayers) {
        if (!user.recentOpponents.some(r => r.id === opp.id)) {
          user.recentOpponents.unshift({
            id: opp.id,
            name: opp.name,
            avatar: opp.avatar,
            playedAt: Date.now(),
          });
        }
      }
      user.recentOpponents = user.recentOpponents.slice(0, 10);
      syncProfileToSupabase(user);
      syncRecentOpponentsToSupabase(user.id, otherPlayers.map(o => o.id));
    }

    if (roomCode) {
      syncMatchHistoryToSupabase(roomCode, winnerId, playerIds, potAmount, cardsMap);
    }
    this.save();
  }

  public getSuggestedPlayers(excludeUserId: string): UserProfileRecord[] {
    const all = Object.values(this.data.users);
    const excludeUser = this.data.users[excludeUserId];
    const friendsSet = new Set(excludeUser ? excludeUser.friends : []);
    friendsSet.add(excludeUserId);

    return all
      .filter(u => !friendsSet.has(u.id))
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 6);
  }

  public getLeaderboard(limit = 10, sortBy: 'chips' | 'wins' = 'chips'): UserProfileRecord[] {
    return Object.values(this.data.users)
      .sort((a, b) => {
        if (sortBy === 'wins') {
          return (b.stats?.wins || 0) - (a.stats?.wins || 0) || (b.tokenBalance || 0) - (a.tokenBalance || 0);
        }
        const aChips = typeof a.tokenBalance === 'number' ? a.tokenBalance : 10000;
        const bChips = typeof b.tokenBalance === 'number' ? b.tokenBalance : 10000;
        return bChips - aChips || (b.stats?.wins || 0) - (a.stats?.wins || 0);
      })
      .slice(0, limit);
  }

  public saveRecentRoom(roomCode: string, info: { hostName: string; hostAvatar: string; buyIn: string; status: 'lobby' | 'playing' | 'game_over' }): void {
    this.data.recentRooms[roomCode] = {
      roomCode,
      hostName: info.hostName,
      hostAvatar: info.hostAvatar,
      buyIn: info.buyIn,
      createdAt: Date.now(),
      status: info.status,
    };
    syncRecentRoomToSupabase(roomCode, info);
    this.save();
  }

  public addNotification(
    userId: string,
    notification: Omit<UserNotification, 'id' | 'createdAt' | 'read'> & { id?: string; createdAt?: number; read?: boolean }
  ): UserNotification | null {
    let user = this.data.users[userId];
    if (!user) {
      if (userId.startsWith('0x')) {
        user = this.getUserByAddress(userId) || this.linkOrGetUserByAddress(userId, `wallet_${userId.toLowerCase()}`);
      } else {
        user = this.getOrCreateUser(userId, { name: 'Player' });
      }
    }

    if (!user.notifications) {
      user.notifications = [];
    }

    const newNotif: UserNotification = {
      id: notification.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      txHash: notification.txHash,
      amount: notification.amount,
      roomCode: notification.roomCode,
      createdAt: notification.createdAt || Date.now(),
      read: notification.read ?? false,
    };

    user.notifications.unshift(newNotif);
    user.notifications = user.notifications.slice(0, 20);
    this.save();
    return newNotif;
  }

  public upsertUser(user: Partial<UserProfileRecord> & { id: string }): UserProfileRecord {
    const cleanAddr = user.address && user.address.trim().startsWith('0x')
      ? user.address.trim().toLowerCase()
      : undefined;
    const canonicalId = cleanAddr ? `wallet_${cleanAddr}` : user.id;

    const existing = this.data.users[canonicalId] || (cleanAddr ? this.getUserByAddress(cleanAddr) : this.data.users[user.id]);

    const updatedName = user.name && !isDefaultName(user.name)
      ? user.name.trim()
      : (existing?.name || user.name || (cleanAddr ? `${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)}` : 'Anonymous Player'));

    const cleanName = updatedName.replace(/[^a-zA-Z0-9]/g, '').trim() || 'Player';
    const tag = user.tag || existing?.tag || `${cleanName}#${Math.floor(1000 + Math.random() * 9000)}`;

    const updated: UserProfileRecord = {
      id: canonicalId,
      tag,
      name: updatedName,
      avatar: user.avatar || existing?.avatar || '🎮',
      bio: user.bio || existing?.bio || 'Web3 gamer on Hemi',
      address: cleanAddr || existing?.address,
      status: user.status || existing?.status || 'online',
      currentRoomCode: user.currentRoomCode !== undefined ? user.currentRoomCode : existing?.currentRoomCode,
      lastSeen: Date.now(),
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
      stats: user.stats || existing?.stats || { matchesPlayed: 0, wins: 0, cardsPlayed: 0, totalWinnings: '0' },
      tokenBalance: user.tokenBalance !== undefined ? user.tokenBalance : (existing?.tokenBalance || 10000),
      friends: user.friends || existing?.friends || [],
      friendRequestsSent: user.friendRequestsSent || existing?.friendRequestsSent || [],
      friendRequestsReceived: user.friendRequestsReceived || existing?.friendRequestsReceived || [],
      recentOpponents: user.recentOpponents || existing?.recentOpponents || [],
      notifications: user.notifications || existing?.notifications || [],
      hasClaimedAirdrop: user.hasClaimedAirdrop !== undefined ? user.hasClaimedAirdrop : (existing?.hasClaimedAirdrop || false),
    };

    if (user.id !== canonicalId && !user.id.startsWith('wallet_') && this.data.users[user.id]) {
      delete this.data.users[user.id];
    }

    this.data.users[canonicalId] = updated;
    syncProfileToSupabase(updated);
    this.save();
    return updated;
  }

  public getAllUsers(): UserProfileRecord[] {
    return Object.values(this.data.users);
  }
}

export const serverDb = new ServerDatabase();
