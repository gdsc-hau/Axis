"use server";

import { revalidatePath } from "next/cache";
import { getActiveAdmin } from "@hau/auth";
import { UpdatePortalSettingsSchema } from "@hau/contracts";
import { updatePortalSettings } from "@hau/db";

export async function savePortalSettings(formData: FormData) {
  const parsed = UpdatePortalSettingsSchema.safeParse({
    expectedVersion: formData.get("expectedVersion"),
    organizationName: formData.get("organizationName"),
    supportEmail: formData.get("supportEmail"),
    dashboardMessage: formData.get("dashboardMessage"),
    defaultReportDays: formData.get("defaultReportDays"),
    leaderboardLimit: formData.get("leaderboardLimit"),
    reason: formData.get("reason"),
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid portal settings.",
    };
  if (!(await getActiveAdmin()))
    return { error: "Active administrator access required." };
  const { data, error } = await updatePortalSettings(parsed.data);
  if (error || !data)
    return {
      error: error?.message.includes("another session")
        ? "Settings changed in another session. Reload and try again."
        : "Portal settings could not be saved.",
    };
  revalidatePath("/admin/settings");
  revalidatePath("/admin/reports");
  revalidatePath("/member/dashboard");
  revalidatePath("/member/leaderboard");
  revalidatePath("/member/settings");
  return { success: true, version: data.version };
}
