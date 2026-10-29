import { createPublicClient, createWalletClient, http, parseEther, formatEther, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';
import connect4Abi from '../../src/lib/connect4/HemiConnect4EloABI.json' with { type: 'json' };

const HEMI_SEPOLIA_CHAIN = {
  id: 743111,
  name: 'Hemi Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://testnet.rpc.hemi.network/rpc'] } },
  blockExplorers: { default: { name: 'Hemi Explorer', url: 'https://testnet.explorer.hemi.network' } },
};

const CONTRACT_ADDRESS = (process.env.HEMI_CONNECT4_ELO_ADDRESS ||
  '0xfe6dc2c29b9f0e83c229a9a3deb1c89cde81afa3') as `0x${string}`;

const DEFAULT_BACKEND_KEY =
  '0x2a39ae7921ead16f4c31915056e0e5573f04735df3f723b4a6ae2f838c685181';

const publicClient = createPublicClient({
  chain: HEMI_SEPOLIA_CHAIN,
  transport: http(),
});

function getWalletClient() {
  const envKey = (process.env.ADMIN_PRIVATE_KEY || process.env.BACKEND_PRIVATE_KEY)?.trim();
  const privateKey = (envKey && envKey.startsWith('0x') && envKey.length === 66
    ? envKey
    : DEFAULT_BACKEND_KEY) as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: HEMI_SEPOLIA_CHAIN,
    transport: http(),
  });
}

export interface Connect4PlayerStats {
  address: string;
  elo: number;
  wins: number;
  losses: number;
  totalGames: number;
  currentStreak: number;
  bestStreak: number;
}

export interface Connect4MatchRecord {
  gameId: string;
  winner: string;
  loser: string;
  winEloDelta: number;
  loseEloDelta: number;
  timestamp: number;
  txHash?: string;
}

const DB_DIR = path.join(process.cwd(), 'data');
const C4_DB_FILE = path.join(DB_DIR, 'connect4_db.json');

class LocalConnect4Store {
  public players: Record<string, Connect4PlayerStats> = {};
  public matches: Connect4MatchRecord[] = [];
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(C4_DB_FILE)) {
        const raw = fs.readFileSync(C4_DB_FILE, 'utf-8');
        if (raw.trim()) {
          const parsed = JSON.parse(raw);
          if (parsed.players) this.players = parsed.players;
          if (Array.isArray(parsed.matches)) this.matches = parsed.matches;
        }
      }
    } catch (err: any) {
      console.warn('[Database:CONNECT4] Load warning:', err.message);
    }
  }

  public save() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      try {
        if (!fs.existsSync(DB_DIR)) {
          fs.mkdirSync(DB_DIR, { recursive: true });
        }
        fs.writeFileSync(
          C4_DB_FILE,
          JSON.stringify({ players: this.players, matches: this.matches }, null, 2),
          'utf-8'
        );
      } catch (err: any) {
        console.warn('[Database:CONNECT4] Save warning:', err.message);
      }
    }, 300);
  }
}

const localC4Db = new LocalConnect4Store();
const statsCache = new Map<string, { stats: Connect4PlayerStats; expiresAt: number }>();

export async function getConnect4PlayerStats(address: string): Promise<Connect4PlayerStats> {
  const defaultStats: Connect4PlayerStats = {
    address,
    elo: 1200,
    wins: 0,
    losses: 0,
    totalGames: 0,
    currentStreak: 0,
    bestStreak: 0,
  };

  if (!address || !isAddress(address)) {
    return defaultStats;
  }

  const normalized = address.toLowerCase();
  const localStats = localC4Db.players[normalized];

  const cached = statsCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return localStats && localStats.totalGames >= cached.stats.totalGames ? localStats : cached.stats;
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('RPC request timed out')), 1200)
    );

    const data = (await Promise.race([
      publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: connect4Abi,
        functionName: 'getPlayer',
        args: [address as `0x${string}`],
      }),
      timeoutPromise,
    ])) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint];

    const onChainResult: Connect4PlayerStats = {
      address,
      elo: Math.round(Number(formatEther(data[0]))) || 1200,
      wins: Number(data[1]),
      losses: Number(data[2]),
      totalGames: Number(data[3]),
      currentStreak: Number(data[4]),
      bestStreak: Number(data[5]),
    };

    const merged: Connect4PlayerStats =
      localStats && localStats.totalGames > onChainResult.totalGames
        ? localStats
        : onChainResult;

    localC4Db.players[normalized] = merged;
    localC4Db.save();
    statsCache.set(normalized, { stats: merged, expiresAt: Date.now() + 60_000 });
    return merged;
  } catch (error) {
    if (localStats) {
      return localStats;
    }
    return defaultStats;
  }
}

