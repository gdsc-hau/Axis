'use server';

import { redirect } from 'next/navigation';
import { createServerClientInstance } from '@hau/db';

export async function login(formData: FormData) {

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  const supabase = await createServerClientInstance();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/member/dashboard');
}
