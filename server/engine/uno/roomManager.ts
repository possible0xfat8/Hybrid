import { Server as SocketIOServer } from 'socket.io';
import { GameRoom } from './gameEngine';
import { CardColor, CardsDrawnEvent, CardPlayedEvent, ChatMessage, PublicRoomSummary, Player } from '../../../src/types/uno';
import { serverDb } from './database';
import { settleMatchOnChain, getEscrowAddress } from '../../services/uno/escrowService';

export class RoomManager {
  private io: SocketIOServer;
  private rooms: Map<string, GameRoom> = new Map(); // roomId -> GameRoom
  private codeToRoomId: Map<string, string> = new Map(); // code -> roomId
  private socketToRoomId: Map<string, string> = new Map(); // socketId -> roomId
  private socketToAccountId: Map<string, string> = new Map(); // socketId -> accountId
  private accountToRoomId: Map<string, string> = new Map(); // accountId -> roomId
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map(); // accountId -> Timeout

  constructor(io: SocketIOServer) {
    this.io = io;
    this.seedPublicTables();
  }

  private publicTemplates = [
    { name: 'Classic', mode: 'Classic', desc: 'The original. 2-4 players.', hostName: 'LumiBear', hostAvatar: '🐻', code: 'CLSC', botCount: 2 },
    { name: 'Stacked Draw', mode: 'Stacked Draw', desc: 'Stack it. Survive it.', hostName: 'NeoDash', hostAvatar: '🤖', code: 'STCK', botCount: 1 },
    { name: '2v2 Team', mode: '2v2 Team', desc: 'Team up. Take over.', hostName: 'Zyro', hostAvatar: '🦊', code: 'TEAM', botCount: 2 },
    { name: 'Speed 8', mode: 'Speed 8', desc: 'Fast rounds, less waiting.', hostName: 'Tobz', hostAvatar: '🐱', code: 'FAST', botCount: 1 },
  ];

  public seedPublicTables(): void {
    if (this.rooms.size > 0) return;

    for (const t of this.publicTemplates) {
      const roomId = `room_pub_${t.code.toLowerCase()}`;
      const hostId = `host_${t.code.toLowerCase()}`;
      const room = new GameRoom(roomId, t.code, hostId);
      room.buyInAmount = '0.000';
      room.customMode = t.mode;
      room.description = t.desc;
      room.isSeededPublic = true;
      room.isQuickMatch = false;

      room.setCallbacks(
        () => this.broadcastRoomState(room),
        (sound: string) => this.io.to(room.roomId).emit('game:sound', { soundName: sound }),
        (intensity: number) => this.io.to(room.roomId).emit('game:shake', { intensity }),
        (data: CardsDrawnEvent) => this.io.to(room.roomId).emit('game:cards_drawn', data),
        (data: CardPlayedEvent) => this.io.to(room.roomId).emit('game:card_played', data),
        (msg: ChatMessage) => this.io.to(room.roomId).emit('chat:message', msg),
        (winner: Player, players: Player[], pot: string, cardsPlayedMap: Record<string, number>) => {
          this.handleGameOverSettlement(room, winner, players, pot, cardsPlayedMap);
        }
      );

      // Add Initial Bot Host (will be automatically transferred to the first real human who joins!)
      room.addPlayer({
        id: hostId,
        socketId: `bot_host_${t.code.toLowerCase()}`,
        name: t.hostName,
        avatar: t.hostAvatar,
        isHost: true,
        isBot: true,
        isConnected: true,
      });

      // Add initial bots
      for (let i = 0; i < t.botCount; i++) {
        room.addBot();
      }

      this.rooms.set(roomId, room);
      this.codeToRoomId.set(t.code, roomId);
    }
  }