export function calculateConnect4EloDelta(winnerElo: number, loserElo: number): { winDelta: number; loseDelta: number } {
  const K = 32;
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

  const winDelta = Math.max(8, Math.min(48, Math.round(K * (1 - expectedWinner))));
  const loseDelta = Math.max(8, Math.min(48, Math.round(K * (0 - expectedLoser) * -1)));

  return { winDelta, loseDelta };
}

function recordLocalConnect4Match(params: {
  gameId: string;
  winnerAddress: string;
  loserAddress?: string;
  winDelta: number;
  loseDelta: number;
  txHash?: string;
}) {
  const winAddr = params.winnerAddress.toLowerCase();
  const loseAddr = params.loserAddress?.toLowerCase();

  if (isAddress(winAddr)) {
    const cur = localC4Db.players[winAddr] || {
      address: params.winnerAddress,
      elo: 1200,
      wins: 0,
      losses: 0,
      totalGames: 0,
      currentStreak: 0,
      bestStreak: 0,
    };
    cur.elo = Math.max(800, cur.elo + params.winDelta);
    cur.wins += 1;
    cur.totalGames += 1;
    cur.currentStreak += 1;
    cur.bestStreak = Math.max(cur.bestStreak, cur.currentStreak);
    localC4Db.players[winAddr] = cur;
    statsCache.set(winAddr, { stats: cur, expiresAt: Date.now() + 60_000 });
  }

  if (loseAddr && isAddress(loseAddr) && !loseAddr.includes('000000000000b075')) {
    const cur = localC4Db.players[loseAddr] || {
      address: params.loserAddress!,
      elo: 1200,
      wins: 0,
      losses: 0,
      totalGames: 0,
      currentStreak: 0,
      bestStreak: 0,
    };
    cur.elo = Math.max(800, cur.elo - params.loseDelta);
    cur.losses += 1;
    cur.totalGames += 1;
    cur.currentStreak = 0;
    localC4Db.players[loseAddr] = cur;
    statsCache.set(loseAddr, { stats: cur, expiresAt: Date.now() + 60_000 });
  }

  localC4Db.matches.unshift({
    gameId: params.gameId,
    winner: params.winnerAddress,
    loser: params.loserAddress || '0x000000000000000000000000000000000000B075',
    winEloDelta: params.winDelta,
    loseEloDelta: params.loseDelta,
    timestamp: Date.now(),
    txHash: params.txHash,
  });
  localC4Db.matches = localC4Db.matches.slice(0, 100);
  localC4Db.save();
}

/**
 * Direct soulbound ELO adjustment matching the exact Hemi Chess adjustElo method
 */
