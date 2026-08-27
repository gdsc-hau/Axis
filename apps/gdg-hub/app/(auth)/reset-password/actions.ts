"use server";

import { redirect } from "next/navigation";
import { createServerClientInstance } from "@hau/db";
import { getMemberForAuthUser } from "@hau/auth";
import { validatePassword } from "@/lib/password";

export async function resetPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      error:
        "Your password reset link is invalid or has expired. Request a new one.",
    };
  }

  const member = await getMemberForAuthUser(user.id, user.email, {
    allowUnlinkedEmail: true,
  });

  if (!member || member.member_status !== "ACTIVE") {
    return {
      error: "No active member account is linked to this recovery session.",
    };
  }

  if (member.auth_id && member.auth_id !== user.id) {
    return {
      error: "This recovery account does not match the linked member account.",
    };
  }

  if (!member.auth_id) {
    const { error: linkError } = await supabase.rpc(
      "link_current_member_account",
    );

    if (linkError) {
      console.error("Password reset member link failed:", linkError.message);
      return {
        error: "Could not link your member account. Contact an administrator.",
      };
    }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    console.error("Password update failed:", updateError.message);
    return {
      error:
        "Could not update your password. Request a new reset link and try again.",
    };
  }

  // Revoke the temporary recovery session and any other active sessions.
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?reset=success");
}
