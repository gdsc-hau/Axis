"use server";

import { revalidatePath } from "next/cache";
import { getActiveAdmin } from "@hau/auth";
import {
  PublishNotificationCampaignSchema,
  SetNotificationEmailDeliverySchema,
} from "@hau/contracts";
import {
  publishNotificationCampaign,
  setNotificationEmailDelivery,
} from "@hau/db";

function refreshCommunications() {
  revalidatePath("/admin/communications");
  revalidatePath("/member/notifications");
}

export async function publishCampaign(formData: FormData) {
  const parsed = PublishNotificationCampaignSchema.safeParse({
    category: formData.get("category"),
    title: formData.get("title"),
    message: formData.get("message"),
    actionUrl: formData.get("actionUrl"),
    includeEmail: formData.get("includeEmail") === "on",
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid campaign." };
  }
  if (!(await getActiveAdmin())) {
    return { error: "Active administrator access required." };
  }
  const { data, error } = await publishNotificationCampaign(parsed.data);
  if (error || !data) {
    return { error: "The campaign could not be published." };
  }
  refreshCommunications();
  return { success: true, recipientCount: data.recipient_count };
}

export async function changeEmailDelivery(formData: FormData) {
  const parsed = SetNotificationEmailDeliverySchema.safeParse({
    enabled: formData.get("enabled") === "true",
  });
  if (!parsed.success) return { error: "Invalid delivery setting." };
  if (!(await getActiveAdmin())) {
    return { error: "Active administrator access required." };
  }
  const { error } = await setNotificationEmailDelivery(parsed.data.enabled);
  if (error) return { error: "The delivery setting could not be changed." };
  refreshCommunications();
  return { success: true };
}
