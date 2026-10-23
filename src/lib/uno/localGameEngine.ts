import { Card, CardColor, CardValue, GameState, Player } from '@/types/uno';

const COLORS: CardColor[] = ['red', 'blue', 'green', 'yellow'];
const SUIT_NUMBERS: CardValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '9'];

export function createLocalDeck(): Card[] {
  const deck: Card[] = [];

  for (const color of COLORS) {
    for (const num of SUIT_NUMBERS) {
      deck.push({ id: `c_${color}_${num}_1_${Math.random().toString(36).substring(2, 6)}`, color, value: num, label: num });
      deck.push({ id: `c_${color}_${num}_2_${Math.random().toString(36).substring(2, 6)}`, color, value: num, label: num });
    }

    deck.push({ id: `c_${color}_skip_1_${Math.random().toString(36).substring(2, 6)}`, color, value: 'skip', label: 'Skip' });
    deck.push({ id: `c_${color}_skip_2_${Math.random().toString(36).substring(2, 6)}`, color, value: 'skip', label: 'Skip' });

    deck.push({ id: `c_${color}_reverse_1_${Math.random().toString(36).substring(2, 6)}`, color, value: 'reverse', label: 'Reverse' });
    deck.push({ id: `c_${color}_reverse_2_${Math.random().toString(36).substring(2, 6)}`, color, value: 'reverse', label: 'Reverse' });

    deck.push({ id: `c_${color}_draw2_1_${Math.random().toString(36).substring(2, 6)}`, color, value: 'draw2', label: '+2' });
    deck.push({ id: `c_${color}_draw2_2_${Math.random().toString(36).substring(2, 6)}`, color, value: 'draw2', label: '+2' });
  }

  for (let i = 1; i <= 8; i++) {
    deck.push({ id: `c_crazy8_${i}_${Math.random().toString(36).substring(2, 6)}`, color: 'wild', value: '8', label: 'Crazy 8' });
  }

  for (let i = 1; i <= 4; i++) {
    deck.push({ id: `c_wild_draw4_${i}_${Math.random().toString(36).substring(2, 6)}`, color: 'wild', value: 'wild_draw4', label: 'Crazy Draw 4' });
  }

  return shuffleDeck(deck);
}

export function shuffleDeck<T>(array: T[]): T[] {
  const arr = [...array];
  for (let pass = 0; pass < 3; pass++) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  return arr;
}

export interface LocalPlayerSeed {
  name: string;
  avatar: string;
  address?: string;
}

const PRACTICE_ROOM_PRESETS: Record<string, { mode: string; bots: { name: string; avatar: string }[] }> = {
  CLSC: {
    mode: 'Classic',
    bots: [
      { name: 'LumiBear', avatar: '🐻' },
      { name: 'CyberPepe 🐸', avatar: '🐸' },
      { name: 'SoliditySam ⛓️', avatar: '⚡' },
    ],
  },
  STCK: {
    mode: 'Stacked Draw',
    bots: [
      { name: 'NeoDash', avatar: '🤖' },
      { name: 'ChadCard 💎', avatar: '🦁' },
    ],
  },
  TEAM: {
    mode: '2v2 Team',
    bots: [
      { name: 'Zyro', avatar: '🦊' },
      { name: 'SoliditySam ⛓️', avatar: '⚡' },
    ],
  },
  FAST: {
    mode: 'Speed 8',
    bots: [
      { name: 'Tobz', avatar: '🐱' },
      { name: 'CyberPepe 🐸', avatar: '🐸' },
    ],
  },
};

