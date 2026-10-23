import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    platform: 'Hybrid Next.js Serverless API',
    time: Date.now(),
  });
}
