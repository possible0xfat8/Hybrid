import { createPublicClient, createWalletClient, http, parseEther, formatEther, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
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
  const privateKey = (process.env.BACKEND_PRIVATE_KEY || DEFAULT_BACKEND_KEY) as `0x${string}`;
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
  const cached = statsCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.stats;
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

    const result: Connect4PlayerStats = {
      address,
      elo: Math.round(Number(formatEther(data[0]))),
      wins: Number(data[1]),
      losses: Number(data[2]),
      totalGames: Number(data[3]),
      currentStreak: Number(data[4]),
      bestStreak: Number(data[5]),
    };

    statsCache.set(normalized, { stats: result, expiresAt: Date.now() + 60_000 });
    return result;
  } catch (error) {
    console.warn(`[Connect4Settlement] Using default stats for ${address} (RPC notice: ${(error as any)?.message || error})`);
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

export async function settleConnect4MatchOnChain(params: {
  gameId: string;
  winnerAddress: string;
  loserAddress: string;
  winDelta?: number;
  loseDelta?: number;
}): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const { gameId, winnerAddress, loserAddress } = params;

    if (!isAddress(winnerAddress) || !isAddress(loserAddress)) {
      return { success: false, error: 'Invalid Ethereum address for match settlement' };
    }

    // Default ELO deltas if not supplied
    const winnerStats = await getConnect4PlayerStats(winnerAddress);
    const loserStats = await getConnect4PlayerStats(loserAddress);
    const deltas = calculateConnect4EloDelta(winnerStats.elo, loserStats.elo);

    const winDeltaPoints = params.winDelta || deltas.winDelta;
    const loseDeltaPoints = params.loseDelta || deltas.loseDelta;

    const winWei = parseEther(winDeltaPoints.toString());
    const loseWei = parseEther(loseDeltaPoints.toString());

    console.log(`[Connect4Settlement] Settling match ${gameId} on Hemi Sepolia:`);
    console.log(`Winner: ${winnerAddress} (+${winDeltaPoints} ELO)`);
    console.log(`Loser:  ${loserAddress} (-${loseDeltaPoints} ELO)`);

    const walletClient = getWalletClient();
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: connect4Abi,
      functionName: 'recordMatch',
      args: [gameId, winnerAddress as `0x${string}`, loserAddress as `0x${string}`, winWei, loseWei],
    });

    console.log(`[Connect4Settlement] Settlement tx sent: ${hash}`);
    return { success: true, txHash: hash };
  } catch (error: any) {
    console.error(`[Connect4Settlement] Settlement failed for ${params.gameId}:`, error);
    return { success: false, error: error?.message || 'On-chain settlement failed' };
  }
}

export async function getRecentConnect4Matches(limit = 10) {
  try {
    const records = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: connect4Abi,
      functionName: 'getRecentMatches',
      args: [BigInt(limit)],
    }) as Array<{
      gameId: string;
      winner: string;
      loser: string;
      winEloDelta: bigint;
      loseEloDelta: bigint;
      timestamp: bigint;
    }>;

    return records.map((r) => ({
      gameId: r.gameId,
      winner: r.winner,
      loser: r.loser,
      winEloDelta: Math.round(Number(formatEther(r.winEloDelta))),
      loseEloDelta: Math.round(Number(formatEther(r.loseEloDelta))),
      timestamp: Number(r.timestamp) * 1000,
    }));
  } catch (error) {
    console.error('[Connect4Settlement] Failed to read recent matches:', error);
    return [];
  }
}
