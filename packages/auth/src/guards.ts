import "server-only";
import type { User } from "@supabase/supabase-js";
import { getUser } from "./session";
import { getMemberForAuthUser, type AuthMember } from "./roles";

export type MemberAccess = {
  user: User;
  member: AuthMember;
};

export async function getAuthenticatedMember(): Promise<MemberAccess | null> {
  const user = await getUser();
  if (!user) return null;

  const member = await getMemberForAuthUser(user.id, user.email);
  if (!member) return null;

  return { user, member };
}

export async function getActiveMember(): Promise<MemberAccess | null> {
  const access = await getAuthenticatedMember();
  return access?.member.member_status === "ACTIVE" ? access : null;
}

export async function getActiveAdmin(): Promise<MemberAccess | null> {
  const access = await getActiveMember();
  return access?.member.role === "ADMIN" ? access : null;
}
