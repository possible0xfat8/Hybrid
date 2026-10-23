import React, { useState, useEffect } from 'react';
import { GameState, PublicRoomSummary, EnrichedFriend } from '@/types/uno';
import { WalletState, formatAddress } from '@/lib/uno/wallet';
import { AccountProfile } from '@/lib/uno/account';
import { HemiUnoLogo } from './HemiUnoLogo';
import { HemiHeroCards } from './HemiHeroCards';
import { UserAvatar, isAvatarUrl } from './UserAvatar';
import {
  Users,
  Eye,
  Trophy,
  BookOpen,
  Home,
  Gamepad2,
  ChevronRight,
  Copy,
  Check,
  Lightbulb,
  Code2,
  Plus,
  Radio,
  RefreshCw,
  Crown,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Play,
  Share2,
  UserPlus,
  UserX,
  RotateCcw,
  Music,
  Volume2,
  VolumeX,
  LogOut,
  Pencil,
  X,
} from 'lucide-react';

import { Crazy8ProfileDashboard } from './Crazy8ProfileDashboard';
import { Crazy8RichLeaderboard } from './Crazy8RichLeaderboard';
import { UserProfileModal, UserProfileTarget } from '../shared/UserProfileModal';
import { SpectatorRoomsModal } from './SpectatorRoomsModal';
import { Tv } from 'lucide-react';

export interface LobbyViewProps {
  gameState: GameState | null;
  myPlayerId: string;
  wallet: WalletState;
  account: AccountProfile | null;
  onUpdateProfile?: (name: string, avatar: string) => void;
  connectionStatus?: 'connected' | 'disconnected' | 'reconnecting' | 'offline';
  onConnectWallet: () => Promise<void>;
  onCreateRoom: (playerName: string, avatar: string, buyIn: string, address?: string) => void;
  onJoinRoom: (roomCode: string, playerName: string, avatar: string, address?: string) => void;
  onQuickJoin?: (buyIn?: string) => void;
  onOpenProfile: () => void;
  onOpenFriends: () => void;
  friendCount?: number;
  onlineFriendCount?: number;
  friendsList?: EnrichedFriend[];
  onSpectateRoom: (roomCode: string, spectatorName: string, avatar: string) => void;
  onToggleReady: () => void;
  onAddBot: () => void;
  onRemovePlayer: (playerId: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
  liveRooms?: PublicRoomSummary[];
  onRefreshLiveRooms?: () => void;
  error?: string | null;
  activeRoomCode?: string | null;
  onResumeSession?: (code: string) => void;
  onOpenLeaderboard?: () => void;
  onOpenRules?: () => void;
  onOpenCreateTable?: () => void;
  liveStats?: { openTables: number; playersOnline: number; gamesPlayed: number };
  isMusicOn?: boolean;
  onToggleMusic?: () => void;
  onConfigureStake?: (buyIn: string) => void;
  tokenBalance?: string;
  onOpenAirdrop?: () => void;
  isAirdropEligible?: boolean;
  hasClaimedAirdrop?: boolean;
}

const AVATARS = ['🦊', '🦁', '🐸', '🤖', '🐻', '💎', '🐉', '🐱'];

export const LOBBY_STAKE_OPTIONS = [
  { label: 'Free (0)', value: '0' },
  { label: '50', value: '50' },
  { label: '100', value: '100', recommended: true },
  { label: '250', value: '250' },
  { label: '500', value: '500' },
  { label: '1000', value: '1000' },
];

export const LobbyView: React.FC<LobbyViewProps> = ({
  gameState,
  myPlayerId,
  wallet,
  account,
  onUpdateProfile,
  connectionStatus = 'connected',
  onConnectWallet,
  onCreateRoom,
  onJoinRoom,
  onQuickJoin,
  onOpenProfile,
  onOpenFriends,
  friendCount = 0,
  onlineFriendCount = 0,
  friendsList = [],
  onSpectateRoom,
  onToggleReady,
  onAddBot,
  onRemovePlayer,
  onStartGame,
  onLeaveRoom,
  liveRooms = [],
  onRefreshLiveRooms,
  error,
  activeRoomCode,
  onResumeSession,
  onOpenLeaderboard,
  onOpenRules,
  onOpenCreateTable,
  liveStats = { openTables: 0, playersOnline: 0, gamesPlayed: 0 },
  isMusicOn = true,
  onToggleMusic,
  tokenBalance = '0',
  onConfigureStake,
  onOpenAirdrop,
  isAirdropEligible = false,
  hasClaimedAirdrop = false,
}) => {
  const [playerName, setPlayerName] = useState(
    account?.name || (wallet.address ? formatAddress(wallet.address) : '')
  );
  const [selectedAvatar, setSelectedAvatar] = useState(account?.avatar || '🦊');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const [sortOption, setSortOption] = useState<'popular' | 'players' | 'fastest'>('popular');
  const [inspectProfile, setInspectProfile] = useState<UserProfileTarget | null>(null);
  const [isSpectatorModalOpen, setIsSpectatorModalOpen] = useState(false);

  // Change Name on Homepage State
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingNameMobile, setIsEditingNameMobile] = useState(false);
  const [nameInput, setNameInput] = useState(
    account?.name || (wallet.address ? formatAddress(wallet.address) : '')
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSavedSuccess, setNameSavedSuccess] = useState(false);

  useEffect(() => {
    if (account?.name) {
      setPlayerName(account.name);
      setNameInput(account.name);
    } else if (wallet.address) {
      const defaultVal = formatAddress(wallet.address);
      setPlayerName(defaultVal);
      setNameInput(defaultVal);
    } else {
      setPlayerName('');
      setNameInput('');
    }
    if (account?.avatar) setSelectedAvatar(account.avatar);
  }, [account?.name, account?.avatar, wallet.address]);

