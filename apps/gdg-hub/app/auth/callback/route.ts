import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { requireServerEnv } from "@hau/db";

const emailOtpTypes = new Set<EmailOtpType>([
  "email",
  "invite",
  "magiclink",
  "recovery",
  "signup",
  "email_change",
]);

function loginErrorRedirect(origin: string, message: string) {
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  // 'next' can be passed explicitly in the invite link (e.g. ?next=/activate).
  // Default: invite links go to /activate to set a password; email-confirm links go to /verify.
  const type = searchParams.get("type");
  const defaultNext =
    type === "invite"
      ? "/activate"
      : type === "recovery"
        ? "/reset-password"
        : "/verify";
  const requestedNext = searchParams.get("next") ?? defaultNext;
  const next =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/verify";

  const providerError = searchParams.get("error_description");
  if (providerError) {
    console.error(
      "Supabase Auth callback error:",
      searchParams.get("error_code") ?? providerError,
    );
    return loginErrorRedirect(origin, providerError);
  }

  if (code || tokenHash) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      requireServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireServerEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    );

    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : type && emailOtpTypes.has(type as EmailOtpType)
        ? await supabase.auth.verifyOtp({
            token_hash: tokenHash as string,
            type: type as EmailOtpType,
          })
        : { error: new Error("Unsupported email verification type") };

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("Supabase Auth code exchange failed:", error.message);
  }

  return loginErrorRedirect(
    origin,
    "This verification link is invalid, expired, or has already been used. Request a new link.",
  );
}
