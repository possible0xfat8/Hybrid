import { NextResponse } from 'next/server';
import { getTokenAddress } from '@/lib/server/tokenService';

export async function GET() {
  return NextResponse.json({
    address: getTokenAddress(),
    symbol: 'CRAZY8',
    name: 'Hemi Crazy 8',
    airdropAmount: 10000,
    network: 'Hemi Sepolia (743111)',
  });
}
