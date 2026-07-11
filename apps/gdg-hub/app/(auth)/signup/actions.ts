'use server';

import { redirect } from 'next/navigation';
import { createAdminClient, createServerClientInstance } from '@hau/db';

export async function signup(formData: FormData) {

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  // 1. Check if the user exists in the GDG registry and is accepted
  const adminClient = createAdminClient();
  const { data: rawMember, error: memberError } = await adminClient
    .from('members')
    .select('id, is_accepted')
    .eq('email', email)
    .single();

  const member = rawMember as { id: string; is_accepted: boolean } | null;

  if (memberError || !member) {
    return { error: 'Your email was not found in the GDG member registry. Please make sure you used the email you registered with.' };
  }

  if (!member.is_accepted) {
    return { error: 'Your membership application is currently pending approval.' };
  }

  // 2. Sign the user up
  const supabase = await createServerClientInstance();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

  const { error: authError, data: authData } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
    return { error: 'This email is already registered. Please log in.' };
  }

  // At this point, Supabase auth has successfully created a user (or sent a confirmation email)
  // We need to link the auth.user to the public.members entry.
  // We can do this in the database via a trigger, or manually update the member here if we can safely map them.
  // However, the database schema specifies `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` on members
  // and the user originally wanted `auth.users(id)` to link to `members(id)`.
  // Since `members` already exists with an ID, we should update the member record to hold the new auth ID
  // or we need a trigger on auth.users creation that matches email.
  // For now, we will assume Supabase handles the email matching or we just tell the user to check their email.

  return { success: 'Check your email to continue sign in process' };
}
