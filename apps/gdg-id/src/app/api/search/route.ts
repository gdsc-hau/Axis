import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SearchRequestSchema, PublicMemberProfileSchema } from '@hau/contracts';
import { searchRateLimit } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {

  try {
    const body = await request.json();
    const parsed = SearchRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid search request parameters.' }, { status: 400 });
    }

    const ip =
      (request as any).ip ??
      request.headers.get('x-forwarded-for')?.split(',')[0].trim();

    if (!ip) {
      return NextResponse.json(
        { error: 'Unable to determine client IP.' },
        { status: 400 }
      );
    }
    
    const { success, limit, remaining, reset } =
      await searchRateLimit.limit(ip);

    if (!success) {
      const retryAfter = Math.max(
        0,
        Math.ceil((reset - Date.now()) / 1000)
      );

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
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      )
    }

    const { type, value } = parsed.data;

    // Supabase Setup
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {
              // Ignore in API route
            }
          },
        },
      }
    );

    // Database lookup
    const column = type === 'barcode' ? 'student_id' : 'email';
    const { data: member, error } = await supabase
      .from('members')
      .select('gdg_id, full_name, program, email, department, is_accepted')
      .eq(column, value)
      .single();

    if (error || !member || !member.is_accepted) {
      // Generic error message for both non-existent users and users waiting acceptance
      return NextResponse.json(
        { error: 'No profile found. Please ensure you are a registered GDG HAU member.' },
        { status: 404 }
      );
    }

    // Apply strict server-side data masking (PublicMemberProfileSchema)
    const publicProfile = PublicMemberProfileSchema.parse({
      gdgId: member.gdg_id,
      fullName: member.full_name,
      program: member.program,
      email: member.email,
      department: member.department,
    });

    return NextResponse.json(publicProfile);
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during search.' },
      { status: 500 }
    );
  }
}
