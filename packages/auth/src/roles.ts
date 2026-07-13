import { createAdminClient } from '@hau/db';

export async function getUserRole(userId: string): Promise<string | null> {
  const adminClient = createAdminClient();
  
  const { data, error } = await adminClient
    .from('members')
    .select('role')
    .eq('auth_id', userId)
    .single();
    
  if (error || !data) {
    return null;
  }
  
  return data.role;
}

export async function isProfileComplete(userId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  
  // Get the member using auth_id and check if they have a bio
  const { data: member, error: memberError } = await adminClient
    .from('members')
    .select('id, bio')
    .eq('auth_id', userId)
    .single();
    
  if (memberError || !member) {
    return false;
  }
  
  // A profile is complete if it has a bio since we merged profiles into members
  if (!member.bio) {
    return false;
  }
  
  return true;
}
