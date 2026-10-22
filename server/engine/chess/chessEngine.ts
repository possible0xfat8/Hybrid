import { Chess } from 'chess.js';
import { Namespace, Socket } from 'socket.io';
import { settleMatch, isSettlementEnabled } from '../../services/chess/matchSettlement';
import { recordChessMatchResult } from '../../services/chess/supabaseChess';

export interface PlayerSession {
  id: string;
  socketId: string;
  walletAddress?: string;
  playerName?: string;
  elo: number;
  avatar?: string;
  timeLeft: number;
  lastMoveTime: number;
}

export interface ChessGameInstance {
  gameId: string;
  status: 'active' | 'completed' | 'abandoned';
  game: Chess;
  players: {
    white: PlayerSession;
    black: PlayerSession;
  };
  spectators: Map<string, { socketId: string; name: string }>;
  timeControl: number; // in milliseconds
  drawOfferFrom: 'white' | 'black' | null;
  startTime: number;
  lastActivity: number;
  result?: {
    winner: 'white' | 'black' | 'draw';
    reason: string;
  };
  settlementPending?: boolean;
}

export class ChessEngine {
  private chessIo: Namespace;
  public activeGames: Map<string, ChessGameInstance> = new Map();
  public matchmakingQueue: { socketId: string; playerData: any; joinTime: number }[] = [];
  public playerSockets: Map<string, { walletAddress: string; playerName?: string }> = new Map();
  public walletToGame: Map<string, string> = new Map();
  private timerInterval: NodeJS.Timeout | null = null;

  constructor(chessIo: Namespace) {
    this.chessIo = chessIo;
    this.startClockTicker();
  }

  private startClockTicker() {
    if (this.timerInterval) return;

    this.timerInterval = setInterval(() => {
      const now = Date.now();

      for (const [gameId, instance] of this.activeGames.entries()) {
        if (instance.status !== 'active') continue;

        const currentTurn = instance.game.turn() === 'w' ? 'white' : 'black';
        const activePlayer = instance.players[currentTurn];
        const elapsed = now - activePlayer.lastMoveTime;
        const remaining = activePlayer.timeLeft - elapsed;

        if (remaining <= 0) {
          activePlayer.timeLeft = 0;
          instance.status = 'completed';
          const winner = currentTurn === 'white' ? 'black' : 'white';
          instance.result = { winner, reason: 'timeout' };

          this.handleGameOver(instance, winner, 'timeout');
        }
      }
    }, 1000);
  }

  public registerPlayer(socketId: string, walletAddress: string, playerName?: string) {
    this.playerSockets.set(socketId, {
      walletAddress: walletAddress.toLowerCase(),
      playerName,
    });
  }

  public removeSocket(socketId: string) {
    this.playerSockets.delete(socketId);
    this.matchmakingQueue = this.matchmakingQueue.filter((q) => q.socketId !== socketId);
  }

  public queuePlayer(socket: Socket, playerData: any) {
    // Remove if already queued
    this.matchmakingQueue = this.matchmakingQueue.filter((q) => q.socketId !== socket.id);

    // If someone is waiting in queue, match immediately!
    if (this.matchmakingQueue.length > 0) {
      const opponentQueue = this.matchmakingQueue.shift()!;
      const opponentSocket = this.chessIo.sockets.get(opponentQueue.socketId);

      if (!opponentSocket) {
        // Stale socket, retry queue
        this.queuePlayer(socket, playerData);
        return;
      }

      this.createMatch(socket, playerData, opponentSocket, opponentQueue.playerData);
    } else {
      this.matchmakingQueue.push({
        socketId: socket.id,
        playerData,
        joinTime: Date.now(),
      });
      socket.emit('queue_joined', { position: this.matchmakingQueue.length });
    }
  }

  public cancelQueue(socketId: string) {
    this.matchmakingQueue = this.matchmakingQueue.filter((q) => q.socketId !== socketId);
  }

