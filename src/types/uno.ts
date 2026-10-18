export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';

export type CardValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'draw2' | 'skip' | 'reverse' | 'wild_draw4';

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
  label: string;
}

export interface Player {
  id: string; // Persistent account / player ID
  socketId?: string; // Current active transport socket
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  isBot?: boolean;
  isConnected: boolean;
  cardCount: number;
  hand?: Card[]; // Only provided to current recipient player
  seatIndex: number;
  hasCalledLastCard?: boolean;
  address?: string;
  score?: number; // Cumulative lobby score points
  wins?: number; // Cumulative match wins in this lobby
  roundsPlayed?: number; // Total rounds in current lobby
  lastRoundScore?: number; // Score earned in the most recent completed round
  tokenBalance?: number; // Current test token balance
}

export type BannerType = 'REVERSE' | 'SKIP' | 'LAST_CARD' | 'DRAW2' | 'DRAW4' | 'WILD' | 'TURN_TIMEOUT';

export interface BannerAlert {
  id: string;
  type: BannerType;
  text: string;
  playerId?: string;
  playerName?: string;
}

export interface FloatingEmote {
  id: string;
  playerId: string;
  emoji: string;
  text?: string;
  timestamp: number;
}

export interface EscrowPotInfo {
  amount: string;
  currency: string;
  buyInAmount: string;
}

export interface SettlementSignature {
  roomId: string;
  winnerAddress: string;
  potAmount: string;
  nonce: number;
  timestamp: number;
  signature: string;
  contractAddress: string;
  network: string;
}

export interface CardsDrawnEvent {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  count: number;
  isPenalty: boolean;
  timestamp: number;
}

export interface CardPlayedEvent {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  card: Card;
  chosenColor?: CardColor;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  roomCode: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
  isSpectator?: boolean;
  isSystem?: boolean;
}

export interface PublicRoomSummary {
  roomId: string;
  roomCode: string;
  status: 'lobby' | 'playing' | 'game_over';
  playerCount: number;
  maxPlayers: number;
  spectatorCount: number;
  mode?: string;
  description?: string;
  hostName?: string;
  hostAvatar?: string;
  players: {
    id: string;
    name: string;
    avatar: string;
    isBot?: boolean;
  }[];
  activeColor: CardColor | null;
  topDiscardCard?: Card | null;
  escrowPot: EscrowPotInfo;
  isQuickMatch?: boolean;
}

export interface GameState {
  roomId: string;
  roomCode: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'game_over';
  players: Player[];
  isStaking?: boolean;
  buyInAmount?: string;
  minPlayersRequired?: number; // Minimum players required to start match (3 players)
  isQuickMatch?: boolean;
  customMode?: string;
  currentTurnPlayerId: string | null;
  currentTurnIndex: number;
  turnDirection: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
  turnTimeRemaining: number;
  turnTimeTotal: number;
  topDiscardCard: Card | null;
  activeColor: CardColor | null;
  drawPileCount: number;
  drawPendingForPlayer: boolean;
  drawnCard: Card | null;
  pendingDrawCount: number; // Defended / stacked draw cards pending (+2, +4)
  lastActionMessage: string | null;
  bannerAlert: BannerAlert | null;
  winner: {
    id: string;
    name: string;
    avatar: string;
    address?: string;
  } | null;
  escrowPot: EscrowPotInfo;
  settlementSignature?: SettlementSignature | null;
  spectatorCount?: number;
  isSpectator?: boolean;
}

export interface UserGameStats {
  gamesPlayed: number;
  gamesWon: number;
  winStreak: number;
  bestWinStreak: number;
  totalEarningsEth: string;
  cardsPlayed: number;
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
  name: string;
  avatar: string;
  bio?: string;
  address?: string;
  stats: UserGameStats;
  presence: 'online' | 'in_game' | 'offline';
  currentRoomCode?: string | null;
  lastSeen: number;
  friends: string[];
  friendRequestsSent: string[];
  friendRequestsReceived: string[];
  notifications?: UserNotification[];
  createdAt: number;
}

export interface EnrichedFriend {
  id: string;
  tag?: string;
  name: string;
  avatar: string;
  bio?: string;
  address?: string;
  presence: 'online' | 'in_game' | 'offline';
  status?: 'online' | 'in_game' | 'offline';
  currentRoomCode?: string | null;
  lastSeen: number;
  stats: UserGameStats;
}

export interface GameInviteEvent {
  senderId: string;
  senderName: string;
  senderAvatar: string;
  roomCode: string;
  timestamp: number;
}
