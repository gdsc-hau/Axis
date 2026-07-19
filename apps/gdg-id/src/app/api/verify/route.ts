import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { PublicMemberProfileSchema } from "@hau/contracts";
import { verifyVerificationToken } from "@/lib/verification-token";
import { limitSearch } from "@/lib/ratelimit";

const VerifyRequestSchema = z.object({ token: z.string().min(1).max(4096) });

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      (process.env.NODE_ENV === "development" ? "local-development" : null);
    if (!ip)
      return NextResponse.json(
        { error: "Unable to determine client IP." },
        { status: 400 },
      );
    const rateLimit = await limitSearch(`verify:${ip}`);
    if (!rateLimit.success)
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429 },
      );

    const parsed = VerifyRequestSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid verification token." },
        { status: 400 },
      );

    const secret = process.env.QR_SIGNING_SECRET;
    if (!secret) throw new Error("QR_SIGNING_SECRET is not configured.");
    const claims = verifyVerificationToken(parsed.data.token, secret);
    if (!claims)
      return NextResponse.json(
        { error: "Invalid or expired verification token." },
        { status: 401 },
      );

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
      throw new Error("Supabase server configuration is incomplete.");
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: member, error } = await supabase
      .from("members")
      .select("gdg_id, full_name, program, email, is_accepted")
      .eq("email", claims.email)
      .single();
    if (error || !member?.is_accepted)
      return NextResponse.json(
        { error: "Member is not active." },
        { status: 404 },
      );

    return NextResponse.json(
      PublicMemberProfileSchema.parse({
        gdgId: member.gdg_id,
        fullName: member.full_name,
        program: member.program,
        email: member.email,
      }),
    );
  } catch (error) {
    console.error("Verification API Error:", error);
    return NextResponse.json(
      { error: "Verification is temporarily unavailable." },
      { status: 500 },
    );
  }
}
