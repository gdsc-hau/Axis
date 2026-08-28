"use server";

import { redirect } from "next/navigation";
import { createServerClientInstance } from "@hau/db";
import { getMemberForAuthUser } from "@hau/auth";
import { validatePassword } from "@/lib/password";

export async function activateAccount(formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { error: "Both password fields are required." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  // The user is already authenticated at this point (Supabase exchanged the invite
  // code for a session in /auth/callback). We just need to set their password.
  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Your session has expired. Please request a new invitation link.",
    };
  }

  const member = await getMemberForAuthUser(user.id, user.email, {
    allowUnlinkedEmail: true,
  });
  if (!member) {
    return { error: "No member record is linked to this invitation." };
  }
  if (member.member_status !== "ACTIVE") {
    return {
      error:
        "This membership is not active. Contact an administrator before activating your account.",
    };
  }

  if (member.auth_id && member.auth_id !== user.id) {
    await supabase.auth.signOut();
    return { error: "This invitation is linked to a different Auth account." };
  }

  // /activate is exclusively an onboarding endpoint. An already activated
  // member must use the authenticated password-change/recovery flow instead.
  if (member.activated_at) {
    redirect(
      member.profile_completed_at
        ? member.role === "ADMIN"
          ? "/admin/dashboard"
          : "/member/dashboard"
        : "/verify",
    );
  }

  // Set the password for the account
  const { error: updateError } = await supabase.auth.updateUser({ password });

  if (updateError) {
    console.error("Error setting password:", updateError);
    return { error: "Failed to set password: " + updateError.message };
  }

  const { error: linkError } = await supabase.rpc(
    "link_current_member_account",
  );
  if (linkError) {
    console.error("Failed to link activated member:", linkError.message);
    return {
      error: "Could not link your member account. Contact an administrator.",
    };
  }

  const linkedMember = await getMemberForAuthUser(user.id, user.email);
  if (!linkedMember?.activated_at) {
    return {
      error:
        "Your password was saved, but account activation could not be verified. Contact an administrator before retrying.",
    };
  }

  // Redirect to profile completion
  redirect("/verify");
}
