import crypto from 'crypto';
import { Card, CardColor, CardValue, GameState, Player, BannerType, SettlementSignature, CardsDrawnEvent, CardPlayedEvent, ChatMessage, isWildCard, isDefenseCard, isActionCard } from '../../../src/types/uno';
import { serverDb } from './database';

const COLORS: CardColor[] = ['red', 'blue', 'green', 'yellow'];
// In Crazy 8, '8' is the universal rainbow wild card (Crazy 8).
// Color suits contain numbers: 0, 1, 2, 3, 4, 5, 6, 7, and 9 (NO colored 8s).
const SUIT_NUMBERS: CardValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '9'];

let globalCardIdCounter = 1;

export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const color of COLORS) {
    // 2x of each number '0' through '7' and '9' per color (18 per color * 4 = 72 number cards)
    for (const num of SUIT_NUMBERS) {
      deck.push({
        id: `c_${color}_${num}_1`,
        color,
        value: num,
        label: num,
      });
      deck.push({
        id: `c_${color}_${num}_2`,
        color,
        value: num,
        label: num,
      });
    }

    // 2x "Skip" cards per color (8 total)
    deck.push({
      id: `c_${color}_skip_1`,
      color,
      value: 'skip',
      label: 'Skip',
    });
    deck.push({
      id: `c_${color}_skip_2`,
      color,
      value: 'skip',
      label: 'Skip',
    });

    // 2x "Reverse" cards per color (8 total)
    deck.push({
      id: `c_${color}_reverse_1`,
      color,
      value: 'reverse',
      label: 'Reverse',
    });
    deck.push({
      id: `c_${color}_reverse_2`,
      color,
      value: 'reverse',
      label: 'Reverse',
    });

    // 2x "+2" (Draw 2) cards per color (8 total)
    deck.push({
      id: `c_${color}_draw2_1`,
      color,
      value: 'draw2',
      label: '+2',
    });
    deck.push({
      id: `c_${color}_draw2_2`,
      color,
      value: 'draw2',
      label: '+2',
    });
  }

  // 8x "Crazy 8" universal wild cards (Universal Rainbow Wilds, 8 total)
  for (let i = 1; i <= 8; i++) {
    deck.push({
      id: `c_crazy8_${i}`,
      color: 'wild',
      value: '8',
      label: 'Crazy 8',
    });
  }

  // 4x "Crazy Draw 4" (+4) universal wild cards (Universal Rainbow Wild +4, 4 total)
  for (let i = 1; i <= 4; i++) {
    deck.push({
      id: `c_wild_draw4_${i}`,
      color: 'wild',
      value: 'wild_draw4',
      label: 'Crazy Draw 4',
    });
  }

  if (deck.length !== 108) {
    throw new Error(`Invalid deck initialization: expected 108 cards, got ${deck.length}`);
  }

  // Perform 7-pass cryptographically secure shuffle
  return shuffle(deck, 7);
}


