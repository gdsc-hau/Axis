'use server';

import { redirect } from 'next/navigation';
import { createServerClientInstance } from '@hau/db';

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

  if (!fullName || !bio || !linkedin || !github) {
    return { error: 'All fields are required.' };
  }

  // 1. Update Full Name in members table (if needed)
  const { error: memberError } = await (supabase.from('members') as any)
    .update({ full_name: fullName })
    .eq('id', user.id);

  if (memberError) {
    console.error('Error updating member:', memberError);
    return { error: 'Failed to update member information.' };
  }

  // 2. Insert or update member_profiles table
  const links = {
    linkedin,
    github,
  };

  const { error: profileError } = await (supabase.from('member_profiles') as any)
    .upsert({
      member_id: user.id,
      bio,
      links,
    }, { onConflict: 'member_id' });

  if (profileError) {
    console.error('Error updating profile:', profileError);
    return { error: 'Failed to save profile details.' };
  }

  redirect('/member/dashboard');
}
