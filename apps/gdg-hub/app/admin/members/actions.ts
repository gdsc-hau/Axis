"use server";

import { revalidatePath } from "next/cache";
import { createServerClientInstance } from "@hau/db";
import { getActiveAdmin } from "@hau/auth";
import {
  UpdateMemberRoleSchema,
  UpdateMemberStatusSchema,
  type MemberStatus,
} from "@hau/contracts";

export async function updateMemberStatus(
  memberId: string,
  memberStatus: MemberStatus,
  reason?: string,
) {
  const parsed = UpdateMemberStatusSchema.safeParse({
    memberId,
    memberStatus,
    reason,
  });
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ?? "Invalid member status request.",
    };
  }

  const access = await getActiveAdmin();
  if (!access) return { error: "Active administrator access required." };

  const supabase = await createServerClientInstance();
  const { error } = await supabase.rpc("set_member_status", {
    p_member_id: parsed.data.memberId,
    p_member_status: parsed.data.memberStatus,
    ...(parsed.data.reason ? { p_reason: parsed.data.reason } : {}),
  });

  if (error) {
    return { error: "Failed to update member status: " + error.message };
  }

  revalidatePath("/admin/members");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function updateMemberRole(memberId: string, newRole: string) {
  const parsed = UpdateMemberRoleSchema.safeParse({
    memberId,
    role: newRole,
  });
  if (!parsed.success) return { error: "Invalid member role request." };

  const access = await getActiveAdmin();
  if (!access) return { error: "Active administrator access required." };

  const supabase = await createServerClientInstance();
  const { error } = await supabase.rpc("set_member_role", {
    p_member_id: parsed.data.memberId,
    p_role: parsed.data.role,
  });

  if (error) {
    return { error: "Failed to update role: " + error.message };
  }

  revalidatePath("/admin/members");
  revalidatePath("/admin/dashboard");
  return { success: true };
}
