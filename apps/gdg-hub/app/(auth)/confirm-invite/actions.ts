"use server";

import { getMemberForAuthUser } from "@hau/auth";
import { ConfirmInvitationSchema } from "@hau/contracts";
import { createServerClientInstance } from "@hau/db";
import { redirect } from "next/navigation";

export async function confirmInvitation(formData: FormData) {
  const parsed = ConfirmInvitationSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Enter a valid email and invitation code.",
    };
  }

  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "invite",
  });

  if (error || !data.user) {
    console.error("Invitation OTP verification failed:", error?.message);
    return {
      error:
        "The invitation code is invalid, expired, or already used. Ask an administrator to send a new invitation.",
    };
  }

  const member = await getMemberForAuthUser(data.user.id, data.user.email, {
    allowUnlinkedEmail: true,
  });

  if (!member || member.member_status !== "ACTIVE") {
    await supabase.auth.signOut();
    return {
      error:
        "This invitation is not attached to an active GDG HAU membership. Contact an administrator.",
    };
  }

  if (member.activated_at) {
    redirect(
      member.profile_completed_at
        ? member.role === "ADMIN"
          ? "/admin/dashboard"
          : "/member/dashboard"
        : "/verify",
    );
  }

  redirect("/activate");
}
