"use server";

import { redirect } from "next/navigation";
import { createServerClientInstance } from "@hau/db";
import { getMemberForAuthUser } from "@hau/auth";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const supabase = await createServerClientInstance();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const user = data.user;
  let member = await getMemberForAuthUser(user.id, user.email, {
    allowUnlinkedEmail: true,
  });

  if (!member) {
    await supabase.auth.signOut();
    return { error: "No member record is linked to this account." };
  }

  if (member.member_status !== "ACTIVE") {
    redirect("/account-status");
  }

  // Existing verified Auth users can predate members.auth_id. A successful
  // password sign-in proves control of the normalized email, while the RPC
  // independently verifies that email against one active, unlinked member and
  // records the activation in audit_logs.
  if (!member.auth_id) {
    const { error: linkError } = await supabase.rpc(
      "link_current_member_account",
    );

    if (linkError) {
      console.error("Failed to link authenticated member:", linkError.message);
      await supabase.auth.signOut();
      return {
        error: "Could not link your member account. Contact an administrator.",
      };
    }

    member = await getMemberForAuthUser(user.id, user.email);
    if (!member) {
      await supabase.auth.signOut();
      return {
        error: "Member account linking could not be verified. Try again.",
      };
    }
  }

  if (!member.profile_completed_at) {
    redirect("/verify");
  }

  redirect(member.role === "ADMIN" ? "/admin/dashboard" : "/member/dashboard");
}