  // Check if player is still using a default/unpersonalized identifier
  const isDefaultName = Boolean(
    playerName && (
      playerName.startsWith('Player_') ||
      playerName.startsWith('0x') ||
      playerName.startsWith('HemiPlayer_') ||
      playerName.includes('...')
    )
  );

  const handleSaveName = (customName?: string): boolean => {
    const target = (customName !== undefined ? customName : nameInput).trim();
    if (!target) {
      setNameError('Name cannot be empty');
      return false;
    }
    if (target.length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    if (target.length > 16) {
      setNameError('Name cannot exceed 16 characters');
      return false;
    }
    setNameError(null);
    setPlayerName(target);
    setNameInput(target);
    setIsEditingName(false);
    setIsEditingNameMobile(false);
    setNameSavedSuccess(true);
    setTimeout(() => setNameSavedSuccess(false), 2500);

    if (onUpdateProfile) {
      onUpdateProfile(target, selectedAvatar);
    }
    return true;
  };

  const handleQuickJoinClick = (customStake: string = '100') => {
    if (isEditingName || isEditingNameMobile) {
      if (nameInput.trim()) {
        handleSaveName(nameInput);
      }
    }
    if (onQuickJoin) onQuickJoin(customStake);
  };

  const handleAvatarSelect = (newAvatar: string) => {
    setSelectedAvatar(newAvatar);
    if (onUpdateProfile && playerName) {
      onUpdateProfile(playerName, newAvatar);
    }
  };

  const handleCopyWalletAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleJoinByCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (cleanCode.length >= 4) {
      let currentName = playerName;
      if ((isEditingName || isEditingNameMobile) && nameInput.trim()) {
        currentName = nameInput.trim();
        handleSaveName(currentName);
      }
      onJoinRoom(cleanCode, currentName || (wallet.address ? formatAddress(wallet.address) : 'Player'), selectedAvatar, wallet.address || undefined);
    }
  };

  const handleJoinTable = (code: string) => {
    let currentName = playerName;
    if ((isEditingName || isEditingNameMobile) && nameInput.trim()) {
      currentName = nameInput.trim();
      handleSaveName(currentName);
    }
    onJoinRoom(code, currentName || (wallet.address ? formatAddress(wallet.address) : 'Player'), selectedAvatar, wallet.address || undefined);
  };

  const handleCreateTableClick = () => {
    if ((isEditingName || isEditingNameMobile) && nameInput.trim()) {
      handleSaveName(nameInput.trim());
    }
    if (onOpenCreateTable) {
      onOpenCreateTable();
    }
  };

  // Compute player level & XP from career stats
  const matchesCount = account?.stats?.matchesPlayed || 0;
  const winsCount = account?.stats?.wins || 0;
  const playerLevel = Math.floor(matchesCount / 3) + 1;
  const playerXP = winsCount * 10 + matchesCount * 2;

  // Real online friends from database
  const onlineFriends = friendsList.filter(
    (f) => f.status === 'online' || f.status === 'in_game'
  );

  const displayTables = liveRooms.map(r => ({
    code: r.roomCode,
    mode: r.mode || 'Classic',
    desc: r.description || 'The original. 2-5 players.',
    players: `${r.playerCount}/${r.maxPlayers || 5}`,
    buyIn: r.escrowPot?.buyInAmount && parseFloat(r.escrowPot.buyInAmount) > 0 ? `${r.escrowPot.buyInAmount} $CRAZY8` : 'Free (Non-Staking)',
    hostName: r.hostName || r.players?.[0]?.name || 'Host',
    hostAvatar: r.hostAvatar || r.players?.[0]?.avatar || '🦊',
    hostAddress: (r.players?.[0] as any)?.address,
  }));

  // ==========================================
  // VIEW: WAITING ROOM LOBBY (when in a game)
  // ==========================================
  if (gameState && gameState.status === 'lobby') {
    const isWalletConnected = !!wallet.address;
    const myPlayer = isWalletConnected
      ? gameState.players.find(
          (p) =>
            p.id === myPlayerId ||
            (p.address && wallet.address && p.address.toLowerCase() === wallet.address.toLowerCase())
        )
      : undefined;
    const isHost = isWalletConnected && (gameState.hostId === myPlayerId || !!myPlayer?.isHost);
    const isSpectator = !myPlayer;
    const playerCount = gameState.players.length;
    const isQuickMatch = !!gameState.isQuickMatch;
    const hasBots = gameState.players.some((p) => p.isBot);
    const readyPlayersCount = gameState.players.filter((p) => p.isReady || p.isBot).length;
    const allPlayersReady = gameState.players.every((p) => p.isReady || p.isBot);
    // Quick Match allows 2-5 real players (1v1 or multiplayer contest), custom tables require 3-5
    const minRequired = isQuickMatch ? 2 : 3;
    const requiredStake =
      gameState.isStaking && parseFloat(gameState.escrowPot?.buyInAmount || gameState.buyInAmount || '0') > 0
        ? parseFloat(gameState.escrowPot?.buyInAmount || gameState.buyInAmount || '0')
        : 0;
    const hasInsufficientTokens =
      isWalletConnected && myPlayer && requiredStake > 0 && (myPlayer.tokenBalance ?? 10000) < requiredStake;
    const hasAnyInsufficientPlayer =
      requiredStake > 0 && gameState.players.some((p) => !p.isBot && (p.tokenBalance ?? 10000) < requiredStake);
    const canStart = playerCount >= minRequired && playerCount <= 5 && allPlayersReady && !hasAnyInsufficientPlayer;

    const handleCopyCode = () => {
      navigator.clipboard.writeText(gameState.roomCode);
      setCopiedRoomCode(true);
      setTimeout(() => setCopiedRoomCode(false), 2000);
    };

    return (
      <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-[#0E1217]/95 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
        {/* Wallet Not Connected Notice in Waiting Room */}
        {!isWalletConnected && (
          <div className="mb-4 sm:mb-5 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <div className="text-[11px] sm:text-xs font-black text-white">Wallet Not Connected</div>
                <div className="text-[10px] sm:text-[11px] text-amber-200/80">
                  Connect your Web3 wallet to claim a player seat or start matches.
                </div>
              </div>
            </div>
            <button
              onClick={onConnectWallet}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#FF3700] hover:brightness-110 text-white text-[10px] sm:text-xs font-bold shrink-0 transition-all cursor-pointer shadow-md"
            >
              Connect
            </button>
          </div>
        )}
        {/* Spectator Notice */}
        {isSpectator && (
          <div className="mb-4 sm:mb-5 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-500/15 via-[#FF4600]/15 to-purple-500/15 border border-red-500/40 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
              </div>
              <div>
                <div className="text-[11px] sm:text-xs font-black text-white flex items-center gap-1.5">
                  <span>Spectating Lobby</span>
                  <span className="px-1.5 py-0.5 rounded bg-red-500/30 text-red-200 text-[9px] sm:text-[10px] font-bold">
                    Judge / Streamer Cam
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-300">
                  You are observing this lobby in real time. Player card hands remain masked when the game starts.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsSpectatorModalOpen(true)}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Browse other live games"
              >
                <Tv className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FF4600]" />
                <span className="hidden xs:inline">Browse</span>
              </button>
              <button
                onClick={onLeaveRoom}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] sm:text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                Exit
              </button>
            </div>
          </div>
        )}