export function shuffle<T>(array: T[], passes = 7): T[] {
  const arr = [...array];
  if (arr.length <= 1) return arr;

  for (let pass = 0; pass < passes; pass++) {
    for (let i = arr.length - 1; i > 0; i--) {
      // Use crypto.randomInt for true high-entropy randomness
      const j = crypto.randomInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // Random cut pass to break any remaining sequential clusters
    if (arr.length > 2) {
      const cutPoint = crypto.randomInt(1, arr.length);
      const cut = arr.splice(0, cutPoint);
      arr.push(...cut);
    }
  }
  return arr;
}

export class GameRoom {
  public roomId: string;
  public roomCode: string;
  public hostId: string;
  public status: 'lobby' | 'playing' | 'game_over' = 'lobby';
  public players: Player[] = [];
  public currentTurnIndex: number = 0;
  public turnDirection: 1 | -1 = 1;
  public turnTimeRemaining: number = 20;
  public readonly turnTimeTotal: number = 20;

  public drawPile: Card[] = [];
  public discardPile: Card[] = [];
  public activeColor: CardColor | null = null;
  public drawPendingForPlayer: boolean = false;
  public drawnCard: Card | null = null;
  public pendingDrawCount: number = 0; // Defended / stacked draw cards pending (+2, +4)
  public lastActionMessage: string | null = null;
  public bannerAlert: GameState['bannerAlert'] = null;
  public winner: GameState['winner'] = null;
  public settlementSignature: SettlementSignature | null = null;

  public buyInAmount: string = '100';
  public isStaking: boolean = true;
  public currency: string = 'CRAZY8';
  public customMode?: string;
  public description?: string;
  public isQuickMatch: boolean = false;
  public isSeededPublic: boolean = false;

  public spectators: Map<string, { id: string; socketId: string; name: string; avatar: string }> = new Map();
  public messages: ChatMessage[] = [];
  public cardsPlayedPerPlayer: Record<string, number> = {};
  public playerStakes: Map<string, number> = new Map();

  public recordStake(playerId: string, amount: number): void {
    if (this.isStaking && amount > 0) {
      this.playerStakes.set(playerId, amount);
      this.emitUpdate();
    }
  }

  public removeStake(playerId: string): number {
    const amount = this.playerStakes.get(playerId) || 0;
    this.playerStakes.delete(playerId);
    this.emitUpdate();
    return amount;
  }

  public hasPlayerStaked(playerId: string): boolean {
    return this.playerStakes.has(playerId);
  }

  public getPlayerStake(playerId: string): number {
    return this.playerStakes.get(playerId) || 0;
  }

  public getAllStakes(): [string, number][] {
    return Array.from(this.playerStakes.entries());
  }

  public clearStakes(): void {
    this.playerStakes.clear();
    this.emitUpdate();
  }

  public getPotAmount(): number {
    if (!this.isStaking || parseFloat(this.buyInAmount || '0') <= 0) return 0;
    let total = 0;
    for (const stake of this.playerStakes.values()) {
      total += stake;
    }
    // Fallback if players are present but stakes haven't been individually mapped
    if (total === 0 && this.players.length > 0) {
      total = this.players.length * parseFloat(this.buyInAmount || '0');
    }
    return total;
  }

  private turnInterval: NodeJS.Timeout | null = null;
  private onStateChangeCallback: (() => void) | null = null;
  private onSoundCallback: ((sound: string) => void) | null = null;
  private onShakeCallback: ((intensity: number) => void) | null = null;
  private onCardsDrawnCallback: ((data: CardsDrawnEvent) => void) | null = null;
  private onCardPlayedCallback: ((data: CardPlayedEvent) => void) | null = null;
  private onChatMessageCallback: ((msg: ChatMessage) => void) | null = null;
  private onGameOverCallback: ((winner: Player, players: Player[], pot: string, cardsPlayedMap: Record<string, number>) => void) | null = null;

  constructor(roomId: string, roomCode: string, hostId: string) {
    this.roomId = roomId;
    this.roomCode = roomCode;
    this.hostId = hostId;
  }

  public setCallbacks(
    onStateChange: () => void,
    onSound: (sound: string) => void,
    onShake: (intensity: number) => void,
    onCardsDrawn: (data: CardsDrawnEvent) => void,
    onCardPlayed: (data: CardPlayedEvent) => void,
    onChatMessage?: (msg: ChatMessage) => void,
    onGameOver?: (winner: Player, players: Player[], pot: string, cardsPlayedMap: Record<string, number>) => void
  ) {
    this.onStateChangeCallback = onStateChange;
    this.onSoundCallback = onSound;
    this.onShakeCallback = onShake;
    this.onCardsDrawnCallback = onCardsDrawn;
    this.onCardPlayedCallback = onCardPlayed;
    if (onChatMessage) {
      this.onChatMessageCallback = onChatMessage;
    }
    if (onGameOver) {
      this.onGameOverCallback = onGameOver;
    }
  }

  public addSpectator(id: string, socketId: string, name: string, avatar: string): void {
    // A seated player in this room must NEVER be added to spectators
    if (this.players.some(p => p.id === id || (p.socketId && p.socketId === socketId))) {
      return;
    }
    const existing = this.spectators.get(id);
    if (!existing) {
      this.addChatMessage({
        senderId: 'system',
        senderName: 'SYSTEM',
        senderAvatar: '👁️',
        text: `${name} joined as a spectator`,
        isSystem: true,
      });
    }
    this.spectators.set(id, { id, socketId, name, avatar });
    this.emitUpdate();
  }

  public removeSpectator(id: string): void {
    const spec = this.spectators.get(id);
    if (spec) {
      this.spectators.delete(id);
      this.emitUpdate();
    }
  }

  public getPlayer(playerId: string): Player | null {
    return this.players.find(p => p.id === playerId) || null;
  }

  public getPlayerBySocket(socketId: string): Player | null {
    return this.players.find(p => p.socketId === socketId) || null;
  }

  public addChatMessage(data: Omit<ChatMessage, 'id' | 'timestamp' | 'roomId' | 'roomCode'>): ChatMessage {
    const msg: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      roomId: this.roomId,
      roomCode: this.roomCode,
      timestamp: Date.now(),
      ...data,
    };
    this.messages.push(msg);
    if (this.messages.length > 60) {
      this.messages.shift();
    }
    if (this.onChatMessageCallback) {
      this.onChatMessageCallback(msg);
    }
    return msg;
  }

  private triggerCardsDrawn(data: CardsDrawnEvent): void {
    if (this.onCardsDrawnCallback) {
      this.onCardsDrawnCallback(data);
    }
  }

  private triggerCardPlayed(data: CardPlayedEvent): void {
    if (this.onCardPlayedCallback) {
      this.onCardPlayedCallback(data);
    }
  }

  public addPlayer(player: Omit<Player, 'seatIndex' | 'cardCount' | 'hand' | 'isReady'>): Player | null {
    // Check if player already exists in this room (reconnection support)
    const existing = this.players.find(p => p.id === player.id);
    if (existing) {
      existing.isConnected = true;
      if (player.socketId) existing.socketId = player.socketId;
      if (player.name) existing.name = player.name;
      if (player.avatar) existing.avatar = player.avatar;
      if (player.address) existing.address = player.address;

      // Check if current host is a bot or room has no human host; if so, this returning human becomes host!
      const currentHost = this.players.find(p => p.id === this.hostId);
      if (!existing.isBot && (!currentHost || currentHost.isBot)) {
        this.players.forEach(p => {
          if (p.isBot) p.isHost = false;
        });
        existing.isHost = true;
        this.hostId = existing.id;
      }

      this.emitUpdate();
      return existing;
    }

    if (this.players.length >= 5) return null;
    if (this.status !== 'lobby') return null;

    // RULE: The first real human user who joins takes the host seat!
    // If the room currently has a bot host or no human host, promote this real user to host.
    const currentHost = this.players.find(p => p.id === this.hostId);
    const hostIsBot = !currentHost || currentHost.isBot;
    const shouldBecomeHost = !player.isBot && (hostIsBot || !this.players.some(p => !p.isBot && p.isHost));

    const newPlayer: Player = {
      ...player,
      seatIndex: this.players.length,
      cardCount: 0,
      hand: [],
      isHost: shouldBecomeHost ? true : player.isHost,
      isReady: !!player.isBot, // Every real player (including host) must explicitly click "I am Ready!"
      score: player.score ?? 0,
      wins: player.wins ?? 0,
      roundsPlayed: player.roundsPlayed ?? 0,
      lastRoundScore: 0,
    };

    if (shouldBecomeHost) {
      // Demote any bot that was previously host
      this.players.forEach(p => {
        if (p.isBot) p.isHost = false;
      });
      this.hostId = newPlayer.id;
    }

    if (newPlayer.isBot) {
      // RULE: When a bot is in the game, staking is strictly non-active!
      this.isStaking = false;
      this.buyInAmount = '0';
      this.clearStakes();
    }

    this.players.push(newPlayer);
    this.emitUpdate();
    return newPlayer;
  }

  public removePlayer(playerId: string): void {
    const pIndex = this.players.findIndex(p => p.id === playerId);
    if (pIndex === -1) return;

    const removed = this.players[pIndex];
    this.players.splice(pIndex, 1);
    if (this.status === 'lobby') {
      this.removeStake(playerId);
    }

    // Re-index seats
    this.players.forEach((p, idx) => {
      p.seatIndex = idx;
    });

    // If host left, reassign host to the first real human player, otherwise first bot
    if (removed.isHost && this.players.length > 0) {
      const nextHuman = this.players.find(p => !p.isBot);
      const newHost = nextHuman || this.players[0];
      newHost.isHost = true;
      this.hostId = newHost.id;
    }

    if (this.status === 'playing') {
      if (this.players.length < 2) {
        // Not enough players to continue
        this.status = 'game_over';
        if (this.players.length === 1) {
          this.winner = {
            id: this.players[0].id,
            name: this.players[0].name,
            avatar: this.players[0].avatar,
            address: this.players[0].address,
          };
          this.createSettlement();
        }
        this.stopTurnTimer();
      } else {
        // Adjust turn index if needed
        if (pIndex <= this.currentTurnIndex) {
          this.currentTurnIndex = (this.currentTurnIndex - 1 + this.players.length) % this.players.length;
        }
        this.resetTurnTimer();
      }
    }

    this.emitUpdate();
  }

  public toggleReady(playerId: string): void {
    const p = this.players.find(pl => pl.id === playerId);
    if (p && !p.isBot) {
      p.isReady = !p.isReady;
      this.emitUpdate();
    }
  }

  public addBot(): boolean {
    // In Quick Match, bots are STRICTLY FORBIDDEN (real players only)
    if (this.isQuickMatch) return false;
    if (this.players.length >= 5 || this.status !== 'lobby') return false;
    const botNames = ['HemiBot ⚡', 'CyberPepe 🐸', 'SoliditySam ⛓️', 'ChadCard 💎', 'QuantumByte 🤖'];
    const botAvatars = ['🤖', '🐸', '⚡', '🦁', '🦊'];
    const botIndex = this.players.filter(p => p.isBot).length;
    const name = botNames[botIndex % botNames.length];
    const avatar = botAvatars[botIndex % botAvatars.length];

    this.addPlayer({
      id: `bot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      avatar,
      isHost: false,
      isBot: true,
      isConnected: true,
      address: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`,
    });
    return true;
  }

  public canStart(): boolean {
    // STRICT REQUIREMENT: More than 2 players required (minimum 3 players up to 5)
    if (this.players.length <= 2 || this.players.length > 5) return false;
    // ALL seated players (including host) must click "I am Ready!" (bots are automatically ready)
    return this.players.every(p => p.isReady || p.isBot);
  }

  public startGame(): boolean {
    if (!this.canStart() || this.status !== 'lobby') return false;

    this.status = 'playing';
    this.drawPile = createDeck();
    this.discardPile = [];
    this.turnDirection = 1;
    // Randomize starting player so any seated player can start, not only the host
    this.currentTurnIndex = Math.floor(Math.random() * this.players.length);
    this.drawPendingForPlayer = false;
    this.drawnCard = null;
    this.pendingDrawCount = 0;
    this.winner = null;
    this.settlementSignature = null;

    // Reset player hands
    for (const player of this.players) {
      player.hand = [];
      player.cardCount = 0;
      player.hasCalledLastCard = false;
    }

    // STRICT CARD MOVEMENT: Deal 7 cards per player by pop() from drawPile and push() to playerHand
    for (let round = 0; round < 7; round++) {
      for (const player of this.players) {
        const card = this.drawPile.pop();
        if (card) {
          player.hand!.push(card);
        }
      }
    }

    for (const player of this.players) {
      player.cardCount = player.hand!.length;
      player.hasCalledLastCard = false;
    }

    // Flip top card for discard pile (clean start: must be a colored number card, not wild or action)
    // Strictly preserve cards by popping and unshifting any non-number cards to the bottom of drawPile
    const tempHeld: Card[] = [];
    let startCard = this.drawPile.pop()!;
    while (isWildCard(startCard) || isActionCard(startCard)) {
      tempHeld.push(startCard);
      startCard = this.drawPile.pop()!;
    }
    if (tempHeld.length > 0) {
      this.drawPile.unshift(...tempHeld);
    }

    this.discardPile.push(startCard);
    this.activeColor = startCard.color;

    this.lastActionMessage = `Game started! First card is ${startCard.color.toUpperCase()} ${startCard.label}.`;
    this.triggerSound('deal');

    this.resetTurnTimer();
    this.emitUpdate();

    this.checkBotTurn();
    return true;
  }

  public getCurrentPlayer(): Player | null {
    if (this.players.length === 0) return null;
    return this.players[this.currentTurnIndex] || null;
  }

  public getTopDiscard(): Card | null {
    if (this.discardPile.length === 0) return null;
    return this.discardPile[this.discardPile.length - 1];
  }

  public playCard(playerId: string, cardId: string, chosenColor?: CardColor): { success: boolean; error?: string } {
    const curPlayer = this.getCurrentPlayer();
    if (!curPlayer || curPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    const cardIndex = curPlayer.hand?.findIndex(c => c.id === cardId) ?? -1;
    if (cardIndex === -1 || !curPlayer.hand) {
      return { success: false, error: 'Card not in hand' };
    }

    const card = curPlayer.hand[cardIndex];
    const topCard = this.getTopDiscard();
    const isWild = isWildCard(card);

    // Defensive Stacking Validation
    if (this.pendingDrawCount > 0) {
      if (!isDefenseCard(card)) {
        return {
          success: false,
          error: `Under attack! Must play +2 or +4 to defend, or tap Draw to take the +${this.pendingDrawCount} cards!`,
        };
      }
    } else {
      const matchesColor = card.color === this.activeColor;
      const matchesValue = topCard && card.value === topCard.value;

      if (!isWild && !matchesColor && !matchesValue) {
        return { success: false, error: `Invalid move: Card must match color ${this.activeColor?.toUpperCase()} or value ${topCard?.label}` };
      }
    }

    if (isWild && !chosenColor) {
      return { success: false, error: 'Color nomination required for Wild card' };
    }

    // 2. STRICT CARD MOVEMENT: Remove from playerHand and push() to discardPile array
    curPlayer.hand.splice(cardIndex, 1);
    curPlayer.cardCount = curPlayer.hand.length;

    // When a wild card is played, the played card on the discard pile reflects the nominated color
    const playedCard: Card = (isWild && chosenColor)
      ? {
          ...card,
          color: chosenColor,
          label: card.value === 'wild_draw4'
            ? `Crazy Draw 4 (${chosenColor.toUpperCase()})`
            : `Crazy 8 (${chosenColor.toUpperCase()})`,
        }
      : card;

    this.discardPile.push(playedCard);
    this.drawPendingForPlayer = false;
    this.drawnCard = null;

    // Trigger visual motion event for all players & spectators
    this.triggerCardPlayed({
      id: `cp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      playerId: curPlayer.id,
      playerName: curPlayer.name,
      playerAvatar: curPlayer.avatar,
      card: playedCard,
      chosenColor,
      timestamp: Date.now(),
    });

    this.triggerSound('play');
    this.cardsPlayedPerPlayer[curPlayer.id] = (this.cardsPlayedPerPlayer[curPlayer.id] || 0) + 1;

    // Handle Wild color nomination
    if (isWild && chosenColor) {
      this.activeColor = chosenColor;
      this.lastActionMessage = card.value === 'wild_draw4'
        ? `${curPlayer.name} played Crazy Draw 4 and nominated ${chosenColor.toUpperCase()}!`
        : `${curPlayer.name} played Crazy 8 and nominated ${chosenColor.toUpperCase()}!`;
      this.triggerSound('wild');
    } else {
      this.activeColor = card.color;
      this.lastActionMessage = `${curPlayer.name} played ${card.color.toUpperCase()} ${card.label}.`;
    }

    // Check Last Card alert (1 card remaining)
    if (curPlayer.hand.length === 1) {
      this.setBanner('LAST_CARD', `🔥 ${curPlayer.name} HAS 1 CARD LEFT!`, curPlayer.id, curPlayer.name);
      this.triggerSound('last_card');
    }

    // Check Win Condition (0 cards remaining)
    if (curPlayer.hand.length === 0) {
      this.endGame(curPlayer);
      return { success: true };
    }

    // Handle Action Cards with Defensive Stacking
    this.handleSpecialCard(card, curPlayer);

    return { success: true };
  }

  private handleSpecialCard(card: Card, curPlayer: Player): void {
    if (card.value === 'reverse') {
      this.turnDirection = this.turnDirection === 1 ? -1 : 1;
      this.setBanner('REVERSE', `⇄ REVERSE! Direction changed by ${curPlayer.name}`, curPlayer.id, curPlayer.name);
      this.triggerSound('special');
      this.advanceTurn(1);
    } else if (card.value === 'skip') {
      const skippedPlayer = this.getPlayerAtOffset(1);
      this.setBanner('SKIP', `⊘ SKIP! ${skippedPlayer?.name} was skipped!`, skippedPlayer?.id, skippedPlayer?.name);
      this.triggerSound('special');
      this.advanceTurn(2); // Skip next player
    } else if (card.value === 'draw2') {
      // DEFENSIVE STACKING: +2 accumulates to pendingDrawCount
      this.pendingDrawCount += 2;
      this.setBanner(
        'DRAW2',
        `⚡ +${this.pendingDrawCount} DEFENSE STACK! ${curPlayer.name} stacked +2! Defend or pick ${this.pendingDrawCount}!`,
        curPlayer.id,
        curPlayer.name
      );
      this.triggerSound('special');
      this.triggerShake(1.2);
      this.advanceTurn(1); // Advance to next player to defend or draw
    } else if (card.value === 'wild_draw4') {
      // DEFENSIVE STACKING: +4 accumulates to pendingDrawCount
      this.pendingDrawCount += 4;
      this.setBanner(
        'DRAW4',
        `💥 +${this.pendingDrawCount} DEFENSE STACK SLAM! ${curPlayer.name} stacked +4! Defend or pick ${this.pendingDrawCount}!`,
        curPlayer.id,
        curPlayer.name
      );
      this.triggerSound('special');
      this.triggerShake(2.0);
      this.advanceTurn(1); // Advance to next player to defend or draw
    } else {
      // Normal number card or standard wild
      this.advanceTurn(1);
    }
  }

  public drawCard(playerId: string): { success: boolean; drawnCard?: Card; playable?: boolean; error?: string } {
    const curPlayer = this.getCurrentPlayer();
    if (!curPlayer || curPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    if (this.drawPendingForPlayer) {
      return { success: false, error: 'Already drew a card this turn. Play it or pass.' };
    }

    // CASE 1: Player is taking the stacked draw penalty!
    if (this.pendingDrawCount > 0) {
      const count = this.pendingDrawCount;
      this.pendingDrawCount = 0;
      const cardsReceived = this.giveCardsToPlayer(curPlayer, count);

      this.triggerCardsDrawn({
        id: `cd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        playerId: curPlayer.id,
        playerName: curPlayer.name,
        playerAvatar: curPlayer.avatar,
        count: cardsReceived,
        isPenalty: true,
        timestamp: Date.now(),
      });

      this.setBanner('DRAW4', `💥 ${curPlayer.name} TOOK THE +${cardsReceived} CARDS PENALTY!`, curPlayer.id, curPlayer.name);
      this.lastActionMessage = `${curPlayer.name} could not defend and drew all ${cardsReceived} stacked cards!`;
      this.triggerSound('draw');
      this.triggerShake(cardsReceived >= 4 ? 2.0 : 1.2);

      // Taking the penalty ends the player's turn (skipped)
      this.advanceTurn(1);
      return { success: true };
    }

    // CASE 2: Normal 1-card draw from physical drawPile
    const card = this.popDrawCard();
    if (!card) {
      // Fallback: If both drawPile is empty AND discardPile only has 1 card
      // (players are holding all remaining cards), the turn automatically skips!
      this.lastActionMessage = `${curPlayer.name} could not draw (deck exhausted). Turn skipped automatically!`;
      this.drawPendingForPlayer = false;
      this.drawnCard = null;
      this.advanceTurn(1);
      return { success: true, playable: false, error: 'Deck exhausted: turn skipped.' };
    }


    if (!curPlayer.hand) curPlayer.hand = [];
    curPlayer.hand.push(card);
    curPlayer.cardCount = curPlayer.hand.length;

    this.triggerCardsDrawn({
      id: `cd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      playerId: curPlayer.id,
      playerName: curPlayer.name,
      playerAvatar: curPlayer.avatar,
      count: 1,
      isPenalty: false,
      timestamp: Date.now(),
    });

    this.triggerSound('draw');

    // Check if playable
    const topCard = this.getTopDiscard();
    const isWild = isWildCard(card);
    const isPlayable = isWild || card.color === this.activeColor || (topCard && card.value === topCard.value);

    this.drawPendingForPlayer = true;
    this.drawnCard = card;
    this.lastActionMessage = `${curPlayer.name} drew a card.`;

    if (!isPlayable) {
      // Auto-pass if not playable
      this.drawPendingForPlayer = false;
      this.drawnCard = null;
      this.advanceTurn(1);
      return { success: true, drawnCard: card, playable: false };
    }

    this.emitUpdate();
    return { success: true, drawnCard: card, playable: true };
  }

  public passTurn(playerId: string): { success: boolean; error?: string } {
    const curPlayer = this.getCurrentPlayer();
    if (!curPlayer || curPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    if (!this.drawPendingForPlayer) {
      return { success: false, error: 'Must draw a card before passing' };
    }

    this.drawPendingForPlayer = false;
    this.drawnCard = null;
    this.lastActionMessage = `${curPlayer.name} passed turn.`;
    this.advanceTurn(1);
    return { success: true };
  }

  public callLastCard(playerId: string): void {
    const p = this.players.find(pl => pl.id === playerId);
    if (p && p.cardCount <= 2) {
      p.hasCalledLastCard = true;
      this.setBanner('LAST_CARD', `🚨 ${p.name} CALLED LAST CARD!`, p.id, p.name);
      this.triggerSound('last_card');
      this.emitUpdate();
    }
  }

  private giveCardsToPlayer(player: Player, count: number): number {
    if (!player.hand) player.hand = [];
    let given = 0;
    for (let i = 0; i < count; i++) {
      const c = this.popDrawCard();
      if (c) {
        player.hand.push(c);
        given++;
      } else {
        // Deck completely exhausted even after reshuffle attempt
        break;
      }
    }
    player.cardCount = player.hand.length;
    if (player.cardCount > 1) {
      player.hasCalledLastCard = false;
    }
    return given;
  }

  private popDrawCard(): Card | null {
    // 3. EMPTY DECK / RESHUFFLE MECHANIC
    // Trigger: If drawPile.length === 0 and a player needs to draw.
    // Action: Take all cards in the discardPile EXCEPT the top/active card.
    // Shuffle this array thoroughly, and reassign it as the new drawPile.
    // Fallback: If both drawPile is empty AND discardPile only has 1 card,
    // return null so turn automatically skips. FORBIDDEN from spawning new cards!
    if (this.drawPile.length === 0) {
      if (this.discardPile.length > 1) {
        const topCard = this.discardPile[this.discardPile.length - 1];
        const cardsToRecycle = this.discardPile.slice(0, -1);

        // Reset any nominated wild cards back to their clean un-nominated states before returning to draw pile
        const recycled: Card[] = cardsToRecycle.map(c => {
          if (c.value === '8') {
            return {
              ...c,
              color: 'wild' as CardColor,
              label: 'Crazy 8',
            };
          }
          if (c.value === 'wild_draw4') {
            return {
              ...c,
              color: 'wild' as CardColor,
              label: 'Crazy Draw 4',
            };
          }
          return c;
        });

        this.drawPile = shuffle(recycled, 7);
        this.discardPile = [topCard];
        this.lastActionMessage = 'Draw deck empty! Reshuffled discard pile into draw deck.';
      } else {
        // Deck exhausted and discard pile only has 1 active card
        return null;
      }
    }

    return this.drawPile.pop() || null;
  }

  public getInventoryCardCount(): number {
    const handCount = this.players.reduce((sum, p) => sum + (p.hand?.length || 0), 0);
    return this.drawPile.length + this.discardPile.length + handCount;
  }


  private getPlayerAtOffset(offset: number): Player | null {
    if (this.players.length === 0) return null;
    const nextIdx = (this.currentTurnIndex + offset * this.turnDirection + this.players.length * 10) % this.players.length;
    return this.players[nextIdx];
  }

  private advanceTurn(steps: number): void {
    this.drawPendingForPlayer = false;
    this.drawnCard = null;
    this.currentTurnIndex = (this.currentTurnIndex + steps * this.turnDirection + this.players.length * 10) % this.players.length;
    this.resetTurnTimer();
    this.emitUpdate();
    this.checkBotTurn();
  }

  private resetTurnTimer(): void {
    this.stopTurnTimer();
    this.turnTimeRemaining = this.turnTimeTotal;

    this.turnInterval = setInterval(() => {
      this.turnTimeRemaining -= 1;
      if (this.turnTimeRemaining <= 0) {
        this.handleTurnTimeout();
      } else {
        this.emitUpdate();
      }
    }, 1000);
  }

  private stopTurnTimer(): void {
    if (this.turnInterval) {
      clearInterval(this.turnInterval);
      this.turnInterval = null;
    }
  }

  private handleTurnTimeout(): void {
    const curPlayer = this.getCurrentPlayer();
    if (!curPlayer) return;

    this.triggerSound('timer');

    if (this.pendingDrawCount > 0) {
      const count = this.pendingDrawCount;
      this.pendingDrawCount = 0;
      const cardsReceived = this.giveCardsToPlayer(curPlayer, count);
      this.triggerCardsDrawn({
        id: `cd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        playerId: curPlayer.id,
        playerName: curPlayer.name,
        playerAvatar: curPlayer.avatar,
        count: cardsReceived,
        isPenalty: true,
        timestamp: Date.now(),
      });
      this.setBanner('TURN_TIMEOUT', `⏰ Turn expired! ${curPlayer.name} took +${cardsReceived} penalty cards!`, curPlayer.id, curPlayer.name);
      this.lastActionMessage = `${curPlayer.name}'s turn expired and took +${cardsReceived} penalty cards.`;
      this.triggerSound('draw');
    } else if (!this.drawPendingForPlayer) {
      // Auto-draw 1 card via strict physical drawPile pop
      const c = this.popDrawCard();
      if (c && curPlayer.hand) {
        curPlayer.hand.push(c);
        curPlayer.cardCount = curPlayer.hand.length;
        this.triggerCardsDrawn({
          id: `cd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          playerId: curPlayer.id,
          playerName: curPlayer.name,
          playerAvatar: curPlayer.avatar,
          count: 1,
          isPenalty: false,
          timestamp: Date.now(),
        });
        this.triggerSound('draw');
        this.setBanner('TURN_TIMEOUT', `⏰ Turn expired for ${curPlayer.name}! Auto-drew 1 card and passed.`, curPlayer.id, curPlayer.name);
      } else {
        this.setBanner('TURN_TIMEOUT', `⏰ Turn expired for ${curPlayer.name}! Turn passed.`, curPlayer.id, curPlayer.name);
      }
    }

    this.advanceTurn(1);
  }

  private checkBotTurn(): void {
    const curPlayer = this.getCurrentPlayer();
    if (!curPlayer || !curPlayer.isBot || this.status !== 'playing') return;

    // Simulate thinking delay (1.0 - 1.6 seconds)
    const delay = 1000 + Math.random() * 600;
    setTimeout(() => {
      if (this.status !== 'playing' || this.getCurrentPlayer()?.id !== curPlayer.id) return;
      if (!curPlayer.hand) return;

      // DEFENSE STACK CHECK FOR BOT:
      if (this.pendingDrawCount > 0) {
        // Can bot defend with draw2 or wild_draw4?
        const defenseCard = curPlayer.hand.find(c => isDefenseCard(c));
        if (defenseCard) {
          let chosenColor: CardColor | undefined = undefined;
          if (isWildCard(defenseCard)) {
            const counts: Record<CardColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
            curPlayer.hand.forEach(c => { if (!isWildCard(c)) counts[c.color]++; });
            chosenColor = (['red', 'blue', 'green', 'yellow'] as CardColor[]).reduce((a, b) => counts[a] >= counts[b] ? a : b);
          }
          this.playCard(curPlayer.id, defenseCard.id, chosenColor);
          return;
        } else {
          // Bot cannot defend, must take the penalty
          this.drawCard(curPlayer.id);
          return;
        }
      }

      const topCard = this.getTopDiscard();

      // Find valid cards to play (wild cards, matching active color, or matching rank)
      const playable = curPlayer.hand.filter(c => {
        if (isWildCard(c)) return true;
        if (c.color === this.activeColor) return true;
        if (topCard && c.value === topCard.value) return true;
        return false;
      });

      if (playable.length > 0) {
        // Pick best card (prioritize normal cards over wild/action cards unless needed)
        const chosen = playable.sort((a, b) => {
          const isAWild = isWildCard(a);
          const isBWild = isWildCard(b);
          if (isAWild && !isBWild) return 1;
          if (!isAWild && isBWild) return -1;
          return 0;
        })[0];

        let chosenColor: CardColor | undefined = undefined;
        if (isWildCard(chosen)) {
          // Count bot's colors in hand to pick the one it has the most of
          const counts: Record<CardColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, wild: 0 };
          curPlayer.hand.forEach(c => { if (!isWildCard(c)) counts[c.color]++; });
          chosenColor = (['red', 'blue', 'green', 'yellow'] as CardColor[]).reduce((a, b) => counts[a] >= counts[b] ? a : b);
        }

        this.playCard(curPlayer.id, chosen.id, chosenColor);
      } else {
        // Draw a card
        const res = this.drawCard(curPlayer.id);
        if (res.playable && res.drawnCard) {
          // Play drawn card immediately
          setTimeout(() => {
            if (this.getCurrentPlayer()?.id === curPlayer.id && this.status === 'playing') {
              let color: CardColor | undefined = undefined;
              if (isWildCard(res.drawnCard)) {
                color = (['red', 'blue', 'green', 'yellow'] as CardColor[])[Math.floor(Math.random() * 4)];
              }
              this.playCard(curPlayer.id, res.drawnCard!.id, color);
            }
          }, 800);
        }
      }
    }, delay);
  }

  private endGame(winner: Player): void {
    this.status = 'game_over';
    this.stopTurnTimer();

    // Compute official points from remaining opponent cards:
    // Numbers 0-9: face value
    // Action cards (draw2, skip, reverse): 20 pts
    // Wild cards (8, wild_draw4): 50 pts
    let roundPointsWon = 0;
    for (const p of this.players) {
      p.roundsPlayed = (p.roundsPlayed || 0) + 1;
      if (p.id !== winner.id && p.hand) {
        let handVal = 0;
        for (const c of p.hand) {
          if (isWildCard(c)) {
            handVal += 50;
          } else if (isActionCard(c)) {
            handVal += 20;
          } else {
            handVal += parseInt(c.value, 10) || 0;
          }
        }
        roundPointsWon += handVal;
        p.lastRoundScore = 0;
      }
    }


    const winnerPl = this.players.find(p => p.id === winner.id);
    if (winnerPl) {
      winnerPl.wins = (winnerPl.wins || 0) + 1;
      const finalRoundPoints = Math.max(roundPointsWon, 25);
      winnerPl.lastRoundScore = finalRoundPoints;
      winnerPl.score = (winnerPl.score || 0) + finalRoundPoints;
    }

    this.winner = {
      id: winner.id,
      name: winner.name,
      avatar: winner.avatar,
      address: winner.address || '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    };

    this.lastActionMessage = `🏆 ${winner.name} WON THE MATCH! (+${roundPointsWon} pts)`;
    this.triggerSound('victory');
    this.triggerShake(2.5);

    this.createSettlement();
    if (this.onGameOverCallback) {
      const potAmount = this.getPotAmount().toFixed(1);
      this.onGameOverCallback(winner, this.players, potAmount, this.cardsPlayedPerPlayer);
    }
    this.emitUpdate();
  }

  private createSettlement(): void {
    if (!this.winner) return;

    // Calculate live pot from stakes
    const totalPot = this.getPotAmount().toFixed(1);
    const nonce = Math.floor(Math.random() * 1000000);
    const timestamp = Date.now();

    // Generate settlement signature record for Hemi Testnet
    this.settlementSignature = {
      roomId: this.roomId,
      winnerAddress: this.winner.address || '0x71C...b9',
      potAmount: totalPot,
      nonce,
      timestamp,
      signature: '0x' + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      contractAddress: process.env.CRAZY8_ESCROW_ADDRESS || '0xbD42f75Fee8aD5Dd260DAbbC0520b5A0Efa1F060',
      network: 'Hemi Sepolia (Chain ID 743111)',
    };
  }

  public rematch(): void {
    this.status = 'lobby';
    this.winner = null;
    this.settlementSignature = null;
    this.discardPile = [];
    this.drawPile = [];
    this.drawPendingForPlayer = false;
    this.drawnCard = null;
    this.pendingDrawCount = 0;
    this.players.forEach(p => {
      p.cardCount = 0;
      p.hand = [];
      p.hasCalledLastCard = false;
      p.isReady = !!p.isBot; // Human players must click "I am Ready!" for the new match
    });
    this.emitUpdate();
  }

  private setBanner(type: BannerType, text: string, playerId?: string, playerName?: string): void {
    this.bannerAlert = {
      id: `b_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      text,
      playerId,
      playerName,
    };
    this.emitUpdate();

    setTimeout(() => {
      if (this.bannerAlert?.text === text) {
        this.bannerAlert = null;
        this.emitUpdate();
      }
    }, 2800);
  }

  private triggerSound(sound: string): void {
    if (this.onSoundCallback) this.onSoundCallback(sound);
  }

  private triggerShake(intensity: number): void {
    if (this.onShakeCallback) this.onShakeCallback(intensity);
  }

  public emitUpdate(): void {
    if (this.onStateChangeCallback) this.onStateChangeCallback();
  }

  public getSanitizedStateForPlayer(targetPlayerId: string): GameState {
    const curPlayer = this.getCurrentPlayer();
    const isTargetSeatedPlayer = this.players.some(p => p.id === targetPlayerId || (p.socketId && p.socketId === targetPlayerId));

    // If target player is seated, cleanse them from spectators map if erroneously present
    if (isTargetSeatedPlayer) {
      if (this.spectators.has(targetPlayerId)) {
        this.spectators.delete(targetPlayerId);
      }
      for (const [sId, spec] of Array.from(this.spectators.entries())) {
        if (spec.socketId === targetPlayerId || this.players.some(p => p.id === sId || p.socketId === spec.socketId)) {
          this.spectators.delete(sId);
        }
      }
    }

    return {
      roomId: this.roomId,
      roomCode: this.roomCode,
      hostId: this.hostId,
      status: this.status,
      isQuickMatch: this.isQuickMatch,
      customMode: this.customMode,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        isReady: p.isReady,
        isBot: p.isBot,
        isConnected: p.isConnected,
        cardCount: p.cardCount,
        seatIndex: p.seatIndex,
        hasCalledLastCard: p.hasCalledLastCard,
        address: p.address,
        score: p.score ?? 0,
        wins: p.wins ?? 0,
        roundsPlayed: p.roundsPlayed ?? 0,
        lastRoundScore: p.lastRoundScore ?? 0,
        tokenBalance: p.isBot ? 10000 : serverDb.getUserTokenBalance(p.address || p.id),
        // Hand is strictly hidden from other players! Only target player sees their own hand
        // In game_over state, all hands can optionally be revealed
        hand: (p.id === targetPlayerId || (p.socketId && p.socketId === targetPlayerId)) || this.status === 'game_over' ? p.hand : undefined,
      })),
      isStaking: this.isStaking && parseFloat(this.buyInAmount || '0') > 0,
      buyInAmount: this.buyInAmount,
      minPlayersRequired: 3,
      currentTurnPlayerId: curPlayer?.id || null,
      currentTurnIndex: this.currentTurnIndex,
      turnDirection: this.turnDirection,
      turnTimeRemaining: this.turnTimeRemaining,
      turnTimeTotal: this.turnTimeTotal,
      topDiscardCard: this.getTopDiscard(),
      activeColor: this.activeColor,
      drawPileCount: this.drawPile.length,
      drawPendingForPlayer: (curPlayer?.id === targetPlayerId || (curPlayer?.socketId && curPlayer.socketId === targetPlayerId)) ? this.drawPendingForPlayer : false,
      drawnCard: (curPlayer?.id === targetPlayerId || (curPlayer?.socketId && curPlayer.socketId === targetPlayerId)) ? this.drawnCard : null,
      pendingDrawCount: this.pendingDrawCount,
      lastActionMessage: this.lastActionMessage,
      bannerAlert: this.bannerAlert,
      winner: this.winner,
      escrowPot: {
        amount: this.getPotAmount().toString(),
        currency: this.currency,
        buyInAmount: this.buyInAmount,
      },
      settlementSignature: this.settlementSignature,
      spectatorCount: this.spectators.size,
      isSpectator: !isTargetSeatedPlayer && this.spectators.has(targetPlayerId),
    };
  }
}
