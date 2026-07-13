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
    .select('id, is_accepted, role, auth_id')
    .eq('email', email)
    .single();

  const member = rawMember as { id: string; is_accepted: boolean; role: string; auth_id: string | null } | null;

  if (memberError || !member) {
    return { error: 'Your email was not found in the GDG member registry. Please make sure you used the email you registered with.' };
  }

  if (member.auth_id) {
    return { error: 'This email is already registered. Please log in.' };
  }

  if (!member.is_accepted) {
    return { error: 'Your membership application is currently pending approval.' };
  }

  if (member.role === 'ADMIN') {
    return { error: 'Admin registration is restricted to internal provisioning.' };
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
  // We need to link the auth.user to the public.members entry using auth_id
  
  if (authData.user) {
    const { error: linkError } = await (adminClient.from('members') as any)
      .update({ auth_id: authData.user.id })
      .eq('id', member.id);
      
    if (linkError) {
      console.error('Failed to link auth_id to member:', linkError);
      return { error: 'Failed to complete registration linkage.' };
    }
  }

  return { success: 'Check your email to continue sign in process' };
}
