import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    address: process.env.CRAZY8_ESCROW_ADDRESS || process.env.NEXT_PUBLIC_CRAZY8_ESCROW_ADDRESS || '0xbD42f75Fee8aD5Dd260DAbbC0520b5A0Efa1F060',
    network: 'Hemi Sepolia (743111)',
    feePercent: '0%',
  });
}
