'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Socket } from 'socket.io-client';
import { useAccount } from 'wagmi';
import { getConnect4Socket, disconnectConnect4Socket } from '@/lib/socket/socketFactory';
import { useConnect4Stats } from '@/hooks/useConnect4Stats';
import { c4Audio } from '@/lib/connect4/audio';
import { Connect4Board, CellValue, ROWS, COLS } from './Connect4Board';
import {
  createLocalConnect4Room,
  executeLocalDrop,
  getBotBestMove,
} from '@/lib/connect4/localConnect4Engine';
import { WalletConnect } from '@/components/shared/WalletConnect';
import { UserProfileModal, UserProfileTarget } from '@/components/shared/UserProfileModal';
import { toast } from 'sonner';
import {
  Trophy,
  Zap,
  Users,
  Bot,
  Volume2,
  VolumeX,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Flame,
  Shield,
  HelpCircle,
  MessageSquare,
  ArrowLeft,
  X,
  Swords,
  Sparkles,
  AlertCircle,
  Clock,
  Radio,
  Gamepad2,
  Music,
  Eye,
} from 'lucide-react';

export interface Connect4Player {
  socketId?: string;
  address: string;
  displayName: string;
  avatar: string;
  elo: number;
  playerNumber: 1 | 2;
  isBot?: boolean;
}

export interface Connect4RoomState {
  roomCode: string;
  gameId: string;
  isQuickMatch?: boolean;
  players: Connect4Player[];
  board: CellValue[][];
  currentTurn: 1 | 2;
  status: 'waiting' | 'playing' | 'game_over';
  winner: 1 | 2 | 'draw' | null;
  winningLine: [number, number][] | null;
  turnDeadline: number;
  settlementTxHash?: string;
  eloChanges?: {
    winnerAddress: string;
    loserAddress: string;
    winDelta: number;
    loseDelta: number;
  };
}

export interface ChatMessage {
  sender: string;
  playerNumber: 1 | 2;
  message: string;
  timestamp: number;
}

const QUICK_EMOTES = [
  '🎯 Bullseye!',
  '🧠 Big Brain!',
  '🔥 Nice Drop!',
  '😱 Watch out!',
  '🛡️ Blocked!',
  '🤝 Good Game!',
];

