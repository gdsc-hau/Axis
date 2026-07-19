import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SearchRequestSchema, MemberSearchResultSchema } from "@hau/contracts";
import { limitSearch } from "@/lib/ratelimit";
import { createVerificationToken } from "@/lib/verification-token";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SearchRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid search request parameters." },
        { status: 400 },
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      (process.env.NODE_ENV === "development" ? "local-development" : null);

    if (!ip) {
      return NextResponse.json(
        { error: "Unable to determine client IP." },
        { status: 400 },
      );
    }

    const { success, limit, remaining, reset } = await limitSearch(ip);

    if (!success) {
      const retryAfter = Math.max(0, Math.ceil((reset - Date.now()) / 1000));

      return NextResponse.json(
        {
          /**
           * DEBUG: Temporary distinct error message
           * Remove once only one rate limiter remains.
           */
          error: "Too many requests.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        },
      );
    }

    const { type, value } = parsed.data;

    // This endpoint intentionally performs a narrowly scoped server-side lookup.
    // The service-role credential never reaches the browser and the response is
    // parsed through the public schema below before it is returned.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase server configuration is incomplete.");
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Database lookup
    const column = type === "barcode" ? "student_id" : "email";
    const { data: member, error } = await supabase
      .from("members")
      .select("gdg_id, full_name, program, email, is_accepted")
      .eq(column, value)
      .single();

    if (error || !member || !member.is_accepted) {
      // Generic error message for both non-existent users and users waiting acceptance
      return NextResponse.json(
        {
          error:
            "No profile found. Please ensure you are a registered GDG HAU member.",
        },
        { status: 404 },
      );
    }

    // Apply strict server-side data masking (PublicMemberProfileSchema)
    const qrSecret = process.env.QR_SIGNING_SECRET;
    if (!qrSecret) throw new Error("QR_SIGNING_SECRET is not configured.");
    const signedToken = createVerificationToken(member.email, qrSecret);
    const verificationUrl = new URL("/verify", request.nextUrl.origin);
    verificationUrl.searchParams.set("token", signedToken.token);

    const publicProfile = MemberSearchResultSchema.parse({
      gdgId: member.gdg_id,
      fullName: member.full_name,
      program: member.program,
      email: member.email,
      verificationToken: signedToken.token,
      verificationUrl: verificationUrl.toString(),
      tokenExpiresAt: signedToken.expiresAt,
    });

    return NextResponse.json(publicProfile);
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during search." },
      { status: 500 },
    );
  }
}
