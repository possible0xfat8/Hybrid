import { NextRequest, NextResponse } from 'next/server';
import { upsertCrazy8Profile, getCrazy8ProfileByAddress } from '@/lib/server/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  const profile = await getCrazy8ProfileByAddress(address);
  return NextResponse.json(profile);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, accountId, name, avatar, bio, address } = body;

    const targetId = id || accountId;
    if (!targetId && !address) {
      return NextResponse.json(
        { error: 'User id or wallet address is required' },
        { status: 400 }
      );
    }

    const updated = await upsertCrazy8Profile({
      id: targetId,
      address,
      name,
      avatar,
      bio,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('[API:Profile] Update error:', err);
    return NextResponse.json(
      { error: err.message || 'Error updating profile' },
      { status: 500 }
    );
  }
}
