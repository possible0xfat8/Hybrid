import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    openTables: 0,
    playersOnline: 8,
    gamesPlayed: 1420,
  });
}
