'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import { getUnoSocket } from '@/lib/socket/socketFactory';
import { GameState, Player, Card, CardColor, FloatingEmote, ChatMessage, PublicRoomSummary, GameInviteEvent, EnrichedFriend, UserNotification, isWildCard, isDefenseCard, isActionCard } from '@/types/uno';
import { soundEngine } from '@/lib/uno/audio';
import {
  createLocalLobby,
  startLocalGame,
  executePlayerCardMove,
  executePlayerDrawMove,
  executePlayerPassMove,
  runBotStep,
} from '@/lib/uno/localGameEngine';
import { CardComponent } from './CardComponent';
import { OpponentSeat } from './OpponentSeat';
import { CenterTable } from './CenterTable';
import { LobbyView } from './LobbyView';
import { Crazy8ColorModal } from './Crazy8ColorModal';
import { ReactionWheel, FloatingEmoteDisplay } from './ReactionWheel';
import { VictoryModal } from './VictoryModal';
import { RulesModal } from './RulesModal';
import { CardTransferAnimation } from './CardTransferAnimation';
import { ChatPanel } from './ChatPanel';
import { UserProfileModal, UserProfileTarget } from '../shared/UserProfileModal';
import { WalletConnectButton } from './WalletConnectButton';
import { ProfileModal } from './ProfileModal';
import { FriendsModal } from './FriendsModal';
import { GameInviteToast } from './GameInviteToast';
import { HemiUnoLogo } from './HemiUnoLogo';
import { LeaderboardModal } from './LeaderboardModal';
import { CreateTableModal } from './CreateTableModal';
import { ConnectWalletModal } from './ConnectWalletModal';
import { AirdropModal } from './AirdropModal';
import { AirdropTourToast } from './AirdropTourToast';
import { NotificationsModal } from './NotificationsModal';
import { fetchTokenBalance, formatTokenAmount, CRAZY8_TOKEN_SYMBOL } from '@/lib/uno/token';
import {
  WalletState,
  getInjectedProvider,
  getActiveProvider,
  switchOrAddHemiNetwork,
  fetchEthBalance,
  isHemiChain,
  HEMI_SEPOLIA_CONFIG,
  DiscoveredWallet,
  connectWalletProvider,
  clearActiveProvider,
  createGuestArcadeWallet,
} from '@/lib/uno/wallet';
import {
  getOrCreateAccountProfile,
  getAccountProfileForWallet,
  saveAccountProfile,
  syncAccountWithServerProfile,
  isDefaultName,
  getActiveRoomCode,
  setActiveRoomCode,
  getLastConnectedWallet,
  saveLastConnectedWallet,
  AccountProfile,
} from '@/lib/uno/account';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  LogOut,
  Lock,
  Flame,
  Eye,
  MessageSquare,
  Users,
  RefreshCw,
  User,
  Zap,
  Bell,
  Music,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Coins,
  Gift,
  LayoutDashboard,
  ArrowLeft,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';

const COLOR_ORDER: Record<string, number> = { red: 0, blue: 1, green: 2, yellow: 3, wild: 4 };
const VALUE_ORDER: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'skip': 10, 'reverse': 11, 'draw2': 12, 'wild_draw4': 13,
};

function sortPlayerCards(rawCards: Card[] | undefined, mode: 'default' | 'color' | 'value'): Card[] {
  if (!rawCards || rawCards.length === 0) return [];
  if (mode === 'default') return rawCards;
  return [...rawCards].sort((a, b) => {
    if (mode === 'color') {
      const cDiff = (COLOR_ORDER[a.color] ?? 99) - (COLOR_ORDER[b.color] ?? 99);
      if (cDiff !== 0) return cDiff;
      return (VALUE_ORDER[a.value] ?? 99) - (VALUE_ORDER[b.value] ?? 99);
    } else {
      const vDiff = (VALUE_ORDER[a.value] ?? 99) - (VALUE_ORDER[b.value] ?? 99);
      if (vDiff !== 0) return vDiff;
      return (COLOR_ORDER[a.color] ?? 99) - (COLOR_ORDER[b.color] ?? 99);
    }
  });
}

interface SeatPosition {
  leftPercent: number;
  topPercent: number;
  angleDeg: number;
  stackPlacement: 'left' | 'right' | 'top';
  beamRotationDeg: number;
}

function getOpponentPosition(
  idx: number,
  totalOpponents: number,
  isSpectator: boolean,
  isMobile: boolean = false
): SeatPosition {
  let leftPercent: number;
  let topPercent: number;
  let stackPlacement: 'left' | 'right' | 'top';
  let angleDeg: number;

  if (isSpectator) {
    // Spectator view: evenly distribute all players in a 360-degree circle around the table
    const step = 360 / Math.max(totalOpponents, 1);
    angleDeg = (270 - idx * step + 360) % 360;
    const angleRad = (angleDeg * Math.PI) / 180;
    leftPercent = 50 + 40 * Math.cos(angleRad);
    topPercent = 50 - 36 * Math.sin(angleRad);
    stackPlacement =
      topPercent < 22 && Math.abs(leftPercent - 50) < 15 ? 'top' : leftPercent < 50 ? 'left' : 'right';
  } else if (isMobile) {
    // GamePigeon Crazy 8 Stadium Arc Formation (Screenshot 2)
    // Distributes players cleanly around the perimeter without crowding or overlap
    if (totalOpponents === 1) {
      leftPercent = 50;
      topPercent = 20; // Brought down so card stack is never cut off at the top
      stackPlacement = 'top';
      angleDeg = 90;
    } else if (totalOpponents === 2) {
      if (idx === 0) {
        leftPercent = 14;
        topPercent = 32;
        stackPlacement = 'left';
        angleDeg = 140;
      } else {
        leftPercent = 86;
        topPercent = 32;
        stackPlacement = 'right';
        angleDeg = 40;
      }
    } else if (totalOpponents === 3) {
      // 3 opponents (classic 4-player game): Mid-Left, Top Center, Mid-Right
      if (idx === 0) {
        leftPercent = 12; // Pushed outward towards left edge
        topPercent = 50;
        stackPlacement = 'left';
        angleDeg = 180;
      } else if (idx === 1) {
        leftPercent = 50;
        topPercent = 14; // Clean top margin, completely above center table and never clipped
        stackPlacement = 'left'; // Horizontal side-by-side matching LumiBear and SoliditySam
        angleDeg = 90;
      } else {
        leftPercent = 88; // Pushed outward towards right edge
        topPercent = 50;
        stackPlacement = 'right';
        angleDeg = 0;
      }
    } else if (totalOpponents === 4) {
      // 4 opponents (5-player game): Lower-Left, Upper-Left, Upper-Right, Lower-Right
      if (idx === 0) {
        leftPercent = 13;
        topPercent = 56;
        stackPlacement = 'left';
        angleDeg = 195;
      } else if (idx === 1) {
        leftPercent = 20;
        topPercent = 18;
        stackPlacement = 'left';
        angleDeg = 145;
      } else if (idx === 2) {
        leftPercent = 80;
        topPercent = 18;
        stackPlacement = 'right';
        angleDeg = 35;
      } else {
        leftPercent = 87;
        topPercent = 56;
        stackPlacement = 'right';
        angleDeg = 345;
      }
    } else if (totalOpponents === 5) {
      // 5 opponents (6-player game): Lower-Left, Upper-Left, Top Center, Upper-Right, Lower-Right
      if (idx === 0) {
        leftPercent = 13;
        topPercent = 56;
        stackPlacement = 'left';
        angleDeg = 200;
      } else if (idx === 1) {
        leftPercent = 20;
        topPercent = 20;
        stackPlacement = 'left';
        angleDeg = 145;
      } else if (idx === 2) {
        leftPercent = 50;
        topPercent = 14;
        stackPlacement = 'left';
        angleDeg = 90;
      } else if (idx === 3) {
        leftPercent = 80;
        topPercent = 20;
        stackPlacement = 'right';
        angleDeg = 35;
      } else {
        leftPercent = 87;
        topPercent = 56;
        stackPlacement = 'right';
        angleDeg = 340;
      }
    } else {
      // Fallback for > 5 opponents: distribute along wide stadium horseshoe arc (215° to -35°)
      const startAngle = 215;
      const endAngle = -35;
      angleDeg = startAngle - (idx / (totalOpponents - 1)) * (startAngle - endAngle);
      const angleRad = (angleDeg * Math.PI) / 180;
      leftPercent = 50 + 35 * Math.cos(angleRad);
      topPercent = 52 - 32 * Math.sin(angleRad);
      if (topPercent < 22) topPercent = 14;
      stackPlacement = leftPercent < 50 ? 'left' : 'right';
    }
  } else {
    // Desktop Widescreen View:
    // Full 360° circular equal-angle spacing around the compact circular center table.
    const totalPlayers = totalOpponents + 1;
    const step = 360 / totalPlayers;
    angleDeg = (270 - (idx + 1) * step + 360) % 360;
    const angleRad = (angleDeg * Math.PI) / 180;
    leftPercent = 50 + 40 * Math.cos(angleRad);
    topPercent = 50 - 35 * Math.sin(angleRad);
    
    // Top player (angle near 90° or topPercent < 25): clamp to 14% to guarantee no boundary clipping
    if (topPercent < 25) {
      topPercent = 14;
    }
    // Horizontal layout matching LumiBear & SoliditySam (never vertical 'top')
    stackPlacement = leftPercent < 50 ? 'left' : 'right';
  }

  // Active turn conic spotlight rotation pointing from seat towards center table (50, 50)
  const deltaX = 50 - leftPercent;
  const deltaY = (isMobile ? 52 : 50) - topPercent;
  const beamRotationDeg = Math.atan2(deltaX, deltaY) * (180 / Math.PI);

  return { leftPercent, topPercent, angleDeg, stackPlacement, beamRotationDeg };
}

