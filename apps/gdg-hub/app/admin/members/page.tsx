import { createServerClientInstance } from '@hau/db';
import { MemberTableClient } from './MemberTableClient';

async function getMembers() {
  const supabase = await createServerClientInstance();
  const { data, error } = await (supabase.from('members') as any)
    .select('id, full_name, email, student_id, gdg_id, program, department, role, is_accepted, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch members:', error);
    return [];
  }

  return data as Array<{
    id: string;
    full_name: string;
    email: string;
    student_id: string;
    gdg_id: string;
    program: string;
    department: string;
    role: string;
    is_accepted: boolean;
    created_at: string;
  }>;
}

export default async function AdminMembersPage() {
  const members = await getMembers();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Members</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage member applications, approvals, and roles.
          </p>
        </div>
      </div>

      {/* Member Table */}
      <MemberTableClient members={members} />
    </div>
  );
}