        {/* Quick Match Real Players Notice */}
        {isQuickMatch && (
          <div className="mb-4 sm:mb-5 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-2 sm:gap-3 text-emerald-200">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <div className="font-black text-white text-[11px] sm:text-sm flex items-center gap-2">
                  <span>Quick Match</span>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[9px] sm:text-[10px] font-bold">
                    No Bots
                  </span>
                </div>
                <div className="text-emerald-200/80 text-[10px] sm:text-[11px]">
                  {playerCount < 2
                    ? 'Waiting for other players to join...'
                    : `${playerCount} players ready. Host can launch!`}
                </div>
              </div>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-[10px] sm:text-xs font-bold transition-colors flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer"
              title="Share Room Code"
            >
              <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Invite</span>
            </button>
          </div>
        )}

        {/* Open Tables Host Banner */}
        {!isQuickMatch && isHost && (
          <div className="mb-4 sm:mb-5 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#FF4600]/10 border border-[#FF4600]/30 flex items-center justify-between gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-2 sm:gap-3 text-orange-200">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#FF4600]/20 flex items-center justify-center text-base sm:text-lg shrink-0">
                👑
              </div>
              <div>
                <div className="font-black text-white text-[11px] sm:text-sm flex items-center gap-2 flex-wrap">
                  <span>You are Table Host!</span>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-[#FF4600]/20 text-orange-300 font-mono text-[9px] sm:text-[10px] font-bold">
                    Open Table
                  </span>
                </div>
                <div className="text-orange-200/80 text-[10px] sm:text-[11px]">
                  {hasBots
                    ? 'Bots seated (Casual Free Play). Remove bots to enable staking.'
                    : 'Configure table pot below, or wait for players to join.'}
                </div>
              </div>
            </div>
            {playerCount < 5 && (
              <button
                onClick={onAddBot}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-[#FF4600] hover:bg-[#FF5500] text-white font-bold text-[10px] sm:text-xs transition-all flex items-center gap-1 sm:gap-1.5 shrink-0 shadow-md shadow-[#FF4600]/20 cursor-pointer"
                title={gameState.isStaking ? 'Adding a bot will deactivate staking' : 'Add Bot'}
              >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Add Bot</span>
              </button>
            )}
          </div>
        )}

        {/* Lobby Header */}
        <div className="flex flex-col gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <HemiUnoLogo size="sm" variant="clean" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-2xl font-black text-white">
                  {isQuickMatch ? 'Quick Match' : `${gameState.customMode || 'Classic'} Table`}
                </h2>
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-[#FF4600]/20 text-[#FF4600] font-mono text-[10px] sm:text-xs font-bold border border-[#FF4600]/30">
                  {playerCount}/5 Players
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400">
                {isHost
                  ? isQuickMatch
                    ? 'At least 2 real players required (2-5 players). All players must click "I am Ready!" before match starts.'
                    : 'More than 2 players required (3+ min). All players must click "I am Ready!" before match starts.'
                  : 'Click "I am Ready!" to prepare for match start.'}
              </p>
            </div>
          </div>

          {/* Room Code & Audio Mood Control — stacked on mobile */}
          <div className="flex flex-wrap items-center gap-2">
            {onToggleMusic && (
              <button
                type="button"
                onClick={onToggleMusic}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl border text-[10px] sm:text-xs font-mono font-bold transition-all cursor-pointer ${
                  isMusicOn
                    ? 'bg-[#FF4600]/15 border-[#FF4600]/40 text-orange-300 hover:bg-[#FF4600]/25 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
                title={isMusicOn ? 'Mute Background Groove' : 'Play Cool Cyber Uno Song'}
              >
                <Music className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isMusicOn ? 'text-[#FF4600] animate-bounce' : 'text-slate-500'}`} />
                <span className="hidden sm:inline text-[11px]">
                  {isMusicOn ? 'Groove ON' : 'Groove OFF'}
                </span>
                {isMusicOn && (
                  <span className="flex gap-0.5 items-end h-3 ml-0.5">
                    <span className="w-0.5 h-1.5 bg-[#FF4600] animate-pulse" />
                    <span className="w-0.5 h-3 bg-[#FF4600] animate-pulse delay-75" />
                    <span className="w-0.5 h-2 bg-[#FF4600] animate-pulse delay-150" />
                  </span>
                )}
              </button>
            )}

            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl px-2.5 sm:px-3 py-1 sm:py-1.5">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-slate-400">CODE:</span>
              <span className="font-mono text-base sm:text-lg font-black text-[#FF4600] tracking-wider">
                {gameState.roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Copy Room Code"
              >
                {copiedRoomCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={onLeaveRoom}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-100 text-[10px] sm:text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Quit Lobby"
            >
              <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Quit Lobby</span>
            </button>
          </div>
        </div>

        {/* Pot & Staking Hub: Staking only active if NO bots are in the game */}
        {hasBots ? (
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/70 border border-slate-800 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-lg shrink-0">
                  🤖
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-200 text-xs sm:text-sm">Non-Staking Casual Lobby</span>
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono font-bold border border-amber-500/20">
                      🤖 Bots Seated • Staking Disabled
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                    Staking and token pots are disabled for matches with AI bots.
                    {isHost ? ' Remove all bots from the table to enable pot configuration and token staking!' : ' Real players only for token staking.'}
                  </div>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800/90 text-slate-400 font-mono font-bold self-end sm:self-center border border-slate-700">
                0 Stake (Free)
              </span>
            </div>
          </div>
        ) : isHost ? (
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#0B0F14] to-[#FF4600]/10 border border-amber-500/40 shadow-lg animate-in fade-in">
            {/* Header: Title + Pot Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg shrink-0 shadow-inner">
                  🪙
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-white">Table Pot Configuration</span>
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-[#FF4600]/20 text-[#FF4600] font-mono font-bold border border-[#FF4600]/30">
                      👑 Host Controls
                    </span>
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      Real Players Only
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                    Configure stake per player. Held in escrow & 95% paid on-chain to match winner!
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 self-end sm:self-center bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Total Pot:</span>
                <span className="font-black text-amber-400 text-sm sm:text-base flex items-center gap-1">
                  <span>{gameState.escrowPot?.amount || (parseFloat(gameState.isStaking && gameState.buyInAmount ? gameState.buyInAmount : '0') * playerCount).toFixed(0)}</span>
                  <span className="text-[10px] text-amber-300/80">$CRAZY8</span>
                </span>
              </div>
            </div>

            {/* Host Stake Selector Pills */}
            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-[10px] sm:text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>Configure Stake:</span>
                <span className="text-slate-500 font-normal hidden sm:inline">(chips per player)</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {LOBBY_STAKE_OPTIONS.map((opt) => {
                  const currentBuyIn = gameState.isStaking && parseFloat(gameState.escrowPot?.buyInAmount || gameState.buyInAmount || '0') > 0
                    ? (gameState.escrowPot?.buyInAmount || gameState.buyInAmount || '0')
                    : '0';
                  const isSelected = (opt.value === '0' && currentBuyIn === '0') ||
                    (opt.value !== '0' && parseFloat(currentBuyIn) === parseFloat(opt.value));
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onConfigureStake?.(opt.value)}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                        isSelected
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 scale-105 ring-1 ring-white/30'
                          : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {opt.value !== '0' && <span>🪙</span>}
                      <span>{opt.label}</span>
                      {opt.recommended && !isSelected && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-sans font-bold">★</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : gameState.isStaking && parseFloat(gameState.escrowPot?.buyInAmount || gameState.buyInAmount || '0') > 0 ? (
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#0B0F14] to-[#FF4600]/10 border border-amber-500/30 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg shrink-0">
                  🪙
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-white">Staking Table</span>
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      Gasless Entry • Refunded if Left
                    </span>
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                      ⚡ Oracle Sponsored Payout
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400">
                    Each player stakes <strong className="text-amber-300 font-mono">{gameState.escrowPot?.buyInAmount || gameState.buyInAmount} $CRAZY8</strong>. When the match ends, our funded Oracle automatically pays out 95% on-chain to the winner!
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-center bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Total Pot:</span>
                <span className="font-black text-amber-400 text-sm sm:text-base flex items-center gap-1">
                  <span>{gameState.escrowPot?.amount || '0'}</span>
                  <span className="text-[10px] text-amber-300/80">$CRAZY8</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-base">🎮</span>
              <span className="font-bold text-[11px] sm:text-xs">Non-Staking Casual Lobby</span>
              <span className="text-slate-500 text-[10px] hidden sm:inline">• Free play (Waiting for host to configure pot)</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-bold">
              0 Stake
            </span>
          </div>
        )}

        {/* Lobby Leaderboard Summary if games or scores exist */}
        {gameState.players.some((p) => (p.score || 0) > 0 || (p.roundsPlayed || 0) > 0) && (
          <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#090B0E] to-orange-500/10 border border-amber-500/30 shadow-lg">
            <div className="flex items-center justify-between mb-2 sm:mb-2.5">
              <span className="text-[10px] sm:text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1 sm:gap-1.5">
                <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                Lobby Standings & Scores
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
                {gameState.players[0]?.roundsPlayed || 0} Rounds Completed
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {[...gameState.players]
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((p, idx) => (
                  <div
                    key={p.id}
                    onClick={() => setInspectProfile(p)}
                    className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between cursor-pointer group transition-all"
                    title={`View ${p.name}'s profile`}
                  >
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-black text-amber-400 font-mono">#{idx + 1}</span>
                      <UserAvatar avatar={p.avatar} name={p.name} className="w-5 h-5 text-sm sm:text-base shrink-0 rounded-full group-hover:scale-105 transition-transform" />
                      <span className="text-[10px] sm:text-xs font-bold text-slate-200 truncate max-w-[50px] sm:max-w-[75px] group-hover:text-[#FF4600] transition-colors">
                        {p.name}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-black text-amber-300 font-mono">
                      {p.score || 0}p
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Insufficient Token Warning for current player */}
        {hasInsufficientTokens && (
          <div className="mt-3 sm:mt-4 p-3 rounded-xl sm:rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2.5 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-rose-300 min-w-0">
              <span className="text-base shrink-0">⚠️</span>
              <div className="min-w-0">
                <div className="font-bold text-white text-[11px] sm:text-xs">Insufficient $CRAZY8 Chips</div>
                <div className="text-[10px] sm:text-[11px] text-rose-200/80">
                  This table requires a stake of <strong className="text-rose-100 font-mono">{requiredStake} chips</strong>, but your balance is <strong className="text-rose-100 font-mono">{myPlayer?.tokenBalance ?? 0} chips</strong>.
                </div>
              </div>
            </div>
            {onOpenAirdrop && (
              <button
                type="button"
                onClick={onOpenAirdrop}
                className="px-3 py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white font-bold text-[10px] sm:text-xs transition-all active:scale-95 cursor-pointer shrink-0 shadow-md shadow-rose-500/20"
              >
                Claim 10,000 Free
              </button>
            )}
          </div>
        )}

        {/* Players List */}
        <div className="py-4 sm:py-6 space-y-2.5 sm:space-y-3">
          <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Seat Roster ({playerCount}/5)</span>
            <span className="text-emerald-400 lowercase font-mono font-normal">
              {readyPlayersCount}/{playerCount} ready {playerCount < (isQuickMatch ? 2 : 3) ? `(${isQuickMatch ? 'at least 2' : 'more than 2'} players needed to start)` : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
            {gameState.players.map((p) => {
              const isMe =
                isWalletConnected &&
                (p.id === myPlayerId ||
                  (!!p.address && !!wallet.address && p.address.toLowerCase() === wallet.address.toLowerCase()));
              return (
                <div
                  key={p.id}
                  className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border flex items-center justify-between transition-all ${
                    isMe
                      ? 'bg-[#FF4600]/10 border-[#FF4600]/40 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div
                    onClick={() => setInspectProfile(p)}
                    className="flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer group"
                    title={`Click to view ${p.name}'s profile`}
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg sm:text-xl shrink-0 overflow-hidden group-hover:scale-105 group-hover:border-slate-500 transition-all">
                      <UserAvatar avatar={p.avatar} name={p.name} className="w-full h-full text-lg sm:text-xl rounded-lg sm:rounded-xl" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="truncate max-w-[100px] sm:max-w-none group-hover:text-[#FF4600] transition-colors flex items-center gap-1">
                          <span>{p.name}</span>
                          <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                        </span>
                        {p.isHost && (
                          <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                            HOST
                          </span>
                        )}
                        {p.isBot && (
                          <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                            BOT
                          </span>
                        )}
                        {isMe && (
                          <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-[#FF4600] text-white font-bold">
                            YOU
                          </span>
                        )}
                        {requiredStake > 0 && !p.isBot && (p.tokenBalance ?? 10000) < requiredStake && (
                          <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                            ⚠️ Low Chips ({p.tokenBalance ?? 0})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono flex items-center gap-1 sm:gap-1.5 flex-wrap">
                        <span className="font-bold text-amber-400 flex items-center gap-0.5 sm:gap-1">
                          <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
                          {p.score || 0} pts
                        </span>
                        <span className="text-slate-600">•</span>
                        <span>{p.wins || 0} wins</span>
                        {(p.roundsPlayed || 0) > 0 && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span>{p.roundsPlayed} rnds</span>
                          </>
                        )}
                        {p.lastRoundScore !== undefined && p.lastRoundScore > 0 && (
                          <span className="text-emerald-400 font-bold">(+{p.lastRoundScore})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {p.isHost && (
                      <span className="text-[10px] sm:text-xs font-mono text-amber-400 font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        Host
                      </span>
                    )}
                    {p.isReady || p.isBot ? (
                      <span className="text-[10px] sm:text-xs font-mono text-emerald-400 font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-0.5 sm:gap-1">
                        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        Ready
                      </span>
                    ) : (
                      <span className="text-[10px] sm:text-xs font-mono text-amber-300/90 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        Waiting
                      </span>
                    )}

                    {isHost && !p.isHost && (
                      <button
                        onClick={() => onRemovePlayer(p.id)}
                        className="p-1 sm:p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                        title={p.isBot ? "Remove bot" : "Kick player"}
                      >
                        <UserX className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty Seat placeholders */}
            {Array.from({ length: Math.max(0, 5 - playerCount) }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/20 flex items-center justify-between text-slate-600 text-[10px] sm:text-xs font-mono"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border border-dashed border-slate-800 flex items-center justify-center text-slate-700">
                    +
                  </div>
                  <span>Open Seat {playerCount + idx + 1}</span>
                </div>
                {isQuickMatch ? (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 text-[10px] sm:text-xs font-mono">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="hidden sm:inline">Searching for player...</span>
                    <span className="sm:hidden">Searching...</span>
                  </div>
                ) : isHost ? (
                  <button
                    onClick={onAddBot}
                    className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] sm:text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>Add Bot</span>
                  </button>
                ) : (
                  <span className="text-slate-600 text-[10px] sm:text-xs">Waiting for player</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Host and Player Controls */}
        <div className="pt-3 sm:pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
          <button
            onClick={onLeaveRoom}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-100 text-[10px] sm:text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95"
          >
            <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />
            <span>Quit Lobby</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
            {isHost && !isQuickMatch && playerCount < 5 && (
              <button
                onClick={onAddBot}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[10px] sm:text-xs transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer"
              >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Add Bot</span>
              </button>
            )}

            {/* Ready / Unready toggle for all seated players (including host) */}
            {!isSpectator && myPlayer && (
              <button
                onClick={onToggleReady}
                className={`w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                  myPlayer.isReady
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 shadow-sm'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25'
                }`}
              >
                {myPlayer.isReady ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cancel Ready</span>
                  </>
                ) : (
                  <span>I am Ready!</span>
                )}
              </button>
            )}

            {/* Match Launch controls */}
            {isHost ? (
              canStart ? (
                <button
                  onClick={onStartGame}
                  className="w-full sm:w-auto px-5 sm:px-7 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF5500] to-[#FF3700] hover:brightness-110 text-white shadow-xl shadow-[#FF4600]/30 cursor-pointer active:scale-98 animate-pulse"
                  title="Launch Match! (All conditions met)"
                >
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                  <span>Start Match!</span>
                </button>
              ) : (
                <button
                  disabled
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider bg-slate-800 text-slate-500 cursor-not-allowed flex items-center justify-center gap-2 border border-slate-800"
                >
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                  <span>
                    {playerCount < minRequired
                      ? isQuickMatch
                        ? 'Waiting for Players (2+ Needed)'
                        : 'Waiting for Players (3+ Needed)'
                      : hasAnyInsufficientPlayer
                      ? 'Player Needs More Chips'
                      : !myPlayer?.isReady
                      ? "Click 'I am Ready!' First"
                      : `Waiting for All Ready (${readyPlayersCount}/${playerCount})`}
                  </span>
                </button>
              )
            ) : !isSpectator ? (
              canStart ? (
                <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>All ready! Waiting for Host to start match.</span>
                </div>
              ) : null
            ) : null}
          </div>
        </div>

        <UserProfileModal
          isOpen={!!inspectProfile}
          onClose={() => setInspectProfile(null)}
          user={inspectProfile}
          currentUserAddress={wallet.address}
          currentUserId={account?.id}
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW: MAIN HOMEPAGE DASHBOARD
  // =========================================================================
  return (
    <div className="w-full max-w-7xl mx-auto py-2 sm:py-4 pb-16 lg:pb-4 px-2 sm:px-4 lg:px-6">
      {/* ========================================================= */}
      {/* TOP: EASY TO SPOT PROFILE DASHBOARD                      */}
      {/* ========================================================= */}
      <div className="mb-3 sm:mb-4">
        <Crazy8ProfileDashboard
          wallet={wallet}
          account={account}
          tokenBalance={tokenBalance}
          onConnectWallet={onConnectWallet}
          onOpenProfile={onOpenProfile}
          onUpdateName={(newName) => {
            if (onUpdateProfile) onUpdateProfile(newName, selectedAvatar);
          }}
          onClaimAirdrop={onOpenAirdrop}
          isAirdropEligible={isAirdropEligible}
          hasClaimedAirdrop={hasClaimedAirdrop}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Navigation Sidebar (Desktop Only)            */}
        {/* ========================================================= */}
        <div className="lg:col-span-2 hidden lg:flex flex-col gap-3">
          {/* Main Nav Items */}
          <div className="space-y-0.5">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.06] text-white font-bold text-sm transition-all text-left border border-white/[0.08]"
            >
              <Home className="w-4.5 h-4.5" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickJoin?.('100')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] font-medium text-sm transition-all text-left cursor-pointer"
            >
              <Gamepad2 className="w-5 h-5" />
              <span>Play</span>
            </button>

            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] font-medium text-sm transition-all text-left cursor-pointer"
            >
              <Trophy className="w-5 h-5" />
              <span>Leaderboard</span>
            </button>

            <button
              type="button"
              onClick={onOpenRules}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.04] font-medium text-sm transition-all text-left cursor-pointer"
            >
              <BookOpen className="w-5 h-5" />
              <span>How to Play</span>
            </button>
          </div>

          {/* Background Music Groove Card */}
          {onToggleMusic && (
            <div
              onClick={onToggleMusic}
              className={`mt-2 p-3.5 rounded-xl border transition-all cursor-pointer group ${
                isMusicOn
                  ? 'bg-white/[0.04] border-white/[0.1]'
                  : 'bg-white/[0.02] border-white/[0.05] hover:border-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-400">
                  <Music className={`w-3.5 h-3.5 ${isMusicOn ? 'text-[#FF4600]' : 'text-slate-500'}`} />
                  BGM
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    isMusicOn
                      ? 'bg-[#FF4600] text-white'
                      : 'bg-white/[0.06] text-slate-500'
                  }`}
                >
                  {isMusicOn ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="text-xs font-bold text-white group-hover:text-slate-200 transition-colors flex items-center justify-between">
                <span>Background Track</span>
                {isMusicOn && (
                  <span className="flex gap-0.5 items-end h-3">
                    <span className="w-0.5 h-2 bg-[#FF4600]/70 animate-pulse" />
                    <span className="w-0.5 h-3.5 bg-[#FF4600]/70 animate-pulse delay-75" />
                    <span className="w-0.5 h-1.5 bg-[#FF4600]/70 animate-pulse delay-150" />
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {isMusicOn ? 'Now playing' : 'Click to enable'}
              </div>
            </div>
          )}

          {/* LIVE Spectate Games */}
          <div
            onClick={() => {
              setIsSpectatorModalOpen(true);
            }}
            className="mt-2 p-3.5 rounded-xl bg-gradient-to-r from-red-950/20 via-white/[0.02] to-purple-950/20 border border-red-500/30 hover:border-red-500/60 hover:bg-red-500/[0.06] transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-red-400">
                <span className={`w-2 h-2 rounded-full ${displayTables.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
                LIVE
              </span>
              <Eye className="w-4 h-4 text-slate-400 group-hover:text-[#FF4600] transition-colors" />
            </div>
            <div className="text-xs font-black text-white group-hover:text-[#FF4600] transition-colors flex items-center justify-between">
              <span>Spectate Games</span>
              <span className="text-[10px] font-normal text-slate-400 group-hover:text-slate-200">Browse &rarr;</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {displayTables.length > 0 ? `${displayTables.length} active match${displayTables.length > 1 ? 'es' : ''} • Judge Cam` : 'Open spectator hub'}
            </div>
          </div>

          {/* Bottom Watermark */}
          <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col gap-2">
            <div className="flex items-center gap-2 opacity-25">
              <div className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-white/40 font-bold text-[10px]">
                h
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                Hemi Crazy 8
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-600 leading-tight">
              On-chain card game.
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CENTER COLUMN: Hero Banner, Stats, and Open Tables       */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 xl:col-span-6 flex flex-col gap-3 sm:gap-4">
          {/* Hero Action Banner */}
          <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] p-4 sm:p-6 relative overflow-hidden shadow-xl">
            <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[#FF4600]/15 blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] sm:text-[11px] font-mono font-black tracking-widest text-[#FF4600] uppercase">
                    HEMI CRAZY 8
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">LIVE ON-CHAIN</span>
                </div>

                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight mb-2">
                  Ready to <span className="text-[#FF4600]">Sweep the Pot?</span>
                </h1>

                <div className="flex items-center gap-2.5 mt-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleQuickJoinClick('100')}
                    className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#FF3700] hover:brightness-110 active:scale-95 text-white font-black text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center gap-2 shadow-lg shadow-[#FF4600]/30 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>QUICK PLAY</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/30 border border-white/20 text-amber-300 font-bold ml-0.5">
                      100 🪙 POT
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateTableClick}
                    className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] active:scale-95 border border-white/[0.1] text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Table</span>
                  </button>
                </div>
              </div>

              {/* Hero Cards Visual */}
              <div className="shrink-0 hidden md:block">
                <HemiHeroCards />
              </div>
            </div>
          </div>

          {/* 3 Metrics Counter Row — horizontal scroll on mobile */}
          <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar scroll-snap-x sm:grid sm:grid-cols-3 sm:overflow-visible">
            {/* Open Tables */}
            <div className="min-w-[140px] sm:min-w-0 p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between group hover:border-white/[0.1] transition-all shrink-0 sm:shrink">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#FF4600]">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <div className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                    OPEN TABLES
                  </div>
                  <div className="text-base sm:text-xl font-black text-white font-mono">
                    {liveStats.openTables ?? displayTables.length}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 group-hover:text-slate-400 transition-colors hidden sm:block" />
            </div>

            {/* Players Online */}
            <div className="min-w-[140px] sm:min-w-0 p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between group hover:border-white/[0.1] transition-all shrink-0 sm:shrink">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-emerald-400">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div>
                  <div className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                    PLAYERS ONLINE
                  </div>
                  <div className="text-base sm:text-xl font-black text-white font-mono">
                    {liveStats.playersOnline}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 group-hover:text-slate-400 transition-colors hidden sm:block" />
            </div>

            {/* Games Played */}
            <div className="min-w-[140px] sm:min-w-0 p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between group hover:border-white/[0.1] transition-all shrink-0 sm:shrink">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-amber-400">
                  <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <div className="text-[9px] sm:text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                    GAMES PLAYED
                  </div>
                  <div className="text-base sm:text-xl font-black text-white font-mono">
                    {liveStats.gamesPlayed.toLocaleString()}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 group-hover:text-slate-400 transition-colors hidden sm:block" />
            </div>
          </div>

          {/* Open Tables Section */}
          <div className="p-4 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/[0.05] mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-slate-400">
                  <Gamepad2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white">Open Tables</h2>
                  <p className="text-[10px] sm:text-xs text-slate-400">Join a public game and start playing now.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Spectate Hub Trigger */}
                <button
                  type="button"
                  onClick={() => setIsSpectatorModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-white text-[10px] sm:text-xs font-bold transition-all cursor-pointer"
                  title="Open Spectator Hub to view all live games"
                >
                  <Eye className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                  <span>Spectate Hub</span>
                </button>

                {/* Sort by dropdown */}
                <div className="text-[10px] sm:text-xs text-slate-400 font-mono flex items-center gap-1 sm:gap-1.5 bg-white/[0.04] px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-white/[0.06]">
                  <span className="hidden sm:inline">Sort by:</span>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as any)}
                    className="bg-transparent text-white font-bold outline-none cursor-pointer text-[10px] sm:text-xs"
                  >
                    <option value="popular" className="bg-slate-900 text-white">Popular</option>
                    <option value="players" className="bg-slate-900 text-white">Players</option>
                    <option value="fastest" className="bg-slate-900 text-white">Fastest</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table List */}
            <div className="space-y-2 sm:space-y-2.5">
              {displayTables.length === 0 ? (
                <div className="py-8 sm:py-10 text-center flex flex-col items-center justify-center gap-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04] p-4">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-500">
                    <Gamepad2 className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-slate-200">No public tables open right now</p>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Click Quick Play to start matching or create your own custom table!</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => handleQuickJoinClick('100')}
                      className="px-4 py-2 rounded-lg bg-[#FF4600] hover:bg-[#FF5500] text-white font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Quick Play</span>
                      <span className="text-[10px] font-mono px-1 rounded bg-black/30 text-amber-300">100 🪙</span>
                    </button>
                    <button
                      onClick={handleCreateTableClick}
                      className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 font-bold text-xs transition-all active:scale-95 cursor-pointer border border-white/[0.08]"
                    >
                      + Create Table
                    </button>
                  </div>
                </div>
              ) : (
                displayTables.map((table) => (
                  <div
                    key={table.code}
                    className="p-3 sm:p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all group"
                  >
                    {/* Top: Mode info */}
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-base sm:text-lg shrink-0">
                        {table.mode === 'Stacked Draw' ? '⚡' : table.mode === '2v2 Team' ? '👥' : table.mode === 'Quick Match' ? '⏱️' : '🎴'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-black text-white">{table.mode}</span>
                          <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            • Public
                          </span>
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-400 truncate">{table.desc}</div>
                      </div>
                    </div>

                    {/* Bottom: Badges + Join */}
                    <div className="flex items-center justify-between gap-2 mt-2 sm:mt-0 sm:pl-12">
                      <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-mono text-slate-400 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span>{table.players}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500">💼</span>
                          <span>{table.buyIn}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectProfile({
                              name: table.hostName,
                              avatar: table.hostAvatar,
                              address: table.hostAddress,
                            });
                          }}
                          className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer group/host"
                          title={`View ${table.hostName}'s profile`}
                        >
                          <UserAvatar avatar={table.hostAvatar} name={table.hostName} className="w-4 h-4 text-xs rounded-full shrink-0 group-hover/host:ring-1 group-hover/host:ring-[#FF4600]" />
                          <span className="truncate max-w-[60px] sm:max-w-[80px] group-hover/host:underline">{table.hostName}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onSpectateRoom(table.code, playerName, selectedAvatar)}
                          className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-red-500/40 text-slate-300 hover:text-white font-bold text-[10px] sm:text-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
                          title="Spectate this match as a streamer/judge"
                        >
                          <Eye className="w-3.5 h-3.5 text-red-400" />
                          <span className="hidden xs:inline">Watch</span>
                        </button>

                        <button
                          onClick={() => handleJoinTable(table.code)}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-[#FF4600] hover:bg-[#FF5500] text-white font-bold text-[10px] sm:text-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <span>Join</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Rich Players Leaderboard & Friends          */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-3 sm:gap-4">
          {/* HIGH ROLLERS / RICH PLAYERS LEADERBOARD */}
          <Crazy8RichLeaderboard
            currentUserId={account?.id}
            currentUserAddress={wallet.address || undefined}
            currentUserChips={tokenBalance}
            currentUserWins={account?.stats?.wins || 0}
            onQuickPlay={handleQuickJoinClick}
          />

          {/* Join by Code Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center text-slate-400">
                <Code2 className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs sm:text-sm font-black text-white">Join Table by Code</h3>
            </div>

            <form onSubmit={handleJoinByCodeSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="4-digit room code..."
                maxLength={6}
                className="flex-1 bg-[#08090C] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono font-bold text-white placeholder-slate-600 uppercase focus:border-[#FF4600]/60 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={joinCodeInput.trim().length < 4}
                className="px-3.5 py-2 rounded-xl bg-[#FF4600] hover:bg-[#FF5500] disabled:opacity-40 text-white font-bold text-xs transition-all shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <span>Join</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </form>
          </div>

          {/* Friends Online Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.05] mb-2">
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Friends Online</span>
              </div>
              <button
                type="button"
                onClick={onOpenFriends}
                className="text-[10px] sm:text-[11px] text-[#FF4600] hover:underline font-bold cursor-pointer"
              >
                View All →
              </button>
            </div>

            <div>
              {onlineFriends.length > 0 ? (
                <div className="flex items-center justify-start gap-2 overflow-x-auto no-scrollbar py-1">
                  {onlineFriends.slice(0, 5).map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectProfile({
                          id: f.id,
                          name: f.name,
                          avatar: f.avatar,
                          address: f.address,
                        });
                      }}
                      className="flex flex-col items-center gap-0.5 sm:gap-1 cursor-pointer group shrink-0"
                      title={`View ${f.name}'s profile (${f.status})`}
                    >
                      <div className="relative">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/[0.04] border border-white/[0.06] group-hover:border-white/[0.15] flex items-center justify-center text-sm sm:text-lg transition-colors overflow-hidden">
                          <UserAvatar avatar={f.avatar} name={f.name} className="w-full h-full text-sm sm:text-lg rounded-full" />
                        </div>
                        <span className={`absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border-2 border-[#08090C] ${f.status === 'in_game' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-slate-300 font-medium truncate max-w-[48px] group-hover:text-white group-hover:underline">
                        {f.name}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-2 text-center">
                  <p className="text-[11px] text-slate-400">
                    {!wallet.address ? 'Connect wallet to see friends' : 'No friends online right now'}
                  </p>
                  <button
                    type="button"
                    onClick={onOpenFriends}
                    className="mt-1.5 px-3 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[10px] text-slate-300 hover:text-white font-medium transition-all inline-flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Find & Add Friends</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation — replaces hidden left sidebar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-[#0C0F14]/95 backdrop-blur-xl border-t border-white/[0.06] safe-bottom">
        <div className="flex items-center justify-around py-2 px-2 max-w-md mx-auto">
          <button
            type="button"
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-[#FF4600]"
          >
            <Home className="w-5 h-5" />
            <span className="text-[9px] font-bold">Home</span>
          </button>
          <button
            type="button"
            onClick={() => onQuickJoin?.('100')}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Gamepad2 className="w-5 h-5" />
            <span className="text-[9px] font-bold">Play</span>
          </button>
          <button
            type="button"
            onClick={onOpenLeaderboard}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[9px] font-bold">Ranks</span>
          </button>
          <button
            type="button"
            onClick={onOpenRules}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[9px] font-bold">Rules</span>
          </button>
        </div>
      </div>

      <UserProfileModal
        isOpen={!!inspectProfile}
        onClose={() => setInspectProfile(null)}
        user={inspectProfile}
        currentUserAddress={wallet.address}
        currentUserId={account?.id}
      />

      <SpectatorRoomsModal
        isOpen={isSpectatorModalOpen}
        onClose={() => setIsSpectatorModalOpen(false)}
        rooms={liveRooms}
        onSpectateRoom={onSpectateRoom}
        onRefreshRooms={onRefreshLiveRooms || (() => {})}
        playerName={playerName}
        playerAvatar={selectedAvatar}
      />
    </div>
  );
};