export async function adjustConnect4EloOnChain(
  playerAddress: string,
  amount: bigint,
  isWin: boolean
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!isAddress(playerAddress)) {
      return { success: false, error: 'Invalid player address' };
    }
    const walletClient = getWalletClient();
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: connect4Abi,
      functionName: 'adjustElo',
      args: [playerAddress as `0x${string}`, amount, isWin],
    });
    console.log(`[Connect4Settlement] adjustElo tx sent: ${hash} for ${playerAddress}`);
    return { success: true, txHash: hash };
  } catch (err: any) {
    console.error(`[Connect4Settlement] adjustElo failed for ${playerAddress}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * On-chain match settlement for Connect 4 on Hemi Sepolia + immediate local disk persistence.
 */
export async function settleConnect4MatchOnChain(params: {
  gameId: string;
  winnerAddress: string;
  loserAddress?: string;
  winDelta?: number;
  loseDelta?: number;
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const { gameId, winnerAddress, loserAddress } = params;
  const winDeltaPoints = params.winDelta || 16;
  const loseDeltaPoints = params.loseDelta || 16;

  // Always persist immediately to local disk store
  recordLocalConnect4Match({
    gameId,
    winnerAddress,
    loserAddress,
    winDelta: winDeltaPoints,
    loseDelta: loseDeltaPoints,
  });

  try {
    if (!isAddress(winnerAddress)) {
      return { success: false, error: 'Invalid winner Ethereum address for match settlement' };
    }

    const winWei = parseEther(winDeltaPoints.toString());
    const loseWei = parseEther(loseDeltaPoints.toString());

    const walletClient = getWalletClient();

    // 1. Try recordMatch if both are valid, distinct, human on-chain addresses
    const isHumanDuel = Boolean(
      loserAddress &&
        isAddress(loserAddress) &&
        loserAddress.toLowerCase() !== winnerAddress.toLowerCase() &&
        !loserAddress.toLowerCase().includes('bot') &&
        loserAddress !== '0x000000000000000000000000000000000000B075'
    );

    if (isHumanDuel && loserAddress) {
      try {
        console.log(`[Connect4Settlement] Settling 1v1 match ${gameId} via recordMatch on Hemi Sepolia:`);
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: connect4Abi,
          functionName: 'recordMatch',
          args: [gameId, winnerAddress as `0x${string}`, loserAddress as `0x${string}`, winWei, loseWei],
        });

        console.log(`[Connect4Settlement] Settlement tx sent: ${hash}`);
        return { success: true, txHash: hash };
      } catch (recordErr: any) {
        console.warn(`[Connect4Settlement] recordMatch notice (${recordErr.message}), falling back to direct adjustElo...`);
      }
    }

    // 2. Direct ELO adjustment (exact same method as Hemi Chess)
    console.log(`[Connect4Settlement] Disbursing ELO directly via adjustElo for ${winnerAddress} (+${winDeltaPoints} ELO)...`);
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: connect4Abi,
      functionName: 'adjustElo',
      args: [winnerAddress as `0x${string}`, winWei, true],
    });

    console.log(`[Connect4Settlement] adjustElo tx sent: ${hash}`);
    return { success: true, txHash: hash };
  } catch (error: any) {
    console.error(`[Connect4Settlement] Settlement failed for ${params.gameId}:`, error);
    return { success: false, error: error?.message || 'On-chain settlement failed' };
  }
}

export async function getRecentConnect4Matches(limit = 10) {
  try {
    const records = (await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: connect4Abi,
      functionName: 'getRecentMatches',
      args: [BigInt(limit)],
    })) as Array<{
      gameId: string;
      winner: string;
      loser: string;
      winEloDelta: bigint;
      loseEloDelta: bigint;
      timestamp: bigint;
    }>;

    const onChainMatches = records.map((r) => ({
      gameId: r.gameId,
      winner: r.winner,
      loser: r.loser,
      winEloDelta: Math.round(Number(formatEther(r.winEloDelta))),
      loseEloDelta: Math.round(Number(formatEther(r.loseEloDelta))),
      timestamp: Number(r.timestamp) * 1000,
    }));

    if (onChainMatches.length >= limit) {
      return onChainMatches;
    }

    const seenIds = new Set(onChainMatches.map((m) => m.gameId));
    const combined = [
      ...onChainMatches,
      ...localC4Db.matches.filter((m) => !seenIds.has(m.gameId)),
    ];
    return combined.slice(0, limit);
  } catch (error) {
    return localC4Db.matches.slice(0, limit);
  }
}

