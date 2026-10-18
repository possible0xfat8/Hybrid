'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

export interface Connect4Stats {
  address: string;
  elo: number;
  wins: number;
  losses: number;
  totalGames: number;
  currentStreak: number;
  bestStreak: number;
}

export function useConnect4Stats(targetAddress?: string) {
  const { address: connectedAddress } = useAccount();
  const address = targetAddress || connectedAddress;

  const [stats, setStats] = useState<Connect4Stats>({
    address: address || '',
    elo: 1200,
    wins: 0,
    losses: 0,
    totalGames: 0,
    currentStreak: 0,
    bestStreak: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/connect4/stats/${address}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      }
    } catch (e) {
      console.warn('Could not fetch Connect 4 stats:', e);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
