import { NextResponse } from 'next/server';
import { getArcadeStats } from '@/lib/server/supabase';

export async function GET() {
  try {
    const stats = await getArcadeStats();
    return NextResponse.json(stats);
  } catch (err: any) {
    console.error('[API:ArcadeStats] Error:', err);
    return NextResponse.json({
      activeGames: 0,
      totalPlayers: 0,
      totalTransactions: 0,
      chessGames: 0,
      unoGames: 0,
      connect4Games: 0,
    });
  }
}
