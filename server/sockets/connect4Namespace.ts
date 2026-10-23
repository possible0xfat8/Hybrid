import { Server, Socket } from 'socket.io';
import {
  getConnect4PlayerStats,
  calculateConnect4EloDelta,
  settleConnect4MatchOnChain,
} from '../services/connect4Settlement';

export const ROWS = 6;
export const COLS = 7;

export type CellValue = 0 | 1 | 2; // 0 = empty, 1 = Player 1 (Orange), 2 = Player 2 (Gold)

export interface Connect4Player {
  socketId: string;
  address: string;
  displayName: string;
  avatar: string;
  elo: number;
  playerNumber: 1 | 2;
  ready: boolean;
  isBot?: boolean;
}

export interface Connect4Room {
  roomCode: string;
  gameId: string;
  players: Connect4Player[];
  board: CellValue[][]; // [row][col]
  currentTurn: 1 | 2;
  status: 'waiting' | 'playing' | 'game_over';
  winner: 1 | 2 | 'draw' | null;
  winningLine: [number, number][] | null;
  turnDeadline: number;
  timerInterval?: NodeJS.Timeout;
  settlementTxHash?: string;
  eloChanges?: {
    winnerAddress: string;
    loserAddress: string;
    winDelta: number;
    loseDelta: number;
  };
  isQuickMatch?: boolean;
}

export function checkConnect4Win(board: CellValue[][]): { winner: 1 | 2 | null; line: [number, number][] | null } {
  // 1. Horizontal Check (row, col)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const val = board[r][c];
      if (val !== 0 && val === board[r][c + 1] && val === board[r][c + 2] && val === board[r][c + 3]) {
        return {
          winner: val as 1 | 2,
          line: [
            [r, c],
            [r, c + 1],
            [r, c + 2],
            [r, c + 3],
          ],
        };
      }
    }
  }

  // 2. Vertical Check
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c < COLS; c++) {
      const val = board[r][c];
      if (val !== 0 && val === board[r + 1][c] && val === board[r + 2][c] && val === board[r + 3][c]) {
        return {
          winner: val as 1 | 2,
          line: [
            [r, c],
            [r + 1, c],
            [r + 2, c],
            [r + 3, c],
          ],
        };
      }
    }
  }

  // 3. Diagonal Down-Right (\)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const val = board[r][c];
      if (val !== 0 && val === board[r + 1][c + 1] && val === board[r + 2][c + 2] && val === board[r + 3][c + 3]) {
        return {
          winner: val as 1 | 2,
          line: [
            [r, c],
            [r + 1, c + 1],
            [r + 2, c + 2],
            [r + 3, c + 3],
          ],
        };
      }
    }
  }

  // 4. Diagonal Up-Right (/)
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const val = board[r][c];
      if (val !== 0 && val === board[r - 1][c + 1] && val === board[r - 2][c + 2] && val === board[r - 3][c + 3]) {
        return {
          winner: val as 1 | 2,
          line: [
            [r, c],
            [r - 1, c + 1],
            [r - 2, c + 2],
            [r - 3, c + 3],
          ],
        };
      }
    }
  }

  return { winner: null, line: null };
}

export function isBoardFull(board: CellValue[][]): boolean {
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === 0) return false;
  }
  return true;
}

export function getLowestEmptyRow(board: CellValue[][], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === 0) return r;
  }
  return -1; // Column full
}

