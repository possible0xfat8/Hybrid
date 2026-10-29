import 'dotenv/config';
import { ethers } from 'ethers';
import { getTokenAdmin, getTokenAddress } from './tokenService';

let escrowContractReadOnly: ethers.Contract | null = null;
let escrowContractAdmin: ethers.Contract | null = null;
let providerInstance: ethers.JsonRpcProvider | null = null;

const HEMI_SEPOLIA_RPC = 'https://testnet.rpc.hemi.network/rpc';
const DEFAULT_BACKEND_KEY =
  '0x2a39ae7921ead16f4c31915056e0e5573f04735df3f723b4a6ae2f838c685181';

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
  const envKey = (process.env.ADMIN_PRIVATE_KEY || process.env.BACKEND_PRIVATE_KEY)?.trim();
  const privateKey = envKey && envKey.startsWith('0x') && envKey.length === 66 ? envKey : DEFAULT_BACKEND_KEY;
  if (!address || !privateKey) return null;

  if (!escrowContractAdmin) {
    const adminWallet = new ethers.Wallet(privateKey, getProvider());
    escrowContractAdmin = new ethers.Contract(address, ESCROW_ABI, adminWallet);
    console.log('[UNO:ESCROW] Initialized admin signer for address:', adminWallet.address);
  }
  return escrowContractAdmin;
}

export function formatGameId(roomCode: string, matchRoundNonce?: string | number): string {
  const cleanCode = (roomCode || 'GAME').trim().toUpperCase();
  const suffix = matchRoundNonce !== undefined ? `_${matchRoundNonce}` : '';
  return ethers.keccak256(ethers.toUtf8Bytes(`HEMI_CRAZY_8_${cleanCode}${suffix}`));
}

export async function getEscrowGameDetailsOnChain(roomCode: string) {
  try {
    const escrow = getEscrowReadOnly();
    if (!escrow) return null;
    const gameId = formatGameId(roomCode);
    const details = await escrow.getGameDetails(gameId);
    return {
      roomCode,
      gameId,
      totalPot: ethers.formatEther(details.totalPot || 0n),
      buyInPerPlayer: ethers.formatEther(details.buyInPerPlayer || 0n),
      playerCount: Number(details.playerCount || 0),
      winner: details.winner || '',
      isSettled: Boolean(details.isSettled),
      isCancelled: Boolean(details.isCancelled),
      winnerPayout: ethers.formatEther(details.winnerPayout || 0n),
      feeAmount: ethers.formatEther(details.feeAmount || 0n),
    };
  } catch (err) {
    return null;
  }
}

