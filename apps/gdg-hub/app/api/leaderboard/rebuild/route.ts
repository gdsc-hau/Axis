import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Leaderboard rebuild is not implemented.' }, { status: 501 });
}

export async function POST() {
  return NextResponse.json({ error: 'Leaderboard rebuild is not implemented.' }, { status: 501 });
}