// Bot AI helper: chooses winning move, blocks opponent win, or plays center
export function getBotBestMove(board: CellValue[][], botPlayer: 1 | 2): number {
  const opponent: 1 | 2 = botPlayer === 1 ? 2 : 1;

  // 1. Can bot win on this move?
  for (let c = 0; c < COLS; c++) {
    const r = getLowestEmptyRow(board, c);
    if (r !== -1) {
      board[r][c] = botPlayer;
      const { winner } = checkConnect4Win(board);
      board[r][c] = 0;
      if (winner === botPlayer) return c;
    }
  }

  // 2. Can opponent win on next move? Block them!
  for (let c = 0; c < COLS; c++) {
    const r = getLowestEmptyRow(board, c);
    if (r !== -1) {
      board[r][c] = opponent;
      const { winner } = checkConnect4Win(board);
      board[r][c] = 0;
      if (winner === opponent) return c;
    }
  }

  // 3. Prefer center columns (3, then 2 & 4, then 1 & 5, then 0 & 6)
  const preferredCols = [3, 2, 4, 1, 5, 0, 6];
  for (const c of preferredCols) {
    if (getLowestEmptyRow(board, c) !== -1) return c;
  }

  return 0;
}

export function initConnect4Namespace(io: Server) {
  const c4Namespace = io.of('/connect4');
  const rooms = new Map<string, Connect4Room>();
  const matchmakingQueue: Array<{
    socketId: string;
    address: string;
    displayName: string;
    avatar: string;
    elo: number;
  }> = [];

  const TURN_DURATION_SECONDS = 20;

  function createEmptyBoard(): CellValue[][] {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  }

  function broadcastRoomState(room: Connect4Room) {
    c4Namespace.to(room.roomCode).emit('room_state', {
      roomCode: room.roomCode,
      gameId: room.gameId,
      isQuickMatch: room.isQuickMatch,
      players: room.players.map((p) => ({
        socketId: p.socketId,
        address: p.address,
        displayName: p.displayName,
        avatar: p.avatar,
        elo: p.elo,
        playerNumber: p.playerNumber,
        isBot: p.isBot,
      })),
      board: room.board,
      currentTurn: room.currentTurn,
      status: room.status,
      winner: room.winner,
      winningLine: room.winningLine,
      turnDeadline: room.turnDeadline,
      settlementTxHash: room.settlementTxHash,
      eloChanges: room.eloChanges,
    });
  }

  function startTurnTimer(room: Connect4Room) {
    if (room.timerInterval) clearInterval(room.timerInterval);

    room.turnDeadline = Date.now() + TURN_DURATION_SECONDS * 1000;

    room.timerInterval = setInterval(() => {
      if (room.status !== 'playing') {
        if (room.timerInterval) clearInterval(room.timerInterval);
        return;
      }

      if (Date.now() >= room.turnDeadline) {
        // Current player timed out! Next player or random drop
        const validCols = [];
        for (let c = 0; c < COLS; c++) {
          if (getLowestEmptyRow(room.board, c) !== -1) validCols.push(c);
        }

        if (validCols.length > 0) {
          const randomCol = validCols[Math.floor(Math.random() * validCols.length)];
          handleDropDisc(room, room.currentTurn, randomCol);
        }
      }
    }, 1000);
  }

  async function handleGameOver(room: Connect4Room, winner: 1 | 2 | 'draw', winningLine: [number, number][] | null) {
    if (room.timerInterval) clearInterval(room.timerInterval);
    room.status = 'game_over';
    room.winner = winner;
    room.winningLine = winningLine;

    const p1 = room.players.find((p) => p.playerNumber === 1);
    const p2 = room.players.find((p) => p.playerNumber === 2);

    if (winner !== 'draw' && p1 && p2 && !p1.isBot && !p2.isBot) {
      const winnerPlayer = winner === 1 ? p1 : p2;
      const loserPlayer = winner === 1 ? p2 : p1;

      const deltas = calculateConnect4EloDelta(winnerPlayer.elo, loserPlayer.elo);
      room.eloChanges = {
        winnerAddress: winnerPlayer.address,
        loserAddress: loserPlayer.address,
        winDelta: deltas.winDelta,
        loseDelta: deltas.loseDelta,
      };

      // Trigger On-Chain Settlement asynchronously
      settleConnect4MatchOnChain({
        gameId: room.gameId,
        winnerAddress: winnerPlayer.address,
        loserAddress: loserPlayer.address,
        winDelta: deltas.winDelta,
        loseDelta: deltas.loseDelta,
      }).then((res) => {
        if (res.success && res.txHash) {
          room.settlementTxHash = res.txHash;
          broadcastRoomState(room);
        }
      });
    }

    broadcastRoomState(room);
  }

  function handleDropDisc(room: Connect4Room, playerNumber: 1 | 2, col: number): boolean {
    if (room.status !== 'playing' || room.currentTurn !== playerNumber) return false;
    if (col < 0 || col >= COLS) return false;

    const row = getLowestEmptyRow(room.board, col);
    if (row === -1) return false; // Column is full

    room.board[row][col] = playerNumber;

    // Check for win
    const { winner, line } = checkConnect4Win(room.board);
    if (winner) {
      handleGameOver(room, winner, line);
      return true;
    }

    // Check for draw
    if (isBoardFull(room.board)) {
      handleGameOver(room, 'draw', null);
      return true;
    }

    // Switch turns
    room.currentTurn = playerNumber === 1 ? 2 : 1;
    startTurnTimer(room);
    broadcastRoomState(room);

    // If opponent is a Bot, schedule bot move
    const nextPlayer = room.players.find((p) => p.playerNumber === room.currentTurn);
    if (nextPlayer && nextPlayer.isBot) {
      setTimeout(() => {
        if (room.status === 'playing' && room.currentTurn === nextPlayer.playerNumber) {
          const botCol = getBotBestMove(room.board, nextPlayer.playerNumber);
          handleDropDisc(room, nextPlayer.playerNumber, botCol);
        }
      }, 700);
    }

    return true;
  }

  c4Namespace.on('connection', (socket: Socket) => {
    console.log(`[Connect4] Socket connected: ${socket.id}`);

    // 1. Join matchmaking / Quick Match (Temporary server 1v1 matching)
    socket.on('join_matchmaking', async (data: { address: string; displayName?: string; avatar?: string }) => {
      const address = data.address || `0x${socket.id.slice(0, 8)}`;
      const stats = await getConnect4PlayerStats(address);
      const displayName = data.displayName || `${address.slice(0, 6)}...${address.slice(-4)}`;
      const avatar = data.avatar || '🦊';

      // Clean up any existing waiting room this socket might have previously opened
      for (const [code, r] of rooms.entries()) {
        if (r.status === 'waiting' && r.players.some((p) => p.socketId === socket.id)) {
          rooms.delete(code);
        }
      }

      // Try to find an existing open Quick Match waiting room
      let matchedRoom: Connect4Room | null = null;
      for (const [code, r] of rooms.entries()) {
        if (r.isQuickMatch && r.status === 'waiting' && r.players.length === 1) {
          const host = r.players[0];
          const hostSocket = c4Namespace.sockets.get(host.socketId);
          if (!hostSocket || !hostSocket.connected) {
            // Stale host socket - clean up room
            rooms.delete(code);
            continue;
          }
          if (host.socketId === socket.id) {
            // Don't match with yourself on the same socket
            continue;
          }
          matchedRoom = r;
          break;
        }
      }

      if (matchedRoom) {
        // Player 2 drops in! Temporary server activates and duel begins!
        let player2Name = displayName;
        if (matchedRoom.players[0].displayName === player2Name) {
          player2Name = `${player2Name} (P2)`;
        }

        matchedRoom.players.push({
          socketId: socket.id,
          address,
          displayName: player2Name,
          avatar,
          elo: stats.elo,
          playerNumber: 2,
          ready: true,
        });

        matchedRoom.status = 'playing';
        matchedRoom.currentTurn = 1;
        socket.join(matchedRoom.roomCode);

        console.log(
          `[Connect4] Quick Match started: Room ${matchedRoom.roomCode} between ${matchedRoom.players[0].displayName} (P1) and ${player2Name} (P2)`
        );

        startTurnTimer(matchedRoom);
        broadcastRoomState(matchedRoom);
      } else {
        // No waiting room available: Player 1 creates a temporary server room and waits
        const roomCode = `C4-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const gameId = `c4_${Date.now()}_${roomCode}`;

        const room: Connect4Room = {
          roomCode,
          gameId,
          isQuickMatch: true,
          players: [
            {
              socketId: socket.id,
              address,
              displayName,
              avatar,
              elo: stats.elo,
              playerNumber: 1,
              ready: true,
            },
          ],
          board: createEmptyBoard(),
          currentTurn: 1,
          status: 'waiting',
          winner: null,
          winningLine: null,
          turnDeadline: Date.now() + TURN_DURATION_SECONDS * 1000,
        };

        rooms.set(roomCode, room);
        socket.join(roomCode);

        console.log(`[Connect4] Quick Match temporary server room created: ${roomCode} by ${displayName}`);
        broadcastRoomState(room);
      }
    });

    socket.on('cancel_matchmaking', () => {
      for (const [code, r] of rooms.entries()) {
        if (r.status === 'waiting' && r.players.some((p) => p.socketId === socket.id)) {
          rooms.delete(code);
          console.log(`[Connect4] Cancelled waiting room: ${code}`);
        }
      }
      socket.emit('matchmaking_cancelled');
    });

    socket.on('leave_room', (data?: { roomCode?: string }) => {
      if (data?.roomCode) {
        const r = rooms.get(data.roomCode);
        if (r && r.status === 'waiting') {
          rooms.delete(data.roomCode);
        }
      }
      for (const [code, r] of rooms.entries()) {
        if (r.status === 'waiting' && r.players.some((p) => p.socketId === socket.id)) {
          rooms.delete(code);
        }
      }
      socket.emit('matchmaking_cancelled');
    });

    // 2. Play vs Bot (Instant solo match)
    socket.on('play_vs_bot', async (data: { address: string; displayName?: string; avatar?: string }) => {
      const address = data.address || `0x${socket.id.slice(0, 8)}`;
      const stats = await getConnect4PlayerStats(address);
      const displayName = data.displayName || `${address.slice(0, 6)}...${address.slice(-4)}`;
      const avatar = data.avatar || '🦊';

      const roomCode = `BOT-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const gameId = `c4_bot_${Date.now()}`;

      const room: Connect4Room = {
        roomCode,
        gameId,
        players: [
          {
            socketId: socket.id,
            address,
            displayName,
            avatar,
            elo: stats.elo,
            playerNumber: 1,
            ready: true,
          },
          {
            socketId: 'bot-internal',
            address: '0x000000000000000000000000000000000000B075',
            displayName: 'HemiBot 🤖',
            avatar: '🤖',
            elo: 1350,
            playerNumber: 2,
            ready: true,
            isBot: true,
          },
        ],
        board: createEmptyBoard(),
        currentTurn: 1,
        status: 'playing',
        winner: null,
        winningLine: null,
        turnDeadline: Date.now() + TURN_DURATION_SECONDS * 1000,
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);
      startTurnTimer(room);
      broadcastRoomState(room);
    });

    // 2b. Create Private Room
    socket.on('create_room', async (data: { address: string; displayName?: string; avatar?: string }) => {
      const address = data.address || `0x${socket.id.slice(0, 8)}`;
      const stats = await getConnect4PlayerStats(address);
      const displayName = data.displayName || `${address.slice(0, 6)}...${address.slice(-4)}`;
      const avatar = data.avatar || '🦊';

      const roomCode = `C4-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const gameId = `c4_${Date.now()}_${roomCode}`;

      const room: Connect4Room = {
        roomCode,
        gameId,
        players: [
          {
            socketId: socket.id,
            address,
            displayName,
            avatar,
            elo: stats.elo,
            playerNumber: 1,
            ready: true,
          },
        ],
        board: createEmptyBoard(),
        currentTurn: 1,
        status: 'waiting',
        winner: null,
        winningLine: null,
        turnDeadline: Date.now() + TURN_DURATION_SECONDS * 1000,
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);
      broadcastRoomState(room);
    });

    // 2c. Join Private Room
    socket.on('join_room', async (data: { roomCode: string; address: string; displayName?: string; avatar?: string }) => {
      const room = rooms.get(data.roomCode.trim().toUpperCase());
      if (!room) {
        socket.emit('error_message', { message: 'Room not found! Check the room code.' });
        return;
      }

      if (room.players.length >= 2) {
        socket.emit('error_message', { message: 'Room is already full!' });
        return;
      }

      const address = data.address || `0x${socket.id.slice(0, 8)}`;
      const stats = await getConnect4PlayerStats(address);
      const displayName = data.displayName || `${address.slice(0, 6)}...${address.slice(-4)}`;
      const avatar = data.avatar || '⚡';

      room.players.push({
        socketId: socket.id,
        address,
        displayName,
        avatar,
        elo: stats.elo,
        playerNumber: 2,
        ready: true,
      });

      room.status = 'playing';
      socket.join(room.roomCode);
      startTurnTimer(room);
      broadcastRoomState(room);
    });

    // 2d. Forfeit / Surrender
    socket.on('forfeit', (data: { roomCode: string }) => {
      const room = rooms.get(data.roomCode);
      if (!room || room.status !== 'playing') return;

      const forfeitingPlayer = room.players.find((p) => p.socketId === socket.id);
      if (!forfeitingPlayer) return;

      const winningPlayerNumber = forfeitingPlayer.playerNumber === 1 ? 2 : 1;
      handleGameOver(room, winningPlayerNumber, null);
    });

    // 3. Drop disc into column
    socket.on('drop_disc', (data: { roomCode: string; col: number }) => {
      const room = rooms.get(data.roomCode);
      if (!room) return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      handleDropDisc(room, player.playerNumber, data.col);
    });

    // 4. Rematch Request
    socket.on('rematch', (data: { roomCode: string }) => {
      const room = rooms.get(data.roomCode);
      if (!room) return;

      room.board = createEmptyBoard();
      room.currentTurn = 1;
      room.status = 'playing';
      room.winner = null;
      room.winningLine = null;
      room.settlementTxHash = undefined;
      room.eloChanges = undefined;
      room.gameId = `c4_${Date.now()}_${room.roomCode}`;

      startTurnTimer(room);
      broadcastRoomState(room);
    });

    // 5. In-Game Chat & Emotes
    socket.on('send_chat', (data: { roomCode: string; message: string }) => {
      const room = rooms.get(data.roomCode);
      if (!room) return;
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      c4Namespace.to(room.roomCode).emit('chat_message', {
        sender: player.displayName,
        playerNumber: player.playerNumber,
        message: data.message,
        timestamp: Date.now(),
      });
    });

    // 6. Disconnect
    socket.on('disconnect', () => {
      // 1. Clean up any waiting rooms created by this socket
      for (const [code, r] of rooms.entries()) {
        if (r.status === 'waiting' && r.players.some((p) => p.socketId === socket.id)) {
          rooms.delete(code);
          console.log(`[Connect4] Socket disconnected, cleaned up waiting room: ${code}`);
        }
      }

      // 2. Check if player in active room
      for (const [code, room] of rooms.entries()) {
        const player = room.players.find((p) => p.socketId === socket.id);
        if (player && room.status === 'playing') {
          const remaining = room.players.find((p) => p.socketId !== socket.id);
          if (remaining) {
            handleGameOver(room, remaining.playerNumber, null);
          }
        }
      }
    });
  });

  console.log('[ARCH] ✓ Initialized isolated namespace: /connect4');
}
