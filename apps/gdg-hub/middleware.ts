import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  // Auth routes: public pages that should redirect to dashboard if already logged in.
  // /verify and /activate are special — they must remain accessible while logged in
  // because they are part of the onboarding flow after clicking an invite link.
  const isAuthRoute =
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/activate') ||
    path.startsWith('/verify');

  const isOnboardingRoute = path.startsWith('/verify') || path.startsWith('/activate');
  const isProtectedRoute = path.startsWith('/member') || path.startsWith('/admin');

  if (isProtectedRoute && !user) {
    // Redirect unauthenticated users to login
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user && !isOnboardingRoute) {
    // If user is already logged in and NOT in the onboarding flow, send them to the dashboard.
    url.pathname = '/member/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, icons (public folder assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