export default function App() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>('reconnecting');
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const localDrawPileRef = useRef<Card[]>([]);
  const isLocalModeRef = useRef<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emotes, setEmotes] = useState<FloatingEmote[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isMusicOn, setIsMusicOn] = useState(() => soundEngine.isMusicOn());
  const [musicVolume, setMusicVolume] = useState(() => soundEngine.getMusicVolume());
  const [showRules, setShowRules] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [handSortMode, setHandSortMode] = useState<'default' | 'color' | 'value'>('default');
  const handScrollRef = useRef<HTMLDivElement>(null);

  const scrollHand = (dir: 'left' | 'right') => {
    if (handScrollRef.current) {
      const offset = dir === 'left' ? -220 : 220;
      handScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Profile & Social State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [inspectProfile, setInspectProfile] = useState<UserProfileTarget | null>(null);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<GameInviteEvent | null>(null);
  const [friendCount, setFriendCount] = useState(0);
  const [onlineFriendCount, setOnlineFriendCount] = useState(0);

  // Web3 Wallet state
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    balance: null,
    isConnecting: false,
    error: null,
    walletName: null,
  });
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null);
  const [walletModalError, setWalletModalError] = useState<string | null>(null);

  // Hemi Crazy 8 Token ($CRAZY8) & Airdrop State
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [isAirdropEligible, setIsAirdropEligible] = useState<boolean>(false);
  const [isAirdropOpen, setIsAirdropOpen] = useState<boolean>(false);
  const [hasClaimedAirdrop, setHasClaimedAirdrop] = useState<boolean>(false);
  const [tourDismissed, setTourDismissed] = useState<boolean>(false);
  const [tokenLoading, setTokenLoading] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('hemi_uno_tour_dismissed') === 'true') {
        setTourDismissed(true);
      }
    } catch {}
  }, []);

  // User Notifications state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  const fetchNotifications = async (userId: string) => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/notifications/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.notifications) {
          setNotifications(data.notifications);
        }
      }
    } catch (err) {
      console.warn('[Notifications] Failed to fetch:', err);
    }
  };

  const handleMarkNotificationRead = async (notificationId?: string) => {
    if (!account?.id) return;
    try {
      await fetch(`/api/notifications/${account.id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (!notificationId || n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.warn('[Notifications] Error marking read:', err);
    }
  };

  const handleClearNotifications = async () => {
    if (!account?.id) return;
    try {
      await fetch(`/api/notifications/${account.id}/clear`, { method: 'POST' });
      setNotifications([]);
    } catch (err) {
      console.warn('[Notifications] Error clearing:', err);
    }
  };

  const unreadNotifCount = notifications.filter((n) => !n.read).length;


  // Fetch token balance & airdrop eligibility whenever connected wallet changes
  const refreshTokenBalance = async (address: string | null) => {
    if (!address) {
      setTokenBalance('0');
      setIsAirdropEligible(false);
      setHasClaimedAirdrop(false);
      return;
    }
    setTokenLoading(true);
    try {
      const cleanAddr = address.trim().toLowerCase();
      const walletClaimedKey = `hemi_uno_airdrop_claimed_${cleanAddr}`;
      let cachedClaimed = false;
      try {
        cachedClaimed = localStorage.getItem(walletClaimedKey) === 'true';
      } catch {}

      const res = await fetchTokenBalance(cleanAddr);
      setTokenBalance(res.balance);
      const isClaimed = Boolean(res.hasClaimed || cachedClaimed);
      setHasClaimedAirdrop(isClaimed);
      setIsAirdropEligible(!isClaimed);

      if (isClaimed) {
        try {
          localStorage.setItem(walletClaimedKey, 'true');
        } catch {}
      } else {
        // Auto-popup claim chips modal for newly connected wallets that have not claimed yet
        setIsAirdropOpen(true);
      }
    } finally {
      setTokenLoading(false);
    }
  };

  useEffect(() => {
    refreshTokenBalance(wallet.address);
  }, [wallet.address]);

  useEffect(() => {
    if (account?.id) {
      fetchNotifications(account.id);
    } else {
      setNotifications([]);
    }
  }, [account?.id]);

  // Load database-authoritative profile for connected wallet address
  // Ensures username, avatar, bio, stats, and friends are linked to the wallet and consistent across tabs
  useEffect(() => {
    if (!wallet.address) {
      setAccount(null);
      return;
    }

    let isCancelled = false;
    const cleanAddr = wallet.address.trim().toLowerCase();

    // 1. Instant local wallet cache hydration to prevent default name flicker
    const cached = getOrCreateAccountProfile(cleanAddr);
    if (cached) {
      setAccount(cached);
    }

    // 2. Fetch authoritative database profile mapped to this wallet address
    const syncWalletWithDatabase = async () => {
      try {
        const res = await fetch(`/api/profile/by-address/${encodeURIComponent(cleanAddr)}`);
        if (res.ok) {
          const dbUser = await res.json();
          if (dbUser && dbUser.id && !isCancelled) {
            console.log('[Profile] Synced authoritative database profile for wallet:', cleanAddr, dbUser.name);
            const synced = syncAccountWithServerProfile(dbUser);
            if (synced) {
              setAccount(synced);
              if (socket) {
                socket.emit('profile:sync', {
                  accountId: synced.id,
                  name: synced.name,
                  avatar: synced.avatar,
                  bio: synced.bio,
                  address: cleanAddr,
                  isExplicitUpdate: !isDefaultName(synced.name),
                });
              }
              // If local profile has a custom name but database only had a default name, push update to database
              if (!isDefaultName(synced.name) && isDefaultName(dbUser.name)) {
                fetch('/api/profile', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: synced.id,
                    accountId: synced.id,
                    name: synced.name,
                    avatar: synced.avatar,
                    bio: synced.bio,
                    address: cleanAddr,
                  }),
                }).catch(() => {});
              }
            }
            return;
          }
        }
      } catch (err) {
        console.error('Error syncing profile by wallet address:', err);
      }
    };

    syncWalletWithDatabase();

    return () => {
      isCancelled = true;
    };
  }, [wallet.address, socket]);

  // Synchronize profile changes across multiple open tabs in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.newValue) return;
      const cleanAddr = wallet.address?.trim().toLowerCase();
      if (cleanAddr && e.key === `uno_arcade_wallet_profile_${cleanAddr}`) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.name) {
            setAccount((prev) => (prev ? { ...prev, ...parsed } : parsed));
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [wallet.address]);

  // Check initial connected wallet and listen to account/chain events
  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider || !provider.request) return;

    const checkExistingConnection = async () => {
      try {
        const accounts: string[] = await provider.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          const cleanAddr = accounts[0].trim().toLowerCase();
          const chainIdHex: string = await provider.request({ method: 'eth_chainId' });
          const chainIdDec = parseInt(chainIdHex, 16);
          const balFormatted = await fetchEthBalance(provider, accounts[0]);

          // Immediately hydrate profile for this connected wallet
          const cached = getOrCreateAccountProfile(cleanAddr);
          if (cached) {
            setAccount(cached);
          }
          saveLastConnectedWallet(cleanAddr);

          setWallet({
            address: accounts[0],
            chainId: chainIdDec,
            balance: balFormatted,
            isConnecting: false,
            error: null,
            walletName: 'Web3 Wallet',
          });
        }
      } catch (err) {
        console.warn('Silent wallet check notice:', err);
      }
    };

    checkExistingConnection();

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        setWallet((prev) => ({ ...prev, address: null, balance: null }));
        setAccount(null);
        saveLastConnectedWallet(null);
        setGameState(null);
        setActiveRoomCode(null);
      } else {
        const cleanAddr = accounts[0].trim().toLowerCase();
        const profile = getOrCreateAccountProfile(cleanAddr);
        if (profile) {
          setAccount(profile);
        }
        saveLastConnectedWallet(cleanAddr);
        const balFormatted = await fetchEthBalance(provider, accounts[0]);
        setWallet((prev) => ({ ...prev, address: accounts[0], balance: balFormatted }));
      }
    };

    const handleChainChanged = async (chainIdHex: string) => {
      const chainIdDec = parseInt(chainIdHex, 16);
      setWallet((prev) => {
        if (prev.address) {
          fetchEthBalance(provider, prev.address).then((bal) => {
            setWallet((p) => ({ ...p, balance: bal }));
          });
        }
        return { ...prev, chainId: chainIdDec };
      });
    };

    if (provider.on) {
      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (provider.removeListener) {
        provider.removeListener('accountsChanged', handleAccountsChanged);
        provider.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const handleConnectWallet = async () => {
    setWalletModalError(null);
    setIsWalletModalOpen(true);
  };

  const handleSelectWallet = async (selected: DiscoveredWallet) => {
    if (!selected.provider) {
      if (selected.installUrl) {
        window.open(selected.installUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    setConnectingWalletId(selected.id);
    setWalletModalError(null);
    setWallet((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const res = await connectWalletProvider(selected.provider, selected.name, selected.id);
      const cleanAddr = res.address.trim().toLowerCase();
      const profile = getOrCreateAccountProfile(cleanAddr);
      if (profile) {
        setAccount(profile);
      }
      saveLastConnectedWallet(cleanAddr);

      setWallet({
        address: res.address,
        chainId: res.chainId,
        balance: res.balance,
        isConnecting: false,
        error: null,
        walletName: selected.name,
      });

      // Bind accounts/chain change listeners to this specific provider
      if (selected.provider.on) {
        selected.provider.on('accountsChanged', (accounts: string[]) => {
          if (!accounts || accounts.length === 0) {
            handleDisconnectWallet();
          } else {
            const clean = accounts[0].trim().toLowerCase();
            const p = getOrCreateAccountProfile(clean);
            if (p) setAccount(p);
            saveLastConnectedWallet(clean);
            fetchEthBalance(selected.provider, accounts[0]).then((bal) => {
              setWallet((prev) => ({ ...prev, address: accounts[0], balance: bal }));
            });
          }
        });
        selected.provider.on('chainChanged', (chainIdHex: string) => {
          const chainIdDec = parseInt(chainIdHex, 16);
          setWallet((prev) => {
            if (prev.address) {
              fetchEthBalance(selected.provider, prev.address).then((bal) => {
                setWallet((p) => ({ ...p, balance: bal }));
              });
            }
            return { ...prev, chainId: chainIdDec };
          });
        });
      }

      soundEngine.play('card_deal');
      setIsWalletModalOpen(false);
    } catch (err: any) {
      console.warn('Wallet connection error:', err);
      const msg =
        err?.code === 4001 || String(err?.message || '').toLowerCase().includes('reject')
          ? 'Connection rejected in your wallet. Please approve to connect.'
          : err?.message || 'Failed to connect wallet';
      setWalletModalError(msg);
      setWallet((prev) => ({
        ...prev,
        isConnecting: false,
        error: msg,
      }));
    } finally {
      setConnectingWalletId(null);
    }
  };

  const handleSelectGuestWallet = () => {
    const guest = createGuestArcadeWallet();
    const cleanAddr = guest.address.toLowerCase();
    const profile = getOrCreateAccountProfile(cleanAddr);
    if (profile) {
      setAccount(profile);
    }
    saveLastConnectedWallet(cleanAddr);

    setWallet({
      address: guest.address,
      chainId: guest.chainId,
      balance: guest.balance,
      isConnecting: false,
      error: null,
      walletName: 'Arcade Guest',
    });
    setTokenBalance('10000');
    soundEngine.play('card_deal');
    setIsWalletModalOpen(false);
  };

  const handleDisconnectWallet = () => {
    clearActiveProvider();
    setWallet({
      address: null,
      chainId: null,
      balance: null,
      isConnecting: false,
      error: null,
      walletName: null,
    });
    setAccount(null);
    saveLastConnectedWallet(null);
    setGameState(null);
    setActiveRoomCode(null);
  };

  const handleSwitchNetwork = async () => {
    const provider = getInjectedProvider();
    if (provider) {
      const success = await switchOrAddHemiNetwork(provider, HEMI_SEPOLIA_CONFIG);
      if (success) {
        const chainIdHex = await provider.request({ method: 'eth_chainId' });
        const chainIdDec = parseInt(chainIdHex, 16);
        let bal: string | null = null;
        if (wallet.address) {
          bal = await fetchEthBalance(provider, wallet.address);
        }
        setWallet((prev) => ({
          ...prev,
          chainId: chainIdDec,
          balance: bal || prev.balance,
        }));
      }
    }
  };

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Sync ref for active game state to guard socket listeners
  const gameStateRef = useRef<GameState | null>(null);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const accountRef = useRef<AccountProfile | null>(account);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);

  const walletRef = useRef<WalletState>(wallet);
  useEffect(() => {
    walletRef.current = wallet;
  }, [wallet]);

  // Public live rooms for spectator browser
  const [liveRooms, setLiveRooms] = useState<PublicRoomSummary[]>([]);

  // Wild Card selection state
  const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);

  // New UI Navigation & Dialog States
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [liveStats, setLiveStats] = useState({ openTables: 0, playersOnline: 0, gamesPlayed: 0 });
  const [friendsList, setFriendsList] = useState<EnrichedFriend[]>([]);

  const refreshLiveStats = () => {
    fetch('/api/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setLiveStats({
            openTables: typeof data.openTables === 'number' ? data.openTables : 0,
            playersOnline: typeof data.playersOnline === 'number' ? data.playersOnline : 0,
            gamesPlayed: typeof data.gamesPlayed === 'number' ? data.gamesPlayed : 0,
          });
        }
      })
      .catch(() => {});
  };

  // Helper to fetch live rooms
  const refreshLiveRooms = (s?: Socket | null) => {
    const activeSocket = s || socket;
    if (activeSocket) {
      activeSocket.emit('rooms:get_public', (res: { rooms?: PublicRoomSummary[] }) => {
        if (res?.rooms) {
          setLiveRooms(res.rooms);
        }
      });
    }

    fetch('/api/live-rooms')
      .then((res) => res.json())
      .then((data) => {
        if (data?.rooms) {
          setLiveRooms(data.rooms);
        }
      })
      .catch(() => {});
  };

  // Helper to fetch friends summary
  const refreshFriendsSummary = () => {
    if (!wallet.address || !account?.id) {
      setFriendCount(0);
      setOnlineFriendCount(0);
      setFriendsList([]);
      return;
    }
    fetch(`/api/friends/${account.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.friends) {
          setFriendsList(data.friends);
          setFriendCount(data.friends.length);
          const onlineCount = data.friends.filter(
            (f: any) => f.status === 'online' || f.status === 'in_game'
          ).length;
          setOnlineFriendCount(onlineCount);
        }
      })
      .catch(() => {});
  };

  // Initialize Socket.IO connection with auto-reconnect and session resume (stable singleton connection)
  useEffect(() => {
    const s = getUnoSocket();
    if (!s) return;
    setSocket(s);

    if (s.connected) {
      setSocketConnected(true);
      setConnectionStatus('connected');
    }

    s.on('connect', () => {
      setSocketConnected(true);
      setConnectionStatus('connected');

      // Use current refs so reconnects never miss active credentials
      const currentWallet = walletRef.current;
      const currentAccount = accountRef.current;

      if (currentWallet.address && currentAccount) {
        s.emit('profile:sync', {
          id: currentAccount.id,
          name: currentAccount.name,
          avatar: currentAccount.avatar,
          bio: currentAccount.bio,
          address: currentWallet.address,
        });

        const urlParams = new URLSearchParams(window.location.search);
        const urlCode = urlParams.get('room') || urlParams.get('join');
        const activeCode = getActiveRoomCode() || (urlCode ? urlCode.toUpperCase().trim() : null) || gameStateRef.current?.roomCode;

        if (activeCode) {
          s.emit(
            'session:resume',
            {
              accountId: currentAccount.id,
              roomCode: activeCode,
              address: currentWallet.address,
            },
            (res: any) => {
              if (res?.success && res?.gameState) {
                console.log('Session resumed successfully for room:', res.roomCode);
                setGameState(res.gameState);
                setActiveRoomCode(res.roomCode);
                const currentUrl = new URL(window.location.href);
                if (currentUrl.searchParams.get('room') !== res.roomCode) {
                  currentUrl.searchParams.set('room', res.roomCode);
                  currentUrl.searchParams.delete('join');
                  window.history.replaceState({}, '', currentUrl.toString());
                }
              }
            }
          );
        }
      }

      refreshLiveRooms(s);
      refreshFriendsSummary();
    });

    // Listen for incoming game invites from friends
    s.on('invite:received', (invite: GameInviteEvent) => {
      setCurrentInvite(invite);
      soundEngine.play('card_deal');
    });

    // Refresh friends list when friend status changes or request is accepted
    s.on('friends:status_update', () => {
      refreshFriendsSummary();
    });

    // Authoritative profile sync response from database
    s.on('profile:synced', (serverProfile: any) => {
      const curWallet = walletRef.current;
      if (serverProfile && serverProfile.id && curWallet.address) {
        const synced = syncAccountWithServerProfile(serverProfile);
        if (synced) {
          setAccount(synced);
        }
      }
    });

    // Real-time broadcast if profile (name/avatar/bio) was updated on another tab or via database
    s.on('profile:updated', (serverProfile: any) => {
      const curWallet = walletRef.current;
      if (serverProfile && serverProfile.id && curWallet.address) {
        const matchesAddress =
          serverProfile.address &&
          curWallet.address.toLowerCase() === serverProfile.address.toLowerCase();

        if (matchesAddress) {
          console.log('[Profile] Live update received from database/tab:', serverProfile.name);
          const synced = syncAccountWithServerProfile(serverProfile);
          if (synced) {
            setAccount(synced);
            refreshFriendsSummary();
          }
        }
      }
    });

    // Real-time $CRAZY8 airdrop confirmation listener
    s.on('token:airdropped', (data: any) => {
      const curWallet = walletRef.current;
      if (curWallet.address && data.address?.toLowerCase() === curWallet.address.toLowerCase()) {
        setTokenBalance(data.balance);
        setIsAirdropEligible(false);
        setHasClaimedAirdrop(true);
        try {
          localStorage.setItem('hemi_uno_airdrop_claimed', 'true');
          localStorage.setItem(`hemi_uno_airdrop_claimed_${curWallet.address.toLowerCase()}`, 'true');
          localStorage.setItem('hemi_uno_tour_dismissed', 'true');
        } catch {}
        if (accountRef.current?.id) fetchNotifications(accountRef.current.id);
      }
    });

    // Real-time chip debit / credit / refund notification
    s.on('token:balance_updated', (data: any) => {
      const curWallet = walletRef.current;
      if (
        !data.address ||
        (curWallet.address && data.address.toLowerCase() === curWallet.address.toLowerCase())
      ) {
        if (data.balance !== undefined) {
          setTokenBalance(String(data.balance));
        }
        if (accountRef.current?.id) fetchNotifications(accountRef.current.id);
      }
    });

    // Real-time on-chain escrow match settlement confirmation
    s.on('game:settlement', () => {
      if (accountRef.current?.id) fetchNotifications(accountRef.current.id);
      if (walletRef.current.address) refreshTokenBalance(walletRef.current.address);
    });

    s.on('disconnect', () => {
      setSocketConnected(false);
      setConnectionStatus('reconnecting');
    });

    s.on('connect_error', () => {
      setSocketConnected(false);
      setConnectionStatus('reconnecting');
    });

    s.on('game:state', (state: GameState) => {
      setGameState(state);
      if (state?.roomCode) {
        setActiveRoomCode(state.roomCode);
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get('room') !== state.roomCode) {
          currentUrl.searchParams.set('room', state.roomCode);
          currentUrl.searchParams.delete('join');
          window.history.replaceState({}, '', currentUrl.toString());
        }
      }
    });

    s.on('game:sound', ({ soundName }: { soundName: string }) => {
      soundEngine.play(soundName);
    });

    s.on('game:shake', () => {
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 500);
    });

    s.on('game:emote', (emote: FloatingEmote) => {
      setEmotes((prev) => [...prev, emote]);
      setTimeout(() => {
        setEmotes((prev) => prev.filter((e) => e.id !== emote.id));
      }, 2400);
    });

    // Chat events - strictly scoped to active lobby room
    s.on('chat:message', (msg: ChatMessage) => {
      const currentRoom = gameStateRef.current;
      // If client is in a lobby, ignore messages destined for other lobbies
      if (currentRoom) {
        if (msg.roomId && currentRoom.roomId && msg.roomId !== currentRoom.roomId) {
          return;
        }
        if (msg.roomCode && currentRoom.roomCode && msg.roomCode !== currentRoom.roomCode) {
          return;
        }
      }

      setChatMessages((prev) => [...prev, msg]);
      soundEngine.play('card_draw');
      setIsChatOpen((open) => {
        if (!open) {
          setUnreadChatCount((prev) => prev + 1);
        }
        return open;
      });
    });

    // Public room updates broadcast from server
    s.on('rooms:public_list', (rooms: PublicRoomSummary[]) => {
      setLiveRooms(rooms);
    });

    setSocket(s);

    // Keep-alive heartbeat: prevents reverse-proxy idle disconnects and maintains presence
    const heartbeatInterval = setInterval(() => {
      const curWallet = walletRef.current;
      const curAccount = accountRef.current;
      const curRoom = gameStateRef.current?.roomCode || getActiveRoomCode();
      if (s.connected) {
        s.emit('app:heartbeat', {
          accountId: curAccount?.id,
          roomCode: curRoom || undefined,
          address: curWallet.address || undefined,
        });
      }
    }, 12000);

    // Periodic poll for live rooms and stats every 6 seconds when not in a game
    refreshLiveStats();
    const interval = setInterval(() => {
      refreshLiveRooms(s);
      refreshLiveStats();
    }, 6000);

    return () => {
      clearInterval(interval);
      clearInterval(heartbeatInterval);
    };
  }, []);

  // Autonomous Bot Turn Runner for practice tables and offline matches
  useEffect(() => {
    if (!isLocalModeRef.current || !gameState || gameState.status !== 'playing') return;

    const currentTurnPlayer = gameState.players.find((p) => p.id === gameState.currentTurnPlayerId);
    if (!currentTurnPlayer || !currentTurnPlayer.isBot) return;

    const botTimer = setTimeout(() => {
      if (!gameStateRef.current || gameStateRef.current.status !== 'playing') return;
      const botRes = runBotStep(gameStateRef.current, localDrawPileRef.current);
      if (botRes.played) {
        localDrawPileRef.current = botRes.drawPile;
        setGameState(botRes.state);
        soundEngine.play('card_play');
      }
    }, 1100);

    return () => clearTimeout(botTimer);
  }, [gameState?.currentTurnPlayerId, gameState?.status]);


  // Synchronize profile and resume active session whenever wallet or account updates (without disconnecting socket!)
  useEffect(() => {
    if (!socket || !wallet.address || !account) return;

    socket.emit('profile:sync', {
      id: account.id,
      name: account.name,
      avatar: account.avatar,
      bio: account.bio,
      address: wallet.address,
    });

    const activeCode = getActiveRoomCode() || gameStateRef.current?.roomCode;
    if (activeCode && (!gameState || !gameState.players.some((p) => p.id === account.id && p.isConnected))) {
      socket.emit(
        'session:resume',
        {
          accountId: account.id,
          roomCode: activeCode,
          address: wallet.address,
        },
        (res: any) => {
          if (res?.success && res?.gameState) {
            setGameState(res.gameState);
            setActiveRoomCode(res.roomCode);
          }
        }
      );
    }
  }, [socket, wallet.address, account?.id]);

  // Fetch private chat history whenever entering a new room code
  useEffect(() => {
    if (!gameState?.roomCode || !socket) return;
    socket.emit('chat:history', (res: any) => {
      if (res?.success && Array.isArray(res.messages)) {
        setChatMessages(res.messages);
      }
    });
  }, [gameState?.roomCode, socket]);

  // Handle URL search params (e.g. ?join=ABCD)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join') || params.get('room');
    if (!code || !socket || gameState) return;

    const lastSavedWallet = getLastConnectedWallet();
    // If a wallet was previously connected, wait for wallet/account hydration rather than blindly spectating
    if ((!wallet.address || !account) && lastSavedWallet) {
      return;
    }

    if (!wallet.address || !account) {
      // Disconnected visitor viewing room link — spectate instead of claiming a player seat
      socket.emit(
        'room:spectate',
        {
          roomCode: code.toUpperCase(),
          accountId: `spectator_${socket.id}`,
          spectatorName: 'Spectator',
          avatar: '👀',
        },
        (res: any) => {
          if (res?.success && res?.gameState) {
            setGameState(res.gameState);
            setActiveRoomCode(res.roomCode);
          }
        }
      );
      return;
    }

    // First try session resume to restore existing seated player seamlessly
    socket.emit(
      'session:resume',
      {
        accountId: account.id,
        roomCode: code.toUpperCase(),
        address: wallet.address,
      },
      (resumeRes: any) => {
        if (resumeRes?.success && resumeRes?.gameState) {
          setGameState(resumeRes.gameState);
          setActiveRoomCode(resumeRes.roomCode);
          return;
        }

        // If not already seated, join room
        socket.emit(
          'room:join',
          {
            roomCode: code.toUpperCase(),
            accountId: account.id,
            playerName: account.name,
            avatar: account.avatar,
            address: wallet.address,
          },
          (res: any) => {
            if (res?.success && res?.gameState) {
              setGameState(res.gameState);
              setActiveRoomCode(res.roomCode);
            }
          }
        );
      }
    );
  }, [socket, gameState, account?.id, account?.name, account?.avatar, wallet.address]);

  // When opening chat, reset unread counter
  const handleToggleChat = () => {
    setIsChatOpen((prev) => {
      if (!prev) {
        setUnreadChatCount(0);
      }
      return !prev;
    });
  };

  // Audio mute toggle
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
    setIsMusicOn(soundEngine.isMusicOn());
  };

  // Background Music Toggle
  const toggleMusic = () => {
    const nextMusic = !isMusicOn;
    setIsMusicOn(nextMusic);
    soundEngine.setMusicEnabled(nextMusic);
    if (nextMusic) {
      const mode = gameState && gameState.status !== 'lobby' ? 'game' : 'lobby';
      soundEngine.startMusic(mode);
    }
  };

  // Dynamic BGM Track Switching:
  // - Plays cool funk cyber synth in Lobby & Waiting Room
  // - Switches dynamically to thrilling fast-paced arcade battle groove during Live Match
  useEffect(() => {
    const targetMode = gameState && gameState.status !== 'lobby' ? 'game' : 'lobby';
    
    // Auto-start or switch music track when music is enabled
    if (isMusicOn && !isMuted) {
      soundEngine.startMusic(targetMode);
    }

    // Modern browsers require a user interaction before AudioContext can output sound
    const handleFirstGesture = () => {
      if (isMusicOn && !isMuted) {
        soundEngine.startMusic(targetMode);
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
  }, [gameState?.status, isMusicOn, isMuted]);

  // Prevent quitting during active play: warn browser if navigating away or closing window
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isPlayerPlaying =
        gameState &&
        gameState.status === 'playing' &&
        gameState.players.some((p) => account && p.id === account.id);
      if (isPlayerPlaying) {
        e.preventDefault();
        e.returnValue = 'Match in progress! You cannot quit until the game ends.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameState?.status, gameState?.players, account?.id]);

  // Explicit resume session action from UI
  const handleResumeSession = (roomCode?: string | null) => {
    if (!socket) return;
    if (!wallet.address || !account) {
      setErrorMessage('Please connect your Web3 wallet first to resume your session.');
      handleConnectWallet();
      return;
    }
    const targetCode = roomCode || getActiveRoomCode();
    socket.emit(
      'session:resume',
      {
        accountId: account.id,
        roomCode: targetCode,
        address: wallet.address,
      },
      (res: any) => {
        if (res?.success && res?.gameState) {
          setGameState(res.gameState);
          setActiveRoomCode(res.roomCode);
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('room', res.roomCode);
          currentUrl.searchParams.delete('join');
          window.history.replaceState({}, '', currentUrl.toString());
        } else {
          setActiveRoomCode(null);
          setErrorMessage('Room is no longer active on the server.');
        }
      }
    );
  };

  // Lobby actions
  const handleCreateRoom = (playerName: string, avatar: string, buyIn: string, address?: string) => {
    let s = socket;
    if (!s) {
      s = getUnoSocket();
      if (s) setSocket(s);
    }
    if (!s) return;

    let activeAddress = address || wallet.address;
    let activeAccount = account;

    if (!activeAddress || !activeAddress.startsWith('0x') || !activeAccount) {
      const guest = createGuestArcadeWallet();
      const cleanAddr = guest.address.toLowerCase();
      const profile = getOrCreateAccountProfile(cleanAddr);
      if (profile) {
        setAccount(profile);
        activeAccount = profile;
      }
      saveLastConnectedWallet(cleanAddr);
      setWallet({
        address: guest.address,
        chainId: guest.chainId,
        balance: guest.balance,
        isConnecting: false,
        error: null,
        walletName: 'Arcade Guest',
      });
      setTokenBalance('10000');
      activeAddress = guest.address;
    }

    if (!activeAddress || !activeAccount) return;
    setErrorMessage(null);
    s.emit(
      'room:create',
      {
        accountId: activeAccount.id,
        playerName: playerName || activeAccount.name,
        avatar: avatar || activeAccount.avatar,
        buyIn,
        address: activeAddress,
      },
      (res: any) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to create room');
        } else {
          setActiveRoomCode(res.roomCode);
          if (res.gameState) {
            setGameState(res.gameState);
          }
          setChatMessages([]);
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('room', res.roomCode);
          currentUrl.searchParams.delete('join');
          window.history.replaceState({}, '', currentUrl.toString());
        }
      }
    );
  };

  const handleJoinRoom = (roomCode: string, playerName: string, avatar: string, address?: string) => {
    let s = socket;
    if (!s) {
      s = getUnoSocket();
      if (s) setSocket(s);
    }

    let activeAddress = address || wallet.address;
    let activeAccount = account;

    if (!activeAddress || !activeAddress.startsWith('0x') || !activeAccount) {
      const guest = createGuestArcadeWallet();
      const cleanAddr = guest.address.toLowerCase();
      const profile = getOrCreateAccountProfile(cleanAddr);
      if (profile) {
        setAccount(profile);
        activeAccount = profile;
      }
      saveLastConnectedWallet(cleanAddr);
      setWallet({
        address: guest.address,
        chainId: guest.chainId,
        balance: guest.balance,
        isConnecting: false,
        error: null,
        walletName: 'Arcade Guest',
      });
      setTokenBalance('10000');
      activeAddress = guest.address;
    }

    if (!activeAddress || !activeAccount) return;
    setErrorMessage(null);

    const launchLocal = () => {
      isLocalModeRef.current = true;
      const localState = createLocalLobby(roomCode, {
        name: playerName || activeAccount.name,
        avatar: avatar || activeAccount.avatar,
        address: activeAddress,
      });
      setActiveRoomCode(roomCode.toUpperCase());
      setGameState(localState);
      setChatMessages([]);
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('room', roomCode.toUpperCase());
      currentUrl.searchParams.delete('join');
      window.history.replaceState({}, '', currentUrl.toString());
    };

    if (s && s.connected) {
      let answered = false;
      const timeoutId = setTimeout(() => {
        if (!answered) {
          answered = true;
          launchLocal();
        }
      }, 1200);

      s.emit(
        'room:join',
        {
          roomCode: roomCode.toUpperCase(),
          accountId: activeAccount.id,
          playerName: playerName || activeAccount.name,
          avatar: avatar || activeAccount.avatar,
          address: activeAddress,
        },
        (res: any) => {
          if (answered) return;
          answered = true;
          clearTimeout(timeoutId);
          if (!res.success) {
            launchLocal();
          } else {
            isLocalModeRef.current = false;
            setActiveRoomCode(res.roomCode);
            if (res.gameState) {
              setGameState(res.gameState);
            }
            setChatMessages([]);
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('room', res.roomCode);
            currentUrl.searchParams.delete('join');
            window.history.replaceState({}, '', currentUrl.toString());
          }
        }
      );
    } else {
      launchLocal();
    }
  };

  // 1-Click Quick Match - joins open waiting room or creates one automatically with pot feature
  const handleQuickJoin = (buyIn: string = '100') => {
    let s = socket;
    if (!s) {
      s = getUnoSocket();
      if (s) setSocket(s);
    }

    let activeAddress = wallet.address;
    let activeAccount = account;

    if (!activeAddress || !activeAddress.startsWith('0x') || !activeAccount) {
      const guest = createGuestArcadeWallet();
      const cleanAddr = guest.address.toLowerCase();
      const profile = getOrCreateAccountProfile(cleanAddr);
      if (profile) {
        setAccount(profile);
        activeAccount = profile;
      }
      saveLastConnectedWallet(cleanAddr);
      setWallet({
        address: guest.address,
        chainId: guest.chainId,
        balance: guest.balance,
        isConnecting: false,
        error: null,
        walletName: 'Arcade Guest',
      });
      setTokenBalance('10000');
      activeAddress = guest.address;
    }

    if (!activeAddress || !activeAccount) return;
    setErrorMessage(null);

    const targetBuyIn = buyIn || '100';

    const launchLocalQuick = () => {
      isLocalModeRef.current = true;
      const localState = createLocalLobby('QM', {
        name: activeAccount.name,
        avatar: activeAccount.avatar,
        address: activeAddress,
      }, { isQuickMatch: true, buyInAmount: targetBuyIn });
      setActiveRoomCode('QM');
      setGameState(localState);
      setChatMessages([]);
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('room', 'QM');
      currentUrl.searchParams.delete('join');
      window.history.replaceState({}, '', currentUrl.toString());
    };

    if (s && s.connected) {
      let answered = false;
      const timeoutId = setTimeout(() => {
        if (!answered) {
          answered = true;
          launchLocalQuick();
        }
      }, 4000);

      s.emit(
        'room:quick_join',
        {
          playerName: activeAccount.name,
          avatar: activeAccount.avatar,
          accountId: activeAccount.id,
          userId: activeAccount.id,
          address: activeAddress,
          buyIn: targetBuyIn,
        },
        (res: any) => {
          if (answered) return;
          answered = true;
          clearTimeout(timeoutId);
          if (!res.success) {
            launchLocalQuick();
          } else {
            isLocalModeRef.current = false;
            setActiveRoomCode(res.roomCode);
            if (res.gameState) {
              setGameState(res.gameState);
            }
            setChatMessages([]);
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('room', res.roomCode);
            currentUrl.searchParams.delete('join');
            window.history.replaceState({}, '', currentUrl.toString());
          }
        }
      );
    } else {
      launchLocalQuick();
    }
  };

  // Invite friend to room
  const handleInviteFriend = (friendId: string, roomCode: string) => {
    if (!socket || !account) return;
    socket.emit('invite:send', {
      friendId,
      roomCode,
      senderName: account.name,
      senderAvatar: account.avatar,
    });
  };

  // Update profile and sync to database & socket
  const handleSaveProfile = async (updates: Partial<AccountProfile>) => {
    if (!wallet.address) return;
    const updated = saveAccountProfile({ ...updates, address: wallet.address });
    if (updated) {
      setAccount(updated);

      const activeAddress = wallet.address;

      // Send explicit update to server via WebSocket and REST API
      if (socket) {
        socket.emit('profile:sync', {
          accountId: updated.id,
          id: updated.id,
          name: updated.name,
          avatar: updated.avatar,
          bio: updated.bio,
          address: activeAddress,
          isExplicitUpdate: true,
        });
      }

      try {
        await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: updated.id,
            accountId: updated.id,
            name: updated.name,
            avatar: updated.avatar,
            bio: updated.bio,
            address: activeAddress,
          }),
        });
        refreshFriendsSummary();
      } catch (err) {
        console.warn('Failed to post profile update to database REST API:', err);
      }
    }
  };

  const handleSpectateRoom = (roomCode: string, spectatorName: string, avatar: string) => {
    if (!socket) return;
    setErrorMessage(null);
    socket.emit(
      'room:spectate',
      {
        roomCode: roomCode.toUpperCase(),
        accountId: account?.id || `spectator_${socket.id}`,
        spectatorName: spectatorName || account?.name || 'Spectator',
        avatar: avatar || account?.avatar || '👀',
      },
      (res: any) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to spectate room');
        } else {
          setActiveRoomCode(res.roomCode);
          setChatMessages([]);
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('room', res.roomCode);
          currentUrl.searchParams.delete('join');
          window.history.replaceState({}, '', currentUrl.toString());
        }
      }
    );
  };

  const handleToggleReady = () => {
    if (isLocalModeRef.current && gameState) {
      const updated = gameState.players.map((p) =>
        p.id === myPlayer?.id || p.id === myPlayerId ? { ...p, isReady: !p.isReady } : p
      );
      setGameState({ ...gameState, players: updated });
      return;
    }
    if (!socket) return;
    if (!wallet.address) {
      setErrorMessage('Please connect your Web3 wallet to ready up.');
      handleConnectWallet();
      return;
    }
    socket.emit('room:toggle_ready');
  };

  const handleAddBot = () => {
    if (gameState?.isQuickMatch) {
      setErrorMessage('Bots are strictly forbidden in Quick Match contest rooms.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    if (isLocalModeRef.current && gameState) {
      if (gameState.players.length >= 5) {
        setErrorMessage('Room is full (max 5 players)');
        return;
      }
      const botNames = ['HemiBot ⚡', 'CyberPepe 🐸', 'SoliditySam ⛓️', 'ChadCard 💎', 'QuantumByte 🤖'];
      const botAvatars = ['🤖', '🐸', '⚡', '🦁', '🦊'];
      const idx = gameState.players.length;
      const newBot: Player = {
        id: `bot_local_${Date.now()}_${idx}`,
        name: botNames[idx % botNames.length],
        avatar: botAvatars[idx % botAvatars.length],
        isHost: false,
        isBot: true,
        isReady: true,
        isConnected: true,
        seatIndex: idx,
        cardCount: 0,
        hand: [],
      };
      // RULE: When a bot is added, staking is deactivated and pot is set to 0!
      setGameState({
        ...gameState,
        players: [...gameState.players, newBot],
        isStaking: false,
        buyInAmount: '0',
        escrowPot: {
          amount: '0.000',
          currency: 'CRAZY8',
          buyInAmount: '0',
        },
      });
      return;
    }
    if (!socket) return;
    socket.emit('room:add_bot');
  };

  const handleRemovePlayer = (playerId: string) => {
    if (isLocalModeRef.current && gameState) {
      const updated = gameState.players.filter((p) => p.id !== playerId);
      setGameState({ ...gameState, players: updated });
      return;
    }
    if (!socket) return;
    socket.emit('room:remove_player', { playerId });
  };

  const handleConfigureStake = (buyIn: string) => {
    if (!gameState) return;
    const targetBuyIn = buyIn !== undefined ? buyIn : '100';
    const isLocal = isLocalModeRef.current;
    if (isLocal) {
      const stakeNum = parseFloat(targetBuyIn || '0');
      const hasBots = gameState.players.some((p) => p.isBot);
      if (hasBots && stakeNum > 0) {
        setErrorMessage('Cannot enable staking when bots are seated at the table.');
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
      setGameState({
        ...gameState,
        isStaking: stakeNum > 0,
        buyInAmount: targetBuyIn,
        escrowPot: {
          amount: (stakeNum * gameState.players.length).toFixed(0),
          currency: 'CRAZY8',
          buyInAmount: targetBuyIn,
        },
      });
      return;
    }

    const s = socket;
    if (!s || !s.connected) {
      setErrorMessage('Network connection lost. Please reconnect to configure table stake.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    s.emit('room:configure_stake', { buyIn: targetBuyIn }, (res: any) => {
      if (!res?.success) {
        setErrorMessage(res?.error || 'Failed to update table pot');
        setTimeout(() => setErrorMessage(null), 4000);
      } else {
        setErrorMessage(null);
      }
    });
  };

  const handleStartGame = () => {
    if (isLocalModeRef.current && gameState) {
      const { state: started, drawPile } = startLocalGame(gameState);
      localDrawPileRef.current = drawPile;
      setGameState(started);
      soundEngine.play('card_deal');
      return;
    }
    if (!socket) return;
    if (!wallet.address) {
      setErrorMessage('Please connect your Web3 wallet to start the match.');
      handleConnectWallet();
      return;
    }
    socket.emit('game:start', (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Cannot start game');
      }
    });
  };

  // Game actions
  const handlePlayCard = (card: Card) => {
    if (isLocalModeRef.current && gameState) {
      if (isWildCard(card)) {
        setPendingWildCard(card);
      } else {
        const res = executePlayerCardMove(gameState, localDrawPileRef.current, myPlayer?.id || myPlayerId, card.id);
        if (!res.success) {
          setErrorMessage(res.error || 'Invalid move');
          setTimeout(() => setErrorMessage(null), 3000);
        } else {
          localDrawPileRef.current = res.drawPile;
          setGameState(res.state);
          soundEngine.play('card_play');
        }
      }
      return;
    }
    if (!socket || !gameState) return;
    if (!isMyTurn && gameState.currentTurnPlayerId !== myPlayer?.id && gameState.currentTurnPlayerId !== myPlayerId) return;

    if (isWildCard(card)) {
      setPendingWildCard(card);
    } else {
      socket.emit('game:play_card', { cardId: card.id }, (res: any) => {
        if (!res.success) {
          setErrorMessage(res.error || 'Invalid move');
          setTimeout(() => setErrorMessage(null), 3000);
        }
      });
    }
  };

  const handleConfirmWildColor = (chosenColor: CardColor) => {
    if (isLocalModeRef.current && gameState && pendingWildCard) {
      const res = executePlayerCardMove(gameState, localDrawPileRef.current, myPlayer?.id || myPlayerId, pendingWildCard.id, chosenColor);
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid move');
        setTimeout(() => setErrorMessage(null), 3000);
      } else {
        localDrawPileRef.current = res.drawPile;
        setGameState(res.state);
        soundEngine.play('card_play');
      }
      setPendingWildCard(null);
      return;
    }
    if (!socket || !pendingWildCard) return;
    socket.emit('game:play_card', { cardId: pendingWildCard.id, chosenColor }, (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid move');
        setTimeout(() => setErrorMessage(null), 3000);
      }
      setPendingWildCard(null);
    });
  };

  const handleDrawCard = () => {
    if (isLocalModeRef.current && gameState) {
      const res = executePlayerDrawMove(gameState, localDrawPileRef.current, myPlayer?.id || myPlayerId);
      if (!res.success) {
        setErrorMessage(res.error || 'Cannot draw card');
        setTimeout(() => setErrorMessage(null), 3000);
      } else {
        localDrawPileRef.current = res.drawPile;
        setGameState(res.state);
        soundEngine.play('card_draw');
      }
      return;
    }
    if (!socket) return;
    socket.emit('game:draw_card', (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Cannot draw card');
        setTimeout(() => setErrorMessage(null), 3000);
      }
    });
  };

  const handlePassTurn = () => {
    if (isLocalModeRef.current && gameState) {
      const res = executePlayerPassMove(gameState, myPlayer?.id || myPlayerId);
      if (!res.success) {
        setErrorMessage(res.error || 'Cannot pass turn');
        setTimeout(() => setErrorMessage(null), 3000);
      } else {
        setGameState(res.state);
      }
      return;
    }
    if (!socket) return;
    socket.emit('game:pass_turn', (res: any) => {
      if (!res.success) {
        setErrorMessage(res.error || 'Cannot pass turn');
        setTimeout(() => setErrorMessage(null), 3000);
      }
    });
  };

  const handleSendEmote = (emoji: string, text?: string) => {
    if (isLocalModeRef.current && myPlayer) {
      const emote: FloatingEmote = {
        id: `emote_local_${Date.now()}`,
        playerId: myPlayer.id,
        emoji,
        text,
        timestamp: Date.now(),
      };
      setEmotes((prev) => [...prev, emote]);
      setTimeout(() => {
        setEmotes((prev) => prev.filter((e) => e.id !== emote.id));
      }, 2400);
      return;
    }
    if (!socket) return;
    socket.emit('game:send_emote', { emoji, text });
  };

  const handleSendChatMessage = (text: string) => {
    if (isLocalModeRef.current && myPlayer) {
      const msg: ChatMessage = {
        id: `chat_local_${Date.now()}`,
        roomId: gameState?.roomId || 'local',
        roomCode: gameState?.roomCode || 'CLSC',
        senderId: myPlayer.id,
        senderName: myPlayer.name,
        senderAvatar: myPlayer.avatar,
        text,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, msg]);
      soundEngine.play('card_draw');
      return;
    }
    if (!socket) return;
    socket.emit('chat:send', { text }, (res: any) => {
      if (!res?.success) {
        setErrorMessage(res?.error || 'Failed to send message');
        setTimeout(() => setErrorMessage(null), 3000);
      }
    });
  };

  const handleRematch = () => {
    if (isLocalModeRef.current && gameState) {
      const { state: restarted, drawPile } = startLocalGame(gameState);
      localDrawPileRef.current = drawPile;
      setGameState(restarted);
      soundEngine.play('card_deal');
      return;
    }
    if (!socket) return;
    socket.emit('game:rematch');
  };

  const handleLeaveRoom = () => {
    if (isLocalModeRef.current) {
      isLocalModeRef.current = false;
      localDrawPileRef.current = [];
      setActiveRoomCode(null);
      setGameState(null);
      setChatMessages([]);
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('room');
      currentUrl.searchParams.delete('join');
      window.history.replaceState({}, '', currentUrl.pathname);
      return;
    }
    const isPlayerPlaying = gameState && gameState.status === 'playing' && gameState.players.some((p) => account && p.id === account.id);
    if (isPlayerPlaying) {
      setErrorMessage('You cannot quit while the game is in progress! You must complete the match or wait until it ends.');
      return;
    }
    if (socket) {
      socket.emit('room:leave');
    }
    setActiveRoomCode(null);
    setGameState(null);
    setChatMessages([]);
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('room');
    currentUrl.searchParams.delete('join');
    window.history.replaceState({}, '', currentUrl.pathname);
    refreshLiveRooms();
  };

  // Robust player identity matching: checks account id, canonical id, and wallet address
  const myPlayer = useMemo(() => {
    if (!gameState?.players) return undefined;
    const cleanWallet = wallet.address ? wallet.address.trim().toLowerCase() : '';
    const accId = account?.id ? account.id.trim().toLowerCase() : '';

    return gameState.players.find((p) => {
      const pId = p.id ? p.id.trim().toLowerCase() : '';
      const pAddr = p.address ? p.address.trim().toLowerCase() : '';
      if (accId && pId === accId) return true;
      if (cleanWallet && pAddr === cleanWallet) return true;
      if (cleanWallet && pId === `wallet_${cleanWallet}`) return true;
      if (accId.startsWith('wallet_') && pAddr === accId.replace('wallet_', '')) return true;
      return false;
    });
  }, [gameState?.players, account?.id, wallet.address]);

  const myPlayerId = myPlayer?.id || account?.id || '';
  // CRITICAL FIX: Seated players are NEVER spectators! Spectator mode only applies if user has no player seat at the table
  const isSpectator = !myPlayer && (!!gameState?.isSpectator || !account);
  const isMyTurn = !isSpectator && !!myPlayer && (
    gameState?.currentTurnPlayerId === myPlayer.id ||
    gameState?.currentTurnPlayerId === myPlayerId
  );
  const isHost = !!myPlayer && (gameState?.hostId === myPlayer.id || gameState?.hostId === myPlayerId);

  // Auto-recovery: If player is seated during a live match but hand is missing or desynced, re-request state
  useEffect(() => {
    if (gameState?.status === 'playing' && myPlayer && !myPlayer.hand && socket?.connected) {
      console.log('[Game] Active player hand missing, requesting immediate state sync...');
      socket.emit('room:refresh_state');
    }
  }, [gameState?.status, myPlayer?.id, myPlayer?.hand, socket?.connected]);
  const topCard = gameState?.topDiscardCard || null;

  // Compute defense ability when under attack (+2, +4 stack)
  const myDefenseCards = myPlayer?.hand?.filter(isDefenseCard) || [];
  const canDefendAttack = myDefenseCards.length > 0;

  // Compute opponents list in clockwise seating order relative to the player
  // (Matching authentic GamePigeon Crazy 8 / poker circular table formation)
  const opponents = useMemo(() => {
    if (!gameState?.players) return [];
    if (isSpectator) return gameState.players;
    const myIndex = gameState.players.findIndex((p) => p.id === myPlayerId);
    if (myIndex === -1) return gameState.players.filter((p) => p.id !== myPlayerId);

    const list: typeof gameState.players = [];
    const total = gameState.players.length;
    for (let i = 1; i < total; i++) {
      list.push(gameState.players[(myIndex + i) % total]);
    }
    return list;
  }, [gameState?.players, myPlayerId, isSpectator]);

  // Check if each card in hand is playable (Physical deck rules with defensive stacking)
  const isCardPlayable = (c: Card) => {
    if (!isMyTurn || isSpectator) return false;
    // Defensive stacking rule: If under attack (+2 or +4), player MUST defend with +2 or +4
    if (gameState?.pendingDrawCount && gameState.pendingDrawCount > 0) {
      return isDefenseCard(c);
    }
    if (isWildCard(c)) return true;
    if (c.color === gameState?.activeColor) return true;
    if (topCard && c.value === topCard.value) return true;
    return false;
  };

  return (
    <div
      id="game-root"
      className={`min-h-screen ${
        gameState && gameState.status !== 'lobby'
          ? 'h-[100dvh] max-h-[100dvh] overflow-hidden bg-gradient-to-b from-[#0F0A08] via-[#0C0F14] to-[#08090C]'
          : 'bg-[#08090C] hemi-radial-bg'
      } text-slate-100 flex flex-col justify-between overflow-x-hidden ${screenShake ? 'shake-effect' : ''}`}
    >
      {/* Top Spectator Banner if in spectator mode */}
      {isSpectator && gameState && (
        <div className="w-full bg-[#0C0F14] border-b border-slate-800 px-3 sm:px-4 py-1.5 flex items-center justify-between text-xs text-slate-300 z-30 shadow-sm shrink-0">
          <div className="flex items-center gap-2 font-black tracking-wide">
            <Eye className="w-4 h-4 text-[#FF4600] animate-pulse" />
            <span className="text-white text-xs sm:text-sm">LIVE SPECTATOR</span>
            <span className="hidden sm:inline-block text-orange-300/80 font-normal">
              • Room <strong className="text-[#FF4600] font-mono">{gameState.roomCode}</strong>
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700 text-[10px]">
              {gameState.spectatorCount || 1} Watching
            </span>
          </div>

          <button
            onClick={handleLeaveRoom}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all active:scale-95"
          >
            Leave
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="h-12 sm:h-14 px-2.5 sm:px-6 md:px-8 border-b border-white/[0.06] bg-[#0C0F14]/95 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
          {/* Return to Arcade Hub */}
          <a
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white border border-white/10 transition-colors shrink-0"
            title="Back to Arcade"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#FF4600]" />
            <span className="hidden xs:inline">Arcade</span>
          </a>
          <HemiUnoLogo size="md" variant="clean" />
          <div className="hidden sm:flex flex-col">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-400'
                    : connectionStatus === 'reconnecting'
                    ? 'bg-[#FF4600] animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-xs">
                {connectionStatus === 'connected'
                  ? 'Authoritative Engine Live'
                  : connectionStatus === 'reconnecting'
                  ? 'Reconnecting...'
                  : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">

          {/* Wallet Connect — always visible */}
          <WalletConnectButton
            wallet={wallet}
            onConnect={handleConnectWallet}
            onDisconnect={handleDisconnectWallet}
            onSwitchNetwork={handleSwitchNetwork}
            compact={isMobile || (!!gameState && gameState.status !== 'lobby')}
          />

          {/* Friends — requires connected wallet */}
          <button
            onClick={() => {
              if (!wallet.address) {
                handleConnectWallet();
                return;
              }
              setIsFriendsOpen(true);
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
            title="Friends & Social"
          >
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline text-xs">Friends</span>
            {wallet.address && friendCount > 0 ? (
              <span className="px-1 py-0.5 rounded-full bg-white/10 text-white text-[9px] font-bold leading-none">
                {friendCount}
              </span>
            ) : null}
          </button>

          {/* Hemi Crazy 8 Token ($CRAZY8) Balance & Airdrop Chip */}
          {wallet.address ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsAirdropOpen(true)}
                className="hidden xs:flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] text-[11px] sm:text-xs font-mono font-medium text-slate-300 transition-colors cursor-pointer"
                title="Click to check $CRAZY8 Chips & Airdrop Status"
              >
                <Coins className="w-3.5 h-3.5 text-[#FF4600] shrink-0" />
                <span>{formatTokenAmount(tokenBalance)}</span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-sans font-medium">CRAZY8</span>
              </button>

              <button
                id="nav-airdrop-gift-btn"
                onClick={() => setIsAirdropOpen(true)}
                className={`relative z-30 flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0 ${
                  isAirdropEligible
                    ? 'bg-gradient-to-r from-[#FF4600] to-[#FF6B00] hover:from-[#FF5500] hover:to-[#FF7B00] text-white shadow-[0_0_12px_rgba(255,70,0,0.5)] animate-pulse'
                    : 'bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-emerald-400'
                }`}
                title={isAirdropEligible ? 'Claim 10,000 $CRAZY8 Welcome Airdrop' : 'Check 10,000 $CRAZY8 Airdrop Status'}
              >
                <Gift className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">
                  {isAirdropEligible ? '10K Airdrop' : '10K Claimed'}
                </span>
              </button>
            </div>
          ) : (
            <button
              id="nav-airdrop-gift-btn"
              onClick={handleConnectWallet}
              className="relative z-30 flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-gradient-to-r from-[#FF4600] to-[#FF6B00] hover:from-[#FF5500] hover:to-[#FF7B00] text-[10px] sm:text-xs font-bold text-white transition-all active:scale-95 cursor-pointer shrink-0 shadow-[0_0_12px_rgba(255,70,0,0.5)] animate-pulse"
              title="Connect Wallet to Claim 10,000 $CRAZY8 Chips"
            >
              <Gift className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">10K Gift</span>
            </button>
          )}

          {/* User Avatar — ONLY VISIBLE WHEN WALLET IS CONNECTED */}
          {wallet.address && account && (
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.06] border border-white/[0.08] hover:border-white/20 flex items-center justify-center text-sm sm:text-lg transition-all cursor-pointer shrink-0 overflow-hidden"
              title="Profile & Career Stats"
            >
              <UserAvatar avatar={account.avatar} name={account.name} className="w-full h-full text-sm sm:text-lg rounded-full" />
            </button>
          )}

          {/* Notification Bell */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="flex w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer relative shrink-0"
            title="Notifications & Pot Payouts"
          >
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {unreadNotifCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#FF4600] text-white text-[8px] font-bold flex items-center justify-center">
                {unreadNotifCount}
              </span>
            ) : onlineFriendCount > 0 ? (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
            ) : null}
          </button>

          {/* Room code badge — desktop only, during game */}
          {gameState && gameState.status !== 'lobby' && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-mono">
              <span className="text-slate-500">ROOM:</span>
              <span className="text-[#FF4600] font-black">{gameState.roomCode}</span>
              {isSpectator && (
                <span className="px-1.5 py-0.5 rounded bg-[#FF4600]/20 text-orange-300 text-[10px] font-bold">
                  SPECTATING
                </span>
              )}
            </div>
          )}

          {/* Background Music — desktop only */}
          <button
            onClick={toggleMusic}
            className={`hidden md:flex p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer items-center gap-1.5 ${
              isMusicOn && !isMuted
                ? 'bg-white/[0.06] text-[#FF4600] border border-white/[0.08] hover:bg-white/[0.1]'
                : 'bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 hover:text-white'
            }`}
            title={isMusicOn && !isMuted ? 'Background Music (Playing)' : 'Background Music (Off)'}
          >
            <Music className={`w-4 h-4 ${isMusicOn && !isMuted ? 'animate-bounce' : ''}`} />
            {isMusicOn && !isMuted && (
              <span className="hidden lg:flex gap-0.5 items-end h-3">
                <span className="w-0.5 h-1.5 bg-[#FF4600] animate-pulse" />
                <span className="w-0.5 h-3 bg-[#FF4600] animate-pulse delay-75" />
                <span className="w-0.5 h-2 bg-[#FF4600] animate-pulse delay-150" />
              </span>
            )}
          </button>

          {/* Mute — desktop only */}
          <button
            onClick={toggleMute}
            className="hidden md:flex p-1.5 sm:p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute All Audio' : 'Mute All Audio'}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>

          {/* In Lobby: Quit button */}
          {gameState && gameState.status === 'lobby' && !isSpectator && (
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-100 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
              title="Quit Lobby"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Quit</span>
            </button>
          )}

          {/* Playing: Match Locked — desktop only */}
          {gameState && gameState.status === 'playing' && !isSpectator && (
            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-500 select-none cursor-not-allowed shrink-0"
              title="Quitting is locked while the match is in progress."
            >
              <Lock className="w-3.5 h-3.5 text-amber-500/80" />
              <span className="hidden lg:inline">Match Locked</span>
            </div>
          )}

          {/* Game Over: Quit to Lobby */}
          {gameState && gameState.status === 'game_over' && !isSpectator && (
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95 shrink-0"
              title="Quit Table and return to Lobby"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Quit to Lobby</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={`flex-1 w-full relative flex flex-col items-center justify-start overflow-x-hidden ${
          gameState && gameState.status !== 'lobby'
            ? 'p-1 sm:p-3 overflow-hidden justify-between h-[calc(100dvh-52px)] sm:h-[calc(100dvh-64px)]'
            : 'p-2 sm:p-4 md:p-6'
        }`}
      >
        {/* Error Toast notification */}
        {errorMessage && (
          <div className="fixed top-20 z-50 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-2xl animate-in slide-in-from-top-4 duration-150">
            {errorMessage}
          </div>
        )}

        {/* View: Lobby Screen */}
        {(!gameState || gameState.status === 'lobby') && (
          <LobbyView
            gameState={gameState}
            myPlayerId={myPlayerId}
            wallet={wallet}
            account={account}
            onUpdateProfile={(name, avatar) => {
              handleSaveProfile({ name, avatar });
            }}
            connectionStatus={connectionStatus}
            onConnectWallet={handleConnectWallet}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onQuickJoin={handleQuickJoin}
            onOpenProfile={() => {
              if (!wallet.address) {
                handleConnectWallet();
                return;
              }
              setIsProfileOpen(true);
            }}
            onOpenFriends={() => {
              if (!wallet.address) {
                handleConnectWallet();
                return;
              }
              setIsFriendsOpen(true);
            }}
            friendCount={friendCount}
            onlineFriendCount={onlineFriendCount}
            friendsList={friendsList}
            onSpectateRoom={handleSpectateRoom}
            onToggleReady={handleToggleReady}
            onAddBot={handleAddBot}
            onRemovePlayer={handleRemovePlayer}
            onConfigureStake={handleConfigureStake}
            onStartGame={handleStartGame}
            onLeaveRoom={handleLeaveRoom}
            liveRooms={liveRooms}
            onRefreshLiveRooms={() => refreshLiveRooms()}
            error={errorMessage}
            activeRoomCode={getActiveRoomCode()}
            onResumeSession={handleResumeSession}
            onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            onOpenRules={() => setShowRules(true)}
            onOpenCreateTable={() => setIsCreateTableOpen(true)}
            liveStats={liveStats}
            isMusicOn={isMusicOn && !isMuted}
            onToggleMusic={toggleMusic}
            tokenBalance={tokenBalance}
            onOpenAirdrop={() => setIsAirdropOpen(true)}
            isAirdropEligible={isAirdropEligible}
            hasClaimedAirdrop={hasClaimedAirdrop}
          />
        )}

        {/* View: Active Game Table */}
        {gameState && gameState.status !== 'lobby' && (
          <div className="w-full max-w-5xl flex-1 flex flex-col justify-between items-center py-1 sm:py-2 h-full overflow-hidden">
            {/* Reconnecting banner if temporarily disconnected */}
            {connectionStatus === 'reconnecting' && (
              <div className="w-full max-w-md mx-auto mb-1 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 shadow-lg backdrop-blur-md animate-pulse z-30 shrink-0">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Re-syncing match state with server...</span>
              </div>
            )}
            {/* Circular Table Arena with GamePigeon Red Felt Surface */}
            <div
              className="relative w-full max-w-2xl sm:max-w-3xl md:max-w-4xl flex-1 min-h-[200px] max-h-[50vh] flex items-center justify-center my-0.5 px-1 sm:px-4 select-none rounded-3xl sm:rounded-[36px] overflow-hidden shadow-2xl border border-white/[0.06]"
              style={{
                backgroundColor: '#1A1215',
                backgroundImage: `
                  radial-gradient(ellipse at 50% 50%, rgba(60, 18, 18, 0.9) 0%, rgba(30, 10, 10, 0.95) 65%, rgba(14, 6, 6, 1) 100%),
                  radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)
                `,
                backgroundSize: '100% 100%, 16px 16px',
              }}
            >
              {/* Opponent Seats in circular / elliptical formation with equal angle spacing around the felt table */}
              {opponents.map((opp, idx) => {
                const pos = getOpponentPosition(idx, opponents.length, isSpectator, isMobile);
                const isOppTurn = gameState.currentTurnPlayerId === opp.id;

                return (
                  <React.Fragment key={opp.id}>
                    {/* Active Opponent Conic Spotlight shining from seat towards center table */}
                    {isOppTurn && (
                      <div
                        className="absolute pointer-events-none z-15 overflow-hidden flex items-start justify-center"
                        style={{
                          left: `${pos.leftPercent}%`,
                          top: `${pos.topPercent}%`,
                          width: '260px',
                          height: '200px',
                          transformOrigin: 'top center',
                          transform: `translate(-50%, 0) rotate(${pos.beamRotationDeg}deg)`,
                        }}
                      >
                        <div
                          className="w-full h-full opacity-40 animate-pulse"
                          style={{
                            background:
                              'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.15) 45%, transparent 75%)',
                            clipPath: 'polygon(38% 0%, 62% 0%, 94% 100%, 6% 100%)',
                          }}
                        />
                      </div>
                    )}

                    <div
                      className="absolute z-20 transition-all duration-500 ease-out"
                      style={{
                        left: `${pos.leftPercent}%`,
                        top: `${pos.topPercent}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <OpponentSeat
                        player={opp}
                        isCurrentTurn={isOppTurn}
                        turnTimeRemaining={gameState.turnTimeRemaining}
                        turnTimeTotal={gameState.turnTimeTotal}
                        emotes={emotes}
                        stackPlacement={pos.stackPlacement}
                        onOpenProfile={(p) => setInspectProfile(p)}
                      />
                    </div>
                  </React.Fragment>
                );
              })}

              {/* GamePigeon Directional Felt Arrows (Screenshot 2: Chunky white arrows on the felt) */}
              <div className="absolute inset-0 pointer-events-none z-5">
                {/* Left Arrow (between lower-left and bottom player, pointing in turn direction) */}
                <div
                  className={`absolute left-[28%] ${isMobile ? 'top-[52%]' : 'top-[50%]'} transition-transform duration-700 ${
                    gameState.turnDirection === 1 ? 'rotate-[-35deg]' : 'rotate-[145deg]'
                  }`}
                >
                  <svg
                    className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] opacity-90 animate-pulse"
                    viewBox="0 0 24 24"
                    fill="white"
                  >
                    <path d="M10 5L3 12L10 19V14H21V10H10V5Z" />
                  </svg>
                </div>

                {/* Right Arrow (between bottom and lower-right player, pointing in turn direction) */}
                <div
                  className={`absolute right-[28%] ${isMobile ? 'top-[52%]' : 'top-[50%]'} transition-transform duration-700 ${
                    gameState.turnDirection === 1 ? 'rotate-[-35deg]' : 'rotate-[145deg]'
                  }`}
                >
                  <svg
                    className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] opacity-90 animate-pulse"
                    viewBox="0 0 24 24"
                    fill="white"
                  >
                    <path d="M10 5L3 12L10 19V14H21V10H10V5Z" />
                  </svg>
                </div>
              </div>

              {/* Center Cards (Draw deck & Discard pile centered on table) */}
              <div
                className={`absolute left-1/2 ${
                  isMobile ? 'top-[52%]' : 'top-[50%]'
                } -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto`}
              >
                {/* Active Player Conic Spotlight (Screenshot 2: GamePigeon turn beam shining up toward center cards) */}
                {isMyTurn && (
                  <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-64 sm:w-80 h-44 sm:h-56 pointer-events-none z-0 overflow-hidden flex items-end justify-center">
                    <div
                      className="w-full h-full opacity-40 animate-pulse"
                      style={{
                        background: 'radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.15) 50%, transparent 80%)',
                        clipPath: 'polygon(38% 100%, 62% 100%, 92% 0%, 8% 0%)',
                      }}
                    />
                  </div>
                )}

                <CenterTable
                  topDiscardCard={gameState.topDiscardCard}
                  activeColor={gameState.activeColor}
                  drawPileCount={gameState.drawPileCount}
                  turnDirection={gameState.turnDirection}
                  isMyTurn={isMyTurn}
                  canDraw={!gameState.drawPendingForPlayer && !isSpectator}
                  onDrawCard={handleDrawCard}
                  bannerAlert={gameState.bannerAlert}
                  lastActionMessage={gameState.lastActionMessage}
                  escrowPot={gameState.escrowPot}
                  pendingDrawCount={gameState.pendingDrawCount}
                  isMobile={isMobile}
                />
              </div>
            </div>

            {/* If Spectator: Show Spectator Arena Bottom Bar */}
            {isSpectator ? (
              <div className="w-full max-w-2xl flex flex-col items-center gap-3 p-3 sm:p-5 rounded-3xl bg-slate-900/90 border-2 border-purple-500/30 backdrop-blur-md shadow-2xl mt-2 sm:mt-4 z-20 animate-in fade-in slide-in-from-bottom-3 duration-300 shrink-0">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <Eye className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Spectator Grandstand</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                          {gameState.spectatorCount || 1} Watching
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Live match view • Cheering and reactions enabled
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ReactionWheel onSendEmote={handleSendEmote} />
                    <button
                      onClick={handleToggleChat}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Live Chat</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Player's Turn Notification & Action Bar */
              <div className="w-full flex flex-col items-center mt-0.5 sm:mt-1 z-20 shrink-0">
                {/* Floating Emote for current player */}
                {myPlayer && <FloatingEmoteDisplay emotes={emotes} targetPlayerId={myPlayer.id} />}

                {/* Turn indicator / Defense Stack Banner / Current Player Seat */}
                <div className="mb-1 flex items-center justify-center w-full">
                  {isMyTurn ? (
                    gameState.pendingDrawCount && gameState.pendingDrawCount > 0 ? (
                      canDefendAttack ? (
                        /* Can defend with +2 or +4: Informative defend guidance with subtle secondary penalty button */
                        <div className="w-full max-w-md mx-auto px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-950/90 via-rose-950/90 to-purple-950/90 border border-amber-500/60 shadow-xl flex items-center justify-between gap-2.5 backdrop-blur-md">
                          <div className="flex items-center gap-2 text-white min-w-0">
                            <Flame
                              className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0 animate-spin"
                              style={{ animationDuration: '3s' }}
                            />
                            <div className="truncate">
                              <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-200">
                                DEFEND OR STACK (+{gameState.pendingDrawCount} CARDS)
                              </div>
                              <div className="text-[10px] text-slate-300 truncate">
                                Play a glowing card to defend, or take penalty ({gameState.turnTimeRemaining}s)
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={handleDrawCard}
                            className="px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-rose-300 hover:text-rose-200 border border-rose-500/40 hover:border-rose-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 shrink-0 cursor-pointer"
                            title="Take penalty cards"
                          >
                            TAKE +{gameState.pendingDrawCount}
                          </button>
                        </div>
                      ) : (
                        /* No defense in hand: must draw penalty cards */
                        <div className="w-full max-w-md mx-auto px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-rose-950/90 via-red-900/90 to-slate-900/90 border border-rose-500/80 shadow-xl flex items-center justify-between gap-2.5 backdrop-blur-md animate-pulse">
                          <div className="flex items-center gap-2 text-white min-w-0">
                            <Flame className="w-4 h-4 text-rose-400 fill-rose-400 shrink-0 animate-bounce" />
                            <div className="truncate">
                              <div className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-rose-200">
                                NO DEFENSE IN HAND — TAKE PENALTY!
                              </div>
                              <div className="text-[10px] text-slate-300 truncate">
                                Pick up all +{gameState.pendingDrawCount} cards ({gameState.turnTimeRemaining}s)
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={handleDrawCard}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-lg shadow-rose-600/50 active:scale-95 shrink-0 cursor-pointer"
                          >
                            PICK +{gameState.pendingDrawCount} CARDS
                          </button>
                        </div>
                      )
                    ) : (
                      /* GAMEPIGEON CURRENT PLAYER SEAT (Screenshots 1 & 3: Avatar + Name + Turn halo) */
                      myPlayer && (
                        <button
                          type="button"
                          onClick={() => setInspectProfile(myPlayer)}
                          className="flex items-center gap-1.5 select-none cursor-pointer group/me transition-transform active:scale-95"
                          title="Click to view your profile & stats"
                        >
                          <div className="relative">
                            <div className="absolute -inset-1 rounded-full border-2 border-white animate-ping opacity-50 pointer-events-none" />
                            <div
                              className="relative w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm xs:text-base sm:text-lg transition-all duration-300 shadow-xl ring-2 sm:ring-3 ring-white scale-105 shadow-white/50 group-hover/me:ring-[#FF4600]"
                              style={{ backgroundColor: '#a3e635' }}
                            >
                              <UserAvatar avatar={myPlayer.avatar} name={myPlayer.name} className="w-full h-full rounded-full" />
                              <div className="absolute -bottom-1 -right-1 bg-black/90 text-white font-black text-[7px] sm:text-[8px] px-1 py-0.2 rounded-full shadow-lg font-mono border border-white/60">
                                {gameState.turnTimeRemaining}s
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 shadow-md group-hover/me:border-[#FF4600]/60">
                            <span className="text-[10px] sm:text-xs font-black text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] truncate max-w-[90px] sm:max-w-[130px]">
                              {myPlayer.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded-full bg-[#FF4600] text-white text-[7px] xs:text-[8px] font-black uppercase tracking-wider shadow-sm animate-pulse">
                              YOUR TURN
                            </span>
                          </div>
                        </button>
                      )
                    )
                  ) : (
                    /* Waiting for Opponent: Show current player avatar in waiting state */
                    myPlayer && (
                      <button
                        type="button"
                        onClick={() => setInspectProfile(myPlayer)}
                        className="flex items-center gap-1.5 select-none cursor-pointer group/me transition-transform active:scale-95"
                        title="Click to view your profile & stats"
                      >
                        <div
                          className="relative w-7 h-7 xs:w-8 xs:h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-sm xs:text-base ring-1.5 ring-white/30 shadow-md group-hover/me:ring-[#FF4600]"
                          style={{ backgroundColor: '#84cc16' }}
                        >
                          <UserAvatar avatar={myPlayer.avatar} name={myPlayer.name} className="w-full h-full rounded-full" />
                        </div>
                        <div className="flex flex-col items-start text-left">
                          <span className="text-[10px] sm:text-xs font-black text-white drop-shadow truncate max-w-[90px] sm:max-w-[130px] group-hover/me:underline">
                            {myPlayer.name}
                          </span>
                          <span className="text-[8px] sm:text-[9px] text-amber-300 font-mono flex items-center gap-1 drop-shadow">
                            <span>Waiting for</span>
                            <span className="font-bold text-white truncate max-w-[70px]">
                              {gameState.players.find((p) => p.id === gameState.currentTurnPlayerId)?.name || 'opponent'}
                            </span>
                            <span>({gameState.turnTimeRemaining}s)</span>
                          </span>
                        </div>
                      </button>
                    )
                  )}
                </div>

                {/* Player's Hand of Cards */}
                <div
                  id="player-hand-container"
                  className="relative w-full max-w-4xl flex flex-col items-center justify-end px-1 sm:px-4 pb-1 shrink-0"
                >
                  {/* Hand Header: Card count, Tooltip, and Sort Toggle */}
                  <div className="w-full max-w-3xl flex items-center justify-between px-2 mb-1 gap-2">
                    {/* Left: Card count and quick sort toggle */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400 tracking-wider uppercase">
                        CARDS ({myPlayer?.hand?.length || 0})
                      </span>
                      {(myPlayer?.hand?.length || 0) > 4 && (
                        <button
                          type="button"
                          onClick={() => {
                            setHandSortMode((prev) =>
                              prev === 'default' ? 'color' : prev === 'color' ? 'value' : 'default'
                            );
                          }}
                          className="px-2 py-0.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-[9px] sm:text-[10px] font-bold text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Sort cards by Color or Number Value"
                        >
                          <ArrowUpDown className="w-2.5 h-2.5 text-[#FF4600]" />
                          <span>
                            {handSortMode === 'color' ? 'By Color' : handSortMode === 'value' ? 'By Value' : 'Sort'}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Center / Right: Active Card Inspection Tooltip */}
                    <div className="flex-1 min-w-0 flex justify-end">
                      {hoveredCard ? (
                        <div className="px-2.5 py-0.5 rounded-full bg-[#0C0F14]/95 border border-white/[0.08] text-[10px] sm:text-xs text-white shadow-xl shadow-black/80 flex items-center gap-1.5 animate-in fade-in duration-100 backdrop-blur-md truncate max-w-full">
                          {hoveredCard.value === '8' ? (
                            <>
                              <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-pink-500 via-yellow-400 to-blue-500 text-white font-black text-[9px] shadow-sm">
                                CRAZY 8
                              </span>
                              <span className="font-bold text-slate-100 truncate">
                                Crazy 8 — Play on any card & change suit
                              </span>
                            </>
                          ) : hoveredCard.value === 'wild_draw4' ? (
                            <>
                              <span className="px-1.5 py-0.2 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-purple-600 text-white font-black text-[9px] shadow-sm">
                                CRAZY +4
                              </span>
                              <span className="font-bold text-slate-100 truncate">
                                Crazy Draw 4 — Play on any card, next draws 4 (can be stacked)
                              </span>
                            </>
                          ) : hoveredCard.value === 'draw2' ? (
                            <>
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] shadow-sm">
                                +2 DRAW
                              </span>
                              <span className="font-bold text-slate-100 truncate">
                                {hoveredCard.color.toUpperCase()} Draw 2 — Next player draws 2 (can be stacked)
                              </span>
                            </>
                          ) : hoveredCard.value === 'skip' ? (
                            <>
                              <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-black text-[9px] shadow-sm">
                                ⊘ SKIP
                              </span>
                              <span className="font-bold text-slate-100 truncate">
                                {hoveredCard.color.toUpperCase()} Skip — Next player loses their turn
                              </span>
                            </>
                          ) : hoveredCard.value === 'reverse' ? (
                            <>
                              <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white font-black text-[9px] shadow-sm">
                                ⇄ REVERSE
                              </span>
                              <span className="font-bold text-slate-100 truncate">
                                {hoveredCard.color.toUpperCase()} Reverse — Changes the direction of play
                              </span>
                            </>
                          ) : (
                            <span className="font-semibold text-slate-300 truncate">
                              {hoveredCard.color.toUpperCase()} {hoveredCard.value} Card
                            </span>
                          )}
                        </div>
                      ) : (
                        isMyTurn && (
                          <span className="text-[10px] text-amber-400 font-bold animate-pulse">
                            Tap card to play
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Horizontal Scrollable Hand Tray with Dynamic Responsive Spacing */}
                  {(() => {
                    const sortedCards = sortPlayerCards(myPlayer?.hand, handSortMode);
                    const handCount = sortedCards.length;
                    const handCardSize = isMobile ? 'sm' : handCount > 14 ? 'xs' : handCount > 7 ? 'sm' : 'adaptive';

                    // Compute dynamic uniform overlap in pixels based on card size and hand count
                    const cardWidthPx = isMobile
                      ? (handCount > 14 ? 48 : 56)
                      : (handCount > 14 ? 56 : handCount > 7 ? 68 : 78);

                    // Dynamic proportional negative margin so all cards have uniform visible edges
                    let overlapPx = 0;
                    if (handCount <= 4) {
                      overlapPx = 0;
                    } else if (handCount <= 7) {
                      overlapPx = Math.round(cardWidthPx * 0.28);
                    } else if (handCount <= 10) {
                      overlapPx = Math.round(cardWidthPx * 0.38);
                    } else if (handCount <= 14) {
                      overlapPx = Math.round(cardWidthPx * 0.48);
                    } else {
                      overlapPx = Math.min(Math.round(cardWidthPx * 0.58), cardWidthPx - 24);
                    }

                    const isUnderAttack = isMyTurn && (gameState.pendingDrawCount || 0) > 0;

                    if (handCount === 0 && gameState.status === 'playing') {
                      return (
                        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-amber-300 text-xs font-bold animate-pulse my-2 shadow-lg backdrop-blur-md">
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                          <span>Syncing cards with table...</span>
                          <button
                            type="button"
                            onClick={() => socket?.emit('room:refresh_state')}
                            className="ml-2 px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] uppercase font-mono tracking-wider cursor-pointer border border-amber-500/40"
                          >
                            Sync Cards
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="relative w-full max-w-4xl flex items-center justify-center">
                        {/* Scroll Left Arrow (shows on high card counts) */}
                        {handCount > 7 && (
                          <button
                            type="button"
                            onClick={() => scrollHand('left')}
                            className="absolute -left-1 sm:-left-3 z-30 p-1.5 sm:p-2 rounded-full bg-[#0E1217]/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 shadow-lg backdrop-blur-md cursor-pointer hover:text-white transition-all active:scale-90"
                            title="Scroll Hand Left"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}

                        {/* Horizontal Card Tray */}
                        <div
                          ref={handScrollRef}
                          className={`
                            w-full flex items-end overflow-x-auto overflow-y-visible no-scrollbar scroll-smooth touch-pan-x
                            py-4 px-4 sm:px-8 min-h-[120px] sm:min-h-[155px]
                            ${handCount <= 4 ? 'gap-2 sm:gap-3.5' : ''}
                          `}
                          style={{
                            justifyContent: handCount > 8 ? 'flex-start' : 'center',
                          }}
                        >
                          {sortedCards.map((card, idx) => {
                            const playable = isCardPlayable(card);
                            const isSelected = selectedCardId === card.id;
                            const isDefendingCard = isUnderAttack && isDefenseCard(card);
                            
                            // Controlled subtle fanning angle
                            const total = handCount || 1;
                            const rot = (idx - (total - 1) / 2) * (total > 12 ? 0.5 : total > 7 ? 0.9 : 1.3);

                            // Dim unplayable cards when under attack to highlight defense counters
                            const isDimmed = isUnderAttack && !isDefendingCard;

                            return (
                              <div
                                key={card.id}
                                className={`
                                  relative transition-all duration-200 transform shrink-0 select-none
                                  ${isDefendingCard
                                    ? '-translate-y-6 sm:-translate-y-7 z-30 scale-105 hover:-translate-y-8 hover:scale-110 hover:z-40 cursor-pointer'
                                    : isDimmed
                                    ? 'opacity-35 grayscale-[25%] pointer-events-none'
                                    : playable
                                    ? 'hover:-translate-y-5 hover:z-30 hover:scale-105 active:scale-95 cursor-pointer'
                                    : 'opacity-75 hover:opacity-100 hover:-translate-y-2 cursor-pointer'}
                                  ${isSelected ? '-translate-y-6 z-40 scale-105' : ''}
                                `}
                                style={{
                                  transformOrigin: 'bottom center',
                                  marginLeft: idx > 0 && overlapPx > 0 ? `-${overlapPx}px` : undefined,
                                }}
                                onMouseEnter={() => setHoveredCard(card)}
                                onMouseLeave={() => {
                                  if (!selectedCardId) setHoveredCard(null);
                                }}
                                onClick={() => {
                                  if (selectedCardId === card.id) {
                                    if (playable && isMyTurn) {
                                      handlePlayCard(card);
                                      setSelectedCardId(null);
                                    }
                                  } else {
                                    setSelectedCardId(card.id);
                                    setHoveredCard(card);
                                    if (playable && isMyTurn) {
                                      handlePlayCard(card);
                                      setSelectedCardId(null);
                                    }
                                  }
                                }}
                              >
                                {/* Defense Badge on counter cards when under attack */}
                                {isDefendingCard && (
                                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-[8px] sm:text-[9px] uppercase tracking-wider shadow-lg flex items-center gap-1 animate-bounce pointer-events-none">
                                    <Zap className="w-2.5 h-2.5 fill-white" />
                                    <span>DEFEND</span>
                                  </div>
                                )}

                                <CardComponent
                                  card={card}
                                  isPlayable={playable}
                                  isSelected={isSelected}
                                  size={handCardSize}
                                  rotation={rot}
                                  className={`
                                    ${isDefendingCard ? 'ring-3 sm:ring-4 ring-amber-400 shadow-2xl shadow-amber-400/80 animate-pulse' : ''}
                                    ${playable && !isDefendingCard ? 'hover:ring-2 hover:ring-white/90' : ''}
                                  `}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* Scroll Right Arrow (shows on high card counts) */}
                        {handCount > 7 && (
                          <button
                            type="button"
                            onClick={() => scrollHand('right')}
                            className="absolute -right-1 sm:-right-3 z-30 p-1.5 sm:p-2 rounded-full bg-[#0E1217]/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 shadow-lg backdrop-blur-md cursor-pointer hover:text-white transition-all active:scale-90"
                            title="Scroll Hand Right"
                          >
                            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Bottom Quick Controls Bar */}
                <div className="w-full max-w-xl flex items-center justify-between gap-2 px-3 py-1.5 sm:py-2 rounded-2xl bg-[#0C0F14]/95 border border-white/[0.06] backdrop-blur-md mt-1 sm:mt-2 shadow-xl shadow-black/60 shrink-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Reaction Emote Wheel */}
                    <ReactionWheel onSendEmote={handleSendEmote} />
                  </div>

                  {/* Hand Action Buttons: Consolidated single trigger (penalty action handled cleanly in defense banner) */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {isMyTurn && gameState.drawPendingForPlayer && (
                      <button
                        onClick={handlePassTurn}
                        className="px-3 sm:px-4 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-[#FF4600]/40 text-[#FF4600] font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-colors animate-pulse cursor-pointer"
                      >
                        Pass Turn
                      </button>
                    )}

                    {isMyTurn && !gameState.drawPendingForPlayer && (!gameState.pendingDrawCount || gameState.pendingDrawCount === 0) && (
                      <button
                        onClick={handleDrawCard}
                        className="px-3.5 sm:px-4.5 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer bg-[#FF4600] hover:bg-[#FF5500] text-white active:scale-95 shadow-md shadow-[#FF4600]/30"
                      >
                        Draw 1 Card
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Chat Drawer & Toggle */}
      {gameState && (
        <ChatPanel
          isOpen={isChatOpen}
          onToggle={handleToggleChat}
          messages={chatMessages}
          onSendMessage={handleSendChatMessage}
          myPlayerId={myPlayerId}
          isSpectator={isSpectator}
          unreadCount={unreadChatCount}
          roomCode={gameState.roomCode}
          roomId={gameState.roomId}
          onOpenUserProfile={(u) => setInspectProfile(u)}
        />
      )}

      {/* Real-time Staggered Card Draw Motion Animation */}
      <CardTransferAnimation socket={socket} myPlayerId={myPlayerId} />

      {/* Crazy 8 4-Card Compass Cross Modal */}
      <Crazy8ColorModal
        isOpen={!!pendingWildCard}
        cardLabel={pendingWildCard?.label}
        onSelectColor={handleConfirmWildColor}
        onCancel={() => setPendingWildCard(null)}
      />

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Global Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUserId={account?.id}
      />

      {/* Create Custom Table Modal */}
      <CreateTableModal
        isOpen={isCreateTableOpen}
        onClose={() => setIsCreateTableOpen(false)}
        onCreateRoom={handleCreateRoom}
        playerName={account?.name || ''}
        avatar={account?.avatar || '🦊'}
        walletAddress={wallet.address || undefined}
        tokenBalance={tokenBalance}
        onConnectWallet={handleConnectWallet}
      />

      {/* User Profile & Database Career Stats Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          refreshFriendsSummary();
        }}
        account={account}
        onSaveProfile={handleSaveProfile}
        wallet={wallet}
        onConnectWallet={handleConnectWallet}
      />

      {/* Friends & Social Modal */}
      <FriendsModal
        isOpen={isFriendsOpen}
        onClose={() => {
          setIsFriendsOpen(false);
          refreshFriendsSummary();
        }}
        account={account}
        activeRoomCode={gameState?.roomCode || null}
        onJoinRoom={(code) => handleJoinRoom(code, account?.name || '', account?.avatar || '🦊', wallet.address || undefined)}
        onInviteFriend={handleInviteFriend}
        walletAddress={wallet.address}
        onConnectWallet={handleConnectWallet}
      />

      {/* Incoming Friend Game Invite Toast */}
      <GameInviteToast
        invite={currentInvite}
        onAccept={(roomCode) => {
          setCurrentInvite(null);
          if (!wallet.address) {
            handleConnectWallet();
            return;
          }
          handleJoinRoom(roomCode, account?.name || '', account?.avatar || '🦊', wallet.address || undefined);
        }}
        onDismiss={() => setCurrentInvite(null)}
      />

      {gameState && gameState.status === 'game_over' && (
        <VictoryModal
          gameState={gameState}
          myPlayerId={myPlayerId}
          isHost={isHost}
          onRematch={handleRematch}
          onLeaveRoom={handleLeaveRoom}
          onOpenProfile={(p) => setInspectProfile(p)}
        />
      )}

      {/* Connect Web3 Wallet Discovery Modal */}
      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => {
          setIsWalletModalOpen(false);
          setConnectingWalletId(null);
          setWalletModalError(null);
        }}
        onSelectWallet={handleSelectWallet}
        onSelectGuestWallet={handleSelectGuestWallet}
        connectingWalletId={connectingWalletId}
        error={walletModalError}
        onClearError={() => setWalletModalError(null)}
      />

      {/* 10,000 $CRAZY8 Welcome Airdrop Modal */}
      <AirdropModal
        isOpen={isAirdropOpen}
        onClose={() => setIsAirdropOpen(false)}
        walletAddress={wallet.address}
        hasAlreadyClaimed={hasClaimedAirdrop}
        tokenBalance={tokenBalance}
        onClaimSuccess={(newBal) => {
          setTokenBalance(newBal);
          setIsAirdropEligible(false);
          setHasClaimedAirdrop(true);
          try {
            if (wallet.address) {
              localStorage.setItem(`hemi_uno_airdrop_claimed_${wallet.address.toLowerCase()}`, 'true');
            }
            localStorage.setItem('hemi_uno_tour_dismissed', 'true');
          } catch {}
        }}
      />

      {/* Onboarding Tour Spotlight for New Time Users */}
      <AirdropTourToast
        isVisible={
          !hasClaimedAirdrop &&
          !tourDismissed &&
          !isAirdropOpen &&
          !connectingWalletId &&
          (!gameState || gameState.status === 'lobby')
        }
        targetId="nav-airdrop-gift-btn"
        isWalletConnected={Boolean(wallet.address)}
        onClaimClick={() => {
          if (!wallet.address) {
            handleConnectWallet();
          } else {
            setIsAirdropOpen(true);
          }
        }}
        onDismiss={() => {
          setTourDismissed(true);
          try {
            localStorage.setItem('hemi_uno_tour_dismissed', 'true');
          } catch {}
        }}
      />

      {/* Notifications & Payouts Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
        onClearAll={handleClearNotifications}
        onOpenAirdrop={() => setIsAirdropOpen(true)}
      />
      {/* Universal User Profile Inspector Modal */}
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