  private handleGameOverSettlement(
    room: GameRoom,
    winner: Player,
    players: Player[],
    pot: string,
    cardsPlayedMap: Record<string, number>
  ): void {
    serverDb.recordGameFinished(
      winner.id,
      players.filter(p => !p.isBot).map(p => p.id),
      pot,
      cardsPlayedMap,
      room.roomCode
    );

    const potNum = room.getPotAmount() || parseFloat(pot) || 0;
    if (winner && potNum > 0 && room.isStaking) {
      const payout = Math.round(potNum * 0.95);
      const targetId = winner.address || winner.id;
      serverDb.creditUserTokenBalance(targetId, payout);
      const newBal = serverDb.getUserTokenBalance(targetId);

      if (winner.address) {
        this.io.to(`wallet:${winner.address.toLowerCase()}`).emit('token:balance_updated', {
          address: winner.address,
          balance: newBal.toString(),
          credited: payout,
          reason: `Won pot of ${payout} $CRAZY8 in Room #${room.roomCode}`,
        });
      }
      if (winner.socketId) {
        this.io.to(winner.socketId).emit('token:balance_updated', {
          address: winner.address,
          balance: newBal.toString(),
          credited: payout,
          reason: `Won pot of ${payout} $CRAZY8 in Room #${room.roomCode}`,
        });
      }
      room.clearStakes();
    }

    // If winner has an on-chain address, settle on Hemi Sepolia
    if (winner && winner.address && winner.address.startsWith('0x')) {
      settleMatchOnChain(room.roomCode, winner.address, potNum)
        .then(settleRes => {
          if (settleRes.success) {
            if (settleRes.txHash) {
              room.settlementSignature = {
                roomId: room.roomId,
                winnerAddress: winner.address!,
                potAmount: pot,
                nonce: Date.now(),
                timestamp: Date.now(),
                signature: settleRes.txHash,
                contractAddress: getEscrowAddress() || process.env.CRAZY8_TOKEN_ADDRESS || '0x19B111602A60442CCbe947a58a5fd7CB0195324E',
                network: 'Hemi Sepolia (Chain ID 743111)',
              };
              this.broadcastRoomState(room);
            }

            // Emit live settlement event to room
            this.io.to(room.roomId).emit('game:settlement', {
              roomCode: room.roomCode,
              winnerAddress: winner.address,
              txHash: settleRes.txHash,
              payout: settleRes.winnerPayout,
              fee: settleRes.boardFee,
            });

            // Store notification in winner's profile
            serverDb.addNotification(winner.id, {
              type: 'match_won',
              title: `🏆 Pot Won: ${pot} $CRAZY8!`,
              message: `Victory in Room #${room.roomCode}! 95% payout (${settleRes.winnerPayout || pot} CRAZY8) credited to your Hemi wallet.`,
              txHash: settleRes.txHash,
              amount: pot,
              roomCode: room.roomCode,
            });
          }
        })
        .catch(err => {
          console.warn(`[RoomManager] Settlement error for ${room.roomCode}:`, err);
        });
    }
  }

  private reseedPublicRoom(room: GameRoom): void {
    const template = this.publicTemplates.find(t => t.code === room.roomCode);
    if (!template) {
      this.destroyRoom(room.roomId);
      return;
    }

    room.status = 'lobby';
    room.players = [];
    room.spectators.clear();
    const hostId = `host_${template.code.toLowerCase()}`;
    room.hostId = hostId;

    room.addPlayer({
      id: hostId,
      socketId: `bot_host_${template.code.toLowerCase()}`,
      name: template.hostName,
      avatar: template.hostAvatar,
      isHost: true,
      isBot: true,
      isConnected: true,
    });

    for (let i = 0; i < template.botCount; i++) {
      room.addBot();
    }

    this.broadcastRoomState(room);
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return this.codeToRoomId.has(code) ? this.generateRoomCode() : code;
  }

  private clearDisconnectTimer(accountId: string): void {
    const timer = this.disconnectTimers.get(accountId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(accountId);
    }
  }

