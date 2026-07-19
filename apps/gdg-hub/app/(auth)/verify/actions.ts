'use server';

import { redirect } from 'next/navigation';
import { createAdminClient, createServerClientInstance } from '@hau/db';

export async function completeProfile(formData: FormData) {

  const supabase = await createServerClientInstance();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to complete your profile.' };
  }

  const fullName = String(formData.get('fullName') ?? '').trim();
  const bio = String(formData.get('bio') ?? '').trim();
  const linkedin = String(formData.get('linkedin') ?? '').trim();
  const github = String(formData.get('github') ?? '').trim();

  if (!fullName || !bio) {
    return { error: 'Full Name and Bio are required.' };
  }
  if (fullName.length > 100 || bio.length > 1000) {
    return { error: 'Full name or bio exceeds the allowed length.' };
  }
  for (const candidate of [linkedin, github].filter(Boolean)) {
    try {
      const parsedUrl = new URL(candidate);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Invalid protocol');
    } catch {
      return { error: 'Social links must be valid HTTP or HTTPS URLs.' };
    }
  }

  const adminClient = createAdminClient();

  // 1. Get the member record corresponding to this auth user
  const { data: initialMember, error: fetchError } = await adminClient.from('members')
    .select('id, auth_id')
    .eq('auth_id', user.id)
    .single();
  let member = initialMember;

  if (!member && user.email) {
    const { data: memberByEmail } = await adminClient.from('members')
      .select('id, auth_id')
      .eq('email', user.email)
      .single();

    if (memberByEmail) {
      member = memberByEmail;
      // Auto-link legacy accounts
      await adminClient.from('members').update({ auth_id: user.id }).eq('id', memberByEmail.id);
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
  const { error: updateError } = await adminClient.from('members')
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