  public createMatch(
    socket1: Socket,
    data1: any,
    socket2: Socket,
    data2: any
  ) {
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isWhiteFirst = Math.random() < 0.5;

    const whiteSocket = isWhiteFirst ? socket1 : socket2;
    const whiteData = isWhiteFirst ? data1 : data2;
    const blackSocket = isWhiteFirst ? socket2 : socket1;
    const blackData = isWhiteFirst ? data2 : data1;

    const timeControl = whiteData.timeControl || 600000; // 10 minutes default
    const now = Date.now();

    const whitePlayer: PlayerSession = {
      id: whiteData.walletAddress?.toLowerCase() || `player_w_${whiteSocket.id}`,
      socketId: whiteSocket.id,
      walletAddress: whiteData.walletAddress?.toLowerCase(),
      playerName: whiteData.playerName || 'White Player',
      elo: whiteData.elo || 1200,
      avatar: whiteData.avatar,
      timeLeft: timeControl,
      lastMoveTime: now,
    };

    const blackPlayer: PlayerSession = {
      id: blackData.walletAddress?.toLowerCase() || `player_b_${blackSocket.id}`,
      socketId: blackSocket.id,
      walletAddress: blackData.walletAddress?.toLowerCase(),
      playerName: blackData.playerName || 'Black Player',
      elo: blackData.elo || 1200,
      avatar: blackData.avatar,
      timeLeft: timeControl,
      lastMoveTime: now,
    };

    const instance: ChessGameInstance = {
      gameId,
      status: 'active',
      game: new Chess(),
      players: { white: whitePlayer, black: blackPlayer },
      spectators: new Map(),
      timeControl,
      drawOfferFrom: null,
      startTime: now,
      lastActivity: now,
    };

    this.activeGames.set(gameId, instance);

    if (whitePlayer.walletAddress) this.walletToGame.set(whitePlayer.walletAddress, gameId);
    if (blackPlayer.walletAddress) this.walletToGame.set(blackPlayer.walletAddress, gameId);

    whiteSocket.join(gameId);
    blackSocket.join(gameId);

    // Notify white player
    whiteSocket.emit('game_found', {
      gameId,
      orientation: 'white',
      timeControl,
      whiteTime: timeControl,
      blackTime: timeControl,
      opponent: {
        id: blackPlayer.id,
        name: blackPlayer.playerName,
        elo: blackPlayer.elo,
        avatar: blackPlayer.avatar,
        walletAddress: blackPlayer.walletAddress,
      },
    });

    // Notify black player
    blackSocket.emit('game_found', {
      gameId,
      orientation: 'black',
      timeControl,
      whiteTime: timeControl,
      blackTime: timeControl,
      opponent: {
        id: whitePlayer.id,
        name: whitePlayer.playerName,
        elo: whitePlayer.elo,
        avatar: whitePlayer.avatar,
        walletAddress: whitePlayer.walletAddress,
      },
    });

    console.log(`[CHESS:ENGINE] Match started: ${gameId} between ${whitePlayer.playerName} and ${blackPlayer.playerName}`);
  }

  public handleMove(socket: Socket, gameId: string, move: any) {
    const instance = this.activeGames.get(gameId);
    if (!instance || instance.status !== 'active') {
      socket.emit('error', { message: 'Game not active' });
      return;
    }

    const currentTurn = instance.game.turn() === 'w' ? 'white' : 'black';
    const isPlayerWhite = instance.players.white.socketId === socket.id;
    const isPlayerBlack = instance.players.black.socketId === socket.id;

    if (!isPlayerWhite && !isPlayerBlack) {
      socket.emit('error', { message: 'You are not a player in this game' });
      return;
    }

    const playerColor = isPlayerWhite ? 'white' : 'black';
    if (playerColor !== currentTurn) {
      socket.emit('invalid_move', { message: 'Not your turn' });
      return;
    }

    try {
      const moveResult = instance.game.move(move);
      if (!moveResult) {
        socket.emit('invalid_move', { message: 'Illegal move' });
        return;
      }

      const now = Date.now();
      const elapsed = now - instance.players[playerColor].lastMoveTime;
      instance.players[playerColor].timeLeft = Math.max(0, instance.players[playerColor].timeLeft - elapsed);

      const nextColor = playerColor === 'white' ? 'black' : 'white';
      instance.players[nextColor].lastMoveTime = now;
      instance.lastActivity = now;

      const fen = instance.game.fen();
      const isGameOver = instance.game.isGameOver();

      // Broadcast move to all participants in this room
      this.chessIo.to(gameId).emit('board_state', {
        fen,
        lastMove: { from: moveResult.from, to: moveResult.to },
        turn: instance.game.turn() === 'w' ? 'white' : 'black',
        whiteTime: instance.players.white.timeLeft,
        blackTime: instance.players.black.timeLeft,
        isCheck: instance.game.inCheck(),
        isCheckmate: instance.game.isCheckmate(),
        isDraw: instance.game.isDraw(),
      });

      if (isGameOver) {
        let winner: 'white' | 'black' | 'draw' = 'draw';
        let reason = 'draw';

        if (instance.game.isCheckmate()) {
          winner = playerColor;
          reason = 'checkmate';
        } else if (instance.game.isStalemate()) {
          reason = 'stalemate';
        } else if (instance.game.isThreefoldRepetition()) {
          reason = 'repetition';
        } else if (instance.game.isInsufficientMaterial()) {
          reason = 'insufficient_material';
        }

        instance.status = 'completed';
        instance.result = { winner, reason };
        this.handleGameOver(instance, winner, reason);
      }
    } catch (err: any) {
      socket.emit('invalid_move', { message: err.message });
    }
  }