export default function Connect4GameApp() {
  const { address: userAddress, isConnected } = useAccount();
  const { stats, refetch: refetchStats } = useConnect4Stats(userAddress);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [roomState, setRoomState] = useState<Connect4RoomState | null>(null);
  const [matchmakingSearching, setMatchmakingSearching] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMusicOn, setIsMusicOn] = useState(true);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'bot' | 'private'>('quick');
  const [secondsRemaining, setSecondsRemaining] = useState(20);
  const [isGameOverMinimized, setIsGameOverMinimized] = useState(false);
  const [inspectProfile, setInspectProfile] = useState<UserProfileTarget | null>(null);
  const isLocalMatchRef = useRef<boolean>(false);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Initialize Socket.io Connection
  useEffect(() => {
    const s = getConnect4Socket();
    setSocket(s);

    function onConnect() {
      setSocketConnected(true);
    }
    function onDisconnect() {
      setSocketConnected(false);
    }
    function onRoomState(state: Connect4RoomState) {
      setRoomState(state);
      setMatchmakingSearching(false);
      setErrorMessage(null);
      isLocalMatchRef.current = false;
      if (state.status !== 'game_over') {
        setIsGameOverMinimized(false);
      }
    }
    function onMatchmakingQueued() {
      setMatchmakingSearching(true);
    }
    function onMatchmakingCancelled() {
      setMatchmakingSearching(false);
    }
    function onChatMessage(msg: ChatMessage) {
      setChatMessages((prev) => [...prev.slice(-30), msg]);
    }
    function onErrorMsg(data: { message: string }) {
      setErrorMessage(data.message);
      setTimeout(() => setErrorMessage(null), 4000);
    }
    function onSettlement(data: { txHash: string; winnerAddress: string; winDelta?: number }) {
      if (data?.txHash) {
        toast.success(`⚡ On-Chain ELO Settled! +${data.winDelta || 16} ELO recorded on Hemi Sepolia!`, {
          action: {
            label: 'View Tx',
            onClick: () => window.open(`https://testnet.explorer.hemi.network/tx/${data.txHash}`, '_blank'),
          },
        });
      }
    }

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('room_state', onRoomState);
    s.on('matchmaking_queued', onMatchmakingQueued);
    s.on('matchmaking_cancelled', onMatchmakingCancelled);
    s.on('chat_message', onChatMessage);
    s.on('error_message', onErrorMsg);
    s.on('c4_settlement', onSettlement);

    if (s.connected) {
      setSocketConnected(true);
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('room_state', onRoomState);
      s.off('matchmaking_queued', onMatchmakingQueued);
      s.off('matchmaking_cancelled', onMatchmakingCancelled);
      s.off('chat_message', onChatMessage);
      s.off('error_message', onErrorMsg);
      s.off('c4_settlement', onSettlement);
    };
  }, []);

  // Handle mid-game wallet disconnection
  useEffect(() => {
    if (!isConnected && roomState) {
      setRoomState(null);
      setMatchmakingSearching(false);
      toast.info('Wallet disconnected. Returned to lobby.');
    }
  }, [isConnected, roomState]);

  // Determine current player's number (1 or 2)
  const myPlayerNumber: 1 | 2 | null = useMemo(() => {
    if (!roomState) return null;
    if (isLocalMatchRef.current) return 1;

    // 1. Primary match: Match by current client socket ID (supports multi-tab testing on same device)
    if (socket?.id) {
      const socketMatch = roomState.players.find((p) => p.socketId === socket.id);
      if (socketMatch) return socketMatch.playerNumber;
    }

    // 2. Secondary match: Match by wallet address
    if (userAddress) {
      const match = roomState.players.find(
        (p) => p.address.toLowerCase() === userAddress.toLowerCase()
      );
      if (match) return match.playerNumber;
    }

    // Fallback: match by seating
    return roomState.players[0]?.playerNumber || 1;
  }, [roomState, socket?.id, userAddress]);

  const p1 = roomState?.players.find((p) => p.playerNumber === 1);
  const p2 = roomState?.players.find((p) => p.playerNumber === 2);
  const isMyTurn = myPlayerNumber !== null && roomState?.currentTurn === myPlayerNumber;

  // Sound alert on turn change
  useEffect(() => {
    if (roomState?.status === 'playing' && isMyTurn) {
      c4Audio.playTurnAlert();
    }
  }, [roomState?.currentTurn, isMyTurn, roomState?.status]);

  // Sound fanfare on game over
  useEffect(() => {
    if (roomState?.status === 'game_over') {
      if (roomState.winner === myPlayerNumber) {
        c4Audio.playWin();
      }
      refetchStats();
    }
  }, [roomState?.status, roomState?.winner, myPlayerNumber, refetchStats]);

  // Turn Countdown Timer
  useEffect(() => {
    if (roomState?.status !== 'playing' || !roomState.turnDeadline) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((roomState.turnDeadline - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    }, 500);

    return () => clearInterval(interval);
  }, [roomState?.status, roomState?.turnDeadline]);

  // Auto-scroll chat
  useEffect(() => {
    if (showChat) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

  // Audio Toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    c4Audio.enabled = next;
    if (next) c4Audio.playClick();
  };

  // Background Music Toggle
  const toggleMusic = () => {
    const next = !isMusicOn;
    setIsMusicOn(next);
    c4Audio.setMusicEnabled(next);
    if (next) {
      const targetMode = roomState?.status === 'playing' ? 'game' : 'lobby';
      c4Audio.startMusic(targetMode);
    }
  };

  // Dynamic BGM Track Switching & Browser Autoplay Unlock
  useEffect(() => {
    const targetMode = roomState?.status === 'playing' ? 'game' : 'lobby';
    if (isMusicOn && soundEnabled) {
      c4Audio.startMusic(targetMode);
    }

    const handleFirstGesture = () => {
      if (isMusicOn && soundEnabled) {
        c4Audio.startMusic(targetMode);
      }
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };

    window.addEventListener('click', handleFirstGesture);
    window.addEventListener('keydown', handleFirstGesture);
    window.addEventListener('touchstart', handleFirstGesture);

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
  }, [roomState?.status, isMusicOn, soundEnabled]);

  // Stop music on unmount
  useEffect(() => {
    return () => {
      c4Audio.stopMusic();
    };
  }, []);

  // Lobby Actions
  const handleQuickMatch = () => {
    c4Audio.playClick();
    isLocalMatchRef.current = false;

    if (!isConnected || !userAddress) {
      toast.error('Please connect your Web3 wallet to play Connect 4');
      return;
    }

    if (!socket || !socket.connected) {
      setErrorMessage('Connecting to Connect 4 game server... Please try again in a moment.');
      return;
    }

    setMatchmakingSearching(true);
    socket.emit('join_matchmaking', {
      address: userAddress,
      displayName: `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`,
      avatar: '🦊',
    });
  };

  const handleCancelMatchmaking = () => {
    c4Audio.playClick();
    setMatchmakingSearching(false);
    if (socket && socket.connected) {
      socket.emit('cancel_matchmaking');
      if (roomState?.roomCode) {
        socket.emit('leave_room', { roomCode: roomState.roomCode });
      }
    }
    setRoomState(null);
  };

  const handlePlayBot = () => {
    c4Audio.playClick();

    if (!isConnected || !userAddress) {
      toast.error('Please connect your Web3 wallet to play Connect 4');
      return;
    }

    const launchLocal = () => {
      isLocalMatchRef.current = true;
      const localRoom = createLocalConnect4Room(userAddress, undefined, '🦊', 'Hemi Bot ⚡', '🤖');
      setRoomState(localRoom);
      setMatchmakingSearching(false);
      c4Audio.playDrop();
    };

    if (socket && socket.connected) {
      let answered = false;
      setTimeout(() => {
        if (!answered) {
          answered = true;
          launchLocal();
        }
      }, 1200);

      socket.emit('play_vs_bot', {
        address: userAddress,
        displayName: `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`,
        avatar: '🦊',
      });
    } else {
      launchLocal();
    }
  };

  const handleCreatePrivateRoom = () => {
    if (!isConnected || !userAddress) {
      toast.error('Please connect your Web3 wallet to create a room');
      return;
    }
    if (!socket || !socket.connected) {
      handlePlayBot();
      return;
    }
    c4Audio.playClick();
    socket.emit('create_room', {
      address: userAddress,
      displayName: `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`,
      avatar: '🦊',
    });
  };

  const handleJoinPrivateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    if (!isConnected || !userAddress) {
      toast.error('Please connect your Web3 wallet to join a room');
      return;
    }
    if (!socket || !socket.connected) {
      handlePlayBot();
      return;
    }
    c4Audio.playClick();
    socket.emit('join_room', {
      roomCode: joinCodeInput.trim(),
      address: userAddress,
      displayName: `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`,
      avatar: '⚡',
    });
  };

  // In-Game Actions
  const handleDropDisc = (col: number) => {
    if (!roomState) return;

    if (isLocalMatchRef.current) {
      if (roomState.status !== 'playing' || roomState.currentTurn !== 1) return;
      const res = executeLocalDrop(roomState, 1, col);
      if (!res.success) return;

      c4Audio.playDrop();
      setRoomState(res.newState);

      if (res.newState.status === 'playing' && res.newState.currentTurn === 2) {
        setTimeout(() => {
          setRoomState((latest) => {
            if (!latest || latest.status !== 'playing' || latest.currentTurn !== 2) return latest;
            const botCol = getBotBestMove(latest.board, 2);
            const botRes = executeLocalDrop(latest, 2, botCol);
            if (botRes.success) {
              c4Audio.playDrop();
              return botRes.newState;
            }
            return latest;
          });
        }, 650);
      }
      return;
    }

    if (!socket) return;
    socket.emit('drop_disc', {
      roomCode: roomState.roomCode,
      col,
    });
  };

  const handleRematch = () => {
    if (isLocalMatchRef.current && roomState) {
      c4Audio.playClick();
      const opp = roomState.players.find((p) => p.playerNumber === 2);
      const fresh = createLocalConnect4Room(userAddress, undefined, '🦊', opp?.displayName || 'Hemi Bot ⚡', opp?.avatar || '🤖');
      setRoomState(fresh);
      return;
    }
    if (!socket || !roomState) return;
    c4Audio.playClick();
    socket.emit('rematch', { roomCode: roomState.roomCode });
  };

  const handleForfeit = () => {
    if (isLocalMatchRef.current && roomState) {
      c4Audio.playClick();
      setRoomState({
        ...roomState,
        status: 'game_over',
        winner: 2,
      });
      return;
    }
    if (!socket || !roomState) return;
    if (confirm('Are you sure you want to forfeit this match? Your opponent will take the win.')) {
      c4Audio.playClick();
      socket.emit('forfeit', { roomCode: roomState.roomCode });
    }
  };

  const handleLeaveRoom = () => {
    c4Audio.playClick();
    if (socket && socket.connected && roomState) {
      socket.emit('leave_room', { roomCode: roomState.roomCode });
      socket.emit('cancel_matchmaking');
    }
    isLocalMatchRef.current = false;
    setRoomState(null);
    setMatchmakingSearching(false);
    setChatMessages([]);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !roomState || !chatInput.trim()) return;
    socket.emit('send_chat', {
      roomCode: roomState.roomCode,
      message: chatInput.trim(),
    });
    setChatInput('');
  };

  const handleSendEmote = (emote: string) => {
    if (!socket || !roomState) return;
    c4Audio.playClick();
    socket.emit('send_chat', {
      roomCode: roomState.roomCode,
      message: emote,
    });
  };

  const copyRoomCode = () => {
    if (roomState?.roomCode) {
      navigator.clipboard.writeText(roomState.roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-slate-100 flex flex-col justify-between selection:bg-[#FF4600]/30 selection:text-white">
      {/* ── Background Cosmic Glow ── */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[380px] bg-[#FF4600]/[0.07] blur-[150px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[300px] bg-[#F59E0B]/[0.04] blur-[130px] pointer-events-none -z-10" />

      {/* ── Error Toast ── */}
      {errorMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 text-xs font-semibold backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Top Standalone Navigation Header ── */}
      <header className="sticky top-0 z-40 w-full border-b border-[#FF4600]/20 bg-[#08090C]/90 backdrop-blur-xl px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          
          {/* Left: Arcade Back Button & Brand Logo */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all group shrink-0"
              title="Return to Hybrid Hub"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform text-[#FF4600]" />
              <span className="font-bold text-xs">Arcade</span>
            </Link>

            <div className="flex items-center gap-2 shrink-0">
              <img
                src="/hemi-connect4-logo.svg"
                alt="Hemi Connect 4"
                className="h-7 sm:h-9 w-auto max-w-[130px] xs:max-w-[160px] sm:max-w-[210px] object-contain shrink-0"
              />
              <span className="hidden md:inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF4600]/15 border border-[#FF4600]/40 text-[#FF4600]">
                1v1 ELO RANKED
              </span>
            </div>
          </div>

          {/* Center: Live Engine Status */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-[11px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-400">
              {socketConnected ? 'Authoritative Engine Live' : 'Connecting to /connect4...'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[#FF4600]">Hemi Sepolia</span>
          </div>

          {/* Right: Music, Sound, Rules, Wallet */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Background Music Toggle */}
            <button
              onClick={toggleMusic}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                isMusicOn && soundEnabled
                  ? 'bg-[#FF4600]/15 border-[#FF4600]/50 text-[#FF4600] shadow-[0_0_12px_rgba(255,70,0,0.25)]'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-500 hover:text-slate-300'
              }`}
              title={isMusicOn ? 'Mute Background Music' : 'Play Background Music'}
            >
              <Music className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isMusicOn && soundEnabled ? 'animate-pulse text-[#FF4600]' : ''}`} />
              <span className="text-[10px] font-mono font-bold hidden md:inline">
                {isMusicOn && soundEnabled ? 'BGM ON' : 'BGM OFF'}
              </span>
            </button>

            <button
              onClick={toggleSound}
              className="hidden xs:flex p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF4600]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
              )}
            </button>

            <button
              onClick={() => setShowRulesModal(true)}
              className="p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Game Rules & Guide"
            >
              <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 hover:text-slate-200" />
            </button>

            <WalletConnect />
          </div>
        </div>
      </header>

      {/* ── Main View Container ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col justify-center">
        
        {/* VIEW 1: LOBBY & MATCHMAKING */}
        {(!roomState || roomState.status === 'waiting') && (
          <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
            
            {/* Waiting in Private / Quick Match Room Banner */}
            {roomState && roomState.status === 'waiting' && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-[#FF4600]/20 via-obsidian-900 to-obsidian-950 border border-[#FF4600]/40 text-center space-y-4 shadow-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF4600]/20 text-[#FF4600] text-xs font-mono font-bold">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  {roomState.isQuickMatch ? 'QUICK MATCH: WAITING FOR 1v1 CHALLENGER' : 'WAITING FOR OPPONENT'}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {roomState.isQuickMatch ? (
                    <>
                      Temporary Server Created: <span className="font-mono text-[#FF4600]">{roomState.roomCode}</span>
                    </>
                  ) : (
                    <>
                      Room Ready: <span className="font-mono text-[#FF4600]">{roomState.roomCode}</span>
                    </>
                  )}
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                  {roomState.isQuickMatch ? (
                    <>
                      Your temporary 1v1 match server is live. When another player clicks <strong>Quick Match</strong>, the match begins automatically! You can also share the code with a friend.
                    </>
                  ) : (
                    <>
                      Share this room code with a friend or rival. The match begins instantly once they drop in!
                    </>
                  )}
                </p>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={copyRoomCode}
                    className="px-5 py-2.5 rounded-xl bg-[#FF4600] hover:bg-[#e83a00] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#FF4600]/25 transition-all"
                  >
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'Room Code Copied!' : 'Copy Code'}</span>
                  </button>

                  <button
                    onClick={handleLeaveRoom}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-all"
                  >
                    {roomState.isQuickMatch ? 'Cancel Matchmaking' : 'Cancel Room'}
                  </button>
                </div>
              </div>
            )}

            {/* Hero & On-Chain Stats Card */}
            {(!roomState || roomState.status !== 'waiting') && (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 p-6 sm:p-8 backdrop-blur-md">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  {/* Left Column: Title & Hook */}
                  <div className="space-y-3 text-center md:text-left max-w-lg">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF4600]/15 border border-[#FF4600]/30 text-xs font-mono font-bold text-[#FF4600]">
                      <Sparkles className="w-3.5 h-3.5" />
                      NEW ARCADE TITLE
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
                      Drop. Connect. <span className="text-[#FF4600]">Rule the Grid.</span>
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                      The classic 4-in-a-row vertical gravity showdown, supercharged with on-chain ELO ratings on Hemi Sepolia. Outwit your rival in blitz 20s turns!
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-[#FF4600]" />
                        Contract: <span className="text-slate-200">0xfe6d...afa3</span>
                      </span>
                      <a
                        href="https://testnet.explorer.hemi.network/address/0xfe6dc2c29b9f0e83c229a9a3deb1c89cde81afa3"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#FF4600] hover:underline flex items-center gap-1"
                      >
                        Explorer <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Right Column: Player On-Chain Stats Badge */}
                  <div className="w-full md:w-auto min-w-[280px] p-5 rounded-2xl bg-black/40 border border-[#FF4600]/25 backdrop-blur-xl shadow-xl flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#FF4600]/20 border border-[#FF4600]/40 flex items-center justify-center text-sm">
                          🦊
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">
                            {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Wallet Disconnected'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {isConnected ? 'Wallet Connected' : 'Connect Wallet to Play'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-mono uppercase text-slate-400">Your ELO</div>
                        <div className="text-lg font-black font-mono text-[#FF4600]">
                          {stats.elo} <span className="text-[10px] text-slate-400 font-normal">HC4ELO</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-[10px] font-mono text-slate-400">Wins</div>
                        <div className="text-sm font-bold text-emerald-400">{stats.wins}</div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-[10px] font-mono text-slate-400">Losses</div>
                        <div className="text-sm font-bold text-rose-400">{stats.losses}</div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="text-[10px] font-mono text-slate-400">Streak</div>
                        <div className="text-sm font-bold text-amber-400 flex items-center justify-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{stats.currentStreak}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mode Selector & Action Launchpads */}
            {(!roomState || roomState.status !== 'waiting') && (
              <div className="space-y-4">
                {/* Connect Wallet Required Banner */}
                {!isConnected && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FF4600]/15 via-black/40 to-[#FF4600]/10 border border-[#FF4600]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FF4600]/20 border border-[#FF4600]/40 flex items-center justify-center text-[#FF4600] shrink-0">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Web3 Wallet Required</div>
                        <div className="text-xs text-slate-400">Connect your Web3 wallet to play Connect 4, climb the on-chain leaderboard, and challenge opponents.</div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <WalletConnect />
                    </div>
                  </div>
                )}

                {/* Tabs */}
                <div className="flex items-center gap-1.5 sm:gap-2 border-b border-white/10 pb-2 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setActiveTab('quick')}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap shrink-0 ${
                      activeTab === 'quick'
                        ? 'bg-[#FF4600] text-white shadow-lg shadow-[#FF4600]/25'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="hidden sm:inline">⚔️ Ranked Quick Match</span>
                    <span className="sm:hidden">Ranked 1v1</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('bot')}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap shrink-0 ${
                      activeTab === 'bot'
                        ? 'bg-[#FF4600] text-white shadow-lg shadow-[#FF4600]/25'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="hidden sm:inline">🤖 Practice vs HemiBot</span>
                    <span className="sm:hidden">vs HemiBot</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('private')}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap shrink-0 ${
                      activeTab === 'private'
                        ? 'bg-[#FF4600] text-white shadow-lg shadow-[#FF4600]/25'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="hidden sm:inline">🎯 Custom Room</span>
                    <span className="sm:hidden">Custom Room</span>
                  </button>
                </div>

                {/* Tab 1: Quick Match */}
                {activeTab === 'quick' && (
                  <div className="p-6 rounded-2xl bg-obsidian-900 border border-[#FF4600]/30 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="space-y-1 text-center sm:text-left">
                      <h3 className="text-base font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                        <Flame className="w-4 h-4 text-[#FF4600]" />
                        Global 1v1 Ranked Matchmaking
                      </h3>
                      <p className="text-xs text-slate-400">
                        Drop into the queue. Matches automatically settle into on-chain ELO upon conclusion.
                      </p>
                    </div>

                    {matchmakingSearching ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FF4600]/15 border border-[#FF4600]/40 text-xs font-mono text-[#FF4600]">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#FF4600]" />
                          <span>Searching for challenger...</span>
                        </div>
                        <button
                          onClick={handleCancelMatchmaking}
                          className="px-3.5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-400 hover:text-white transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleQuickMatch}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF4600] to-[#e03a00] hover:brightness-110 text-white font-black text-sm tracking-wide shadow-[0_0_24px_rgba(255,70,0,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Swords className="w-4 h-4" />
                        <span>Find 1v1 Opponent</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Tab 2: HemiBot */}
                {activeTab === 'bot' && (
                  <div className="p-6 rounded-2xl bg-obsidian-900 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="space-y-1 text-center sm:text-left">
                      <h3 className="text-base font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                        <Bot className="w-4 h-4 text-amber-400" />
                        Instant Solo Duel vs HemiBot 🤖
                      </h3>
                      <p className="text-xs text-slate-400">
                        Sharpen your column drops against our tactical AI. Blocks winning lines and punishes misplays!
                      </p>
                    </div>

                    <button
                      onClick={handlePlayBot}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Start Solo Match</span>
                    </button>
                  </div>
                )}

                {/* Tab 3: Private Room */}
                {activeTab === 'private' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Create Room */}
                    <div className="p-5 rounded-2xl bg-obsidian-900 border border-white/10 space-y-3 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white mb-1">Create Private Duel</h4>
                        <p className="text-xs text-slate-400">
                          Generate a dedicated room code and invite your friend to a private 1v1 grid.
                        </p>
                      </div>
                      <button
                        onClick={handleCreatePrivateRoom}
                        className="w-full py-2.5 rounded-xl bg-[#FF4600]/20 hover:bg-[#FF4600]/30 border border-[#FF4600]/50 text-[#FF4600] font-bold text-xs transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Generate Room Code</span>
                      </button>
                    </div>

                    {/* Join Room */}
                    <form
                      onSubmit={handleJoinPrivateRoom}
                      className="p-5 rounded-2xl bg-obsidian-900 border border-white/10 space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-white mb-1">Join with Room Code</h4>
                        <p className="text-xs text-slate-400">
                          Got an invite from a buddy? Enter their room code below to jump in.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. C4-AB12"
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                          className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#FF4600]"
                        />
                        <button
                          type="submit"
                          disabled={!joinCodeInput.trim()}
                          className="px-4 py-2 rounded-xl bg-[#FF4600] hover:bg-[#e83a00] text-white text-xs font-bold transition-all disabled:opacity-40"
                        >
                          Join
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* Quick 4-in-a-Row Strategy Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF4600]" />
                  1. Center Control
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  The 4th column connects to the most winning combinations. Guard it with your life.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                  2. Spot Diagonal Traps
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Vertical and horizontal lines are easy to see. Watch out for sneaky diagonal 3-in-a-rows.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  3. 20s Blitz Clocks
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Timeouts force a random drop! Keep your momentum flowing before the buzzer sounds.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: LIVE 1v1 MATCH ARENA */}
        {roomState && (roomState.status === 'playing' || roomState.status === 'game_over') && (
          <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
            
            {/* ── Top Match Header Bar ── */}
            <div className="p-2.5 xs:p-3 sm:p-5 rounded-2xl bg-gradient-to-r from-obsidian-900 via-obsidian-950 to-obsidian-900 border border-white/10 shadow-2xl flex items-center justify-between gap-1.5 sm:gap-4">
              
              {/* Player 1 Card (Orange Disc) */}
              <button
                type="button"
                onClick={() => setInspectProfile({
                  name: p1?.displayName || 'Player 1',
                  avatar: p1?.avatar || '🦊',
                  address: p1?.address,
                })}
                className={`flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2.5 rounded-xl transition-all min-w-0 cursor-pointer text-left hover:scale-102 hover:border-[#FF4600] group/p1 ${
                  roomState.currentTurn === 1
                    ? 'bg-[#FF4600]/15 border border-[#FF4600]/50 shadow-[0_0_15px_rgba(255,70,0,0.2)]'
                    : 'opacity-70 hover:opacity-100 border border-transparent'
                }`}
                title={`View ${p1?.displayName || 'Player 1'}'s profile`}
              >
                <div className="relative shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#FF6A00] to-[#CC3300] border-2 border-[#FF8C00] shadow-md flex items-center justify-center text-sm sm:text-lg group-hover/p1:scale-110 transition-transform">
                    {p1?.avatar || '🦊'}
                  </div>
                  {roomState.currentTurn === 1 && (
                    <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-[#FF4600] border-2 border-black animate-ping" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[70px] xs:max-w-[100px] sm:max-w-none group-hover/p1:underline">
                      {p1?.displayName || 'Player 1'}
                    </span>
                    {myPlayerNumber === 1 && (
                      <span className="px-1 py-0.2 rounded text-[8px] sm:text-[9px] font-mono bg-white/10 text-[#FF4600] shrink-0">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-mono text-slate-400 truncate">
                    <span className="hidden xs:inline text-[#FF4600] font-bold">Orange • </span>ELO: {p1?.elo || 1200}
                  </div>
                </div>
              </button>

              {/* Center Match Info: 20s Countdown Timer */}
              <div className="flex flex-col items-center shrink-0 px-1">
                <div className="text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-0.5 sm:mb-1">
                  {roomState.status === 'playing' ? (
                    isMyTurn ? (
                      <span className="text-[#FF4600] font-bold animate-pulse">Your Turn</span>
                    ) : (
                      <span>Rival Turn</span>
                    )
                  ) : (
                    <span>Finished</span>
                  )}
                </div>

                <div
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-mono font-bold ${
                    secondsRemaining <= 5
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-bounce'
                      : 'bg-white/5 text-slate-300 border border-white/10'
                  }`}
                >
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{secondsRemaining}s</span>
                </div>
              </div>

              {/* Player 2 Card (Gold Disc) */}
              <button
                type="button"
                onClick={() => setInspectProfile({
                  name: p2?.displayName || (p2?.isBot ? 'HemiBot 🤖' : 'Player 2'),
                  avatar: p2?.avatar || (p2?.isBot ? '🤖' : '⚡'),
                  address: p2?.address,
                  isBot: p2?.isBot,
                })}
                className={`flex items-center gap-1.5 sm:gap-3 p-1.5 sm:p-2.5 rounded-xl transition-all min-w-0 justify-end cursor-pointer text-right hover:scale-102 hover:border-[#F59E0B] group/p2 ${
                  roomState.currentTurn === 2
                    ? 'bg-[#F59E0B]/15 border border-[#F59E0B]/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'opacity-70 hover:opacity-100 border border-transparent'
                }`}
                title={`View ${p2?.displayName || (p2?.isBot ? 'HemiBot' : 'Player 2')}'s profile`}
              >
                <div className="text-right min-w-0">
                  <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                    {myPlayerNumber === 2 && (
                      <span className="px-1 py-0.2 rounded text-[8px] sm:text-[9px] font-mono bg-white/10 text-amber-400 shrink-0">
                        YOU
                      </span>
                    )}
                    <span className="text-xs font-bold text-white truncate max-w-[70px] xs:max-w-[100px] sm:max-w-none group-hover/p2:underline">
                      {p2?.displayName || (p2?.isBot ? 'HemiBot 🤖' : 'Player 2')}
                    </span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] font-mono text-slate-400 truncate">
                    <span className="hidden xs:inline text-[#F59E0B] font-bold">Gold • </span>ELO: {p2?.elo || 1200}
                  </div>
                </div>

                <div className="relative shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#FBBF24] to-[#D97706] border-2 border-[#FDE68A] shadow-md flex items-center justify-center text-sm sm:text-lg group-hover/p2:scale-110 transition-transform">
                    {p2?.avatar || (p2?.isBot ? '🤖' : '⚡')}
                  </div>
                  {roomState.currentTurn === 2 && (
                    <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#F59E0B] border-2 border-black animate-ping" />
                  )}
                </div>
              </button>

            </div>

            {/* ── Interactive Connect 4 Board ── */}
            <div className="relative py-2">
              <Connect4Board
                board={roomState.board}
                myPlayerNumber={myPlayerNumber}
                currentTurn={roomState.currentTurn}
                winningLine={roomState.winningLine}
                onDropDisc={handleDropDisc}
                disabled={roomState.status !== 'playing'}
              />
            </div>

            {/* ── In-Game Battle Action Bar: Emotes, Chat, Forfeit ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
              
              {/* Emotes Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase mr-1 hidden sm:inline">
                  Taunts:
                </span>
                {QUICK_EMOTES.map((emote) => (
                  <button
                    key={emote}
                    onClick={() => handleSendEmote(emote)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-slate-300 hover:text-white transition-all whitespace-nowrap active:scale-95"
                  >
                    {emote}
                  </button>
                ))}
              </div>

              {/* Utility Buttons: Chat toggle & Forfeit */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setShowChat(!showChat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    showChat
                      ? 'bg-[#FF4600]/20 border-[#FF4600]/50 text-[#FF4600]'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat ({chatMessages.length})</span>
                </button>

                {roomState.status === 'playing' && (
                  <button
                    onClick={handleForfeit}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-semibold transition-all"
                  >
                    Forfeit
                  </button>
                )}
              </div>

            </div>

            {/* In-Game Chat Drawer (Fold-out) */}
            {showChat && (
              <div className="p-4 rounded-2xl bg-obsidian-950 border border-white/10 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#FF4600]" />
                    Match Arena Chat
                  </span>
                  <button
                    onClick={() => setShowChat(false)}
                    className="text-slate-500 hover:text-white text-xs"
                  >
                    Close
                  </button>
                </div>

                <div className="h-32 overflow-y-auto space-y-2 pr-2 text-xs">
                  {chatMessages.length === 0 ? (
                    <div className="text-slate-500 italic text-center py-6 text-[11px]">
                      No messages yet. Send a taunt or say hello!
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div key={i} className="flex items-baseline gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const senderPlayer = roomState?.players.find(p => p.playerNumber === msg.playerNumber);
                            setInspectProfile({
                              name: msg.sender,
                              avatar: senderPlayer?.avatar,
                              address: senderPlayer?.address,
                              isBot: senderPlayer?.isBot,
                            });
                          }}
                          className={`font-bold font-mono text-[11px] hover:underline cursor-pointer transition-colors ${
                            msg.playerNumber === 1 ? 'text-[#FF4600]' : 'text-amber-400'
                          }`}
                          title={`View ${msg.sender}'s profile`}
                        >
                          {msg.sender}:
                        </button>
                        <span className="text-slate-200">{msg.message}</span>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a friendly message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#FF4600]"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="px-3.5 py-1.5 rounded-xl bg-[#FF4600] text-white text-xs font-bold disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}

          </div>
        )}

      </main>

      {/* ── VICTORY / GAME OVER ON-BOARD TOAST & INSPECT GRID ── */}
      {roomState && roomState.status === 'game_over' && (
        isGameOverMinimized ? (
          /* Minimized Floating Toast on the Board */
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[92%] p-3.5 sm:px-5 rounded-2xl bg-[#080B10]/95 border border-[#FF4600]/50 shadow-[0_0_35px_rgba(255,70,0,0.35)] backdrop-blur-md flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl sm:text-2xl shrink-0">
                {roomState.winner === myPlayerNumber ? '🏆' : roomState.winner === 'draw' ? '🤝' : '💥'}
              </span>
              <div className="min-w-0 text-left">
                <div className="text-xs sm:text-sm font-black text-white truncate">
                  {roomState.winner === myPlayerNumber
                    ? 'Connect 4 Victory!'
                    : roomState.winner === 'draw'
                    ? 'Grid Stalemate!'
                    : 'Match Concluded'}
                </div>
                <div className="text-[10px] sm:text-[11px] font-mono text-slate-400">
                  {roomState.eloChanges ? (
                    roomState.winner === myPlayerNumber ? (
                      <span className="text-emerald-400 font-bold">+{roomState.eloChanges.winDelta} HC4ELO</span>
                    ) : (
                      <span className="text-rose-400 font-bold">-{roomState.eloChanges.loseDelta} HC4ELO</span>
                    )
                  ) : (
                    'Final Board Position'
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsGameOverMinimized(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer"
                title="View full match details, ELO changes, and settlement"
              >
                <Eye className="w-3.5 h-3.5 text-[#FF4600]" />
                <span className="hidden sm:inline">Details</span>
              </button>

              <button
                onClick={() => {
                  setIsGameOverMinimized(false);
                  handleRematch();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#FF4600] hover:bg-[#e83a00] text-white text-xs font-bold transition-all shadow-md shadow-[#FF4600]/30 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rematch</span>
              </button>
            </div>
          </div>
        ) : (
          /* Translucent Floating Outcome Card directly over the Board */
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-obsidian-900/95 to-obsidian-950/95 border border-[#FF4600]/40 shadow-[0_0_50px_rgba(255,70,0,0.35)] text-center space-y-5 animate-in zoom-in-95 duration-200 backdrop-blur-md">
              
              {/* Inspect Grid Button in Top-Right */}
              <button
                onClick={() => setIsGameOverMinimized(true)}
                className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Minimize popup to clearly inspect the 4-in-a-row winning line"
              >
                <Eye className="w-3.5 h-3.5 text-[#FF4600]" />
                <span>Inspect Grid</span>
              </button>

              {/* Crown / Icon */}
              <div className="mx-auto w-16 h-16 rounded-2xl bg-[#FF4600]/20 border border-[#FF4600]/50 flex items-center justify-center text-3xl shadow-lg shadow-[#FF4600]/20">
                {roomState.winner === myPlayerNumber
                  ? '🏆'
                  : roomState.winner === 'draw'
                  ? '🤝'
                  : '💥'}
              </div>

              {/* Victory Headline */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {roomState.winner === myPlayerNumber
                    ? 'CONNECT 4 VICTORY!'
                    : roomState.winner === 'draw'
                    ? 'GRID STALEMATE!'
                    : 'MATCH CONCLUDED'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  {roomState.winner === myPlayerNumber
                    ? 'Outstanding tactical eye! 4 in a row locked down.'
                    : roomState.winner === 'draw'
                    ? 'The matrix is completely full without a victor.'
                    : 'Well fought! Regroup, counter, and line up the next drop.'}
                </p>
              </div>

              {/* ELO Changes Card */}
              {roomState.eloChanges && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    On-Chain ELO Adjustment
                  </div>
                  <div className="flex items-center justify-around">
                    <div>
                      <div className="text-xs text-slate-400">Winner</div>
                      <div className="text-base font-black font-mono text-emerald-400">
                        +{roomState.eloChanges.winDelta} HC4ELO
                      </div>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div>
                      <div className="text-xs text-slate-400">Loser</div>
                      <div className="text-base font-black font-mono text-rose-400">
                        -{roomState.eloChanges.loseDelta} HC4ELO
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* On-Chain Settlement Status */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Hemi Sepolia Settlement:</span>
                  {roomState.settlementTxHash ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Confirmed On-Chain
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Oracle Broadcasting...
                    </span>
                  )}
                </div>

                {roomState.settlementTxHash && (
                  <a
                    href={`https://testnet.explorer.hemi.network/tx/${roomState.settlementTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 text-[#FF4600] hover:underline font-mono text-[11px] pt-1"
                  >
                    <span>Tx: {roomState.settlementTxHash.slice(0, 10)}...{roomState.settlementTxHash.slice(-8)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={() => setIsGameOverMinimized(true)}
                  className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-[#FF4600]" />
                  <span>Inspect Grid</span>
                </button>

                <button
                  onClick={() => {
                    setIsGameOverMinimized(false);
                    handleRematch();
                  }}
                  className="w-full py-3 rounded-xl bg-[#FF4600] hover:bg-[#e83a00] text-white font-bold text-xs shadow-lg shadow-[#FF4600]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Play Rematch</span>
                </button>

                <button
                  onClick={handleLeaveRoom}
                  className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Lobby
                </button>
              </div>

            </div>
          </div>
        )
      )}

      {/* ── RULES & HOW TO PLAY MODAL ── */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-obsidian-950 border border-white/15 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-[#FF4600]" />
                <h3 className="text-base font-bold text-white">How to Play Hemi Connect 4</h3>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="font-bold text-white">🎯 Objective</span>
                <p>
                  Be the first pilot to connect <strong className="text-[#FF4600]">4 consecutive discs</strong> of your color in any direction: horizontally, vertically, or diagonally.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="font-bold text-white">⬇️ Gravity Drop Rule</span>
                <p>
                  Discs fall down the selected column to the lowest available unoccupied slot. You cannot drop into a full column.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="font-bold text-white">⏱️ 20-Second Blitz Clocks</span>
                <p>
                  Each player gets a 20s countdown per turn. If the timer hits zero, a disc is dropped randomly into an open column to keep the pace fast.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                <span className="font-bold text-white">🏆 On-Chain Settlement</span>
                <p>
                  At match conclusion, the backend oracle computes the official ELO adjustments and records the match on the deployed HemiConnect4Elo smart contract!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#FF4600] hover:bg-[#e83a00] text-white font-bold text-xs transition-all"
            >
              Got it, let&apos;s drop!
            </button>
          </div>
        </div>
      )}

      {/* ── Standalone Footer ── */}
      <footer className="w-full border-t border-white/5 py-4 px-4 sm:px-6 lg:px-8 text-center text-[11px] font-mono text-slate-500">
        Hemi Connect 4 • Chain: 743111 • Contract: 0xfe6d...afa3 • Unified Hybrid Hub
      </footer>

      {/* Universal User Profile Inspector Modal */}
      <UserProfileModal
        isOpen={!!inspectProfile}
        onClose={() => setInspectProfile(null)}
        user={inspectProfile}
        currentUserAddress={userAddress}
      />
    </div>
  );
}
