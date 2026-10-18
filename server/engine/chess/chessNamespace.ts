import { Namespace, Socket } from 'socket.io';
import { ChessEngine } from './chessEngine';

export function setupChessNamespace(chessIo: Namespace, engine: ChessEngine) {
  chessIo.on('connection', (socket: Socket) => {
    console.log(`[CHESS:SOCKET] Player connected to /chess namespace: ${socket.id}`);

    socket.on('register_player', ({ walletAddress, playerName }) => {
      if (walletAddress) {
        engine.registerPlayer(socket.id, walletAddress, playerName);
        socket.join(`wallet:${walletAddress.toLowerCase()}`);
      }
    });

    socket.on('check_active_session', ({ walletAddress }) => {
      if (!walletAddress) return;
      const gameId = engine.walletToGame.get(walletAddress.toLowerCase());
      if (gameId) {
        const instance = engine.activeGames.get(gameId);
        if (instance && instance.status === 'active') {
          socket.join(gameId);
          const isWhite = instance.players.white.walletAddress?.toLowerCase() === walletAddress.toLowerCase();
          const playerColor = isWhite ? 'white' : 'black';
          const opponent = isWhite ? instance.players.black : instance.players.white;

          socket.emit('game_restored', {
            gameId,
            orientation: playerColor,
            fen: instance.game.fen(),
            turn: instance.game.turn() === 'w' ? 'white' : 'black',
            timeControl: instance.timeControl,
            whiteTime: instance.players.white.timeLeft,
            blackTime: instance.players.black.timeLeft,
            opponent: {
              name: opponent.playerName,
              elo: opponent.elo,
              avatar: opponent.avatar,
              walletAddress: opponent.walletAddress,
            },
          });
        }
      }
    });

    socket.on('find_match', (playerData) => {
      engine.queuePlayer(socket, playerData);
    });

    socket.on('cancel_matchmaking', () => {
      engine.cancelQueue(socket.id);
      socket.emit('matchmaking_cancelled');
    });

    socket.on('make_move', ({ gameId, move }) => {
      engine.handleMove(socket, gameId, move);
    });

    socket.on('offer_draw', ({ gameId }) => {
      engine.handleDrawOffer(socket, gameId);
    });

    socket.on('accept_draw', ({ gameId }) => {
      engine.handleAcceptDraw(socket, gameId);
    });

    socket.on('decline_draw', ({ gameId }) => {
      engine.handleDeclineDraw(socket, gameId);
    });

    socket.on('resign', ({ gameId }) => {
      engine.handleResign(socket, gameId);
    });

    socket.on('join_game_room', ({ gameId }) => {
      const instance = engine.activeGames.get(gameId);
      if (instance) {
        socket.join(gameId);
        socket.emit('board_state', {
          fen: instance.game.fen(),
          turn: instance.game.turn() === 'w' ? 'white' : 'black',
          whiteTime: instance.players.white.timeLeft,
          blackTime: instance.players.black.timeLeft,
        });
      }
    });

    socket.on('spectate_game', ({ gameId }) => {
      const instance = engine.activeGames.get(gameId);
      if (instance) {
        socket.join(gameId);
        instance.spectators.set(socket.id, { socketId: socket.id, name: 'Spectator' });
        socket.emit('spectate_joined', {
          gameId,
          fen: instance.game.fen(),
          whitePlayer: instance.players.white,
          blackPlayer: instance.players.black,
        });
        chessIo.to(gameId).emit('spectator_count_updated', {
          count: instance.spectators.size,
        });
      }
    });

    socket.on('leave_spectate', ({ gameId }) => {
      const instance = engine.activeGames.get(gameId);
      if (instance) {
        socket.leave(gameId);
        instance.spectators.delete(socket.id);
        chessIo.to(gameId).emit('spectator_count_updated', {
          count: instance.spectators.size,
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[CHESS:SOCKET] Player disconnected from /chess namespace: ${socket.id}`);
      engine.removeSocket(socket.id);
    });
  });
}