  public handleResign(socket: Socket, gameId: string) {
    const instance = this.activeGames.get(gameId);
    if (!instance || instance.status !== 'active') return;

    const isWhite = instance.players.white.socketId === socket.id;
    const winner = isWhite ? 'black' : 'white';
    instance.status = 'completed';
    instance.result = { winner, reason: 'resignation' };

    this.handleGameOver(instance, winner, 'resignation');
  }

  public handleDrawOffer(socket: Socket, gameId: string) {
    const instance = this.activeGames.get(gameId);
    if (!instance || instance.status !== 'active') return;

    const isWhite = instance.players.white.socketId === socket.id;
    instance.drawOfferFrom = isWhite ? 'white' : 'black';

    const targetSocketId = isWhite
      ? instance.players.black.socketId
      : instance.players.white.socketId;

    this.chessIo.to(targetSocketId).emit('draw_offered');
  }

  public handleAcceptDraw(socket: Socket, gameId: string) {
    const instance = this.activeGames.get(gameId);
    if (!instance || instance.status !== 'active' || !instance.drawOfferFrom) return;

    instance.status = 'completed';
    instance.result = { winner: 'draw', reason: 'agreement' };
    this.handleGameOver(instance, 'draw', 'agreement');
  }

  public handleDeclineDraw(socket: Socket, gameId: string) {
    const instance = this.activeGames.get(gameId);
    if (!instance || instance.status !== 'active') return;

    instance.drawOfferFrom = null;
    const isWhite = instance.players.white.socketId === socket.id;
    const target = isWhite ? instance.players.black.socketId : instance.players.white.socketId;
    this.chessIo.to(target).emit('draw_declined');
  }

  private async handleGameOver(
    instance: ChessGameInstance,
    winner: 'white' | 'black' | 'draw',
    reason: string
  ) {
    console.log(`[CHESS:ENGINE] Game ${instance.gameId} Over: Winner=${winner}, Reason=${reason}`);

    // Broadcast game over
    this.chessIo.to(instance.gameId).emit('game_over', {
      winner,
      reason,
      finalFen: instance.game.fen(),
    });

    // Record game to Supabase game_history and update player stats
    try {
      const whiteAddr = instance.players.white.walletAddress || instance.players.white.id;
      const blackAddr = instance.players.black.walletAddress || instance.players.black.id;
      const totalMoves = instance.game.history().length;
      const gameDuration = Math.round((Date.now() - instance.startTime) / 1000);

      await recordChessMatchResult({
        gameId: instance.gameId,
        whiteAddress: whiteAddr,
        blackAddress: blackAddr,
        winner,
        reason,
        totalMoves,
        gameDuration,
        finalFen: instance.game.fen(),
      });
    } catch (dbErr: any) {
      console.warn('[CHESS:ENGINE] Error recording match to Supabase:', dbErr.message);
    }

    // Trigger on-chain settlement oracle
    if (isSettlementEnabled()) {
      this.chessIo.to(instance.gameId).emit('settlement_pending');

      try {
        const settlement = await settleMatch(
          instance.gameId,
          instance.players.white,
          instance.players.black,
          winner
        );

        this.chessIo.to(instance.gameId).emit('settlement_complete', {
          txHash: settlement.txHash,
          whiteEloChange: settlement.whiteEloChange,
          blackEloChange: settlement.blackEloChange,
          newWhiteElo: settlement.newWhiteElo,
          newBlackElo: settlement.newBlackElo,
        });
      } catch (err: any) {
        this.chessIo.to(instance.gameId).emit('settlement_error', {
          error: err.message,
        });
      }
    }
  }
}
