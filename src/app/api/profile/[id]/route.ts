import { NextRequest, NextResponse } from 'next/server';
import { getCrazy8ProfileByAddress } from '@/lib/server/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cleanId = id?.trim();

  if (!cleanId) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // If id is address or wallet_...
  const address = cleanId.startsWith('wallet_') ? cleanId.replace('wallet_', '') : cleanId;
  const profile = await getCrazy8ProfileByAddress(address);
  return NextResponse.json(profile);
}
