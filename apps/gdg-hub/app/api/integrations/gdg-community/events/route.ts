import { timingSafeEqual } from "node:crypto";
import { syncGdgCommunityChapter } from "@/lib/gdg-community-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasValidBearerToken(request: Request, expected: string) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const actual = Buffer.from(authorization.slice(7));
  const expectedBuffer = Buffer.from(expected);
  return (
    actual.length === expectedBuffer.length &&
    timingSafeEqual(actual, expectedBuffer)
  );
}

async function run(request: Request) {
  const secret = process.env.GDG_EVENT_SYNC_SECRET?.trim();
  if (!secret || secret.length < 32) {
    return Response.json(
      { error: "Scheduled event synchronization is not configured." },
      { status: 503 },
    );
  }
  if (!hasValidBearerToken(request, secret)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const summary = await syncGdgCommunityChapter();
    return Response.json(summary, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Scheduled GDG Community sync failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json(
      { error: "GDG Community synchronization failed." },
      { status: 502 },
    );
  }
}

export const GET = run;
export const POST = run;