export function createLocalLobby(
  roomCode: string,
  humanPlayer: LocalPlayerSeed,
  options?: { isQuickMatch?: boolean; buyInAmount?: string }
): GameState {
  const cleanCode = roomCode.toUpperCase().trim();
  const isQuick = !!options?.isQuickMatch || cleanCode === 'QM' || cleanCode.startsWith('QM');
  const preset = isQuick
    ? { mode: 'Quick Match', bots: [] }
    : PRACTICE_ROOM_PRESETS[cleanCode] || {
        mode: 'Classic',
        bots: [
          { name: 'LumiBear', avatar: '🐻' },
          { name: 'CyberPepe 🐸', avatar: '🐸' },
        ],
      };

  const humanId = humanPlayer.address ? `wallet_${humanPlayer.address.toLowerCase()}` : `player_human_${Date.now()}`;
  const players: Player[] = [
    {
      id: humanId,
      name: humanPlayer.name || 'Player 1',
      avatar: humanPlayer.avatar || '🦊',
      isHost: true,
      isBot: false,
      isReady: true,
      isConnected: true,
      seatIndex: 0,
      cardCount: 0,
      hand: [],
      address: humanPlayer.address,
    },
  ];

  if (!isQuick) {
    preset.bots.forEach((b, idx) => {
      players.push({
        id: `bot_local_${idx}_${cleanCode.toLowerCase()}`,
        name: b.name,
        avatar: b.avatar,
        isHost: false,
        isBot: true,
        isReady: true,
        isConnected: true,
        seatIndex: idx + 1,
        cardCount: 0,
        hand: [],
      });
    });
  }

  const buyInVal = options?.buyInAmount || (isQuick ? '100' : '0');
  const isStaking = parseFloat(buyInVal) > 0;

  return {
    roomId: `local_room_${cleanCode.toLowerCase()}`,
    roomCode: cleanCode,
    hostId: humanId,
    status: 'lobby',
    players,
    isStaking,
    buyInAmount: buyInVal,
    minPlayersRequired: isQuick ? 2 : 3,
    customMode: preset.mode,
    isQuickMatch: isQuick,
    currentTurnPlayerId: null,
    currentTurnIndex: 0,
    turnDirection: 1,
    turnTimeRemaining: 15,
    turnTimeTotal: 15,
    topDiscardCard: null,
    activeColor: null,
    drawPileCount: 108,
    drawPendingForPlayer: false,
    drawnCard: null,
    pendingDrawCount: 0,
    lastActionMessage: isQuick
      ? `Quick Match Table #${cleanCode} ready! Waiting for real players to join.`
      : `Welcome to Table #${cleanCode}! Click "Start Game" to begin.`,
    bannerAlert: null,
    winner: null,
    escrowPot: {
      amount: isStaking ? (parseFloat(buyInVal) * players.length).toFixed(3) : '0.000',
      currency: 'CRAZY8',
      buyInAmount: buyInVal,
    },
  };
}

export function startLocalGame(state: GameState): { state: GameState; drawPile: Card[] } {
  let deck = createLocalDeck();
  const updatedPlayers: Player[] = state.players.map((p) => {
    const hand = deck.slice(0, 7);
    deck = deck.slice(7);
    return {
      ...p,
      hand,
      cardCount: hand.length,
      isReady: true,
    };
  });

  // Pick first non-wild card as top discard card
  let topIdx = deck.findIndex((c) => c.color !== 'wild' && c.value !== 'skip' && c.value !== 'reverse' && c.value !== 'draw2');
  if (topIdx === -1) topIdx = 0;
  const [topDiscard] = deck.splice(topIdx, 1);

  const activeColor = topDiscard.color === 'wild' ? 'red' : topDiscard.color;
  const firstPlayer = updatedPlayers[0];

  const newState: GameState = {
    ...state,
    status: 'playing',
    players: updatedPlayers,
    topDiscardCard: topDiscard,
    activeColor,
    currentTurnIndex: 0,
    currentTurnPlayerId: firstPlayer.id,
    turnDirection: 1,
    turnTimeRemaining: 15,
    turnTimeTotal: 15,
    drawPileCount: deck.length,
    pendingDrawCount: 0,
    drawPendingForPlayer: false,
    drawnCard: null,
    lastActionMessage: `Match started! ${firstPlayer.name}'s turn.`,
  };

  return { state: newState, drawPile: deck };
}

export function canPlayCard(card: Card, topCard: Card | null, activeColor: CardColor | null, pendingDrawCount: number = 0): boolean {
  if (pendingDrawCount > 0) {
    if (topCard?.value === 'draw2') {
      return card.value === 'draw2' || card.value === 'wild_draw4';
    }
    if (topCard?.value === 'wild_draw4') {
      return card.value === 'wild_draw4';
    }
    return false;
  }

  if (card.color === 'wild' || card.value === '8') {
    return true;
  }

  if (!topCard) return true;

  if (activeColor && card.color === activeColor) {
    return true;
  }

  if (card.color === topCard.color) {
    return true;
  }

  if (card.value === topCard.value) {
    return true;
  }

  return false;
}

