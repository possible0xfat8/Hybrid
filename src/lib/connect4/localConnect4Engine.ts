import { CellValue, ROWS, COLS } from '@/components/connect4/Connect4Board';
import { Connect4RoomState } from '@/components/connect4/Connect4GameApp';

export function checkConnect4Win(board: CellValue[][]): { winner: 1 | 2 | null; line: [number, number][] | null } {
  // 1. Horizontal Check
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
  return -1;
}

// Bot AI: chooses winning move, blocks opponent win, or plays center
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

  // 3. Center bias: [3, 2, 4, 1, 5, 0, 6]
  const columnPriority = [3, 2, 4, 1, 5, 0, 6];
  for (const c of columnPriority) {
    if (board[0][c] === 0) {
      // Avoid giving opponent an immediate win on top of our drop
      const r = getLowestEmptyRow(board, c);
      if (r > 0) {
        board[r][c] = botPlayer;
        board[r - 1][c] = opponent;
        const { winner } = checkConnect4Win(board);
        board[r][c] = 0;
        board[r - 1][c] = 0;
        if (winner === opponent) continue; // dangerous move
      }
      return c;
    }
  }

  // Fallback: any available column
  for (let c = 0; c < COLS; c++) {
    if (board[0][c] === 0) return c;
  }
  return 3;
}

export function createLocalConnect4Room(
  userAddress?: string,
  displayName?: string,
  avatar?: string,
  opponentName = 'Hemi Bot ⚡',
  opponentAvatar = '🤖'
): Connect4RoomState {
  const initialBoard: CellValue[][] = Array(ROWS)
    .fill(null)
    .map(() => Array(COLS).fill(0));

  const myAddr = userAddress || '';
  const myName = displayName || (userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Challenger');

  return {
    roomCode: `BOT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    gameId: `c4_local_${Date.now()}`,
    players: [
      {
        address: myAddr,
        displayName: myName,
        avatar: avatar || '🦊',
        elo: 1200,
        playerNumber: 1,
        isBot: false,
      },
      {
        address: '0xBot_AI',
        displayName: opponentName,
        avatar: opponentAvatar,
        elo: 1200,
        playerNumber: 2,
        isBot: true,
      },
    ],
    board: initialBoard,
    currentTurn: 1,
    status: 'playing',
    winner: null,
    winningLine: null,
    turnDeadline: Date.now() + 20000,
  };
}

export function executeLocalDrop(
  roomState: Connect4RoomState,
  playerNumber: 1 | 2,
  col: number
): { success: boolean; newState: Connect4RoomState } {
  if (roomState.status !== 'playing' || roomState.currentTurn !== playerNumber) {
    return { success: false, newState: roomState };
  }

  const newBoard = roomState.board.map((row) => [...row]);
  const row = getLowestEmptyRow(newBoard, col);
  if (row === -1) return { success: false, newState: roomState };

  newBoard[row][col] = playerNumber;

  const { winner, line } = checkConnect4Win(newBoard);
  if (winner) {
    return {
      success: true,
      newState: {
        ...roomState,
        board: newBoard,
        status: 'game_over',
        winner,
        winningLine: line,
      },
    };
  }

  if (isBoardFull(newBoard)) {
    return {
      success: true,
      newState: {
        ...roomState,
        board: newBoard,
        status: 'game_over',
        winner: 'draw',
        winningLine: null,
      },
    };
  }

  return {
    success: true,
    newState: {
      ...roomState,
      board: newBoard,
      currentTurn: playerNumber === 1 ? 2 : 1,
      turnDeadline: Date.now() + 20000,
    },
  };
}
