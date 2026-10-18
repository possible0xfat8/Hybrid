import { ethers } from 'ethers';
import { CRAZY8_TOKEN_ADDRESS } from './token';
import { HEMI_SEPOLIA_CONFIG, switchOrAddHemiNetwork } from './wallet';

export const CRAZY8_ESCROW_ADDRESS =
  (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_CRAZY8_ESCROW_ADDRESS || process.env.VITE_CRAZY8_ESCROW_ADDRESS)) || '0xbD42f75Fee8aD5Dd260DAbbC0520b5A0Efa1F060';

export const ESCROW_ABI = [
  'function depositBuyIn(bytes32 gameId, uint256 amount) external',
  'function settleGame(bytes32 gameId, address winner) external',
  'function cancelGameAndRefund(bytes32 gameId) external',
  'function getGameDetails(bytes32 gameId) external view returns (uint256 totalPot, uint256 buyInPerPlayer, uint256 playerCount, address winner, bool isSettled, bool isCancelled, uint256 winnerPayout, uint256 feeAmount)',
  'function hasDeposited(bytes32 gameId, address player) external view returns (bool)',
  'function totalGamesSettled() external view returns (uint256)',
  'function totalVolumeDistributed() external view returns (uint256)',
  'function totalFeesCollected() external view returns (uint256)',
];

export const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
];

export function formatGameId(roomCode: string): string {
  const cleanCode = (roomCode || 'GAME').trim().toUpperCase();
  return ethers.keccak256(ethers.toUtf8Bytes(`HEMI_CRAZY_8_${cleanCode}`));
}

/**
 * Deposits buy-in tokens on-chain into the HemiCrazy8Escrow contract.
 * Automatically checks and handles token approval if needed.
 */
export async function depositBuyInOnChain(
  ethereumProvider: any,
  roomCode: string,
  buyInAmountTokens: number | string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!ethereumProvider) {
      return { success: false, error: 'No Web3 wallet provider available' };
    }

    // Ensure user is on Hemi Sepolia
    await switchOrAddHemiNetwork(ethereumProvider, HEMI_SEPOLIA_CONFIG);

    const provider = new ethers.BrowserProvider(ethereumProvider);
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    const amountWei = ethers.parseEther(String(buyInAmountTokens));
    const gameId = formatGameId(roomCode);

    const tokenContract = new ethers.Contract(CRAZY8_TOKEN_ADDRESS, ERC20_ABI, signer);
    const escrowContract = new ethers.Contract(CRAZY8_ESCROW_ADDRESS, ESCROW_ABI, signer);

    // 1. Verify user token balance
    const balance = await tokenContract.balanceOf(userAddress);
    if (balance < amountWei) {
      return {
        success: false,
        error: `Insufficient $CRAZY8 tokens. You need ${buyInAmountTokens} CRAZY8 chips to join this table.`,
      };
    }

    // 2. Check if already deposited
    const alreadyDeposited = await escrowContract.hasDeposited(gameId, userAddress);
    if (alreadyDeposited) {
      return { success: true };
    }

    // 3. Check allowance and approve if needed
    const currentAllowance = await tokenContract.allowance(userAddress, CRAZY8_ESCROW_ADDRESS);
    if (currentAllowance < amountWei) {
      console.log('[Escrow] Approving $CRAZY8 tokens for escrow...');
      const approveTx = await tokenContract.approve(CRAZY8_ESCROW_ADDRESS, ethers.MaxUint256);
      await approveTx.wait(1);
      console.log('[Escrow] Approval confirmed');
    }

    // 4. Deposit buy-in
    console.log(`[Escrow] Depositing ${buyInAmountTokens} $CRAZY8 for room ${roomCode}...`);
    const depositTx = await escrowContract.depositBuyIn(gameId, amountWei);
    await depositTx.wait(1);
    console.log(`[Escrow] Buy-in confirmed: ${depositTx.hash}`);

    return {
      success: true,
      txHash: depositTx.hash,
    };
  } catch (err: any) {
    console.error('[Escrow] Deposit error:', err);
    return {
      success: false,
      error: err.reason || err.shortMessage || err.message || 'Failed to deposit buy-in tokens',
    };
  }
}

/**
 * Fetch game details from the escrow contract
 */
export async function fetchEscrowGameDetails(roomCode: string): Promise<{
  totalPot: string;
  buyInPerPlayer: string;
  playerCount: number;
  winner: string;
  isSettled: boolean;
  isCancelled: boolean;
  winnerPayout: string;
  feeAmount: string;
} | null> {
  try {
    const res = await fetch(`/api/escrow/game/${encodeURIComponent(roomCode.trim().toUpperCase())}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[Escrow] Failed to fetch game details:', err);
    return null;
  }
}