export function executePlayerCardMove(
  state: GameState,
  drawPile: Card[],
  playerId: string,
  cardId: string,
  chosenColor?: CardColor
): { success: boolean; state: GameState; drawPile: Card[]; error?: string } {
  if (state.status !== 'playing') {
    return { success: false, state, drawPile, error: 'Match is not in progress' };
  }

  const playerIdx = state.players.findIndex((p) => p.id === playerId);
  if (playerIdx === -1 || state.currentTurnPlayerId !== playerId) {
    return { success: false, state, drawPile, error: 'Not your turn' };
  }

  const player = state.players[playerIdx];
  const cardIdx = (player.hand || []).findIndex((c) => c.id === cardId);
  if (cardIdx === -1) {
    return { success: false, state, drawPile, error: 'Card not in hand' };
  }

  const card = player.hand![cardIdx];
  if (!canPlayCard(card, state.topDiscardCard, state.activeColor, state.pendingDrawCount)) {
    return { success: false, state, drawPile, error: 'Invalid card move' };
  }

  // Remove card from hand
  const newHand = [...(player.hand || [])];
  newHand.splice(cardIdx, 1);

  // Check win
  if (newHand.length === 0) {
    const updatedPlayers = state.players.map((p, idx) =>
      idx === playerIdx ? { ...p, hand: [], cardCount: 0 } : p
    );
    const winState: GameState = {
      ...state,
      players: updatedPlayers,
      topDiscardCard: card,
      activeColor: card.color === 'wild' ? (chosenColor || 'red') : card.color,
      status: 'game_over',
      winner: {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        address: player.address,
      },
      lastActionMessage: `🏆 ${player.name} won the match!`,
    };
    return { success: true, state: winState, drawPile };
  }

  // Determine active color
  let newColor: CardColor = card.color;
  if (card.color === 'wild') {
    newColor = chosenColor || 'red';
  }

  // Compute next turn index and direction
  let newDirection = state.turnDirection;
  let skipSteps = 1;
  let newPendingDraw = state.pendingDrawCount;

  if (card.value === 'reverse') {
    newDirection = (newDirection * -1) as 1 | -1;
    if (state.players.length === 2) {
      skipSteps = 2; // In 2-player game, reverse acts as skip
    }
  } else if (card.value === 'skip') {
    skipSteps = 2;
  } else if (card.value === 'draw2') {
    newPendingDraw += 2;
  } else if (card.value === 'wild_draw4') {
    newPendingDraw += 4;
  }

  const playerCount = state.players.length;
  let nextIdx = (playerIdx + skipSteps * newDirection + playerCount * 100) % playerCount;

  // If pending draw and next player cannot defend, force draw cards
  let updatedDrawPile = [...drawPile];
  let updatedPlayers = state.players.map((p, idx) =>
    idx === playerIdx ? { ...p, hand: newHand, cardCount: newHand.length } : p
  );

  if (newPendingDraw > 0) {
    const nextPlayer = updatedPlayers[nextIdx];
    const canDefend = (nextPlayer.hand || []).some((c) =>
      canPlayCard(c, card, newColor, newPendingDraw)
    );

    if (!canDefend) {
      // Next player must draw pending cards and skip their turn!
      if (updatedDrawPile.length < newPendingDraw) {
        updatedDrawPile = shuffleDeck([...updatedDrawPile, ...createLocalDeck()]);
      }
      const drawnCards = updatedDrawPile.slice(0, newPendingDraw);
      updatedDrawPile = updatedDrawPile.slice(newPendingDraw);

      const nextHand = [...(nextPlayer.hand || []), ...drawnCards];
      updatedPlayers = updatedPlayers.map((p, idx) =>
        idx === nextIdx ? { ...p, hand: nextHand, cardCount: nextHand.length } : p
      );

      // Advance past this player who just ate the draw
      nextIdx = (nextIdx + newDirection + playerCount * 100) % playerCount;
      newPendingDraw = 0;
    }
  }

  const nextPlayer = updatedPlayers[nextIdx];
  const newState: GameState = {
    ...state,
    players: updatedPlayers,
    topDiscardCard: card,
    activeColor: newColor,
    turnDirection: newDirection,
    currentTurnIndex: nextIdx,
    currentTurnPlayerId: nextPlayer.id,
    turnTimeRemaining: 15,
    pendingDrawCount: newPendingDraw,
    drawPendingForPlayer: false,
    drawnCard: null,
    lastActionMessage: `${player.name} played ${card.label}. Now ${nextPlayer.name}'s turn.`,
  };

  return { success: true, state: newState, drawPile: updatedDrawPile };
}

