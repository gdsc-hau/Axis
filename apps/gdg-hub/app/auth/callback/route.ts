import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireServerEnv } from '@hau/db';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // 'next' can be passed explicitly in the invite link (e.g. ?next=/activate).
  // Default: invite links go to /activate to set a password; email-confirm links go to /verify.
  const type = searchParams.get('type');
  const requestedNext = searchParams.get('next') ?? (type === 'invite' ? '/activate' : '/verify');
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/verify';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      requireServerEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireServerEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Invalid+or+expired+verification+link`);
}
