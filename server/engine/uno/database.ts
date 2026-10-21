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

export class ServerDatabase {
  private data: DatabaseSchema = {
    users: {},
    recentRooms: {},
  };

  constructor() {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers() {
    const defaultUsers = [
      { id: 'whale_1', name: 'ApexWhale', avatar: '💎', tag: 'ApexWhale#0001', chips: 185000, wins: 112, losses: 18, earned: '165000', lost: '15000', bio: 'Hemi High Roller #1' },
      { id: 'whale_2', name: 'ApeKing', avatar: '🦁', tag: 'ApeKing#0002', chips: 142500, wins: 88, losses: 21, earned: '128000', lost: '22000', bio: 'Crazy 8 Pot Collector' },
      { id: 'whale_3', name: 'SatoshiShark', avatar: '🦈', tag: 'SatoshiShark#0003', chips: 98000, wins: 64, losses: 16, earned: '85000', lost: '14000', bio: 'High Stakes Player' },
      { id: 'bot_host_stck', name: 'NeoDash', avatar: '🤖', tag: 'NeoDash#0004', chips: 67500, wins: 45, losses: 15, earned: '58000', lost: '12000', bio: 'Bot Buster & Card Shark' },
      { id: 'bot_host_team', name: 'FoxCardist', avatar: '🦊', tag: 'FoxCardist#0005', chips: 51200, wins: 39, losses: 19, earned: '44000', lost: '18000', bio: 'Fast Draw Specialist' },
      { id: 'bot_host_clsc', name: 'LumiBear', avatar: '🐻', tag: 'LumiBear#0006', chips: 38000, wins: 28, losses: 14, earned: '32000', lost: '11000', bio: 'Hemi Arcade Resident Challenger' },
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
    return true;
  }

  public creditUserTokenBalance(idOrAddress: string, amount: number): number {
    if (!idOrAddress || amount <= 0) return 0;
    const user = this.resolveUserRecord(idOrAddress);
    if (!user) return 0;

    user.tokenBalance += amount;
    user.updatedAt = Date.now();
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
    const clean = address.toLowerCase();
    const canonicalId = `wallet_${clean}`;
    if (this.data.users[canonicalId]) {
      return this.data.users[canonicalId];
    }
    for (const user of Object.values(this.data.users)) {
      if (user.address?.toLowerCase() === clean) return user;
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
        delete this.data.users[existing.id];
        existing.id = canonicalId;
        existing.address = cleanAddress;
        this.data.users[canonicalId] = existing;
      }
      return existing;
    }

    const fallbackUser = fallbackId ? this.data.users[fallbackId] : null;
    const defaultName = fallbackUser?.name || fallbackData?.name || `Player_${cleanAddress.slice(2, 6)}`;
    const tag = fallbackUser?.tag || `${defaultName}#${Math.floor(1000 + Math.random() * 9000)}`;

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

    if (fallbackId && fallbackId !== canonicalId && this.data.users[fallbackId]) {
      delete this.data.users[fallbackId];
    }

    this.data.users[canonicalId] = newUser;
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
    return newUser;
  }

  public updateUserProfile(
    id: string,
    updates: { name?: string; avatar?: string; bio?: string; address?: string }
  ): UserProfileRecord {
    let user: UserProfileRecord | null = null;
    if (updates.address) {
      user = this.linkOrGetUserByAddress(updates.address, id, updates);
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

    if (updates.address) {
      const cleanAddr = updates.address.trim().toLowerCase();
      user.address = cleanAddr;
      const canonicalId = `wallet_${cleanAddr}`;
      if (user.id !== canonicalId) {
        delete this.data.users[user.id];
        user.id = canonicalId;
        this.data.users[canonicalId] = user;
      }
    }

    user.updatedAt = Date.now();
    user.lastSeen = Date.now();
    return user;
  }

  public setUserPresence(id: string, status: 'online' | 'in_game' | 'offline', roomCode?: string | null): void {
    const user = this.data.users[id] || (id.startsWith('0x') ? this.getUserByAddress(id) : null);
    if (!user) return;
    user.status = status;
    user.currentRoomCode = roomCode !== undefined ? roomCode : user.currentRoomCode;
    user.lastSeen = Date.now();
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

    return { success: true, friend: requester };
  }

  public declineFriendRequest(userId: string, requesterId: string): { success: boolean } {
    const user = this.data.users[userId];
    const requester = this.data.users[requesterId];

    if (user) user.friendRequestsReceived = user.friendRequestsReceived.filter(id => id !== requesterId);
    if (requester) requester.friendRequestsSent = requester.friendRequestsSent.filter(id => id !== userId);
    return { success: true };
  }

  public removeFriend(userId: string, friendId: string): { success: boolean } {
    const user = this.data.users[userId];
    const friend = this.data.users[friendId];

    if (user) user.friends = user.friends.filter(id => id !== friendId);
    if (friend) friend.friends = friend.friends.filter(id => id !== userId);
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
    }
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
        // Default sort by Chip Wealth (Richest players topping the ranks)
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
    return newNotif;
  }

  public upsertUser(user: Partial<UserProfileRecord> & { id: string }): UserProfileRecord {
    const existing = this.data.users[user.id];
    const updated: UserProfileRecord = {
      id: user.id,
      tag: user.tag || existing?.tag || `Player#${Math.floor(1000 + Math.random() * 9000)}`,
      name: user.name || existing?.name || 'Anonymous Player',
      avatar: user.avatar || existing?.avatar || '🎮',
      bio: user.bio || existing?.bio || 'Web3 gamer on Hemi',
      address: user.address || existing?.address,
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

    this.data.users[user.id] = updated;
    return updated;
  }

  public getAllUsers(): UserProfileRecord[] {
    return Object.values(this.data.users);
  }
}

export const serverDb = new ServerDatabase();
