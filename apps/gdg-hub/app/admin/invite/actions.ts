'use server';

import { createAdminClient } from '@hau/db';
import { getUser, getUserRole } from '@hau/auth';
import { revalidatePath } from 'next/cache';

type InviteResult = {
  email: string;
  status: 'sent' | 'skipped' | 'error';
  reason?: string;
};

export async function sendInvites(
  formData: FormData
): Promise<{ results?: InviteResult[]; error?: string }> {
  // 1. Verify the caller is an ADMIN
  const user = await getUser();
  if (!user) return { error: 'Not authenticated.' };
  const role = await getUserRole(user.id);
  if (role !== 'ADMIN') return { error: 'Unauthorized.' };

  const rawEmails = formData.get('emails') as string;
  if (!rawEmails || !rawEmails.trim()) {
    return { error: 'Please enter at least one email address.' };
  }

  // 2. Parse emails — support comma and newline separators
  const emails = rawEmails
    .split(/[\n,]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  if (emails.length === 0) {
    return { error: 'No valid emails found.' };
  }
  if (emails.length > 100) {
    return { error: 'A maximum of 100 invitations can be sent at once.' };
  }
  const invalidEmail = emails.find((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254);
  if (invalidEmail) return { error: `Invalid email address: ${invalidEmail}` };

  const adminClient = createAdminClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  const results: InviteResult[] = [];

  for (const email of emails) {
    // 3. Validate against members table
    const { data: rawMember, error: memberError } = await adminClient.from('members')
      .select('id, is_accepted, role, auth_id')
      .eq('email', email)
      .single();

    const member = rawMember as {
      id: string;
      is_accepted: boolean;
      role: string;
      auth_id: string | null;
    } | null;

    if (memberError || !member) {
      results.push({
        email,
        status: 'skipped',
        reason: 'Not found in the member registry.',
      });
      continue;
    }

    if (!member.is_accepted) {
      results.push({
        email,
        status: 'skipped',
        reason: 'Member is not yet approved.',
      });
      continue;
    }

    if (member.role === 'ADMIN') {
      results.push({
        email,
        status: 'skipped',
        reason: 'Admin accounts must be provisioned internally.',
      });
      continue;
    }

    if (member.auth_id) {
      results.push({
        email,
        status: 'skipped',
        reason: 'Account is already activated.',
      });
      continue;
    }

    // 4. Send an invite email — Supabase Admin API creates the auth.users row
    //    and sends the email. We append ?next=/activate so the callback
    //    redirects them to the password-setting step.
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/activate`,
      });

    if (linkError || !linkData) {
      console.error(`Failed to send invite email to ${email}:`, linkError);
      results.push({
        email,
        status: 'error',
        reason: linkError?.message ?? 'Failed to send invite email.',
      });
      continue;
    }

    results.push({ email, status: 'sent' });
  }

  revalidatePath('/admin/invite');
  revalidatePath('/admin/members');

  return { results };
}
