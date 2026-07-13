'use server';

import { revalidatePath } from 'next/cache';
import { createServerClientInstance } from '@hau/db';
import { getUser, getUserRole } from '@hau/auth';

async function assertAdmin() {
  const user = await getUser();
  if (!user) throw new Error('Not authenticated');
  const role = await getUserRole(user.id);
  if (role !== 'ADMIN') throw new Error('Unauthorized');
  return user;
}

export async function approveMember(memberId: string) {
  await assertAdmin();
  const supabase = await createServerClientInstance();

  const { error } = await (supabase.from('members') as any)
    .update({ is_accepted: true })
    .eq('id', memberId);

  if (error) {
    return { error: 'Failed to approve member: ' + error.message };
  }

  revalidatePath('/admin/members');
  revalidatePath('/admin/dashboard');
  return { success: true };
}

export async function rejectMember(memberId: string) {
  await assertAdmin();
  const supabase = await createServerClientInstance();

  // We keep the record but set is_accepted = false (it should already be false,
  // but this action is an explicit rejection for audit purposes).
  const { error } = await (supabase.from('members') as any)
    .update({ is_accepted: false })
    .eq('id', memberId);

  if (error) {
    return { error: 'Failed to reject member: ' + error.message };
  }

  revalidatePath('/admin/members');
  revalidatePath('/admin/dashboard');
  return { success: true };
}

export async function updateMemberRole(memberId: string, newRole: string) {
  const admin = await assertAdmin();
  const supabase = await createServerClientInstance();

  // Prevent self-demotion
  if (admin.id === memberId && newRole !== 'ADMIN') {
    return { error: 'You cannot change your own role.' };
  }

  if (!['MEMBER', 'ADMIN'].includes(newRole)) {
    return { error: 'Invalid role.' };
  }

  const { error } = await (supabase.from('members') as any)
    .update({ role: newRole })
    .eq('id', memberId);

  if (error) {
    return { error: 'Failed to update role: ' + error.message };
  }

  revalidatePath('/admin/members');
  return { success: true };
}
