import { createServerClientInstance } from '@hau/db';
import { User, Session } from '@supabase/supabase-js';

export async function getSession(): Promise<Session | null> {
  const supabase = await createServerClientInstance();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser(): Promise<User | null> {
  const supabase = await createServerClientInstance();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
