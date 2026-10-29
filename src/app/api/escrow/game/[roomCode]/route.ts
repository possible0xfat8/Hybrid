import { NextRequest, NextResponse } from 'next/server';
import { getEscrowGameDetailsOnChain } from '../../../../../../server/services/uno/escrowService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  const { roomCode } = await params;
  const onChain = await getEscrowGameDetailsOnChain(roomCode);
  if (onChain) {
    return NextResponse.json(onChain);
  }
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
