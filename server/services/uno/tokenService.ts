import 'dotenv/config';
import { ethers } from 'ethers';
import { getProvider } from './escrowService';
import { serverDb } from '../../engine/uno/database';

let tokenContractReadOnly: ethers.Contract | null = null;
let tokenContractAdmin: ethers.Contract | null = null;

const DEFAULT_BACKEND_KEY =
  '0x2a39ae7921ead16f4c31915056e0e5573f04735df3f723b4a6ae2f838c685181';

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
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transfer(address recipient, uint256 amount) external returns (bool)',
  'function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)',
  'function mint(address to, uint256 amount) external',
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
  const envKey = (process.env.ADMIN_PRIVATE_KEY || process.env.BACKEND_PRIVATE_KEY)?.trim();
  const privateKey = envKey && envKey.startsWith('0x') && envKey.length === 66 ? envKey : DEFAULT_BACKEND_KEY;
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

    const formatted = ethers.formatEther(rawBal);
    if (parseFloat(formatted) > 0) {
      claimed = true;
    }

    return {
      balance: formatted,
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
      gasLimit: 150000,
    });
    console.log(`[TokenService] Airdrop transaction broadcasted: ${tx.hash}`);

    try {
      await Promise.race([
        tx.wait(1),
        new Promise((resolve) => setTimeout(resolve, 10000)),
      ]);
    } catch {}

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
