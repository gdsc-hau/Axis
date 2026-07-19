"use server";

import { revalidatePath } from "next/cache";
import { createServerClientInstance } from "@hau/db";
import { getUser, getUserRole } from "@hau/auth";

async function assertAdmin() {
  const user = await getUser();
  if (!user) throw new Error("Not authenticated");
  const role = await getUserRole(user.id);
  if (role !== "ADMIN") throw new Error("Unauthorized");
  return user;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function approveMember(memberId: string) {
  if (!isUuid(memberId)) return { error: "Invalid member ID." };
  await assertAdmin();
  const supabase = await createServerClientInstance();

  const { error } = await supabase
    .from("members")
    .update({ is_accepted: true })
    .eq("id", memberId);

  if (error) {
    return { error: "Failed to approve member: " + error.message };
  }

  revalidatePath("/admin/members");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function rejectMember(memberId: string) {
  if (!isUuid(memberId)) return { error: "Invalid member ID." };
  await assertAdmin();
  const supabase = await createServerClientInstance();

  // We keep the record but set is_accepted = false (it should already be false,
  // but this action is an explicit rejection for audit purposes).
  const { error } = await supabase
    .from("members")
    .update({ is_accepted: false })
    .eq("id", memberId);

  if (error) {
    return { error: "Failed to reject member: " + error.message };
  }

  revalidatePath("/admin/members");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function updateMemberRole(memberId: string, newRole: string) {
  if (!isUuid(memberId)) return { error: "Invalid member ID." };
  const admin = await assertAdmin();
  const supabase = await createServerClientInstance();

  // Compare the caller's Auth UUID with the target member's auth_id.
  const { data: targetMember } = await supabase
    .from("members")
    .select("auth_id")
    .eq("id", memberId)
    .single();

  if (targetMember?.auth_id === admin.id && newRole !== "ADMIN") {
    return { error: "You cannot change your own role." };
  }

  if (!["MEMBER", "ADMIN"].includes(newRole)) {
    return { error: "Invalid role." };
  }
  const validatedRole = newRole as "MEMBER" | "ADMIN";

  const { error } = await supabase
    .from("members")
    .update({ role: validatedRole })
    .eq("id", memberId);

  if (error) {
    return { error: "Failed to update role: " + error.message };
  }

  revalidatePath("/admin/members");
  return { success: true };
}
