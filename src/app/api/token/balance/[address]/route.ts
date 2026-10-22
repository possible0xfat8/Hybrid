import { NextRequest, NextResponse } from 'next/server';
import { fetchOnChainBalance } from '@/lib/server/tokenService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const cleanAddr = address?.trim().toLowerCase();

    if (!cleanAddr) {
      return NextResponse.json({
        balance: '0',
        hasClaimed: false,
        eligible: false,
      });
    }

    const data = await fetchOnChainBalance(cleanAddr);

    return NextResponse.json({
      address: cleanAddr,
      balance: data.balance || '0',
      hasClaimed: data.hasClaimed,
      eligible: data.eligible,
    });
  } catch (err: any) {
    console.error('[API:Balance] Error:', err);
    return NextResponse.json({
      balance: '0',
      hasClaimed: false,
      eligible: true,
      error: err.message,
    });
  }
}
