import { NextRequest, NextResponse } from 'next/server';
import { getCrazy8ProfileByAddress } from '@/lib/server/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const cleanAddr = address?.trim().toLowerCase();

    if (!cleanAddr || !cleanAddr.startsWith('0x')) {
      return NextResponse.json(
        { error: 'Valid wallet address required' },
        { status: 400 }
      );
    }

    const profile = await getCrazy8ProfileByAddress(cleanAddr);
    return NextResponse.json(profile);
  } catch (err: any) {
    console.error('[API:ProfileByAddress] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Error fetching profile' },
      { status: 500 }
    );
  }
}
