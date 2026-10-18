import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  isAddress,
  getAddress,
  Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { calculateMatchElo, getAbsoluteEloDelta } from './eloMath';

const HEMI_SEPOLIA = {
  id: 743111,
  name: 'Hemi Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.rpc.hemi.network/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Hemi Explorer', url: 'https://testnet.explorer.hemi.network' },
  },
  testnet: true,
};

const HEMI_CHESS_ELO_ADDRESS =
  (process.env.HEMI_CHESS_ELO_ADDRESS as `0x${string}`) ||
  '0xeE82E97e9B8bA9b189FcB7Dedb65Dc3717f41d79';

const HEMI_CHESS_ELO_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'player', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'bool', name: 'isWin', type: 'bool' },
    ],
    name: 'adjustElo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address[]', name: 'players', type: 'address[]' },
      { internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' },
      { internalType: 'bool[]', name: 'isWins', type: 'bool[]' },
    ],
    name: 'batchAdjustElo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

let publicClient: any = null;
let walletClient: any = null;
let oracleAccount: any = null;

function initializeClients() {
  if (publicClient) return;

  publicClient = createPublicClient({
    chain: HEMI_SEPOLIA,
    transport: http(),
  });

  const privateKey = (process.env.BACKEND_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY)?.trim();
  if (privateKey && privateKey.startsWith('0x') && privateKey.length === 66) {
    try {
      oracleAccount = privateKeyToAccount(privateKey as Hex);
      walletClient = createWalletClient({
        account: oracleAccount,
        chain: HEMI_SEPOLIA,
        transport: http(),
      });
      console.log('[CHESS:ORACLE] Initialized with address:', oracleAccount.address);
    } catch (err: any) {
      console.error('[CHESS:ORACLE] Failed to initialize wallet client:', err.message);
    }
  } else {
    console.log('[CHESS:ORACLE] No valid private key configured - settlement disabled');
  }
}

export function isSettlementEnabled(): boolean {
  initializeClients();
  return !!walletClient && !!oracleAccount;
}

export function getOracleAddress(): string | null {
  initializeClients();
  return oracleAccount ? oracleAccount.address : null;
}

export async function readEloBalance(walletAddress: string): Promise<bigint> {
  initializeClients();
  if (!isAddress(walletAddress)) return BigInt(0);

  try {
    const balance = await publicClient.readContract({
      address: HEMI_CHESS_ELO_ADDRESS,
      abi: HEMI_CHESS_ELO_ABI,
      functionName: 'balanceOf',
      args: [getAddress(walletAddress)],
    });
    return balance as bigint;
  } catch (err: any) {
    console.error(`[CHESS:ORACLE] Failed to read balance for ${walletAddress}:`, err.message);
    return BigInt(0);
  }
}

export async function adjustEloOnChain(
  playerAddress: string,
  amount: bigint,
  isWin: boolean
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  initializeClients();
  if (!isSettlementEnabled()) {
    return { success: false, error: 'Settlement service disabled' };
  }

  try {
    const txHash = await walletClient.writeContract({
      address: HEMI_CHESS_ELO_ADDRESS,
      abi: HEMI_CHESS_ELO_ABI,
      functionName: 'adjustElo',
      args: [getAddress(playerAddress), amount, isWin],
    });

    console.log(`[CHESS:ORACLE] ELO adjusted for ${playerAddress}: ${txHash}`);
    return { success: true, txHash };
  } catch (err: any) {
    console.error(`[CHESS:ORACLE] Failed to adjust ELO for ${playerAddress}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function settleMatch(
  gameId: string,
  whitePlayer: { id: string; walletAddress?: string; elo: number },
  blackPlayer: { id: string; walletAddress?: string; elo: number },
  winner: 'white' | 'black' | 'draw'
): Promise<{
  success: boolean;
  whiteEloChange?: number;
  blackEloChange?: number;
  newWhiteElo?: number;
  newBlackElo?: number;
  txHash?: string;
  error?: string;
}> {
  initializeClients();
  const eloChanges = calculateMatchElo(whitePlayer.elo, blackPlayer.elo, winner);

  const result = {
    success: true,
    whiteEloChange: eloChanges.white.change,
    blackEloChange: eloChanges.black.change,
    newWhiteElo: eloChanges.white.newRating,
    newBlackElo: eloChanges.black.newRating,
  };

  if (winner === 'draw') {
    return result;
  }

  const whiteAddress = whitePlayer.walletAddress;
  const blackAddress = blackPlayer.walletAddress;

  if (!isSettlementEnabled() || !whiteAddress || !blackAddress) {
    return result;
  }

  try {
    const isWhiteWin = winner === 'white';
    const winnerAddr = isWhiteWin ? whiteAddress : blackAddress;
    const winnerDelta = isWhiteWin
      ? eloChanges.white.change
      : eloChanges.black.change;

    const amountWei = parseUnits(String(Math.abs(winnerDelta)), 18);
    const onChainResult = await adjustEloOnChain(winnerAddr, amountWei, true);

    return {
      ...result,
      txHash: onChainResult.txHash,
    };
  } catch (err: any) {
    console.error(`[CHESS:ORACLE] Settlement failed for game ${gameId}:`, err.message);
    return result;
  }
}