export function executePlayerDrawMove(
  state: GameState,
  drawPile: Card[],
  playerId: string
): { success: boolean; state: GameState; drawPile: Card[]; drawnCard: Card | null; error?: string } {
  if (state.status !== 'playing' || state.currentTurnPlayerId !== playerId) {
    return { success: false, state, drawPile, drawnCard: null, error: 'Not your turn' };
  }

  let updatedDrawPile = [...drawPile];
  if (updatedDrawPile.length === 0) {
    updatedDrawPile = createLocalDeck();
  }

  const drawn = updatedDrawPile.shift()!;
  const playerIdx = state.players.findIndex((p) => p.id === playerId);
  const player = state.players[playerIdx];

  const newHand = [...(player.hand || []), drawn];
  const updatedPlayers = state.players.map((p, idx) =>
    idx === playerIdx ? { ...p, hand: newHand, cardCount: newHand.length } : p
  );

  const canPlay = canPlayCard(drawn, state.topDiscardCard, state.activeColor, state.pendingDrawCount);

  const newState: GameState = {
    ...state,
    players: updatedPlayers,
    drawPileCount: updatedDrawPile.length,
    drawPendingForPlayer: canPlay,
    drawnCard: canPlay ? drawn : null,
    lastActionMessage: `${player.name} drew a card.`,
  };

  return { success: true, state: newState, drawPile: updatedDrawPile, drawnCard: drawn };
}

export function executePlayerPassMove(
  state: GameState,
  playerId: string
): { success: boolean; state: GameState; error?: string } {
  if (state.status !== 'playing' || state.currentTurnPlayerId !== playerId) {
    return { success: false, state, error: 'Not your turn' };
  }

  const playerIdx = state.players.findIndex((p) => p.id === playerId);
  const playerCount = state.players.length;
  const nextIdx = (playerIdx + state.turnDirection + playerCount * 100) % playerCount;
  const nextPlayer = state.players[nextIdx];

  const newState: GameState = {
    ...state,
    currentTurnIndex: nextIdx,
    currentTurnPlayerId: nextPlayer.id,
    turnTimeRemaining: 15,
    drawPendingForPlayer: false,
    drawnCard: null,
    lastActionMessage: `${state.players[playerIdx].name} passed. Now ${nextPlayer.name}'s turn.`,
  };

  return { success: true, state: newState };
}

// Bot AI: selects and executes the smartest move for the active bot
export function runBotStep(
  state: GameState,
  drawPile: Card[]
): { state: GameState; drawPile: Card[]; played: boolean } {
  if (state.status !== 'playing') return { state, drawPile, played: false };

  const currentBot = state.players.find((p) => p.id === state.currentTurnPlayerId);
  if (!currentBot || !currentBot.isBot) return { state, drawPile, played: false };

  const hand = currentBot.hand || [];
  const playable = hand.filter((c) =>
    canPlayCard(c, state.topDiscardCard, state.activeColor, state.pendingDrawCount)
  );

  if (playable.length > 0) {
    // Choose non-wild card first to save wild Crazy 8
    const nonWild = playable.find((c) => c.color !== 'wild' && c.value !== '8');
    const chosen = nonWild || playable[0];

    // Pick most frequent color in hand for wild nomination
    const colorCounts: Record<CardColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
    hand.forEach((c) => {
      if (c.color !== 'wild') colorCounts[c.color]++;
    });
    const bestColor: CardColor = (['red', 'blue', 'green', 'yellow'] as CardColor[]).reduce((a, b) =>
      colorCounts[a] >= colorCounts[b] ? a : b
    );

    const res = executePlayerCardMove(state, drawPile, currentBot.id, chosen.id, bestColor);
    if (res.success) {
      return { state: res.state, drawPile: res.drawPile, played: true };
    }
  }

  // No playable card: Draw card
  const drawRes = executePlayerDrawMove(state, drawPile, currentBot.id);
  if (drawRes.success && drawRes.drawnCard) {
    if (canPlayCard(drawRes.drawnCard, state.topDiscardCard, state.activeColor, state.pendingDrawCount)) {
      const playDrawnRes = executePlayerCardMove(drawRes.state, drawRes.drawPile, currentBot.id, drawRes.drawnCard.id, 'red');
      if (playDrawnRes.success) {
        return { state: playDrawnRes.state, drawPile: playDrawnRes.drawPile, played: true };
      }
    }
  }

  // Pass turn
  const passRes = executePlayerPassMove(drawRes.state, currentBot.id);
  return { state: passRes.state, drawPile: drawRes.drawPile, played: true };
}
