import { Server as SocketIOServer } from 'socket.io';
import { GameRoom } from './gameEngine';
import { CardColor, CardsDrawnEvent, CardPlayedEvent, ChatMessage, PublicRoomSummary, Player } from '../../../src/types/uno';
import { serverDb, isDefaultName } from './database';
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
      room.buyInAmount = '100';
      room.isStaking = true;
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
    const buyInNum = room.isStaking ? (parseFloat(room.buyInAmount || '0') || 0) : 0;
    const potNum = room.isStaking
      ? (room.getPotAmount() || parseFloat(pot) || (players.length * buyInNum))
      : 0;
    const payout = potNum > 0 ? Math.round(potNum * 0.95) : 0;

    // 1. Credit winner's balance if winner is a human player in a staked match
    if (winner && !winner.isBot && payout > 0 && room.isStaking) {
      const targetId = winner.address || winner.id;
      serverDb.creditUserTokenBalance(targetId, payout);
    }

    // 2. Record match stats (wins, losses, totalWinnings = payout, totalLosses = buyInNum)
    serverDb.recordGameFinished(
      winner.id,
      players.filter(p => !p.isBot).map(p => p.id),
      payout.toString(),
      cardsPlayedMap,
      room.roomCode,
      buyInNum
    );

    // 3. Clear stakes for the finished round
    room.clearStakes();

    // 4. Broadcast updated wallet balance and profile stats to ALL human players (winner & losers)
    for (const p of players) {
      if (p.isBot) continue;
      const targetId = p.address || p.id;
      const newBal = serverDb.getUserTokenBalance(targetId);
      const isWinner =
        p.id === winner.id ||
        (p.address && winner.address && p.address.toLowerCase() === winner.address.toLowerCase());

      const balancePayload = isWinner
        ? {
            address: p.address,
            balance: newBal.toString(),
            credited: payout,
            reason:
              payout > 0
                ? `Won pot of ${payout} $CRAZY8 in Room #${room.roomCode}`
                : `Won match in Room #${room.roomCode}`,
          }
        : {
            address: p.address,
            balance: newBal.toString(),
            debited: buyInNum,
            reason:
              buyInNum > 0
                ? `Lost ${buyInNum} $CRAZY8 stake in Room #${room.roomCode}`
                : `Match finished in Room #${room.roomCode}`,
          };

      if (p.address) {
        this.io.to(`wallet:${p.address.toLowerCase()}`).emit('token:balance_updated', balancePayload);
      }
      if (p.socketId) {
        this.io.to(p.socketId).emit('token:balance_updated', balancePayload);
      }

      if (!isWinner && buyInNum > 0) {
        serverDb.addNotification(p.id, {
          type: 'system',
          title: `Match Lost: -${buyInNum} $CRAZY8`,
          message: `${winner.name} won the ${potNum} $CRAZY8 pot in Room #${room.roomCode}. Your ${buyInNum} $CRAZY8 stake was disbursed to the pot.`,
          amount: `-${buyInNum}`,
          roomCode: room.roomCode,
        });
      }

      const updatedUser =
        (p.address ? serverDb.getUserByAddress(p.address) : undefined) ||
        serverDb.getUser(p.id);
      if (updatedUser) {
        if (p.socketId) {
          this.io.to(p.socketId).emit('profile:synced', updatedUser);
          this.io.to(p.socketId).emit('profile:updated', updatedUser);
        }
        if (p.address) {
          this.io.to(`wallet:${p.address.toLowerCase()}`).emit('profile:updated', updatedUser);
        }
      }
    }

    // 5. If human winner has an on-chain address and pot > 0, execute HemiCrazy8Escrow on-chain disbursement
    if (winner && !winner.isBot && winner.address && winner.address.startsWith('0x') && potNum > 0) {
      settleMatchOnChain(room.roomCode, winner.address, potNum)
        .then(settleRes => {
          if (settleRes.success) {
            if (settleRes.txHash) {
              room.settlementSignature = {
                roomId: room.roomId,
                winnerAddress: winner.address!,
                potAmount: potNum.toFixed(0),
                nonce: Date.now(),
                timestamp: Date.now(),
                signature: settleRes.txHash,
                contractAddress: getEscrowAddress(),
                network: 'Hemi Sepolia (Chain ID 743111)',
              };
              this.broadcastRoomState(room);
            }

            // Emit live settlement event to room
            this.io.to(room.roomId).emit('game:settlement', {
              roomCode: room.roomCode,
              winnerAddress: winner.address,
              txHash: settleRes.txHash,
              payout: settleRes.winnerPayout || payout.toString(),
              fee: settleRes.boardFee,
            });

            // Notify winner wallet channel
            if (winner.address) {
              const currentBal = serverDb.getUserTokenBalance(winner.address);
              this.io.to(`wallet:${winner.address.toLowerCase()}`).emit('token:balance_updated', {
                address: winner.address,
                balance: currentBal.toString(),
                credited: settleRes.winnerPayout || payout.toString(),
                reason: `On-chain escrow payout for Room #${room.roomCode}`,
              });
            }

            // Store notification in winner's profile
            serverDb.addNotification(winner.id, {
              type: 'match_won',
              title: `🏆 Pot Won: +${payout} $CRAZY8!`,
              message: `Victory in Room #${room.roomCode}! 95% escrow payout (${settleRes.winnerPayout || payout} CRAZY8) disbursed to your Hemi Sepolia wallet.`,
              txHash: settleRes.txHash,
              amount: payout.toString(),
              roomCode: room.roomCode,
            });
          }
        })
        .catch(err => {
          console.warn(`[RoomManager] Settlement error for ${room.roomCode}:`, err);
        });
    } else if (winner && !winner.isBot && payout > 0) {
      serverDb.addNotification(winner.id, {
        type: 'match_won',
        title: `🏆 Pot Won: +${payout} $CRAZY8!`,
        message: `Victory in Room #${room.roomCode}! 95% payout (${payout} CRAZY8) credited to your wallet balance.`,
        amount: payout.toString(),
        roomCode: room.roomCode,
      });
    }
  }

  private reseedPublicRoom(room: GameRoom): void {
    room.stopTurnTimer();
    const template = this.publicTemplates.find(t => t.code === room.roomCode);
    if (!template) {
      this.destroyRoom(room.roomId);
      return;
    }

    room.abortGame('Table reset to lobby.');
    room.status = 'lobby';
    room.players = [];
    room.spectators.clear();
    room.buyInAmount = '100';
    room.isStaking = true;
    room.clearStakes();
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
    this.broadcastPublicRooms();
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

    const cleanAddr = address && address.startsWith('0x') ? address.trim().toLowerCase() : undefined;
    if (!cleanAddr) {
      throw new Error('Wallet connection required to create a game room');
    }

    // If account or wallet was in another room, leave it cleanly first
    this.handleLeaveRoom(accountId, hostSocketId, true, cleanAddr);

    const dbUser = serverDb.getUserByAddress(cleanAddr) || serverDb.linkOrGetUserByAddress(cleanAddr, accountId, { name: playerName, avatar });
    if (playerName && !isDefaultName(playerName) && (isDefaultName(dbUser.name) || !dbUser.name)) {
      dbUser.name = playerName.trim();
      serverDb.save();
    }
    const resolvedName = (playerName && !isDefaultName(playerName)) ? playerName.trim() : (dbUser.name || playerName || 'Player 1');
    const resolvedAvatar = avatar || dbUser.avatar || '🦊';
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

    // If player is currently registered in a DIFFERENT room, leave that old room first
    const prevRoomId =
      this.accountToRoomId.get(accountId) ||
      this.accountToRoomId.get(canonicalIdPre) ||
      (socketId ? this.socketToRoomId.get(socketId) : undefined);
    if (prevRoomId && prevRoomId !== room.roomId) {
      this.handleLeaveRoom(accountId, socketId, true, cleanAddrPre);
    }

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
    if (playerName && !isDefaultName(playerName) && (isDefaultName(dbUser.name) || !dbUser.name)) {
      dbUser.name = playerName.trim();
      serverDb.save();
    }
    const resolvedName = (playerName && !isDefaultName(playerName)) ? playerName.trim() : (dbUser.name || playerName || `Player ${room.players.length + 1}`);
    const resolvedAvatar = avatar || dbUser.avatar || '🦁';
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
    address?: string,
    buyIn: string = '100'
  ): { success: boolean; room?: GameRoom; isHost?: boolean; playerId?: string; error?: string } {
    const cleanAddr = address && address.startsWith('0x') ? address.trim().toLowerCase() : undefined;
    if (!cleanAddr) {
      return { success: false, error: 'Wallet connection required for Quick Play' };
    }

    const dbUser = serverDb.getUserByAddress(cleanAddr) || serverDb.linkOrGetUserByAddress(cleanAddr, accountId, { name: playerName, avatar });
    if (playerName && !isDefaultName(playerName) && (isDefaultName(dbUser.name) || !dbUser.name)) {
      dbUser.name = playerName.trim();
      serverDb.save();
    }
    const resolvedName = (playerName && !isDefaultName(playerName)) ? playerName.trim() : (dbUser.name || playerName || 'Player');
    const resolvedAvatar = avatar || dbUser.avatar || '🦊';
    const canonicalId = dbUser.id;

    this.clearDisconnectTimer(canonicalId);
    this.clearDisconnectTimer(accountId);

    // If already in an active Quick Match room lobby, resume it. If in any other room, exit it cleanly.
    const existingRoomId = this.accountToRoomId.get(canonicalId) || this.accountToRoomId.get(accountId);
    if (existingRoomId) {
      const existing = this.rooms.get(existingRoomId);
      if (existing && existing.isQuickMatch && existing.status === 'lobby') {
        const resumeRes = this.resumeSession(canonicalId, socketId, existing.roomCode, cleanAddr);
        if (resumeRes.success && resumeRes.room) {
          return {
            success: true,
            room: resumeRes.room,
            isHost: resumeRes.room.hostId === canonicalId,
            playerId: resumeRes.playerId || canonicalId,
          };
        }
      } else if (existing) {
        this.handleLeaveRoom(canonicalId, socketId, true, cleanAddr, existing.roomCode);
      }
    }

    // RULE: Quick Match ONLY matches real users who join, and NEVER adds bots.
    // 1. Search for an open Quick Match room with space for more real players
    let openRoom: GameRoom | null = null;
    const requestedStakeNum = parseFloat(buyIn || '100');
    for (const r of this.rooms.values()) {
      if (r.isQuickMatch && r.status === 'lobby' && r.players.length < 5) {
        if (parseFloat(r.buyInAmount || '0') === requestedStakeNum || !openRoom) {
          openRoom = r;
          if (parseFloat(r.buyInAmount || '0') === requestedStakeNum) {
            break;
          }
        }
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

    // 2. Otherwise create a fresh Quick Match room with the Pot feature enabled (0 bots added)
    try {
      const parsedBuyIn = (buyIn !== undefined && buyIn !== null && buyIn !== '') ? buyIn : '100';
      const newRoom = this.createRoom(canonicalId, socketId, resolvedName, resolvedAvatar, parsedBuyIn, cleanAddr);
      newRoom.isQuickMatch = true;
      newRoom.customMode = 'Quick Match';
      const stakeNum = parseFloat(parsedBuyIn);
      newRoom.description = stakeNum > 0
        ? `${stakeNum} $CRAZY8 Pot • Contest Match (Real players only)`
        : 'Real players only. Fast matching.';
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
    this.broadcastPublicRooms();
    return { success: true, room };
  }

  public handleLeaveRoom(
    accountId?: string | null,
    socketId?: string,
    force: boolean = true,
    address?: string,
    roomCode?: string
  ): boolean {
    const cleanAddr = address && address.trim().startsWith('0x') ? address.trim().toLowerCase() : undefined;
    const canonicalAddrId = cleanAddr ? `wallet_${cleanAddr}` : undefined;

    let room: GameRoom | null = null;
    if (roomCode) {
      room = this.getRoomByCode(roomCode);
    }
    if (!room) {
      const roomId =
        (accountId ? this.accountToRoomId.get(accountId) : undefined) ||
        (canonicalAddrId ? this.accountToRoomId.get(canonicalAddrId) : undefined) ||
        (socketId ? this.socketToRoomId.get(socketId) : undefined);
      if (roomId) {
        room = this.rooms.get(roomId) || null;
      }
    }

    // Fallback scan across all rooms if still not found
    if (!room) {
      for (const r of this.rooms.values()) {
        const found = r.players.some(
          p =>
            (accountId && r.isSamePlayer(p, accountId)) ||
            (cleanAddr && r.isSamePlayer(p, cleanAddr)) ||
            (socketId && p.socketId === socketId)
        );
        if (found || (accountId && r.spectators.has(accountId))) {
          room = r;
          break;
        }
      }
    }

    if (accountId) {
      this.clearDisconnectTimer(accountId);
      this.accountToRoomId.delete(accountId);
      serverDb.setUserPresence(accountId, 'online', null);
    }
    if (canonicalAddrId) {
      this.clearDisconnectTimer(canonicalAddrId);
      this.accountToRoomId.delete(canonicalAddrId);
      serverDb.setUserPresence(canonicalAddrId, 'online', null);
    }
    if (socketId) {
      this.socketToRoomId.delete(socketId);
      this.socketToAccountId.delete(socketId);
    }

    if (!room) return true;

    const player = room.players.find(
      p =>
        (accountId && room!.isSamePlayer(p, accountId)) ||
        (cleanAddr && room!.isSamePlayer(p, cleanAddr)) ||
        (socketId && p.socketId === socketId)
    );

    if (player) {
      this.clearDisconnectTimer(player.id);
      this.accountToRoomId.delete(player.id);
      serverDb.setUserPresence(player.id, 'online', null);
    }

    // Check if spectator by accountId or socketId
    let specToRemove = accountId ? room.spectators.get(accountId) : undefined;
    if (!specToRemove && socketId) {
      specToRemove = Array.from(room.spectators.values()).find(s => s.socketId === socketId);
    }
    if (specToRemove && !player) {
      room.removeSpectator(specToRemove.id);
      this.broadcastRoomState(room);
      this.broadcastPublicRooms();
      return true;
    }

    if (player) {
      const wasHost = player.isHost || room.hostId === player.id;
      const wasPlaying = room.status === 'playing';

      // Refund stake if leaving from lobby before game started
      if (room.status === 'lobby' && (room.hasPlayerStaked(player.id) || (accountId && room.hasPlayerStaked(accountId)))) {
        const stakeId = room.hasPlayerStaked(player.id) ? player.id : accountId!;
        const stakeToRefund = room.getPlayerStake(stakeId);
        if (stakeToRefund > 0) {
          const refundTarget = player.address || player.id;
          serverDb.creditUserTokenBalance(refundTarget, stakeToRefund);
          room.removeStake(stakeId);
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

      // If the Host quits while the game is in progress, refund stakes and end/reset the match
      if (wasPlaying && wasHost) {
        if (room.isStaking) {
          this.refundAllRoomStakes(room, `Table Host ${player.name} ended the match in Room #${room.roomCode}.`);
        }
        room.addChatMessage({
          senderId: 'system',
          senderName: 'SYSTEM',
          senderAvatar: '🛑',
          text: `Host ${player.name} ended the match and left the room.`,
          isSystem: true,
        });
        room.removePlayer(player.id);

        const humanCount = room.players.filter(pl => !pl.isBot).length;
        if (humanCount === 0) {
          if (room.isSeededPublic) {
            this.reseedPublicRoom(room);
          } else {
            this.destroyRoom(room.roomId);
          }
        } else {
          room.abortGame(`Host ${player.name} quit the match. Returned to lobby.`);
          this.broadcastRoomState(room);
          this.broadcastPublicRooms();
        }
        return true;
      }

      room.addChatMessage({
        senderId: 'system',
        senderName: 'SYSTEM',
        senderAvatar: '🚪',
        text: `${player.name} left the room.`,
        isSystem: true,
      });
      room.removePlayer(player.id);

      const humanCount = room.players.filter(pl => !pl.isBot).length;
      if (humanCount === 0) {
        if (room.isSeededPublic) {
          this.reseedPublicRoom(room);
        } else {
          this.destroyRoom(room.roomId);
        }
      } else {
        this.broadcastRoomState(room);
        this.broadcastPublicRooms();
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
          this.broadcastPublicRooms();
        }
      }, 8000);
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

  public refundAllRoomStakes(room: GameRoom, reason?: string): void {
    for (const [pId, stake] of room.getAllStakes()) {
      if (stake > 0 && !pId.startsWith('bot_')) {
        const pl = room.players.find(p => p.id === pId);
        const target = pl?.address || pId;
        serverDb.creditUserTokenBalance(target, stake);
        const newBal = serverDb.getUserTokenBalance(target);
        const refundReason = reason || `Stake of ${stake} $CRAZY8 refunded for Room #${room.roomCode}.`;
        if (pl?.address) {
          this.io.to(`wallet:${pl.address.toLowerCase()}`).emit('token:balance_updated', {
            address: pl.address,
            balance: newBal.toString(),
            credited: stake,
            reason: refundReason,
          });
        }
        if (pl?.socketId) {
          this.io.to(pl.socketId).emit('token:balance_updated', {
            address: pl?.address,
            balance: newBal.toString(),
            credited: stake,
            reason: refundReason,
          });
        }
      }
    }
    room.clearStakes();
  }

  public configureRoomStake(
    roomCode: string,
    hostAccountId: string,
    buyIn: string
  ): { success: boolean; room?: GameRoom; error?: string } {
    const room = this.getRoomByCode(roomCode);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'lobby') return { success: false, error: 'Cannot change stakes while game is in progress' };

    // Verify host
    const isHost =
      room.hostId === hostAccountId ||
      room.players.some(
        p => p.isHost && (p.id === hostAccountId || (p.address && hostAccountId.toLowerCase().includes(p.address.toLowerCase())))
      );
    if (!isHost) {
      return { success: false, error: 'Only the Table Host can configure the table pot' };
    }

    const buyInNum = parseFloat(buyIn || '0');

    if (buyInNum <= 0) {
      // Deactivate staking
      this.refundAllRoomStakes(room, `Table Host set Room #${room.roomCode} to Casual Non-Staking.`);
      room.isStaking = false;
      room.buyInAmount = '0';
      room.addChatMessage({
        senderId: 'system',
        senderName: 'SYSTEM',
        senderAvatar: '🎮',
        text: 'Table Host switched room to Casual Free Play (No Stake).',
        isSystem: true,
      });
      this.broadcastRoomState(room);
      return { success: true, room };
    }

    // Check that each seated human player has enough balance
    for (const p of room.players) {
      if (!p.isBot) {
        const currentStake = room.getPlayerStake(p.id);
        const target = p.address || p.id;
        const currentBal = serverDb.getUserTokenBalance(target);
        if (currentBal + currentStake < buyInNum) {
          room.addChatMessage({
            senderId: 'system',
            senderName: 'SYSTEM',
            senderAvatar: '⚠️',
            text: `Cannot set stake to ${buyInNum} $CRAZY8: ${p.name} has insufficient chips (${currentBal} $CRAZY8). Player can claim free test chips from the Airdrop tab or host can select a lower stake.`,
            isSystem: true,
          });
          this.broadcastRoomState(room);
          return {
            success: false,
            error: `${p.name} has insufficient chips (${currentBal} $CRAZY8). Needs ${buyInNum} chips for this stake.`,
          };
        }
      }
    }

    // Refund previous stakes before charging new stake amount
    this.refundAllRoomStakes(room, `Updating stake to ${buyInNum} $CRAZY8 in Room #${room.roomCode}.`);

    // Debit each seated human player for the new stake and record house-sponsored stakes for bots
    for (const p of room.players) {
      if (!p.isBot) {
        const target = p.address || p.id;
        const debited = serverDb.debitUserTokenBalance(target, buyInNum);
        if (debited) {
          room.recordStake(p.id, buyInNum);
          const newBal = serverDb.getUserTokenBalance(target);
          if (p.address) {
            this.io.to(`wallet:${p.address.toLowerCase()}`).emit('token:balance_updated', {
              address: p.address,
              balance: newBal.toString(),
              debited: buyInNum,
              reason: `Staked ${buyInNum} $CRAZY8 in Room #${room.roomCode}`,
            });
          }
          if (p.socketId) {
            this.io.to(p.socketId).emit('token:balance_updated', {
              address: p.address,
              balance: newBal.toString(),
              debited: buyInNum,
              reason: `Staked ${buyInNum} $CRAZY8 in Room #${room.roomCode}`,
            });
          }
        }
      } else {
        room.recordStake(p.id, buyInNum);
      }
    }

    room.buyInAmount = buyInNum.toString();
    room.isStaking = true;
    room.addChatMessage({
      senderId: 'system',
      senderName: 'SYSTEM',
      senderAvatar: '🪙',
      text: `Table Host configured table stake to ${buyInNum} $CRAZY8 per player (Pot: ${room.getPotAmount()} $CRAZY8).`,
      isSystem: true,
    });
    this.broadcastRoomState(room);
    return { success: true, room };
  }

  public ensureStakesForMatchStart(room: GameRoom): { success: boolean; error?: string } {
    if (!room.isStaking) return { success: true };
    const buyInNum = parseFloat(room.buyInAmount || '0');
    if (buyInNum <= 0) return { success: true };

    // Verify all unstaked human players have enough balance
    for (const p of room.players) {
      if (!p.isBot && !room.hasPlayerStaked(p.id)) {
        const target = p.address || p.id;
        const currentBal = serverDb.getUserTokenBalance(target);
        if (currentBal < buyInNum) {
          return {
            success: false,
            error: `Cannot start: ${p.name} has insufficient chips (${currentBal} $CRAZY8) for the ${buyInNum} $CRAZY8 table stake.`,
          };
        }
      }
    }

    // Debit any unstaked human players (e.g., on rematch) and record bot stakes
    for (const p of room.players) {
      if (!room.hasPlayerStaked(p.id)) {
        if (!p.isBot) {
          const target = p.address || p.id;
          const debited = serverDb.debitUserTokenBalance(target, buyInNum);
          if (!debited) {
            return {
              success: false,
              error: `Failed to debit ${buyInNum} $CRAZY8 stake from ${p.name}.`,
            };
          }
          room.recordStake(p.id, buyInNum);
          const newBal = serverDb.getUserTokenBalance(target);
          if (p.address) {
            this.io.to(`wallet:${p.address.toLowerCase()}`).emit('token:balance_updated', {
              address: p.address,
              balance: newBal.toString(),
              debited: buyInNum,
              reason: `Staked ${buyInNum} $CRAZY8 for match in Room #${room.roomCode}`,
            });
          }
          if (p.socketId) {
            this.io.to(p.socketId).emit('token:balance_updated', {
              address: p.address,
              balance: newBal.toString(),
              debited: buyInNum,
              reason: `Staked ${buyInNum} $CRAZY8 for match in Room #${room.roomCode}`,
            });
          }
        } else {
          room.recordStake(p.id, buyInNum);
        }
      }
    }

    return { success: true };
  }

  public destroyRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.stopTurnTimer();

    // If room is destroyed before game_over, refund any active player stakes
    if (room.status === 'lobby' || room.status === 'playing') {
      this.refundAllRoomStakes(room, `Room #${room.roomCode} disbanded.`);
    }

    for (const [accId, rId] of Array.from(this.accountToRoomId.entries())) {
      if (rId === roomId) {
        this.accountToRoomId.delete(accId);
      }
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
      const curPlayer = room.getCurrentPlayer();
      const potAmount = room.getPotAmount() || (room.players.length * parseFloat(room.buyInAmount || '0'));
      return {
        roomId: room.roomId,
        roomCode: room.roomCode,
        status: room.status,
        playerCount: room.players.length,
        maxPlayers: 5,
        spectatorCount: room.spectators.size,
        mode: room.customMode || (room.isQuickMatch ? 'Quick Match' : 'Classic'),
        description: room.description || (room.isQuickMatch ? 'Contest match (2-5 players)' : 'The original. 2-5 players.'),
        hostName: host ? host.name : 'Host',
        hostAvatar: host ? host.avatar : '🦊',
        players: room.players.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          isBot: p.isBot,
          cardCount: p.cardCount,
        })),
        activeColor: room.activeColor,
        topDiscardCard: room.getTopDiscard(),
        escrowPot: {
          amount: potAmount.toFixed(3),
          currency: room.currency,
          buyInAmount: room.buyInAmount,
        },
        isQuickMatch: room.isQuickMatch,
        currentTurnPlayerId: curPlayer?.id || null,
        turnTimeRemaining: room.turnTimeRemaining,
      };
    });
  }

  public broadcastPublicRooms(): void {
    try {
      const rooms = this.getPublicRooms();
      this.io.emit('rooms:updated', { rooms });
    } catch (err) {
      console.warn('[RoomManager] Failed to broadcast public rooms update:', err);
    }
  }

  public getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }
}
