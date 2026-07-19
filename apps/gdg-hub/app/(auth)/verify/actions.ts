'use server';

import { redirect } from 'next/navigation';
import { createAdminClient, createServerClientInstance } from '@hau/db';

export async function completeProfile(formData: FormData) {

  const supabase = await createServerClientInstance();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to complete your profile.' };
  }

  const fullName = formData.get('fullName') as string;
  const bio = formData.get('bio') as string;
  const linkedin = formData.get('linkedin') as string;
  const github = formData.get('github') as string;

  if (!fullName || !bio) {
    return { error: 'Full Name and Bio are required.' };
  }

  const adminClient = createAdminClient();

  // 1. Get the member record corresponding to this auth user
  let { data: member, error: fetchError } = await (adminClient.from('members') as any)
    .select('id, auth_id')
    .eq('auth_id', user.id)
    .single();

  if (!member && user.email) {
    const { data: memberByEmail } = await (adminClient.from('members') as any)
      .select('id, auth_id')
      .eq('email', user.email)
      .single();

    if (memberByEmail) {
      member = memberByEmail;
      // Auto-link legacy accounts
      await (adminClient.from('members') as any).update({ auth_id: user.id }).eq('id', memberByEmail.id);
    }
  }

  if (!member) {
    console.error('Error fetching member:', fetchError);
    return { error: 'Could not find your member record in the system.' };
  }

  const links = {
    ...(linkedin ? { linkedin } : {}),
    ...(github ? { github } : {}),
  };

  // 2. Update member details directly in the flattened members table
  const { error: updateError } = await (adminClient.from('members') as any)
    .update({ 
      full_name: fullName,
      bio,
      links 
    })
    .eq('id', member.id);

  if (updateError) {
    console.error('Error updating member profile:', updateError);
    return { error: 'Failed to save profile details.' };
  }

  redirect('/member/dashboard');
}
