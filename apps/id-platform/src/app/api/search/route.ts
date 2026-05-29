import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SearchRequestSchema, PublicMemberProfileSchema } from '@hau/contracts';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SearchRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid search request parameters.' }, { status: 400 });
    }

    const { type, value } = parsed.data;

    // Supabase Setup
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
      .select('hau_id, full_name, program, is_accepted')
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
      hauId: member.hau_id,
      fullName: member.full_name,
      program: member.program,
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
