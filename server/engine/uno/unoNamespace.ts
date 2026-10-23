import { Namespace, Socket } from 'socket.io';
import { RoomManager } from './roomManager';
import { serverDb } from './database';
import { CardColor } from '../../../src/types/uno';

export function setupUnoNamespace(unoIo: Namespace, roomManager: RoomManager) {
  unoIo.on('connection', (socket: Socket) => {
    console.log(`[UNO:SOCKET] Player connected to /uno namespace: ${socket.id}`);

    const getPlayerInCurrentRoom = () => {
      let room = roomManager.getRoomBySocket(socket.id);
      let player = room ? room.getPlayerBySocket(socket.id) : null;
      if (!room || !player) {
        const accId = roomManager.getAccountIdBySocket(socket.id);
        if (accId) {
          room = roomManager.getRoomByAccountId(accId) || room;
          if (room) {
            player = room.getPlayer(accId) || null;
            if (!player && accId.startsWith('wallet_')) {
              const cleanAddr = accId.replace('wallet_', '').toLowerCase();
              player = room.players.find(p => p.address && p.address.toLowerCase() === cleanAddr) || null;
            }
          }
        }
      }
      if (!room || !player) {
        for (const r of roomManager.getAllRooms()) {
          const p = r.players.find(pl => pl.socketId === socket.id);
          if (p) {
            room = r;
            player = p;
            break;
          }
        }
      }
      if (room && player) {
        player.socketId = socket.id;
        player.isConnected = true;
      }
      return { room, player };
    };

    socket.on('app:heartbeat', ({ accountId, roomCode, address }: { accountId?: string; roomCode?: string; address?: string }, callback?: any) => {
      const cleanAddress = address && typeof address === 'string' && address.trim().startsWith('0x') ? address.trim().toLowerCase() : undefined;
      const targetId = accountId || (cleanAddress ? `wallet_${cleanAddress}` : undefined);
      if (targetId) {
        serverDb.upsertUser({ id: targetId, address: cleanAddress, currentRoomCode: roomCode, status: 'online' });
      }
      if (roomCode) {
        const room = roomManager.getRoomByCode(roomCode);
        if (room) {
          const p = room.players.find(pl =>
            (targetId && pl.id.toLowerCase() === targetId.toLowerCase()) ||
            (cleanAddress && pl.address && pl.address.toLowerCase() === cleanAddress)
          );
          if (p) {
            p.isConnected = true;
            p.socketId = socket.id;
            (roomManager as any).socketToRoomId?.set(socket.id, room.roomId);
            (roomManager as any).socketToAccountId?.set(socket.id, p.id);
            room.spectators.delete(p.id);
          }
        }
      }
      if (typeof callback === 'function') callback({ success: true, timestamp: Date.now() });
    });

    socket.on('room:refresh_state', (callback?: any) => {
      const { room, player } = getPlayerInCurrentRoom();
      if (room && player) {
        player.socketId = socket.id;
        player.isConnected = true;
        const sanitized = room.getSanitizedStateForPlayer(player.id);
        socket.emit('game:state', sanitized);
        if (typeof callback === 'function') callback({ success: true, gameState: sanitized });
      } else {
        if (typeof callback === 'function') callback({ success: false });
      }
    });

    socket.on('session:resume', ({ accountId, roomCode, address }, callback) => {
      if (!accountId && !address) {
        if (typeof callback === 'function') callback({ success: false });
        return;
      }
      if (accountId) {
        serverDb.upsertUser({ id: accountId, address });
        socket.join(`user:${accountId}`);
      }
      if (address && address.startsWith('0x')) {
        socket.join(`wallet:${address.toLowerCase()}`);
      }

      const result = roomManager.resumeSession(accountId, socket.id, roomCode, address);
      if (result.success && result.room) {
        socket.join(result.room.roomId);
        const resolvedId = result.playerId || accountId;
        const sanitized = result.room.getSanitizedStateForPlayer(resolvedId);
        socket.emit('game:state', sanitized);

        if (typeof callback === 'function') {
          callback({
            success: true,
            roomCode: result.room.roomCode,
            roomId: result.room.roomId,
            isSpectator: result.isSpectator,
            playerId: resolvedId,
            gameState: sanitized,
          });
        }
      } else {
        if (typeof callback === 'function') callback({ success: false, roomNotFound: true });
      }
    });

    socket.on('room:quick_join', (payload: any, callback) => {
      const accountId = payload?.accountId || payload?.userId;
      const playerName = payload?.playerName;
      const avatar = payload?.avatar;
      const address = payload?.address;
      const cleanAddress = address && typeof address === 'string' && address.trim().startsWith('0x') ? address.trim().toLowerCase() : undefined;
      if (!cleanAddress) {
        if (typeof callback === 'function') callback({ success: false, error: 'Please connect your Web3 wallet to play Quick Match' });
        return;
      }

      const dbUser = serverDb.getUserByAddress(cleanAddress) || serverDb.upsertUser({ id: accountId || `wallet_${cleanAddress}`, address: cleanAddress, name: playerName, avatar });
      const validAccountId = dbUser.id;
      const resolvedName = dbUser.name || playerName || 'Player';
      const resolvedAvatar = dbUser.avatar || avatar || '🦊';

      socket.join(`user:${validAccountId}`);
      const buyIn = payload?.buyIn !== undefined && payload?.buyIn !== null && payload?.buyIn !== '' ? String(payload.buyIn) : '100';

      const result = roomManager.quickJoin(validAccountId, socket.id, resolvedName, resolvedAvatar, cleanAddress, buyIn);
      if (result.success && result.room) {
        socket.join(result.room.roomId);
        const resolvedId = result.playerId || validAccountId;
        const sanitized = result.room.getSanitizedStateForPlayer(resolvedId);
        socket.emit('game:state', sanitized);

        if (typeof callback === 'function') {
          callback({
            success: true,
            roomCode: result.room.roomCode,
            roomId: result.room.roomId,
            accountId: resolvedId,
            isHost: result.isHost,
            gameState: sanitized,
          });
        }
        roomManager.broadcastRoomState(result.room);
      } else {
        if (typeof callback === 'function') callback({ success: false, error: result.error || 'Could not find or create a match' });
      }
    });

    socket.on('profile:sync', (data: any, callback?: any) => {
      const targetId = data?.accountId || data?.id;
      const rawAddress = data?.address && typeof data.address === 'string' && data.address.trim().startsWith('0x')
        ? data.address.trim().toLowerCase()
        : undefined;

      const user = serverDb.upsertUser({
        id: targetId || (rawAddress ? `wallet_${rawAddress}` : `user_${Date.now()}`),
        address: rawAddress,
        name: data?.name,
        avatar: data?.avatar,
        bio: data?.bio,
      });

      if (user) {
        socket.join(`user:${user.id}`);
        if (user.address) socket.join(`wallet:${user.address.toLowerCase()}`);
        socket.emit('profile:synced', user);
        if (typeof callback === 'function') callback({ success: true, profile: user });
      }
    });

    socket.on('friends:list', ({ accountId }, callback) => {
      if (typeof callback === 'function') {
        const user = accountId ? serverDb.getUser(accountId) : null;
        callback({ friends: [], requestsReceived: [], requestsSent: [] });
      }
    });

    socket.on('friends:send_invite', ({ accountId, friendId, roomCode }, callback) => {
      const sender = serverDb.getUser(accountId);
      if (sender && friendId && roomCode) {
        unoIo.to(`user:${friendId}`).emit('invite:received', {
          senderId: sender.id,
          senderName: sender.name,
          senderAvatar: sender.avatar,
          roomCode,
          timestamp: Date.now(),
        });
      }
      if (typeof callback === 'function') callback({ success: true });
    });

    socket.on('room:create', ({ accountId, playerName, avatar, buyIn, address }, callback) => {
      try {
        const cleanAddress = address && typeof address === 'string' && address.trim().startsWith('0x') ? address.trim().toLowerCase() : undefined;
        if (!cleanAddress) {
          if (typeof callback === 'function') callback({ success: false, error: 'Please connect your Web3 wallet to create a table' });
          return;
        }

        const dbUser = serverDb.getUserByAddress(cleanAddress) || serverDb.upsertUser({ id: accountId || `wallet_${cleanAddress}`, address: cleanAddress, name: playerName, avatar });
        const validAccountId = dbUser.id;
        const resolvedName = dbUser.name || playerName || 'Player 1';
        const resolvedAvatar = dbUser.avatar || avatar || '🦊';

        const room = roomManager.createRoom(validAccountId, socket.id, resolvedName, resolvedAvatar, buyIn, cleanAddress);
        socket.join(room.roomId);
        socket.join(`user:${validAccountId}`);
        socket.join(`wallet:${cleanAddress}`);

        const sanitized = room.getSanitizedStateForPlayer(validAccountId);
        socket.emit('game:state', sanitized);

        if (typeof callback === 'function') {
          callback({
            success: true,
            roomCode: room.roomCode,
            roomId: room.roomId,
            accountId: validAccountId,
            gameState: sanitized,
          });
        }
        roomManager.broadcastRoomState(room);
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('room:join', ({ roomCode, accountId, playerName, avatar, address }, callback) => {
      try {
        const cleanAddress = address && typeof address === 'string' && address.trim().startsWith('0x') ? address.trim().toLowerCase() : undefined;
        if (!cleanAddress) {
          if (typeof callback === 'function') callback({ success: false, error: 'Please connect your Web3 wallet to join a table' });
          return;
        }

        const dbUser = serverDb.getUserByAddress(cleanAddress) || serverDb.upsertUser({ id: accountId || `wallet_${cleanAddress}`, address: cleanAddress, name: playerName, avatar });
        const validAccountId = dbUser.id;
        const resolvedName = dbUser.name || playerName || 'Player';
        const resolvedAvatar = dbUser.avatar || avatar || '🦁';

        const result = roomManager.joinRoom(roomCode, validAccountId, socket.id, resolvedName, resolvedAvatar, cleanAddress);
        if (result.success && result.room) {
          socket.join(result.room.roomId);
          const resolvedPlayerId = result.playerId || validAccountId;
          socket.join(`user:${resolvedPlayerId}`);
          socket.join(`wallet:${cleanAddress}`);

          const sanitized = result.room.getSanitizedStateForPlayer(resolvedPlayerId);
          socket.emit('game:state', sanitized);

          if (typeof callback === 'function') {
            callback({
              success: true,
              roomCode: result.room.roomCode,
              roomId: result.room.roomId,
              accountId: resolvedPlayerId,
              reconnected: result.reconnected,
              gameState: sanitized,
            });
          }
        } else {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
        }
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('room:spectate', ({ roomCode, accountId, spectatorName, avatar }, callback) => {
      try {
        const validAccountId = accountId || roomManager.getAccountIdBySocket(socket.id) || `acc_spec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const result = roomManager.joinAsSpectator(roomCode, validAccountId, socket.id, spectatorName, avatar);
        if (result.success && result.room) {
          socket.join(result.room.roomId);
          const resolvedPlayerId = result.playerId || validAccountId;
          const sanitized = result.room.getSanitizedStateForPlayer(resolvedPlayerId);
          socket.emit('game:state', sanitized);

          if (typeof callback === 'function') {
            callback({
              success: true,
              roomCode: result.room.roomCode,
              roomId: result.room.roomId,
              accountId: resolvedPlayerId,
              isSpectator: !result.isPlayerReconnect,
              gameState: sanitized,
            });
          }
        } else {
          if (typeof callback === 'function') callback({ success: false, error: result.error });
        }
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('rooms:get_public', (callback) => {
      if (typeof callback === 'function') callback({ rooms: roomManager.getPublicRooms() });
    });

    socket.on('room:toggle_ready', () => {
      const { room, player } = getPlayerInCurrentRoom();
      if (room && player) room.toggleReady(player.id);
    });

    socket.on('room:configure_stake', ({ buyIn }, callback) => {
      try {
        const { room, player } = getPlayerInCurrentRoom();
        if (!room || !player) {
          if (typeof callback === 'function') callback({ success: false, error: 'Room or player not found' });
          return;
        }
        const result = roomManager.configureRoomStake(room.roomCode, player.id, String(buyIn));
        if (typeof callback === 'function') callback(result);
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('room:add_bot', (callback) => {
      const { room, player } = getPlayerInCurrentRoom();
      if (!room || !player) {
        if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
        return;
      }
      if (room.isQuickMatch) {
        if (typeof callback === 'function') callback({ success: false, error: 'Bots are strictly forbidden in Quick Match contest rooms' });
        return;
      }
      if (room.hostId !== player.id) {
        if (typeof callback === 'function') callback({ success: false, error: 'Only the host can add bots' });
        return;
      }
      // RULE: When a bot is in the game, staking is strictly non-active!
      if (room.isStaking) {
        roomManager.refundAllRoomStakes(room, `Bot added to room #${room.roomCode}. Staking disabled.`);
        room.isStaking = false;
        room.buyInAmount = '0';
        room.addChatMessage({
          senderId: 'system',
          senderName: 'SYSTEM',
          senderAvatar: '🤖',
          text: 'Bot added to lobby. Staking is deactivated and all player stakes have been refunded.',
          isSystem: true,
        });
      }
      const success = room.addBot();
      if (typeof callback === 'function') callback({ success });
      roomManager.broadcastRoomState(room);
    });

    socket.on('room:remove_player', ({ playerId }) => {
      const { room, player } = getPlayerInCurrentRoom();
      if (room && player && room.hostId === player.id) {
        room.removePlayer(playerId);
        roomManager.broadcastRoomState(room);
      }
    });

    socket.on('game:start', (callback) => {
      try {
        const { room, player } = getPlayerInCurrentRoom();
        if (!room || !player) {
          if (typeof callback === 'function') callback({ success: false, error: 'Room or player not found' });
          return;
        }

        if (room.players.length < 2) {
          if (typeof callback === 'function') callback({ success: false, error: 'At least 2 players are required to start.' });
          return;
        }

        const started = room.startGame();
        if (typeof callback === 'function') callback({ success: started });
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('game:play_card', ({ cardId, chosenColor }: { cardId: string; chosenColor?: CardColor }, callback) => {
      try {
        const { room, player } = getPlayerInCurrentRoom();
        if (!room || !player) {
          if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
          return;
        }
        const res = room.playCard(player.id, cardId, chosenColor);
        if (typeof callback === 'function') callback(res);
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('game:draw_card', (callback) => {
      try {
        const { room, player } = getPlayerInCurrentRoom();
        if (!room || !player) {
          if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
          return;
        }
        const res = room.drawCard(player.id);
        if (typeof callback === 'function') callback(res);
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('game:pass_turn', (callback) => {
      try {
        const { room, player } = getPlayerInCurrentRoom();
        if (!room || !player) {
          if (typeof callback === 'function') callback({ success: false, error: 'Room not found' });
          return;
        }
        const res = room.passTurn(player.id);
        if (typeof callback === 'function') callback(res);
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('game:call_last_card', () => {
      const { room, player } = getPlayerInCurrentRoom();
      if (room && player) room.callLastCard(player.id);
    });

    socket.on('game:send_emote', ({ emoji, text }: { emoji: string; text?: string }) => {
      roomManager.sendEmote(socket.id, emoji, text);
    });

    socket.on('chat:send', ({ text }: { text: string }, callback) => {
      const result = roomManager.sendChatMessage(socket.id, text);
      if (typeof callback === 'function') callback(result);
    });

    socket.on('chat:history', (callback) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (typeof callback === 'function') callback({ messages: room ? room.messages : [] });
    });

    socket.on('room:leave', (callback) => {
      const accountId = roomManager.getAccountIdBySocket(socket.id);
      const room = roomManager.getRoomBySocket(socket.id);

      if (room && room.status === 'playing') {
        const isSeated = room.players.some((p) => p.id === accountId);
        if (isSeated) {
          socket.emit('game:error', { message: 'You cannot quit while game is in progress.' });
          if (typeof callback === 'function') callback({ success: false, error: 'Cannot quit in progress' });
          return;
        }
      }

      if (room) socket.leave(room.roomId);
      if (accountId) roomManager.handleLeaveRoom(accountId, socket.id);
      if (typeof callback === 'function') callback({ success: true });
    });

    socket.on('game:rematch', () => {
      const { room, player } = getPlayerInCurrentRoom();
      if (room && player) room.rematch();
    });

    socket.on('disconnect', () => {
      console.log(`[UNO:SOCKET] Player disconnected from /uno namespace: ${socket.id}`);
      roomManager.handleDisconnect(socket.id);
    });
  });
}
