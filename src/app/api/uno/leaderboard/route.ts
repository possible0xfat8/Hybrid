import { NextRequest, NextResponse } from 'next/server';
import { getCrazy8Leaderboard } from '@/lib/server/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get('sort') || 'wins';
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const leaderboard = await getCrazy8Leaderboard(sort, limit);
    return NextResponse.json(leaderboard);
  } catch (err: any) {
    console.error('[API:UnoLeaderboard] Error:', err);
    return NextResponse.json([], { status: 200 });
  }
}
