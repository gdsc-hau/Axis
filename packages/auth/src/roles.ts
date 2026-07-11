import { createServerClientInstance } from '@hau/db';

export async function getUserRole(userId: string): Promise<string | null> {
  const supabase = await createServerClientInstance();
  
  const { data, error } = await (supabase.from('members') as any)
    .select('role')
    .eq('id', userId)
    .single();
    
  if (error || !data) {
    return null;
  }
  
  return data.role;
}

export async function isProfileComplete(userId: string): Promise<boolean> {
  const supabase = await createServerClientInstance();
  
  const { data, error } = await (supabase.from('member_profiles') as any)
    .select('id, bio, links')
    .eq('member_id', userId)
    .single();
    
  if (error || !data) {
    return false;
  }
  
  // A profile is complete if it has a bio and links (LinkedIn, GitHub)
  // Full Name is currently in the 'members' table, so we assume if member_profiles exists
  // and has bio/links, it's complete.
  if (!data.bio || !data.links) {
    return false;
  }
  
  return true;
}
