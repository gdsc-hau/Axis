'use server';

import { redirect } from 'next/navigation';
import { createAdminClient, createServerClientInstance } from '@hau/db';
import { validatePassword } from '@/lib/password';

export async function activateAccount(formData: FormData) {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || !confirmPassword) {
    return { error: 'Both password fields are required.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  // The user is already authenticated at this point (Supabase exchanged the invite
  // code for a session in /auth/callback). We just need to set their password.
  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Your session has expired. Please request a new invitation link.' };
  }

  // Set the password for the account
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    console.error('Error setting password:', updateError);
    return { error: 'Failed to set password: ' + updateError.message };
  }

  // Ensure the auth_id is linked in the members table (handles any edge cases
  // where the invite link created the auth.users row but linkage wasn't written yet)
  const adminClient = createAdminClient();
  if (user.email) {
    const { data: member } = await adminClient.from('members')
      .select('id, auth_id')
      .eq('email', user.email)
      .single();

    if (member && !member.auth_id) {
      await adminClient.from('members')
        .update({ auth_id: user.id })
        .eq('id', member.id);
    }
  }

  // Redirect to profile completion
  redirect('/verify');
}
