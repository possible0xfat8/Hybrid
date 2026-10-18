import 'dotenv/config';
import { ethers } from 'ethers';
import { getProvider } from './escrowService';
import { serverDb } from '../../engine/uno/database';

let tokenContractReadOnly: ethers.Contract | null = null;
let tokenContractAdmin: ethers.Contract | null = null;

export function getTokenAddress(): string {
  return (
    process.env.CRAZY8_TOKEN_ADDRESS?.trim() ||
    '0x19B111602A60442CCbe947a58a5fd7CB0195324E'
  );
}

const TOKEN_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address recipient, uint256 amount) external returns (bool)',
  'function isEligibleForAirdrop(address account) external view returns (bool)',
  'function hasClaimedAirdrop(address account) external view returns (bool)',
  'function airdropTo(address recipient) external returns (bool)',
  'function claimAirdrop() external returns (uint256)',
  'function hasClaimed(address account) external view returns (bool)',
  'function AIRDROP_AMOUNT() external view returns (uint256)',
];

export function getTokenReadOnly(): ethers.Contract | null {
  const address = getTokenAddress();
  if (!address) return null;

  if (!tokenContractReadOnly) {
    tokenContractReadOnly = new ethers.Contract(address, TOKEN_ABI, getProvider());
  }
  return tokenContractReadOnly;
}

export function getTokenAdmin(): ethers.Contract | null {
  const address = getTokenAddress();
  const privateKey = (process.env.ADMIN_PRIVATE_KEY || process.env.BACKEND_PRIVATE_KEY)?.trim();
  if (!address || !privateKey) return null;

  if (!tokenContractAdmin) {
    const adminWallet = new ethers.Wallet(privateKey, getProvider());
    tokenContractAdmin = new ethers.Contract(address, TOKEN_ABI, adminWallet);
  }
  return tokenContractAdmin;
}

export async function fetchOnChainBalance(address: string): Promise<{
  balance: string;
  hasClaimed: boolean;
}> {
  try {
    if (!address || !ethers.isAddress(address)) {
      return { balance: '0', hasClaimed: false };
    }

    const token = getTokenReadOnly();
    if (!token) return { balance: '0', hasClaimed: false };

    const rawBal = await token.balanceOf(address);
    let claimed = false;
    try {
      claimed = await token.hasClaimedAirdrop(address);
    } catch {
      try {
        claimed = await token.hasClaimed(address);
      } catch {
        claimed = false;
      }
    }

    return {
      balance: ethers.formatEther(rawBal),
      hasClaimed: claimed,
    };
  } catch (err: any) {
    console.warn('[UNO:TOKEN] Error fetching balance:', err.message);
    return { balance: '0', hasClaimed: false };
  }
}

export async function dispenseAirdrop(rawAddress: string): Promise<{
  success: boolean;
  txHash?: string;
  balance?: string;
  amount?: number;
  error?: string;
}> {
  try {
    const cleanAddr = ethers.getAddress(rawAddress.trim());
    const adminContract = getTokenAdmin();
    if (!adminContract) {
      return { success: false, error: 'Admin signer not configured on server' };
    }

    // Pre-check eligibility on-chain if available
    try {
      const isEligible = await adminContract.isEligibleForAirdrop(cleanAddr);
      if (!isEligible) {
        return {
          success: false,
          error: 'This wallet has already claimed the 10,000 $CRAZY8 welcome airdrop.',
        };
      }
    } catch {
      // Contract might use hasClaimed
    }

    console.log(`[TokenService] Dispensing 10,000 $CRAZY8 to ${cleanAddr}...`);
    const tx = await adminContract.airdropTo(cleanAddr, {
      gasLimit: 120000,
      gasPrice: ethers.parseUnits('0.1', 'gwei'),
    });
    console.log(`[TokenService] Airdrop transaction broadcasted: ${tx.hash}`);

    const user = serverDb.getUserByAddress(cleanAddr);
    if (user) {
      user.tokenBalance = (user.tokenBalance || 0) + 10000;
      serverDb.save();
    }

    return {
      success: true,
      txHash: tx.hash,
      balance: '10000',
      amount: 10000,
    };
  } catch (err: any) {
    console.error('[TokenService] Airdrop execution error:', err);
    return {
      success: false,
      error: err.reason || err.shortMessage || err.message || 'Failed to execute airdrop',
    };
  }
}