  public createRoom(
    accountId: string,
    hostSocketId: string,
    playerName: string,
    avatar: string,
    buyIn: string = '100',
    address?: string
  ): GameRoom {
    this.clearDisconnectTimer(accountId);

    // If account was in another room, leave it
    const existingRoomId = this.accountToRoomId.get(accountId);
    if (existingRoomId) {
      this.handleLeaveRoom(accountId, hostSocketId);
    }

    const cleanAddr = address && address.startsWith('0x') ? address.trim().toLowerCase() : undefined;
    if (!cleanAddr) {
      throw new Error('Wallet connection required to create a game room');
    }

    const dbUser = serverDb.getUserByAddress(cleanAddr) || serverDb.linkOrGetUserByAddress(cleanAddr, accountId, { name: playerName, avatar });
    const resolvedName = dbUser.name || playerName || 'Player 1';
    const resolvedAvatar = dbUser.avatar || avatar || '🦊';
    const canonicalAccountId = dbUser.id;

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const roomCode = this.generateRoomCode();

    const room = new GameRoom(roomId, roomCode, canonicalAccountId);
    const parsedBuyIn = buyIn !== undefined ? buyIn : '100';
    room.buyInAmount = parsedBuyIn;
    room.isStaking = parsedBuyIn !== '0' && parseFloat(parsedBuyIn) > 0;

    // Handle token staking debit for the host starting the lobby
    if (room.isStaking) {
      const buyInNum = parseFloat(parsedBuyIn);
      const hostBal = serverDb.getUserTokenBalance(cleanAddr || canonicalAccountId);
      if (hostBal < buyInNum) {
        throw new Error(`Insufficient $CRAZY8 tokens. You have ${hostBal} chips, but creating this staking table requires a stake of ${buyInNum} chips.`);
      }
      const debited = serverDb.debitUserTokenBalance(cleanAddr || canonicalAccountId, buyInNum);
      if (!debited) {
        throw new Error(`Failed to debit stake of ${buyInNum} $CRAZY8 chips. Please verify your balance.`);
      }
      room.recordStake(canonicalAccountId, buyInNum);
      const newBal = serverDb.getUserTokenBalance(cleanAddr || canonicalAccountId);
      this.io.to(`wallet:${cleanAddr}`).emit('token:balance_updated', {
        address: cleanAddr,
        balance: newBal.toString(),
        debited: buyInNum,
        reason: `Staked ${buyInNum} $CRAZY8 to create Room #${roomCode}`,
      });
      this.io.to(hostSocketId).emit('token:balance_updated', {
        address: cleanAddr,
        balance: newBal.toString(),
        debited: buyInNum,
        reason: `Staked ${buyInNum} $CRAZY8 to create Room #${roomCode}`,
      });
    }

    room.setCallbacks(
      () => this.broadcastRoomState(room),
      (sound: string) => this.io.to(room.roomId).emit('game:sound', { soundName: sound }),
      (intensity: number) => this.io.to(room.roomId).emit('game:shake', { intensity }),
      (data: CardsDrawnEvent) => this.io.to(room.roomId).emit('game:cards_drawn', data),
      (data: CardPlayedEvent) => this.io.to(room.roomId).emit('game:card_played', data),
      (msg: ChatMessage) => this.io.to(room.roomId).emit('chat:message', msg),
      (winner: Player, players: Player[], pot: string, cardsPlayedMap: Record<string, number>) => {
        this.handleGameOverSettlement(room, winner, players, pot, cardsPlayedMap);
      }
    );

    room.addPlayer({
      id: canonicalAccountId,
      socketId: hostSocketId,
      name: resolvedName,
      avatar: resolvedAvatar,
      isHost: true,
      isConnected: true,
      address: cleanAddr,
    });

    this.rooms.set(roomId, room);
    this.codeToRoomId.set(roomCode, roomId);
    this.socketToRoomId.set(hostSocketId, roomId);
    this.socketToAccountId.set(hostSocketId, canonicalAccountId);
    this.accountToRoomId.set(canonicalAccountId, roomId);

    // Persist user and room state
    serverDb.setUserPresence(canonicalAccountId, 'in_game', roomCode);
    serverDb.saveRecentRoom(roomCode, {
      hostName: resolvedName,
      hostAvatar: resolvedAvatar,
      buyIn: room.buyInAmount,
      status: 'lobby',
    });

    this.io.emit('rooms:public_list', this.getPublicRooms());
    return room;
  }

