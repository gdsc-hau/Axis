"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClientInstance } from "@hau/db";
import { getActiveMember, getMemberForAuthUser } from "@hau/auth";

function dashboardForRole(role: "MEMBER" | "ADMIN") {
  return role === "ADMIN" ? "/admin/dashboard" : "/member/dashboard";
}

export async function completeProfile(formData: FormData) {
  const supabase = await createServerClientInstance();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to complete your profile." };
  }

  const bio = String(formData.get("bio") ?? "").trim();
  const linkedin = String(formData.get("linkedin") ?? "").trim();
  const github = String(formData.get("github") ?? "").trim();

  if (!bio) {
    return { error: "Bio is required." };
  }
  if (bio.length > 1000) {
    return { error: "Bio exceeds the allowed length." };
  }
  for (const candidate of [linkedin, github].filter(Boolean)) {
    try {
      const parsedUrl = new URL(candidate);
      if (parsedUrl.protocol !== "https:") throw new Error("Invalid protocol");
    } catch {
      return { error: "Social links must be complete HTTPS URLs." };
    }
  }

  const access = await getActiveMember();
  if (!access || access.user.id !== user.id) {
    return { error: "An active member account is required." };
  }

  if (access.member.profile_completed_at) {
    redirect(dashboardForRole(access.member.role));
  }

  const links = {
    ...(linkedin ? { linkedin } : {}),
    ...(github ? { github } : {}),
  };

  const { error: updateError } = await supabase.rpc(
    "complete_current_member_profile",
    {
      p_full_name: access.member.full_name,
      p_bio: bio,
      p_links: links,
    },
  );

  if (updateError) {
    console.error("Error updating member profile:", updateError);
    return { error: "Failed to save profile details." };
  }

  revalidatePath("/verify");
  revalidatePath("/member", "layout");
  revalidatePath("/admin", "layout");

  const completedMember = await getMemberForAuthUser(user.id, user.email);
  if (!completedMember?.profile_completed_at) {
    return {
      error:
        "Your profile was saved, but completion could not be verified. Refresh the page before trying again.",
    };
  }

  redirect(dashboardForRole(completedMember.role));
}
