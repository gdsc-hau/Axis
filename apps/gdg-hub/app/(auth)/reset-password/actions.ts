'use server';

import { redirect } from 'next/navigation';
import { createAdminClient, createServerClientInstance } from '@hau/db';
import { validatePassword } from '@/lib/password';

export async function resetPassword(formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: 'Your password reset link is invalid or has expired. Request a new one.' };
  }

  const adminClient = createAdminClient();
  const { data: member, error: memberError } = await adminClient
    .from('members')
    .select('id, auth_id, is_accepted')
    .eq('email', user.email.toLowerCase())
    .maybeSingle();

  if (memberError || !member || !member.is_accepted) {
    console.error('Password reset member lookup failed:', memberError?.message);
    return { error: 'No approved member account is linked to this recovery session.' };
  }

  if (member.auth_id && member.auth_id !== user.id) {
    return { error: 'This recovery account does not match the linked member account.' };
  }

  if (!member.auth_id) {
    const { data: linkedMember, error: linkError } = await adminClient
      .from('members')
      .update({ auth_id: user.id })
      .eq('id', member.id)
      .is('auth_id', null)
      .select('auth_id')
      .maybeSingle();

    if (linkError || linkedMember?.auth_id !== user.id) {
      console.error('Password reset member link failed:', linkError?.message ?? 'Member was not linked');
      return { error: 'Could not link your member account. Contact an administrator.' };
    }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    console.error('Password update failed:', updateError.message);
    return { error: 'Could not update your password. Request a new reset link and try again.' };
  }

  // Revoke the temporary recovery session and any other active sessions.
  await supabase.auth.signOut({ scope: 'global' });
  redirect('/login?reset=success');
}
