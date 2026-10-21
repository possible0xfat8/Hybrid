import { ethers } from 'ethers';

export const CRAZY8_TOKEN_ADDRESS =
  (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_CRAZY8_TOKEN_ADDRESS || process.env.VITE_CRAZY8_TOKEN_ADDRESS)) || '0x19B111602A60442CCbe947a58a5fd7CB0195324E';

export const CRAZY8_TOKEN_SYMBOL = 'CRAZY8';
export const CRAZY8_TOKEN_NAME = 'Hemi Crazy 8';
export const CRAZY8_AIRDROP_AMOUNT = 10000;

export interface TokenStatus {
  address: string;
  balance: string;
  eligible: boolean;
  hasClaimed: boolean;
  symbol: string;
  loading: boolean;
  error?: string | null;
}

export async function fetchTokenBalance(address: string): Promise<{
  balance: string;
  eligible: boolean;
  hasClaimed: boolean;
}> {
  if (!address) return { balance: '0', eligible: false, hasClaimed: false };
  try {
    const res = await fetch(`/api/token/balance/${encodeURIComponent(address.trim())}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    const hasClaimed = Boolean(data.hasClaimed);
    const eligible = data.eligible !== undefined ? Boolean(data.eligible) : !hasClaimed;
    return {
      balance: data.balance || '0',
      eligible,
      hasClaimed,
    };
  } catch (err) {
    console.warn('[Token] Error fetching balance:', err);
    return { balance: '0', eligible: true, hasClaimed: false };
  }
}

export async function claimWelcomeAirdrop(address: string): Promise<{
  success: boolean;
  txHash?: string;
  balance?: string;
  amount?: number;
  error?: string;
}> {
  if (!address) return { success: false, error: 'No wallet connected' };
  try {
    const res = await fetch('/api/token/airdrop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: address.trim() }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to claim airdrop');
    }

    return {
      success: true,
      txHash: data.txHash,
      balance: data.balance,
      amount: data.amount || CRAZY8_AIRDROP_AMOUNT,
    };
  } catch (err: any) {
    console.error('[Token] Error claiming airdrop:', err);
    return {
      success: false,
      error: err.message || 'Error claiming airdrop',
    };
  }
}

export function formatTokenAmount(amount: string | number, decimals: number = 0): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
