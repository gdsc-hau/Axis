import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Leaderboard rebuilds are obsolete. Rankings are derived from the live append-only ledger.",
    },
    { status: 410 },
  );
}
