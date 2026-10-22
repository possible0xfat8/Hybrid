import { NextRequest, NextResponse } from 'next/server';
import { dispenseAirdrop } from '@/lib/server/tokenService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { address } = body;

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const result = await dispenseAirdrop(address);

    if (!result.success) {
      return NextResponse.json(
        result,
        { status: result.hasClaimed ? 400 : 500 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[API:Airdrop] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error claiming airdrop' },
      { status: 500 }
    );
  }
}