  public getRoomByCode(code: string): GameRoom | null {
    if (!code) return null;
    const roomId = this.codeToRoomId.get(code.toUpperCase().trim());
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  public getRoomBySocket(socketId: string): GameRoom | null {
    const roomId = this.socketToRoomId.get(socketId);
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  public getRoomByAccountId(accountId: string): GameRoom | null {
    const roomId = this.accountToRoomId.get(accountId);
    if (!roomId) return null;
    return this.rooms.get(roomId) || null;
  }

  public getAccountIdBySocket(socketId: string): string | null {
    return this.socketToAccountId.get(socketId) || null;
  }

  public joinRoom(
    roomCode: string,
    accountId: string,
    socketId: string,
    playerName: string,
    avatar: string,
    address?: string
  ): { success: boolean; room?: GameRoom; error?: string; reconnected?: boolean; playerId?: string } {
    const room = this.getRoomByCode(roomCode);
    if (!room) {
      return { success: false, error: `Room "${roomCode.toUpperCase()}" not found` };
    }

    this.clearDisconnectTimer(accountId);

    // Check if player is already seated in this room (by accountId, wallet address, canonicalId, or socket)
    const cleanAddrPre = address && address.startsWith('0x') ? address.trim().toLowerCase() : undefined;
    const canonicalIdPre = cleanAddrPre ? `wallet_${cleanAddrPre}` : accountId;

    let existingPlayer = room.players.find(p =>
      p.id === accountId ||
      p.id === canonicalIdPre ||
      (cleanAddrPre && p.address && p.address.toLowerCase() === cleanAddrPre) ||
      (p.socketId && p.socketId === socketId)
    );

    if (existingPlayer) {
      this.clearDisconnectTimer(existingPlayer.id);
      this.clearDisconnectTimer(accountId);
      // Cleanse any spectator record
      room.spectators.delete(accountId);
      room.spectators.delete(existingPlayer.id);
      for (const [sId, s] of Array.from(room.spectators.entries())) {
        if (s.socketId === socketId) room.spectators.delete(sId);
      }

      existingPlayer.isConnected = true;
      existingPlayer.socketId = socketId;
      if (playerName) existingPlayer.name = playerName;
      if (avatar) existingPlayer.avatar = avatar;
      if (cleanAddrPre) existingPlayer.address = cleanAddrPre;

      this.socketToRoomId.set(socketId, room.roomId);
      this.socketToAccountId.set(socketId, existingPlayer.id);
      this.accountToRoomId.set(existingPlayer.id, room.roomId);
      if (accountId !== existingPlayer.id) {
        this.accountToRoomId.set(accountId, room.roomId);
      }

      room.addChatMessage({
        senderId: 'system',
        senderName: 'SYSTEM',
        senderAvatar: '⚡',
        text: `${existingPlayer.name} reconnected.`,
        isSystem: true,
      });

      this.broadcastRoomState(room);
      return { success: true, room, reconnected: true, playerId: existingPlayer.id };
    }

    // Check if returning spectator
    const existingSpectator = room.spectators.get(accountId);
    if (existingSpectator) {
      existingSpectator.socketId = socketId;
      this.socketToRoomId.set(socketId, room.roomId);
      this.socketToAccountId.set(socketId, accountId);
      this.accountToRoomId.set(accountId, room.roomId);
      this.broadcastRoomState(room);
      return { success: true, room, reconnected: true, playerId: accountId };
    }

    const cleanAddr = address && address.startsWith('0x') ? address.trim().toLowerCase() : undefined;
    if (!cleanAddr) {
      return { success: false, error: 'Wallet connection required to join a game room' };
    }

    const dbUser = serverDb.getUserByAddress(cleanAddr) || serverDb.linkOrGetUserByAddress(cleanAddr, accountId, { name: playerName, avatar });
    const resolvedName = dbUser.name || playerName || `Player ${room.players.length + 1}`;
    const resolvedAvatar = dbUser.avatar || avatar || '🦁';
    const canonicalId = dbUser.id;

    // New player joining
    if (room.status !== 'lobby') {
      return { success: false, error: 'Game is already in progress in this room' };
    }

    if (room.players.length >= 5) {
      return { success: false, error: 'Room is full (max 5 players)' };
    }

    // Handle token staking debit for joining player
    const buyInNum = parseFloat(room.buyInAmount || '0');
    if (room.isStaking && buyInNum > 0 && !room.hasPlayerStaked(canonicalId)) {
      const playerBal = serverDb.getUserTokenBalance(cleanAddr || canonicalId);
      if (playerBal < buyInNum) {
        return {
          success: false,
          error: `Insufficient $CRAZY8 tokens. This table requires a stake of ${buyInNum} chips, but your balance is ${playerBal} chips.`,
        };
      }
      const debited = serverDb.debitUserTokenBalance(cleanAddr || canonicalId, buyInNum);
      if (!debited) {
        return {
          success: false,
          error: `Failed to debit stake of ${buyInNum} $CRAZY8 chips. Please verify your balance.`,
        };
      }
      room.recordStake(canonicalId, buyInNum);
      const newBal = serverDb.getUserTokenBalance(cleanAddr || canonicalId);
      this.io.to(`wallet:${cleanAddr}`).emit('token:balance_updated', {
        address: cleanAddr,
        balance: newBal.toString(),
        debited: buyInNum,
        reason: `Staked ${buyInNum} $CRAZY8 to join Room #${room.roomCode}`,
      });
      this.io.to(socketId).emit('token:balance_updated', {
        address: cleanAddr,
        balance: newBal.toString(),
        debited: buyInNum,
        reason: `Staked ${buyInNum} $CRAZY8 to join Room #${room.roomCode}`,
      });
    }

    const added = room.addPlayer({
      id: canonicalId,
      socketId,
      name: resolvedName,
      avatar: resolvedAvatar,
      isHost: false,
      isConnected: true,
      address: cleanAddr,
    });

    if (!added) {
      return { success: false, error: 'Could not join room' };
    }

    this.socketToRoomId.set(socketId, room.roomId);
    this.socketToAccountId.set(socketId, canonicalId);
    this.accountToRoomId.set(canonicalId, room.roomId);
    if (accountId !== canonicalId) {
      this.accountToRoomId.set(accountId, room.roomId);
    }

    room.addChatMessage({
      senderId: 'system',
      senderName: 'SYSTEM',
      senderAvatar: '👋',
      text: `${added.name} joined the room.`,
      isSystem: true,
    });

    if (added.isHost) {
      room.addChatMessage({
        senderId: 'system',
        senderName: 'SYSTEM',
        senderAvatar: '👑',
        text: `${added.name} is now Table Host! You can start the game or add bots.`,
        isSystem: true,
      });
    }

    serverDb.setUserPresence(canonicalId, 'in_game', room.roomCode);

    this.io.emit('rooms:public_list', this.getPublicRooms());
    this.broadcastRoomState(room);
    return { success: true, room, playerId: canonicalId };
  }

  public quickJoin(
    accountId: string,
    socketId: string,
    playerName: string,
    avatar: string,
    address?: string
  ): { success: boolean; room?: GameRoom; isHost?: boolean; playerId?: string; error?: string } {
    const cleanAddr = address && address.startsWith('0x') ? address.trim().toLowerCase() : undefined;
    if (!cleanAddr) {
      return { success: false, error: 'Wallet connection required for Quick Play' };
    }

    const dbUser = serverDb.getUserByAddress(cleanAddr) || serverDb.linkOrGetUserByAddress(cleanAddr, accountId, { name: playerName, avatar });
    const resolvedName = dbUser.name || playerName || 'Player';
    const resolvedAvatar = dbUser.avatar || avatar || '🦊';
    const canonicalId = dbUser.id;

    this.clearDisconnectTimer(canonicalId);
    this.clearDisconnectTimer(accountId);

    // If already in a room, resume or return it
    const existingRoomId = this.accountToRoomId.get(canonicalId) || this.accountToRoomId.get(accountId);
    if (existingRoomId) {
      const existing = this.rooms.get(existingRoomId);
      if (existing) {
        const resumeRes = this.resumeSession(canonicalId, socketId, existing.roomCode, cleanAddr);
        if (resumeRes.success && resumeRes.room) {
          return {
            success: true,
            room: resumeRes.room,
            isHost: resumeRes.room.hostId === canonicalId,
            playerId: resumeRes.playerId || canonicalId,
          };
        }
      }
    }

    // RULE: Quick Match ONLY matches real users who join, and NEVER adds bots.
    // 1. Search for an open Quick Match room with space for more real players
    let openRoom: GameRoom | null = null;
    for (const r of this.rooms.values()) {
      if (r.isQuickMatch && r.status === 'lobby' && r.players.length < 5) {
        openRoom = r;
        break;
      }
    }

    if (openRoom) {
      const joinRes = this.joinRoom(openRoom.roomCode, canonicalId, socketId, resolvedName, resolvedAvatar, cleanAddr);
      if (joinRes.success && joinRes.room) {
        return {
          success: true,
          room: joinRes.room,
          isHost: joinRes.room.hostId === canonicalId,
          playerId: joinRes.playerId || canonicalId,
        };
      }
    }

    // 2. Otherwise create a fresh Quick Match room for real users only (0 bots added)
    try {
      const newRoom = this.createRoom(canonicalId, socketId, resolvedName, resolvedAvatar, '0.000', cleanAddr);
      newRoom.isQuickMatch = true;
      newRoom.customMode = 'Quick Match';
      newRoom.description = 'Real players only. Fast matching.';
      this.broadcastRoomState(newRoom);
      return { success: true, room: newRoom, isHost: true, playerId: canonicalId };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public resumeSession(
    accountId: string,
    socketId: string,
    roomCode?: string,
    address?: string
  ): { success: boolean; room?: GameRoom; isSpectator?: boolean; playerId?: string; roomCode?: string } {
    this.clearDisconnectTimer(accountId);

    let room: GameRoom | null = null;

    if (roomCode) {
      room = this.getRoomByCode(roomCode);
    }

    if (!room) {
      const roomId = this.accountToRoomId.get(accountId);
      if (roomId) {
        room = this.rooms.get(roomId) || null;
      }
    }

    // Helper to match player by any account ID, wallet address, canonical id, or active socket
    const matchPlayer = (p: Player) => {
      const targetAcc = accountId ? accountId.toLowerCase().trim() : '';
      const targetAddr = address ? address.toLowerCase().trim() : '';
      const pId = p.id ? p.id.toLowerCase().trim() : '';
      const pAddr = p.address ? p.address.toLowerCase().trim() : '';

      if (targetAcc && pId === targetAcc) return true;
      if (targetAddr && pAddr === targetAddr) return true;
      if (targetAddr && pId === `wallet_${targetAddr}`) return true;
      if (targetAcc.startsWith('wallet_') && pAddr === targetAcc.replace('wallet_', '')) return true;
      if (p.socketId && p.socketId === socketId) return true;
      return false;
    };

    // If still not found, search through all active rooms for player by accountId or wallet address
    if (!room) {
      for (const r of this.rooms.values()) {
        const foundPlayer = r.players.find(matchPlayer);
        if (foundPlayer) {
          room = r;
          break;
        }
        if (r.spectators.has(accountId)) {
          room = r;
          break;
        }
      }
    }

    if (!room) {
      this.accountToRoomId.delete(accountId);
      return { success: false };
    }

    // Check if player in this room
    let player = room.players.find(matchPlayer);

    if (player) {
      this.clearDisconnectTimer(player.id);
      this.clearDisconnectTimer(accountId);
      // CRITICAL: Cleanse any spectator entries for this player or socket
      room.spectators.delete(player.id);
      room.spectators.delete(accountId);
      for (const [sId, s] of Array.from(room.spectators.entries())) {
        if (s.socketId === socketId) room.spectators.delete(sId);
      }

      player.isConnected = true;
      player.socketId = socketId;

      this.socketToRoomId.set(socketId, room.roomId);
      this.socketToAccountId.set(socketId, player.id);
      this.accountToRoomId.set(player.id, room.roomId);
      if (accountId !== player.id) {
        this.accountToRoomId.set(accountId, room.roomId);
      }

      serverDb.touchUserPresence(player.id, room.roomCode);

      room.addChatMessage({
        senderId: 'system',
        senderName: 'SYSTEM',
        senderAvatar: '⚡',
        text: `${player.name} reconnected.`,
        isSystem: true,
      });

      this.broadcastRoomState(room);
      return { success: true, room, isSpectator: false, playerId: player.id, roomCode: room.roomCode };
    }

    // Check if spectator
    const spectator = room.spectators.get(accountId);
    if (spectator) {
      this.clearDisconnectTimer(accountId);
      spectator.socketId = socketId;
      this.socketToRoomId.set(socketId, room.roomId);
      this.socketToAccountId.set(socketId, accountId);
      this.accountToRoomId.set(accountId, room.roomId);

      this.broadcastRoomState(room);
      return { success: true, room, isSpectator: true, playerId: accountId, roomCode: room.roomCode };
    }

    this.accountToRoomId.delete(accountId);
    return { success: false };
  }

  public joinAsSpectator(
    roomCode: string,
    accountId: string,
    socketId: string,
    spectatorName: string,
    avatar: string
  ): { success: boolean; room?: GameRoom; error?: string; isPlayerReconnect?: boolean; playerId?: string } {
    const room = this.getRoomByCode(roomCode);
    if (!room) {
      return { success: false, error: `Room "${roomCode.toUpperCase()}" not found` };
    }

    this.clearDisconnectTimer(accountId);

    // CRITICAL: A seated player in this room must NEVER be turned into a spectator!
    const cleanAcc = accountId ? accountId.toLowerCase().trim() : '';
    const existingPlayer = room.players.find(p => {
      const pId = p.id ? p.id.toLowerCase().trim() : '';
      const pAddr = p.address ? p.address.toLowerCase().trim() : '';
      if (cleanAcc && (pId === cleanAcc || pAddr === cleanAcc || pId === `wallet_${cleanAcc}`)) return true;
      if (cleanAcc.startsWith('wallet_') && pAddr === cleanAcc.replace('wallet_', '')) return true;
      if (p.socketId && p.socketId === socketId) return true;
      return false;
    });

    if (existingPlayer) {
      console.log(`[RoomManager] joinAsSpectator intercepted for seated player ${existingPlayer.name} (${existingPlayer.id}). Reconnecting as active player.`);
      existingPlayer.isConnected = true;
      existingPlayer.socketId = socketId;
      room.spectators.delete(accountId);
      room.spectators.delete(existingPlayer.id);
      for (const [sId, s] of Array.from(room.spectators.entries())) {
        if (s.socketId === socketId) room.spectators.delete(sId);
      }

      this.socketToRoomId.set(socketId, room.roomId);
      this.socketToAccountId.set(socketId, existingPlayer.id);
      this.accountToRoomId.set(existingPlayer.id, room.roomId);
      if (accountId !== existingPlayer.id) {
        this.accountToRoomId.set(accountId, room.roomId);
      }

      this.broadcastRoomState(room);
      return { success: true, room, isPlayerReconnect: true, playerId: existingPlayer.id };
    }

    room.addSpectator(accountId, socketId, spectatorName || 'Spectator', avatar || '👁️');
    this.socketToRoomId.set(socketId, room.roomId);
    this.socketToAccountId.set(socketId, accountId);
    this.accountToRoomId.set(accountId, room.roomId);

    this.broadcastRoomState(room);
    return { success: true, room };
  }

  public handleLeaveRoom(accountId: string, socketId?: string, force: boolean = false): boolean {
    const roomId = this.accountToRoomId.get(accountId);
    if (!roomId) return true;

    const room = this.rooms.get(roomId);
    if (!room) return true;

    // Active players cannot quit while the match is in progress
    const player = room.players.find(p => p.id === accountId);
    if (player && room.status === 'playing' && !force) {
      return false;
    }

    this.clearDisconnectTimer(accountId);
    this.accountToRoomId.delete(accountId);
    serverDb.setUserPresence(accountId, 'online', null);

    if (socketId) {
      this.socketToRoomId.delete(socketId);
      this.socketToAccountId.delete(socketId);
    }

    if (room.spectators.has(accountId)) {
      room.removeSpectator(accountId);
      this.broadcastRoomState(room);
      return true;
    }

    if (player) {
      // Refund stake if leaving from lobby before game started
      if (room.status === 'lobby' && room.hasPlayerStaked(accountId)) {
        const stakeToRefund = room.getPlayerStake(accountId);
        if (stakeToRefund > 0) {
          const refundTarget = player.address || accountId;
          serverDb.creditUserTokenBalance(refundTarget, stakeToRefund);
          room.removeStake(accountId);
          const newBal = serverDb.getUserTokenBalance(refundTarget);
          if (player.address) {
            this.io.to(`wallet:${player.address.toLowerCase()}`).emit('token:balance_updated', {
              address: player.address,
              balance: newBal.toString(),
              credited: stakeToRefund,
              reason: `Refunded ${stakeToRefund} $CRAZY8 stake for leaving Room #${room.roomCode}`,
            });
          }
          if (socketId) {
            this.io.to(socketId).emit('token:balance_updated', {
              address: player.address,
              balance: newBal.toString(),
              credited: stakeToRefund,
              reason: `Refunded ${stakeToRefund} $CRAZY8 stake for leaving Room #${room.roomCode}`,
            });
          }
        }
      }

      room.addChatMessage({
        senderId: 'system',
        senderName: 'SYSTEM',
        senderAvatar: '🚪',
        text: `${player.name} left the room.`,
        isSystem: true,
      });
      room.removePlayer(accountId);

      const humanCount = room.players.filter(pl => !pl.isBot).length;
      if (humanCount === 0) {
        if (room.isSeededPublic) {
          this.reseedPublicRoom(room);
        } else {
          this.destroyRoom(room.roomId);
        }
      } else {
        this.broadcastRoomState(room);
      }
    }
    return true;
  }

  public handleDisconnect(socketId: string): void {
    const accountId = this.socketToAccountId.get(socketId);
    const roomId = this.socketToRoomId.get(socketId);

    // Clean up socket lookups
    this.socketToAccountId.delete(socketId);
    this.socketToRoomId.delete(socketId);

    if (!accountId || !roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // Check if spectator
    if (room.spectators.has(accountId)) {
      this.clearDisconnectTimer(accountId);
      const timer = setTimeout(() => {
        this.disconnectTimers.delete(accountId);
        if (room.spectators.has(accountId)) {
          room.removeSpectator(accountId);
          this.accountToRoomId.delete(accountId);
          this.broadcastRoomState(room);
        }
      }, 120000);
      this.disconnectTimers.set(accountId, timer);
      return;
    }

    const player = room.players.find(p => p.id === accountId);
    if (!player) return;

    // Generous disconnection debounce (10 seconds):
    // Do NOT immediately mark player offline or broadcast disconnection on momentary network blips,
    // transport upgrades, or quick tab switches.
    this.clearDisconnectTimer(accountId);
    const timer = setTimeout(() => {
      this.disconnectTimers.delete(accountId);

      // Verify if player is still disconnected after 10 seconds
      const p = room.players.find(pl => pl.id === accountId);
      if (p && (!p.socketId || p.socketId === socketId)) {
        p.isConnected = false;
        this.broadcastRoomState(room);
        serverDb.setUserPresence(accountId, 'offline', null);
      }

      // Eviction timer: if player does not return within 110 more seconds (120s total), remove from seat
      const evictTimer = setTimeout(() => {
        this.disconnectTimers.delete(accountId);
        const pEvict = room.players.find(pl => pl.id === accountId);
        if (pEvict && !pEvict.isConnected) {
          this.accountToRoomId.delete(accountId);
          serverDb.setUserPresence(accountId, 'offline', null);
          room.removePlayer(accountId);

          const humanCount = room.players.filter(pl => !pl.isBot).length;
          if (humanCount === 0) {
            if (room.isSeededPublic) {
              this.reseedPublicRoom(room);
            } else {
              this.destroyRoom(room.roomId);
            }
          } else {
            this.broadcastRoomState(room);
          }
        }
      }, 110000);

      this.disconnectTimers.set(accountId, evictTimer);
    }, 10000);

    this.disconnectTimers.set(accountId, timer);
  }

  public destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // If room is destroyed while still in lobby, refund any active player stakes
    if (room.status === 'lobby') {
      for (const [pId, stake] of room.getAllStakes()) {
        if (stake > 0 && !pId.startsWith('bot_')) {
          const pl = room.players.find(p => p.id === pId);
          const target = pl?.address || pId;
          serverDb.creditUserTokenBalance(target, stake);
          const newBal = serverDb.getUserTokenBalance(target);
          if (pl?.address) {
            this.io.to(`wallet:${pl.address.toLowerCase()}`).emit('token:balance_updated', {
              address: pl.address,
              balance: newBal.toString(),
              credited: stake,
              reason: `Room #${room.roomCode} disbanded. Stake of ${stake} $CRAZY8 refunded.`,
            });
          }
          if (pl?.socketId) {
            this.io.to(pl.socketId).emit('token:balance_updated', {
              address: pl?.address,
              balance: newBal.toString(),
              credited: stake,
              reason: `Room #${room.roomCode} disbanded. Stake of ${stake} $CRAZY8 refunded.`,
            });
          }
        }
      }
      room.clearStakes();
    }

    this.codeToRoomId.delete(room.roomCode);
    this.rooms.delete(roomId);
    this.io.emit('rooms:public_list', this.getPublicRooms());
  }

  public broadcastRoomState(room: GameRoom): void {
    // 1. Purge any spectators that are actually seated players or share a socket with a seated player
    const playerSocketIds = new Set<string>();
    const playerIds = new Set<string>();
    const playerAddresses = new Set<string>();

    for (const player of room.players) {
      playerIds.add(player.id.toLowerCase());
      if (player.socketId) playerSocketIds.add(player.socketId);
      if (player.address) {
        playerAddresses.add(player.address.toLowerCase());
        playerIds.add(`wallet_${player.address.toLowerCase()}`);
      }
    }

    for (const [spectatorId, spec] of Array.from(room.spectators.entries())) {
      const specLower = spectatorId.toLowerCase();
      const specSocket = spec.socketId;
      if (
        playerIds.has(specLower) ||
        (specSocket && playerSocketIds.has(specSocket)) ||
        (specLower.startsWith('wallet_') && playerAddresses.has(specLower.replace('wallet_', '')))
      ) {
        room.spectators.delete(spectatorId);
      }
    }

    // 2. Broadcast authoritative player states to seated players
    for (const player of room.players) {
      if (!player.isBot && player.socketId) {
        const sanitized = room.getSanitizedStateForPlayer(player.id);
        this.io.to(player.socketId).emit('game:state', sanitized);
      }
    }

    // 3. Broadcast spectator states ONLY to genuine spectators (who are NOT seated players)
    for (const [spectatorId, spec] of room.spectators) {
      if (spec.socketId && !playerSocketIds.has(spec.socketId)) {
        const sanitized = room.getSanitizedStateForPlayer(spectatorId);
        this.io.to(spec.socketId).emit('game:state', sanitized);
      }
    }
  }

  public sendChatMessage(
    socketId: string,
    text: string
  ): { success: boolean; message?: ChatMessage; error?: string } {
    const room = this.getRoomBySocket(socketId);
    if (!room) return { success: false, error: 'Room not found' };

    const cleanText = (text || '').trim();
    if (!cleanText) return { success: false, error: 'Message cannot be empty' };
    if (cleanText.length > 140) return { success: false, error: 'Message too long (max 140 chars)' };

    const player = room.players.find(p => p.socketId === socketId);
    const spectator = Array.from(room.spectators.values()).find(s => s.socketId === socketId);

    if (!player && !spectator) {
      return { success: false, error: 'Sender not part of this room' };
    }

    const isSpectator = !player && !!spectator;
    const senderId = player ? player.id : (spectator?.id || 'spectator');
    const senderName = player ? player.name : (spectator?.name || 'Spectator');
    const senderAvatar = player ? player.avatar : (spectator?.avatar || '👁️');

    const chatMsg = room.addChatMessage({
      senderId,
      senderName,
      senderAvatar,
      text: cleanText,
      isSpectator,
    });

    return { success: true, message: chatMsg };
  }

  public sendEmote(socketId: string, emoji: string, text?: string): void {
    const room = this.getRoomBySocket(socketId);
    if (!room) return;

    const player = room.players.find(p => p.socketId === socketId);
    const spectator = Array.from(room.spectators.values()).find(s => s.socketId === socketId);
    if (!player && !spectator) return;

    const senderId = player ? player.id : spectator!.id;

    const emotePayload = {
      id: `em_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      playerId: senderId,
      emoji,
      text,
      timestamp: Date.now(),
    };

    this.io.to(room.roomId).emit('game:emote', emotePayload);
    this.io.to(room.roomId).emit('game:sound', { soundName: 'emote' });
  }

  public getPublicRooms(): PublicRoomSummary[] {
    return Array.from(this.rooms.values()).map(room => {
      const host = room.players.find(p => p.isHost) || room.players[0];
      return {
        roomId: room.roomId,
        roomCode: room.roomCode,
        status: room.status,
        playerCount: room.players.length,
        maxPlayers: 5,
        spectatorCount: room.spectators.size,
        mode: room.customMode || 'Classic',
        description: room.description || 'The original. 2-4 players.',
        hostName: host ? host.name : 'Host',
        hostAvatar: host ? host.avatar : '🦊',
        players: room.players.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isBot: p.isBot,
        })),
        activeColor: room.activeColor,
        topDiscardCard: room.getTopDiscard(),
        escrowPot: {
          amount: (room.players.length * parseFloat(room.buyInAmount || '0')).toFixed(3),
          currency: room.currency,
          buyInAmount: room.buyInAmount,
        },
        isQuickMatch: room.isQuickMatch,
      };
    });
  }

  public getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }
}
