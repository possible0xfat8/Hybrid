import { NextRequest, NextResponse } from 'next/server';
import { getArcadeGlobalLeaderboard } from '@/lib/server/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const leaderboard = await getArcadeGlobalLeaderboard(limit);
    return NextResponse.json(leaderboard);
  } catch (err: any) {
    console.error('[API:ArcadeLeaderboard] Error:', err);
    return NextResponse.json([]);
  }
}
