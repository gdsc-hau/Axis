"use server";

import { revalidatePath } from "next/cache";
import { getActiveMember } from "@hau/auth";
import { UpdateCurrentMemberProfileSchema } from "@hau/contracts";
import { updateCurrentMemberProfile } from "@hau/db";

export async function saveCurrentMemberProfile(formData: FormData) {
  const parsed = UpdateCurrentMemberProfileSchema.safeParse({
    expectedVersion: formData.get("expectedVersion"),
    bio: formData.get("bio"),
    phoneNumber: formData.get("phoneNumber"),
    linkedinUrl: formData.get("linkedinUrl"),
    githubUrl: formData.get("githubUrl"),
    reason: formData.get("reason"),
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid profile update.",
    };
  if (!(await getActiveMember()))
    return { error: "Active member access required." };
  const links: Record<string, string> = {};
  if (parsed.data.linkedinUrl) links.linkedin = parsed.data.linkedinUrl;
  if (parsed.data.githubUrl) links.github = parsed.data.githubUrl;
  const { data, error } = await updateCurrentMemberProfile({
    expectedVersion: parsed.data.expectedVersion,
    bio: parsed.data.bio,
    phoneNumber: parsed.data.phoneNumber,
    links,
    reason: parsed.data.reason,
    operationKey: parsed.data.operationKey,
  });
  if (error || !data)
    return {
      error: error?.message.includes("another session")
        ? "Your profile changed in another session. Reload and try again."
        : "Your profile could not be saved.",
    };
  revalidatePath("/member/profile");
  revalidatePath("/member/dashboard");
  return { success: true, version: data.profile_version };
}
