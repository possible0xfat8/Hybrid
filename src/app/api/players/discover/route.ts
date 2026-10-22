import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/server/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  const client = getSupabase();
  if (!client) return NextResponse.json({ players: [] });

  try {
    let query = client
      .from('crazy8_profiles')
      .select('id, address, tag, name, avatar, bio, wins, matches_played')
      .limit(20);

    if (userId) {
      query = query.neq('id', userId);
    }

    const { data } = await query;
    return NextResponse.json({ players: data || [] });
  } catch (err) {
    console.warn('[API:Discover] Error:', err);
    return NextResponse.json({ players: [] });
  }
}
