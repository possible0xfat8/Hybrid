import 'dotenv/config';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { getTokenAdmin, getTokenAddress } from './tokenService';

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
  'function games(bytes32 gameId) external view returns (bytes32 gameId, uint256 totalPot, uint256 buyInPerPlayer, address[] players, address winner, bool isSettled, bool isCancelled, uint256 createdAt, uint256 settledAt)',
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

/**
 * Fast, automated on-chain match settlement for Crazy 8 on Hemi Sepolia.
 * 
 * Compares against the Chess architecture:
 * 1. Checks if escrow contract has pre-deposited pot on-chain.
 * 2. If yes, settles via Escrow.
 * 3. If no, directly disburses 95% pot reward in $CRAZY8 tokens to winner from Oracle.
 * 4. Broadcasts tx immediately without blocking for block confirmation (non-blocking).
 */
export async function settleMatchOnChain(
  roomCode: string,
  winnerAddress: string,
  potAmount?: number | string
): Promise<{
  success: boolean;
  txHash?: string;
  gameId?: string;
  winner?: string;
  winnerPayout?: string;
  boardFee?: string;
  error?: string;
}> {
  try {
    if (!winnerAddress || !ethers.isAddress(winnerAddress)) {
      return { success: false, error: 'Invalid or missing winner EVM address' };
    }

    const cleanWinner = ethers.getAddress(winnerAddress.trim());
    const totalPot = typeof potAmount === 'number' ? potAmount : (parseFloat(String(potAmount || '0')) || 0);
    const winnerPayoutNum = Math.max(1, Math.round(totalPot > 0 ? totalPot * 0.95 : 100));
    const feeNum = Math.round(totalPot > 0 ? totalPot * 0.05 : 5);

    const gameId = formatGameId(roomCode);
    const adminContract = getEscrowAdmin();
    const tokenAdmin = getTokenAdmin();

    if (!adminContract && !tokenAdmin) {
      return { success: false, error: 'Admin wallet or settlement contracts not configured on server' };
    }

    // 1. Check if the game has an on-chain pot in the Escrow contract
    let hasEscrowDeposit = false;
    if (adminContract) {
      try {
        const game = await adminContract.games(gameId);
        if (game && game.totalPot > BigInt(0) && !game.isSettled && !game.isCancelled) {
          hasEscrowDeposit = true;
        }
      } catch {
        // Fall back to direct token disbursement
      }
    }

    let tx: any = null;

    if (hasEscrowDeposit && adminContract) {
      console.log(`[UNO:ESCROW] Settling via Escrow for Room: ${roomCode}, Winner: ${cleanWinner}`);
      tx = await adminContract.settleGame(gameId, cleanWinner, {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('0.1', 'gwei'),
      });
    } else if (tokenAdmin) {
      // 2. Automated Direct Pot Disbursement via Token Contract (matching Chess architecture)
      console.log(`[UNO:POT] Automatically disbursing ${winnerPayoutNum} $CRAZY8 to winner ${cleanWinner}...`);
      const amountWei = ethers.parseEther(String(winnerPayoutNum));

      try {
        const adminAddr = await tokenAdmin.runner?.getAddress?.();
        let adminBal = BigInt(0);
        if (adminAddr) {
          adminBal = await tokenAdmin.balanceOf(adminAddr);
        }

        if (adminBal >= amountWei) {
          tx = await tokenAdmin.transfer(cleanWinner, amountWei, {
            gasLimit: 100000,
            gasPrice: ethers.parseUnits('0.1', 'gwei'),
          });
        } else {
          // If admin token balance is insufficient, mint directly to the winner
          tx = await tokenAdmin.mint(cleanWinner, amountWei, {
            gasLimit: 100000,
            gasPrice: ethers.parseUnits('0.1', 'gwei'),
          });
        }
      } catch (tokenErr: any) {
        console.warn(`[UNO:POT] Transfer attempt failed, trying mint:`, tokenErr.message);
        tx = await tokenAdmin.mint(cleanWinner, amountWei, {
          gasLimit: 100000,
          gasPrice: ethers.parseUnits('0.1', 'gwei'),
        });
      }
    } else {
      return { success: false, error: 'No settlement contract available' };
    }

    console.log(`[UNO:DISBURSE] On-chain transaction broadcasted ASAP: ${tx.hash}`);

    // Asynchronous background wait - DO NOT block the client or socket response!
    tx.wait(1)
      .then((receipt: any) => {
        console.log(`[UNO:DISBURSE] ✓ Confirmed on-chain in block ${receipt?.blockNumber || 'confirmed'}`);
      })
      .catch((err: any) => {
        console.warn(`[UNO:DISBURSE] Background confirmation note:`, err.message);
      });

    return {
      success: true,
      txHash: tx.hash,
      gameId,
      winner: cleanWinner,
      winnerPayout: String(winnerPayoutNum),
      boardFee: String(feeNum),
    };
  } catch (err: any) {
    console.error(`[UNO:ESCROW] Settlement error for room ${roomCode}:`, err);
    return {
      success: false,
      error: err.reason || err.shortMessage || err.message || 'Error executing settlement',
    };
  }
}
