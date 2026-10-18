import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

let escrowContractReadOnly: ethers.Contract | null = null;
let escrowContractAdmin: ethers.Contract | null = null;
let providerInstance: ethers.JsonRpcProvider | null = null;

const HEMI_SEPOLIA_RPC = 'https://testnet.rpc.hemi.network/rpc';

export function getEscrowAddress(): string {
  return (
    process.env.CRAZY8_ESCROW_ADDRESS?.trim() ||
    '0xbD42f75Fee8aD5Dd260DAbbC0520b5A0Efa1F060'
  );
}

export function getProvider(): ethers.JsonRpcProvider {
  if (!providerInstance) {
    const network = ethers.Network.from({
      chainId: 743111,
      name: 'hemi-sepolia',
    });
    providerInstance = new ethers.JsonRpcProvider(HEMI_SEPOLIA_RPC, network, {
      staticNetwork: network,
    });
  }
  return providerInstance;
}

const ESCROW_ABI = [
  'function depositBuyIn(bytes32 gameId, uint256 amount) external',
  'function settleGame(bytes32 gameId, address winner) external',
  'function cancelGameAndRefund(bytes32 gameId) external',
  'function getGameDetails(bytes32 gameId) external view returns (uint256 totalPot, uint256 buyInPerPlayer, uint256 playerCount, address winner, bool isSettled, bool isCancelled, uint256 winnerPayout, uint256 feeAmount)',
  'function hasDeposited(bytes32 gameId, address player) external view returns (bool)',
  'function totalGamesSettled() external view returns (uint256)',
  'function totalVolumeDistributed() external view returns (uint256)',
  'function totalFeesCollected() external view returns (uint256)',
];

export function getEscrowReadOnly(): ethers.Contract | null {
  const address = getEscrowAddress();
  if (!address) return null;

  if (!escrowContractReadOnly) {
    escrowContractReadOnly = new ethers.Contract(address, ESCROW_ABI, getProvider());
  }
  return escrowContractReadOnly;
}

export function getEscrowAdmin(): ethers.Contract | null {
  const address = getEscrowAddress();
  const privateKey = (process.env.ADMIN_PRIVATE_KEY || process.env.BACKEND_PRIVATE_KEY)?.trim();
  if (!address || !privateKey) return null;

  if (!escrowContractAdmin) {
    const adminWallet = new ethers.Wallet(privateKey, getProvider());
    escrowContractAdmin = new ethers.Contract(address, ESCROW_ABI, adminWallet);
    console.log('[UNO:ESCROW] Initialized admin signer for address:', adminWallet.address);
  }
  return escrowContractAdmin;
}

export function formatGameId(roomCode: string): string {
  const cleanCode = (roomCode || 'GAME').trim().toUpperCase();
  return ethers.keccak256(ethers.toUtf8Bytes(`HEMI_CRAZY_8_${cleanCode}`));
}

export async function settleMatchOnChain(
  roomCode: string,
  winnerAddress: string
): Promise<{
  success: boolean;
  txHash?: string;
  gameId?: string;
  winner?: string;
  winnerPayout?: string;
  error?: string;
}> {
  try {
    if (!winnerAddress || !ethers.isAddress(winnerAddress)) {
      return { success: false, error: 'Invalid or missing winner EVM address' };
    }

    const adminContract = getEscrowAdmin();
    if (!adminContract) {
      return { success: false, error: 'Admin wallet or Escrow contract not configured on server' };
    }

    const gameId = formatGameId(roomCode);
    console.log(`[UNO:ESCROW] Triggering settleGame on-chain for Room: ${roomCode}, Winner: ${winnerAddress}`);

    const tx = await adminContract.settleGame(gameId, winnerAddress);
    console.log(`[UNO:ESCROW] Transaction submitted: ${tx.hash}`);

    const receipt = await tx.wait(1);
    console.log(`[UNO:ESCROW] ✓ Game settled in block ${receipt.blockNumber}`);

    return {
      success: true,
      txHash: tx.hash,
      gameId,
      winner: winnerAddress,
    };
  } catch (err: any) {
    console.error(`[UNO:ESCROW] Settlement error for room ${roomCode}:`, err);
    return {
      success: false,
      error: err.reason || err.message || 'Error executing settlement',
    };
  }
}