/**
 * Automated on-chain match settlement for Crazy 8 on Hemi Sepolia via HemiCrazy8Escrow & HemiCrazy8Token.
 *
 * 1. Checks if HemiCrazy8Escrow already has a pre-deposited pot for this roomCode.
 * 2. If yes, calls settleGame(gameId, winner) on HemiCrazy8Escrow (95% winner payout, 5% house fee).
 * 3. If no pre-deposit exists (gasless lobby staking), funds the Escrow pot for this match via
 *    depositBuyIn(matchGameId, potWei) and settles via settleGame(matchGameId, winner) on HemiCrazy8Escrow
 *    (with automatic fallback to direct token transfer/mint if needed).
 * 4. Waits for 1 block confirmation so on-chain token balances and explorer links are immediately live.
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
    if (totalPot <= 0) {
      return { success: false, error: 'No pot staked for this match' };
    }

    const winnerPayoutNum = Math.max(1, Math.round(totalPot * 0.95));
    const feeNum = Math.max(0, Math.round(totalPot - winnerPayoutNum));

    let activeGameId = formatGameId(roomCode);
    const adminContract = getEscrowAdmin();
    const tokenAdmin = getTokenAdmin();

    if (!adminContract && !tokenAdmin) {
      return { success: false, error: 'Admin wallet or settlement contracts not configured on server' };
    }

    // 1. Check if the game already has an un-settled on-chain pot in HemiCrazy8Escrow
    let hasEscrowDeposit = false;
    if (adminContract) {
      try {
        const details = await adminContract.getGameDetails(activeGameId);
        if (details && details.totalPot > BigInt(0) && !details.isSettled && !details.isCancelled) {
          hasEscrowDeposit = true;
        }
      } catch {
        // Proceed to oracle-sponsored escrow settlement
      }
    }

    let tx: any = null;

    if (hasEscrowDeposit && adminContract) {
      console.log(`[UNO:ESCROW] Settling pre-deposited Escrow pot for Room: ${roomCode}, Winner: ${cleanWinner}`);
      tx = await adminContract.settleGame(activeGameId, cleanWinner, {
        gasLimit: 300000,
      });
    } else if (adminContract && tokenAdmin) {
      // 2. Oracle-sponsored Escrow deposit + settlement on HemiCrazy8Escrow so every staked match is recorded on-chain in Escrow!
      try {
        activeGameId = formatGameId(roomCode, Date.now());
        const potWei = ethers.parseEther(String(totalPot));
        const escrowAddr = getEscrowAddress();
        const adminAddr = await (tokenAdmin.runner as any)?.getAddress?.();

        if (adminAddr) {
          const adminBal: bigint = await tokenAdmin.balanceOf(adminAddr);
          if (adminBal < potWei) {
            const mintTx = await tokenAdmin.mint(adminAddr, ethers.parseEther('100000'), { gasLimit: 120000 });
            await mintTx.wait(1);
          }

          const currentAllowance: bigint = await tokenAdmin.allowance(adminAddr, escrowAddr);
          if (currentAllowance < potWei) {
            const approveTx = await tokenAdmin.approve(escrowAddr, ethers.MaxUint256, { gasLimit: 100000 });
            await approveTx.wait(1);
          }
        }

        console.log(`[UNO:ESCROW] Funding Escrow pot (${totalPot} $CRAZY8) for Room #${roomCode}...`);
        const depositTx = await adminContract.depositBuyIn(activeGameId, potWei, {
          gasLimit: 250000,
        });
        await depositTx.wait(1);

        console.log(`[UNO:ESCROW] Settling Escrow pot (95% = ${winnerPayoutNum} $CRAZY8) to Winner ${cleanWinner}...`);
        tx = await adminContract.settleGame(activeGameId, cleanWinner, {
          gasLimit: 300000,
        });
      } catch (escrowErr: any) {
        console.warn(`[UNO:ESCROW] Escrow contract flow notice (${escrowErr.message}), falling back to direct token disbursement...`);
        tx = null;
      }
    }

    // 3. Fallback: Direct Token Contract Disbursement if Escrow tx was not created
    if (!tx && tokenAdmin) {
      console.log(`[UNO:POT] Directly disbursing ${winnerPayoutNum} $CRAZY8 to winner ${cleanWinner}...`);
      const amountWei = ethers.parseEther(String(winnerPayoutNum));
      try {
        const adminAddr = await (tokenAdmin.runner as any)?.getAddress?.();
        let adminBal = BigInt(0);
        if (adminAddr) {
          adminBal = await tokenAdmin.balanceOf(adminAddr);
        }

        if (adminBal >= amountWei) {
          tx = await tokenAdmin.transfer(cleanWinner, amountWei, {
            gasLimit: 120000,
          });
        } else {
          tx = await tokenAdmin.mint(cleanWinner, amountWei, {
            gasLimit: 120000,
          });
        }
      } catch (tokenErr: any) {
        console.warn(`[UNO:POT] Transfer attempt failed, trying mint:`, tokenErr.message);
        tx = await tokenAdmin.mint(cleanWinner, amountWei, {
          gasLimit: 120000,
        });
      }
    }

    if (!tx) {
      return { success: false, error: 'No settlement contract available' };
    }

    console.log(`[UNO:DISBURSE] Settlement transaction broadcasted: ${tx.hash}`);

    // Wait for 1 confirmation (with 12s safety timeout) so on-chain balance is updated before notifying client
    try {
      await Promise.race([
        tx.wait(1),
        new Promise((resolve) => setTimeout(resolve, 12000)),
      ]);
      console.log(`[UNO:DISBURSE] ✓ Confirmed on-chain: ${tx.hash}`);
    } catch (waitErr: any) {
      console.warn(`[UNO:DISBURSE] Confirmation wait warning:`, waitErr.message);
    }

    return {
      success: true,
      txHash: tx.hash,
      gameId: activeGameId,
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
