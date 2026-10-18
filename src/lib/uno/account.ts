/**
 * Persistent Account & Player Profile Management for UNO Arcade
 * Ensures player identity, custom name, avatar, and active room survive:
 * - Network drops and reconnects
 * - Tab refreshes
 * - Browser sleep / wake
 */

export interface AccountProfile {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  address?: string;
  stats?: {
    matchesPlayed: number;
    wins: number;
    cardsPlayed: number;
    hemiWon?: string;
    rankTitle?: string;
    winStreak?: number;
  };
}

const STORAGE_KEY_PROFILE = 'uno_arcade_profile_v2';
const STORAGE_KEY_ROOM = 'uno_arcade_active_room_v2';
const STORAGE_KEY_WALLET_PREFIX = 'uno_arcade_wallet_profile_';

export const DEFAULT_AVATARS = ['🦊', '🦁', '🐸', '🤖', '⚡', '💎', '🐉', '🐱', '🐼', '🦄', '🐯', '🦅'];
export const DEFAULT_NAMES = [
  'ChadCard',
  'HemiHustler',
  'BlockBuster',
  'SepoliaShark',
  'TurboPlayer',
  'NeonKnight',
  'CosmicDraw',
  'WildJoker',
];

function generateAccountId(): string {
  const rand = Math.random().toString(36).substring(2, 8);
  const time = Date.now().toString(36);
  return `acc_${time}_${rand}`;
}

export function getAccountProfileForWallet(address?: string | null): AccountProfile | null {
  if (typeof window === 'undefined' || !address || !address.trim().startsWith('0x')) return null;
  try {
    const clean = address.trim().toLowerCase();
    const raw = localStorage.getItem(`${STORAGE_KEY_WALLET_PREFIX}${clean}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name) {
        return {
          id: parsed.id || `wallet_${clean}`,
          name: parsed.name,
          avatar: parsed.avatar || '🦊',
          bio: parsed.bio || 'Hemi Testnet Card Champion',
          address: clean,
          stats: parsed.stats,
        };
      }
    }
  } catch (err) {
    console.warn('Error reading wallet profile from storage:', err);
  }
  return null;
}

export function getOrCreateAccountProfile(walletAddress?: string | null): AccountProfile | null {
  if (typeof window === 'undefined' || !walletAddress || !walletAddress.trim().startsWith('0x')) {
    return null;
  }

  const clean = walletAddress.trim().toLowerCase();

  // Try wallet cache first
  const fromWallet = getAccountProfileForWallet(clean);
  if (fromWallet) return fromWallet;

  // Create initial profile strictly bound to this wallet address
  const shortName = `${clean.slice(0, 6)}...${clean.slice(-4)}`;
  const newProfile: AccountProfile = {
    id: `wallet_${clean}`,
    name: shortName,
    avatar: DEFAULT_AVATARS[0],
    bio: 'Ready to play Crazy 8 on Hemi!',
    address: clean,
  };

  try {
    localStorage.setItem(`${STORAGE_KEY_WALLET_PREFIX}${clean}`, JSON.stringify(newProfile));
  } catch (err) {
    console.warn('Failed to save fresh wallet profile:', err);
  }

  return newProfile;
}

export function saveAccountProfile(updates: Partial<AccountProfile>): AccountProfile | null {
  const targetAddr = updates.address?.trim().toLowerCase();
  if (!targetAddr || !targetAddr.startsWith('0x')) {
    console.warn('Cannot save profile without a connected wallet address');
    return null;
  }

  const current = getOrCreateAccountProfile(targetAddr);
  if (!current) return null;

  const merged: AccountProfile = {
    ...current,
    ...updates,
    id: `wallet_${targetAddr}`,
    address: targetAddr,
  };

  try {
    localStorage.setItem(`${STORAGE_KEY_WALLET_PREFIX}${targetAddr}`, JSON.stringify(merged));
    localStorage.setItem('uno_arcade_last_wallet_addr', targetAddr);
    // Remove obsolete unauthenticated profile storage if present
    localStorage.removeItem(STORAGE_KEY_PROFILE);
  } catch (err) {
    console.warn('Failed to save account updates:', err);
  }

  return merged;
}

export function syncAccountWithServerProfile(serverUser: {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  address?: string;
  stats?: any;
}): AccountProfile | null {
  const cleanAddr = serverUser.address && serverUser.address.trim().startsWith('0x')
    ? serverUser.address.trim().toLowerCase()
    : undefined;

  if (!cleanAddr) {
    return null;
  }

  const profile: AccountProfile = {
    id: `wallet_${cleanAddr}`,
    name: serverUser.name || `${cleanAddr.slice(0, 6)}...${cleanAddr.slice(-4)}`,
    avatar: serverUser.avatar || '🦊',
    bio: serverUser.bio || 'Hemi Testnet Card Champion',
    address: cleanAddr,
    stats: serverUser.stats,
  };

  try {
    localStorage.setItem(`${STORAGE_KEY_WALLET_PREFIX}${cleanAddr}`, JSON.stringify(profile));
    localStorage.setItem('uno_arcade_last_wallet_addr', cleanAddr);
    localStorage.removeItem(STORAGE_KEY_PROFILE);
  } catch (err) {
    console.warn('Failed to save synced account profile:', err);
  }

  return profile;
}

export function getLastConnectedWallet(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('uno_arcade_last_wallet_addr');
  } catch {
    return null;
  }
}

export function saveLastConnectedWallet(address: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (address) {
      localStorage.setItem('uno_arcade_last_wallet_addr', address);
    } else {
      localStorage.removeItem('uno_arcade_last_wallet_addr');
    }
  } catch {}
}

export function getActiveRoomCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const code = localStorage.getItem(STORAGE_KEY_ROOM);
    return code && code.trim().length === 4 ? code.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export function setActiveRoomCode(roomCode: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (roomCode) {
      localStorage.setItem(STORAGE_KEY_ROOM, roomCode.trim().toUpperCase());
    } else {
      localStorage.removeItem(STORAGE_KEY_ROOM);
    }
  } catch {}
}
