import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    openTables: 4,
    playersOnline: 12,
    gamesPlayed: 1420,
  });
}
