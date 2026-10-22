import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  return NextResponse.json({
    roomCode,
    totalPot: '0',
    buyInPerPlayer: '0',
    playerCount: 0,
    winner: '',
    isSettled: false,
    isCancelled: false,
    winnerPayout: '0',
    feeAmount: '0',
  });
}
