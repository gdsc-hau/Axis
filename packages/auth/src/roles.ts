import "server-only";
import { createAdminClient } from "@hau/db";

export type AuthMember = {
  id: string;
  auth_id: string | null;
  email: string;
  full_name: string;
  role: "MEMBER" | "ADMIN";
  member_status:
    "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "INACTIVE" | "ALUMNI";
  invited_at: string | null;
  activated_at: string | null;
  profile_completed_at: string | null;
};

export async function getMemberForAuthUser(
  userId: string,
  email?: string | null,
  options?: { allowUnlinkedEmail?: boolean },
): Promise<AuthMember | null> {
  const adminClient = createAdminClient();
  const selection =
    "id, auth_id, email, full_name, role, member_status, invited_at, activated_at, profile_completed_at";

  const { data: linkedMember, error: linkedMemberError } = await adminClient
    .from("members")
    .select(selection)
    .eq("auth_id", userId)
    .maybeSingle();

  if (linkedMemberError) {
    console.error(
      "Failed to resolve linked member:",
      linkedMemberError.message,
    );
    return null;
  }

  if (linkedMember) return linkedMember as AuthMember;
  if (!email || !options?.allowUnlinkedEmail) return null;

  const normalizedEmail = email.trim().toLowerCase();
  const { data: emailMember, error: emailMemberError } = await adminClient
    .from("members")
    .select(selection)
    .eq("email", normalizedEmail)
    .is("auth_id", null)
    .maybeSingle();

  if (emailMemberError) {
    console.error(
      "Failed to resolve member by email:",
      emailMemberError.message,
    );
    return null;
  }

  return (emailMember as AuthMember | null) ?? null;
}

export async function getUserRole(userId: string): Promise<string | null> {
  const member = await getMemberForAuthUser(userId);
  return member?.member_status === "ACTIVE" ? member.role : null;
}

export async function isProfileComplete(userId: string): Promise<boolean> {
  const member = await getMemberForAuthUser(userId);
  return (
    member?.member_status === "ACTIVE" && Boolean(member.profile_completed_at)
  );
}
