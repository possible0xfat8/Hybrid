import { ethers } from 'ethers';
import { getSupabase } from './supabase';
import { serverDb } from '../../../server/engine/uno/database';

const HEMI_SEPOLIA_RPC = 'https://testnet.rpc.hemi.network/rpc';
const DEFAULT_BACKEND_KEY =
  '0x2a39ae7921ead16f4c31915056e0e5573f04735df3f723b4a6ae2f838c685181';

export function getTokenAddress(): string {
  return (
    process.env.CRAZY8_TOKEN_ADDRESS?.trim() ||
    process.env.NEXT_PUBLIC_CRAZY8_TOKEN_ADDRESS?.trim() ||
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
  'function isEligibleForAirdrop(address account) external view returns (bool)',
  'function hasClaimedAirdrop(address account) external view returns (bool)',
  'function airdropTo(address recipient) external returns (bool)',
  'function claimAirdrop() external returns (uint256)',
  'function hasClaimed(address account) external view returns (bool)',
  'function AIRDROP_AMOUNT() external view returns (uint256)',
];

let providerInstance: ethers.JsonRpcProvider | null = null;

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

export function getTokenReadOnly(): ethers.Contract | null {
  const address = getTokenAddress();
  if (!address) return null;
  return new ethers.Contract(address, TOKEN_ABI, getProvider());
}

export function getTokenAdmin(): ethers.Contract | null {
  const address = getTokenAddress();
  const envKey = (process.env.ADMIN_PRIVATE_KEY || process.env.BACKEND_PRIVATE_KEY)?.trim();
  const privateKey = envKey && envKey.startsWith('0x') && envKey.length === 66 ? envKey : DEFAULT_BACKEND_KEY;
  if (!address || !privateKey) return null;

  try {
    const adminWallet = new ethers.Wallet(privateKey, getProvider());
    return new ethers.Contract(address, TOKEN_ABI, adminWallet);
  } catch (err) {
    console.warn('[TokenService] Failed to initialize admin signer:', err);
    return null;
  }
}

export async function fetchOnChainBalance(rawAddress: string): Promise<{
  balance: string;
  hasClaimed: boolean;
  eligible: boolean;
}> {
  try {
    if (!rawAddress || !ethers.isAddress(rawAddress)) {
      return { balance: '0', hasClaimed: false, eligible: true };
    }

    const cleanAddr = ethers.getAddress(rawAddress.trim());
    const cleanLower = cleanAddr.toLowerCase();
    const serverUser = serverDb.getUserByAddress(cleanLower) || serverDb.getUser(`wallet_${cleanLower}`);

    const token = getTokenReadOnly();
    let onChainEther = '0';
    let claimed = false;

    if (token) {
      const rawBal = await token.balanceOf(cleanAddr);
      onChainEther = ethers.formatEther(rawBal);
      try {
        claimed = await token.hasClaimedAirdrop(cleanAddr);
      } catch {
        try {
          claimed = await token.hasClaimed(cleanAddr);
        } catch {
          claimed = false;
        }
      }
      if (parseFloat(onChainEther) > 0) {
        claimed = true;
      }
    }

    if (
      serverUser?.hasClaimedAirdrop ||
      serverUser?.notifications?.some((n) => n.type === 'airdrop_claimed')
    ) {
      claimed = true;
    }

    // Authoritative balance resolution:
    // If the user has an active serverDb profile (which tracks live room stakes, won pots, and lost stakes),
    // use serverUser.tokenBalance so won/lost match deltas are immediately reflected!
    let resolvedBalance = onChainEther;
    if (serverUser && typeof serverUser.tokenBalance === 'number') {
      const hasPlayedOrStaked =
        (serverUser.stats?.matchesPlayed || 0) > 0 ||
        serverUser.tokenBalance !== 10000 ||
        claimed;
      if (hasPlayedOrStaked) {
        resolvedBalance = serverUser.tokenBalance.toString();
      }
    }

    return {
      balance: resolvedBalance,
      hasClaimed: claimed,
      eligible: !claimed,
    };
  } catch (err: any) {
    console.warn('[TokenService] Error fetching balance:', err.message);
    const cleanLower = rawAddress?.trim().toLowerCase() || '';
    const serverUser = serverDb.getUserByAddress(cleanLower) || serverDb.getUser(`wallet_${cleanLower}`);
    if (serverUser && typeof serverUser.tokenBalance === 'number') {
      const hasClaimed = Boolean(serverUser.hasClaimedAirdrop);
      return {
        balance: serverUser.tokenBalance.toString(),
        hasClaimed,
        eligible: !hasClaimed,
      };
    }
    return { balance: '0', hasClaimed: false, eligible: true };
  }
}

export async function dispenseAirdrop(rawAddress: string): Promise<{
  success: boolean;
  txHash?: string;
  balance?: string;
  amount?: number;
  hasClaimed?: boolean;
  error?: string;
  message?: string;
}> {
  try {
    if (!rawAddress || !ethers.isAddress(rawAddress)) {
      return { success: false, error: 'Invalid Ethereum wallet address' };
    }

    const cleanAddr = ethers.getAddress(rawAddress.trim());
    const cleanLower = cleanAddr.toLowerCase();
    const serverUser = serverDb.getUserByAddress(cleanLower) || serverDb.getUser(`wallet_${cleanLower}`);
    const onChainCheck = await fetchOnChainBalance(cleanAddr);

    if (onChainCheck.hasClaimed) {
      return {
        success: false,
        error: 'This wallet has already claimed the 10,000 $CRAZY8 welcome airdrop.',
        hasClaimed: true,
        balance: onChainCheck.balance,
      };
    }

    const adminContract = getTokenAdmin();
    if (adminContract) {
      try {
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

        const newBal =
          serverUser && (serverUser.stats?.matchesPlayed || 0) > 0
            ? (serverUser.tokenBalance || 0) + 10000
            : 10000;

        serverDb.upsertUser({
          id: `wallet_${cleanLower}`,
          address: cleanLower,
          tokenBalance: newBal,
          hasClaimedAirdrop: true,
        });

        // Update Supabase profile if configured
        const client = getSupabase();
        if (client) {
          await client.from('crazy8_profiles').upsert(
            {
              id: `wallet_${cleanLower}`,
              address: cleanLower,
              updated_at: Date.now(),
            },
            { onConflict: 'id' }
          );
        }

        return {
          success: true,
          txHash: tx.hash,
          balance: newBal.toString(),
          amount: 10000,
          hasClaimed: true,
          message: '10,000 $CRAZY8 tokens successfully sent on Hemi Sepolia!',
        };
      } catch (txErr: any) {
        console.warn('[TokenService] On-chain airdrop call failed, falling back:', txErr.message);
        if (
          txErr.message?.includes('already claimed') ||
          txErr.reason?.includes('already claimed')
        ) {
          return {
            success: false,
            error: 'This wallet has already claimed the 10,000 $CRAZY8 welcome airdrop.',
            hasClaimed: true,
          };
        }
      }
    }

    const newBal =
      serverUser && (serverUser.stats?.matchesPlayed || 0) > 0
        ? (serverUser.tokenBalance || 0) + 10000
        : 10000;

    serverDb.upsertUser({
      id: `wallet_${cleanLower}`,
      address: cleanLower,
      tokenBalance: newBal,
      hasClaimedAirdrop: true,
    });

    return {
      success: true,
      balance: newBal.toString(),
      amount: 10000,
      hasClaimed: true,
      message: '10,000 $CRAZY8 credited to your account!',
    };
  } catch (err: any) {
    console.error('[TokenService] Airdrop execution exception:', err);
    return {
      success: false,
      error: err.message || 'Failed to claim airdrop',
    };
  }
}
